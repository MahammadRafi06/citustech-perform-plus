export type TableSortDirection = 'asc' | 'desc';
export type TableSort = { column: number; direction: TableSortDirection };
export type TableSortValue = string | number | boolean | null | undefined;
const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
const missing = /^(?:[—–-]+|not available|unavailable|not supplied|not applicable|unknown|not mapped|n\/a)$/i;

export function normalizeSortValue(value: TableSortValue): string | number | null {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return Number(value);
  const text = value.trim().replace(/\s+/g, ' ');
  if (!text || missing.test(text)) return null;
  const numeric = text.replace(/[,$£€%\s]/g, '').replace(/−/g, '-');
  if (/^[+-]?\d*\.?\d+$/.test(numeric)) return Number(numeric);
  if (/^\(\d*\.?\d+\)$/.test(numeric)) return -Number(numeric.slice(1, -1));
  // Only recognize explicit date formats; identifiers such as HCC-108 stay text.
  if (/^\d{4}-\d{2}-\d{2}(?:[T\s].*)?$/.test(text) || /^\d{1,2}\/\d{1,2}\/\d{4}(?:,.*)?$/.test(text) || /^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}(?:,.*)?$/i.test(text)) {
    const timestamp = Date.parse(text);
    if (Number.isFinite(timestamp)) return timestamp;
  }
  return text;
}

export function compareTableValues(a: TableSortValue, b: TableSortValue, direction: TableSortDirection): number {
  const left = normalizeSortValue(a), right = normalizeSortValue(b);
  // Unavailable values stay last in either direction.
  if (left === null || right === null) return left === right ? 0 : left === null ? 1 : -1;
  const result = typeof left === 'number' && typeof right === 'number' ? left - right : collator.compare(String(left), String(right));
  return direction === 'asc' ? result : -result;
}

export function sortTableRows<T>(rows: readonly T[], value: (row: T) => TableSortValue, direction: TableSortDirection): T[] {
  return rows.map((row, index) => ({ row, index, value: value(row) }))
    .sort((a, b) => compareTableValues(a.value, b.value, direction) || a.index - b.index)
    .map(item => item.row);
}
