export interface JwtPayload {
	userId: number;
	email: string;
	permissionVersion: string;
	appVersion: string;
	sessionId: number;
}

export interface TokenPair {
	accessToken: string;
	refreshToken: string;
}
