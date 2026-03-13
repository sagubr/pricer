import type { FastifyReply, FastifyRequest } from "fastify";
import { ibgeService } from "./ibge.service";
import { response } from "@/shared/http/response";
import type { IIbgeController, IIbgeService } from "./ibge.interface";

class IbgeController implements IIbgeController {
	constructor(private readonly service: IIbgeService = ibgeService) {}

	async getCities(request: FastifyRequest, reply: FastifyReply) {
		const cities = await this.service.getCities();
		return reply.send(response(cities));
	}
}

export const ibgeController = new IbgeController();
