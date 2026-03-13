import { auth } from "@/config/auth.config";
import { versionConfig } from "@/config/version.config";
import { UnauthorizedError } from "@/shared/http/api.error";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { JwtPayload, TokenPair } from "./jwt.types";

class JwtService {
	private readonly accessTokenExpiry = auth.jwtExpiresIn;
	private readonly refreshTokenExpiry = "7d";
	private readonly issuer = "gqf-api";
	private readonly audience = "gqf-client";

	generateAccessToken(payload: JwtPayload): string {
		const payloadWithVersion = {
			...payload,
			appVersion: versionConfig.getVersion(),
		};

		return jwt.sign(payloadWithVersion, auth.jwtSecret, {
			expiresIn: this.accessTokenExpiry,
			issuer: this.issuer,
			audience: this.audience,
		});
	}

	generateRefreshToken(): string {
		return crypto.randomBytes(64).toString("hex");
	}

	generateTokenPair(payload: JwtPayload): TokenPair {
		return {
			accessToken: this.generateAccessToken(payload),
			refreshToken: this.generateRefreshToken(),
		};
	}

	verifyAccessToken(token: string): JwtPayload {
		try {
			const decoded = jwt.verify(token, auth.jwtSecret, {
				issuer: this.issuer,
				audience: this.audience,
			}) as JwtPayload;

			return decoded;
		} catch (error) {
			if (error instanceof jwt.TokenExpiredError) {
				throw new UnauthorizedError("Token expired");
			}
			if (error instanceof jwt.JsonWebTokenError) {
				throw new UnauthorizedError("Invalid token");
			}
			throw new UnauthorizedError("Token verification failed");
		}
	}

	hashRefreshToken(token: string): string {
		return crypto.createHash("sha256").update(token).digest("hex");
	}

	getRefreshTokenExpiry(): Date {
		const now = new Date();
		const expiryMs = this.parseExpiryToMs(this.refreshTokenExpiry);
		return new Date(now.getTime() + expiryMs);
	}

	private parseExpiryToMs(expiry: string): number {
		const match = expiry.match(/^(\d+)([smhd])$/);
		if (!match) throw new Error("Invalid expiry format");

		const [, value, unit] = match;
		const numValue = parseInt(value, 10);

		switch (unit) {
			case "s":
				return numValue * 1000;
			case "m":
				return numValue * 60 * 1000;
			case "h":
				return numValue * 60 * 60 * 1000;
			case "d":
				return numValue * 24 * 60 * 60 * 1000;
			default:
				throw new Error("Invalid time unit");
		}
	}
}

export const jwtService = new JwtService();
