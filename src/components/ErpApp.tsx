"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useErp } from "@/lib/store";
import Sidebar, { NAV } from "./Sidebar";
import Dashboard from "./modules/Dashboard";
import Clients from "./modules/Clients";
import Salles from "./modules/Salles";
import Reservations from "./modules/Reservations";
import Prestations from "./modules/Prestations";
import Packs from "./modules/Packs";
import Facturation from "./modules/Facturation";
import Paiements from "./modules/Paiements";
import Calendrier from "./modules/Calendrier";
import Depenses from "./modules/Depenses";
import Rapports from "./modules/Rapports";
import RapportInterne from "./modules/RapportInterne";
import DailyRevenue from "./modules/DailyRevenue";
import RevenueHistory from "./modules/RevenueHistory";
import AuditLogView from "./modules/AuditLogView";
import CompanySettings from "./modules/CompanySettings";
import { IconSearch } from "./icons";
import { canRead } from "@/lib/permissions";
import type { Role } from "@/db/schema";
import { useLocale } from "@/lib/i18n";

type CurrentUser = { name: string; username: string; role: Role };

export default function ErpApp() {
  const { data, loading, refresh } = useErp();
  const [active, setActive] = useState("accueil");
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/auth/me", { cache: "no-store" });
      const d = await r.json().catch(() => ({ user: null }));
      setUser(d.user);
    })();
  }, []);

  const go = (k: string) => {
    setActive(k);
    setMenuOpen(false);
  };

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const { t, dir } = useLocale();
  const currentLabel = NAV.find((n) => n.key === active)?.labelKey;
  const allowed = (key: string) => {
    const entry = NAV.find((n) => n.key === key);
    if (entry?.adminOnly) return user?.role === "admin";
    return !user || key === "accueil" || canRead(user.role, key);
  };

  return (
    <div className="min-h-screen bg-[#f1f3f7]">
      <Sidebar active={active} onSelect={go} open={menuOpen} role={user?.role} />
      {menuOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setMenuOpen(false)} />
      )}

      <div className={dir === "rtl" ? "lg:pr-64" : "lg:pl-64"}>
        {/* Top bar */}
        <header className="no-print sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
          <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setMenuOpen(true)}>
            ☰
          </button>
          <h2 className="text-sm font-bold text-slate-700 sm:text-base">{currentLabel ? t(currentLabel) : t("nav.accueil")}</h2>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-400 sm:flex">
              <IconSearch className="h-3.5 w-3.5" /> {t("app.search")}
            </div>
            {user && (
              <div className="hidden text-right text-xs leading-tight sm:block">
                <div className="font-semibold text-slate-700">{user.name}</div>
                <div className="capitalize text-slate-400">{user.role}</div>
              </div>
            )}
            <button
              onClick={logout}
              title={t("app.logout")}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fff4e0] text-sm font-bold text-[#b56a00] hover:bg-[#ffe6b8]"
            >
              {user ? user.name.slice(0, 2).toUpperCase() : "EF"}
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-[1400px] p-4 sm:p-6">
          {loading ? (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-slate-400">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#f5a623]" />
              {t("app.loading")}
            </div>
          ) : active === "accueil" ? (
            <Welcome data={data} go={go} role={user?.role} />
          ) : !allowed(active) ? (
            <AccessDenied />
          ) : active === "dashboard" ? (
            <Dashboard data={data} go={go} />
          ) : active === "clients" ? (
            <Clients data={data} refresh={refresh} />
          ) : active === "salles" ? (
            <Salles data={data} refresh={refresh} />
          ) : active === "reservations" ? (
            <Reservations data={data} refresh={refresh} />
          ) : active === "prestations" ? (
            <Prestations data={data} refresh={refresh} />
          ) : active === "packs" ? (
            <Packs data={data} refresh={refresh} />
          ) : active === "facturation" ? (
            <Facturation data={data} />
          ) : active === "paiements" ? (
            <Paiements data={data} refresh={refresh} />
          ) : active === "revenue-daily" ? (
            <DailyRevenue data={data} />
          ) : active === "revenue-history" ? (
            <RevenueHistory data={data} />
          ) : active === "calendrier" ? (
            <Calendrier data={data} />
          ) : active === "depenses" ? (
            <Depenses data={data} refresh={refresh} />
          ) : active === "rapports" ? (
            <Rapports data={data} />
          ) : active === "rapport-interne" ? (
            <RapportInterne data={data} />
          ) : active === "audit-log" ? (
            <AuditLogView />
          ) : active === "company-settings" ? (
            <CompanySettings />
          ) : null}
        </main>
      </div>
    </div>
  );
}

function AccessDenied() {
  const { t } = useLocale();
  return (
    <div className="ef-card ef-fade flex flex-col items-center justify-center gap-2 py-16 text-center">
      <p className="text-lg font-bold text-slate-700">{t("app.accessDenied")}</p>
      <p className="max-w-sm text-sm text-slate-500">{t("app.accessDeniedText")}</p>
    </div>
  );
}

function Welcome({
  data,
  go,
  role,
}: {
  data: ReturnType<typeof useErp>["data"];
  go: (k: string) => void;
  role?: Role;
}) {
  const { t } = useLocale();
  const tiles = NAV.filter((n) => n.group && (!role || canRead(role, n.key)));
  return (
    <div className="ef-fade">
      <div
        className="relative overflow-hidden rounded-3xl p-8 text-white sm:p-12"
        style={{ background: "linear-gradient(135deg, #2a2018, #4a3418 55%, #E08600)" }}
      >
        <div className="relative z-10 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl bg-white p-3 shadow-2xl">
            <Image src="/logo-elfares.png" alt="HOTEL EL FARES" width={100} height={100} className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#ffd591]">{t("app.welcomeTag")}</p>
            <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{t("app.welcomeTitle")}</h1>
            <p className="mt-2 max-w-xl text-sm text-white/80">{t("app.welcomeText")}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="ef-btn bg-white text-[#b56a00] hover:bg-white/90" onClick={() => go("dashboard")}>
                {t("welcome.openDashboard")}
              </button>
              <button className="ef-btn border border-white/40 text-white hover:bg-white/10" onClick={() => go("reservations")}>
                {t("welcome.newReservation")}
              </button>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-white/5" />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MiniStat label={t("welcome.clients")} value={data.clients.length} />
        <MiniStat label={t("welcome.reservations")} value={data.reservations.length} />
        <MiniStat label={t("welcome.prestations")} value={data.prestations.length} />
        <MiniStat label={t("welcome.salles")} value={data.salles.length} />
      </div>

      <h3 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wider text-slate-400">{t("welcome.modules")}</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map((n) => {
          const Ic = n.icon;
          return (
            <button key={n.key} onClick={() => go(n.key)} className="ef-card group flex items-center gap-3 p-4 text-left transition hover:-translate-y-0.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff4e0] text-[#e08600] transition group-hover:bg-[#f5a623] group-hover:text-white">
                <Ic className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-800">{t(n.labelKey)}</div>
                <div className="text-xs text-slate-400">{n.group ? t(n.group) : ""}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="ef-card p-4">
      <div className="text-2xl font-extrabold text-[#e08600]">{value}</div>
      <div className="text-xs font-medium text-slate-500">{label}</div>
    </div>
  );
}
