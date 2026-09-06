"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { fmtFecha } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Preview = {
  bloqueado: boolean;
  motivo_bloqueo?: string | null;
  huella: string;
  credito: {
    num_prog: number;
    tipo_credito?: string;
    beneficiario?: string | null;
    fecha_desembolso?: string | null;
    monto_otorgado?: number;
    monto_neto_desembolsado?: number;
    origen?: string;
  };
  impactos: Record<string, PreviewItem[]>;
  coincidencias_posibles: PreviewItem[];
};

type PreviewItem = {
  id: number;
  fecha?: string | null;
  tipo?: string | null;
  monto?: number | null;
  motivo?: string | null;
  nombre_archivo?: string | null;
};

const money = (value: unknown) => `$${Number(value ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const impactoLabels: Array<[string, string]> = [
  ["pagos", "Pagos"],
  ["ingresos_caja", "Ingresos de caja de esos pagos"],
  ["egresos_desembolso", "Egresos de desembolso"],
  ["movimientos_manuales", "Movimientos ligados explícitamente al folio"],
  ["ahorros_personal", "Movimientos de ahorro personal derivados"],
  ["documentos", "Documentos del crédito"],
  ["ciclos_historial", "Historial de ciclo"],
  ["indicadores_operativos", "Indicadores operativos"],
];

export function EliminarCreditoDialog({
  numProg,
  tipoCredito,
  onDeleted,
}: {
  numProg: number;
  tipoCredito?: string;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [folio, setFolio] = useState("");

  const cargarPreview = async () => {
    setLoading(true);
    setPreview(null);
    setFolio("");
    try {
      const response = await apiFetch(`/creditos/${numProg}/eliminacion-preview`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "No se pudo calcular el impacto de la eliminación.");
      setPreview(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo calcular el impacto de la eliminación.");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const cambiarApertura = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) cargarPreview();
  };

  const confirmar = async () => {
    if (!preview || preview.bloqueado || folio.trim() !== String(numProg)) return;

    setDeleting(true);
    try {
      const response = await apiFetch(`/creditos/${numProg}`, {
        method: "DELETE",
        body: JSON.stringify({ confirmacion_folio: folio.trim(), huella_preview: preview.huella }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "No fue posible eliminar el crédito.");

      toast.success(data.message || "Crédito eliminado y efectos revertidos.");
      setOpen(false);
      onDeleted();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible eliminar el crédito.");
      // A 409 can mean the payment/cash data changed while this modal was open.
      // Re-reading lets the administrator decide based on current impacts only.
      await cargarPreview();
    } finally {
      setDeleting(false);
    }
  };

  const canDelete = Boolean(preview && !preview.bloqueado && folio.trim() === String(numProg) && !deleting);

  return (
    <Dialog open={open} onOpenChange={cambiarApertura}>
      <Button variant="destructive" size="sm" className="h-9 gap-1.5 text-xs" onClick={() => cambiarApertura(true)}>
        <Trash2 className="h-4 w-4" /> Eliminar crédito
      </Button>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" showCloseButton={!deleting}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> Eliminar crédito y revertir efectos
          </DialogTitle>
          <DialogDescription>
            Esta acción es sólo para créditos capturados por error. Los movimientos sin vínculo explícito nunca se eliminan automáticamente.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Calculando impactos…
          </div>
        )}

        {preview && !loading && (
          <div className="grid gap-5 py-1">
            {preview.bloqueado ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                <p className="font-semibold">No se puede eliminar este crédito.</p>
                <p className="mt-1">{preview.motivo_bloqueo}</p>
              </div>
            ) : (
              <>
                <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                  <p className="font-semibold">Folio #{preview.credito.num_prog} · {preview.credito.tipo_credito || tipoCredito}</p>
                  <p className="text-muted-foreground">{preview.credito.beneficiario || preview.credito.origen} · Desembolso {fmtFecha(preview.credito.fecha_desembolso)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Otorgado: {money(preview.credito.monto_otorgado)} · Neto: {money(preview.credito.monto_neto_desembolsado)}</p>
                </div>

                <div className="grid gap-2">
                  <p className="text-sm font-semibold">Se eliminarán y revertirán</p>
                  <div className="rounded-lg border divide-y">
                    {impactoLabels.map(([key, label]) => {
                      const rows = preview.impactos[key] || [];
                      return (
                        <div key={key} className="px-3 py-2 text-sm">
                          <div className="flex items-center justify-between gap-3"><span>{label}</span><span className="font-semibold">{rows.length}</span></div>
                          {rows.slice(0, 3).map((row) => (
                            <p key={row.id} className="mt-1 truncate text-xs text-muted-foreground">
                              {row.fecha ? `${fmtFecha(row.fecha)} · ` : ""}{row.motivo || row.nombre_archivo || row.tipo || "Registro"}{row.monto !== undefined ? ` · ${money(row.monto)}` : ""}
                            </p>
                          ))}
                          {rows.length > 3 && <p className="mt-1 text-xs text-muted-foreground">y {rows.length - 3} más.</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                  <p className="font-semibold">Coincidencias posibles que permanecerán intactas: {preview.coincidencias_posibles.length}</p>
                  <p className="mt-1 text-xs">Son movimientos sin vínculo, con la misma fecha de desembolso y monto otorgado o neto. Son sólo una advertencia.</p>
                  {preview.coincidencias_posibles.slice(0, 3).map((row) => (
                    <p key={row.id} className="mt-1 text-xs">{fmtFecha(row.fecha)} · {row.motivo} · {money(row.monto)}</p>
                  ))}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="confirmar-eliminacion-folio">Para habilitar la eliminación, escribe el folio <strong>#{numProg}</strong></Label>
                  <Input id="confirmar-eliminacion-folio" value={folio} onChange={(event) => setFolio(event.target.value)} autoComplete="off" disabled={deleting} />
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>Cancelar</Button>
          {!preview?.bloqueado && <Button variant="destructive" onClick={confirmar} disabled={!canDelete || loading}>{deleting ? "Eliminando…" : "Eliminar crédito y revertir efectos"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
