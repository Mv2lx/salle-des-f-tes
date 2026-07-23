"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  Client,
  Salle,
  Prestation,
  Pack,
  Reservation,
  Payment,
  Expense,
  EventPurchase,
  EventStaff,
  EventOtherExpense,
} from "@/db/schema";
import { DEFAULT_CRENEAUX, type CreneauxDefaults } from "@/lib/creneaux";

export type ErpData = {
  clients: Client[];
  salles: Salle[];
  prestations: Prestation[];
  packs: Pack[];
  reservations: Reservation[];
  payments: Payment[];
  expenses: Expense[];
  eventPurchases: EventPurchase[];
  eventStaff: EventStaff[];
  eventOtherExpenses: EventOtherExpense[];
  creneaux: CreneauxDefaults;
};

const empty: ErpData = {
  clients: [],
  salles: [],
  prestations: [],
  packs: [],
  reservations: [],
  payments: [],
  expenses: [],
  eventPurchases: [],
  eventStaff: [],
  eventOtherExpenses: [],
  creneaux: DEFAULT_CRENEAUX,
};

async function jget<T>(url: string, fallback: T): Promise<T> {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) {
      console.warn(`[erp] GET ${url} failed with status ${r.status}`);
      return fallback;
    }
    return (await r.json()) as T;
  } catch (err) {
    console.warn(`[erp] GET ${url} failed`, err);
    return fallback;
  }
}

export function useErp() {
  const [data, setData] = useState<ErpData>(empty);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [
      clients,
      salles,
      prestations,
      packs,
      reservations,
      payments,
      expenses,
      eventPurchases,
      eventStaff,
      eventOtherExpenses,
      creneaux,
    ] = await Promise.all([
      jget<Client[]>("/api/clients", []),
      jget<Salle[]>("/api/salles", []),
      jget<Prestation[]>("/api/prestations", []),
      jget<Pack[]>("/api/packs", []),
      jget<Reservation[]>("/api/reservations", []),
      jget<Payment[]>("/api/payments", []),
      jget<Expense[]>("/api/expenses", []),
      jget<EventPurchase[]>("/api/event-purchases", []),
      jget<EventStaff[]>("/api/event-staff", []),
      jget<EventOtherExpense[]>("/api/event-other-expenses", []),
      jget<CreneauxDefaults>("/api/settings/creneaux", DEFAULT_CRENEAUX),
    ]);
    setData({
      clients,
      salles,
      prestations,
      packs,
      reservations,
      payments,
      expenses,
      eventPurchases,
      eventStaff,
      eventOtherExpenses,
      creneaux,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      await fetch("/api/seed", { method: "POST" });
      await refresh();
    })();
  }, [refresh]);

  return { data, loading, refresh };
}

export async function apiSend(
  url: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown,
): Promise<{ ok: boolean; data: unknown; error?: string }> {
  const r = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (r.status === 401 && typeof window !== "undefined") {
    window.location.href = "/login";
    return { ok: false, data, error: "Session expirée." };
  }
  if (!r.ok) {
    return { ok: false, data, error: (data as { error?: string })?.error ?? "Erreur" };
  }
  return { ok: true, data };
}
