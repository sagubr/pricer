import {
	pgSchema,
	varchar,
	timestamp,
	boolean,
	index,
	uniqueIndex,
	bigint,
	bigserial,
	pgEnum,
	uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

const authSchema = pgSchema("auth");

export const loginMethodEnum = authSchema.enum("login_method", [
	"email",
	"username",
	"both",
]);

export const users = authSchema.table(
	"users",
	{
		id: bigserial("id", { mode: "number" }).primaryKey(),
		externalId: uuid("external_id"),
		email: varchar("email", { length: 255 }).notNull(),
		username: varchar("username", { length: 100 }),
		name: varchar("name", { length: 255 }),
		passwordHash: varchar("password_hash", { length: 255 }),
		loginMethod: loginMethodEnum("login_method").default("email").notNull(),
		isActive: boolean("is_active").default(true).notNull(),
		permissionVersion: uuid("permission_version").defaultRandom().notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdateFn(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("users_email_unique").on(table.email),
		uniqueIndex("users_username_unique").on(table.username),
		uniqueIndex("users_external_id_unique").on(table.externalId),
	],
);

export const sessions = authSchema.table(
	"sessions",
	{
		id: bigserial("id", { mode: "number" }).primaryKey(),
		externalId: uuid("external_id").defaultRandom().notNull(),
		userId: bigint("user_id", { mode: "number" })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		refreshTokenHash: varchar("refresh_token_hash", {
			length: 255,
		}).notNull(),
		userAgent: varchar("user_agent", { length: 500 }),
		ipAddress: varchar("ip_address", { length: 45 }),
		expiresAt: timestamp("expires_at").notNull(),
		revokedAt: timestamp("revoked_at"),
		revokedReason: varchar("revoked_reason", { length: 100 }),
		lastUsedAt: timestamp("last_used_at").defaultNow().notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("sessions_user_id_idx").on(table.userId),
		index("sessions_expires_at_idx").on(table.expiresAt),
		index("sessions_active_idx").on(table.userId, table.revokedAt),
		uniqueIndex("sessions_external_id_unique").on(table.externalId),
	],
);

export const refreshTokens = authSchema.table(
	"refresh_tokens",
	{
		id: bigserial("id", { mode: "number" }).primaryKey(),
		externalId: uuid("external_id").defaultRandom().notNull(),
		sessionId: bigint("session_id", { mode: "number" })
			.notNull()
			.references(() => sessions.id, { onDelete: "cascade" }),
		tokenHash: varchar("token_hash", { length: 255 }).notNull(),
		expiresAt: timestamp("expires_at").notNull(),
		revokedAt: timestamp("revoked_at"),
		replacedBy: uuid("replaced_by"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("refresh_tokens_session_id_idx").on(table.sessionId),
		uniqueIndex("refresh_tokens_token_hash_unique").on(table.tokenHash),
		index("refresh_tokens_expires_at_idx").on(table.expiresAt),
		uniqueIndex("refresh_tokens_external_id_unique").on(table.externalId),
	],
);

export const usersRelations = relations(users, ({ many }) => ({
	sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id],
	}),
	refreshTokens: many(refreshTokens),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
	session: one(sessions, {
		fields: [refreshTokens.sessionId],
		references: [sessions.id],
	}),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
