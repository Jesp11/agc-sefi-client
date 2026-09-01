import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formato de visualización estándar: DD/MM/YYYY */
export function fmtFecha(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";

  const iso = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr.trim();

  const slashMatch = iso.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, dd, mm, yyyy] = slashMatch;
    return `${dd.padStart(2, "0")}/${mm.padStart(2, "0")}/${yyyy}`;
  }

  const parts = iso.split("-");
  if (parts.length === 3 && /^\d{4}$/.test(parts[0])) {
    const [y, m, d] = parts;
    return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
  }

  return dateStr;
}

/** Extrae la fecha de nacimiento (YYYY-MM-DD) a partir de una CURP válida */
export function extractBirthdateFromCurp(curp: string | null | undefined): string | null {
  if (!curp || typeof curp !== "string") return null;
  const clean = curp.toUpperCase().trim();
  if (clean.length < 10) return null;

  const yearStr = clean.slice(4, 6);
  const monthStr = clean.slice(6, 8);
  const dayStr = clean.slice(8, 10);

  if (!/^\d{2}$/.test(yearStr) || !/^\d{2}$/.test(monthStr) || !/^\d{2}$/.test(dayStr)) {
    return null;
  }

  const monthNum = parseInt(monthStr, 10);
  const dayNum = parseInt(dayStr, 10);
  if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
    return null;
  }

  const currentYearShort = new Date().getFullYear() % 100;
  const yearNum = parseInt(yearStr, 10);
  const fullYear = yearNum > currentYearShort ? 1900 + yearNum : 2000 + yearNum;

  return `${fullYear}-${monthStr}-${dayStr}`;
}

/** Limpia un teléfono extrayendo solo los dígitos */
export function cleanTelefono(phone: string | null | undefined): string {
  if (!phone) return "";
  const s = String(phone).trim();
  if (s.toUpperCase() === "S/N" || s.toUpperCase() === "N/A" || s === "-") return "";
  const noFloat = s.replace(/\.0+$/, "");
  return noFloat.replace(/\D/g, "");
}

/** Formatea un teléfono de 10 dígitos al formato estándar legible: (833) 206-8746 */
export function fmtTelefono(phone: string | null | undefined): string {
  if (!phone) return "—";
  const s = String(phone).trim();
  if (s.toUpperCase() === "S/N" || s.toUpperCase() === "N/A" || s === "-") return "—";

  const digits = cleanTelefono(s);
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 12 && digits.startsWith("52")) {
    const d = digits.slice(2);
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }

  return s.replace(/\.0+$/, "");
}


