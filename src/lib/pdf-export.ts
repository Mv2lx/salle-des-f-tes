"use client";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type PDFImage } from "pdf-lib";
import { HOTEL } from "@/lib/hotel";

export type PdfColumn<T> = {
  header: string;
  value: (row: T) => string;
  /** Relative width weight (default 1). A 2 means "twice as wide as a 1". */
  width?: number;
  align?: "left" | "right" | "center";
};

export type PdfExportOptions<T> = {
  filename: string;
  title: string;
  subtitle?: string;
  columns: PdfColumn<T>[];
  rows: T[];
  /** Optional footer totals row, same column count as `columns`. */
  totalsRow?: (string | number)[];
};

const PAGE_W = 595.28; // A4 portrait, points
const PAGE_H = 841.89;
const MARGIN = 40;
const ROW_H = 22;
const HEADER_ROW_H = 24;
const TOP_BAND_H = 8;
const HEADER_BLOCK_H = 92; // banner + logo + title block height on each page

const TINT = hexToRgb(HOTEL.primary || "#F5A623");
const TINT_DARK = hexToRgb(shade(HOTEL.primary || "#F5A623", -0.25));
const DARK = rgb(0.16, 0.18, 0.23);
const GRAY = rgb(0.45, 0.48, 0.53);
const LIGHT = rgb(0.97, 0.97, 0.98);
const BORDER = rgb(0.85, 0.86, 0.89);
const WHITE = rgb(1, 1, 1);

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return rgb(r || 0, g || 0, b || 0);
}

/** Darkens (negative amt) or lightens (positive amt) a hex color, amt in [-1,1]. */
function shade(hex: string, amt: number): string {
  const h = hex.replace("#", "");
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(parseInt(h.substring(0, 2), 16) + amt * 255);
  const g = clamp(parseInt(h.substring(2, 4), 16) + amt * 255);
  const b = clamp(parseInt(h.substring(4, 6), 16) + amt * 255);
  const toHex = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function fitText(font: PDFFont, text: string, size: number, maxWidth: number): string {
  text = sanitizeForPdf(text);
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && font.widthOfTextAtSize(out + "…", size) > maxWidth) {
    out = out.slice(0, -1);
  }
  return out + "…";
}

/**
 * pdf-lib's StandardFonts use WinAnsiEncoding, which can't encode every
 * Unicode character. Two real crashes were caught by testing:
 *  - `toLocaleString("fr-FR")` (used throughout the app for money
 *    formatting) inserts U+202F (narrow no-break space) as the thousands
 *    separator, which WinAnsi can't encode.
 *  - The hotel's slogan contains star characters (★, U+2605) for its rating,
 *    also unencodable.
 * Rather than special-casing every character we happen to discover this way,
 * replace the specific known offenders with readable equivalents, then fall
 * back to stripping any other character outside WinAnsi's range entirely —
 * so a future unexpected symbol degrades gracefully instead of crashing PDF
 * export.
 */
function sanitizeForPdf(text: string): string {
  return text
    .replace(/[\u202F\u00A0\u2007\u2009]/g, " ") // narrow/no-break/figure/thin spaces → normal space
    .replace(/[\u2018\u2019]/g, "'") // curly single quotes
    .replace(/[\u201C\u201D]/g, '"') // curly double quotes
    .replace(/[\u2013\u2014]/g, "-") // en/em dash
    .replace(/[\u2605\u2606]/g, "*") // star ratings
    .replace(/[^\x20-\x7E\u00A1-\u00FF]/g, ""); // strip anything else outside WinAnsi's safe range
}

async function tryEmbedLogo(doc: PDFDocument): Promise<PDFImage | null> {
  try {
    const res = await fetch(HOTEL.logo);
    if (!res.ok) return null;
    const bytes = await res.arrayBuffer();
    // The logo is a PNG (public/logo-elfares.png); embedPng is correct here.
    return await doc.embedPng(bytes);
  } catch {
    return null;
  }
}

