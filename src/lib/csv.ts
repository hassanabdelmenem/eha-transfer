/**
 * CSV export shared by the Referrals and Archive screens.
 *
 * Every cell is quoted with embedded quotes doubled (RFC 4180), so a patient
 * name containing a comma or a quote cannot shift the columns. Cells that a
 * spreadsheet would evaluate as a formula (leading = + - @, tab or CR) get a
 * leading apostrophe, so a name like `=HYPERLINK(...)` is shown, not run.
 */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n');
}

/** ISO timestamp, or empty for a value that does not parse (never throws). */
export function isoOrEmpty(value: string | undefined | null): string {
  const t = Date.parse(value || '');
  return Number.isNaN(t) ? '' : new Date(t).toISOString();
}

export function downloadCsv(filename: string, csv: string): void {
  // The BOM makes Excel read UTF-8 (Arabic names) correctly.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
