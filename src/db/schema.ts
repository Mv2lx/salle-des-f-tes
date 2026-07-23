import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// A shared "now, as ISO 8601 text" default so every createdAt column stores a
// format `new Date(value)` parses identically in Node and every browser.
const nowIso = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

// ---------------------------------------------------------------------------
// Users (authentication & roles)
// ---------------------------------------------------------------------------
export const ROLES = ["admin", "receptionist", "accountant"] as const;
export type Role = (typeof ROLES)[number];

export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    username: text("username").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    passwordSalt: text("password_salt").notNull(),
    role: text("role").$type<Role>().default("receptionist").notNull(),
    active: integer("active").default(1).notNull(),
    createdAt: text("created_at").notNull().default(nowIso),
  },
  (t) => ({
    usernameIdx: uniqueIndex("users_username_idx").on(t.username),
  }),
);

// ---------------------------------------------------------------------------
// CRM Clients
// ---------------------------------------------------------------------------
export const clients = sqliteTable(
  "clients",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nom: text("nom").notNull(),
    prenom: text("prenom").default(""),
    societe: text("societe").default(""),
    telephone: text("telephone").default(""),
    telephone2: text("telephone2").default(""),
    email: text("email").default(""),
    adresse: text("adresse").default(""),
    ville: text("ville").default(""),
    wilaya: text("wilaya").default(""),
    pays: text("pays").default("Algérie"),
    piece: text("piece").default(""),
    commentaires: text("commentaires").default(""),
    createdAt: text("created_at").notNull().default(nowIso),
  },
  (t) => ({
    nomIdx: index("clients_nom_idx").on(t.nom),
    telephoneIdx: index("clients_telephone_idx").on(t.telephone),
  }),
);

// ---------------------------------------------------------------------------
// Salles (halls)
// ---------------------------------------------------------------------------
export const salles = sqliteTable("salles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nom: text("nom").notNull(),
  capacite: integer("capacite").default(0).notNull(),
  // Money amounts are kept as TEXT decimal strings (e.g. "300000.00"), the
  // same representation node-postgres returned for NUMERIC columns — the
  // app already parses every amount through num() in lib/format.ts, so this
  // keeps behaviour identical while avoiding SQLite REAL's binary-float
  // rounding issues for currency.
  tarif: text("tarif").default("0").notNull(),
  equipements: text("equipements").default(""),
  couleur: text("couleur").default("#F5A623"),
  description: text("description").default(""),
});

// ---------------------------------------------------------------------------
// Prestations (services catalog)
// ---------------------------------------------------------------------------
export const prestations = sqliteTable(
  "prestations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nom: text("nom").notNull(),
    categorie: text("categorie").default("Autres"),
    unite: text("unite").default("unité"),
    prix: text("prix").default("0").notNull(),
    actif: integer("actif").default(1).notNull(),
  },
  (t) => ({
    categorieIdx: index("prestations_categorie_idx").on(t.categorie),
  }),
);

// ---------------------------------------------------------------------------
// Packs (باقات) — fixed-price bundles offered for a given event type
// (e.g. "Pack Mariage Prestige"). The price is a flat, independent amount:
// it does NOT need to equal the sum of the included prestations' individual
// prices. `prestations` is a denormalized snapshot (name + quantity) of what
// the pack includes, purely informational — shown on the booking form and
// printed documents to describe what the flat price covers. It is never
// summed into reservation totals; when a pack is selected on a reservation,
// its price is added as a single line in that reservation's `items` (see
// Reservations.tsx), exactly like any other item.
// ---------------------------------------------------------------------------
export const packs = sqliteTable(
  "packs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nom: text("nom").notNull(),
    // "" = applicable to all event types; otherwise one of TYPES_EVENEMENT.
    typeEvenement: text("type_evenement").default(""),
    prix: text("prix").default("0").notNull(),
    description: text("description").default(""),
    prestations: text("prestations", { mode: "json" })
      .$type<PackPrestation[]>()
      .default([])
      .notNull(),
    actif: integer("actif").default(1).notNull(),
    createdAt: text("created_at").notNull().default(nowIso),
  },
  (t) => ({
    typeIdx: index("packs_type_idx").on(t.typeEvenement),
  }),
);

export type PackPrestation = { prestationId: number | null; nom: string; qte: number };
export type Pack = typeof packs.$inferSelect;

