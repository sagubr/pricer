import { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
	listProductsQuerySchema,
	searchProductsQuerySchema,
	type ListProductsQuery,
	type SearchProductsQuery,
} from "./product.types";
import { productController as controller} from "./product.controller";

export default async function productRouter(fastify: FastifyInstance) {
	const app = fastify.withTypeProvider<ZodTypeProvider>();

	app.get<{ Querystring: ListProductsQuery }>(
		"/",
		{
			schema: {
				querystring: listProductsQuerySchema,
				tags: ["Products"],
				description: "Lista todos os produtos com paginacao",
			},
		},
		(request, reply) => controller.list(request, reply),
	);

	app.get<{ Querystring: SearchProductsQuery }>(
		"/search",
		{
			schema: {
				querystring: searchProductsQuerySchema,
				tags: ["Products"],
				description:
					"Pesquisa inteligente de produtos com relevancia semantica e textual",
			},
		},
		(request, reply) => controller.search(request, reply),
	);
}
