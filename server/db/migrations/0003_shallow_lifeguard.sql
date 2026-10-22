CREATE TABLE `import_images` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`import_id` text NOT NULL,
	`position` integer NOT NULL,
	`file_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`bytes` blob NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`import_id`) REFERENCES `imports`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `import_images_import_position` ON `import_images` (`import_id`,`position`);--> statement-breakpoint
ALTER TABLE `import_rows` ADD `image_index` integer;