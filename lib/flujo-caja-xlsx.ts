import * as XLSX from "xlsx";

const MONTH_NAMES = [
  "ENERO",
  "FEBRERO",
  "MARZO",
  "ABRIL",
  "MAYO",
  "JUNIO",
  "JULIO",
  "AGOSTO",
  "SEPTIEMBRE",
  "OCTUBRE",
  "NOVIEMBRE",
  "DICIEMBRE",
] as const;

const normalizeText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();

const parseMoney = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const text = String(value ?? "")
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .trim();
  if (!text) return 0;
  const num = Number(text);
  return Number.isFinite(num) ? num : 0;
};

const parseExcelDate = (value: unknown): string | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return `${parsed.y.toString().padStart(4, "0")}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }

  const text = String(value ?? "").trim();
  if (!text) return null;

  const normalized = text.replace(/\./g, "/").replace(/-/g, "/");
  const parts = normalized.split("/").map((part) => part.trim());
  if (parts.length !== 3) return null;

  if (parts[0].length === 4) {
    return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
  }

  const [day, month, year] = parts;
  const yyyy = year.length === 2 ? `20${year}` : year;
  return `${yyyy}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const resolveTargetSheet = (sheetNames: string[], month: number, year: number): string | null => {
  const targetMonth = MONTH_NAMES[month - 1];
  const yearText = String(year);

  const normalizedNames = sheetNames.map((name) => ({
    original: name,
    normalized: normalizeText(name),
  }));

  const exact = normalizedNames.find(
    (item) =>
      !item.normalized.includes("CIERRE") &&
      item.normalized.includes(targetMonth) &&
      (!/\b20\d{2}\b/.test(item.normalized) || item.normalized.includes(yearText))
  );
  if (exact) return exact.original;

  const fallback = normalizedNames.find(
    (item) => !item.normalized.includes("CIERRE") && item.normalized.includes(targetMonth)
  );
  return fallback?.original ?? null;
};

export type FlujoCajaImportRow = {
  fecha: string;
  vendedor: string;
  motivo: string;
  desembolso: number;
  ingreso: number;
  saldo_excel: number | null;
  sheet_name: string;
  row_number: number;
};

export function parseFlujoCajaImportFile(
  buffer: ArrayBuffer,
  month: number,
  year: number
): { rows: FlujoCajaImportRow[]; errores: string[]; sheetName: string | null } {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = resolveTargetSheet(workbook.SheetNames, month, year);

  if (!sheetName) {
    return {
      rows: [],
      errores: [`No se encontró una hoja para ${MONTH_NAMES[month - 1]} ${year}.`],
      sheetName: null,
    };
  }

  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  const errores: string[] = [];
  const rows: FlujoCajaImportRow[] = [];

  let headerRow = -1;
  for (let r = 0; r < Math.min(raw.length, 12); r++) {
    const row = raw[r] ?? [];
    const normalized = row.map(normalizeText);
    if (
      normalized.includes("FECHA") &&
      normalized.includes("VENDEDOR") &&
      normalized.includes("MOTIVO") &&
      normalized.includes("DESEMBOLSO") &&
      normalized.includes("INGRESOS")
    ) {
      headerRow = r;
      break;
    }
  }

  if (headerRow < 0) {
    return {
      rows: [],
      errores: ["No se encontró el encabezado esperado con FECHA, VENDEDOR, MOTIVO, DESEMBOLSO e INGRESOS."],
      sheetName,
    };
  }

  for (let r = headerRow + 1; r < raw.length; r++) {
    const row = raw[r] ?? [];
    if (!row.some((cell) => String(cell ?? "").trim() !== "")) continue;

    const fecha = parseExcelDate(row[1]);
    const motivo = String(row[3] ?? "").trim();
    const desembolso = parseMoney(row[4]);
    const ingreso = parseMoney(row[5]);
    const saldoExcelRaw = parseMoney(row[6]);

    if (!motivo && !fecha && desembolso === 0 && ingreso === 0) continue;

    if (!fecha || !motivo) {
      errores.push(`Fila ${r + 1}: falta fecha o motivo.`);
      continue;
    }

    if (desembolso === 0 && ingreso === 0) {
      continue;
    }

    rows.push({
      fecha,
      vendedor: String(row[2] ?? "").trim(),
      motivo,
      desembolso,
      ingreso,
      saldo_excel: saldoExcelRaw === 0 ? null : saldoExcelRaw,
      sheet_name: sheetName,
      row_number: r + 1,
    });
  }

  if (rows.length === 0) {
    errores.push("No se encontraron filas válidas para importar en la hoja seleccionada.");
  }

  return { rows, errores, sheetName };
}
