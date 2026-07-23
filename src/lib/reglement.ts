// ============================================================
// قوانين استعمال القاعة (Règlement intérieur) — موحّدة لكل قاعات
// الفندق. هذا هو الملف الوحيد الذي يجب تعديله لتغيير نص القوانين
// المطبوعة؛ لا حاجة لمس أي كود آخر.
//
// كل عنصر في المصفوفة يصبح فقرة (article) مرقّمة في المستند المطبوع.
// ============================================================

export const REGLEMENT_ARTICLES: { titre: string; texte: string }[] = [
  {
    titre: "Réservation et acompte",
    texte:
      "Toute réservation n'est considérée comme définitive qu'après versement d'un acompte non remboursable et signature du présent règlement par le client.",
  },
  {
    titre: "Solde et échéance de paiement",
    texte:
      "Le solde restant dû doit être réglé intégralement au plus tard le jour de l'événement, avant le début de la prestation, sauf accord écrit contraire avec la direction.",
  },
  {
    titre: "Annulation",
    texte:
      "En cas d'annulation par le client, l'acompte versé reste acquis à l'établissement. Toute annulation doit être notifiée par écrit dans les meilleurs délais.",
  },
  {
    titre: "Horaires",
    texte:
      "La salle est mise à disposition selon les horaires convenus lors de la réservation. Tout dépassement d'horaire non convenu au préalable pourra faire l'objet d'une facturation supplémentaire.",
  },
  {
    titre: "Décoration et installations",
    texte:
      "Toute décoration, installation ou modification de l'agencement de la salle doit être approuvée au préalable par la direction. Il est interdit de fixer des éléments aux murs, plafonds ou mobilier sans autorisation.",
  },
  {
    titre: "Restauration et boissons",
    texte:
      "Le recours à un traiteur extérieur, ainsi que l'introduction de boissons, doit être convenu au préalable avec la direction. La consommation de boissons alcoolisées est soumise à la réglementation en vigueur.",
  },
  {
    titre: "Capacité et sécurité",
    texte:
      "Le nombre d'invités ne doit pas dépasser la capacité maximale de la salle indiquée lors de la réservation, pour des raisons de sécurité. Le client s'engage à respecter les consignes de sécurité de l'établissement.",
  },
  {
    titre: "Dégâts et responsabilité",
    texte:
      "Le client est responsable de tout dommage causé à la salle, au mobilier ou aux équipements pendant la durée de l'événement, et s'engage à en assumer les frais de réparation ou de remplacement.",
  },
  {
    titre: "Nettoyage",
    texte:
      "La salle doit être restituée dans un état de propreté raisonnable. Des frais de nettoyage supplémentaires pourront être appliqués en cas de salissures excessives.",
  },
  {
    titre: "Litiges",
    texte:
      "Tout litige relatif à l'exécution du présent règlement relève de la compétence des tribunaux du lieu où est situé l'établissement.",
  },
];
