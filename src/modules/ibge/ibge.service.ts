import { cacheProvider } from "@/infra/cache/cache.factory";
import { ibgeGateway } from "./ibge.gateway";
import { IbgeCity } from "./ibge.types";
import type { IIbgeGateway, IIbgeService } from "./ibge.interface";

class IbgeService implements IIbgeService {
	constructor(private readonly gateway: IIbgeGateway = ibgeGateway) {}

	async getCities(): Promise<IbgeCity[]> {
		const mapToSimpleCity = (rawCity: any): IbgeCity => ({
			id: rawCity.id,
			nome: rawCity.nome,
			estado: rawCity.microrregiao?.mesorregiao?.UF?.sigla || "N/A",
			nomeEstado: rawCity.microrregiao?.mesorregiao?.UF?.nome || "N/A",
		});

		const cached = await cacheProvider.get<IbgeCity[]>("ibge:cities");
		if (cached) return cached;

		const rawCities = await this.gateway.getCities();
		const cities = rawCities.map((city) => mapToSimpleCity(city));
		await cacheProvider.set("ibge:cities", cities, 3600);
		return cities;
	}
}

export const ibgeService = new IbgeService();
