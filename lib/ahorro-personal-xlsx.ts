import * as XLSX from "xlsx";

export const MESES_AHORRO = ["ENE", "FEB", "MZO", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"] as const;

type FilaAhorro = { nombre: string; codigo: string; meses?: Record<string, number>; total_anio?: number; saldo?: number };

const normalizeHeader = (header: string) =>
  header
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const monthFromHeader = (header: string, anio: number): string | null => {
  const h = normalizeHeader(header);
  const yy = String(anio).slice(2);

  for (const mes of MESES_AHORRO) {
    const m = mes.toLowerCase();
    if (h === m || h.startsWith(`${m}/`) || h.startsWith(`${m}-`) || h.startsWith(`${m} ${yy}`)) {
      return mes;
    }
  }
  return null;
};

export function buildAhorroAnualSheet(
  anio: number,
  filas: FilaAhorro[],
  withData: boolean,
  tituloResumen: string
): XLSX.WorkSheet {
  const yy = String(anio).slice(2);
  const headers = ["Asesor", "ID", ...MESES_AHORRO.map((m) => `${m}/${yy}`), "TOTAL", "Saldo"];
  const rows: (string | number)[][] = [
    ["A G C"],
    ["SERVICIOS FINANCIEROS"],
    [],
    [tituloResumen],
    [],
    headers,
  ];

  for (const s of filas) {
    const meses = MESES_AHORRO.map((m) => {
      const v = s.meses?.[m];
      if (!withData || v === undefined || v === 0) return "";
      return v;
    });
    const total = withData
      ? (s.total_anio ?? MESES_AHORRO.reduce((acc, m) => acc + (s.meses?.[m] ?? 0), 0))
      : "";
    const saldo = withData && s.saldo !== undefined ? s.saldo : "";
    rows.push([s.nombre, s.codigo ?? "", ...meses, total, saldo]);
  }

  if (withData && filas.length > 0) {
    const totales = MESES_AHORRO.map((m) => filas.reduce((acc, s) => acc + (s.meses?.[m] ?? 0), 0));
    const totalGeneral = filas.reduce((acc, s) => acc + (s.total_anio ?? 0), 0);
    const totalSaldo = filas.reduce((acc, s) => acc + (s.saldo ?? 0), 0);
    rows.push(["TOTALES", "", ...totales, totalGeneral, totalSaldo]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [
    { wch: 32 },
    { wch: 14 },
    ...MESES_AHORRO.map(() => ({ wch: 10 })),
    { wch: 12 },
    { wch: 12 },
  ];
  return ws;
};

export function downloadAhorroWorkbook(
  anio: number,
  filas: FilaAhorro[],
  withData: boolean,
  filename: string,
  tituloResumen: string
) {
  const ws = buildAhorroAnualSheet(anio, filas, withData, tituloResumen);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Ahorro ${anio}`);
  XLSX.writeFile(wb, filename);
}

export function parseAhorroImportFile(buffer: ArrayBuffer, anio: number): { filas: Array<{ codigo: string; meses: Record<string, number> }>; errores: string[] } {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  let headerRowIdx = -1;
  let idCol = -1;
  const monthCols: Record<string, number> = {};

  for (let r = 0; r < raw.length; r++) {
    const row = raw[r] as unknown[];
    let foundId = idCol;
    const foundMonths: Record<string, number> = { ...monthCols };

    for (let c = 0; c < row.length; c++) {
      const cell = normalizeHeader(String(row[c] ?? ""));
      if (cell === "id" || cell === "id asesor") foundId = c;
      const mes = monthFromHeader(String(row[c] ?? ""), anio);
      if (mes) foundMonths[mes] = c;
    }

    if (foundId >= 0 && Object.keys(foundMonths).length > 0) {
      headerRowIdx = r;
      idCol = foundId;
      Object.assign(monthCols, foundMonths);
      break;
    }
  }

  const errores: string[] = [];
  if (headerRowIdx < 0 || idCol < 0) {
    return { filas: [], errores: ["No se encontró fila de encabezados con columnas ID y meses (ENE, FEB, …)."] };
  }

  const filas: Array<{ codigo: string; meses: Record<string, number> }> = [];

  for (let r = headerRowIdx + 1; r < raw.length; r++) {
    const row = raw[r] as unknown[];
    const codigo = String(row[idCol] ?? "").trim();
    if (!codigo || normalizeHeader(codigo) === "totales") continue;

    const meses: Record<string, number> = {};
    for (const [mes, col] of Object.entries(monthCols)) {
      const val = row[col as number];
      if (val === "" || val === null || val === undefined) continue;

      let monto: number;
      if (typeof val === "number") {
        monto = val;
      } else {
        const str = String(val).trim();
        if (str.includes("+")) {
          monto = str.split("+").reduce((acc, p) => acc + (parseFloat(p.trim()) || 0), 0);
        } else {
          monto = parseFloat(str);
        }
      }
      if (!Number.isNaN(monto) && monto !== 0) {
        meses[mes] = monto;
      }
    }

    if (Object.keys(meses).length > 0) {
      filas.push({ codigo, meses });
    }
  }

  if (filas.length === 0) {
    errores.push("No se encontraron filas con montos para importar.");
  }

  return { filas, errores };
}
