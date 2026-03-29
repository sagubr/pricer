import type { FastifyReply, FastifyRequest } from "fastify";
import type {
	ProductSearchCandidate,
	ProductSemanticCandidate,
	SearchProductsQuery,
	SearchProductsResponse,
} from "./product.types";

export interface IProductRepository {
	searchByText(input: {
		query: string;
		brand?: string;
		category?: string;
		limit: number;
	}): Promise<ProductSearchCandidate[]>;

	searchBySemantic(input: {
		vector: number[];
		brand?: string;
		category?: string;
		limit: number;
	}): Promise<ProductSemanticCandidate[]>;
}

export interface IProductService {
	search(input: SearchProductsQuery): Promise<SearchProductsResponse>;
}

export interface IProductController {
	search(
		request: FastifyRequest<{ Querystring: SearchProductsQuery }>,
		reply: FastifyReply,
	): Promise<FastifyReply>;
}
