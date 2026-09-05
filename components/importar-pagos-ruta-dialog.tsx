"use client";

import { useRef, useState } from "react";
import { Download, LoaderCircle, Upload } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { downloadRoutePaymentTemplate, parseRoutePaymentFile, type RouteCobro, type RoutePayment, type RoutePaymentImportRow } from "@/lib/pagos-ruta-xlsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type PreviewRow = {
  row_number: number;
  valid: boolean;
  errors: string[];
  warnings: string[];
  action: "create" | "skip" | "ignore";
  data: RoutePaymentImportRow;
  credito?: { cliente?: string; estado?: string } | null;
};
type Preview = {
  rows: PreviewRow[];
  missing_columns: string[];
  summary: { total: number; selected: number; valid: number; invalid: number; created: number; omitted: number; warnings: number };
};

const money = (value: unknown) => `$${Number(value || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

export function ImportarPagosRutaDialog({
  open,
  onOpenChange,
  fecha,
  cobros,
  pagos,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fecha: string;
  cobros: RouteCobro[];
  pagos: RoutePayment[];
  onImported: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [payload, setPayload] = useState<{ columns: string[]; rows: RoutePaymentImportRow[] } | null>(null);

  const reset = () => {
    setPreview(null);
    setPayload(null);
    if (inputRef.current) inputRef.current.value = "";
  };
  const close = () => { onOpenChange(false); reset(); };

  const readFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setReading(true);
    setPreview(null);
    try {
      const nextPayload = parseRoutePaymentFile(await file.arrayBuffer());
      if (nextPayload.rows.length === 0) throw new Error("El archivo no contiene filas para importar.");
      setPayload(nextPayload);
      const res = await apiFetch("/reportes/diario/pagos-ruta/preview", {
        method: "POST",
        body: JSON.stringify({ fecha, ...nextPayload }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "No se pudo validar el archivo.");
      setPreview(body);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo leer el archivo de Excel.");
    } finally {
      setReading(false);
    }
  };

  const confirm = async () => {
    if (!preview || !payload || preview.summary.invalid > 0) return;
    setConfirming(true);
    try {
      const res = await apiFetch("/reportes/diario/pagos-ruta/confirm", {
        method: "POST",
        body: JSON.stringify({ fecha, ...payload }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (body.rows && body.summary) setPreview(body);
        throw new Error(body.message || "No se pudo confirmar la importación.");
      }
      toast.success(body.message || "Pagos de ruta importados.");
      close();
      onImported();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo confirmar la importación.");
    } finally {
      setConfirming(false);
    }
  };

  return <Dialog open={open} onOpenChange={(next) => next ? onOpenChange(true) : close()}>
    <DialogContent className="max-h-[90vh] max-w-6xl overflow-hidden">
      <DialogHeader>
        <DialogTitle>Importar pagos de ruta</DialogTitle>
        <DialogDescription>
          Solo se registran las filas con <strong>Pago realizado = SI</strong>. Cada importe se vuelve a validar contra la ruta del {fecha}; no importes estos renglones de nuevo como <strong>PAGO</strong> en Flujo de Caja.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => downloadRoutePaymentTemplate(fecha, cobros, pagos)} className="gap-2">
          <Download className="size-4" />Descargar plantilla de pagos
        </Button>
        <Button type="button" onClick={() => inputRef.current?.click()} disabled={reading} className="gap-2">
          {reading ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {reading ? "Validando..." : "Cargar Excel"}
        </Button>
        <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={readFile} />
      </div>
      {preview && <div className="grid gap-3 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="outline">{preview.summary.total} fila(s)</Badge>
          <Badge variant="outline">{preview.summary.selected} marcada(s) SI</Badge>
          <Badge className="bg-emerald-600">{preview.summary.created} por crear</Badge>
          {preview.summary.omitted > 0 && <Badge variant="outline" className="border-amber-400 text-amber-700">{preview.summary.omitted} omitida(s)</Badge>}
          {preview.summary.invalid > 0 && <Badge variant="destructive">{preview.summary.invalid} con error</Badge>}
        </div>
        {preview.missing_columns.length > 0 && <p className="text-sm text-destructive">Faltan columnas: {preview.missing_columns.join(", ")}.</p>}
        <div className="max-h-[43vh] overflow-auto rounded-md border">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="sticky top-0 bg-muted text-left"><tr><th className="p-2">Fila</th><th className="p-2">Folio</th><th className="p-2">Cliente</th><th className="p-2">Cuota</th><th className="p-2 text-right">Esperado</th><th className="p-2">Resultado</th></tr></thead>
            <tbody>{preview.rows.map((row) => <tr key={row.row_number} className="border-t align-top">
              <td className="p-2 font-mono">{row.row_number}</td><td className="p-2">#{row.data.folio ?? "—"}</td>
              <td className="p-2">{row.credito?.cliente || row.data.cliente_grupo || "—"}</td>
              <td className="p-2">{row.data.cuota ?? "—"}<span className="block text-xs text-muted-foreground">{String(row.data.fecha_cuota ?? "")}</span></td>
              <td className="p-2 text-right">{money(row.data.importe_esperado)}</td>
              <td className="p-2"><Badge variant={row.valid ? "outline" : "destructive"}>{row.action === "create" ? "Crear" : row.action === "skip" ? "Omitir" : "No marcada"}</Badge>
                {[...row.errors, ...row.warnings].map((message, index) => <p key={`${message}-${index}`} className={`mt-1 text-xs ${index < row.errors.length ? "text-destructive" : "text-amber-700"}`}>{message}</p>)}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={reset} disabled={confirming}>Limpiar</Button><Button onClick={confirm} disabled={confirming || preview.summary.invalid > 0 || preview.summary.created === 0}>{confirming && <LoaderCircle className="mr-2 size-4 animate-spin" />}Confirmar importación</Button></div>
      </div>}
    </DialogContent>
  </Dialog>;
}
