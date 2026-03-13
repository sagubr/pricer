import { HttpClient } from "@/infra/http/http.client";
import { IGeocodingGateway } from "./nominatin.interface";
import { NominatimRaw } from "./nominatin.types";

class NominatimGateway implements IGeocodingGateway {
	private url: string = "https://nominatim.openstreetmap.org";

	constructor(private readonly http: HttpClient = new HttpClient()) {}

	async search(query: string): Promise<NominatimRaw[]> {
		const url = `${this.url}/search?format=json&countrycodes=br&q=${encodeURIComponent(
			query,
		)}`;

		return this.http.get<NominatimRaw[]>(url, {
			headers: {
				"User-Agent": "invoice-parser/1.0",
			},
		});
	}
}

export const nominatimGateway = new NominatimGateway();
