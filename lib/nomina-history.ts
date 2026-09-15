import type { NominaPeriodData } from "./nomina-template";

type DatosEmpleado = {
  nombre?: string | null;
  nombre_asesor?: string | null;
  fecha_nacimiento?: string | null;
  cumpleanos?: string | null;
  rfc?: string | null;
  curp?: string | null;
  nss?: string | null;
  banco?: string | null;
  cuenta_bancaria?: string | null;
};

export type NominaGuardada = {
  id: number;
  fecha_inicio: string;
  fecha_fin: string;
  referencia?: string | null;
  firma_director_administrativo?: string | null;
  firma_director_operativo?: string | null;
  total_dispersado: number | string;
  detalles: {
    id: number;
    asesor_id?: number | null;
    empleado_id?: number | null;
    sueldo_bruto: number | string;
    pago_base?: number | string | null;
    despensa?: number | string | null;
    apoyo_transporte?: number | string | null;
    total_percepciones?: number | string | null;
    retencion_ahorro: number | string;
    sueldo_neto: number | string;
    detalle_ajustes?: { empleado?: DatosEmpleado } | null;
    asesor?: DatosEmpleado | null;
    empleado?: DatosEmpleado | null;
  }[];
};

export function datosNominaGuardada(periodo: NominaGuardada): NominaPeriodData {
  return {
    fecha_inicio: periodo.fecha_inicio.slice(0, 10),
    fecha_fin: periodo.fecha_fin.slice(0, 10),
    referencia: periodo.referencia ?? "",
    firma_director_administrativo: periodo.firma_director_administrativo ?? "",
    firma_director_operativo: periodo.firma_director_operativo ?? "",
    empleados: periodo.detalles.map((detalle) => {
      // Los periodos anteriores a la captura histórica usan el catálogo disponible.
      const empleado = detalle.detalle_ajustes?.empleado ?? detalle.asesor ?? detalle.empleado;
      return {
        empleado_id: String(detalle.asesor_id ?? detalle.empleado_id ?? detalle.id),
        nombre: empleado?.nombre ?? empleado?.nombre_asesor ?? "Empleado sin datos",
        fecha_nacimiento: (empleado?.fecha_nacimiento ?? empleado?.cumpleanos)?.slice(0, 10),
        rfc: empleado?.rfc ?? undefined,
        curp: empleado?.curp ?? undefined,
        nss: empleado?.nss ?? undefined,
        banco: empleado?.banco ?? undefined,
        cuenta_bancaria: empleado?.cuenta_bancaria ?? undefined,
        pago_base: Number(detalle.pago_base) || Number(detalle.sueldo_bruto),
        despensa: Number(detalle.despensa ?? 0),
        apoyo_transporte: Number(detalle.apoyo_transporte ?? 0),
        ahorro: Number(detalle.retencion_ahorro),
        bruto: Number(detalle.total_percepciones) || Number(detalle.sueldo_bruto),
        neto: Number(detalle.sueldo_neto),
      };
    }),
  };
}
