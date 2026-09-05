export type Cell = { v?: string | number; f?: string };
export type Sheet = { name: string; cells: Record<string, Cell> };
export type Workbook = { name: string; sheets: Sheet[] };

export const COLS = "ABCDEFGHIJ".split("");
export const ROWS = Array.from({ length: 20 }, (_, i) => i + 1);

export function colRow(ref: string): { c: string; r: number } | null {
  const m = /^([A-J])(\d+)$/i.exec(ref.trim());
  if (!m) return null;
  return { c: m[1].toUpperCase(), r: parseInt(m[2], 10) };
}

export function evalFormula(
  formula: string,
  cells: Record<string, Cell>,
  seen = new Set<string>(),
): number | string {
  const expr = formula.replace(/^=/, "").trim();
  const replaced = expr.replace(/[A-J]\d+/gi, (ref) => {
    const key = ref.toUpperCase();
    if (seen.has(key)) return "0";
    seen.add(key);
    const cell = cells[key];
    if (!cell) return "0";
    if (cell.f) return String(evalFormula(cell.f, cells, seen));
    return String(cell.v ?? 0);
  });
  try {
    const n = Function(`"use strict"; return (${replaced})`)();
    return typeof n === "number" && Number.isFinite(n) ? n : String(n);
  } catch {
    return "#ERR";
  }
}

export function displayCell(cell: Cell | undefined, cells: Record<string, Cell>): string {
  if (!cell) return "";
  if (cell.f) return String(evalFormula(cell.f, cells));
  return cell.v === undefined ? "" : String(cell.v);
}

export function emptyBook(name = "Workbook"): Workbook {
  return { name, sheets: [{ name: "Sheet1", cells: {} }] };
}

export function parseCsvToBook(name: string, text: string): Workbook {
  const cells: Record<string, Cell> = {};
  text.split(/\r?\n/).forEach((line, ri) => {
    line.split(",").forEach((val, ci) => {
      if (ci >= COLS.length) return;
      const key = `${COLS[ci]}${ri + 1}`;
      const num = Number(val);
      cells[key] = {
        v: val !== "" && !Number.isNaN(num) && val.trim() !== "" ? num : val,
      };
    });
  });
  return { name, sheets: [{ name: "Sheet1", cells }] };
}
