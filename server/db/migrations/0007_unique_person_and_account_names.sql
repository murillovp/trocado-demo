CREATE UNIQUE INDEX `accounts_household_label` ON `accounts` (`household_id`,`label`);--> statement-breakpoint
CREATE UNIQUE INDEX `people_household_name` ON `people` (`household_id`,`name`);