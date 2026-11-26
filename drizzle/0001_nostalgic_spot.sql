ALTER TABLE `reminders` ADD `delivered_at` text;--> statement-breakpoint
ALTER TABLE `reminders` ADD `read_at` text;--> statement-breakpoint
CREATE UNIQUE INDEX `reminders_workspace_debt_type_scheduled_unique` ON `reminders` (`workspace_id`,`debt_id`,`type`,`scheduled_at`);