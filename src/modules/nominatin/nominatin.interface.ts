import { NominatimRaw, GeocodingResult } from "./nominatin.types";

export interface IGeocodingGateway {
	search(query: string): Promise<NominatimRaw[]>;
}

export interface IGeocodingService {
	geocode(query: string): Promise<GeocodingResult | null>;
}
