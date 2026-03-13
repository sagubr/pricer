import type { FastifyRequest, FastifyReply } from "fastify";
import {
	IProductNormalizerController,
	IProductNormalizerService,
} from "./product-normalizer.interface";
import { productNormalizerService } from "./product-normalizer.service";
import { response } from "@/shared/http/response";
import { createProductNormalizerSchema, ProductNormalizerRequest } from "./product-normalizer.types";

class ProductNormalizerController implements IProductNormalizerController {
	constructor(
		private readonly service: IProductNormalizerService =
			productNormalizerService,
	) {}

	async normalize(request: FastifyRequest<{ Body: ProductNormalizerRequest }>, reply: FastifyReply) {
		const { items } = createProductNormalizerSchema.parse(request.body);

		if (!items.length) {
			return reply.status(400).send({
				error: "Ao menos um item e obrigatorio para normalizacao.",
			});
		}

		try {
			const result = await this.service.normalizeProductTitles(items);
			return reply.send(
				response(result, "Itens normalizados com sucesso"),
			);
		} catch (error) {
			return reply
				.status(500)
				.send(response(null, "Falha ao normalizar itens", false));
		}
	}
}

export const productNormalizerController = new ProductNormalizerController();
