export interface IbgeCityRaw {
	id: number;
	nome: string;
	microrregiao?: {
		mesorregiao?: {
			UF?: {
				sigla: string;
				nome: string;
			};
		};
	};
}

export interface IbgeCity {
	id: number;
	nome: string;
	estado: string;
	nomeEstado: string;
}
