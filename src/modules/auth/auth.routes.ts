import { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { authController as controller } from "./auth.controller";
import {
	loginSchema,
	registerSchema,
	refreshTokenSchema,
	registerResponseSchema,
	refreshResponseSchema,
	meResponseSchema,
} from "./auth.types";
import z from "zod";

export default async function authRouter(fastify: FastifyInstance) {
	const app = fastify.withTypeProvider<ZodTypeProvider>();

	app.post(
		"/login",
		{
			schema: {
				description: "Login with email and password (local or SSO)",
				tags: ["Auth"],
				body: loginSchema,
			},
		},
		(request, reply) => controller.login(request, reply),
	);

	app.post(
		"/register",
		{
			schema: {
				description: "Register a new local user",
				tags: ["Auth"],
				body: registerSchema,
				response: {
					201: registerResponseSchema,
				},
			},
		},
		(request, reply) => controller.register(request, reply),
	);

	app.post(
		"/refresh",
		{
			schema: {
				description: "Refresh access token using refresh token",
				tags: ["Auth"],
				body: refreshTokenSchema,
				response: {
					200: refreshResponseSchema,
				},
			},
		},
		(request, reply) => controller.refresh(request, reply),
	);

	app.post(
		"/logout",
		{
			schema: {
				description: "Logout and revoke session",
				tags: ["Auth"],
				headers: z.object({
					authorization: z.string().describe("Bearer token"),
				}),
			},
		},
		(request, reply) => controller.logout(request, reply),
	);

	app.get(
		"/me",
		{
			schema: {
				description: "Get current authenticated user",
				tags: ["Auth"],
				headers: z.object({
					authorization: z.string().describe("Bearer token"),
				}),
				response: {
					200: meResponseSchema,
				},
			},
		},
		(request, reply) => controller.me(request, reply),
	);
}
