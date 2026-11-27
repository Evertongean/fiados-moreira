CREATE TABLE `collection_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`debt_id` text,
	`template_type` text NOT NULL,
	`attempted_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`workspace_id`,`customer_id`) REFERENCES `customers`(`workspace_id`,`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`workspace_id`,`debt_id`) REFERENCES `debts`(`workspace_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "collection_attempts_template_type_check" CHECK("collection_attempts"."template_type" in ('before_due','due_date','overdue','no_due'))
);
--> statement-breakpoint
CREATE INDEX `collection_attempts_workspace_customer_attempted_idx` ON `collection_attempts` (`workspace_id`,`customer_id`,`attempted_at`);--> statement-breakpoint
CREATE INDEX `collection_attempts_workspace_debt_attempted_idx` ON `collection_attempts` (`workspace_id`,`debt_id`,`attempted_at`);