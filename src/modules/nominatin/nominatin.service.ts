import { cacheProvider } from "@/infra/cache/cache.factory";
import { GeocodingResult, NominatimRaw } from "./nominatin.types";
import type { IGeocodingGateway } from "./nominatin.interface";
import { nominatimGateway } from "./nominatin.gateway";

class NominatimService {
	constructor(
		private readonly gateway: IGeocodingGateway = nominatimGateway,
	) {}

	async geocode(query: string): Promise<GeocodingResult | null> {
		const cacheKey = `geocode:${query.toLowerCase()}`;

		const cached = await cacheProvider.get<GeocodingResult>(cacheKey);
		if (cached) return cached;

		const results = await this.gateway.search(query);

		if (!results.length) return null;

		const municipality =
			results.find((r) => r.addresstype === "municipality") || results[0];

		const mapped: GeocodingResult = this.mapToGeocode(municipality);

		await cacheProvider.set(cacheKey, mapped, 86400);

		return mapped;
	}

	private mapToGeocode(raw: NominatimRaw): GeocodingResult {
		return {
			lat: Number(raw.lat),
			lon: Number(raw.lon),
			displayName: raw.display_name,
		};
	}
}

export const nominatimService = new NominatimService();
