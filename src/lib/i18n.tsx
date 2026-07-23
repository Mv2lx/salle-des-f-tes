"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { translations, type TranslationKey } from "./translations";

export type Locale = "fr" | "ar";

type LocaleContextValue = {
  locale: Locale;
  dir: "ltr" | "rtl";
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

const STORAGE_KEY = "ef-locale";

function interpolate(str: string, vars?: Record<string, string | number>) {
  if (!vars) return str;
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replaceAll(`{${k}}`, String(v)),
    str,
  );
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    // Reading a one-time value from localStorage on mount; can't be done
    // during SSR render, so this is the correct (if lint-flagged) place.
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (saved === "ar" || saved === "fr") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocaleState(saved);
    }
  }, []);

  useEffect(() => {
    const dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale]);

  function setLocale(l: Locale) {
    setLocaleState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore (private browsing, storage disabled, etc.)
    }
  }

  const dir: "ltr" | "rtl" = locale === "ar" ? "rtl" : "ltr";
  const t = (key: TranslationKey, vars?: Record<string, string | number>) => {
    const dict = translations[locale];
    const value = dict[key] ?? translations.fr[key] ?? key;
    return interpolate(value, vars);
  };

  return (
    <LocaleContext.Provider value={{ locale, dir, setLocale, t }}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return ctx;
}
