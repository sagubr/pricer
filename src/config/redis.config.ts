import { env } from "./env.config";

export const redis = {
	host: env.REDIS_HOST,
	port: env.REDIS_PORT,
	db: env.REDIS_DB,
};
