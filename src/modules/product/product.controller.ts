import type { FastifyReply, FastifyRequest } from "fastify";
import { response } from "@/shared/http/response";
import { productService } from "./product.service";
import type { IProductController, IProductService } from "./product.interface";
import type { ListProductsQuery, SearchProductsQuery } from "./product.types";

class ProductController implements IProductController {
	constructor(private readonly service: IProductService = productService) {}

	async list(
		request: FastifyRequest<{ Querystring: ListProductsQuery }>,
		reply: FastifyReply,
	) {
		const result = await this.service.list(request.query);
		return reply
			.status(200)
			.send(response(result, "Lista de produtos obtida com sucesso"));
	}

	async search(
		request: FastifyRequest<{ Querystring: SearchProductsQuery }>,
		reply: FastifyReply,
	) {
		const result = await this.service.search(request.query);
		return reply
			.status(200)
			.send(response(result, "Busca de produtos realizada com sucesso"));
	}
}

export const productController = new ProductController();
