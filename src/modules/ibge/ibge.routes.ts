import { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { ibgeController as controller } from "./ibge.controller";

export default async function ibgeRouter(fastify: FastifyInstance) {
	const app = fastify.withTypeProvider<ZodTypeProvider>();

	app.get(
		"/cities",
		{
			schema: {
				tags: ["IBGE"],
				description: "Lista todas as cidades",
			},
		},
		(request, reply) => controller.getCities(request, reply),
	);
}
