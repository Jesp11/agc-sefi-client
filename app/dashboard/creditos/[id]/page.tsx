"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft, User, Users, Calendar, DollarSign, Hash, TrendingUp, Clock,
  Table as TableIcon, History, SlidersHorizontal, CalendarCheck, CalendarX,
  CreditCard, AlertTriangle, FileText, ChevronDown, FileDown, FolderArchive,
  Pencil, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { fmtFecha } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RegistrarPagoDialog } from "@/components/registrar-pago-dialog";
import { RefinanciarCreditoDialog } from "@/components/refinanciar-credito-dialog";
import { DocumentoAdeudoDialog, type TipoDocumentoAdeudo } from "@/components/documento-adeudo-dialog";
import { ExpedienteCreditoCard } from "@/components/expediente-credito-card";
import { GrupoDocumentoDialog } from "@/components/grupo-documento-dialog";
import { DistribucionIntegrantesDialog } from "@/components/distribucion-integrantes-dialog";
import { EditarCreditoDialog } from "@/components/editar-credito-dialog";
import { EliminarCreditoDialog } from "@/components/eliminar-credito-dialog";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { marcarEstadoCuotas, totalAbonadoFromPagos } from "@/lib/table-utils";
import { useAuth } from "@/context/auth-context";
import { isAdminRoleName } from "@/lib/authz";

const getDiaSemana = (dateStr: string) => {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  return ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"][new Date(y, m - 1, d).getDay()];
};

const calcFechaUltimoPago = (first: string, plazos: number): string => {
  if (!first || !plazos) return "";
  const [y, m, d] = first.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + (plazos - 1) * 7);
  return date.toISOString().split("T")[0];
};

const generateSchedule = (fechaPrimerPago: string, plazos: number, valorFicha: number) => {
  if (!fechaPrimerPago || !plazos || !valorFicha) return [];
  const [y, m, d] = fechaPrimerPago.split("-").map(Number);
  return Array.from({ length: plazos }, (_, i) => {
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + i * 7);
    return {
      semana: i + 1,
      fecha: date.toISOString().split("T")[0],
      dia: getDiaSemana(date.toISOString().split("T")[0]),
      pago: valorFicha,
    };
  });
};

const estadoStyles: Record<string, string> = {
  Activo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  EnMora: "bg-red-50 text-red-700 border-red-200",
  Finalizado: "bg-blue-50 text-blue-700 border-blue-200",
  Cancelado: "bg-red-50 text-red-700 border-red-200",
  CerradoSinRenovacion: "bg-orange-50 text-orange-700 border-orange-200",
};

type PagoHistorial = {
  id: number;
  monto: number | string;
  fecha: string;
  hora?: string | null;
  metodo_pago?: string | null;
  notas?: string | null;
  tipo: string;
};

