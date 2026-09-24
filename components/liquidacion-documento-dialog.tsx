"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Printer, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildComprobanteLiquidacionParams,
  generarComprobanteLiquidacionHtml,
  imprimirDocumentoHtml,
  type ComprobanteLiquidacionParams,
} from "@/lib/inversionista-document-templates";
import { desglosarFecha, numeroALetras } from "@/lib/document-templates";

interface LiquidacionDocumentoDialogProps {
  inversionista: any;
  liquidacion: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const fmt = (value: number) => Number(value || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function LiquidacionDocumentoDialog({ inversionista, liquidacion, open, onOpenChange }: LiquidacionDocumentoDialogProps) {
  const [params, setParams] = useState<ComprobanteLiquidacionParams>(() => buildComprobanteLiquidacionParams(inversionista, liquidacion));

  useEffect(() => {
    if (open) setParams(buildComprobanteLiquidacionParams(inversionista, liquidacion));
  }, [inversionista, liquidacion, open]);

  const total = Number(params.capital || 0) + Number(params.rendimiento || 0);
  const fecha = params.fecha ? desglosarFecha(params.fecha) : { texto: "____________" };
  const html = useMemo(() => generarComprobanteLiquidacionHtml(params), [params]);

  const update = <K extends keyof ComprobanteLiquidacionParams>(key: K, value: ComprobanteLiquidacionParams[K]) => {
    setParams((current) => ({ ...current, [key]: value }));
  };

  const handlePrint = () => {
    try {
      imprimirDocumentoHtml(html);
      toast.success("Abriendo comprobante para imprimir o guardar en PDF");
    } catch {
      toast.error("No se pudo abrir la impresión del comprobante");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[calc(100dvh-2rem)] max-h-[900px] w-[96vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
        <DialogHeader className="border-b bg-muted/30 p-4 px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary"><FileText className="h-5 w-5" /></div>
              <div>
                <DialogTitle>Comprobante de liquidación</DialogTitle>
                <DialogDescription>Edita los datos de la plantilla antes de imprimir el comprobante definitivo.</DialogDescription>
              </div>
            </div>
            <Button type="button" size="sm" onClick={handlePrint}><Printer className="h-4 w-4" />Descargar PDF / Imprimir</Button>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-12">
          <div className="space-y-4 overflow-y-auto border-r bg-card/60 p-5 lg:col-span-4">
            <div><Label>Folio</Label><Input className="mt-1" value={params.folio} onChange={(event) => update("folio", event.target.value)} /></div>
            <div><Label>Inversionista</Label><Input className="mt-1" value={params.inversionista} onChange={(event) => update("inversionista", event.target.value.toUpperCase())} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Fecha</Label><Input className="mt-1" type="date" value={params.fecha} onChange={(event) => update("fecha", event.target.value)} /></div>
              <div><Label>Cuenta</Label><Input className="mt-1" value={params.cuenta} onChange={(event) => update("cuenta", event.target.value)} /></div>
            </div>
            <div><Label>Lugar de expedición</Label><Input className="mt-1" value={params.lugar} onChange={(event) => update("lugar", event.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Capital liquidado</Label><Input className="mt-1" type="number" min="0" step="0.01" value={params.capital} onChange={(event) => update("capital", Number(event.target.value))} /></div>
              <div><Label>Rendimiento final</Label><Input className="mt-1" type="number" min="0" step="0.01" value={params.rendimiento} onChange={(event) => update("rendimiento", Number(event.target.value))} /></div>
            </div>
            <div><Label>Notas</Label><textarea rows={3} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={params.notas} onChange={(event) => update("notas", event.target.value)} /></div>
            <div><Label>Responsable 1</Label><Input className="mt-1" value={params.responsable1} onChange={(event) => update("responsable1", event.target.value.toUpperCase())} /></div>
            <div><Label>Responsable 2</Label><Input className="mt-1" value={params.responsable2} onChange={(event) => update("responsable2", event.target.value.toUpperCase())} /></div>
            <div className="rounded-xl border bg-muted/40 p-4 text-xs text-muted-foreground">
              <div className="mb-2 flex items-center gap-1.5 font-semibold text-foreground"><Sparkles className="h-4 w-4 text-primary" />Resumen</div>
              <div className="flex justify-between"><span>Total del comprobante</span><strong className="text-foreground">${fmt(total)}</strong></div>
              <p className="mt-2">Los cambios afectan únicamente esta impresión; no modifican la liquidación contable registrada.</p>
            </div>
          </div>

          <div className="flex overflow-y-auto bg-zinc-100 p-6 md:p-10 lg:col-span-8">
            <div className="relative m-auto min-h-[760px] w-full max-w-[780px] border-2 border-rose-800 bg-white p-8 text-zinc-900 shadow-2xl md:p-12">
              <div className="text-right text-xs font-bold">FOLIO {params.folio}</div>
              <h2 className="my-8 text-center text-xl font-bold tracking-wide text-rose-800">COMPROBANTE DE LIQUIDACIÓN DE INVERSIÓN</h2>
              <p className="my-8 text-justify leading-7">En {params.lugar}, a {fecha.texto}, se hace constar la liquidación total de la inversión a favor de <strong>{params.inversionista}</strong>, mediante la cuenta <strong>{params.cuenta}</strong>.</p>
              <div className="my-8 divide-y border-y text-sm">
                <div className="flex justify-between p-3"><span>Capital liquidado</span><strong>${fmt(params.capital)}</strong></div>
                <div className="flex justify-between p-3"><span>Rendimiento final</span><strong>${fmt(params.rendimiento)}</strong></div>
                <div className="flex justify-between border-t-2 border-rose-800 p-3 text-base text-rose-800"><strong>Total entregado</strong><strong>${fmt(total)}</strong></div>
              </div>
              <p>Importe total: <strong>{numeroALetras(total)}</strong>.</p>
              {params.notas && <p className="mt-5 text-xs text-zinc-600"><strong>Notas:</strong> {params.notas}</p>}
              <div className="mt-24 grid grid-cols-3 gap-6 text-center text-[11px]">
                <div className="border-t border-zinc-900 pt-2"><strong>{params.inversionista}</strong><br />RECIBÍ DE CONFORMIDAD</div>
                <div className="border-t border-zinc-900 pt-2"><strong>{params.responsable1}</strong><br />RESPONSABLE</div>
                <div className="border-t border-zinc-900 pt-2"><strong>{params.responsable2}</strong><br />RESPONSABLE</div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
