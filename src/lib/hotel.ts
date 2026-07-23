// ============================================================
// ملف إعدادات الشركة — هذا هو الملف الوحيد الذي يجب تعديله
// عند بيع المشروع لشركة جديدة. لا حاجة لمس أي كود آخر.
// ============================================================

export const HOTEL = {
  // --- الهوية ---
  nom: "HOTEL EL FARES",
  slogan: "Spa & Conférences — ★★★★★",
  logo: "/logo-elfares.png", // ضع شعار الشركة في مجلد public

  // --- معلومات الاتصال ---
  adresse: "RUE HOUARI BOUMEDIEN, B.B.A 34000",
  telephone: "+213 030 262 312",
  email: "hotelelfares34@gmail.com",
  siteweb: "",

  // --- معلومات قانونية ---
  rc: "RC 16/00-0000000",
  nif: "NIF 000000000000000",
  art: "", // Article d'imposition (اختياري)

  // --- معلومات بنكية (تظهر في الفاتورة إن وُجدت) ---
  banque: "", // مثال: "BNA Agence Boumerdès"
  rib: "",    // رقم الحساب البنكي

  // --- الألوان (لتمييز هوية كل شركة) ---
  primary: "#F5A623",
  secondary: "#1e293b",

  // --- العملة والتنسيق ---
  devise: "DA",
  locale: "fr-DZ",

  // --- نصوص قابلة للتخصيص في تذييل الفاتورة ---
  texteRemerciement: "Merci de votre confiance",
  texteCachet: "Cachet & Signature",
};

export const DOC_LABELS: Record<string, { titre: string; prefix: string }> = {
  devis: { titre: "DEVIS", prefix: "DEV" },
  facture: { titre: "FACTURE", prefix: "FAC" },
  recu: { titre: "REÇU DE PAIEMENT", prefix: "REC" },
  bon: { titre: "BON DE RÉSERVATION", prefix: "BON" },
  confirmation: { titre: "CONFIRMATION DE RÉSERVATION", prefix: "CNF" },
  reglement: { titre: "RÈGLEMENT INTÉRIEUR", prefix: "REG" },
};