import NodeCache from "node-cache";
import { ICacheProvider } from "../cache.interface";

const options = {
	stdTTL: 60 * 5,
	checkperiod: 60,
	useClones: false,
};

export class NodeCacheProvider implements ICacheProvider {
	constructor(private readonly cache: NodeCache = new NodeCache(options)) {}

	async get<T>(key: string): Promise<T | undefined> {
		return this.cache.get<T>(key);
	}

	async set<T>(key: string, value: T, ttl?: number): Promise<void> {
		if (ttl) {
			this.cache.set(key, value, ttl);
			return;
		}
		this.cache.set(key, value);
	}

	async del(keys: string | string[]): Promise<void> {
		this.cache.del(keys);
	}

	async flush(): Promise<void> {
		this.cache.flushAll();
	}

	async listKeys(
		pattern = "*",
	): Promise<Array<{ key: string; ttl: number; expiresAt?: string }>> {
		const allKeys = this.cache.keys();
		const regex = new RegExp(`^${pattern.replace(/\*/g, ".*")}$`);
		const filteredKeys = allKeys.filter((key) => regex.test(key));

		return filteredKeys.map((key) => {
			const ttl = this.cache.getTtl(key);
			const remainingTtl =
				ttl ? Math.ceil((ttl - Date.now()) / 1000) : -1;
			const expiresAt =
				remainingTtl > 0 && ttl ?
					new Date(ttl).toISOString()
				:	undefined;

			return {
				key,
				ttl: remainingTtl,
				expiresAt,
			};
		});
	}
}