export default function CreditoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = isAdminRoleName(user?.role?.nombre);
  const [credito, setCredito] = useState<any>(null);
  const [pagos, setPagos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [docAdeudoOpen, setDocAdeudoOpen] = useState(false);
  const [docAdeudoTipo, setDocAdeudoTipo] = useState<TipoDocumentoAdeudo>("pagare");
  const [grupoDocOpen, setGrupoDocOpen] = useState(false);
  const [distribucionOpen, setDistribucionOpen] = useState(false);
  const [documentoIntegrante, setDocumentoIntegrante] = useState<any>(null);
  const [documentoIntegranteTipo, setDocumentoIntegranteTipo] = useState<TipoDocumentoAdeudo>("pagare");
  const [editingPago, setEditingPago] = useState<PagoHistorial | null>(null);
  const [pagoForm, setPagoForm] = useState({
    monto: "",
    fecha: "",
    hora: "",
    metodo_pago: "Efectivo",
    notas: "",
  });
  const [savingPago, setSavingPago] = useState(false);
  const [syncingPagoId, setSyncingPagoId] = useState<number | null>(null);
  const scheduleControls = useTableControls();
  const pagosControls = useTableControls();

  const fetchData = useCallback(async () => {
    try {
      const [credRes, pagosRes] = await Promise.all([
        apiFetch(`/creditos/${id}`),
        apiFetch(`/creditos/${id}/pagos`),
      ]);
      const credData = await credRes.json();
      if (credRes.ok) setCredito(credData);
      else toast.error("No se pudo cargar la información del crédito");
      if (pagosRes.ok) setPagos(await pagosRes.json());
    } catch {
      toast.error("Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const abrirEdicionPago = (pago: PagoHistorial) => {
    setPagoForm({
      monto: String(pago.monto ?? ""),
      fecha: String(pago.fecha ?? "").slice(0, 10),
      hora: String(pago.hora ?? "").slice(0, 5),
      metodo_pago: pago.metodo_pago ?? "Efectivo",
      notas: pago.notas ?? "",
    });
    setEditingPago(pago);
  };

  const guardarPago = async () => {
    if (!editingPago) return;

    const monto = Number(pagoForm.monto);
    if (!pagoForm.fecha || !Number.isFinite(monto) || monto <= 0) {
      toast.error("Indica una fecha y un monto mayor a cero.");
      return;
    }

    setSavingPago(true);
    try {
      const response = await apiFetch(`/creditos/${id}/pagos/${editingPago.id}`, {
        method: "PUT",
        body: JSON.stringify({
          monto,
          fecha: pagoForm.fecha,
          hora: pagoForm.hora || null,
          metodo_pago: pagoForm.metodo_pago,
          notas: pagoForm.notas || null,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "No se pudo actualizar el abono.");

      toast.success(result.message || "Abono actualizado exitosamente.");
      setEditingPago(null);
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el abono.");
    } finally {
      setSavingPago(false);
    }
  };

  const sincronizarPagoEnCaja = async (pago: PagoHistorial) => {
    setSyncingPagoId(pago.id);
    try {
      const response = await apiFetch(`/creditos/${id}/pagos/${pago.id}/sincronizar-caja`, {
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "No se pudo sincronizar el ingreso.");

      toast.success(result.message || "Ingreso sincronizado con Flujo de Caja.");
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo sincronizar el ingreso.");
    } finally {
      setSyncingPagoId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        <p className="text-muted-foreground animate-pulse">Cargando detalles del crédito...</p>
      </div>
    );
  }

  if (!credito) {
    return (
      <div className="text-center py-10">
        <h2 className="text-xl font-semibold">Crédito no encontrado</h2>
        <Button onClick={() => router.back()} variant="ghost" className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
      </div>
    );
  }

  const mora = credito.mora || {};
  const fechaUltimoPago = calcFechaUltimoPago(credito.fecha_primer_pago, credito.plazos);
  const scheduleBase = generateSchedule(credito.fecha_primer_pago, credito.plazos, credito.valor_ficha);
  const schedule = marcarEstadoCuotas(
    scheduleBase,
    totalAbonadoFromPagos(pagos) + (Number(credito.abonos_historicos) || 0),
  );
  const scheduleFiltered = filterBySearch(schedule, scheduleControls.search, (r) => [
    r.semana, r.fecha, r.pago, r.estado_pago,
  ]);
  const schedulePaginated = paginateItems(scheduleFiltered, scheduleControls.page);
  const pagosRecientes = [...pagos].sort((a, b) => {
    const fechaCmp = String(b.fecha ?? "").localeCompare(String(a.fecha ?? ""));
    if (fechaCmp !== 0) return fechaCmp;
    const horaCmp = String(b.hora ?? "").localeCompare(String(a.hora ?? ""));
    if (horaCmp !== 0) return horaCmp;
    return (Number(b.id) || 0) - (Number(a.id) || 0);
  });
  const pagosFiltered = filterBySearch(pagosRecientes, pagosControls.search, (p) => [p.fecha, p.tipo, p.metodo_pago, p.monto]);
  const pagosPaginated = paginateItems(pagosFiltered, pagosControls.page);

  const plazos = Number(credito.plazos) || 0;
  const saldoActual = Number(mora.saldo_actual ?? credito.saldo_pendiente ?? credito.total) || 0;
  const pagosCubiertos = schedule.filter((c) => c.estado_pago === "Pagado").length;
  const pagoActual = saldoActual <= 0 || credito.estado === "Finalizado"
    ? plazos
    : Math.min(plazos, pagosCubiertos + 1);
  const ultimoAbono = pagosRecientes.find((p) => p.tipo === "Abono") ?? mora.ultimo_abono ?? null;
  const puedeRegistrarPago = saldoActual > 0 && ["Activo", "EnMora"].includes(credito.estado);

  const isGrupal = credito.tipo_credito === "Grupal";
  const integrantesGrupo: any[] = credito.grupo?.clientes ?? [];
  const distribuciones: any[] = credito.distribuciones_integrantes ?? [];
  const conciliacion = credito.distribucion_documental ?? {};
  const documentosIntegrantesHabilitados = Boolean(conciliacion.documentos_habilitados);
  const renovacionComoNueva = Array.isArray(credito.refinanciamientos) ? credito.refinanciamientos[0] : null;
  const renovacionComoAnterior = Array.isArray(credito.refinanciamientos_como_anterior) ? credito.refinanciamientos_como_anterior[0] : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button onClick={() => router.back()} variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-foreground/90">Detalle del Préstamo</h1>
              <Badge className={estadoStyles[credito.estado] ?? "bg-muted text-muted-foreground"}>{credito.estado}</Badge>
              {credito.dias_pago && (
                <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary font-semibold gap-1">
                  <Calendar className="h-3 w-3" /> Día de pago: {credito.dias_pago}
                </Badge>
              )}
              {credito.es_adicional && <Badge variant="outline">Adicional</Badge>}
              {credito.es_personalizado && (
                <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 gap-1">
                  <SlidersHorizontal className="h-3 w-3" /> Personalizado
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Hash className="h-3.5 w-3.5" /> Folio #{credito.num_prog}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && <EditarCreditoDialog credito={credito} onSuccess={fetchData} />}
          {isAdmin && (
            <EliminarCreditoDialog
              numProg={credito.num_prog}
              tipoCredito={credito.tipo_credito}
              onDeleted={() => router.replace(credito.tipo_credito === "Grupal" ? "/dashboard/creditos-grupales" : "/dashboard/creditos-individuales")}
            />
          )}
          {credito.tipo_credito === "Individual" && saldoActual > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm" className="h-9 gap-1.5 font-semibold text-xs">
                    <FileText className="h-4 w-4 text-primary" />
                    Documentos de Adeudo
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={() => {
                    setDocAdeudoTipo("pagare");
                    setDocAdeudoOpen(true);
                  }}
                  className="cursor-pointer gap-2 py-2"
                >
                  <FileText className="h-4 w-4 text-primary" />
                  <div>
                    <div className="font-semibold text-xs">Descargar Pagaré</div>
                    <div className="text-[10px] text-muted-foreground">PDF / Impresión</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setDocAdeudoTipo("carta_adeudo");
                    setDocAdeudoOpen(true);
                  }}
                  className="cursor-pointer gap-2 py-2"
                >
                  <FileText className="h-4 w-4 text-amber-600" />
                  <div>
                    <div className="font-semibold text-xs">Carta de Adeudo</div>
                    <div className="text-[10px] text-muted-foreground">PDF / Impresión</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setDocAdeudoTipo("tarjeta_cobro");
                    setDocAdeudoOpen(true);
                  }}
                  className="cursor-pointer gap-2 py-2"
                >
                  <FileText className="h-4 w-4 text-emerald-600" />
                  <div>
                    <div className="font-semibold text-xs">Tarjeta de Pagos</div>
                    <div className="text-[10px] text-muted-foreground">PDF / Calendario</div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {credito.tipo_credito === "Grupal" && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 font-semibold text-xs"
              onClick={() => setGrupoDocOpen(true)}
            >
              <FileText className="h-4 w-4 text-primary" />
              Tarjeta de Cobro Grupal
            </Button>
          )}
          {isAdmin && ["Activo", "EnMora"].includes(credito.estado) && saldoActual > 0 && (
            <RefinanciarCreditoDialog
              numProg={credito.num_prog}
              saldoActual={saldoActual}
              tipoCredito={credito.tipo_credito}
              tasaAsignada={credito.tasa_asignada}
              diasPago={credito.dias_pago}
              comisionApertura={credito.comision_apertura}
              onSuccess={fetchData}
            />
          )}
          {puedeRegistrarPago && (
            <RegistrarPagoDialog
              numProg={credito.num_prog}
              valorFicha={credito.valor_ficha}
              saldoPendiente={saldoActual}
              onSuccess={fetchData}
            />
          )}
        </div>
      </div>

      {mora.en_mora && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between gap-2 text-destructive">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Estado en Mora
              </span>
              {credito.tipo_credito === "Individual" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1.5 border-destructive/40 hover:bg-destructive/10 text-destructive font-medium"
                  onClick={() => {
                    setDocAdeudoTipo("carta_adeudo");
                    setDocAdeudoOpen(true);
                  }}
                >
                  <FileDown className="h-3.5 w-3.5" />
                  Carta de Adeudo (PDF)
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div><p className="text-xs text-muted-foreground">Ciclo inicio mora</p><p className="font-bold">{mora.ciclo_inicio_mora ?? "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Días de mora</p><p className="font-bold text-destructive">{mora.dias_mora}</p></div>
              <div><p className="text-xs text-muted-foreground">Total adeudo</p><p className="font-bold">${Number(mora.total_adeudo).toLocaleString()}</p></div>
              <div><p className="text-xs text-muted-foreground">Saldo actual</p><p className="font-bold">${Number(mora.saldo_actual).toLocaleString()}</p></div>
              <div><p className="text-xs text-muted-foreground">Abono recuperación</p><p className="font-bold">{mora.abono_recuperacion ? `$${Number(mora.abono_recuperacion).toLocaleString()}` : "—"}</p></div>
            </div>
          </CardContent>
        </Card>
      )}

      {(renovacionComoNueva || renovacionComoAnterior) && (
        <div className="space-y-4">
          {renovacionComoNueva && (
            <Card className="border-primary/25 bg-primary/5">
              <CardHeader className="pb-2"><CardTitle className="text-base">Renovación</CardTitle></CardHeader>
              <CardContent className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
                <div className="grid gap-1"><span className="text-muted-foreground">Crédito anterior</span><Button variant="link" className="h-auto justify-start p-0" onClick={() => router.push(`/dashboard/creditos/${renovacionComoNueva.credito_anterior?.num_prog ?? renovacionComoNueva.num_prog_anterior}`)}>#{renovacionComoNueva.credito_anterior?.num_prog ?? renovacionComoNueva.num_prog_anterior}</Button></div>
                <div className="grid gap-1"><span className="text-muted-foreground">Fecha efectiva</span><span>{fmtFecha(renovacionComoNueva.fecha_efectiva)}</span></div>
                <div className="grid gap-1"><span className="text-muted-foreground">Saldo absorbido</span><span className="font-semibold">${Number(renovacionComoNueva.saldo_anterior ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span></div>
                <div className="grid gap-1"><span className="text-muted-foreground">Efectivo neto</span><span className="font-semibold">${Number(renovacionComoNueva.monto_neto ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span></div>
              </CardContent>
            </Card>
          )}
          {renovacionComoAnterior && (
            <Card className="border-primary/25 bg-primary/5">
              <CardHeader className="pb-2"><CardTitle className="text-base">Renovado por</CardTitle></CardHeader>
              <CardContent className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
                <div className="grid gap-1"><span className="text-muted-foreground">Crédito nuevo</span><Button variant="link" className="h-auto justify-start p-0" onClick={() => router.push(`/dashboard/creditos/${renovacionComoAnterior.credito_nuevo?.num_prog ?? renovacionComoAnterior.num_prog_nuevo}`)}>#{renovacionComoAnterior.credito_nuevo?.num_prog ?? renovacionComoAnterior.num_prog_nuevo}</Button></div>
                <div className="grid gap-1"><span className="text-muted-foreground">Fecha efectiva</span><span>{fmtFecha(renovacionComoAnterior.fecha_efectiva)}</span></div>
                <div className="grid gap-1"><span className="text-muted-foreground">Saldo absorbido</span><span className="font-semibold">${Number(renovacionComoAnterior.saldo_anterior ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span></div>
                <div className="grid gap-1"><span className="text-muted-foreground">Efectivo neto</span><span className="font-semibold">${Number(renovacionComoAnterior.monto_neto ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span></div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 shadow-sm border-muted/40">
          <CardHeader className="bg-muted/30 border-b pb-3">
            <CardTitle className="text-base flex items-center gap-2 font-bold">
              Información del Contrato
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Tipo</p>
                <div className="flex items-center gap-2 text-sm font-medium">
                  {credito.tipo_credito === "Individual" ? <User className="h-4 w-4 text-primary" /> : <Users className="h-4 w-4 text-primary" />}
                  {credito.tipo_credito}
                </div>
              </div>
              {isGrupal ? (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Grupo</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{credito.grupo?.nombre_grupo ?? "—"}</p>
                    {credito.id_grupo && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() => router.push(`/dashboard/grupos/${credito.id_grupo}`)}
                      >
                        Ver grupo
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Cliente</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{credito.cliente?.nombre_completo ?? "—"}</p>
                    {credito.id_cliente && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() => router.push(`/dashboard/clientes/${credito.id_cliente}`)}
                      >
                        Ver perfil
                      </Button>
                    )}
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Día de Pago</p>
                <div className="flex items-center gap-1.5 text-sm font-semibold">
                  <Calendar className="h-4 w-4 text-primary" />
                  <Badge variant="outline" className="font-bold border-primary/30 bg-primary/10 text-primary">
                    {credito.dias_pago || "No especificado"}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Ciclo</p>
                <Badge variant="outline" className="font-bold">{credito.ciclo}</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Pago semanal</p>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CreditCard className="h-4 w-4 text-primary" />
                  ${Number(credito.valor_ficha ?? 0).toLocaleString()}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Cuota actual</p>
                <p className="text-sm font-semibold">
                  {plazos > 0 ? `Pago ${pagoActual} de ${plazos}` : "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Comisión apertura</p>
                <p className="text-sm font-semibold">${Number(credito.comision_apertura ?? 100).toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Fecha Desembolso</p>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {fmtFecha(credito.fecha_otorgacion)}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Primer Pago</p>
                <div className="flex items-center gap-2 text-sm">
                  <CalendarCheck className="h-4 w-4 text-emerald-600" />
                  {fmtFecha(credito.fecha_primer_pago)}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Último Pago (contrato)</p>
                <div className="flex items-center gap-2 text-sm">
                  <CalendarX className="h-4 w-4 text-rose-500" />
                  {fmtFecha(fechaUltimoPago)}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Expediente Físico</p>
                <div className="flex items-center gap-1.5 text-xs">
                  <FolderArchive className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <span className="font-semibold truncate">
                    {credito.ubicacion_expediente || <span className="text-muted-foreground italic font-normal">Sin asignar</span>}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Gestor / Asesor</p>
                <div className="flex items-center gap-1.5 text-xs">
                  <User className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <span className="font-semibold truncate">
                    {credito.asesor?.nombre_asesor || <span className="text-muted-foreground italic font-normal">Sin asignar</span>}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-muted/40 h-fit">
          <CardHeader className="bg-muted/30 border-b pb-3">
            <CardTitle className="text-base flex items-center gap-2 font-bold">
              <DollarSign className="h-4 w-4 text-primary" /> Estado Financiero
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-5">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Monto Otorgado</p>
              <p className="text-3xl font-bold">${Number(credito.monto_otorgado).toLocaleString()}</p>
            </div>
            <div className="space-y-3 pt-4 border-t border-dashed">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground uppercase flex items-center gap-1"><CreditCard className="h-3 w-3" /> Pago Semanal</span>
                <span className="text-sm font-bold">${Number(credito.valor_ficha ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground uppercase flex items-center gap-1"><Calendar className="h-3 w-3" /> Día de pago</span>
                <span className="text-sm font-bold text-primary">{credito.dias_pago || "—"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground uppercase">Cuota actual</span>
                <span className="text-sm font-bold">{plazos > 0 ? `${pagoActual} / ${plazos}` : "—"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground uppercase">Saldo Pendiente</span>
                <span className="text-sm font-bold text-primary">${saldoActual.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground uppercase">Último abono</span>
                <span className="text-sm font-bold text-right">
                  {ultimoAbono
                    ? `$${Number(ultimoAbono.monto).toLocaleString()} · ${fmtFecha(ultimoAbono.fecha)}`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-sm font-bold uppercase">Total Contrato</span>
                <span className="text-xl font-bold text-primary">${Number(credito.total).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isGrupal && (
        <Card className="shadow-sm border-muted/40">
          <CardHeader className="bg-muted/30 border-b pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base flex items-center gap-2 font-bold">
                <Users className="h-4 w-4 text-primary" />
                Distribución documental por integrante
                {integrantesGrupo.length > 0 && <Badge variant="secondary" className="ml-1 font-normal">{integrantesGrupo.length}</Badge>}
              </CardTitle>
              {isAdmin && <Button size="sm" variant={documentosIntegrantesHabilitados ? "outline" : "default"} onClick={() => setDistribucionOpen(true)}>
                {documentosIntegrantesHabilitados ? "Corregir distribución" : "Registrar distribución"}
              </Button>}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className={`mb-4 rounded-lg border p-3 text-xs grid gap-2 sm:grid-cols-4 ${documentosIntegrantesHabilitados ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
              <div><span className="text-muted-foreground">Capital grupo</span><p className="font-semibold">${Number(conciliacion.capital_grupal ?? credito.monto_otorgado ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p></div>
              <div><span className="text-muted-foreground">Capital integrantes</span><p className="font-semibold">${Number(conciliacion.capital_integrantes ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p></div>
              <div><span className="text-muted-foreground">Total grupo / integrantes</span><p className="font-semibold">${Number(conciliacion.total_grupal ?? credito.total ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })} / ${Number(conciliacion.total_integrantes ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p></div>
              <div className={documentosIntegrantesHabilitados ? "text-emerald-700 font-semibold" : "text-amber-800 font-semibold"}>{documentosIntegrantesHabilitados ? "Documentos individuales habilitados" : "Captura requerida: los documentos están bloqueados"}</div>
            </div>
            {integrantesGrupo.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No hay integrantes registrados en este grupo.
              </p>
            ) : (
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Capital</TableHead>
                    <TableHead className="text-right">Interés</TableHead>
                    <TableHead className="text-right">Total a pagar</TableHead>
                    <TableHead className="text-right">Ficha sem.</TableHead>
                    <TableHead>Folio</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {integrantesGrupo.map((cliente: any) => {
                    const integrante = distribuciones.find((item) => item.id_cliente === cliente.id_cliente);
                    return <TableRow key={cliente.id_cliente}>
                      <TableCell className="font-mono text-xs">{cliente.id_cliente}</TableCell>
                      <TableCell className="font-medium">{integrante?.nombre_cliente || cliente.nombre_completo}</TableCell>
                      <TableCell className="text-right text-sm">{integrante ? `$${Number(integrante.capital).toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : "—"}</TableCell>
                      <TableCell className="text-right text-sm">{integrante ? `$${Number(integrante.interes).toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : "—"}</TableCell>
                      <TableCell className="text-right text-sm">{integrante ? `$${Number(integrante.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : "—"}</TableCell>
                      <TableCell className="text-right text-sm">{integrante ? `$${Number(integrante.valor_ficha).toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{integrante?.folio_documental || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" className="h-7 text-xs" disabled={!documentosIntegrantesHabilitados || !integrante}
                          onClick={() => { setDocumentoIntegrante(integrante); setDocumentoIntegranteTipo("pagare"); }}>
                          Documentos
                        </Button>
                      </TableCell>
                    </TableRow>;
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="amortizacion" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted/40 p-1 h-12">
          <TabsTrigger value="amortizacion"><TableIcon className="h-4 w-4 mr-2" />Calendario</TabsTrigger>
          <TabsTrigger value="historial"><History className="h-4 w-4 mr-2" />Historial de Pagos</TabsTrigger>
          <TabsTrigger value="expediente">
            <FolderArchive className="h-4 w-4 mr-2 text-primary" />
            Expediente ({credito.documentos?.length || 0})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="amortizacion" className="mt-4">
          <Card className="border-muted/40 shadow-sm overflow-hidden">
            {schedule.length > 0 ? (
              <div className="space-y-4 p-4">
                <TableSearch placeholder="Buscar en calendario..." value={scheduleControls.search} onChange={scheduleControls.handleSearch} />
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-16 text-center">#</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scheduleFiltered.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No se encontraron pagos.</TableCell></TableRow>
                    ) : schedulePaginated.map((row) => (
                      <TableRow key={row.semana}>
                        <TableCell className="text-center font-mono text-xs">{row.semana}</TableCell>
                        <TableCell>{fmtFecha(row.fecha)}</TableCell>
                        <TableCell className="text-right font-semibold">${Number(row.pago).toLocaleString()}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={row.estado_pago === "Pagado" ? "default" : "secondary"}
                            className={
                              row.estado_pago === "Pagado"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-50"
                            }
                          >
                            {row.estado_pago}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination page={scheduleControls.page} totalItems={scheduleFiltered.length} pageSize={PAGE_SIZE} onPageChange={scheduleControls.setPage} label="pagos" />
              </div>
            ) : (
              <CardContent className="py-12 text-center text-muted-foreground">Sin calendario de pagos.</CardContent>
            )}
          </Card>
        </TabsContent>
        <TabsContent value="historial" className="mt-4">
          <Card className="border-muted/40 shadow-sm overflow-hidden">
            {pagos.length > 0 ? (
              <div className="space-y-4 p-4">
                <TableSearch placeholder="Buscar en historial..." value={pagosControls.search} onChange={pagosControls.handleSearch} />
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Hora</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      {isAdmin && <TableHead className="text-right">Acciones</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagosFiltered.length === 0 ? (
                      <TableRow><TableCell colSpan={isAdmin ? 6 : 5} className="h-24 text-center text-muted-foreground">No se encontraron pagos.</TableCell></TableRow>
                    ) : pagosPaginated.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{fmtFecha(p.fecha)}</TableCell>
                        <TableCell className="text-xs">{p.hora?.slice(0, 5)}</TableCell>
                        <TableCell><Badge variant={p.tipo === "Multa" ? "destructive" : "outline"}>{p.tipo}</Badge></TableCell>
                        <TableCell className="text-xs">{p.metodo_pago}</TableCell>
                        <TableCell className="text-right font-semibold">${Number(p.monto).toLocaleString()}</TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            {p.tipo === "Abono" ? (
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8"
                                  onClick={() => abrirEdicionPago(p)}
                                >
                                  <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8"
                                  disabled={syncingPagoId === p.id}
                                  onClick={() => sincronizarPagoEnCaja(p)}
                                >
                                  <RefreshCw className={`mr-1 h-3.5 w-3.5 ${syncingPagoId === p.id ? "animate-spin" : ""}`} />
                                  {syncingPagoId === p.id ? "Sincronizando" : "Sincronizar caja"}
                                </Button>
                              </div>
                            ) : "—"}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination page={pagosControls.page} totalItems={pagosFiltered.length} pageSize={PAGE_SIZE} onPageChange={pagosControls.setPage} label="pagos" />
              </div>
            ) : (
              <CardContent className="py-12 text-center text-muted-foreground">Sin pagos registrados.</CardContent>
            )}
          </Card>
        </TabsContent>
        <TabsContent value="expediente" className="mt-4">
          <ExpedienteCreditoCard
            credito={credito}
            canEdit={isAdmin}
            onUpdated={fetchData}
            onOpenGenerator={(tipo) => {
              setDocAdeudoTipo(tipo);
              setDocAdeudoOpen(true);
            }}
          />
        </TabsContent>
      </Tabs>

      {credito.tipo_credito === "Individual" && (
        <DocumentoAdeudoDialog
          credito={credito}
          open={docAdeudoOpen}
          onOpenChange={setDocAdeudoOpen}
          defaultDoc={docAdeudoTipo}
        />
      )}
      {isGrupal && (
        <DistribucionIntegrantesDialog
          credito={credito}
          open={distribucionOpen}
          onOpenChange={setDistribucionOpen}
          onSaved={fetchData}
        />
      )}
      {documentoIntegrante && (
        <DocumentoAdeudoDialog
          credito={{
            ...credito,
            cliente: {
              ...(documentoIntegrante.cliente || {}),
              id_cliente: documentoIntegrante.id_cliente,
              nombre_completo: documentoIntegrante.nombre_cliente,
              curp: documentoIntegrante.curp,
              clave_elector: documentoIntegrante.clave_elector,
              telefono: documentoIntegrante.telefono,
              direccion: documentoIntegrante.direccion,
            },
            monto_otorgado: documentoIntegrante.capital,
            interes: documentoIntegrante.interes,
            total: documentoIntegrante.total,
            saldo_pendiente: documentoIntegrante.total,
            valor_ficha: documentoIntegrante.valor_ficha,
            folio_documental: documentoIntegrante.folio_documental,
            mora: {},
          }}
          open={Boolean(documentoIntegrante)}
          onOpenChange={(open) => !open && setDocumentoIntegrante(null)}
          defaultDoc={documentoIntegranteTipo}
        />
      )}
      <Dialog open={Boolean(editingPago)} onOpenChange={(open) => !open && setEditingPago(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar abono</DialogTitle>
            <DialogDescription>
              Si este abono ya tiene un ingreso vinculado, los cambios se reflejarán también en Flujo de Caja.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="pago-monto">Monto</Label>
              <Input id="pago-monto" type="number" min="0.01" step="0.01" value={pagoForm.monto} onChange={(e) => setPagoForm({ ...pagoForm, monto: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="pago-fecha">Fecha</Label>
                <Input id="pago-fecha" type="date" value={pagoForm.fecha} onChange={(e) => setPagoForm({ ...pagoForm, fecha: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pago-hora">Hora</Label>
                <Input id="pago-hora" type="time" value={pagoForm.hora} onChange={(e) => setPagoForm({ ...pagoForm, hora: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pago-metodo">Método de pago</Label>
              <select id="pago-metodo" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={pagoForm.metodo_pago} onChange={(e) => setPagoForm({ ...pagoForm, metodo_pago: e.target.value })}>
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pago-notas">Notas</Label>
              <textarea id="pago-notas" className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm" value={pagoForm.notas} onChange={(e) => setPagoForm({ ...pagoForm, notas: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPago(null)} disabled={savingPago}>Cancelar</Button>
            <Button onClick={guardarPago} disabled={savingPago}>{savingPago ? "Guardando..." : "Guardar cambios"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {credito.tipo_credito === "Grupal" && (
        <GrupoDocumentoDialog
          credito={credito}
          open={grupoDocOpen}
          onOpenChange={setGrupoDocOpen}
        />
      )}
    </div>
  );
}
