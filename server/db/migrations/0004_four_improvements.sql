ALTER TABLE `households` ADD `needs_label` text DEFAULT 'Necessidades' NOT NULL;--> statement-breakpoint
ALTER TABLE `households` ADD `wants_label` text DEFAULT 'Desejos' NOT NULL;--> statement-breakpoint
ALTER TABLE `households` ADD `savings_label` text DEFAULT 'Poupança' NOT NULL;--> statement-breakpoint
ALTER TABLE `people` ADD `color_slot` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `adjusted_amount_cents` integer;
--> statement-breakpoint
UPDATE `people` SET `color_slot` = 1 WHERE `name` = 'Marina';
