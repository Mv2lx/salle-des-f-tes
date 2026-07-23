"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useLocale } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError(t("login.errorRequired"));
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data?.error ?? t("login.errorGeneric"));
        setLoading(false);
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError(t("login.errorServer"));
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f1f3f7] p-4">
      <div className="ef-card ef-fade w-full max-w-sm p-8">
        <div className="mb-4 flex justify-end">
          <LanguageSwitcher />
        </div>
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-2 shadow">
            <Image
              src="/logo-elfares.png"
              alt="HOTEL EL FARES"
              width={56}
              height={56}
              className="h-full w-full object-contain"
            />
          </div>
          <h1 className="text-lg font-extrabold text-slate-800">{t("login.title")}</h1>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#e08600]">
            {t("login.subtitle")}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3" noValidate>
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-500">{t("login.username")}</span>
            <input
              className="ef-input"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-500">{t("login.password")}</span>
            <input
              type="password"
              className="ef-input"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button type="submit" disabled={loading} className="ef-btn ef-btn-primary w-full justify-center">
            {loading ? t("login.submitting") : t("login.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
