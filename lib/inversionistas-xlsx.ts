import * as XLSX from "xlsx";

const normalizeCell = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();

const parseMoney = (value: unknown): number => {
  if (typeof value === "number") return Number(value);
  const text = String(value ?? "").replace(/\$/g, "").replace(/,/g, "").trim();
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
  const normalized = text.replace(/\./g, "/");
  const parts = normalized.split(/[/-]/).map((part) => part.trim());
  if (parts.length !== 3) return null;
  if (parts[0].length === 4) {
    return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
  }
  const [day, month, year] = parts;
  const yyyy = year.length === 2 ? `20${year}` : year;
  return `${yyyy}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

export type InversionistaImportRow = {
  nombre: string;
  inversion_inicial: number;
  total_excel: number;
  rendimientos: Array<{ fecha: string; monto: number }>;
};

export function parseInversionistasImportFile(buffer: ArrayBuffer): {
  rows: InversionistaImportRow[];
  errores: string[];
} {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

  let headerRow = -1;
  let nombreCol = -1;
  let inversionCol = -1;
  let totalCol = -1;
  const dateCols: Array<{ index: number; fecha: string }> = [];

  for (let r = 0; r < Math.min(raw.length, 20); r++) {
    const row = raw[r] ?? [];
    const normalized = row.map(normalizeCell);
    const maybeNombre = normalized.findIndex((cell) => cell === "EMPLEADO" || cell === "NOMBRE");
    const maybeInversion = normalized.findIndex((cell) => cell === "INVERSION" || cell === "INVERSIÓN");
    const maybeTotal = normalized.findIndex((cell) => cell === "TOTAL");
    const maybeDates = row
      .map((cell, index) => ({ index, fecha: parseExcelDate(cell) }))
      .filter((item): item is { index: number; fecha: string } => Boolean(item.fecha));

    if (maybeNombre >= 0 && maybeInversion >= 0 && maybeTotal >= 0 && maybeDates.length > 0) {
      headerRow = r;
      nombreCol = maybeNombre;
      inversionCol = maybeInversion;
      totalCol = maybeTotal;
      dateCols.push(...maybeDates);
      break;
    }
  }

  if (headerRow < 0) {
    return {
      rows: [],
      errores: ["No se encontró encabezado válido con columnas EMPLEADO, INVERSION, fechas y TOTAL."],
    };
  }

  const errores: string[] = [];
  const rows: InversionistaImportRow[] = [];

  for (let r = headerRow + 1; r < raw.length; r++) {
    const row = raw[r] ?? [];
    const nombre = String(row[nombreCol] ?? "").trim();
    if (!nombre || normalizeCell(nombre).startsWith("TOTAL")) continue;

    const inversionInicial = parseMoney(row[inversionCol]);
    const totalExcel = parseMoney(row[totalCol]);
    const rendimientos = dateCols
      .map(({ index, fecha }) => ({ fecha, monto: parseMoney(row[index]) }))
      .filter((item) => item.monto > 0);

    rows.push({
      nombre,
      inversion_inicial: inversionInicial,
      total_excel: totalExcel,
      rendimientos,
    });
  }

  if (rows.length === 0) {
    errores.push("No se encontraron filas válidas para importar.");
  }

  return { rows, errores };
}
