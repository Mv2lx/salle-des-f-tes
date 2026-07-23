// scripts/reset-clients-reservations.ts
//
// One-off maintenance script: deletes ALL clients and reservations (and
// everything that hangs off a reservation: payments, event purchases, event
// staff, event other expenses) so the app starts empty and ready for real
// data. Run this once, locally, before going live — NOT wired into any UI
// button on purpose, since it's destructive and shouldn't be one accidental
// click away.
//
// What this does NOT touch: salles, prestations, packs, company settings,
// users, and the general "Dépenses" (expenses) module — those are
// catalog/config data, not reservation data. Ask if you also want those
// cleared.
//
// Usage (from the project root, with DATABASE_PATH set as usual):
//   npx tsx scripts/reset-clients-reservations.ts
//
// If you don't have tsx installed: npm install -D tsx (one-time), or run
// with ts-node / compile with tsc first — any TS runner that can resolve
// the "@/..." path alias works.

import { db, sqlite } from "@/db";
import {
  eventOtherExpenses,
  eventStaff,
  eventPurchases,
  payments,
  reservations,
  clients,
} from "@/db/schema";

function main() {
  const before = {
    clients: db.select().from(clients).all().length,
    reservations: db.select().from(reservations).all().length,
  };

  // Order matters: children before parents, respecting the FK constraints
  // in schema.ts (all "cascade" from reservations, but deleting explicitly
  // here keeps this script correct even if a constraint ever changes).
  sqlite.transaction(() => {
    db.delete(eventOtherExpenses).run();
    db.delete(eventStaff).run();
    db.delete(eventPurchases).run();
    db.delete(payments).run();
    db.delete(reservations).run();
    db.delete(clients).run();
  })();

  console.log(
    `Supprimé : ${before.clients} client(s), ${before.reservations} réservation(s) (+ paiements/achats/personnel/dépenses d'événement liés).`,
  );
  console.log("La base est prête : ajoutez vos vrais clients et réservations.");
}

main();
