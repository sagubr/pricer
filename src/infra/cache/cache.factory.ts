import { env } from "@/config/env.config";
import { NodeCacheProvider } from "./providers/node-cache.provider";
import { RedisCacheProvider } from "./providers/redis.provider";

const providers = {
	redis: RedisCacheProvider,
	"node-cache": NodeCacheProvider,
};

function createCacheProvider() {
	const Provider = providers[env.CACHE_PROVIDER || "node-cache"];

	if (!Provider) {
		throw new Error(`Invalid cache provider: ${env.CACHE_PROVIDER}`);
	}

	return new Provider();
}

export const cacheProvider = createCacheProvider();
