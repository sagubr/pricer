import { logger } from "@/infra/observability/logger.config";
import { embeddingService } from "@/modules/embedding/embedding.service";
import type { IProductRepository, IProductService } from "./product.interface";
import { productRepository } from "./product.repository";
import type {
	ProductSearchItem,
	ProductWithInvoices,
	SearchProductsQuery,
	SearchProductsResponse,
} from "./product.types";

const WEIGHTS = {
	semantic: 0.6,
	text: 0.35,
	popularity: 0.05,
} as const;

const EXTRA_CANDIDATES = 20;
const MAX_CANDIDATE_POOL = 100;
const MINIMUM_SEARCH_SCORE = 0.2;

class ProductService implements IProductService {
	constructor(private readonly repository: IProductRepository = productRepository) {}

	async search(input: SearchProductsQuery): Promise<SearchProductsResponse> {
		const query = input.q.trim();
		const candidateLimit = Math.min(
			input.limit + input.offset + EXTRA_CANDIDATES,
			MAX_CANDIDATE_POOL,
		);

		const [textCandidates, queryEmbedding] = await Promise.all([
			this.repository.searchByText({
				query,
				brand: input.brand,
				category: input.category,
				limit: candidateLimit,
			}),
			this.tryGenerateQueryEmbedding(query),
		]);

		const semanticCandidates =
			queryEmbedding ?
				await this.repository.searchBySemantic({
					vector: queryEmbedding,
					brand: input.brand,
					category: input.category,
					limit: candidateLimit,
				})
			:	[];

		const combined = new Map<number, ProductSearchItem>();

		for (const candidate of textCandidates) {
			combined.set(candidate.id, {
				id: candidate.id,
				externalId: candidate.externalId,
				name: candidate.name,
				brand: candidate.brand,
				category: candidate.category,
				matchCount: candidate.matchCount,
				score: 0,
				semanticScore: 0,
				textScore: candidate.textScore,
			});
		}

		for (const candidate of semanticCandidates) {
			const existing = combined.get(candidate.id);
			if (existing) {
				existing.semanticScore = Math.max(
					existing.semanticScore,
					candidate.semanticScore,
				);
				continue;
			}

			combined.set(candidate.id, {
				id: candidate.id,
				externalId: candidate.externalId,
				name: candidate.name,
				brand: candidate.brand,
				category: candidate.category,
				matchCount: candidate.matchCount,
				score: 0,
				semanticScore: candidate.semanticScore,
				textScore: 0,
			});
		}

		const maxMatchCount = this.findMaxMatchCount(Array.from(combined.values()));
		const rankedItems = Array.from(combined.values()).map((item) => {
			const popularityScore = this.calculatePopularityScore(
				item.matchCount,
				maxMatchCount,
			);

			return {
				...item,
				score: this.clampScore(
					item.semanticScore * WEIGHTS.semantic +
						item.textScore * WEIGHTS.text +
						popularityScore * WEIGHTS.popularity,
				),
			};
		});

		rankedItems.sort((a, b) => {
			if (b.score !== a.score) {
				return b.score - a.score;
			}

			if (b.matchCount !== a.matchCount) {
				return b.matchCount - a.matchCount;
			}

			return a.name.localeCompare(b.name, "pt-BR");
		});

		const filteredItems = rankedItems.filter(
			(item) => item.score >= MINIMUM_SEARCH_SCORE,
		);

		const paginatedItems = filteredItems.slice(
			input.offset,
			input.offset + input.limit,
		);

		const itemsWithInvoices: ProductWithInvoices[] = await Promise.all(
			paginatedItems.map(async (item) => ({
				...item,
				invoices: await this.repository.getInvoiceItemsByProductId(item.id),
			})),
		);

		return {
			items: itemsWithInvoices,
			pagination: {
				limit: input.limit,
				offset: input.offset,
				hasMore: filteredItems.length > input.offset + input.limit,
			},
		};
	}

	private async tryGenerateQueryEmbedding(query: string) {
		try {
			return await embeddingService.embedText(query);
		} catch (error) {
			logger.warn(
				{ error, query },
				"Falha ao gerar embedding da busca; usando fallback textual",
			);
			return null;
		}
	}

	private findMaxMatchCount(items: ProductSearchItem[]) {
		if (items.length === 0) {
			return 0;
		}

		return Math.max(...items.map((item) => item.matchCount));
	}

	private calculatePopularityScore(matchCount: number, maxMatchCount: number) {
		if (maxMatchCount <= 0) {
			return 0;
		}

		return Math.log1p(matchCount) / Math.log1p(maxMatchCount);
	}

	private clampScore(value: number): number {
		if (value < 0) {
			return 0;
		}

		if (value > 1) {
			return 1;
		}

		return value;
	}
}

export const productService = new ProductService();
