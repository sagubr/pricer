import type { FastifyReply, FastifyRequest } from "fastify";
import type {
	ProductNormalizationInput,
	ProductNormalizerRequest,
	ProductNormalizerResponse,
} from "./product-normalizer.types";

export interface IProductNormalizerService {
	normalizeInvoiceItems(
		input: ProductNormalizationInput,
	): Promise<ProductNormalizerResponse>;
	normalizeProductTitles(items: string[]): Promise<ProductNormalizerResponse>;
}

export interface IProductNormalizerController {
	normalize(
		request: FastifyRequest<{ Body: ProductNormalizerRequest }>,
		reply: FastifyReply,
	): Promise<FastifyReply>;
}
