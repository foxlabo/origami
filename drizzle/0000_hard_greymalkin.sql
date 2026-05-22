CREATE TABLE `bots` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`graph` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
