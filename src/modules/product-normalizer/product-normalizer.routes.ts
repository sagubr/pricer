import { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { productNormalizerController as controller } from "./product-normalizer.controller";
import { createProductNormalizerSchema, ProductNormalizerRequest } from "./product-normalizer.types";

export default async function productNormalizerRouter(
	fastify: FastifyInstance,
) {
	const app = fastify.withTypeProvider<ZodTypeProvider>();

	app.post<{ Body: ProductNormalizerRequest }>(
		"/normalize",
		{
			schema: {
				body: createProductNormalizerSchema,
				tags: ["Product Normalizer"],
				description: "Normaliza em lote os titulos brutos de produtos e separa aceitos e rejeitados por confiabilidade",
			},
		},
		(request, reply) => controller.normalize(request, reply),
	);
}
