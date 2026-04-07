import type { FastifyReply, FastifyRequest } from "fastify";
import type {
	InvoiceItemData,
	ListProductsQuery,
	ProductSearchCandidate,
	ProductListItem,
	ProductSemanticCandidate,
	SearchProductsQuery,
	SearchProductsResponse,
} from "./product.types";

export interface IProductRepository {
	searchByText(input: {
		query: string;
		limit: number;
	}): Promise<ProductSearchCandidate[]>;

	searchBySemantic(input: {
		vector: number[];
		limit: number;
	}): Promise<ProductSemanticCandidate[]>;

	list(input: {
		limit: number;
		offset: number;
	}): Promise<ProductListItem[]>;

	getInvoiceItemsByProductId(productId: number, limit?: number): Promise<InvoiceItemData[]>;
}

export interface IProductService {
	search(input: SearchProductsQuery): Promise<SearchProductsResponse>;
	list(input: ListProductsQuery): Promise<SearchProductsResponse>;
}

export interface IProductController {
	list(
		request: FastifyRequest<{ Querystring: ListProductsQuery }>,
		reply: FastifyReply,
	): Promise<FastifyReply>;

	search(
		request: FastifyRequest<{ Querystring: SearchProductsQuery }>,
		reply: FastifyReply,
	): Promise<FastifyReply>;
}
