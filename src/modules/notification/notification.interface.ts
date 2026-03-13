import type { FastifyReply, FastifyRequest } from "fastify";
import type { CreateNotificationInput } from "./notification.types";

export interface INotificationService {
	sendTestEmailSuccess(payload: CreateNotificationInput): Promise<void>;
	sendTestEmailError(): Promise<never>;
}

export interface INotificationController {
	sendTestEmailSuccess(
		request: FastifyRequest,
		reply: FastifyReply,
	): Promise<FastifyReply>;
	sendTestEmailError(
		request: FastifyRequest,
		reply: FastifyReply,
	): Promise<FastifyReply>;
}
