"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, FileText, Printer, Sparkles } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildContratoInversionistaParams,
  buildReciboInversionistaParams,
  generarContratoInversionistaHtml,
  generarContratoInversionistaMarkdown,
  generarReciboInversionistaHtml,
  generarReciboInversionistaMarkdown,
  imprimirDocumentoHtml,
  type ContratoInversionistaParams,
  type ReciboInversionistaParams,
} from "@/lib/inversionista-document-templates";
import { desglosarFecha, numeroALetras } from "@/lib/document-templates";

type TipoDocumentoInversionista = "recibo" | "contrato";

interface InversionistaDocumentoDialogProps {
  inversionista: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InversionistaDocumentoDialog({
  inversionista,
  open,
  onOpenChange,
}: InversionistaDocumentoDialogProps) {
  const [docType, setDocType] = useState<TipoDocumentoInversionista>("recibo");
  const [copied, setCopied] = useState(false);
  const [monto, setMonto] = useState("0");
  const [folio, setFolio] = useState("");
  const [beneficiario, setBeneficiario] = useState("");
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFin, setPeriodoFin] = useState("");
  const [tasaMensual, setTasaMensual] = useState("4%");
  const [entregante1, setEntregante1] = useState("FREDY PONCE SANCHEZ");
  const [entregante2, setEntregante2] = useState("JOSSUE GIBRAN SOBREVILLA DIAZ");

  useEffect(() => {
    if (!open || !inversionista) return;
    const recibo = buildReciboInversionistaParams(inversionista);
    const contrato = buildContratoInversionistaParams(inversionista);
    setDocType("recibo");
    setMonto(String(recibo.monto || contrato.monto || 0));
    setFolio(recibo.folio);
    setBeneficiario(recibo.beneficiario);
    setPeriodoInicio(recibo.periodoInicio);
    setPeriodoFin(recibo.periodoFin);
    setTasaMensual(contrato.tasaMensual);
    setEntregante1(recibo.entregantes[0]?.nombre || "FREDY PONCE SANCHEZ");
    setEntregante2(recibo.entregantes[1]?.nombre || "JOSSUE GIBRAN SOBREVILLA DIAZ");
  }, [open, inversionista]);

  const reciboParams: ReciboInversionistaParams = useMemo(() => {
    const base = buildReciboInversionistaParams(inversionista);
    return {
      ...base,
      folio,
      monto: Number(monto || 0),
      beneficiario: beneficiario.toUpperCase(),
      periodoInicio,
      periodoFin,
      entregantes: [
        { nombre: entregante1, participacion: "ENTREGUE: DEUDA COMPARTIDA 50%" },
        { nombre: entregante2, participacion: "ENTREGUE: DEUDA COMPARTIDA 50%" },
      ],
    };
  }, [beneficiario, entregante1, entregante2, folio, inversionista, monto, periodoFin, periodoInicio]);

  const contratoParams: ContratoInversionistaParams = useMemo(() => {
    const base = buildContratoInversionistaParams(inversionista);
    const folioContrato = folio.replace(/^REC-/, "");
    return {
      ...base,
      folio: folioContrato,
      monto: Number(monto || 0),
      acreedor: beneficiario.toUpperCase(),
      tasaMensual,
      responsables: [
        { nombre: entregante1, participacion: "ACEPTO DEUDA COMPARTIDA 50%" },
        { nombre: entregante2, participacion: "ACEPTO DEUDA COMPARTIDA 50%" },
      ],
    };
  }, [beneficiario, entregante1, entregante2, folio, inversionista, monto, tasaMensual]);

  const htmlContent = useMemo(
    () =>
      docType === "recibo"
        ? generarReciboInversionistaHtml(reciboParams)
        : generarContratoInversionistaHtml(contratoParams),
    [contratoParams, docType, reciboParams]
  );

