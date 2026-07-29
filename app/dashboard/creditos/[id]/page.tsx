"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft, User, Users, Calendar, DollarSign, Hash, TrendingUp, Clock,
  Table as TableIcon, History, SlidersHorizontal, CalendarCheck, CalendarX,
  CreditCard, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { fmtFecha } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { RegistrarPagoDialog } from "@/components/registrar-pago-dialog";
import { RefinanciarCreditoDialog } from "@/components/refinanciar-credito-dialog";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { marcarEstadoCuotas, totalAbonadoFromPagos } from "@/lib/table-utils";
import { useAuth } from "@/context/auth-context";

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

export default function CreditoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role?.nombre === "admin";
  const [credito, setCredito] = useState<any>(null);
  const [pagos, setPagos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
  const schedule = marcarEstadoCuotas(scheduleBase, totalAbonadoFromPagos(pagos));
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
  const tablaAmort = (() => {
    if (!credito.tabla_amortizacion) return null;
    const raw = typeof credito.tabla_amortizacion === "string"
      ? JSON.parse(credito.tabla_amortizacion)
      : credito.tabla_amortizacion;
    return Array.isArray(raw) ? raw[0] : raw;
  })();
  const integrantesExcel: any[] = tablaAmort?.integrantes ?? [];
  const integrantes = integrantesGrupo.length > 0
    ? integrantesGrupo.map((c: any) => ({
        id: c.id_cliente,
        nombre: c.nombre_completo,
        telefono: c.telefono,
        monto: integrantesExcel.find((i: any) => i.id_cliente === c.id_cliente)?.monto_otorgado,
        valor_ficha: integrantesExcel.find((i: any) => i.id_cliente === c.id_cliente)?.valor_ficha,
      }))
    : integrantesExcel.map((i: any) => ({
        id: i.id_cliente,
        nombre: i.nombre,
        telefono: null,
        monto: i.monto_otorgado,
        valor_ficha: i.valor_ficha,
      }));

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
          {isAdmin && ["Activo", "EnMora"].includes(credito.estado) && saldoActual > 0 && (
            <RefinanciarCreditoDialog
              numProg={credito.num_prog}
              saldoActual={saldoActual}
              tipoCredito={credito.tipo_credito}
              tasaAsignada={credito.tasa_asignada}
              diasPago={credito.dias_pago}
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
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" /> Estado en Mora
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><p className="text-xs text-muted-foreground">Ciclo inicio mora</p><p className="font-bold">{mora.ciclo_inicio_mora ?? "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Días de mora</p><p className="font-bold text-destructive">{mora.dias_mora}</p></div>
              <div><p className="text-xs text-muted-foreground">Total adeudo</p><p className="font-bold">${Number(mora.total_adeudo).toLocaleString()}</p></div>
              <div><p className="text-xs text-muted-foreground">Saldo actual</p><p className="font-bold">${Number(mora.saldo_actual).toLocaleString()}</p></div>
              <div><p className="text-xs text-muted-foreground">Abono recuperación</p><p className="font-bold">{mora.abono_recuperacion ? `$${Number(mora.abono_recuperacion).toLocaleString()}` : "—"}</p></div>
            </div>
          </CardContent>
        </Card>
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
                <div className="space-y-1 col-span-2">
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
                <div className="space-y-1 col-span-2">
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
            <CardTitle className="text-base flex items-center gap-2 font-bold">
              <Users className="h-4 w-4 text-primary" />
              Integrantes del Grupo
              {integrantes.length > 0 && (
                <Badge variant="secondary" className="ml-1 font-normal">{integrantes.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {integrantes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No hay integrantes registrados en este grupo.
              </p>
            ) : (
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Teléfono</TableHead>
                    {integrantes.some((i) => i.monto != null) && (
                      <>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead className="text-right">Ficha sem.</TableHead>
                      </>
                    )}
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {integrantes.map((integrante) => (
                    <TableRow key={integrante.id}>
                      <TableCell className="font-mono text-xs">{integrante.id}</TableCell>
                      <TableCell className="font-medium">{integrante.nombre}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{integrante.telefono ?? "—"}</TableCell>
                      {integrantes.some((i) => i.monto != null) && (
                        <>
                          <TableCell className="text-right text-sm">
                            {integrante.monto != null ? `$${Number(integrante.monto).toLocaleString()}` : "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {integrante.valor_ficha != null ? `$${Number(integrante.valor_ficha).toLocaleString()}` : "—"}
                          </TableCell>
                        </>
                      )}
                      <TableCell className="text-right">
                        {integrante.id && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => router.push(`/dashboard/clientes/${integrante.id}`)}
                          >
                            Ver perfil
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="amortizacion" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted/40 p-1 h-12">
          <TabsTrigger value="amortizacion"><TableIcon className="h-4 w-4 mr-2" />Calendario</TabsTrigger>
          <TabsTrigger value="historial"><History className="h-4 w-4 mr-2" />Historial de Pagos</TabsTrigger>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagosFiltered.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No se encontraron pagos.</TableCell></TableRow>
                    ) : pagosPaginated.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{fmtFecha(p.fecha)}</TableCell>
                        <TableCell className="text-xs">{p.hora?.slice(0, 5)}</TableCell>
                        <TableCell><Badge variant={p.tipo === "Multa" ? "destructive" : "outline"}>{p.tipo}</Badge></TableCell>
                        <TableCell className="text-xs">{p.metodo_pago}</TableCell>
                        <TableCell className="text-right font-semibold">${Number(p.monto).toLocaleString()}</TableCell>
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
      </Tabs>
    </div>
  );
}
