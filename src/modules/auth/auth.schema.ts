import {
	mysqlTable,
	varchar,
	timestamp,
	boolean,
	index,
	uniqueIndex,
	bigint,
	mysqlEnum,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

export const users = mysqlTable(
	"users",
	{
		id: bigint("id", { mode: "number", unsigned: true })
			.autoincrement()
			.primaryKey(),
		externalId: varchar("external_id", { length: 36 }),
		email: varchar("email", { length: 255 }).notNull(),
		username: varchar("username", { length: 100 }),
		name: varchar("name", { length: 255 }),
		passwordHash: varchar("password_hash", { length: 255 }),
		ssoProvider: varchar("sso_provider", { length: 50 }),
		ssoExternalId: varchar("sso_external_id", { length: 255 }),
		loginMethod: mysqlEnum("login_method", ["email", "username", "both"]).default("email").notNull(),
		isActive: boolean("is_active").default(true).notNull(),
		permissionVersion: varchar("permission_version", { length: 36 })
			.$defaultFn(() => crypto.randomUUID())
			.notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
	},
	(table) => [
		uniqueIndex("users_email_unique").on(table.email),
		uniqueIndex("users_username_unique").on(table.username),
		uniqueIndex("users_external_id_unique").on(table.externalId),
		index("users_sso_idx").on(table.ssoProvider, table.ssoExternalId),
	],
);

export const sessions = mysqlTable(
	"sessions",
	{
		id: bigint("id", { mode: "number", unsigned: true })
			.autoincrement()
			.primaryKey(),
		externalId: varchar("external_id", { length: 36 })
			.notNull()
			.$defaultFn(() => crypto.randomUUID()),
		userId: bigint("user_id", { mode: "number", unsigned: true })
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

export const refreshTokens = mysqlTable(
	"refresh_tokens",
	{
		id: bigint("id", { mode: "number", unsigned: true })
			.autoincrement()
			.primaryKey(),
		externalId: varchar("external_id", { length: 36 })
			.notNull()
			.$defaultFn(() => crypto.randomUUID()),
		sessionId: bigint("session_id", { mode: "number", unsigned: true })
			.notNull()
			.references(() => sessions.id, { onDelete: "cascade" }),
		tokenHash: varchar("token_hash", { length: 255 }).notNull(),
		expiresAt: timestamp("expires_at").notNull(),
		revokedAt: timestamp("revoked_at"),
		replacedBy: varchar("replaced_by", { length: 36 }),
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
