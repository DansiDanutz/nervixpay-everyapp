CREATE TABLE `connections` (
	`user_id` text PRIMARY KEY NOT NULL,
	`merchant_id` text NOT NULL,
	`mode` text NOT NULL,
	`ciphertext` text NOT NULL,
	`state` text NOT NULL,
	`user_code` text,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
DROP TABLE `todos`;