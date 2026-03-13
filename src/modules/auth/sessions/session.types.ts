export interface CreateSessionInput {
	userId: number;
	refreshToken: string;
	userAgent?: string;
	ipAddress?: string;
}
