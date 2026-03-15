import { env } from "@/config/env.config";

export const queuePrefix =
	env.QUEUE_PREFIX || `${env.SERVICE_NAME}:${env.NODE_ENV}`;

export const queueSettings = {
	attempts: 3,
	removeOnComplete: false,
	maxStalledCount: 2,
};
