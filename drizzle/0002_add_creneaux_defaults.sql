-- NOTE: `company_settings` était défini dans src/db/schema.ts mais n'avait
-- jamais été créé par une migration (aucun `CREATE TABLE company_settings`
-- dans drizzle/0000_init_sqlite.sql) — corrigé ici, en même temps que
-- l'ajout des colonnes "créneaux" par défaut (Journée / Soirée / Journée
-- complète) utilisées par le formulaire de réservation.
CREATE TABLE `company_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`logo_url` text DEFAULT '',
	`name` text DEFAULT 'Hôtel El Fares' NOT NULL,
	`salle_name` text DEFAULT '',
	`description` text DEFAULT '',
	`address` text DEFAULT '',
	`city` text DEFAULT '',
	`wilaya` text DEFAULT '',
	`country` text DEFAULT 'Algérie' NOT NULL,
	`phone` text DEFAULT '',
	`phone2` text DEFAULT '',
	`email` text DEFAULT '',
	`website` text DEFAULT '',
	`rc` text DEFAULT '',
	`nif` text DEFAULT '',
	`nis` text DEFAULT '',
	`currency` text DEFAULT 'DA' NOT NULL,
	`default_tax_rate` text DEFAULT '19' NOT NULL,
	`default_language` text DEFAULT 'fr' NOT NULL,
	`creneau_journee_debut` text DEFAULT '10:00' NOT NULL,
	`creneau_journee_fin` text DEFAULT '17:00' NOT NULL,
	`creneau_soiree_debut` text DEFAULT '18:00' NOT NULL,
	`creneau_soiree_fin` text DEFAULT '02:00' NOT NULL,
	`creneau_journee_complete_debut` text DEFAULT '10:00' NOT NULL,
	`creneau_journee_complete_fin` text DEFAULT '02:00' NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
