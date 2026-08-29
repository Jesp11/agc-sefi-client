import { apiFetch } from "@/lib/api";

export async function fetchAllPages(endpoint: string, perPage = 100): Promise<any[]> {
  const separator = endpoint.includes("?") ? "&" : "?";
  let page = 1;
  let all: any[] = [];
  let lastPage = 1;

  do {
    const res = await apiFetch(`${endpoint}${separator}per_page=${perPage}&page=${page}`);
    const data = await res.json();
    if (!res.ok) break;

    const rows = Array.isArray(data) ? data : (data.data ?? []);
    all = all.concat(rows);
    lastPage = data.meta?.last_page ?? data.last_page ?? 1;
    page += 1;
  } while (page <= lastPage);

  return all;
}

/** Cartera activa: excluye EnMora, cerrados y finalizados. */
export function onlyCarteraActiva<T extends { estado?: string }>(creditos: T[]): T[] {
  return creditos.filter((c) => c.estado === "Activo");
}

export function creditoTotal(c: { total?: unknown; monto_otorgado?: unknown; interes?: unknown }): number {
  const total = Number(c.total);
  if (Number.isFinite(total) && total > 0) return total;
  return Number(c.monto_otorgado || 0) + Number(c.interes || 0);
}

export type AmortizacionPago = {
  pago_numero: number;
  fecha_sugerida: string;
  monto_pago: number;
  saldo_restante: number;
};

export type EstadoCuota = "Pagado" | "Pendiente";

/** Aplica abonos en orden de cuotas: cubiertas = Pagado, el resto = Pendiente. */
export function marcarEstadoCuotas<T extends { pago?: unknown; monto_pago?: unknown }>(
  cuotas: T[],
  totalAbonado: number,
): (T & { estado_pago: EstadoCuota })[] {
  let restante = Math.max(0, Number(totalAbonado) || 0);
  return cuotas.map((cuota) => {
    const monto = Number(cuota.pago ?? cuota.monto_pago ?? 0);
    let estado_pago: EstadoCuota = "Pendiente";
    if (monto > 0 && restante >= monto - 0.01) {
      estado_pago = "Pagado";
      restante = Math.max(0, restante - monto);
    } else {
      restante = 0;
    }
    return { ...cuota, estado_pago };
  });
}

export function totalAbonadoFromPagos(
  pagos: { monto?: unknown; tipo?: string }[],
): number {
  return pagos
    .filter((p) => !p.tipo || p.tipo === "Abono")
    .reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
}

/** Normaliza tabla_amortizacion (objeto, array grupal o JSON string) al arreglo de pagos. */
export function parseTablaAmortizacionCalendario(tabla: unknown): AmortizacionPago[] {
  if (tabla == null) return [];

  let raw: unknown = tabla;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  if (Array.isArray(raw)) {
    const first = raw[0];
    if (first && typeof first === "object" && "calendario" in first) {
      const calendario = (first as { calendario?: unknown }).calendario;
      return Array.isArray(calendario) ? calendario : [];
    }
    if (first && typeof first === "object" && "pago_numero" in first) {
      return raw as AmortizacionPago[];
    }
    return [];
  }

  if (typeof raw === "object" && raw !== null && "calendario" in raw) {
    const calendario = (raw as { calendario?: unknown }).calendario;
    return Array.isArray(calendario) ? calendario : [];
  }

  return [];
}

export const creditoSearchFields = (c: any) => [
  c.num_prog,
  c.cliente?.nombre_completo,
  c.cliente?.id_cliente,
  c.grupo?.nombre_grupo,
  c.asesor?.nombre_asesor,
  c.tipo_credito,
  c.dias_pago,
];

export const grupoSearchFields = (g: any) => [
  g.id_grupo,
  g.id,
  g.nombre_grupo,
  g.asesor?.nombre_asesor,
];

export const clienteSearchFields = (c: any) => [
  c.id_cliente,
  c.id,
  c.nombre_completo,
  c.asesor?.nombre_asesor,
  c.grupos?.[0]?.nombre_grupo,
];

export const asesorSearchFields = (a: any) => [
  a.id_asesor,
  a.id,
  a.nombre_asesor,
  a.rol_laboral,
  a.telefono,
  a.curp,
  a.user?.email,
];

export const avalSearchFields = (a: any) => [
  a.id,
  a.cliente?.nombre_completo,
  a.cliente?.id_cliente,
  a.nombre,
  a.rfc,
];

export const referenciaSearchFields = (r: any) => [
  r.id,
  r.cliente?.nombre_completo,
  r.cliente?.id_cliente,
  r.nombre,
  r.parentesco,
  r.telefono,
  r.tipo_referencia,
];

export const gastoSearchFields = (g: any) => [
  g.concepto,
  g.categoria,
  g.cuenta,
  g.monto,
  g.fecha,
];

export const nominaSearchFields = (p: any) => [
  p.fecha_inicio,
  p.fecha_fin,
  p.total_dispersado,
];

export const inversionistaSearchFields = (i: any) => [
  i.nombre,
  i.tipo_entidad,
  i.origen_fondeo,
  i.contacto,
  i.telefono,
  i.email,
];

export const movimientoSearchFields = (m: any) => [
  m.fecha,
  m.tipo,
  m.descripcion,
  m.monto,
];

export const movimientoCajaSearchFields = (m: any) => [
  m.fecha,
  m.motivo,
  m.tipo,
  m.monto,
  m.categoria,
  m.cuenta,
  m.saldo_resultante,
  m.asesor?.nombre_asesor,
];

export const empleadoAhorroSearchFields = (a: any) => [
  a.empleado?.nombre,
  a.saldo,
];

export const asesorAhorroSearchFields = (a: any) => [
  a.nombre,
  a.codigo,
  a.saldo,
];

export const socioSearchFields = (s: any) => [
  s.nombre,
  s.codigo,
  s.saldo,
];

export const historialMovSearchFields = (m: any) => [
  m.fecha,
  m.socioNombre,
  m.personaNombre,
  m.codigo,
  m.tipo,
  m.notas,
  m.monto,
  m.saldoResultante,
];
