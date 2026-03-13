import type { FastifyRequest, FastifyReply } from "fastify";
import { response } from "@/shared/http/response";
import type {
	INotificationController,
	INotificationService,
} from "./notification.interface";
import { notificationService } from "./notification.service";
import type { CreateNotificationInput } from "./notification.types";

export class NotificationController implements INotificationController {
	constructor(
		private readonly service: INotificationService = notificationService,
	) {}

	async sendTestEmailSuccess(
		request: FastifyRequest,
		reply: FastifyReply,
	) {
		await this.service.sendTestEmailSuccess(
			request.body as CreateNotificationInput,
		);
		return reply.send(response(null, "Notification scheduled"));
	}

	async sendTestEmailError(request: FastifyRequest, reply: FastifyReply) {
		await this.service.sendTestEmailError();
		return reply.send(response());
	}
}

export const notificationController = new NotificationController();
