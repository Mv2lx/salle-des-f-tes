ALTER TABLE `users` ADD `email` text DEFAULT '';
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`role` text PRIMARY KEY NOT NULL,
	`permissions` text DEFAULT '[]' NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
