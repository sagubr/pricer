import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { cacheProvider } from "./cache.factory";
import { response } from "@/shared/http/response";
import { env } from "@/config/env.config";
import { UnauthorizedError } from "@/shared/http/api.error";
import { logger } from "../observability/logger.config";

interface CachePluginOptions {
	prefix?: string;
}

const cacheKeyParamSchema = z.object({
	key: z.string().describe("Cache key to clear"),
});

export default fp<CachePluginOptions>(async function cachePlugin(
	app: FastifyInstance,
	options,
) {
	const prefix = options.prefix ?? "/cache";
	const cacheToken = env.CACHE_ADMIN_TOKEN;

	if (!cacheToken) {
		throw new Error("CACHE_ADMIN_TOKEN environment variable is required");
	}

	app.register(
		async function (cacheScope) {
			cacheScope.addHook("preHandler", async (request) => {
				const token = request.headers["x-cache-token"];

				if (token !== cacheToken) {
					logger.warn(
						{
							ip: request.ip,
							route: request.url,
						},
						"Unauthorized cache operation attempt",
					);

					throw new UnauthorizedError("Invalid cache token");
				}
			});

			cacheScope.get(
				"/",
				{
					schema: {
						description: "List all active cache keys with TTL and expiration time",
						tags: ["Cache"],
						headers: z.object({
							"x-cache-token": z
								.string()
								.describe("Cache admin token"),
						}),
					},
				},
				async (request, reply) => {
					const keys = await cacheProvider.listKeys();
					logger.info(
						{
							ip: request.ip,
							count: keys.length,
						},
						"Cache keys listed"
					);
					return reply.send(response(keys, "Cache keys retrieved"));
				},
			);

			cacheScope.delete(
				"/",
				{
					schema: {
						description: "Clear all cache",
						tags: ["Cache"],
						headers: z.object({
							"x-cache-token": z
								.string()
								.describe("Cache admin token"),
						}),
					},
				},
				async (request, reply) => {
					await cacheProvider.flush();
					logger.info(
						{
							ip: request.ip,
						},
						"Cache fully cleared",
					);
					return reply.send(response(null, "Cache cleared"));
				},
			);

			cacheScope.delete<{ Params: z.infer<typeof cacheKeyParamSchema> }>(
				"/:key",
				{
					schema: {
						description: "Clear a specific cache key",
						tags: ["Cache"],
						params: cacheKeyParamSchema,
						headers: z.object({
							"x-cache-token": z
								.string()
								.describe("Cache admin token"),
						}),
					},
				},
				async (request, reply) => {
					const { key } = request.params;
					await cacheProvider.del(key);
					logger.info(
						{
							key,
							ip: request.ip,
						},
						`Cache key ${key} cleared`,
					);
					return reply.send(
						response(null, `Cache key ${key} cleared`),
					);
				},
			);
		},
		{ prefix },
	);
});
