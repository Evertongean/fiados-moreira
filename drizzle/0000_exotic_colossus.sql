CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`actor_id` text,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`action` text NOT NULL,
	`operation_id` text,
	`metadata_json` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE cascade ON DELETE restrict,
	CONSTRAINT "audit_logs_action_check" CHECK("audit_logs"."action" in ('create','update','archive','cancel','payment_registered','payment_reversed','restore'))
);
--> statement-breakpoint
CREATE INDEX `audit_logs_workspace_entity_idx` ON `audit_logs` (`workspace_id`,`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_workspace_created_idx` ON `audit_logs` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `audit_logs_workspace_operation_unique` ON `audit_logs` (`workspace_id`,`operation_id`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`whatsapp` text,
	`address` text,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`archived_at` text,
	`deleted_at` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_workspace_id_id_unique` ON `customers` (`workspace_id`,`id`);--> statement-breakpoint
CREATE INDEX `customers_workspace_name_idx` ON `customers` (`workspace_id`,`name`);--> statement-breakpoint
CREATE INDEX `customers_workspace_phone_idx` ON `customers` (`workspace_id`,`phone`);--> statement-breakpoint
CREATE INDEX `customers_workspace_archived_idx` ON `customers` (`workspace_id`,`archived_at`);--> statement-breakpoint
CREATE TABLE `debts` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`vehicle_id` text,
	`description` text NOT NULL,
	`total_cents` integer NOT NULL,
	`service_date` text NOT NULL,
	`due_date` text,
	`notes` text,
	`canceled_at` text,
	`cancellation_reason` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`workspace_id`,`customer_id`) REFERENCES `customers`(`workspace_id`,`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`workspace_id`,`customer_id`,`vehicle_id`) REFERENCES `vehicles`(`workspace_id`,`customer_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "debts_total_cents_check" CHECK("debts"."total_cents" > 0 and "debts"."total_cents" <= 99999999999),
	CONSTRAINT "debts_cancellation_check" CHECK(("debts"."canceled_at" is null and "debts"."cancellation_reason" is null) or ("debts"."canceled_at" is not null and length(trim("debts"."cancellation_reason")) > 0))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `debts_workspace_id_unique` ON `debts` (`workspace_id`,`id`);--> statement-breakpoint
CREATE INDEX `debts_workspace_customer_idx` ON `debts` (`workspace_id`,`customer_id`);--> statement-breakpoint
CREATE INDEX `debts_workspace_due_date_idx` ON `debts` (`workspace_id`,`due_date`);--> statement-breakpoint
CREATE INDEX `debts_workspace_service_date_idx` ON `debts` (`workspace_id`,`service_date`);--> statement-breakpoint
CREATE INDEX `debts_workspace_canceled_idx` ON `debts` (`workspace_id`,`canceled_at`);--> statement-breakpoint
CREATE INDEX `debts_vehicle_idx` ON `debts` (`vehicle_id`);--> statement-breakpoint
CREATE TABLE `payment_reversals` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`payment_id` text NOT NULL,
	`operation_id` text NOT NULL,
	`reason` text NOT NULL,
	`reversed_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`workspace_id`,`payment_id`) REFERENCES `payments`(`workspace_id`,`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_reversals_workspace_payment_unique` ON `payment_reversals` (`workspace_id`,`payment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `payment_reversals_workspace_operation_unique` ON `payment_reversals` (`workspace_id`,`operation_id`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`debt_id` text NOT NULL,
	`operation_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`payment_method` text NOT NULL,
	`paid_at` text NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`workspace_id`,`debt_id`) REFERENCES `debts`(`workspace_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "payments_amount_cents_check" CHECK("payments"."amount_cents" > 0 and "payments"."amount_cents" <= 99999999999),
	CONSTRAINT "payments_method_check" CHECK("payments"."payment_method" in ('cash','pix','debit_card','credit_card','bank_transfer','other'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_workspace_id_unique` ON `payments` (`workspace_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `payments_workspace_operation_unique` ON `payments` (`workspace_id`,`operation_id`);--> statement-breakpoint
CREATE INDEX `payments_workspace_debt_idx` ON `payments` (`workspace_id`,`debt_id`);--> statement-breakpoint
CREATE INDEX `payments_workspace_paid_at_idx` ON `payments` (`workspace_id`,`paid_at`);--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`debt_id` text NOT NULL,
	`type` text NOT NULL,
	`scheduled_at` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`notification_identifier` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`workspace_id`,`debt_id`) REFERENCES `debts`(`workspace_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "reminders_type_check" CHECK("reminders"."type" in ('before_due','due_date','overdue','custom')),
	CONSTRAINT "reminders_status_check" CHECK("reminders"."status" in ('pending','scheduled','delivered','canceled','failed'))
);
--> statement-breakpoint
CREATE INDEX `reminders_workspace_status_scheduled_idx` ON `reminders` (`workspace_id`,`status`,`scheduled_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`workspace_id` text NOT NULL,
	`key` text NOT NULL,
	`value_json` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`workspace_id`, `key`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `sync_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`operation` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error_code` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE cascade ON DELETE restrict,
	CONSTRAINT "sync_queue_attempts_check" CHECK("sync_queue"."attempts" >= 0),
	CONSTRAINT "sync_queue_operation_check" CHECK("sync_queue"."operation" in ('create','update','delete')),
	CONSTRAINT "sync_queue_status_check" CHECK("sync_queue"."status" in ('pending','processing','completed','failed'))
);
--> statement-breakpoint
CREATE INDEX `sync_queue_workspace_status_created_idx` ON `sync_queue` (`workspace_id`,`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`type` text NOT NULL,
	`brand` text NOT NULL,
	`model` text NOT NULL,
	`year` integer,
	`plate` text,
	`color` text,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`archived_at` text,
	`deleted_at` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`workspace_id`,`customer_id`) REFERENCES `customers`(`workspace_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "vehicles_type_check" CHECK("vehicles"."type" in ('motorcycle','car','truck','van','other')),
	CONSTRAINT "vehicles_year_check" CHECK("vehicles"."year" is null or "vehicles"."year" between 1886 and 9999)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vehicles_workspace_id_unique` ON `vehicles` (`workspace_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `vehicles_workspace_customer_id_unique` ON `vehicles` (`workspace_id`,`customer_id`,`id`);--> statement-breakpoint
CREATE INDEX `vehicles_workspace_customer_idx` ON `vehicles` (`workspace_id`,`customer_id`);--> statement-breakpoint
CREATE INDEX `vehicles_workspace_plate_idx` ON `vehicles` (`workspace_id`,`plate`);--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`timezone` text NOT NULL,
	`currency` text DEFAULT 'BRL' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