  const markdownContent = useMemo(
    () =>
      docType === "recibo"
        ? generarReciboInversionistaMarkdown(reciboParams)
        : generarContratoInversionistaMarkdown(contratoParams),
    [contratoParams, docType, reciboParams]
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdownContent);
      setCopied(true);
      toast.success("Documento copiado en Markdown");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar el documento");
    }
  };

  const handlePrint = () => {
    try {
      imprimirDocumentoHtml(htmlContent);
      toast.success("Abriendo impresión del documento");
    } catch {
      toast.error("No se pudo abrir la impresión");
    }
  };

  const fechaExpedicionRecibo = desglosarFecha(reciboParams.fechaExpedicion);
  const fechaExpedicionContrato = desglosarFecha(contratoParams.fechaExpedicion);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl w-[96vw] h-[92vh] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 px-6 border-b bg-muted/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Documentos de Inversionista</DialogTitle>
                <DialogDescription>
                  Recibo de rendimientos y contrato de fondeo para {inversionista?.nombre ?? "la fuente seleccionada"}.
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Tabs value={docType} onValueChange={(v) => setDocType(v as TipoDocumentoInversionista)}>
                <TabsList className="h-10 bg-background border p-1">
                  <TabsTrigger value="recibo" className="text-xs font-semibold px-3">
                    Recibo
                  </TabsTrigger>
                  <TabsTrigger value="contrato" className="text-xs font-semibold px-3">
                    Contrato (Pagaré)
                  </TabsTrigger>
                </TabsList>
              </Tabs>
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
          {/* Controls Column */}
          <div className="lg:col-span-4 border-r overflow-y-auto p-5 bg-card/60 space-y-4">
            <div>
              <Label>Folio</Label>
              <Input value={folio} onChange={(e) => setFolio(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Beneficiario / Acreedor</Label>
              <Input value={beneficiario} onChange={(e) => setBeneficiario(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Monto</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="mt-1"
              />
            </div>
            {docType === "recibo" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Periodo inicio</Label>
                  <Input
                    type="date"
                    value={periodoInicio}
                    onChange={(e) => setPeriodoInicio(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Periodo fin</Label>
                  <Input
                    type="date"
                    value={periodoFin}
                    onChange={(e) => setPeriodoFin(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
            {docType === "contrato" && (
              <div>
                <Label>Tasa mensual</Label>
                <Input
                  value={tasaMensual}
                  onChange={(e) => setTasaMensual(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
            <div>
              <Label>Entregante / Responsable 1 (50%)</Label>
              <Input
                value={entregante1}
                onChange={(e) => setEntregante1(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Entregante / Responsable 2 (50%)</Label>
              <Input
                value={entregante2}
                onChange={(e) => setEntregante2(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="rounded-xl border bg-muted/40 p-4 text-xs space-y-2 text-muted-foreground">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Sparkles className="size-4 text-primary" />
                Resumen del Instrumento
              </div>
              <div className="flex justify-between">
                <span>Inversionista:</span>
                <span className="font-medium text-foreground">{inversionista?.nombre || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span>Monto Asignado:</span>
                <span className="font-semibold text-foreground">
                  ${Number(monto || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Documento activo:</span>
                <span className="font-semibold text-primary uppercase">
                  {docType === "recibo" ? "Recibo de Rendimientos" : "Contrato Pagaré"}
                </span>
              </div>
            </div>
          </div>

          {/* Document Preview Column */}
          <div className="lg:col-span-8 overflow-y-auto p-6 md:p-10 bg-zinc-100 flex justify-center">
            <div className="relative bg-white text-zinc-900 shadow-2xl border w-full max-w-[780px] p-8 md:p-12 rounded-sm my-auto min-h-[900px] font-serif">
              {/* Background Watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none select-none z-0">
                <img src="/logo.png" alt="" className="w-2/3 max-w-sm object-contain" />
              </div>

              {/* Document Content */}
              <div className="relative z-10">
                {docType === "recibo" && (
                  <div className="space-y-6 font-serif text-sm leading-relaxed">
                    {/* Header Title */}
                    <div className="text-center font-bold text-2xl tracking-[0.35em] uppercase border-b-2 border-zinc-900 pb-4">
                      R E C I B O
                    </div>

                    {/* Metadata Bar */}
                    <div className="flex justify-between font-bold text-sm border-b border-zinc-800 pb-2">
                      <div>RECIBO {reciboParams.folio}</div>
                      <div>
                        BUENO POR: ${Number(reciboParams.monto).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    {/* Location and Date */}
                    <div className="font-bold text-xs uppercase pt-1">
                      EN {reciboParams.lugarExpedicion}, A {fechaExpedicionRecibo.texto}.
                    </div>

                    {/* Body */}
                    <div className="text-justify indent-8 leading-relaxed">
                      RECIBÍ, por conducto de{" "}
                      <strong>
                        {reciboParams.entregantes[0]?.participacion} {reciboParams.entregantes[0]?.nombre.toUpperCase()}
                      </strong>{" "}
                      y{" "}
                      <strong>
                        {reciboParams.entregantes[1]?.participacion} {reciboParams.entregantes[1]?.nombre.toUpperCase()}
                      </strong>
                      , la cantidad de{" "}
                      <strong>
                        ${Number(reciboParams.monto).toLocaleString("es-MX", { minimumFractionDigits: 2 })} (
                        {numeroALetras(reciboParams.monto)})
                      </strong>
                      , como rendimientos del préstamo otorgado sin fines de lucro, en esta misma fecha, correspondientes al periodo del{" "}
                      <strong>{desglosarFecha(reciboParams.periodoInicio).texto}</strong> al{" "}
                      <strong>{desglosarFecha(reciboParams.periodoFin).texto}</strong>.
                    </div>

                    <div className="text-justify leading-relaxed">
                      Lo que hago constar para los efectos legales a que dé lugar el presente recibo.
                    </div>

                    {/* Beneficiary Acceptance */}
                    <div className="pt-6 text-center">
                      <div className="font-bold text-xs tracking-widest uppercase mb-12">
                        R E C I B Í : &nbsp; ESTOY CONFORME
                      </div>
                      <div className="max-w-xs mx-auto">
                        <div className="border-t-2 border-zinc-900 pt-2 font-bold text-xs">
                          {reciboParams.beneficiario}
                        </div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                          FIRMA
                        </div>
                      </div>
                    </div>

                    {/* Deliverers Signatures Grid */}
                    <div className="grid grid-cols-2 gap-10 pt-8 text-center text-xs">
                      {reciboParams.entregantes.map((item, idx) => (
                        <div key={idx}>
                          <div className="font-bold mb-12 tracking-wide text-[11px] text-zinc-700 uppercase">
                            {item.participacion}
                          </div>
                          <div className="border-t-2 border-zinc-900 pt-2 font-bold text-xs">
                            {item.nombre.toUpperCase()}
                          </div>
                          <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                            FIRMA
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {docType === "contrato" && (
                  <div className="space-y-6 font-serif text-sm leading-relaxed">
                    {/* Header Title */}
                    <div className="text-center font-bold text-2xl tracking-[0.35em] uppercase border-b-2 border-zinc-900 pb-4">
                      P A G A R É
                    </div>

                    {/* Metadata Bar */}
                    <div className="flex justify-between font-bold text-sm border-b border-zinc-800 pb-2">
                      <div>NO. {contratoParams.folio}</div>
                      <div>
                        BUENO POR: ${Number(contratoParams.monto).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    {/* Location and Date */}
                    <div className="font-bold text-xs uppercase pt-1">
                      EN {contratoParams.lugarExpedicion}, A {fechaExpedicionContrato.texto}.
                    </div>

                    {/* Body */}
                    <div className="text-justify indent-8 leading-relaxed">
                      DEBO Y PAGARÉ INCONDICIONALMENTE, POR ESTE PAGARÉ A LA ORDEN DE{" "}
                      <strong>{contratoParams.acreedor}</strong>, LA CANTIDAD DE{" "}
                      <strong>
                        ${Number(contratoParams.monto).toLocaleString("es-MX", { minimumFractionDigits: 2 })} (
                        {numeroALetras(contratoParams.monto)})
                      </strong>
                      , en el domicilio habitual de pago de AGC Servicios Financieros, el día{" "}
                      <strong>{contratoParams.fechaPagoDia}</strong> del mes de{" "}
                      <strong>{contratoParams.fechaPagoMes}</strong> del año{" "}
                      <strong>{contratoParams.fechaPagoAnio}</strong>.
                    </div>

                    <div className="text-justify leading-relaxed">
                      VALOR RECIBIDO A ENTERA SATISFACCIÓN. ESTE PAGARÉ FORMA PARTE DE UNA SERIE NUMERADA DE 1 DE 1 Y
                      ESTÁ SUJETO A LAS CONDICIONES DE QUE, AL NO PAGARSE A SU VENCIMIENTO, CAUSARÁ INTERESES MORATORIOS
                      AL TIPO DEL <strong>{contratoParams.tasaMensual} MENSUAL</strong>.
                    </div>

                    <div className="text-justify leading-relaxed">
                      NOTA: El importe de la causa de intereses será saldado los días{" "}
                      <strong>{contratoParams.fechaPagoDia}</strong> de cada mes mediante recibo firmado por la interesada.
                      El presente contrato tendrá vigencia inicial de <strong>{contratoParams.vigenciaMeses} meses</strong> a
                      partir de <strong>{desglosarFecha(contratoParams.inicioRendimiento).texto}</strong>.
                    </div>

                    {/* Responsibles Signatures Grid */}
                    <div className="grid grid-cols-2 gap-10 pt-12 text-center text-xs">
                      {contratoParams.responsables.map((item, idx) => (
                        <div key={idx}>
                          <div className="font-bold mb-14 tracking-wide text-[11px] text-zinc-700 uppercase">
                            {item.participacion}
                          </div>
                          <div className="border-t-2 border-zinc-900 pt-2 font-bold text-xs">
                            {item.nombre.toUpperCase()}
                          </div>
                          <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                            FIRMA
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
