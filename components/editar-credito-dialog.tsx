"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { apiFetch } from "@/lib/api";
import { fetchAllPages } from "@/lib/table-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil, Save } from "lucide-react";
import { toast } from "sonner";

interface EditarCreditoDialogProps {
  credito: CreditoEditable;
  onSuccess: () => void;
}

type CreditoEditable = Record<string, unknown> & {
  num_prog: number | string;
  tipo_credito?: string | null;
  id_cliente?: string | null;
  id_grupo?: number | string | null;
  estado?: string | null;
  tabla_amortizacion?: unknown;
};

type ClienteCatalogo = { id_cliente: string; nombre_completo: string };
type GrupoCatalogo = { id: number; nombre_grupo: string };

const dateValue = (value: unknown) => value ? String(value).slice(0, 10) : "";
const stringValue = (value: unknown) => value == null ? "" : String(value);

function amortizacionText(value: unknown): string {
  if (value == null || value === "") return "";

  let parsed = value;
  for (let depth = 0; typeof parsed === "string" && depth < 3; depth += 1) {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      // Conserva el contenido original para que el administrador pueda corregirlo.
      return String(parsed);
    }
  }

  return JSON.stringify(parsed, null, 2);
}

function buildForm(credito: CreditoEditable) {
  return {
    tipo_credito: credito.tipo_credito === "Grupal" ? "Grupal" : "Individual",
    id_cliente: stringValue(credito.id_cliente),
    id_grupo: stringValue(credito.id_grupo),
    fecha_otorgacion: dateValue(credito.fecha_otorgacion),
    fecha_primer_pago: dateValue(credito.fecha_primer_pago),
    ciclo: stringValue(credito.ciclo),
    ciclo_inicio_mora: stringValue(credito.ciclo_inicio_mora),
    monto_otorgado: stringValue(credito.monto_otorgado),
    interes: stringValue(credito.interes),
    total: stringValue(credito.total),
    saldo_pendiente: stringValue(credito.saldo_pendiente),
    abonos_historicos: stringValue(credito.abonos_historicos),
    plazos: stringValue(credito.plazos),
    valor_ficha: stringValue(credito.valor_ficha),
    dias_pago: stringValue(credito.dias_pago),
    comision_apertura: stringValue(credito.comision_apertura),
    tasa_asignada: stringValue(credito.tasa_asignada),
    porcentaje_interes: stringValue(credito.porcentaje_interes),
    abono_recuperacion: stringValue(credito.abono_recuperacion),
    estado: credito.estado || "Activo",
    es_personalizado: Boolean(credito.es_personalizado),
    es_adicional: Boolean(credito.es_adicional),
    ubicacion_expediente: stringValue(credito.ubicacion_expediente),
    notas_expediente: stringValue(credito.notas_expediente),
    // La renovación se agenda desde su flujo específico; no debe precargarse
    // al abrir la edición general de un préstamo.
    fecha_programada_renovacion: "",
    renovacion_autorizada: "",
    renovacion_tasa: "",
    tabla_amortizacion: amortizacionText(credito.tabla_amortizacion),
  };
}

