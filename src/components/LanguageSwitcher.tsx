"use client";

import { useLocale } from "@/lib/i18n";

export default function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();
  return (
    <div className={`inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-semibold ${className}`}>
      <button
        type="button"
        onClick={() => setLocale("fr")}
        className={`rounded-md px-2.5 py-1 transition ${
          locale === "fr" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-800"
        }`}
        aria-pressed={locale === "fr"}
      >
        FR
      </button>
      <button
        type="button"
        onClick={() => setLocale("ar")}
        className={`rounded-md px-2.5 py-1 transition ${
          locale === "ar" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-800"
        }`}
        aria-pressed={locale === "ar"}
      >
        {t("lang.arabic")}
      </button>
    </div>
  );
}
