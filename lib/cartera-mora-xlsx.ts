import * as XLSX from "xlsx";

const normalizeCell = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();

const parseMoney = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
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

const findHeaderRow = (rows: unknown[][]): number => {
  for (let i = 0; i < Math.min(rows.length, 12); i++) {
    const headers = (rows[i] ?? []).map(normalizeCell);
    if (headers.includes("NUM. PROG") || headers.includes("NUM PROG")) {
      return i;
    }
  }
  return -1;
};

const buildColumnMap = (headerRow: unknown[]) => {
  const map = new Map<string, number>();

  headerRow.forEach((cell, index) => {
    const header = normalizeCell(cell);
    if (!header) return;

    if (header === "FECHA") map.set("fecha", index);
    else if (header === "CLIENTE") map.set("cliente", index);
    else if (header === "ID CLIENTE" || header === "ID" || header === "CODIGO CLIENTE") map.set("id_cliente", index);
    else if (header.startsWith("GRUPO")) map.set("grupo", index);
    else if (header === "CICLO") map.set("ciclo", index);
    else if (header === "DIAS DE PAGO") map.set("dias_pago", index);
    else if (header === "ASESOR") map.set("asesor", index);
    else if (header === "VALOR FICHA" || header === "VALOR") map.set("valor_ficha", index);
    else if (header === "PLAZOS") map.set("plazos", index);
    else if (header === "MONTO OTORGADO") map.set("monto_otorgado", index);
    else if (header === "INETERES" || header === "INTERES") map.set("interes", index);
    else if (header === "TOTAL" && !map.has("total")) map.set("total", index);
    else if (header === "SALDO TOTAL") map.set("saldo_total", index);
    else if (header === "SALDO INVERSION" || header === "SALDO INVERTIDO") map.set("saldo_inversion", index);
  });

  return map;
};

const getCell = (row: unknown[], map: Map<string, number>, key: string) => {
  const index = map.get(key);
  if (index === undefined) return "";
  return row[index] ?? "";
};

export type CarteraMoraImportRow = {
  tipo_credito: "Individual" | "Grupal";
  sheet_name: string;
  row_number: number;
  clasificacion_mora: "mora_activa" | "mora_muerta";
  fecha: string;
  cliente: string;
  id_cliente: string;
  grupo: string;
  ciclo: number;
  dias_pago: string;
  asesor: string;
  valor_ficha: number;
  plazos: number;
  monto_otorgado: number;
  interes: number;
  total: number;
  saldo_total: number;
  saldo_inversion: number;
};

export function parseCarteraMoraImportFile(buffer: ArrayBuffer): {
  rows: CarteraMoraImportRow[];
  errores: string[];
} {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const errores: string[] = [];
  const rows: CarteraMoraImportRow[] = [];

  for (const sheetName of workbook.SheetNames) {
    const normalizedSheet = normalizeCell(sheetName);
    if (!normalizedSheet.includes("MORA")) continue;

    const sheet = workbook.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
    const headerRow = findHeaderRow(raw);
    if (headerRow < 0) continue;

    const map = buildColumnMap(raw[headerRow] ?? []);
    const isGroupSheet = normalizedSheet.includes("GRUPAL") || map.has("grupo");
    const clasificacion = normalizedSheet.includes("MUERTA") ? "mora_muerta" : "mora_activa";

    for (let r = headerRow + 1; r < raw.length; r++) {
      const row = raw[r] ?? [];
      if (!row.some((cell) => String(cell ?? "").trim() !== "")) continue;

      const fecha = parseExcelDate(getCell(row, map, "fecha"));
      const cliente = String(getCell(row, map, "cliente") ?? "").trim();
      const grupo = String(getCell(row, map, "grupo") ?? "").trim();
      const idCliente = String(getCell(row, map, "id_cliente") ?? "").trim();

      if (!fecha) {
        errores.push(`Hoja ${sheetName}, fila ${r + 1}: fecha inválida.`);
        continue;
      }

      if (!isGroupSheet && !cliente) continue;
      if (isGroupSheet && (!cliente || !grupo)) continue;

      rows.push({
        tipo_credito: isGroupSheet ? "Grupal" : "Individual",
        sheet_name: sheetName,
        row_number: r + 1,
        clasificacion_mora: clasificacion,
        fecha,
        cliente,
        id_cliente: idCliente,
        grupo,
        ciclo: Math.trunc(parseMoney(getCell(row, map, "ciclo"))),
        dias_pago: String(getCell(row, map, "dias_pago") ?? "").trim(),
        asesor: String(getCell(row, map, "asesor") ?? "").trim(),
        valor_ficha: parseMoney(getCell(row, map, "valor_ficha")),
        plazos: Math.max(1, Math.trunc(parseMoney(getCell(row, map, "plazos"))) || 16),
        monto_otorgado: parseMoney(getCell(row, map, "monto_otorgado")),
        interes: parseMoney(getCell(row, map, "interes")),
        total: parseMoney(getCell(row, map, "total")),
        saldo_total: parseMoney(getCell(row, map, "saldo_total")),
        saldo_inversion: parseMoney(getCell(row, map, "saldo_inversion")),
      });
    }
  }

  if (rows.length === 0) {
    errores.push("No se encontraron filas válidas en el Excel de mora.");
  }

  return { rows, errores };
}
