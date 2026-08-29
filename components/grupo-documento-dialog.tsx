"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Printer, Users } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildTarjetaCobroGrupalParams,
  generarTarjetaCobroGrupalHtml,
  generarTarjetaCobroGrupalMarkdown,
  imprimirDocumentoHtml,
  type TarjetaCobroGrupalParams,
} from "@/lib/group-document-templates";

interface GrupoDocumentoDialogProps {
  credito: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GrupoDocumentoDialog({ credito, open, onOpenChange }: GrupoDocumentoDialogProps) {
  const [copied, setCopied] = useState(false);
  const [grupo, setGrupo] = useState("");
  const [idGrupo, setIdGrupo] = useState("");
  const [tasaAplicada, setTasaAplicada] = useState("");
  const [asesor, setAsesor] = useState("");

  useEffect(() => {
    if (!open || !credito) return;
    const base = buildTarjetaCobroGrupalParams(credito);
    setGrupo(base.grupo);
    setIdGrupo(String(base.idGrupo));
    setTasaAplicada(base.tasaAplicada);
    setAsesor(base.asesor);
  }, [open, credito]);

  const params: TarjetaCobroGrupalParams = useMemo(() => {
    const base = buildTarjetaCobroGrupalParams(credito);
    return {
      ...base,
      grupo: grupo || base.grupo,
      idGrupo: idGrupo || base.idGrupo,
      tasaAplicada: tasaAplicada || base.tasaAplicada,
      asesor: asesor || base.asesor,
    };
  }, [asesor, credito, grupo, idGrupo, tasaAplicada]);

  const htmlContent = useMemo(() => generarTarjetaCobroGrupalHtml(params), [params]);
  const markdownContent = useMemo(() => generarTarjetaCobroGrupalMarkdown(params), [params]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdownContent);
      setCopied(true);
      toast.success("Tarjeta grupal copiada en Markdown");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar la plantilla");
    }
  };

  const handlePrint = () => {
    try {
      imprimirDocumentoHtml(htmlContent);
      toast.success("Abriendo impresión de tarjeta grupal");
    } catch {
      toast.error("No se pudo imprimir la tarjeta grupal");
    }
  };

  const responsableNombre =
    params.integrantes.find((i) => i.responsable)?.nombre ||
    params.integrantes[0]?.nombre ||
    "REPRESENTANTE DEL GRUPO";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl w-[96vw] h-[92vh] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 px-6 border-b bg-muted/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Tarjeta de Cobro Grupal</DialogTitle>
                <DialogDescription>
                  Formato basado en la tarjeta grupal actual para impresión o PDF.
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copiado" : "Copiar .MD"}
              </Button>
              <Button type="button" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4" />
                Descargar PDF / Imprimir
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          {/* Left Controls Column */}
          <div className="lg:col-span-4 border-r overflow-y-auto p-5 bg-card/60 space-y-4">
            <div>
              <Label>Grupo</Label>
              <Input value={grupo} onChange={(e) => setGrupo(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>ID grupo</Label>
              <Input value={idGrupo} onChange={(e) => setIdGrupo(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Tasa aplicada</Label>
              <Input value={tasaAplicada} onChange={(e) => setTasaAplicada(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Asesor</Label>
              <Input value={asesor} onChange={(e) => setAsesor(e.target.value)} className="mt-1" />
            </div>
            <div className="rounded-xl border bg-muted/40 p-4 text-sm space-y-1">
              <div className="flex justify-between">
                <span>Crédito total</span>
                <span className="font-semibold">
                  ${Number(params.creditoTotal).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Pago semanal</span>
                <span className="font-semibold">
                  ${Number(params.pagoGrupalSemanal).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Plazo</span>
                <span className="font-semibold">{params.plazoSemanas} semanas</span>
              </div>
              <div className="flex justify-between">
                <span>Integrantes</span>
                <span className="font-semibold">{params.integrantes.length}</span>
              </div>
            </div>
          </div>

          {/* Right Document Preview Column */}
          <div className="lg:col-span-8 overflow-y-auto p-6 md:p-10 bg-zinc-100 flex justify-center">
            <div className="relative bg-white text-zinc-900 shadow-2xl border w-full max-w-[780px] p-8 rounded-sm my-auto min-h-[960px] font-sans">
              {/* Background Watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none select-none z-0">
                <img src="/logo.png" alt="" className="w-2/3 max-w-sm object-contain" />
              </div>

              {/* Document Content */}
              <div className="relative z-10 space-y-3 font-sans text-[11px] leading-tight">
                {/* Header */}
                <div className="text-center pb-1">
                  <h1 className="text-base font-black tracking-widest uppercase">{params.empresa}</h1>
                  <h2 className="text-xs font-bold tracking-wider">{params.subtitulo}</h2>
                  <div className="bg-zinc-200 text-zinc-900 font-bold text-xs tracking-wider uppercase py-0.5 mt-1 border border-zinc-900">
                    {params.titulo}
                  </div>
                </div>

                {/* Group & Loan Summary Grid */}
                <div className="border border-zinc-900 overflow-hidden text-[10px]">
                  <div className="grid grid-cols-12 border-b border-zinc-900">
                    <div className="col-span-2 bg-zinc-100 font-bold p-1 border-r border-zinc-900">GRUPO:</div>
                    <div className="col-span-6 font-bold p-1 border-r border-zinc-900 truncate" title={params.grupo}>
                      {params.grupo}
                    </div>
                    <div className="col-span-2 bg-zinc-100 font-bold p-1 border-r border-zinc-900">TASA:</div>
                    <div className="col-span-2 font-bold p-1">{params.tasaAplicada}</div>
                  </div>

                  <div className="grid grid-cols-12 border-b border-zinc-900">
                    <div className="col-span-2 bg-zinc-100 font-bold p-1 border-r border-zinc-900">ID GRUPO:</div>
                    <div className="col-span-4 font-mono p-1 border-r border-zinc-900">{params.idGrupo}</div>
                    <div className="col-span-3 bg-zinc-100 font-bold p-1 border-r border-zinc-900">MONTO TOTAL:</div>
                    <div className="col-span-3 font-bold p-1">
                      ${Number(params.creditoTotal).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="grid grid-cols-12 border-b border-zinc-900">
                    <div className="col-span-2 bg-zinc-100 font-bold p-1 border-r border-zinc-900">CICLO ACTUAL:</div>
                    <div className="col-span-4 p-1 border-r border-zinc-900">{params.cicloActual}</div>
                    <div className="col-span-3 bg-zinc-100 font-bold p-1 border-r border-zinc-900">CICLO ANTERIOR:</div>
                    <div className="col-span-3 p-1">{params.cicloAnterior}</div>
                  </div>

                  <div className="grid grid-cols-12 border-b border-zinc-900">
                    <div className="col-span-2 bg-zinc-100 font-bold p-1 border-r border-zinc-900">FECHA INICIO:</div>
                    <div className="col-span-4 p-1 border-r border-zinc-900">{params.fechaInicio}</div>
                    <div className="col-span-3 bg-zinc-100 font-bold p-1 border-r border-zinc-900">FECHA TERMINO:</div>
                    <div className="col-span-3 p-1 font-bold">{params.fechaTermino}</div>
                  </div>

                  <div className="grid grid-cols-12 border-b border-zinc-900">
                    <div className="col-span-2 bg-zinc-100 font-bold p-1 border-r border-zinc-900">PLAZO:</div>
                    <div className="col-span-4 font-bold p-1 border-r border-zinc-900">
                      {params.plazoSemanas} SEMANAS
                    </div>
                    <div className="col-span-3 bg-zinc-100 font-bold p-1 border-r border-zinc-900">PAGO SEMANAL:</div>
                    <div className="col-span-3 font-bold p-1">
                      ${Number(params.pagoGrupalSemanal).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="grid grid-cols-12">
                    <div className="col-span-2 bg-zinc-100 font-bold p-1 border-r border-zinc-900">ASESOR:</div>
                    <div className="col-span-10 font-bold p-1">{params.asesor}</div>
                  </div>
                </div>

                {/* Integrantes Grid */}
                <div className="border border-zinc-900 overflow-hidden text-[9.5px]">
                  <div className="bg-zinc-200 font-bold text-center border-b border-zinc-900 py-1 tracking-wider uppercase text-[10px]">
                    INTEGRANTES DEL GRUPO SOLIDARIO
                  </div>
                  {params.integrantes.map((item, index) => (
                    <div
                      key={index}
                      className={`grid grid-cols-12 ${
                        index < params.integrantes.length - 1 ? "border-b border-zinc-900" : ""
                      }`}
                    >
                      <div className="col-span-3 bg-zinc-100 font-bold p-1 border-r border-zinc-900">
                        {item.responsable || index === 0 ? "RESPONSABLE:" : `INTEGRANTE ${index + 1}:`}
                      </div>
                      <div className="col-span-5 p-1 border-r border-zinc-900 font-medium truncate" title={item.nombre}>
                        {item.nombre}
                      </div>
                      <div className="col-span-2 bg-zinc-100 font-bold p-1 border-r border-zinc-900 text-center">
                        CELULAR:
                      </div>
                      <div className="col-span-2 p-1 font-mono">{item.telefono}</div>
                    </div>
                  ))}
                </div>

                {/* Payment Schedule Table */}
                <div className="border border-zinc-900 overflow-hidden text-[9px]">
                  <div className="grid grid-cols-12 bg-zinc-200 font-bold text-center border-b border-zinc-900 py-1">
                    <div className="col-span-2 border-r border-zinc-900">FECHA</div>
                    <div className="col-span-3 border-r border-zinc-900">SEMANA</div>
                    <div className="col-span-2 border-r border-zinc-900">MONTO</div>
                    <div className="col-span-1 border-r border-zinc-900">MULTA</div>
                    <div className="col-span-2 border-r border-zinc-900">TOTAL</div>
                    <div className="col-span-2">ASESOR</div>
                  </div>

                  {params.pagos.map((pago, index) => (
                    <div
                      key={index}
                      className={`grid grid-cols-12 border-b border-zinc-300 py-0.5 items-center ${
                        index % 2 === 1 ? "bg-zinc-50/70" : ""
                      }`}
                    >
                      <div className="col-span-2 text-center font-mono border-r border-zinc-300">{pago.fecha}</div>
                      <div className="col-span-3 text-center font-semibold border-r border-zinc-300">
                        {pago.semanaTexto || `SEMANA ${String(index + 1).padStart(2, "0")}`}
                      </div>
                      <div className="col-span-2 text-right pr-2 font-bold border-r border-zinc-300">
                        ${Number(pago.monto).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </div>
                      <div className="col-span-1 border-r border-zinc-300 h-4 text-center font-mono">
                        {pago.multa || ""}
                      </div>
                      <div className="col-span-2 border-r border-zinc-300 h-4 text-right pr-2 font-bold">
                        {pago.total ? `$${pago.total}` : ""}
                      </div>
                      <div className="col-span-2 h-4"></div>
                    </div>
                  ))}
                </div>

                {/* Multas & Responsable Signature */}
                <div className="border border-zinc-900 grid grid-cols-12 text-[9.5px]">
                  <div className="col-span-5 border-r border-zinc-900 p-1.5 space-y-1">
                    <div className="flex justify-between">
                      <span className="font-bold">RETARDO EN HORARIO:</span>
                      <span className="font-bold">${params.multaHorario}.00</span>
                    </div>
                    <div className="flex justify-between border-t border-zinc-300 pt-1">
                      <span className="font-bold">RETARDO POR DIA:</span>
                      <span className="font-bold">${params.multaDia}.00</span>
                    </div>
                  </div>

                  <div className="col-span-7 p-1.5 text-center flex flex-col justify-between">
                    <span className="font-bold text-[9px] uppercase">
                      ACEPTAMOS PLAZO Y CONDICIONES SOLIDARIAMENTE
                    </span>
                    <div className="mt-4 border-t border-zinc-900 pt-0.5 text-[8.5px] font-bold">
                      {responsableNombre} (RESPONSABLE DEL GRUPO)
                    </div>
                  </div>
                </div>

                {/* Warning and Rules */}
                <div className="border border-zinc-900 p-2 text-[8px] space-y-1">
                  <p className="font-bold text-center text-red-700">
                    EL CIERRE DE PAGO DEBERÁ EFECTUARSE ANTES DE LAS {params.horaLimitePago} HORAS, A FIN DE EVITAR COBRO DE MULTAS.
                  </p>
                  <ol className="list-decimal pl-3 space-y-0.5 leading-tight text-zinc-700">
                    <li><strong>UN RETRASO:</strong> Pierde derecho de refinanciamiento anticipado y deberá esperar la renovación normal.</li>
                    <li><strong>DOS RETRASOS:</strong> Con derecho a renovar al término de ciclo, sin aumento de crédito.</li>
                    <li><strong>TRES RETRASOS:</strong> Pierde derecho a renovación, quedando suspendido durante dos ciclos.</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
