export interface NominatimRaw {
	lat: string;
	lon: string;
	display_name: string;
	addresstype?: string;
}

export interface GeocodingResult {
	lat: number;
	lon: number;
	displayName: string;
}
