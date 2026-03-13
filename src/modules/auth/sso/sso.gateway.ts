import { HttpClient } from "@/infra/http/http.client";
import { SsoGateway } from "./sso.interface";

export class SsoHttpGateway implements SsoGateway {
	constructor(private readonly http: HttpClient = new HttpClient()) {}

	async authenticate(email: string, password: string) {
		return this.http.post<{
			externalId: string;
			email: string;
			name: string;
		} | null>("/sso/login", { email, password });
	}
}
