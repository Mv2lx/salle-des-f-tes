/**
 * Shared export/print helpers used across Payments, Daily Revenue, and
 * Revenue History modules. No external dependency: Excel export uses CSV
 * (opens natively in Excel with UTF-8 BOM for correct accented characters),
 * and PDF export reuses the browser's native print-to-PDF via a dedicated
 * print window — consistent with the existing `window.print()` pattern
 * already used in Rapports.tsx / Facturation.tsx.
 */

export type ExportColumn<T> = {
  header: string;
  value: (row: T) => string | number;
};

export function exportToExcel<T>(filename: string, columns: ExportColumn<T>[], rows: T[]) {
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = columns.map((c) => escape(c.header)).join(";");
  const lines = rows.map((r) => columns.map((c) => escape(c.value(r))).join(";"));
  const csv = [header, ...lines].join("\r\n");
  // UTF-8 BOM so Excel detects encoding correctly (accents, DA symbol, etc.)
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function printHtmlDocument(title: string, bodyHtml: string) {
  const win = window.open("", "_blank", "width=1000,height=700");
  if (!win) return;
  win.document.write(`<!DOCTYPE html>
<html lang="fr" dir="ltr">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #1f2430; padding: 24px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .subtitle { font-size: 12px; color: #64748b; margin-bottom: 18px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
  th { background: #f8fafc; text-transform: uppercase; font-size: 10px; color: #64748b; }
  tfoot td { font-weight: bold; background: #f8fafc; }
  .text-right { text-align: right; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1>${title}</h1>
  <div class="subtitle">Généré le ${new Date().toLocaleString("fr-FR")} — HOTEL EL FARES</div>
  ${bodyHtml}
</body>
</html>`);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 300);
}

export function buildPrintTable<T>(
  columns: ExportColumn<T>[],
  rows: T[],
  opts?: { totalsRow?: (string | number)[] },
): string {
  const thead = `<thead><tr>${columns.map((c) => `<th>${c.header}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${rows
    .map(
      (r) =>
        `<tr>${columns.map((c) => `<td>${c.value(r)}</td>`).join("")}</tr>`,
    )
    .join("")}</tbody>`;
  const tfoot = opts?.totalsRow
    ? `<tfoot><tr>${opts.totalsRow.map((v) => `<td>${v}</td>`).join("")}</tr></tfoot>`
    : "";
  return `<table>${thead}${tbody}${tfoot}</table>`;
}