export function EditarCreditoDialog({ credito, onSuccess }: EditarCreditoDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [clientes, setClientes] = useState<ClienteCatalogo[]>([]);
  const [grupos, setGrupos] = useState<GrupoCatalogo[]>([]);
  const [form, setForm] = useState(() => buildForm(credito));
  const [tablaInicial, setTablaInicial] = useState(() => amortizacionText(credito.tabla_amortizacion));

  useEffect(() => {
    if (!open) return;
    if (clientes.length || grupos.length) return;

    queueMicrotask(() => setLoadingCatalogs(true));
    Promise.all([fetchAllPages("/clientes"), fetchAllPages("/grupos")])
      .then(([clientesData, gruposData]) => {
        setClientes(clientesData as ClienteCatalogo[]);
        setGrupos(gruposData as GrupoCatalogo[]);
      })
      .catch(() => toast.error("No se pudieron cargar clientes y grupos"))
      .finally(() => setLoadingCatalogs(false));
  }, [open, credito, clientes.length, grupos.length]);

  const setField = (field: string, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const nullableNumber = (value: string) => value.trim() === "" ? null : Number(value);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.tipo_credito === "Individual" && !form.id_cliente) {
      toast.error("Selecciona el cliente titular del crédito");
      return;
    }
    if (form.tipo_credito === "Grupal" && !form.id_grupo) {
      toast.error("Selecciona el grupo titular del crédito");
      return;
    }

    let tablaAmortizacion: unknown;
    const tablaFueModificada = form.tabla_amortizacion.trim() !== tablaInicial.trim();
    if (tablaFueModificada && form.tabla_amortizacion.trim()) {
      try {
        tablaAmortizacion = JSON.parse(form.tabla_amortizacion);
        for (let depth = 0; typeof tablaAmortizacion === "string" && depth < 3; depth += 1) {
          tablaAmortizacion = JSON.parse(tablaAmortizacion);
        }
        if (typeof tablaAmortizacion !== "object" || tablaAmortizacion === null) throw new Error();
      } catch {
        toast.error("La tabla de amortización debe ser un arreglo JSON válido");
        return;
      }
    }

    const tieneDatosRenovacion = Boolean(
      form.fecha_programada_renovacion || form.renovacion_autorizada || form.renovacion_tasa,
    );

    setSaving(true);
    try {
      const payload = {
        id_cliente: form.tipo_credito === "Individual" ? form.id_cliente : null,
        id_grupo: form.tipo_credito === "Grupal" ? Number(form.id_grupo) : null,
        fecha_otorgacion: form.fecha_otorgacion,
        fecha_primer_pago: form.fecha_primer_pago || null,
        ciclo: Number(form.ciclo),
        ciclo_inicio_mora: nullableNumber(form.ciclo_inicio_mora),
        monto_otorgado: Number(form.monto_otorgado),
        interes: Number(form.interes),
        total: Number(form.total),
        saldo_pendiente: nullableNumber(form.saldo_pendiente),
        // Compatibilidad durante el despliegue: producción puede no haber aplicado
        // todavía la migración del campo. Un valor vacío no debe enviarse.
        ...(form.abonos_historicos.trim() !== "" ? { abonos_historicos: nullableNumber(form.abonos_historicos) } : {}),
        plazos: Number(form.plazos),
        valor_ficha: Number(form.valor_ficha),
        dias_pago: form.dias_pago,
        comision_apertura: nullableNumber(form.comision_apertura),
        tasa_asignada: form.tasa_asignada || null,
        porcentaje_interes: nullableNumber(form.porcentaje_interes),
        ...(tablaFueModificada ? { tabla_amortizacion: form.tabla_amortizacion.trim() ? tablaAmortizacion : null } : {}),
        abono_recuperacion: nullableNumber(form.abono_recuperacion),
        estado: form.estado,
        es_personalizado: form.es_personalizado,
        es_adicional: form.es_adicional,
        ubicacion_expediente: form.ubicacion_expediente || null,
        notas_expediente: form.notas_expediente || null,
        ...(tieneDatosRenovacion ? {
          fecha_programada_renovacion: form.fecha_programada_renovacion || null,
          renovacion_autorizada: form.renovacion_autorizada || null,
          renovacion_tasa: form.renovacion_tasa || null,
        } : {}),
      };
      const response = await apiFetch(`/creditos/${credito.num_prog}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errors = data.errors ? Object.values(data.errors).flat().join(" ") : null;
        toast.error(errors || data.message || "No se pudo actualizar el crédito");
        return;
      }
      toast.success(data.message || "Crédito actualizado exitosamente");
      setOpen(false);
      onSuccess();
    } catch {
      toast.error("Error de conexión al actualizar el crédito");
    } finally {
      setSaving(false);
    }
  };

  const selectClass = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="h-9 gap-1.5 font-semibold text-xs" onClick={() => { const nextForm = buildForm(credito); setForm(nextForm); setTablaInicial(nextForm.tabla_amortizacion); }}><Pencil className="h-3.5 w-3.5" />Editar crédito</Button>} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Editar crédito #{credito.num_prog}</DialogTitle>
          <DialogDescription>Los cambios afectan la información contractual, financiera y de seguimiento del crédito.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Titular y condiciones</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="grid gap-1.5"><Label>Tipo de crédito</Label><select className={selectClass} value={form.tipo_credito} onChange={(e) => setField("tipo_credito", e.target.value)}><option value="Individual">Individual</option><option value="Grupal">Grupal</option></select></div>
              {form.tipo_credito === "Individual" ? <div className="grid gap-1.5 sm:col-span-2"><Label>Cliente titular</Label><select className={selectClass} value={form.id_cliente} disabled={loadingCatalogs} onChange={(e) => setField("id_cliente", e.target.value)}><option value="">Selecciona un cliente</option>{clientes.map((cliente) => <option key={cliente.id_cliente} value={cliente.id_cliente}>{cliente.nombre_completo} · {cliente.id_cliente}</option>)}</select></div> : <div className="grid gap-1.5 sm:col-span-2"><Label>Grupo titular</Label><select className={selectClass} value={form.id_grupo} disabled={loadingCatalogs} onChange={(e) => setField("id_grupo", e.target.value)}><option value="">Selecciona un grupo</option>{grupos.map((grupo) => <option key={grupo.id} value={grupo.id}>{grupo.nombre_grupo}</option>)}</select></div>}
              <Field label="Fecha de desembolso" type="date" value={form.fecha_otorgacion} onChange={(v) => setField("fecha_otorgacion", v)} required />
              <Field label="Primer pago" type="date" value={form.fecha_primer_pago} onChange={(v) => setField("fecha_primer_pago", v)} />
              <Field label="Día de pago" value={form.dias_pago} onChange={(v) => setField("dias_pago", v)} required />
              <Field label="Ciclo" type="number" min="0" value={form.ciclo} onChange={(v) => setField("ciclo", v)} required />
              <Field label="Plazos" type="number" min="1" value={form.plazos} onChange={(v) => setField("plazos", v)} required />
              <div className="grid gap-1.5"><Label>Estado</Label><select className={selectClass} value={form.estado} onChange={(e) => setField("estado", e.target.value)}>{["Activo", "EnMora", "Finalizado", "Cancelado", "CerradoSinRenovacion"].map((estado) => <option key={estado}>{estado}</option>)}</select></div>
            </div>
          </section>

          <section className="space-y-3 border-t pt-5">
            <h3 className="text-sm font-semibold">Importes y tasa</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Monto otorgado" type="number" min="0" step="0.01" value={form.monto_otorgado} onChange={(v) => setField("monto_otorgado", v)} required />
              <Field label="Interés" type="number" min="0" step="0.01" value={form.interes} onChange={(v) => setField("interes", v)} required />
              <Field label="Total contrato" type="number" min="0" step="0.01" value={form.total} onChange={(v) => setField("total", v)} required />
              <Field label="Saldo pendiente" type="number" min="0" step="0.01" value={form.saldo_pendiente} onChange={(v) => setField("saldo_pendiente", v)} />
              <Field label="Abonos históricos sin movimiento" type="number" min="0" step="0.01" value={form.abonos_historicos} onChange={(v) => setField("abonos_historicos", v)} />
              <Field label="Pago semanal" type="number" min="0" step="0.01" value={form.valor_ficha} onChange={(v) => setField("valor_ficha", v)} required />
              <Field label="Comisión apertura" type="number" min="0" step="0.01" value={form.comision_apertura} onChange={(v) => setField("comision_apertura", v)} />
              <Field label="Tasa asignada" value={form.tasa_asignada} onChange={(v) => setField("tasa_asignada", v)} />
              <Field label="Porcentaje interés" type="number" min="0" step="0.01" value={form.porcentaje_interes} onChange={(v) => setField("porcentaje_interes", v)} />
            </div>
          </section>

          <section className="space-y-3 border-t pt-5">
            <h3 className="text-sm font-semibold">Mora, renovación y expediente</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Ciclo inicio mora" type="number" min="1" value={form.ciclo_inicio_mora} onChange={(v) => setField("ciclo_inicio_mora", v)} />
              <Field label="Abono recuperación" type="number" min="0" step="0.01" value={form.abono_recuperacion} onChange={(v) => setField("abono_recuperacion", v)} />
              <Field label="Ubicación expediente" value={form.ubicacion_expediente} onChange={(v) => setField("ubicacion_expediente", v)} />
              <Field label="Fecha programada renovación" type="date" value={form.fecha_programada_renovacion} onChange={(v) => setField("fecha_programada_renovacion", v)} />
              <Field label="Autorización renovación" value={form.renovacion_autorizada} onChange={(v) => setField("renovacion_autorizada", v)} />
              <Field label="Tasa renovación" value={form.renovacion_tasa} onChange={(v) => setField("renovacion_tasa", v)} />
            </div>
            <div className="grid gap-1.5"><Label>Notas de expediente</Label><textarea className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50" value={form.notas_expediente} onChange={(e) => setField("notas_expediente", e.target.value)} /></div>
            <div className="grid gap-1.5"><Label>Tabla de amortización (JSON)</Label><textarea className="min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50" value={form.tabla_amortizacion} onChange={(e) => setField("tabla_amortizacion", e.target.value)} placeholder="[]" /></div>
            <div className="flex flex-wrap gap-5 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={form.es_personalizado} onChange={(e) => setField("es_personalizado", e.target.checked)} /> Crédito personalizado</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.es_adicional} onChange={(e) => setField("es_adicional", e.target.checked)} /> Crédito adicional</label></div>
          </section>

          <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button><Button type="submit" disabled={saving || loadingCatalogs}>{saving ? "Guardando..." : <><Save className="mr-2 h-4 w-4" />Guardar cambios</>}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, onChange, ...inputProps }: { label: string; value: string; onChange: (value: string) => void } & Omit<ComponentProps<typeof Input>, "value" | "onChange">) {
  return <div className="grid gap-1.5"><Label>{label}</Label><Input className="h-9" value={value} onChange={(event) => onChange(event.target.value)} {...inputProps} /></div>;
}
