CREATE TABLE `import_rows` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`import_id` text NOT NULL,
	`source_line` integer NOT NULL,
	`date` text,
	`amount_cents` integer,
	`text` text NOT NULL,
	`status` text NOT NULL,
	`reason` text,
	`transaction_id` text,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`import_id`) REFERENCES `imports`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `import_rows_import` ON `import_rows` (`import_id`,`source_line`);