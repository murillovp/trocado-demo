PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`account_id` text NOT NULL,
	`import_id` text,
	`date` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`raw_description` text NOT NULL,
	`vendor_id` text,
	`category_id` text,
	`kind` text,
	`savings_label` text,
	`installment_plan_id` text,
	`installment_number` integer,
	`note` text,
	`bank_reference` text,
	`transfer_pair_id` text,
	`dedupe_key` text NOT NULL,
	`kind_set_by_user` integer DEFAULT false NOT NULL,
	`transfer_candidate` integer DEFAULT false NOT NULL,
	`vendor_name` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`import_id`) REFERENCES `imports`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`installment_plan_id`) REFERENCES `installment_plans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_transactions`("id", "household_id", "account_id", "import_id", "date", "amount_cents", "raw_description", "vendor_id", "category_id", "kind", "savings_label", "installment_plan_id", "installment_number", "note", "bank_reference", "transfer_pair_id", "dedupe_key") SELECT "id", "household_id", "account_id", "import_id", "date", "amount_cents", "raw_description", "vendor_id", "category_id", "kind", "savings_label", "installment_plan_id", "installment_number", "note", "bank_reference", "transfer_pair_id", "dedupe_key" FROM `transactions`;--> statement-breakpoint
DROP TABLE `transactions`;--> statement-breakpoint
ALTER TABLE `__new_transactions` RENAME TO `transactions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `transactions_account_dedupe` ON `transactions` (`account_id`,`dedupe_key`);--> statement-breakpoint
CREATE INDEX `transactions_household_date` ON `transactions` (`household_id`,`date`);--> statement-breakpoint
CREATE INDEX `transactions_transfer_pair` ON `transactions` (`transfer_pair_id`);--> statement-breakpoint
ALTER TABLE `imports` ADD `status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `vendors` ADD `ai_confidence` real;