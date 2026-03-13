import IORedis from "ioredis";
import { redis as connection } from "@/config/redis.config";
import { ICacheProvider } from "../cache.interface";

export class RedisCacheProvider implements ICacheProvider {
	constructor(private readonly redis: IORedis = new IORedis(connection)) {}

	async get<T>(key: string): Promise<T | undefined> {
		const value = await this.redis.get(key);
		return value ? (JSON.parse(value) as T) : undefined;
	}

	async set<T>(key: string, value: T, ttl?: number): Promise<void> {
		const data = JSON.stringify(value);
		if (ttl) {
			await this.redis.set(key, data, "EX", ttl);
			return;
		}
		await this.redis.set(key, data);
	}

	async del(keys: string | string[]): Promise<void> {
		if (Array.isArray(keys)) {
			await this.redis.del(...keys);
			return;
		}
		await this.redis.del(keys);
	}

	async flush(): Promise<void> {
		await this.redis.flushall();
	}

	async listKeys(pattern = "*"): Promise<Array<{ key: string; ttl: number; expiresAt?: string }>> {
		const keys = await this.redis.keys(pattern);
		
		return Promise.all(
			keys.map(async (key) => {
				const ttl = await this.redis.ttl(key);
				const expiresAt = ttl > 0
					? new Date(Date.now() + ttl * 1000).toISOString()
					: undefined;
				
				return {
					key,
					ttl,
					expiresAt,
				};
			})
		);
	}
}
