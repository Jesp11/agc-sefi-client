import * as XLSX from "xlsx";

export const routePaymentColumns = [
  "folio",
  "cliente_grupo",
  "gestor",
  "categoria",
  "cuota",
  "fecha_cuota",
  "importe_esperado",
  "fecha_pago",
  "referencia_ruta",
  "pago_realizado",
  "metodo_pago",
  "notas",
] as const;

const labels: Record<(typeof routePaymentColumns)[number], string> = {
  folio: "Folio",
  cliente_grupo: "Cliente / Grupo",
  gestor: "Gestor",
  categoria: "Categoría",
  cuota: "Cuota",
  fecha_cuota: "Fecha de cuota",
  importe_esperado: "Importe esperado",
  fecha_pago: "Fecha de pago",
  referencia_ruta: "Referencia de ruta",
  pago_realizado: "Pago realizado",
  metodo_pago: "Método de pago",
  notas: "Notas",
};

export type RoutePaymentImportRow = Record<string, string | number | null> & { row_number: number };
export type RouteCobro = {
  num_prog?: number | string;
  monto_a_cobrar?: number | string;
  categoria?: string;
  cliente?: { nombre_completo?: string };
  grupo?: { nombre_grupo?: string };
  asesor?: { nombre_asesor?: string };
  pendientes?: Array<{ semana?: number | string; fecha?: string; monto?: number | string }>;
};
export type RoutePayment = {
  num_prog?: number | string;
  monto?: number | string;
  tipo?: string;
};

const toYmd = (value: unknown): string | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    return parsed ? `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}` : null;
  }
  const text = String(value ?? "").trim();
  if (!text) return null;
  const iso = text.match(/^(\d{4})[-/]?(\d{2})[-/]?(\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const parts = text.replace(/[.]/g, "/").replace(/-/g, "/").split("/");
  if (parts.length === 3) {
    const [day, month, year] = parts.map((part) => part.trim());
    return `${year.length === 2 ? `20${year}` : year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return text;
};

const canonicalHeader = (value: unknown): string | null => {
  const key = String(value ?? "")
    .replace(/^\uFEFF/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  const aliases: Record<string, string> = {
    numero_cuota: "cuota",
    numero_de_cuota: "cuota",
    fecha_de_cuota: "fecha_cuota",
    fecha_de_pago: "fecha_pago",
    referencia_de_ruta: "referencia_ruta",
    metodo_de_pago: "metodo_pago",
  };
  const normalized = aliases[key] ?? key;
  return routePaymentColumns.includes(normalized as (typeof routePaymentColumns)[number]) ? normalized : null;
};

export function routePaymentReference(folio: number | string, cuota: number | string, fechaCuota: string): string {
  return `RUTA-${Number(folio)}-${Number(cuota)}-${fechaCuota.replaceAll("-", "")}`;
}

export function downloadRoutePaymentTemplate(fecha: string, cobros: RouteCobro[], pagos: RoutePayment[] = []) {
  const pagadoPorFolio = new Map<number, number>();
  pagos
    .filter((pago) => pago?.tipo === "Abono" && Number(pago?.num_prog) > 0)
    .forEach((pago) => {
      const folio = Number(pago.num_prog);
      pagadoPorFolio.set(folio, (pagadoPorFolio.get(folio) ?? 0) + Number(pago.monto ?? 0));
  });
  const records = cobros.flatMap((cobro) => {
    // Los atrasos se administran desde su reporte específico. Esta plantilla
    // debe cuadrar exclusivamente con la meta de la ruta ordinaria del día.
    if (cobro?.categoria !== "del_dia") return [];
    const pendiente = cobro?.pendientes?.[0];
    if (!pendiente?.semana || !pendiente?.fecha || !cobro?.num_prog) return [];
    const nombre = cobro?.cliente?.nombre_completo || cobro?.grupo?.nombre_grupo || "";
    const amount = Number(pendiente.monto ?? cobro.monto_a_cobrar ?? 0);
    const yaCubierto = (pagadoPorFolio.get(Number(cobro.num_prog)) ?? 0) >= amount - 0.01;
    // La ruta del reporte conserva los cobros del día para mostrar el resultado
    // de cobranza; la plantilla, en cambio, solo debe contener lo pendiente.
    if (yaCubierto) return [];
    return [{
      folio: Number(cobro.num_prog),
      cliente_grupo: nombre,
      gestor: cobro?.asesor?.nombre_asesor || "",
      categoria: "Del día",
      cuota: Number(pendiente.semana),
      fecha_cuota: pendiente.fecha,
      importe_esperado: amount,
      fecha_pago: fecha,
      referencia_ruta: routePaymentReference(cobro.num_prog, pendiente.semana, pendiente.fecha),
      pago_realizado: "NO",
      metodo_pago: "Efectivo",
      notas: "",
    }];
  });
  const sheet = XLSX.utils.aoa_to_sheet([
    routePaymentColumns.map((column) => labels[column]),
    ...records.map((record) => routePaymentColumns.map((column) => record[column] ?? "")),
  ]);
  sheet["!cols"] = [
    { wch: 12 }, { wch: 30 }, { wch: 24 }, { wch: 14 }, { wch: 10 }, { wch: 16 },
    { wch: 18 }, { wch: 16 }, { wch: 26 }, { wch: 16 }, { wch: 18 }, { wch: 42 },
  ];
  for (let row = 2; row <= records.length + 1; row++) {
    for (const column of ["F", "H"]) {
      const cell = sheet[`${column}${row}`];
      if (cell) cell.z = "yyyy-mm-dd";
    }
    const amount = sheet[`G${row}`];
    if (amount) amount.z = '$#,##0.00';
  }
  sheet["!freeze"] = { xSplit: 0, ySplit: 1 };
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Pagos de ruta");
  XLSX.writeFile(book, `plantilla-pagos-ruta-${fecha}.xlsx`);
}

export function parseRoutePaymentFile(buffer: ArrayBuffer): { columns: string[]; rows: RoutePaymentImportRow[] } {
  const book = XLSX.read(buffer, { type: "array", cellDates: true });
  const firstSheet = book.Sheets[book.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, defval: "", raw: true });
  const headers = (matrix[0] ?? []).map(canonicalHeader);
  const columns = headers.filter((header): header is string => Boolean(header));
  const rows = matrix.slice(1)
    .map((source, index) => ({ source, rowNumber: index + 2 }))
    .filter(({ source }) => source.some((value) => String(value ?? "").trim() !== ""))
    .map(({ source, rowNumber }) => {
      const row: RoutePaymentImportRow = { row_number: rowNumber };
      headers.forEach((header, index) => {
        if (!header) return;
        const value = source[index] as string | number | null;
        row[header] = header === "fecha_cuota" || header === "fecha_pago" ? toYmd(value) : value;
      });
      return row;
    });
  return { columns, rows };
}