// ---------------------------------------------------------------------------
// Reservations
// ---------------------------------------------------------------------------
export const reservations = sqliteTable(
  "reservations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    reference: text("reference").notNull(),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    salleId: integer("salle_id")
      .notNull()
      .references(() => salles.id, { onDelete: "restrict" }),
    typeEvenement: text("type_evenement").default("Mariage").notNull(),
    // Optional fixed-price pack applied to this reservation. Nullable/"set
    // null" (not cascade): deleting a pack must not delete reservations that
    // used it — they keep the packNom snapshot so history stays readable.
    // The pack's price is billed as one line in `items` (see Pack in
    // Reservations.tsx); packId/packNom themselves are never used in totals
    // math, only to know which pack (if any) was selected and to render its
    // included-prestations breakdown on the form/print views.
    packId: integer("pack_id").references(() => packs.id, { onDelete: "set null" }),
    packNom: text("pack_nom").default(""),
    // Dates/times are plain "YYYY-MM-DD" / "HH:MM" text, exactly as the app
    // already treats them everywhere (string comparisons, .slice(), etc.).
    dateEvenement: text("date_evenement").notNull(),
    heureDebut: text("heure_debut").default("18:00"),
    heureFin: text("heure_fin").default("23:00"),
    invites: integer("invites").default(0).notNull(),
    statut: text("statut").default("Option").notNull(), // Confirmée | Option | Annulée | Terminée
    observations: text("observations").default(""),
    // list of { prestationId, nom, prix, qte } — stored as JSON text, parsed
    // to/from a JS array automatically by drizzle's {mode: "json"}.
    items: text("items", { mode: "json" }).$type<ReservationItem[]>().default([]).notNull(),
    remise: text("remise").default("0").notNull(),
    tvaTaux: text("tva_taux").default("19").notNull(),
    createdAt: text("created_at").notNull().default(nowIso),
  },
  (t) => ({
    referenceIdx: uniqueIndex("reservations_reference_idx").on(t.reference),
    clientIdx: index("reservations_client_idx").on(t.clientId),
    salleIdx: index("reservations_salle_idx").on(t.salleId),
    dateIdx: index("reservations_date_idx").on(t.dateEvenement),
    salleDateIdx: index("reservations_salle_date_idx").on(t.salleId, t.dateEvenement),
  }),
);

export type ReservationItem = {
  prestationId: number | null;
  nom: string;
  prix: number;
  qte: number;
};

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------
export const payments = sqliteTable(
  "payments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    reservationId: integer("reservation_id")
      .notNull()
      .references(() => reservations.id, { onDelete: "cascade" }),
    montant: text("montant").default("0").notNull(),
    mode: text("mode").default("Espèces").notNull(),
    datePaiement: text("date_paiement").notNull(),
    reference: text("reference").default(""),
    note: text("note").default(""),
    // Who recorded the payment. userId is kept for joins; recordedByName is a
    // denormalized snapshot so historic payments still show a name even if
    // the user account is later deleted or renamed.
    recordedByUserId: integer("recorded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    recordedByName: text("recorded_by_name").default(""),
    createdAt: text("created_at").notNull().default(nowIso),
  },
  (t) => ({
    reservationIdx: index("payments_reservation_idx").on(t.reservationId),
    dateIdx: index("payments_date_idx").on(t.datePaiement),
  }),
);

// ---------------------------------------------------------------------------
// Audit log — tracks who created/updated/deleted records across modules.
// ---------------------------------------------------------------------------
export const AUDIT_ACTIONS = ["create", "update", "delete"] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    userName: text("user_name").default(""), // snapshot, survives user deletion
    action: text("action").$type<AuditAction>().notNull(),
    module: text("module").notNull(), // e.g. "reservations", "payments"
    entityId: integer("entity_id"),
    entityLabel: text("entity_label").default(""), // e.g. reservation reference
    details: text("details").default(""), // short human-readable summary
    createdAt: text("created_at").notNull().default(nowIso),
  },
  (t) => ({
    moduleIdx: index("audit_log_module_idx").on(t.module),
    entityIdx: index("audit_log_entity_idx").on(t.module, t.entityId),
    dateIdx: index("audit_log_date_idx").on(t.createdAt),
  }),
);

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------
export const expenses = sqliteTable(
  "expenses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    fournisseur: text("fournisseur").default(""),
    nature: text("nature").default(""),
    dateDepense: text("date_depense").notNull(),
    montant: text("montant").default("0").notNull(),
    mode: text("mode").default("Espèces").notNull(),
    observation: text("observation").default(""),
    // Optional link to a specific hall-rental reservation. Null for general
    // hotel expenses (unrelated to any booking). When set, this expense is
    // counted against that reservation's internal profitability report
    // (src/components/RapportInterneDocument.tsx) — admin-only, never shown
    // to the client. Kept nullable (set null, not cascade) so expense
    // history survives if the reservation is later removed.
    reservationId: integer("reservation_id").references(() => reservations.id, {
      onDelete: "set null",
    }),
    createdAt: text("created_at").notNull().default(nowIso),
  },
  (t) => ({
    dateIdx: index("expenses_date_idx").on(t.dateDepense),
    reservationIdx: index("expenses_reservation_idx").on(t.reservationId),
  }),
);

