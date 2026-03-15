import { logger } from "@/infra/observability/logger.config";
import type { IProductNormalizerService } from "./product-normalizer.interface";
import type {
	NormalizedProduct,
	ProductNormalizationInput,
	ProductNormalizationResultItem,
	ProductNormalizerResponse,
} from "./product-normalizer.types";
import { aiProvider } from "@/infra/ai/ai.factory";

const MINIMUM_CONFIDENCE_SCORE = 0.9;
const MAX_NORMALIZATION_ATTEMPTS = 2;

type ProductInputItem = {
	index: number;
	text: string;
};

type RetryPhase = "initial" | "retry";

class ProductNormalizerService implements IProductNormalizerService {
	async normalizeInvoiceItems(
		input: ProductNormalizationInput,
	): Promise<ProductNormalizerResponse> {
		try {
			const itemsPayload = this.prepareItemsForNormalization(input);

			const initialResponse = await this.generateNormalization(itemsPayload);

			const initialItems = this.composeResultItems(
				itemsPayload,
				initialResponse.items,
				1,
				"initial",
			);

			const retryPayload = initialItems
				.filter((item) => item.revision)
				.map((item) => ({
					index: item.index,
					text: item.originalText,
				}));

			const finalItems =
				(
					retryPayload.length > 0 &&
					MAX_NORMALIZATION_ATTEMPTS > 1
				) ?
					await this.mergeRetryResults(initialItems, retryPayload)
				: initialItems;

			return {
				data: {
					items: finalItems,
					minimumConfidenceScore: MINIMUM_CONFIDENCE_SCORE,
				},
			};
		} catch (error) {
			logger.error({
				msg: "Erro no processamento da normalizacao",
				error,
			});
			throw error;
		}
	}

	async normalizeProductTitles(
		items: string[],
	): Promise<ProductNormalizerResponse> {
		return this.normalizeInvoiceItems(
			this.createManualNormalizationInput(items),
		);
	}

	private async mergeRetryResults(
		initialItems: ProductNormalizationResultItem[],
		retryPayload: ProductInputItem[],
	): Promise<ProductNormalizationResultItem[]> {
		try {
			const retryResponse = await this.generateNormalization(
				retryPayload,
				true,
			);

			const retriedItems = this.composeResultItems(
				retryPayload,
				retryResponse.items,
				2,
				"retry",
			);
			const retriedItemsByIndex = new Map<number, ProductNormalizationResultItem>(
				retriedItems.map((item) => [item.index, item]),
			);

			return initialItems.map((item) => retriedItemsByIndex.get(item.index) || item);
		} catch (retryError) {
			logger.warn({
				msg: "Retry da normalizacao falhou; mantendo itens para revisao",
				error: retryError,
			});

			return initialItems;
		}
	}

	private createManualNormalizationInput(
		items: string[],
	): ProductNormalizationInput {
		return {
			source: {
				type: "manual",
			},
			items: items.map((description, index) => ({
				index,
				description,
			})),
		};
	}

	private prepareItemsForNormalization(
		input: ProductNormalizationInput,
	): ProductInputItem[] {
		return input.items.map((item) => ({
			index: item.index,
			text: item.description,
		}));
	}

	private async generateNormalization(
		items: ProductInputItem[],
		isRetry = false,
	): Promise<{ items: NormalizedProduct[]; tokens: number }> {
		const prompt = this.buildPrompt(items, isRetry);
		const response = await aiProvider.generateJson<NormalizedProduct[]>(prompt);

		return {
			items: Array.isArray(response.data) ? response.data : [],
			tokens: response.usage?.completionTokens || 0,
		};
	}

	private buildPrompt(items: ProductInputItem[], isRetry: boolean) {
		const retryInstructions =
			isRetry ?
				`
				Esses itens falharam na primeira tentativa por baixa confiabilidade ou resposta insuficiente.
				Revise com mais rigor, prefira respostas conservadoras e so aumente o confidenceScore se houver evidencia forte no texto.
			`
			:	"";

		return `
			Aja como um especialista em catálogo de produtos de supermercados brasileiros.
			Converta as descricoes brutas de itens de Nota Fiscal (NFe) em um array JSON estruturado.
			${retryInstructions}
			Regras:
			- Remova abreviacoes tecnicas de mercado.
			- Se a marca nao estiver clara, retorne "Propria" ou "Nao identificada".
			- Retorne exatamente um objeto por item recebido.
			- Preserve o index recebido em cada item.
			- confidenceScore deve ser um numero entre 0 e 1.
			- Retorne apenas JSON valido, sem markdown.
			- Retorne apenas os campos: index, name, brand, category, confidenceScore.

			Itens Brutos:
			${JSON.stringify(items)}

			JSON esperado:
			[
				{
					"index": number,
					"name": "string",
					"brand": "string",
					"category": "string",
					"confidenceScore": number
				}
			]
		`;
	}

	private composeResultItems(
		inputs: ProductInputItem[],
		normalizedItems: NormalizedProduct[],
		attempts: number,
		phase: RetryPhase,
	): ProductNormalizationResultItem[] {
		const normalizedItemsByIndex = new Map<number, NormalizedProduct>();

		for (const item of normalizedItems) {
			if (typeof item?.index !== "number") {
				continue;
			}

			if (!normalizedItemsByIndex.has(item.index)) {
				normalizedItemsByIndex.set(item.index, item);
			}
		}

		return inputs.map((input) => {
			const normalizedItem = normalizedItemsByIndex.get(input.index);
			const confidenceScore = this.normalizeConfidenceScore(
				normalizedItem?.confidenceScore,
			);
			const rejected = confidenceScore < MINIMUM_CONFIDENCE_SCORE;
			const normalizedText = this.buildNormalizedText(normalizedItem, input.text);

			return {
				index: input.index,
				originalText: input.text,
				normalizedText,
				name: normalizedItem?.name || input.text,
				brand: normalizedItem?.brand || "Não identificada",
				category: normalizedItem?.category || "Não identificada",
				confidenceScore,
				rejected,
				revision: rejected,
			};
		});
	}

	private buildNormalizedText(
		normalizedItem: NormalizedProduct | undefined,
		fallbackText: string,
	) {
		const rawText = `${normalizedItem?.name || fallbackText} ${normalizedItem?.brand || ""}`.trim();
		return rawText || fallbackText;
	}

	private normalizeConfidenceScore(confidenceScore: unknown) {
		if (
			typeof confidenceScore !== "number" ||
			!Number.isFinite(confidenceScore)
		) {
			return 0;
		}

		if (confidenceScore < 0) {
			return 0;
		}

		if (confidenceScore > 1) {
			return 1;
		}

		return confidenceScore;
	}
}

export const productNormalizerService = new ProductNormalizerService();
