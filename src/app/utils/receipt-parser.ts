import { ParsedExpense } from './voice-parser';

// ── Receipt OCR text → expense fields.
//    Reuses the voice flow's ParsedExpense shape so the result can be shown in
//    the SAME confirmation card and saved through the SAME store method.
//    Priority is amount + date (the two reliable signals on a receipt); title
//    is a best-effort merchant guess and category defaults to Other — the user
//    can fix either via "Edit in form".

// Total labels, weighted by how strongly they name the FINAL payable figure.
// "grand total"/"amount due" are unambiguous; a bare "total" is weak because it
// also appears in "total items", "total savings", etc.
const TOTAL_LABELS: { kw: string; weight: number }[] = [
  { kw: 'grand total',   weight: 5 },
  { kw: 'amount due',    weight: 5 },
  { kw: 'balance due',   weight: 5 },
  { kw: 'total payable', weight: 5 },
  { kw: 'net payable',   weight: 4 },
  { kw: 'net amount',    weight: 4 },
  { kw: 'total amount',  weight: 4 },
  { kw: 'total',         weight: 3 },
  { kw: 'payable',       weight: 3 },
];
// Lines that look like totals but are NOT the figure we want. Checked BEFORE the
// labels — note "subtotal" contains "total", so order matters.
const NOT_TOTAL_HINTS = [
  'subtotal', 'sub total', 'sub-total', 'tax', 'vat', 'gst',
  'discount', 'change', 'cash', 'tendered', 'qty', 'items',
];

// A money figure: optional Rs/₨/PKR, then digits with optional thousands
// separators and an optional 2-dp decimal. Capturing group 1 is the number.
const MONEY = /(?:rs\.?|pkr|₨)?\s*(\d{1,3}(?:[,\s]\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/gi;

function toNumber(raw: string): number {
  return parseFloat(raw.replace(/[,\s]/g, ''));
}

// Pull every money figure out of a single line.
function moneyOnLine(line: string): number[] {
  const out: number[] = [];
  for (const m of line.matchAll(MONEY)) {
    const n = toNumber(m[1]);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

// Strongest total-label present on a line (null if it's a decoy or has none).
function labelOn(line: string): { kw: string; weight: number } | null {
  const lower = line.toLowerCase();
  if (NOT_TOTAL_HINTS.some(h => lower.includes(h))) return null;   // decoy wins
  return TOTAL_LABELS
    .filter(l => lower.includes(l.kw))
    .sort((a, b) => b.weight - a.weight)[0] ?? null;
}

// ── Find the payable amount.
//    Tier 1 — anchor on a label: scan for total-labelled lines, read the money
//      off that line OR the next one (OCR often splits label from value).
//      Pick the strongest label; on a tie, the lowest line wins (grand total
//      prints last). This is the "largest value near those words" rule.
//    Tier 2 — no label anywhere: fall back to the largest "currency-looking"
//      figure (has a decimal or a currency marker), which rejects phone
//      numbers, IDs and quantities and is almost always the total.
function extractAmount(lines: string[]): number | null {
  let best: { weight: number; line: number; value: number } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const label = labelOn(lines[i]);
    if (!label) continue;

    // value on the label line, else the next non-decoy line (wrapped column)
    let nums = moneyOnLine(lines[i]);
    if (!nums.length && i + 1 < lines.length && labelOn(lines[i + 1]) === null
        && !NOT_TOTAL_HINTS.some(h => lines[i + 1].toLowerCase().includes(h))) {
      nums = moneyOnLine(lines[i + 1]);
    }
    if (!nums.length) continue;

    const value = Math.max(...nums);
    const better = !best
      || label.weight > best.weight
      || (label.weight === best.weight && i > best.line);
    if (better) best = { weight: label.weight, line: i, value };
  }
  if (best) return best.value;

  // Fallback: largest figure that carries a currency marker or a decimal.
  let fallback: number | null = null;
  for (const line of lines) {
    if (NOT_TOTAL_HINTS.some(h => line.toLowerCase().includes(h))) continue;
    const hasMarker = /rs\.?|pkr|₨/i.test(line);
    for (const m of line.matchAll(MONEY)) {
      const n = toNumber(m[1]);
      const looksLikeMoney = hasMarker || m[1].includes('.');
      if (looksLikeMoney && Number.isFinite(n) && (fallback === null || n > fallback)) {
        fallback = n;
      }
    }
  }
  return fallback;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// Build an ISO date, returning null if the parts aren't a real calendar date.
function toIso(year: number, month: number, day: number): string | null {
  if (year < 100) year += 2000;            // "26" → 2026
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

// ── Find a date in the text. Handles dd/mm/yyyy (PK day-first), ISO
//    yyyy-mm-dd, and "12 Jun 2026" / "Jun 12 2026". First valid hit wins;
//    defaults to today when nothing parses.
function extractDate(text: string): string {
  // yyyy-mm-dd
  const iso = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const d = toIso(+iso[1], +iso[2], +iso[3]);
    if (d) return d;
  }

  // dd/mm/yyyy | dd-mm-yyyy | dd.mm.yyyy  (assume day-first for PK; flip if
  // the first part can't be a day but the second can)
  for (const m of text.matchAll(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/g)) {
    let day = +m[1], month = +m[2];
    if (day > 12 && month <= 12) { /* clearly day-first */ }
    else if (month > 12 && day <= 12) { [day, month] = [month, day]; } // mm/dd
    const d = toIso(+m[3], month, day);
    if (d) return d;
  }

  // 12 Jun 2026  /  June 12, 2026
  const named = text.match(
    /(\d{1,2})\s+([a-z]{3,})\.?\s+(\d{2,4})|([a-z]{3,})\.?\s+(\d{1,2}),?\s+(\d{2,4})/i,
  );
  if (named) {
    const day = +(named[1] ?? named[5]);
    const mon = MONTHS[(named[2] ?? named[4]).slice(0, 3).toLowerCase()];
    const year = +(named[3] ?? named[6]);
    if (mon) {
      const d = toIso(year, mon, day);
      if (d) return d;
    }
  }

  return new Date().toISOString().slice(0, 10);
}

// ── Best-effort merchant name: the first line near the top that's mostly
//    letters (receipts print the store name first). Often imperfect — the
//    user confirms or edits it.
function extractTitle(lines: string[]): string {
  for (const line of lines.slice(0, 6)) {
    const letters = line.replace(/[^a-z]/gi, '');
    if (letters.length >= 3 && letters.length >= line.replace(/\s/g, '').length / 2) {
      const clean = line.trim().replace(/\s+/g, ' ');
      return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
    }
  }
  return '';
}

/**
 * Parse raw receipt OCR text into structured expense fields.
 * Amount and date are the focus; title/category are best-effort.
 */
export function parseReceipt(text: string): ParsedExpense {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  return {
    title: extractTitle(lines),
    amount: extractAmount(lines),
    category: 'Other',
    date: extractDate(text),
  };
}
