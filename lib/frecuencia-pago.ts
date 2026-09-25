export type FrecuenciaPago = "Semanal" | "Quincenal";

export const FRECUENCIAS_PAGO: FrecuenciaPago[] = ["Semanal", "Quincenal"];

export const DIA_QUINCENA_1_DEFAULT = 15;
export const DIA_QUINCENA_2_DEFAULT = 30;

/** Campos del crédito que definen su calendario de pagos. */
export interface ConfigCalendarioPago {
  frecuencia_pago?: string | null;
  dia_quincena_1?: number | string | null;
  dia_quincena_2?: number | string | null;
}

/** Nombre del periodo en plural para mostrar plazos: "semanas" o "quincenas". */
export const nombrePeriodos = (frecuencia?: string | null): string =>
  frecuencia === "Quincenal" ? "quincenas" : "semanas";

/** Etiqueta del pago periódico: "semanal" o "quincenal". */
export const adjetivoPago = (frecuencia?: string | null): string =>
  frecuencia === "Quincenal" ? "quincenal" : "semanal";

const parseFecha = (iso: string): Date | null => {
  const [y, m, d] = String(iso || "").split("T")[0].split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
};

const formatFecha = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const diasQuincena = (config: ConfigCalendarioPago): [number, number] => {
  const dia1 = Number(config.dia_quincena_1) || DIA_QUINCENA_1_DEFAULT;
  const dia2 = Number(config.dia_quincena_2) || DIA_QUINCENA_2_DEFAULT;
  return [Math.min(dia1, dia2), Math.max(dia1, dia2)];
};

/** Día del mes ajustado al último día cuando no existe (30 en febrero). */
const fechaEnMes = (anio: number, mes: number, dia: number): Date =>
  new Date(anio, mes, Math.min(dia, new Date(anio, mes + 1, 0).getDate()));

/**
 * Fechas (YYYY-MM-DD) de los primeros `plazos` pagos a partir del primer pago.
 * Debe coincidir con MoraCalculationService::generateSchedule en la API.
 */
export function generarFechasPago(
  fechaPrimerPago: string | null | undefined,
  plazos: number,
  config: ConfigCalendarioPago = {}
): string[] {
  const inicio = parseFecha(fechaPrimerPago || "");
  if (!inicio || !plazos || plazos < 1) return [];

  if (config.frecuencia_pago !== "Quincenal") {
    return Array.from({ length: plazos }, (_, i) =>
      formatFecha(new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i * 7))
    );
  }

  const dias = diasQuincena(config);
  const fechas: string[] = [];
  let anio = inicio.getFullYear();
  let mes = inicio.getMonth();
  while (fechas.length < plazos) {
    for (const dia of dias) {
      const fecha = fechaEnMes(anio, mes, dia);
      const iso = formatFecha(fecha);
      // En febrero dos días pueden ajustarse a la misma fecha.
      if (fecha < inicio || fechas[fechas.length - 1] === iso) continue;
      fechas.push(iso);
      if (fechas.length === plazos) break;
    }
    mes += 1;
    if (mes > 11) { mes = 0; anio += 1; }
  }
  return fechas;
}

/** Fecha del último pago del calendario, o "" si no se puede calcular. */
export const calcularFechaUltimoPago = (
  fechaPrimerPago: string | null | undefined,
  plazos: number,
  config: ConfigCalendarioPago = {}
): string => {
  const fechas = generarFechasPago(fechaPrimerPago, plazos, config);
  return fechas[fechas.length - 1] ?? "";
};

/** ¿La fecha cae en uno de los días de pago quincenal? */
export function esDiaQuincena(fecha: string, config: ConfigCalendarioPago): boolean {
  const date = parseFecha(fecha);
  if (!date) return false;
  return diasQuincena(config).some(
    (dia) => fechaEnMes(date.getFullYear(), date.getMonth(), dia).getDate() === date.getDate()
  );
}

/** Primer día de pago quincenal posterior a `fecha` (p. ej. al desembolso). */
export function siguienteDiaQuincena(fecha: string, config: ConfigCalendarioPago): string {
  const date = parseFecha(fecha);
  if (!date) return "";
  const manana = formatFecha(new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1));
  return generarFechasPago(manana, 1, { ...config, frecuencia_pago: "Quincenal" })[0] ?? "";
}

/** Número de pagos entre el primero y el último (inclusive). */
export function contarPagos(
  fechaPrimerPago: string,
  fechaUltimoPago: string,
  config: ConfigCalendarioPago = {}
): number {
  if (!fechaPrimerPago || !fechaUltimoPago || fechaUltimoPago < fechaPrimerPago) return 0;
  if (config.frecuencia_pago !== "Quincenal") {
    const inicio = parseFecha(fechaPrimerPago)!;
    const fin = parseFecha(fechaUltimoPago)!;
    return Math.round((fin.getTime() - inicio.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  }
  // Suficiente para cualquier plazo razonable (2 pagos por mes).
  return generarFechasPago(fechaPrimerPago, 240, config).filter((f) => f <= fechaUltimoPago).length;
}
