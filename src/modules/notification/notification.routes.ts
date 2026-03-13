import { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { notificationController as controller } from "./notification.controller";
import { createNotificationSchema } from "./notification.types";

export default async function notificationRouter(fastify: FastifyInstance) {
	const app = fastify.withTypeProvider<ZodTypeProvider>();

	app.post(
		"/send-success",
		{
			schema: {
				body: createNotificationSchema,
				tags: ["Notification"],
				description: "Envia uma notificação de sucesso",
			},
		},
		(request, reply) => controller.sendTestEmailSuccess(request, reply),
	);

	app.post(
		"/send-error",
		{
			schema: {
				body: createNotificationSchema,
				tags: ["Notification"],
				description: "Envia uma notificação de erro",
			},
		},
		(request, reply) => controller.sendTestEmailError(request, reply),
	);
}
