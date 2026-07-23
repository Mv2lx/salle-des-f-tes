import type { Role } from "@/db/schema";

// Every authenticated role can READ all modules — most screens legitimately
// cross-reference other modules' data (e.g. Facturation and Rapports both
// need salle names, Reservations needs payment status, etc.), so read access
// is intentionally not restricted by role. WRITE access is what meaningfully
// differs between Admin / Receptionist / Accountant, and is enforced both in
// the UI (buttons hidden/disabled) and — authoritatively — in each API route.
export const ROLE_PERMISSIONS: Record<Role, { read: string[]; write: string[] }> = {
  // "packs" (like "prestations" and "salles") isn't listed under any
  // non-admin write[] below, so only admin can create/edit/delete packs —
  // everyone can still read them (read: ["*"]) to use them when booking.
  admin: {
    read: ["*"],
    write: ["*"],
  },
  receptionist: {
    read: ["*"],
    write: ["clients", "reservations"],
  },
  accountant: {
    read: ["*"],
    write: ["paiements", "depenses"],
  },
};

export function canRead(role: Role, moduleKey: string): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms.read.includes("*") || perms.read.includes(moduleKey);
}

export function canWrite(role: Role, moduleKey: string): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms.write.includes("*") || perms.write.includes(moduleKey);
}
