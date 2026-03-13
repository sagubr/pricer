import type { FastifyReply, FastifyRequest } from "fastify";
import type { User } from "./auth.schema";
import type {
	LoginInput,
	LoginResponse,
	RefreshTokenInput,
	RegisterInput,
	TokenPair,
} from "./auth.types";

export interface IAuthService {
	login(input: LoginInput): Promise<LoginResponse>;
	register(input: RegisterInput): Promise<User>;
	refreshToken(refreshToken: string): Promise<TokenPair>;
	logout(sessionId: number): Promise<void>;
	getUserById(userId: number): Promise<Omit<User, "passwordHash"> | null>;
}

export interface IAuthController {
	login(
		request: FastifyRequest,
		reply: FastifyReply,
	): Promise<FastifyReply>;
	register(
		request: FastifyRequest,
		reply: FastifyReply,
	): Promise<FastifyReply>;
	refresh(
		request: FastifyRequest,
		reply: FastifyReply,
	): Promise<FastifyReply>;
	logout(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply>;
	me(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply>;
}
