export interface SsoGateway {
	authenticate(
		email: string,
		password: string,
	): Promise<{
		externalId: string;
		email: string;
		name: string;
	} | null>;
}
