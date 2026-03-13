import { string, z } from "zod";

export const loginSchema = z.object({
	emailOrUsername: z
		.string()
		.min(1, "Email or username is required")
		.describe("Email or username for login"),
	password: z.string().min(6, "Password must be at least 6 characters"),
	userAgent: z.string().optional(),
	ipAddress: z.string().optional(),
});

export const registerSchema = z.object({
	email: z.email("Invalid email format"),
	username: z
		.string()
		.min(3, "Username must be at least 3 characters")
		.max(100, "Username must be at most 100 characters")
		.regex(/^[a-zA-Z0-9_.-]+$/, "Username can only contain letters, numbers, dots, hyphens and underscores")
		.optional()
		.describe("Optional username for login (if not provided, email will be used)"),
	name: z
		.string()
		.min(1, "Name is required")
		.max(255, "Name must be at most 255 characters")
		.describe("User full name"),
	password: z
		.string()
		.min(8, "Password must be at least 8 characters")
		.regex(/[A-Z]/, "Password must contain at least one uppercase letter")
		.regex(/[a-z]/, "Password must contain at least one lowercase letter")
		.regex(/[0-9]/, "Password must contain at least one number"),
	loginMethod: z
		.enum(["email", "username", "both"])
		.default("email")
		.describe("Allow login via email, username, or both"),
});

export const refreshTokenSchema = z.object({
	refreshToken: z.string().min(1, "Refresh token is required"),
});

export const userSchema = z.object({
	id: z.number(),
	email: z.email(),
	username: z.string().nullable(),
	name: z.string().nullable(),
	ssoProvider: z.string().nullable(),
	ssoExternalId: z.string().nullable(),
	loginMethod: z.enum(["email", "username", "both"]),
	isActive: z.boolean(),
	permissionVersion: z.uuid(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

export const tokenPairSchema = z.object({
	accessToken: z.string(),
	refreshToken: z.string(),
});

export const loginResponseSchema = z.object({
	user: userSchema,
	tokens: tokenPairSchema,
});

export const registerResponseSchema = z.object({
	success: z.boolean(),
	message: z.string(),
	data: userSchema,
});

export const refreshResponseSchema = z.object({
	success: z.boolean(),
	message: z.string(),
	data: tokenPairSchema,
});

export const meResponseSchema = z.object({
	success: z.boolean(),
	message: z.string(),
	data: userSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type UserResponse = z.infer<typeof userSchema>;
export type TokenPair = z.infer<typeof tokenPairSchema>;
