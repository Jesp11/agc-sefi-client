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
