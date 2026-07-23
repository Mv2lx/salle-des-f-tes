import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { LocaleProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "HOTEL EL FARES — ERP Réception & Événements",
  description:
    "ERP complet de gestion des salles de réception de HOTEL EL FARES : réservations, CRM, facturation, paiements et rapports.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="antialiased">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
