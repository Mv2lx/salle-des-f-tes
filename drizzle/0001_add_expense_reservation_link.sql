ALTER TABLE `expenses` ADD `reservation_id` integer REFERENCES `reservations`(`id`) ON DELETE set null;
--> statement-breakpoint
CREATE INDEX `expenses_reservation_idx` ON `expenses` (`reservation_id`);
