CREATE TABLE `event_other_expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reservation_id` integer NOT NULL,
	`libelle` text NOT NULL,
	`montant` text DEFAULT '0' NOT NULL,
	`date_depense` text NOT NULL,
	`observations` text DEFAULT '',
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `event_other_expenses_reservation_idx` ON `event_other_expenses` (`reservation_id`);--> statement-breakpoint
CREATE TABLE `event_purchases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reservation_id` integer NOT NULL,
	`nom_article` text NOT NULL,
	`categorie` text DEFAULT 'Autre' NOT NULL,
	`fournisseur` text DEFAULT '',
	`quantite` text DEFAULT '1' NOT NULL,
	`prix_unitaire` text DEFAULT '0' NOT NULL,
	`prix_total` text DEFAULT '0' NOT NULL,
	`date_achat` text NOT NULL,
	`observations` text DEFAULT '',
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `event_purchases_reservation_idx` ON `event_purchases` (`reservation_id`);--> statement-breakpoint
CREATE TABLE `event_staff` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reservation_id` integer NOT NULL,
	`type` text DEFAULT 'Autre' NOT NULL,
	`nom` text NOT NULL,
	`telephone` text DEFAULT '',
	`nombre_heures` text DEFAULT '0' NOT NULL,
	`salaire` text DEFAULT '0' NOT NULL,
	`statut_paiement` text DEFAULT 'Non payé' NOT NULL,
	`date_paiement` text DEFAULT '',
	`observations` text DEFAULT '',
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `event_staff_reservation_idx` ON `event_staff` (`reservation_id`);