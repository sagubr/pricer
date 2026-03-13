export interface CacheKeyInfo {
	key: string;
	ttl: number;
	expiresAt?: string;
}

export interface ICacheProvider {
	get<T>(key: string): Promise<T | undefined>;
	set<T>(key: string, value: T, ttl?: number): Promise<void>;
	del(keys: string | string[]): Promise<void>;
	flush(): Promise<void>;
	listKeys(pattern?: string): Promise<CacheKeyInfo[]>;
}