// ---------------------------------------------------------------------------
// Dépenses de l'événement — three reservation-scoped expense categories that
// feed the admin-only internal profitability report (Rapport financier
// interne). Unlike the generic `expenses` table above (general hotel costs,
// optionally and loosely linked to a reservation, managed from the
// "Dépenses" module), these three tables are always tied to one specific
// reservation and are entered from within the reservation's own "Dépenses de
// l'événement" section. onDelete: "cascade" is intentional here — deleting a
// reservation must delete all of its event expenses (unlike the generic
// expenses table, which uses "set null" to survive reservation deletion).
// ---------------------------------------------------------------------------

export const ACHAT_CATEGORIES = [
  "Alimentation",
  "Boissons",
  "Décoration",
  "Matériel",
  "Fournitures",
  "Location",
  "Autre",
] as const;

// Achats — purchases made specifically for one event/reservation.
export const eventPurchases = sqliteTable(
  "event_purchases",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    reservationId: integer("reservation_id")
      .notNull()
      .references(() => reservations.id, { onDelete: "cascade" }),
    nomArticle: text("nom_article").notNull(),
    categorie: text("categorie").default("Autre").notNull(),
    fournisseur: text("fournisseur").default(""),
    quantite: text("quantite").default("1").notNull(),
    prixUnitaire: text("prix_unitaire").default("0").notNull(),
    // Denormalized (quantite * prixUnitaire) at save time — kept as a real
    // column (rather than only ever computed on read) so the report and API
    // agree even if quantite/prixUnitaire formats change later.
    prixTotal: text("prix_total").default("0").notNull(),
    dateAchat: text("date_achat").notNull(),
    observations: text("observations").default(""),
    createdAt: text("created_at").notNull().default(nowIso),
  },
  (t) => ({
    reservationIdx: index("event_purchases_reservation_idx").on(t.reservationId),
  }),
);

export const STAFF_TYPES = [
  "Serveur",
  "Chef",
  "Cuisinier",
  "Agent de nettoyage",
  "Sécurité",
  "DJ",
  "Photographe",
  "Décorateur",
  "Autre",
] as const;

export const PAYMENT_STATUSES = ["Payé", "Non payé"] as const;

// Personnel de l'événement — temporary staff hired for one specific
// reservation only (not the hotel's permanent `users` table).
export const eventStaff = sqliteTable(
  "event_staff",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    reservationId: integer("reservation_id")
      .notNull()
      .references(() => reservations.id, { onDelete: "cascade" }),
    type: text("type").default("Autre").notNull(),
    nom: text("nom").notNull(),
    telephone: text("telephone").default(""),
    nombreHeures: text("nombre_heures").default("0").notNull(),
    salaire: text("salaire").default("0").notNull(),
    statutPaiement: text("statut_paiement").$type<(typeof PAYMENT_STATUSES)[number]>().default("Non payé").notNull(),
    datePaiement: text("date_paiement").default(""),
    observations: text("observations").default(""),
    createdAt: text("created_at").notNull().default(nowIso),
  },
  (t) => ({
    reservationIdx: index("event_staff_reservation_idx").on(t.reservationId),
  }),
);

// Autres dépenses — any other one-off expense tied to the event.
export const eventOtherExpenses = sqliteTable(
  "event_other_expenses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    reservationId: integer("reservation_id")
      .notNull()
      .references(() => reservations.id, { onDelete: "cascade" }),
    libelle: text("libelle").notNull(),
    montant: text("montant").default("0").notNull(),
    dateDepense: text("date_depense").notNull(),
    observations: text("observations").default(""),
    createdAt: text("created_at").notNull().default(nowIso),
  },
  (t) => ({
    reservationIdx: index("event_other_expenses_reservation_idx").on(t.reservationId),
  }),
);

