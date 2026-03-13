import { z } from "zod";

export const createProductNormalizerSchema = z.object({
	items: z
		.array(
			z
				.string()
				.min(1, "Cada item precisa ter um texto valido para normalizacao."),
		)
		.min(1, "Ao menos um item e obrigatorio para normalizacao."),
});

export interface ProductNormalizerRequest {
	items: string[];
}

export interface ProductNormalizationSourceItem {
	index: number;
	description: string;
	code?: string;
	quantity?: number;
	unit?: string;
	unitPrice?: number;
	total?: number;
}

export interface ProductNormalizationInput {
	source: {
		type: "invoice" | "manual";
		reference?: string;
	};
	metadata?: {
		issuerName?: string;
		issuerDocument?: string;
		emittedAt?: string;
		total?: number;
	};
	items: ProductNormalizationSourceItem[];
}

export interface NormalizedProduct {
	index: number;
	name: string;
	brand: string;
	category: string;
	confidenceScore: number;
}

export interface ProductNormalizationResultItem {
	index: number;
	originalText: string;
	normalizedText: string;
	name: string;
	brand: string;
	category: string;
	confidenceScore: number;
	rejected: boolean;
	revision: boolean;
}

export interface ProductNormalizerResponse {
	data: {
		items: ProductNormalizationResultItem[];
		minimumConfidenceScore: number;
	};
}

export type CreateProductNormalizerInput = z.infer<
	typeof createProductNormalizerSchema
>;