export async function exportTableToPdf<T>(opts: PdfExportOptions<T>): Promise<void> {
  const { filename, title, subtitle, columns, rows, totalsRow } = opts;

  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = await tryEmbedLogo(doc);

  const contentWidth = PAGE_W - MARGIN * 2;
  const totalWeight = columns.reduce((s, c) => s + (c.width ?? 1), 0);
  const colWidths = columns.map((c) => (contentWidth * (c.width ?? 1)) / totalWeight);
  const colX: number[] = [];
  {
    let x = MARGIN;
    for (const w of colWidths) {
      colX.push(x);
      x += w;
    }
  }

  let page!: PDFPage;
  let y = 0;
  let pageNum = 0;

  function drawHeader() {
    pageNum += 1;
    page = doc.addPage([PAGE_W, PAGE_H]);

    // Branded top band
    page.drawRectangle({ x: 0, y: PAGE_H - TOP_BAND_H, width: PAGE_W, height: TOP_BAND_H, color: TINT });

    y = PAGE_H - TOP_BAND_H - 26;

    const textX = logo ? MARGIN + 46 : MARGIN;
    if (logo) {
      const logoSize = 38;
      const scale = logoSize / Math.max(logo.width, logo.height);
      page.drawImage(logo, {
        x: MARGIN,
        y: y - logoSize + 10,
        width: logo.width * scale,
        height: logo.height * scale,
      });
    }

    page.drawText(sanitizeForPdf(HOTEL.nom), { x: textX, y, size: 16, font: bold, color: DARK });
    y -= 15;
    if (HOTEL.slogan) {
      page.drawText(sanitizeForPdf(HOTEL.slogan), { x: textX, y, size: 7.5, font: regular, color: GRAY });
    }

    // Title block, right-aligned
    const genLabel = sanitizeForPdf(`Genere le ${new Date().toLocaleString("fr-FR")}`);
    const titleText = sanitizeForPdf(title);
    const titleW = bold.widthOfTextAtSize(titleText, 13);
    page.drawText(titleText, { x: PAGE_W - MARGIN - titleW, y: PAGE_H - TOP_BAND_H - 26, size: 13, font: bold, color: TINT_DARK });
    if (subtitle) {
      const subText = sanitizeForPdf(subtitle);
      const subW = regular.widthOfTextAtSize(subText, 9);
      page.drawText(subText, { x: PAGE_W - MARGIN - subW, y: PAGE_H - TOP_BAND_H - 41, size: 9, font: regular, color: GRAY });
    }
    const genW = regular.widthOfTextAtSize(genLabel, 7.5);
    page.drawText(genLabel, { x: PAGE_W - MARGIN - genW, y: PAGE_H - TOP_BAND_H - 54, size: 7.5, font: regular, color: GRAY });

    y = PAGE_H - TOP_BAND_H - HEADER_BLOCK_H + 10;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 1.4, color: TINT });
    y -= 16;

    drawTableHeaderRow();
  }

  function drawTableHeaderRow() {
    page.drawRectangle({
      x: MARGIN,
      y: y - HEADER_ROW_H + 6,
      width: contentWidth,
      height: HEADER_ROW_H,
      color: TINT_DARK,
    });
    columns.forEach((col, i) => {
      const text = fitText(bold, col.header.toUpperCase(), 7.5, colWidths[i] - 10);
      const tw = bold.widthOfTextAtSize(text, 7.5);
      const tx =
        col.align === "right"
          ? colX[i] + colWidths[i] - 8 - tw
          : col.align === "center"
            ? colX[i] + (colWidths[i] - tw) / 2
            : colX[i] + 8;
      page.drawText(text, { x: tx, y: y - 10, size: 7.5, font: bold, color: WHITE });
    });
    y -= HEADER_ROW_H;
  }

  function ensureSpace() {
    if (y - ROW_H < MARGIN + 34) {
      drawHeader();
    }
  }

  function drawRow(cells: string[], opts2?: { bold?: boolean; bg?: boolean }) {
    if (opts2?.bg) {
      page.drawRectangle({
        x: MARGIN,
        y: y - ROW_H + 6,
        width: contentWidth,
        height: ROW_H,
        color: LIGHT,
      });
    }
    // Faint horizontal rule under every row — gives the table a defined,
    // "official document" grid instead of loose floating text.
    page.drawLine({
      start: { x: MARGIN, y: y - ROW_H + 6 },
      end: { x: PAGE_W - MARGIN, y: y - ROW_H + 6 },
      thickness: 0.5,
      color: BORDER,
    });
    const f = opts2?.bold ? bold : regular;
    cells.forEach((raw, i) => {
      const text = fitText(f, raw, 8.5, colWidths[i] - 10);
      const tw = f.widthOfTextAtSize(text, 8.5);
      const col = columns[i];
      const tx =
        col?.align === "right"
          ? colX[i] + colWidths[i] - 8 - tw
          : col?.align === "center"
            ? colX[i] + (colWidths[i] - tw) / 2
            : colX[i] + 8;
      page.drawText(text, { x: tx, y: y - 13, size: 8.5, font: f, color: DARK });
    });
    y -= ROW_H;
  }

  drawHeader();

  rows.forEach((row, idx) => {
    ensureSpace();
    const cells = columns.map((c) => c.value(row));
    drawRow(cells, { bg: idx % 2 === 1 });
  });

  if (totalsRow) {
    ensureSpace();
    page.drawRectangle({
      x: MARGIN,
      y: y - ROW_H + 6,
      width: contentWidth,
      height: ROW_H,
      color: hexToRgb(shade(HOTEL.primary || "#F5A623", 0.85)),
    });
    drawRow(
      totalsRow.map((v) => String(v)),
      { bold: true },
    );
  }

  if (rows.length === 0) {
    page.drawText(sanitizeForPdf("Aucune donnee pour cette selection."), {
      x: MARGIN,
      y: y - 6,
      size: 9,
      font: regular,
      color: GRAY,
    });
  }

  // Footer (page numbers + contact + accent line) on every page
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: MARGIN, y: 34 }, end: { x: PAGE_W - MARGIN, y: 34 }, thickness: 0.75, color: BORDER });
    const footer = sanitizeForPdf(`${HOTEL.nom}  -  ${HOTEL.telephone}  -  ${HOTEL.email}`);
    p.drawText(footer, { x: MARGIN, y: 22, size: 7, font: regular, color: GRAY });
    const pageLabel = `Page ${i + 1} / ${pages.length}`;
    const tw = regular.widthOfTextAtSize(pageLabel, 7);
    p.drawText(pageLabel, { x: PAGE_W - MARGIN - tw, y: 22, size: 7, font: bold, color: TINT_DARK });
  });

  const bytes = await doc.save();
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