// ---------------------------------------------------------------------------
// Company settings — a single-row table (id is always 1) holding the
// organization's editable identity/contact/legal/system info, managed from
// the admin-only "Company Settings" page. Kept separate from src/lib/hotel.ts
// (the static config still used by invoices/PDF exports today) — wiring
// those documents to read from this table is a follow-up step.
// ---------------------------------------------------------------------------
export const companySettings = sqliteTable("company_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // General
  logoUrl: text("logo_url").default(""), // data URL (small logo, stored inline) or /public path
  name: text("name").default("Hôtel El Fares").notNull(),
  salleName: text("salle_name").default(""),
  description: text("description").default(""),
  address: text("address").default(""),
  city: text("city").default(""),
  wilaya: text("wilaya").default(""),
  country: text("country").default("Algérie").notNull(),
  // Contact & billing
  phone: text("phone").default(""),
  phone2: text("phone2").default(""),
  email: text("email").default(""),
  website: text("website").default(""),
  rc: text("rc").default(""), // Registre de Commerce
  nif: text("nif").default(""), // Numéro d'Identification Fiscale
  nis: text("nis").default(""), // Numéro d'Identification Statistique
  // System settings
  currency: text("currency").default("DA").notNull(),
  defaultTaxRate: text("default_tax_rate").default("19").notNull(),
  defaultLanguage: text("default_language").$type<"fr" | "ar">().default("fr").notNull(),
  // Créneaux (time-slot) defaults used to prefill "Journée / Soirée / Journée
  // complète" when creating a reservation — editable by admins only (see
  // CompanySettings.tsx, "Système" tab), but read by every role through
  // /api/settings/creneaux since receptionists need them to book halls.
  creneauJourneeDebut: text("creneau_journee_debut").default("10:00").notNull(),
  creneauJourneeFin: text("creneau_journee_fin").default("17:00").notNull(),
  creneauSoireeDebut: text("creneau_soiree_debut").default("18:00").notNull(),
  creneauSoireeFin: text("creneau_soiree_fin").default("02:00").notNull(),
  creneauJourneeCompleteDebut: text("creneau_journee_complete_debut").default("10:00").notNull(),
  creneauJourneeCompleteFin: text("creneau_journee_complete_fin").default("02:00").notNull(),
  updatedAt: text("updated_at").notNull().default(nowIso),
});

export type CompanySettingsRow = typeof companySettings.$inferSelect;

// ---------------------------------------------------------------------------
// Relations (used for optional relational queries with db.query.*)
// ---------------------------------------------------------------------------
export const clientsRelations = relations(clients, ({ many }) => ({
  reservations: many(reservations),
}));

export const sallesRelations = relations(salles, ({ many }) => ({
  reservations: many(reservations),
}));

export const reservationsRelations = relations(reservations, ({ one, many }) => ({
  client: one(clients, { fields: [reservations.clientId], references: [clients.id] }),
  salle: one(salles, { fields: [reservations.salleId], references: [salles.id] }),
  pack: one(packs, { fields: [reservations.packId], references: [packs.id] }),
  payments: many(payments),
  eventPurchases: many(eventPurchases),
  eventStaff: many(eventStaff),
  eventOtherExpenses: many(eventOtherExpenses),
}));

export const packsRelations = relations(packs, ({ many }) => ({
  reservations: many(reservations),
}));

export const eventPurchasesRelations = relations(eventPurchases, ({ one }) => ({
  reservation: one(reservations, { fields: [eventPurchases.reservationId], references: [reservations.id] }),
}));

export const eventStaffRelations = relations(eventStaff, ({ one }) => ({
  reservation: one(reservations, { fields: [eventStaff.reservationId], references: [reservations.id] }),
}));

export const eventOtherExpensesRelations = relations(eventOtherExpenses, ({ one }) => ({
  reservation: one(reservations, { fields: [eventOtherExpenses.reservationId], references: [reservations.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  reservation: one(reservations, {
    fields: [payments.reservationId],
    references: [reservations.id],
  }),
  recordedBy: one(users, {
    fields: [payments.recordedByUserId],
    references: [users.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  user: one(users, { fields: [auditLog.userId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Salle = typeof salles.$inferSelect;
export type Prestation = typeof prestations.$inferSelect;
export type Reservation = typeof reservations.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type EventPurchase = typeof eventPurchases.$inferSelect;
export type EventStaff = typeof eventStaff.$inferSelect;
export type EventOtherExpense = typeof eventOtherExpenses.$inferSelect;
