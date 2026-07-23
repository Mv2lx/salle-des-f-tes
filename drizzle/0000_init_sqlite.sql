CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`user_name` text DEFAULT '',
	`action` text NOT NULL,
	`module` text NOT NULL,
	`entity_id` integer,
	`entity_label` text DEFAULT '',
	`details` text DEFAULT '',
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `audit_log_module_idx` ON `audit_log` (`module`);--> statement-breakpoint
CREATE INDEX `audit_log_entity_idx` ON `audit_log` (`module`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_log_date_idx` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `clients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nom` text NOT NULL,
	`prenom` text DEFAULT '',
	`societe` text DEFAULT '',
	`telephone` text DEFAULT '',
	`telephone2` text DEFAULT '',
	`email` text DEFAULT '',
	`adresse` text DEFAULT '',
	`ville` text DEFAULT '',
	`wilaya` text DEFAULT '',
	`pays` text DEFAULT 'Algérie',
	`piece` text DEFAULT '',
	`commentaires` text DEFAULT '',
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `clients_nom_idx` ON `clients` (`nom`);--> statement-breakpoint
CREATE INDEX `clients_telephone_idx` ON `clients` (`telephone`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fournisseur` text DEFAULT '',
	`nature` text DEFAULT '',
	`date_depense` text NOT NULL,
	`montant` text DEFAULT '0' NOT NULL,
	`mode` text DEFAULT 'Espèces' NOT NULL,
	`observation` text DEFAULT '',
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `expenses_date_idx` ON `expenses` (`date_depense`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reservation_id` integer NOT NULL,
	`montant` text DEFAULT '0' NOT NULL,
	`mode` text DEFAULT 'Espèces' NOT NULL,
	`date_paiement` text NOT NULL,
	`reference` text DEFAULT '',
	`note` text DEFAULT '',
	`recorded_by_user_id` integer,
	`recorded_by_name` text DEFAULT '',
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recorded_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `payments_reservation_idx` ON `payments` (`reservation_id`);--> statement-breakpoint
CREATE INDEX `payments_date_idx` ON `payments` (`date_paiement`);--> statement-breakpoint
CREATE TABLE `prestations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nom` text NOT NULL,
	`categorie` text DEFAULT 'Autres',
	`unite` text DEFAULT 'unité',
	`prix` text DEFAULT '0' NOT NULL,
	`actif` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `prestations_categorie_idx` ON `prestations` (`categorie`);--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reference` text NOT NULL,
	`client_id` integer NOT NULL,
	`salle_id` integer NOT NULL,
	`type_evenement` text DEFAULT 'Mariage' NOT NULL,
	`date_evenement` text NOT NULL,
	`heure_debut` text DEFAULT '18:00',
	`heure_fin` text DEFAULT '23:00',
	`invites` integer DEFAULT 0 NOT NULL,
	`statut` text DEFAULT 'Option' NOT NULL,
	`observations` text DEFAULT '',
	`items` text DEFAULT '[]' NOT NULL,
	`remise` text DEFAULT '0' NOT NULL,
	`tva_taux` text DEFAULT '19' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`salle_id`) REFERENCES `salles`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reservations_reference_idx` ON `reservations` (`reference`);--> statement-breakpoint
CREATE INDEX `reservations_client_idx` ON `reservations` (`client_id`);--> statement-breakpoint
CREATE INDEX `reservations_salle_idx` ON `reservations` (`salle_id`);--> statement-breakpoint
CREATE INDEX `reservations_date_idx` ON `reservations` (`date_evenement`);--> statement-breakpoint
CREATE INDEX `reservations_salle_date_idx` ON `reservations` (`salle_id`,`date_evenement`);--> statement-breakpoint
CREATE TABLE `salles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nom` text NOT NULL,
	`capacite` integer DEFAULT 0 NOT NULL,
	`tarif` text DEFAULT '0' NOT NULL,
	`equipements` text DEFAULT '',
	`couleur` text DEFAULT '#F5A623',
	`description` text DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`role` text DEFAULT 'receptionist' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_idx` ON `users` (`username`);