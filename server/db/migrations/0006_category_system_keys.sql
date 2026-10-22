ALTER TABLE `categories` ADD `system_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `categories_household_system_key` ON `categories` (`household_id`,`system_key`);--> statement-breakpoint
UPDATE `categories` SET `system_key` = 'salary' WHERE `name` = 'Salário' AND `applies_to` = 'income';--> statement-breakpoint
UPDATE `categories` SET `system_key` = 'bonus' WHERE `name` = 'Bônus' AND `applies_to` = 'income';--> statement-breakpoint
UPDATE `categories` SET `system_key` = 'taxes_fees' WHERE `name` = 'Impostos e taxas' AND `applies_to` = 'expense';--> statement-breakpoint
UPDATE `categories` SET `system_key` = 'other_expense' WHERE `name` = 'Outros' AND `applies_to` = 'expense';--> statement-breakpoint
UPDATE `categories` SET `system_key` = 'other_income' WHERE `name` = 'Outras entradas' AND `applies_to` = 'income' AND `archived` = 0;--> statement-breakpoint
UPDATE `categories` SET `system_key` = 'other_income' WHERE `name` = 'Outras receitas' AND `applies_to` = 'income' AND NOT EXISTS (SELECT 1 FROM `categories` AS `held` WHERE `held`.`household_id` = `categories`.`household_id` AND `held`.`system_key` = 'other_income');--> statement-breakpoint
UPDATE `categories` SET `system_key` = 'other_income' WHERE `name` = 'Outras entradas' AND `applies_to` = 'income' AND `archived` = 1 AND NOT EXISTS (SELECT 1 FROM `categories` AS `held` WHERE `held`.`household_id` = `categories`.`household_id` AND `held`.`system_key` = 'other_income');
