import { FastifyRequest, FastifyReply } from "fastify";
import { jwtService } from "../jwt/jwt.service";
import { versionConfig } from "@/config/version.config";
import { db } from "@/infra/db/db.config";
import { sessions } from "../auth.schema";
import { eq, and, isNull } from "drizzle-orm";
import {
	AppVersionOutdatedError,
	InvalidSessionError,
} from "../errors/auth.error";

export interface AuthenticatedUser {
	id: number;
	email: string;
	sessionId: number;
}

declare module "fastify" {
	interface FastifyRequest {
		user?: AuthenticatedUser;
	}
}

export async function authGuard(request: FastifyRequest, reply: FastifyReply) {
	try {
		const token = extractTokenFromHeader(request);

		if (!token) {
			return reply.status(401).send({
				success: false,
				message: "No token provided",
			});
		}

		const payload = jwtService.verifyAccessToken(token);

		const [session] = await db
			.select()
			.from(sessions)
			.where(
				and(
					eq(sessions.id, payload.sessionId),
					isNull(sessions.revokedAt),
				),
			)
			.limit(1);

		if (!session) {
			throw new InvalidSessionError();
		}

		const currentVersion = versionConfig.getVersion();
		if (payload.appVersion !== currentVersion) {
			throw new AppVersionOutdatedError();
		}

		request.user = {
			id: payload.userId,
			email: payload.email,
			sessionId: payload.sessionId,
		};

		await db
			.update(sessions)
			.set({ lastUsedAt: new Date() })
			.where(eq(sessions.id, session.id));
	} catch (error) {
		if (error instanceof AppVersionOutdatedError) {
			return reply.status(error.statusCode).send({
				success: false,
				message: error.message,
				code: "APP_VERSION_OUTDATED",
			});
		}

		if (error instanceof InvalidSessionError) {
			return reply.status(error.statusCode).send({
				success: false,
				message: error.message,
				code: "INVALID_SESSION",
			});
		}

		return reply.status(401).send({
			success: false,
			message:
				error instanceof Error ?
					error.message
				:	"Authentication failed",
		});
	}
}

function extractTokenFromHeader(request: FastifyRequest): string | null {
	const authHeader = request.headers.authorization;
	if (!authHeader?.startsWith("Bearer ")) {
		return null;
	}
	return authHeader.substring(7);
}

export function createAuthHook() {
	return async (request: FastifyRequest, reply: FastifyReply) => {
		await authGuard(request, reply);
	};
}
