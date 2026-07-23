"use client";

import type { SVGProps, JSX } from "react";
import Image from "next/image";
import {
  IconDashboard,
  IconUsers,
  IconHall,
  IconCalendarPlus,
  IconTag,
  IconPackage,
  IconInvoice,
  IconCash,
  IconCalendar,
  IconExpense,
  IconReport,
  IconSun,
  IconHistory,
  IconLog,
  IconSettings,
  IconLock,
} from "./icons";
import { canRead } from "@/lib/permissions";
import type { Role } from "@/db/schema";
import { useLocale } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/translations";
import LanguageSwitcher from "./LanguageSwitcher";

type NavEntry = {
  key: string;
  labelKey: TranslationKey;
  icon: (p: SVGProps<SVGSVGElement>) => JSX.Element;
  group: "" | "nav.group.pilotage" | "nav.group.exploitation" | "nav.group.finance" | "nav.group.administration";
  adminOnly?: boolean;
};

export const NAV: NavEntry[] = [
  { key: "accueil", labelKey: "nav.accueil", icon: IconDashboard, group: "" },
  { key: "dashboard", labelKey: "nav.dashboard", icon: IconDashboard, group: "nav.group.pilotage" },
  { key: "calendrier", labelKey: "nav.calendrier", icon: IconCalendar, group: "nav.group.pilotage" },
  { key: "reservations", labelKey: "nav.reservations", icon: IconCalendarPlus, group: "nav.group.exploitation" },
  { key: "clients", labelKey: "nav.clients", icon: IconUsers, group: "nav.group.exploitation" },
  { key: "salles", labelKey: "nav.salles", icon: IconHall, group: "nav.group.exploitation" },
  { key: "prestations", labelKey: "nav.prestations", icon: IconTag, group: "nav.group.exploitation" },
  { key: "packs", labelKey: "nav.packs", icon: IconPackage, group: "nav.group.exploitation" },
  { key: "facturation", labelKey: "nav.facturation", icon: IconInvoice, group: "nav.group.finance" },
  { key: "paiements", labelKey: "nav.paiements", icon: IconCash, group: "nav.group.finance" },
  { key: "revenue-daily", labelKey: "nav.revenueDaily", icon: IconSun, group: "nav.group.finance" },
  { key: "revenue-history", labelKey: "nav.revenueHistory", icon: IconHistory, group: "nav.group.finance" },
  { key: "depenses", labelKey: "nav.depenses", icon: IconExpense, group: "nav.group.finance" },
  { key: "rapports", labelKey: "nav.rapports", icon: IconReport, group: "nav.group.finance" },
  { key: "rapport-interne", labelKey: "nav.rapportInterne", icon: IconLock, group: "nav.group.finance", adminOnly: true },
  { key: "audit-log", labelKey: "nav.auditLog", icon: IconLog, group: "nav.group.administration", adminOnly: true },
  { key: "company-settings", labelKey: "nav.companySettings", icon: IconSettings, group: "nav.group.administration", adminOnly: true },
];

export default function Sidebar({
  active,
  onSelect,
  open,
  role,
}: {
  active: string;
  onSelect: (k: string) => void;
  open: boolean;
  role?: Role;
}) {
  const { t, dir } = useLocale();
  const visible = NAV.filter(
    (n) => !n.group || (!role || canRead(role, n.key)) && (!n.adminOnly || role === "admin"),
  );
  const groups = [
    ...new Set(
      visible
        .map((n) => n.group)
        .filter((g): g is Exclude<NavEntry["group"], ""> => g !== ""),
    ),
  ];

  // The sidebar slides in from the edge matching reading direction: left in
  // LTR (French), right in RTL (Arabic).
  const sideClass = dir === "rtl" ? "right-0" : "left-0";
  const closedTransform = dir === "rtl" ? "translate-x-full" : "-translate-x-full";

  return (
    <aside
      className={`no-print fixed inset-y-0 ${sideClass} z-40 flex w-64 flex-col text-slate-200 transition-transform lg:translate-x-0 ${
        open ? "translate-x-0" : closedTransform
      }`}
      style={{ background: "#241c15" }}
    >
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1">
          <Image src="/logo-elfares.png" alt="HOTEL EL FARES" width={40} height={40} className="h-9 w-9 object-contain" />
        </div>
        <div>
          <div className="text-sm font-extrabold tracking-wide text-white">HOTEL EL FARES</div>
          <div className="text-[10px] uppercase tracking-widest text-[#f5a623]">{t("login.subtitle")}</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <button
          onClick={() => onSelect("accueil")}
          className={`mb-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
            active === "accueil" ? "bg-[#f5a623] text-white" : "text-slate-300 hover:bg-white/10"
          }`}
        >
          <IconDashboard className="h-5 w-5" /> {t("nav.accueil")}
        </button>
        {groups.map((g) => (
          <div key={g} className="mb-3">
            <div className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">{t(g)}</div>
            {visible.filter((n) => n.group === g).map((n) => {
              const Ic = n.icon;
              const isActive = active === n.key;
              return (
                <button
                  key={n.key}
                  onClick={() => onSelect(n.key)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    isActive ? "bg-[#f5a623] text-white shadow" : "text-slate-300 hover:bg-white/10"
                  }`}
                >
                  <Ic className="h-5 w-5" /> {t(n.labelKey)}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-5 py-3">
        <LanguageSwitcher className="mb-3 w-full justify-center !bg-white/5 !border-white/10 [&_button]:text-slate-300" />
        <div className="text-[10px] text-slate-500">
          ★★★★★ Spa &amp; Conférences<br />© {new Date().getFullYear()} HOTEL EL FARES
        </div>
      </div>
    </aside>
  );
}
