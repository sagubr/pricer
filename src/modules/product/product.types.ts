import { z } from "zod";

export const searchProductsQuerySchema = z.object({
	q: z.string().trim().min(1).max(120),
	brand: z.string().trim().min(1).max(100).optional(),
	category: z.string().trim().min(1).max(100).optional(),
	limit: z.coerce.number().int().min(1).max(50).default(20),
	offset: z.coerce.number().int().min(0).default(0),
});

export type SearchProductsQuery = z.infer<typeof searchProductsQuerySchema>;

export interface ProductSearchItem {
	id: number;
	externalId: string;
	name: string;
	brand: string | null;
	category: string | null;
	matchCount: number;
	score: number;
	semanticScore: number;
	textScore: number;
}

export interface InvoiceItemData {
	receiptId: number;
	establishmentName: string;
	rawDescription: string;
	unitPrice: number;
	emittedAt: Date | null;
}

export interface ProductWithInvoices extends ProductSearchItem {
	invoices: InvoiceItemData[];
}

export interface SearchProductsResponse {
	items: ProductWithInvoices[];
	pagination: {
		limit: number;
		offset: number;
		hasMore: boolean;
	};
}

export interface ProductSearchCandidate {
	id: number;
	externalId: string;
	name: string;
	brand: string | null;
	category: string | null;
	matchCount: number;
	textScore: number;
}

export interface ProductSemanticCandidate {
	id: number;
	externalId: string;
	name: string;
	brand: string | null;
	category: string | null;
	matchCount: number;
	semanticScore: number;
}
