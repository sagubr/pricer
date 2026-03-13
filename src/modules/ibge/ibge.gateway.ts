import { HttpClient } from "@/infra/http/http.client";
import { IbgeCityRaw } from "./ibge.types";
import type { IIbgeGateway } from "./ibge.interface";

class IbgeGateway implements IIbgeGateway {
	private url: string = "https://servicodados.ibge.gov.br/api";
	private version: string = "v1";

	constructor(private readonly http: HttpClient = new HttpClient()) {}

	async getCities(): Promise<IbgeCityRaw[]> {
		const url = `${this.url}/${this.version}/localidades/municipios?orderBy=nome`;
		return this.http.get<IbgeCityRaw[]>(url);
	}
}

export const ibgeGateway = new IbgeGateway();
