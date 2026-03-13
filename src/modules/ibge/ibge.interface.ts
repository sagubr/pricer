import type { FastifyReply, FastifyRequest } from "fastify";
import type { IbgeCity, IbgeCityRaw } from "./ibge.types";

export interface IIbgeGateway {
	getCities(): Promise<IbgeCityRaw[]>;
}

export interface IIbgeService {
	getCities(): Promise<IbgeCity[]>;
}

export interface IIbgeController {
	getCities(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply>;
}
