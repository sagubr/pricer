import { FastifyRequest, FastifyReply, FastifyError } from "fastify";
import { ApiError } from "@/shared/http/api.error";
import * as Sentry from "@sentry/node";

export function errorHandler(
	error: FastifyError,
	request: FastifyRequest,
	reply: FastifyReply,
) {
	request.log.error(
		{
			error: error.message,
			stack: error.stack,
			url: request.url,
			method: request.method,
			headers: request.headers,
			body: request.body,
		},
		"Request error",
	);

	if (error instanceof ApiError) {
		return reply.status(error.statusCode).send({
			success: false,
			error: {
				message: error.message,
				code: error.statusCode,
				stack: error.stack,
			},
		});
	}

	Sentry.captureException(error, {
		tags: {
			component: "error_handler",
		},
		extra: {
			url: request.url,
			method: request.method,
			headers: request.headers,
			body: request.body,
		},
	});

	if (error instanceof Error) {
		return reply.status(500).send({
			success: false,
			error: {
				message: error.message,
				code: 500,
				stack: error.stack,
			},
		});
	}

	return reply.status(500).send({
		success: false,
		error: {
			message: "Internal server error",
			code: 500,
			stack: error,
		},
	});
}
