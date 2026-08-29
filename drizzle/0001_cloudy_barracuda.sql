CREATE TABLE `docusign_connections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_email` text NOT NULL,
	`account_id` text NOT NULL,
	`account_name` text NOT NULL,
	`base_uri` text NOT NULL,
	`access_token_encrypted` text NOT NULL,
	`refresh_token_encrypted` text NOT NULL,
	`expires_at` text NOT NULL,
	`connected_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `docusign_connections_owner_email_unique` ON `docusign_connections` (`owner_email`);--> statement-breakpoint
CREATE TABLE `docusign_oauth_states` (
	`state` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
