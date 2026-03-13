import { db } from "@/infra/db/db.config";
import { UnauthorizedError } from "@/shared/http/api.error";
import bcrypt from "bcrypt";
import { and, eq } from "drizzle-orm";
import { users, type User } from "./auth.schema";
import type { IAuthService } from "./auth.interface";
import {
	LoginInput,
	LoginResponse,
	RegisterInput,
	TokenPair,
} from "./auth.types";
import { EmailAlreadyRegisteredError } from "./errors/auth.error";
import { jwtService } from "./jwt/jwt.service";
import { sessionService } from "./sessions/session.service";
import { SsoHttpGateway } from "./sso/sso.gateway";
import type { SsoGateway } from "./sso/sso.interface";

class AuthService implements IAuthService {
	private readonly SALT_ROUNDS = 10;
	private readonly ssoGateway: SsoGateway;

	constructor(ssoGateway: SsoGateway = new SsoHttpGateway()) {
		this.ssoGateway = ssoGateway;
	}

	async login(input: LoginInput): Promise<LoginResponse> {
		const user = await this.resolveUser(input);

		if (!user.isActive) {
			throw new UnauthorizedError("User account is inactive");
		}

		const tokens = await db.transaction(async () => {
			return this.issueTokens(user, input);
		});

		return {
			user: this.sanitizeUser(user),
			tokens,
		};
	}

	async register(input: RegisterInput): Promise<User> {
		const existingEmail = await this.findUserByEmail(input.email);
		if (existingEmail) {
			throw new EmailAlreadyRegisteredError();
		}

		if (input.username) {
			const existingUsername = await this.findUserByUsername(
				input.username,
			);
			if (existingUsername) {
				throw new Error("Username already registered");
			}
		}

		const passwordHash = await bcrypt.hash(
			input.password,
			this.SALT_ROUNDS,
		);

		const [result] = await db.insert(users).values({
			email: input.email,
			username: input.username || null,
			name: input.name,
			passwordHash,
			loginMethod: input.loginMethod || "email",
			isActive: true,
		});

		const [newUser] = await db
			.select()
			.from(users)
			.where(eq(users.id, result.insertId))
			.limit(1);

		return newUser;
	}

	async refreshToken(refreshToken: string): Promise<TokenPair> {
		const session = await sessionService.validateRefreshToken(refreshToken);

		if (!session) {
			throw new UnauthorizedError("Invalid or expired refresh token");
		}

		const user = await this.findActiveUserById(session.userId);

		const newTokens = jwtService.generateTokenPair({
			userId: user.id,
			email: user.email,
			permissionVersion: user.permissionVersion,
			appVersion: "", // Will be set by jwt.service from version.json
			sessionId: session.id,
		});

		await sessionService.rotateRefreshToken(
			refreshToken,
			newTokens.refreshToken,
			session.id,
		);

		return newTokens;
	}

	async logout(sessionId: number): Promise<void> {
		await sessionService.revokeSession(sessionId);
	}

	async getUserById(
		userId: number,
	): Promise<Omit<User, "passwordHash"> | null> {
		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);

		return user ? this.sanitizeUser(user) : null;
	}

	private async resolveUser(input: LoginInput): Promise<User> {
		const user = await this.findUser(input.emailOrUsername);

		if (!user) {
			return this.authenticateViaSsoOrFail(input);
		}

		await this.authenticateExistingUser(user, input);

		return user;
	}

	private async findUser(identifier: string): Promise<User | undefined> {
		const looksLikeEmail = identifier.includes("@");

		if (looksLikeEmail) {
			return this.findUserByEmail(identifier);
		}

		return (
			(await this.findUserByUsername(identifier)) ??
			(await this.findUserByEmail(identifier))
		);
	}

	private async authenticateExistingUser(
		user: User,
		input: LoginInput,
	): Promise<void> {
		if (user.ssoProvider) {
			await this.authenticateSsoOrFail(input);
			return;
		}

		await this.validateLocalPasswordOrFail(
			input.password,
			user.passwordHash,
		);
	}

	private async issueTokens(
		user: User,
		input: LoginInput,
	): Promise<TokenPair> {
		const session = await sessionService.createSession({
			userId: user.id,
			refreshToken: jwtService.generateRefreshToken(),
			userAgent: input.userAgent,
			ipAddress: input.ipAddress,
		});

		return jwtService.generateTokenPair({
			userId: user.id,
			email: user.email,
			permissionVersion: user.permissionVersion,
			appVersion: "", // Will be set by jwt.service from version.json
			sessionId: session.id,
		});
	}

	private async findUserByEmail(email: string): Promise<User | undefined> {
		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.email, email))
			.limit(1);

		return user;
	}

	private async findUserByUsername(
		username: string,
	): Promise<User | undefined> {
		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.username, username))
			.limit(1);

		return user;
	}

	private async findActiveUserById(userId: number): Promise<User> {
		const [user] = await db
			.select()
			.from(users)
			.where(and(eq(users.id, userId), eq(users.isActive, true)))
			.limit(1);

		if (!user) {
			throw new UnauthorizedError("User not found or inactive");
		}

		return user;
	}

	private async validateLocalPasswordOrFail(
		password: string,
		hash?: string | null,
	): Promise<void> {
		if (!hash) {
			throw new UnauthorizedError("Invalid credentials");
		}

		const valid = await bcrypt.compare(password, hash);

		if (!valid) {
			throw new UnauthorizedError("Invalid credentials");
		}
	}

	private async authenticateSsoOrFail(input: LoginInput): Promise<void> {
		const result = await this.ssoGateway.authenticate(
			input.emailOrUsername,
			input.password,
		);

		if (!result) {
			throw new UnauthorizedError("Invalid SSO credentials");
		}
	}

	private async authenticateViaSsoOrFail(input: LoginInput): Promise<User> {
		const result = await this.ssoGateway.authenticate(
			input.emailOrUsername,
			input.password,
		);

		if (!result) {
			throw new UnauthorizedError("Invalid credentials");
		}

		return this.createUserFromSso(result);
	}

	private async createUserFromSso(ssoData: {
		externalId: string;
		email: string;
		name: string;
	}): Promise<User> {
		const [result] = await db.insert(users).values({
			email: ssoData.email,
			name: ssoData.name,
			ssoProvider: "corporate_sso",
			ssoExternalId: ssoData.externalId,
			isActive: true,
		});

		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.id, result.insertId))
			.limit(1);

		return user;
	}

	private sanitizeUser(user: User): Omit<User, "passwordHash"> {
		const { passwordHash, ...rest } = user;
		return rest;
	}
}

export const authService = new AuthService();
