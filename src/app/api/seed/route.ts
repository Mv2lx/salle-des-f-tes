import { db } from "@/db";
import {
  salles,
  prestations,
  packs,
  users,
} from "@/db/schema";
import { hashPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

const PRESTATIONS_CATALOG: {
  nom: string;
  categorie: string;
  unite: string;
  prix: number;
}[] = [
  { nom: "Location de salle", categorie: "Location de salle", unite: "journée", prix: 180000 },
  { nom: "Buffet", categorie: "Restauration", unite: "personne", prix: 2500 },
  { nom: "Repas servi à table", categorie: "Restauration", unite: "personne", prix: 3200 },
  { nom: "Boissons", categorie: "Restauration", unite: "personne", prix: 600 },
  { nom: "Décoration florale", categorie: "Services", unite: "forfait", prix: 90000 },
  { nom: "DJ", categorie: "Animation", unite: "soirée", prix: 60000 },
  { nom: "Orchestre", categorie: "Animation", unite: "soirée", prix: 150000 },
  { nom: "Photographe", categorie: "Média", unite: "forfait", prix: 45000 },
  { nom: "Vidéaste", categorie: "Média", unite: "forfait", prix: 55000 },
  { nom: "Sonorisation", categorie: "Technique", unite: "forfait", prix: 35000 },
  { nom: "Éclairage scénique", categorie: "Technique", unite: "forfait", prix: 40000 },
  { nom: "Climatisation", categorie: "Confort", unite: "journée", prix: 20000 },
  { nom: "Sécurité", categorie: "Services", unite: "agent", prix: 8000 },
  { nom: "Parking gardé", categorie: "Services", unite: "forfait", prix: 15000 },
  { nom: "Hébergement hôtel", categorie: "Services", unite: "chambre", prix: 12000 },
  { nom: "Nettoyage", categorie: "Services", unite: "forfait", prix: 18000 },
];

export async function POST() {
  const existingUsers = await db.select().from(users);
  if (existingUsers.length === 0) {
    const defaultPassword = process.env.SEED_DEFAULT_PASSWORD ?? "ElFares#2026";
    const demoAccounts: { username: string; name: string; role: "admin" | "receptionist" | "accountant" }[] = [
      { username: "admin", name: "Administrateur", role: "admin" },
      { username: "reception", name: "Réception", role: "receptionist" },
      { username: "comptable", name: "Comptabilité", role: "accountant" },
    ];
    await db.insert(users).values(
      demoAccounts.map((a) => {
        const { hash, salt } = hashPassword(defaultPassword);
        return {
          username: a.username,
          name: a.name,
          role: a.role,
          passwordHash: hash,
          passwordSalt: salt,
          active: 1,
        };
      }),
    );
  }

  const existingSalles = await db.select().from(salles);
  if (existingSalles.length === 0) {
    await db.insert(salles).values([
      {
        nom: "Salle 1 — Grand Salon El Fares",
        capacite: 500,
        tarif: "220000",
        equipements: "Scène, écran géant, climatisation, cuisine, parking",
        couleur: "#F5A623",
        description: "Grande salle prestige pour mariages et grandes réceptions.",
      },
      {
        nom: "Salle 2 — Salon Andalous",
        capacite: 250,
        tarif: "150000",
        equipements: "Sonorisation, éclairage, climatisation, terrasse",
        couleur: "#2560c9",
        description: "Salle élégante pour événements intermédiaires et séminaires.",
      },
    ]);
  }

  const existingPrest = await db.select().from(prestations);
  if (existingPrest.length === 0) {
    await db.insert(prestations).values(
      PRESTATIONS_CATALOG.map((p) => ({
        nom: p.nom,
        categorie: p.categorie,
        unite: p.unite,
        prix: String(p.prix),
        actif: 1,
      })),
    );
  }

  const existingPacks = await db.select().from(packs);
  if (existingPacks.length === 0) {
    await db.insert(packs).values([
      {
        nom: "Pack Mariage Prestige",
        typeEvenement: "Mariage",
        prix: "450000",
        description: "Formule tout compris pour un mariage haut de gamme.",
        prestations: [
          { prestationId: null, nom: "Location de salle", qte: 1 },
          { prestationId: null, nom: "Repas servi à table", qte: 1 },
          { prestationId: null, nom: "Décoration florale", qte: 1 },
          { prestationId: null, nom: "Orchestre", qte: 1 },
          { prestationId: null, nom: "Photographe", qte: 1 },
          { prestationId: null, nom: "Sonorisation", qte: 1 },
        ],
        actif: 1,
      },
      {
        nom: "Pack Fiançailles Premium",
        typeEvenement: "Fiançailles",
        prix: "220000",
        description: "Formule complète pour une cérémonie de fiançailles.",
        prestations: [
          { prestationId: null, nom: "Location de salle", qte: 1 },
          { prestationId: null, nom: "Buffet", qte: 1 },
          { prestationId: null, nom: "Décoration florale", qte: 1 },
          { prestationId: null, nom: "DJ", qte: 1 },
        ],
        actif: 1,
      },
    ]);
  }

  // Demo clients/reservations/payments/expenses are intentionally NOT
  // seeded here — this app is meant to go live with real bookings from day
  // one. Salles/prestations/packs/user accounts above stay seeded since
  // they're config/catalog data needed to actually create a reservation.
  return Response.json({ ok: true });
}
