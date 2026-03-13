import { response } from "@/shared/http/response";
import type { FastifyReply, FastifyRequest } from "fastify";
import { authService } from "./auth.service";
import type { IAuthController, IAuthService } from "./auth.interface";
import type {
	LoginInput,
	RefreshTokenInput,
	RegisterInput,
} from "./auth.types";
import { jwtService } from "./jwt/jwt.service";

class AuthController implements IAuthController {
	constructor(private readonly service: IAuthService = authService) {}

	async login(
		request: FastifyRequest,
		reply: FastifyReply,
	) {
		const { emailOrUsername, password } = request.body as LoginInput;

		const result = await this.service.login({
			emailOrUsername,
			password,
			userAgent: request.headers["user-agent"],
			ipAddress: request.ip,
		});

		return reply.send(response(result, "Login successful"));
	}

	async register(
		request: FastifyRequest,
		reply: FastifyReply,
	) {
		const { email, name, password, loginMethod, username } =
			request.body as RegisterInput;

		const user = await this.service.register({ email, name, password, loginMethod, username });

		return reply
			.status(201)
			.send(response(user, "User registered successfully"));
	}

	async refresh(
		request: FastifyRequest,
		reply: FastifyReply,
	) {
		const { refreshToken } = request.body as RefreshTokenInput;

		const tokens = await this.service.refreshToken(refreshToken);

		return reply.send(response(tokens, "Token refreshed successfully"));
	}

	async logout(request: FastifyRequest, reply: FastifyReply) {
		const authHeader = request.headers.authorization;
		if (!authHeader?.startsWith("Bearer ")) {
			return reply.status(401).send({
				success: false,
				message: "No token provided",
			});
		}

		const token = authHeader.substring(7);
		const payload = jwtService.verifyAccessToken(token);

		await this.service.logout(payload.sessionId);

		return reply.send(response(null, "Logout successful"));
	}


	async me(request: FastifyRequest, reply: FastifyReply) {
		const authHeader = request.headers.authorization;
		if (!authHeader?.startsWith("Bearer ")) {
			return reply.status(401).send({
				success: false,
				message: "No token provided",
			});
		}

		const token = authHeader.substring(7);
		const payload = jwtService.verifyAccessToken(token);

		const user = await this.service.getUserById(payload.userId);

		if (!user) {
			return reply.status(404).send({
				success: false,
				message: "User not found",
			});
		}

		return reply.send(response(user, "User retrieved successfully"));
	}
}

export const authController = new AuthController();
