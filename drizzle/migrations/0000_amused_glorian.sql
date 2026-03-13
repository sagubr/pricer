CREATE TABLE `refresh_tokens` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`external_id` varchar(36) NOT NULL,
	`session_id` bigint unsigned NOT NULL,
	`token_hash` varchar(255) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`revoked_at` timestamp,
	`replaced_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `refresh_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `refresh_tokens_token_hash_unique` UNIQUE(`token_hash`),
	CONSTRAINT `refresh_tokens_external_id_unique` UNIQUE(`external_id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`external_id` varchar(36) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`refresh_token_hash` varchar(255) NOT NULL,
	`user_agent` varchar(500),
	`ip_address` varchar(45),
	`expires_at` timestamp NOT NULL,
	`revoked_at` timestamp,
	`revoked_reason` varchar(100),
	`last_used_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_external_id_unique` UNIQUE(`external_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`external_id` varchar(36),
	`email` varchar(255) NOT NULL,
	`username` varchar(100),
	`name` varchar(255),
	`password_hash` varchar(255),
	`sso_provider` varchar(50),
	`sso_external_id` varchar(255),
	`login_method` enum('email','username','both') NOT NULL DEFAULT 'email',
	`is_active` boolean NOT NULL DEFAULT true,
	`permission_version` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`),
	CONSTRAINT `users_external_id_unique` UNIQUE(`external_id`)
);
--> statement-breakpoint
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_session_id_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `refresh_tokens_session_id_idx` ON `refresh_tokens` (`session_id`);--> statement-breakpoint
CREATE INDEX `refresh_tokens_expires_at_idx` ON `refresh_tokens` (`expires_at`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_at_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `sessions_active_idx` ON `sessions` (`user_id`,`revoked_at`);--> statement-breakpoint
CREATE INDEX `users_sso_idx` ON `users` (`sso_provider`,`sso_external_id`);