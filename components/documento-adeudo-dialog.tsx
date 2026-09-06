"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Printer,
  Copy,
  Check,
  DollarSign,
  User,
  ShieldCheck,
  Building,
  RotateCcw,
  Sparkles,
  Users2,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import {
  buildDocumentoAdeudoParams,
  generarPagareMarkdown,
  generarCartaAdeudoMarkdown,
  generarTarjetaCobroMarkdown,
  generarPagareHtml,
  generarCartaAdeudoHtml,
  generarTarjetaCobroHtml,
  imprimirDocumentoHtml,
  buildTarjetaCobroParams,
  type DocumentoAdeudoParams,
  type TarjetaCobroParams,
} from "@/lib/document-templates";

export type TipoDocumentoAdeudo = "pagare" | "carta_adeudo" | "tarjeta_cobro";

interface DocumentoAdeudoDialogProps {
  credito: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDoc?: TipoDocumentoAdeudo;
}

export function DocumentoAdeudoDialog({
  credito,
  open,
  onOpenChange,
  defaultDoc = "pagare",
}: DocumentoAdeudoDialogProps) {
  const [docType, setDocType] = useState<TipoDocumentoAdeudo>(defaultDoc);
  const [copied, setCopied] = useState(false);

  // Form State
  const [nombreAcreedor, setNombreAcreedor] = useState("AGC SERVICIOS FINANCIEROS");
  const [domicilioPago, setDomicilioPago] = useState(
    "SEXTA PRIVADA NUM. 514, ZONA CENTRO DE LA CIUDAD DE TAMPICO, ESTADO DE TAMAULIPAS"
  );
  const [tipoComprobante, setTipoComprobante] = useState("COMAPA");
  const [tasaMoratoria, setTasaMoratoria] = useState("20%");
  const [lugarExpedicion, setLugarExpedicion] = useState("TAMPICO, TAMPS.");

  // Deudor data
  const [nombreCliente, setNombreCliente] = useState("");
  const [curp, setCurp] = useState("");
  const [claveElector, setClaveElector] = useState("");
  const [direccion, setDireccion] = useState("");
  const [entreCalles, setEntreCalles] = useState("");
  const [ciudadEstadoCp, setCiudadEstadoCp] = useState("TAMPICO, TAMPS.");
  const [ciudadOrigen, setCiudadOrigen] = useState("TAMPICO, TAMAULIPAS");
  const [telefono, setTelefono] = useState("");
  const [nombreTestigo, setNombreTestigo] = useState("");

  // Referencias para Tarjeta de Cobro
  const [refFamParentesco, setRefFamParentesco] = useState("FAMILIAR");
  const [refFamNombre, setRefFamNombre] = useState("");
  const [refFamCel, setRefFamCel] = useState("");
  const [refFamDireccion, setRefFamDireccion] = useState("");

  const [refPerTipo, setRefPerTipo] = useState("AMISTAD");
  const [refPerNombre, setRefPerNombre] = useState("");
  const [refPerCel, setRefPerCel] = useState("");
  const [refPerDireccion, setRefPerDireccion] = useState("");

  const [multaHorario, setMultaHorario] = useState("75");
  const [multaDia, setMultaDia] = useState("100");
  const montoOtorgadoOriginal = Number(credito?.monto_otorgado ?? 0);

  // Initialize or reset form values when credito or defaultDoc changes
  const resetDefaults = () => {
    const cliente = credito?.cliente || {};
    const avalNombre = cliente?.avales?.[0]?.nombre || "";
    const referencias = cliente?.referencias || [];
    const refFam = referencias.find((r: any) => r.tipo_referencia === "Familiar") || referencias[0] || {};
    const refPer = referencias.find((r: any) => r.tipo_referencia !== "Familiar" && r.id !== refFam?.id) || referencias[1] || {};

    setNombreAcreedor("AGC SERVICIOS FINANCIEROS");
    setDomicilioPago("SEXTA PRIVADA NUM. 514, ZONA CENTRO DE LA CIUDAD DE TAMPICO, ESTADO DE TAMAULIPAS");
    setTipoComprobante("COMAPA");
    setTasaMoratoria("20%");
    setLugarExpedicion("TAMPICO, TAMPS.");

    setNombreCliente(cliente?.nombre_completo || "");
    setCurp(cliente?.curp || "");
    setClaveElector(cliente?.clave_elector || "");
    setDireccion(cliente?.direccion || "");
    setEntreCalles(cliente?.entre_calles || "");
    setCiudadEstadoCp("TAMPICO, TAMPS.");
    setCiudadOrigen("TAMPICO, TAMAULIPAS");
    setTelefono(cliente?.telefono || "");
    setNombreTestigo(avalNombre || credito?.asesor?.nombre_asesor || "");

    // Referencias
    setRefFamParentesco(refFam?.parentesco || "FAMILIAR");
    setRefFamNombre(refFam?.nombre || "");
    setRefFamCel(refFam?.telefono || "");
    setRefFamDireccion(refFam?.direccion || "");

    setRefPerTipo(refPer?.parentesco || refPer?.tipo_referencia || "AMISTAD");
    setRefPerNombre(refPer?.nombre || "");
    setRefPerCel(refPer?.telefono || "");
    setRefPerDireccion(refPer?.direccion || "");

    setMultaHorario("75");
    setMultaDia("100");
  };

  useEffect(() => {
    if (open && credito) {
      setDocType(defaultDoc);
      resetDefaults();
    }
  }, [open, credito, defaultDoc]);

  const paramsPagare: DocumentoAdeudoParams = useMemo(() => {
    const base = buildDocumentoAdeudoParams(credito, {
      usarSaldoPendiente: false,
      nombreAcreedor,
      domicilioPago,
      nombreTestigo,
      tipoComprobante,
      tasaMoratoria,
      lugarExpedicion,
    });
    return {
      ...base,
      // El formulario ya se precarga al abrirse. No usar `|| base.campo`:
      // una cadena vacía es una edición deliberada y debe verse igual en la
      // vista, el Markdown y el PDF.
      nombreAcreedor: nombreAcreedor.toUpperCase().trim(),
      domicilioPago: domicilioPago.toUpperCase().trim(),
      nombreTestigo: nombreTestigo.toUpperCase().trim(),
      tipoComprobante: tipoComprobante.toUpperCase().trim(),
      tasaInteresMoratorio: tasaMoratoria.trim(),
      lugarExpedicion: lugarExpedicion.toUpperCase().trim(),
      nombreCliente: nombreCliente.toUpperCase().trim(),
      curp: curp.toUpperCase().trim(),
      claveElector: claveElector.toUpperCase().trim(),
      direccion: direccion.toUpperCase().trim(),
      entreCalles: entreCalles.toUpperCase().trim(),
      ciudadEstadoCp: ciudadEstadoCp.toUpperCase().trim(),
      ciudadOrigen: ciudadOrigen.toUpperCase().trim(),
      telefono: telefono.trim(),
    };
  }, [
    credito,
    nombreCliente,
    curp,
    claveElector,
    direccion,
    entreCalles,
    ciudadEstadoCp,
    ciudadOrigen,
    telefono,
    nombreAcreedor,
    domicilioPago,
    nombreTestigo,
    tipoComprobante,
    tasaMoratoria,
    lugarExpedicion,
  ]);

  const paramsCartaAdeudo: DocumentoAdeudoParams = useMemo(() => {
    const base = buildDocumentoAdeudoParams(credito, {
      usarSaldoPendiente: true,
      nombreAcreedor,
      domicilioPago,
      nombreTestigo,
      tipoComprobante,
      tasaMoratoria,
      lugarExpedicion,
    });
    return {
      ...base,
      nombreAcreedor: nombreAcreedor.toUpperCase().trim(),
      domicilioPago: domicilioPago.toUpperCase().trim(),
      nombreTestigo: nombreTestigo.toUpperCase().trim(),
      tipoComprobante: tipoComprobante.toUpperCase().trim(),
      tasaInteresMoratorio: tasaMoratoria.trim(),
      lugarExpedicion: lugarExpedicion.toUpperCase().trim(),
      nombreCliente: nombreCliente.toUpperCase().trim(),
      curp: curp.toUpperCase().trim(),
      claveElector: claveElector.toUpperCase().trim(),
      direccion: direccion.toUpperCase().trim(),
      entreCalles: entreCalles.toUpperCase().trim(),
      ciudadEstadoCp: ciudadEstadoCp.toUpperCase().trim(),
      ciudadOrigen: ciudadOrigen.toUpperCase().trim(),
      telefono: telefono.trim(),
    };
  }, [
    credito,
    nombreCliente,
    curp,
    claveElector,
    direccion,
    entreCalles,
    ciudadEstadoCp,
    ciudadOrigen,
    telefono,
    nombreAcreedor,
    domicilioPago,
    nombreTestigo,
    tipoComprobante,
    tasaMoratoria,
    lugarExpedicion,
  ]);

  // Build parameters for Tarjeta de Cobro (FIXED TO ORIGINAL PLAN)
  const paramsTarjeta: TarjetaCobroParams = useMemo(() => {
    return buildTarjetaCobroParams(credito, {
      nombreCliente: nombreCliente.toUpperCase().trim(),
      domicilio: (direccion ? `${direccion}${entreCalles ? `, ${entreCalles}` : ""}, TAMPICO, TAMPS.` : "").toUpperCase().trim(),
      celCliente: telefono.trim(),
      montoOtorgado: montoOtorgadoOriginal || Number(credito?.monto_otorgado) || 0,
      refFamParentesco: refFamParentesco.toUpperCase().trim(),
      refFamNombre: refFamNombre.toUpperCase().trim(),
      refFamCel: refFamCel.trim(),
      refFamDireccion: refFamDireccion.toUpperCase().trim(),
      refPerTipo: refPerTipo.toUpperCase().trim(),
      refPerNombre: refPerNombre.toUpperCase().trim(),
      refPerCel: refPerCel.trim(),
      refPerDireccion: refPerDireccion.toUpperCase().trim(),
      multaHorario: multaHorario.trim(),
      multaDia: multaDia.trim(),
    });
  }, [
    credito,
    nombreCliente,
    direccion,
    entreCalles,
    telefono,
    montoOtorgadoOriginal,
    refFamParentesco,
    refFamNombre,
    refFamCel,
    refFamDireccion,
    refPerTipo,
    refPerNombre,
    refPerCel,
    refPerDireccion,
    multaHorario,
    multaDia,
  ]);

  const markdownContent = useMemo(() => {
    if (docType === "pagare") return generarPagareMarkdown(paramsPagare);
    if (docType === "carta_adeudo") return generarCartaAdeudoMarkdown(paramsCartaAdeudo);
    return generarTarjetaCobroMarkdown(paramsTarjeta);
  }, [docType, paramsPagare, paramsCartaAdeudo, paramsTarjeta]);

  const htmlContent = useMemo(() => {
    if (docType === "pagare") return generarPagareHtml(paramsPagare);
    if (docType === "carta_adeudo") return generarCartaAdeudoHtml(paramsCartaAdeudo);
    return generarTarjetaCobroHtml(paramsTarjeta);
  }, [docType, paramsPagare, paramsCartaAdeudo, paramsTarjeta]);

  const handlePrint = () => {
    try {
      imprimirDocumentoHtml(htmlContent);
      const nombres: Record<TipoDocumentoAdeudo, string> = {
        pagare: "Pagaré",
        carta_adeudo: "Carta de Adeudo",
        tarjeta_cobro: "Tarjeta de Cobro",
      };
      toast.success(`Abriendo diálogo para Imprimir / Guardar ${nombres[docType]} en PDF`);
    } catch {
      toast.error("No se pudo iniciar la impresión");
    }
  };

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdownContent);
      setCopied(true);
      toast.success("Plantilla Markdown (.md) copiada");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("No se pudo copiar el texto");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl w-[96vw] h-[92vh] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl border-border">
        {/* Top Header Bar */}
        <DialogHeader className="p-4 px-6 border-b bg-muted/30 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-bold">Documentos del Préstamo</DialogTitle>
                  <Badge variant="outline" className="font-mono text-xs font-semibold">
                    Folio #{credito?.num_prog}
                  </Badge>
                  <Badge
                    variant={credito?.mora?.en_mora ? "destructive" : "secondary"}
                    className="text-xs font-semibold"
                  >
                    {credito?.mora?.en_mora ? "En Mora" : credito?.estado || "Activo"}
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Generación oficial de Pagaré, Carta de Adeudo y Tarjeta de Pagos en PDF / Markdown
                </DialogDescription>
              </div>
            </div>

            {/* Document Selector & Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              <Tabs
                value={docType}
                onValueChange={(v) => setDocType(v as TipoDocumentoAdeudo)}
                className="w-auto"
              >
                <TabsList className="h-10 bg-background border p-1">
                  <TabsTrigger value="pagare" className="text-xs font-semibold px-3.5">
                    📄 Pagaré
                  </TabsTrigger>
                  <TabsTrigger value="carta_adeudo" className="text-xs font-semibold px-3.5">
                    ✉️ Carta de Adeudo
                  </TabsTrigger>
                  <TabsTrigger value="tarjeta_cobro" className="text-xs font-semibold px-3.5">
                    💳 Tarjeta de Pagos
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 text-xs gap-1.5 font-medium"
                onClick={handleCopyMarkdown}
              >
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copiado" : "Copiar .MD"}
              </Button>

              <Button
                type="button"
                variant="default"
                size="sm"
                className="h-10 text-xs gap-2 font-bold px-4 shadow-sm"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4" />
                Descargar PDF / Imprimir
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Main 2-Column Split Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          {/* Left Column: Form Editor (4 cols) */}
          <div className="lg:col-span-5 xl:col-span-4 border-r overflow-y-auto p-5 bg-card/60 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Datos del Documento
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                onClick={resetDefaults}
              >
                <RotateCcw className="h-3 w-3" /> Restaurar
              </Button>
            </div>

            {/* Section: Importe a Amparar según tipo de documento */}
            {docType === "pagare" ? (
              <div className="p-3.5 rounded-xl border bg-primary/5 border-primary/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-primary" /> Monto del Pagaré (Inmutable)
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono">Título Ejecutivo</Badge>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-xs text-muted-foreground">Total del Contrato:</span>
                  <span className="text-lg font-black text-primary">${paramsPagare.monto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono uppercase">
                  ({paramsPagare.montoLetras})
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight pt-1 border-t border-primary/10">
                  * El pagaré ampara el valor contractual total pactado al momento del desembolso.
                </p>
              </div>
            ) : docType === "carta_adeudo" ? (
              <div className="space-y-3 p-3.5 rounded-xl border bg-background/80 shadow-xs">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-primary" /> Carta de adeudo sin monto visible
                </Label>
                <p className="text-xs text-muted-foreground">
                  La cantidad quedó eliminada del formato final. La vista previa y la impresión usan la misma plantilla legal sin selector saldo/total.
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border bg-emerald-500/5 border-emerald-500/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-600" /> Plan del Préstamo
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono">{paramsTarjeta.plazoSemanas} semanas</Badge>
                </div>
                <div className="flex items-baseline justify-between pt-1 text-xs">
                  <span className="text-muted-foreground">Monto Otorgado:</span>
                  <span className="font-bold text-foreground">${Number(paramsTarjeta.montoOtorgado).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-muted-foreground">Ficha Semanal:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">${Number(paramsTarjeta.valorFicha).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}

            {/* Section: Datos del Deudor */}
            <div className="space-y-3 p-3.5 rounded-xl border bg-background/80 shadow-xs">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" /> Datos del Deudor
              </Label>

              <div className="space-y-2.5 text-xs">
                <div>
                  <Label htmlFor="nombreCliente" className="text-[11px] text-muted-foreground">
                    Nombre Completo
                  </Label>
                  <Input
                    id="nombreCliente"
                    value={nombreCliente}
                    onChange={(e) => setNombreCliente(e.target.value)}
                    className="h-9 text-sm mt-1"
                    placeholder="Nombre del cliente"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="curp" className="text-[11px] text-muted-foreground">
                      CURP
                    </Label>
                    <Input
                      id="curp"
                      value={curp}
                      onChange={(e) => setCurp(e.target.value)}
                      className="h-9 text-xs mt-1 font-mono uppercase"
                      placeholder="18 caracteres"
                    />
                  </div>
                  <div>
                    <Label htmlFor="claveElector" className="text-[11px] text-muted-foreground">
                      Clave de Elector (INE)
                    </Label>
                    <Input
                      id="claveElector"
                      value={claveElector}
                      onChange={(e) => setClaveElector(e.target.value)}
                      className="h-9 text-xs mt-1 font-mono uppercase"
                      placeholder="Clave INE"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="direccion" className="text-[11px] text-muted-foreground">
                    Dirección Particular
                  </Label>
                  <Input
                    id="direccion"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    className="h-9 text-sm mt-1"
                    placeholder="Calle y número"
                  />
                </div>

                <div>
                  <Label htmlFor="entreCalles" className="text-[11px] text-muted-foreground">
                    Entre Calles / Referencias
                  </Label>
                  <Input
                    id="entreCalles"
                    value={entreCalles}
                    onChange={(e) => setEntreCalles(e.target.value)}
                    className="h-9 text-sm mt-1"
                    placeholder="Entre qué calles se ubica"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="telefono" className="text-[11px] text-muted-foreground">
                      Teléfono
                    </Label>
                    <Input
                      id="telefono"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      className="h-9 text-xs mt-1"
                      placeholder="Teléfono de contacto"
                    />
                  </div>
                  <div>
                    <Label htmlFor="comprobante" className="text-[11px] text-muted-foreground">
                      Comprobante Domicilio
                    </Label>
                    <Input
                      id="comprobante"
                      value={tipoComprobante}
                      onChange={(e) => setTipoComprobante(e.target.value)}
                      className="h-9 text-xs mt-1"
                      placeholder="COMAPA / CFE / TELMEX"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Referencias (Only for Tarjeta de Cobro) */}
            {docType === "tarjeta_cobro" && (
              <div className="space-y-3 p-3.5 rounded-xl border bg-background/80 shadow-xs">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Users2 className="h-3.5 w-3.5 text-primary" /> Referencias Personales
                </Label>

                {/* Referencia Familiar */}
                <div className="p-2.5 rounded-lg bg-muted/40 space-y-2 border">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold">1. Ref. Familiar</span>
                    <Input
                      value={refFamParentesco}
                      onChange={(e) => setRefFamParentesco(e.target.value)}
                      className="h-6 w-28 text-[11px]"
                      placeholder="HERMANO"
                    />
                  </div>
                  <Input
                    value={refFamNombre}
                    onChange={(e) => setRefFamNombre(e.target.value)}
                    className="h-8 text-xs"
                    placeholder="Nombre completo"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={refFamCel}
                      onChange={(e) => setRefFamCel(e.target.value)}
                      className="h-8 text-xs"
                      placeholder="Celular"
                    />
                    <Input
                      value={refFamDireccion}
                      onChange={(e) => setRefFamDireccion(e.target.value)}
                      className="h-8 text-xs"
                      placeholder="Dirección"
                    />
                  </div>
                </div>

                {/* Referencia Personal */}
                <div className="p-2.5 rounded-lg bg-muted/40 space-y-2 border">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold">2. Ref. Amistad / Personal</span>
                    <Input
                      value={refPerTipo}
                      onChange={(e) => setRefPerTipo(e.target.value)}
                      className="h-6 w-28 text-[11px]"
                      placeholder="AMISTAD"
                    />
                  </div>
                  <Input
                    value={refPerNombre}
                    onChange={(e) => setRefPerNombre(e.target.value)}
                    className="h-8 text-xs"
                    placeholder="Nombre completo"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={refPerCel}
                      onChange={(e) => setRefPerCel(e.target.value)}
                      className="h-8 text-xs"
                      placeholder="Celular"
                    />
                    <Input
                      value={refPerDireccion}
                      onChange={(e) => setRefPerDireccion(e.target.value)}
                      className="h-8 text-xs"
                      placeholder="Dirección"
                    />
                  </div>
                </div>

                {/* Multas Retardo */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Multa Horario ($)</Label>
                    <Input
                      value={multaHorario}
                      onChange={(e) => setMultaHorario(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Multa Día ($)</Label>
                    <Input
                      value={multaDia}
                      onChange={(e) => setMultaDia(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Section: Acreedor y Condiciones */}
            <div className="space-y-3 p-3.5 rounded-xl border bg-background/80 shadow-xs">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-primary" /> Acreedor y Lugar
              </Label>

              <div className="space-y-2.5 text-xs">
                <div>
                  <Label htmlFor="acreedor" className="text-[11px] text-muted-foreground">
                    Acreedor / Empresa
                  </Label>
                  <Input
                    id="acreedor"
                    value={nombreAcreedor}
                    onChange={(e) => setNombreAcreedor(e.target.value)}
                    className="h-9 text-sm mt-1"
                    placeholder="AGC SERVICIOS FINANCIEROS"
                  />
                </div>

                {docType !== "tarjeta_cobro" && (
                  <div>
                    <Label htmlFor="domicilioPago" className="text-[11px] text-muted-foreground">
                      Domicilio de Pago
                    </Label>
                    <Input
                      id="domicilioPago"
                      value={domicilioPago}
                      onChange={(e) => setDomicilioPago(e.target.value)}
                      className="h-9 text-xs mt-1"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="tasa" className="text-[11px] text-muted-foreground">
                      Tasa Moratoria
                    </Label>
                    <Input
                      id="tasa"
                      value={tasaMoratoria}
                      onChange={(e) => setTasaMoratoria(e.target.value)}
                      className="h-9 text-xs mt-1"
                      placeholder="20%"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lugar" className="text-[11px] text-muted-foreground">
                      Lugar Expedición
                    </Label>
                    <Input
                      id="lugar"
                      value={lugarExpedicion}
                      onChange={(e) => setLugarExpedicion(e.target.value)}
                      className="h-9 text-xs mt-1"
                      placeholder="TAMPICO, TAMPS."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Testigo (for Pagaré / Carta de Adeudo) */}
            {docType !== "tarjeta_cobro" && (
              <div className="space-y-3 p-3.5 rounded-xl border bg-background/80 shadow-xs">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Testigo / Aval
                </Label>
                <div>
                  <Label htmlFor="testigo" className="text-[11px] text-muted-foreground">
                    Nombre del Testigo
                  </Label>
                  <Input
                    id="testigo"
                    value={nombreTestigo}
                    onChange={(e) => setNombreTestigo(e.target.value)}
                    className="h-9 text-sm mt-1"
                    placeholder="Nombre completo del testigo"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live Document Preview (8 cols) */}
          <div className="lg:col-span-7 xl:col-span-8 overflow-y-auto p-6 md:p-10 bg-zinc-100 dark:bg-zinc-950 flex justify-center items-start">
            <div className="bg-white text-zinc-900 shadow-2xl border border-zinc-200 w-full max-w-[760px] p-6 md:p-10 rounded-sm leading-relaxed transition-all min-h-[880px]">
              {docType === "pagare" && (
                <div className="space-y-6 font-serif text-sm">
                  {/* Header Title */}
                  <div className="text-center font-bold text-2xl tracking-[0.35em] uppercase border-b-2 border-zinc-900 pb-4">
                    P A G A R E
                  </div>

                  {/* Meta Bar */}
                  <div className="flex justify-between items-center font-bold text-sm border-b border-zinc-300 pb-2">
                    <div>NO. {paramsPagare.noPagare}</div>
                    <div>
                      BUENO POR: ${Number(paramsPagare.monto).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Location & Date */}
                  <div className="font-bold text-xs uppercase">
                    EN {paramsPagare.lugarExpedicion}, A {paramsPagare.fechaExpedicionLetras}.
                  </div>

                  {/* Main Promise Body */}
                  <div className="text-justify indent-8 text-sm leading-relaxed">
                    …..DEBO Y PAGARE INCONDICIONALMENTE, POR ESTE PAGARE A LA ORDEN DE{" "}
                    <strong>{paramsPagare.nombreAcreedor}</strong>, LA CANTIDAD DE{" "}
                    <strong>
                      ${Number(paramsPagare.monto).toLocaleString("es-MX", { minimumFractionDigits: 2 })} (
                      {paramsPagare.montoLetras})
                    </strong>
                    , EN EL DOMICILIO <strong>{paramsPagare.domicilioPago}</strong>, EL DIA{" "}
                    <strong>{paramsPagare.diaVencimiento}</strong> DEL MES DE{" "}
                    <strong>{paramsPagare.mesVencimiento}</strong> DEL AÑO{" "}
                    <strong>{paramsPagare.anioVencimiento}</strong>, LA CANTIDAD DE{" "}
                    <strong>
                      ${Number(paramsPagare.monto).toLocaleString("es-MX", { minimumFractionDigits: 2 })} (
                      {paramsPagare.montoLetras})
                    </strong>
                    .
                  </div>

                  {/* Terms */}
                  <div className="text-justify text-sm leading-relaxed">
                    VALOR RECIBIDO A ENTERA SATISFACCIÓN. ESTE PAGARE FORMA PARTE DE UNA SERIE NUMERADA
                    DE {paramsPagare.serieActual} DE {paramsPagare.serieTotal} Y ESTA SUJETO A LAS CONDICIONES DE
                    QUE, AL NO PAGARSE A SU VENCIMIENTO DE ESTE DOCUMENTO HASTA EL TIEMPO DE SU
                    LIQUIDACIÓN, CAUSARA INTERESES MORATORIOS AL TIPO DEL{" "}
                    <strong>{paramsPagare.tasaInteresMoratorio} MENSUAL</strong>, PAGADERO EN ESTA CIUDAD
                    JUSTAMENTE CON EL PRINCIPIO.
                  </div>

                  {/* Official ID */}
                  <div className="text-justify text-sm leading-relaxed">
                    SE RECIBE COMO IDENTIFICACION OFICIAL COPIA DE SU IDENTIFICACION INE CON CLAVE
                    ELECTOR <strong>{paramsPagare.claveElector}</strong>, COMPROBANTE DE DOMICILIO DE{" "}
                    <strong>{paramsPagare.tipoComprobante}</strong> QUE RATIFICA EL DOMICILIO PARTICULAR DE LA
                    PARTE ADEUDORA.
                  </div>

                  <div className="border-t border-dashed border-zinc-400 my-6"></div>

                  {/* Debtor & Acceptance Block */}
                  <div className="grid grid-cols-2 gap-8 pt-2 text-xs">
                    <div className="space-y-1">
                      <div className="font-bold text-sm mb-2 uppercase tracking-wider">
                        DATOS DEL DEUDOR:
                      </div>
                      <p><strong>NOMBRE:</strong> {paramsPagare.nombreCliente}</p>
                      <p><strong>CURP:</strong> {paramsPagare.curp}</p>
                      <p><strong>DIRECCIÓN:</strong> {paramsPagare.direccion}</p>
                      {paramsPagare.entreCalles && (
                        <p><strong>ENTRE CALLES:</strong> {paramsPagare.entreCalles}</p>
                      )}
                      <p><strong>CIUDAD / ESTADO:</strong> {paramsPagare.ciudadEstadoCp}</p>
                      <p><strong>TELÉFONO:</strong> {paramsPagare.telefono}</p>
                    </div>

                    <div className="text-center flex flex-col justify-between">
                      <div className="font-bold text-sm tracking-[0.3em] uppercase">
                        A C E P T O :
                      </div>
                      <div className="mt-14">
                        <div className="border-t-2 border-zinc-900 pt-2 font-bold text-xs">
                          {paramsPagare.nombreCliente}
                        </div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                          FIRMA DEL DEUDOR
                        </div>
                      </div>
                    </div>
                  </div>

                  {paramsPagare.nombreAval && (
                    <div className="border-t border-dashed border-zinc-400 pt-5 text-xs space-y-1">
                      <div className="font-bold text-sm uppercase tracking-wider">Datos del Aval:</div>
                      <p><strong>NOMBRE:</strong> {paramsPagare.nombreAval}</p>
                      <p><strong>DIRECCIÓN:</strong> {paramsPagare.direccionAval}</p>
                      <p><strong>TELÉFONO:</strong> {paramsPagare.telefonoAval}</p>
                      <p className="font-semibold pt-2">{paramsPagare.aceptacionAval}</p>
                      <div className="pt-8 max-w-sm mx-auto flex flex-col items-center justify-center text-center">
                        <div className="w-full border-t-2 border-zinc-900 pt-2 font-bold text-xs text-center">
                          {paramsPagare.nombreAval}
                        </div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5 text-center">
                          FIRMA DEL AVAL
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {docType === "carta_adeudo" && (
                <div className="space-y-6 font-serif text-sm">
                  {/* Header Title */}
                  <div className="text-center font-bold text-2xl tracking-[0.3em] uppercase border-b-2 border-zinc-900 pb-4">
                    C A R T A &nbsp;&nbsp; A D E U D O
                  </div>

                  {/* Recipient */}
                  <div className="font-bold text-sm tracking-wider">A QUIEN CORRESPONDA:</div>

                  {/* Body Paragraph */}
                  <div className="text-justify indent-8 text-sm leading-relaxed">
                    …..EL (LA) QUE SUSCRIBE <strong>{paramsCartaAdeudo.nombreCliente}</strong>, ORIGINARIO (A) DE
                    CIUDAD DE <strong>{paramsCartaAdeudo.ciudadOrigen}</strong>, CON DOMICILIO PARTICULAR EN{" "}
                    <strong>{paramsCartaAdeudo.direccion}</strong>
                    {paramsCartaAdeudo.entreCalles ? `, ENTRE ${paramsCartaAdeudo.entreCalles}` : ""}, RECONOZCO EL ADEUDO
                    CONTRAIDO CON EL SR. (A) <strong>{paramsCartaAdeudo.nombreAcreedor}</strong>, AMPARADO EN EL
                    PAGARE <strong>{paramsCartaAdeudo.serieActual} DE {paramsCartaAdeudo.serieTotal}</strong> DE FECHA{" "}
                    <strong>{paramsCartaAdeudo.fechaExpedicionLetras}</strong>, BAJO LAS CONDICIONES QUE INDICA REFERIDO PAGARE.
                  </div>

                  <div className="text-justify text-sm leading-relaxed">
                    PRESTAMO QUE FUE OTORGADO Y RECIBIDO A LA VEZ SIN FINES DE LUCRO, Y COMO APOYO
                    PERSONAL EN FORMA DE CONFIANZA AMISTOSA.
                  </div>

                  <div className="text-justify text-sm leading-relaxed">
                    POR LO CUAL PROPORCIONE POR VOLUNTAD PROPIA COMO IDENTIFICACION OFICIAL COPIA DE
                    IDENTIFICACION OFICIAL INE CON CLAVE ELECTOR <strong>{paramsCartaAdeudo.claveElector}</strong>,
                    Y COMPROBANTE DE DOMICILIO DE <strong>{paramsCartaAdeudo.tipoComprobante}</strong> QUE RATIFICA
                    MI DOMICILIO PARTICULAR.
                  </div>

                  <div className="text-justify text-sm leading-relaxed">
                    SIN MAS POR EL MOMENTO, LO QUE HAGO DE SU CONOCIMIENTO PARA LOS EFECTOS LEGALES A LOS
                    QUE DE LUGAR LA PRESENTE.
                  </div>

                  <div className="font-bold text-xs uppercase pt-2">
                    EN {paramsCartaAdeudo.lugarExpedicion}, A {paramsCartaAdeudo.fechaExpedicionLetras}.
                  </div>

                  <div className="text-center font-bold text-sm tracking-widest pt-4">
                    ATENTAMENTE
                  </div>

                  {/* Signatures */}
                  <div className="grid grid-cols-2 gap-10 pt-10 text-center text-xs">
                    <div>
                      <div className="font-bold mb-12 tracking-wider">EL DEUDOR</div>
                      <div className="border-t-2 border-zinc-900 pt-2 font-bold text-xs">
                        {paramsCartaAdeudo.nombreCliente}
                      </div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                        FIRMA
                      </div>
                    </div>

                    <div>
                      <div className="font-bold mb-12 tracking-wider">TESTIGO</div>
                      <div className="border-t-2 border-zinc-900 pt-2 font-bold text-xs">
                        {paramsCartaAdeudo.nombreTestigo || "_____________________________"}
                      </div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                        FIRMA
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {docType === "tarjeta_cobro" && (
                <div className="space-y-3 font-sans text-[11px] leading-tight">
                  {/* Header */}
                  <div className="text-center pb-1">
                    <h1 className="text-base font-black tracking-widest uppercase">{paramsTarjeta.empresa}</h1>
                    <h2 className="text-xs font-bold tracking-wider">{paramsTarjeta.subtitulo}</h2>
                    <div className="bg-zinc-200 text-zinc-900 font-bold text-xs tracking-wider uppercase py-0.5 mt-1 border border-zinc-900">
                      {paramsTarjeta.titulo}
                    </div>
                  </div>

                  {/* Client Metadata Grid */}
                  <div className="border border-zinc-900 overflow-hidden text-[10px]">
                    <div className="grid grid-cols-12 border-b border-zinc-900">
                      <div className="col-span-2 bg-zinc-100 font-bold p-1 border-r border-zinc-900">CLIENTE:</div>
                      <div className="col-span-6 font-bold p-1 border-r border-zinc-900">{paramsTarjeta.nombreCliente}</div>
                      <div className="col-span-2 bg-zinc-100 font-bold p-1 border-r border-zinc-900">TASA:</div>
                      <div className="col-span-2 font-bold p-1">{paramsTarjeta.tasa}</div>
                    </div>

                    <div className="grid grid-cols-12 border-b border-zinc-900">
                      <div className="col-span-2 bg-zinc-100 font-bold p-1 border-r border-zinc-900">DOMICILIO:</div>
                      <div className="col-span-10 p-1">{paramsTarjeta.domicilio}</div>
                    </div>

                    <div className="grid grid-cols-12 border-b border-zinc-900">
                      <div className="col-span-2 bg-zinc-100 font-bold p-1 border-r border-zinc-900">CEL. CLIENTE:</div>
                      <div className="col-span-4 p-1 border-r border-zinc-900">{paramsTarjeta.celCliente}</div>
                      <div className="col-span-3 bg-zinc-100 font-bold p-1 border-r border-zinc-900">MONTO OTORGADO:</div>
                      <div className="col-span-3 font-bold p-1">${Number(paramsTarjeta.montoOtorgado).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</div>
                    </div>

                    <div className="grid grid-cols-12 border-b border-zinc-900">
                      <div className="col-span-2 bg-zinc-100 font-bold p-1 border-r border-zinc-900">ID:</div>
                      <div className="col-span-4 font-mono p-1 border-r border-zinc-900">{paramsTarjeta.idCliente}</div>
                      <div className="col-span-3 bg-zinc-100 font-bold p-1 border-r border-zinc-900">PLAZO:</div>
                      <div className="col-span-3 font-bold p-1">{paramsTarjeta.plazoSemanas} SEMANAS</div>
                    </div>

                    <div className="grid grid-cols-12 border-b border-zinc-900">
                      <div className="col-span-2 bg-zinc-100 font-bold p-1 border-r border-zinc-900">CICLO ACTUAL:</div>
                      <div className="col-span-4 p-1 border-r border-zinc-900">{paramsTarjeta.cicloActual}</div>
                      <div className="col-span-3 bg-zinc-100 font-bold p-1 border-r border-zinc-900">CICLO ANTERIOR:</div>
                      <div className="col-span-3 p-1">{paramsTarjeta.cicloAnterior}</div>
                    </div>

                    <div className="grid grid-cols-12">
                      <div className="col-span-2 bg-zinc-100 font-bold p-1 border-r border-zinc-900">FECHA INICIO:</div>
                      <div className="col-span-4 p-1 border-r border-zinc-900">{paramsTarjeta.fechaInicio}</div>
                      <div className="col-span-3 bg-zinc-100 font-bold p-1 border-r border-zinc-900">FECHA TERMINO:</div>
                      <div className="col-span-3 p-1 font-bold">{paramsTarjeta.fechaTermino}</div>
                    </div>
                  </div>

                  {/* References Grid */}
                  <div className="border border-zinc-900 overflow-hidden text-[9.5px]">
                    <div className="grid grid-cols-12 border-b border-zinc-900">
                      <div className="col-span-4 bg-zinc-100 font-bold p-1 border-r border-zinc-900">
                        REF. FAM. ({paramsTarjeta.refFamParentesco})
                      </div>
                      <div className="col-span-5 p-1 border-r border-zinc-900">{paramsTarjeta.refFamNombre}</div>
                      <div className="col-span-1 bg-zinc-100 font-bold p-1 border-r border-zinc-900">CEL.</div>
                      <div className="col-span-2 p-1">{paramsTarjeta.refFamCel}</div>
                    </div>
                    <div className="p-1 text-[8.5px] text-zinc-600 border-b border-zinc-900 bg-zinc-50/50">
                      {paramsTarjeta.refFamDireccion}
                    </div>

                    <div className="grid grid-cols-12 border-b border-zinc-900">
                      <div className="col-span-4 bg-zinc-100 font-bold p-1 border-r border-zinc-900">
                        REF. ({paramsTarjeta.refPerTipo})
                      </div>
                      <div className="col-span-5 p-1 border-r border-zinc-900">{paramsTarjeta.refPerNombre}</div>
                      <div className="col-span-1 bg-zinc-100 font-bold p-1 border-r border-zinc-900">CEL.</div>
                      <div className="col-span-2 p-1">{paramsTarjeta.refPerCel}</div>
                    </div>
                    <div className="p-1 text-[8.5px] text-zinc-600 border-b border-zinc-900 bg-zinc-50/50">
                      {paramsTarjeta.refPerDireccion}
                    </div>

                    <div className="grid grid-cols-12 border-b border-zinc-900">
                      <div className="col-span-4 bg-zinc-100 font-bold p-1 border-r border-zinc-900">OCUPACION:</div>
                      <div className="col-span-4 p-1 border-r border-zinc-900">{paramsTarjeta.ocupacionLaboral}</div>
                      <div className="col-span-2 bg-zinc-100 font-bold p-1 border-r border-zinc-900">TEL. TRABAJO:</div>
                      <div className="col-span-2 p-1">{paramsTarjeta.telefonoTrabajo}</div>
                    </div>
                    <div className="grid grid-cols-12 border-b border-zinc-900">
                      <div className="col-span-3 bg-zinc-100 font-bold p-1 border-r border-zinc-900">EMPRESA:</div>
                      <div className="col-span-9 p-1">{paramsTarjeta.empresaTrabajo}</div>
                    </div>
                    <div className="grid grid-cols-12 border-b border-zinc-900">
                      <div className="col-span-3 bg-zinc-100 font-bold p-1 border-r border-zinc-900">DIR. TRABAJO:</div>
                      <div className="col-span-9 p-1">{paramsTarjeta.direccionTrabajo}</div>
                    </div>
                    <div className="grid grid-cols-12">
                      <div className="col-span-3 bg-zinc-100 font-bold p-1 border-r border-zinc-900">ASESOR:</div>
                      <div className="col-span-9 font-bold p-1">{paramsTarjeta.nombreAsesor}</div>
                    </div>
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

                    {paramsTarjeta.pagos.map((pago, index) => (
                      <div
                        key={pago.semana}
                        className={`grid grid-cols-12 border-b border-zinc-300 py-0.5 items-center ${
                          index % 2 === 1 ? "bg-zinc-50" : ""
                        }`}
                      >
                        <div className="col-span-2 text-center font-mono border-r border-zinc-300">{pago.fecha}</div>
                        <div className="col-span-3 text-center font-semibold border-r border-zinc-300">{pago.semanaTexto}</div>
                        <div className="col-span-2 text-right pr-2 font-bold border-r border-zinc-300">
                          ${Number(pago.monto).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </div>
                        <div className="col-span-1 border-r border-zinc-300 h-4"></div>
                        <div className="col-span-2 border-r border-zinc-300 h-4"></div>
                        <div className="col-span-2 h-4"></div>
                      </div>
                    ))}
                  </div>

                  {/* Multas & Signature */}
                  <div className="border border-zinc-900 grid grid-cols-12 text-[9.5px]">
                    <div className="col-span-5 border-r border-zinc-900 p-1.5 space-y-1">
                      <div className="flex justify-between">
                        <span className="font-bold">RETARDO EN HORARIO:</span>
                        <span className="font-bold">${paramsTarjeta.multaHorario}.00</span>
                      </div>
                      <div className="flex justify-between border-t border-zinc-300 pt-1">
                        <span className="font-bold">RETARDO POR DIA:</span>
                        <span className="font-bold">${paramsTarjeta.multaDia}.00</span>
                      </div>
                    </div>

                    <div className="col-span-7 p-1.5 text-center flex flex-col justify-between">
                      <span className="font-bold text-[9px] uppercase">ACEPTO PLAZO Y CONDICIONES</span>
                      <div className="mt-4 border-t border-zinc-900 pt-0.5 text-[8.5px] font-bold">
                        {paramsTarjeta.nombreCliente} (FIRMA)
                      </div>
                    </div>
                  </div>

                  {/* Warning and Rules */}
                  <div className="border border-zinc-900 p-2 text-[8px] space-y-1">
                    <p className="font-bold text-center text-red-700">
                      EL CIERRE DE PAGO DEBERÁ EFECTUARSE ANTES DE LAS {paramsTarjeta.horaLimitePago} HORAS, A FIN DE EVITAR COBRO DE MULTAS.
                    </p>
                    <ol className="list-decimal pl-3 space-y-0.5 leading-tight text-zinc-700">
                      <li><strong>UN RETRASO:</strong> Pierde derecho de refinanciamiento anticipado y esperar la renovación.</li>
                      <li><strong>DOS RETRASOS:</strong> Con derecho a renovar al término de ciclo, sin aumento de crédito.</li>
                      <li><strong>TRES RETRASOS:</strong> Pierde derecho a renovación, quedando castigados durante dos ciclos.</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
