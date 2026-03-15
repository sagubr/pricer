import { cacheProvider } from "@/infra/cache/cache.factory";
import { db } from "@/infra/db/db.config";
import { and, eq, isNull, lt } from "drizzle-orm";
import {
	refreshTokens,
	sessions,
	type Session
} from "../auth.schema";
import { jwtService } from "../jwt/jwt.service";
import { CreateSessionInput } from "./session.types";

class SessionService {
	private readonly CACHE_PREFIX = "session:";
	private readonly MAX_SESSIONS_PER_USER = 5;

	async createSession(input: CreateSessionInput): Promise<Session> {
		const refreshTokenHash = jwtService.hashRefreshToken(
			input.refreshToken,
		);

		const expiresAt = jwtService.getRefreshTokenExpiry();

		await this.enforceSessionLimit(input.userId);

		const [result] = await db
			.insert(sessions)
			.values({
				userId: input.userId,
				refreshTokenHash,
				userAgent: input.userAgent,
				ipAddress: input.ipAddress,
				expiresAt,
			})
			.returning({ id: sessions.id });

		const sessionId = result.id;

		await db.insert(refreshTokens).values({
			sessionId,
			tokenHash: refreshTokenHash,
			expiresAt,
		});

		const [session] = await db
			.select()
			.from(sessions)
			.where(eq(sessions.id, sessionId));

		await cacheProvider.set(
			`${this.CACHE_PREFIX}${session.id}`,
			session,
			3600,
		);

		return session;
	}

	async validateRefreshToken(refreshToken: string): Promise<Session | null> {
		const tokenHash = jwtService.hashRefreshToken(refreshToken);

		const [tokenRecord] = await db
			.select()
			.from(refreshTokens)
			.where(
				and(
					eq(refreshTokens.tokenHash, tokenHash),
					isNull(refreshTokens.revokedAt),
				),
			)
			.limit(1);

		if (!tokenRecord) return null;

		if (new Date() > tokenRecord.expiresAt) {
			return null;
		}

		const [session] = await db
			.select()
			.from(sessions)
			.where(
				and(
					eq(sessions.id, tokenRecord.sessionId),
					isNull(sessions.revokedAt),
				),
			)
			.limit(1);

		return session || null;
	}

	async rotateRefreshToken(
		oldRefreshToken: string,
		newRefreshToken: string,
		sessionId: number,
	): Promise<void> {
		const oldTokenHash = jwtService.hashRefreshToken(oldRefreshToken);
		const newTokenHash = jwtService.hashRefreshToken(newRefreshToken);
		const expiresAt = jwtService.getRefreshTokenExpiry();

		await db
			.update(refreshTokens)
			.set({
				revokedAt: new Date(),
				replacedBy: newTokenHash,
			})
			.where(eq(refreshTokens.tokenHash, oldTokenHash));

		await db.insert(refreshTokens).values({
			sessionId,
			tokenHash: newTokenHash,
			expiresAt,
		});

		await db
			.update(sessions)
			.set({
				refreshTokenHash: newTokenHash,
				lastUsedAt: new Date(),
			})
			.where(eq(sessions.id, sessionId));
	}

	async revokeSession(sessionId: number, reason = "logout"): Promise<void> {
		await db
			.update(sessions)
			.set({
				revokedAt: new Date(),
				revokedReason: reason,
			})
			.where(eq(sessions.id, sessionId));

		await db
			.update(refreshTokens)
			.set({ revokedAt: new Date() })
			.where(eq(refreshTokens.sessionId, sessionId));

		await cacheProvider.del(`${this.CACHE_PREFIX}${sessionId}`);
	}

	async revokeAllUserSessions(
		userId: number,
		reason = "logout_all",
	): Promise<void> {
		const userSessions = await db
			.select()
			.from(sessions)
			.where(
				and(eq(sessions.userId, userId), isNull(sessions.revokedAt)),
			);

		for (const session of userSessions) {
			await this.revokeSession(session.id, reason);
		}
	}

	async getUserActiveSessions(userId: number): Promise<Session[]> {
		return db
			.select()
			.from(sessions)
			.where(
				and(eq(sessions.userId, userId), isNull(sessions.revokedAt)),
			);
	}

	private async enforceSessionLimit(userId: number): Promise<void> {
		const activeSessions = await this.getUserActiveSessions(userId);

		if (activeSessions.length >= this.MAX_SESSIONS_PER_USER) {
			const sortedSessions = activeSessions.sort(
				(a, b) => a.lastUsedAt.getTime() - b.lastUsedAt.getTime(),
			);

			const sessionsToRevoke = sortedSessions.slice(
				0,
				activeSessions.length - this.MAX_SESSIONS_PER_USER + 1,
			);

			for (const session of sessionsToRevoke) {
				await this.revokeSession(session.id, "session_limit_exceeded");
			}
		}
	}

	async cleanupExpiredSessions(): Promise<number> {
		const expiredSessions = await db
			.select()
			.from(sessions)
			.where(
				and(
					lt(sessions.expiresAt, new Date()),
					isNull(sessions.revokedAt),
				),
			);

		for (const session of expiredSessions) {
			await this.revokeSession(session.id, "expired");
		}

		return expiredSessions.length;
	}
}

export const sessionService = new SessionService();
