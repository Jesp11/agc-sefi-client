"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { fmtFecha } from "@/lib/utils";
import { inversionistaSearchFields } from "@/lib/table-utils";
import {
  Download,
  Printer,
  Landmark,
  TrendingDown,
  Users,
  ShieldCheck,
  History,
  ListFilter,
  Calendar,
  Percent,
} from "lucide-react";
import { exportWorkbook } from "@/lib/report-export";
import { exportarEstadoFinancieroInversionistasPdf } from "@/lib/reporte-inversionistas-pdf";
import { toast } from "sonner";

const fmt = (value: unknown) =>
  `$${Number(value ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function EstadoFinancieroInversionistasPage() {
  const today = new Date().toISOString().slice(0, 10);
  const currentYear = new Date().getFullYear();
  const [fechaInicio, setFechaInicio] = useState("2025-01-01");
  const [fechaFin, setFechaFin] = useState(today);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("resumen");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { search, handleSearch, page, setPage } = useTableControls();
  const {
    search: searchMovs,
    handleSearch: handleSearchMovs,
    page: pageMovs,
    setPage: setPageMovs,
  } = useTableControls();

  const loadData = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("fecha_inicio", fechaInicio);
    params.set("fecha_fin", fechaFin);
    const res = await apiFetch(`/reportes/inversionistas/estado-financiero?${params.toString()}`);
    if (res.ok) {
      const payload = await res.json();
      setData(payload);
      setSelectedId((current) => current ?? payload.inversionistas?.[0]?.id ?? null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [fechaInicio, fechaFin]);

  // Accesos rápidos de fechas
  const setRangoMesActual = () => {
    const start = `${today.slice(0, 8)}01`;
    setFechaInicio(start);
    setFechaFin(today);
  };

  const setRangoAnioActual = () => {
    setFechaInicio(`${currentYear}-01-01`);
    setFechaFin(today);
  };

  const setRangoHistorico = () => {
    setFechaInicio("2025-01-01");
    setFechaFin(today);
  };

  const inversionistas = data?.inversionistas ?? [];
  const filteredInversionistas = filterBySearch(inversionistas, search, (item: any) => [
    ...inversionistaSearchFields(item),
    item.saldo_capital,
    item.tasa_mensual,
    item.compromiso_mensual,
    item.dia_pago,
    item.rendimientos_periodo,
    item.rendimientos_historicos,
  ]);
  const paginatedInversionistas = paginateItems(filteredInversionistas, page);

  const selected = useMemo(
    () => inversionistas.find((item: any) => item.id === selectedId) ?? null,
    [inversionistas, selectedId]
  );

  // Movimientos recopilados
  const todosLosMovimientos = useMemo(() => {
    return inversionistas.flatMap((inv: any) =>
      (inv.movimientos ?? []).map((m: any) => ({
        ...m,
        inversionista_id: inv.id,
        inversionista_nombre: inv.nombre,
      }))
    );
  }, [inversionistas]);

  const movimientosVisibles = useMemo(() => {
    if (selectedId === null) {
      return todosLosMovimientos;
    }
    return todosLosMovimientos.filter((m: any) => m.inversionista_id === selectedId);
  }, [todosLosMovimientos, selectedId]);

  const movimientosFiltrados = filterBySearch(movimientosVisibles, searchMovs, (m: any) => [
    m.inversionista_nombre,
    m.tipo,
    m.descripcion,
    m.fecha,
    m.monto,
  ]);

  const paginatedMovimientos = paginateItems(movimientosFiltrados, pageMovs);

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    try {
      exportWorkbook(
        [
          {
            name: "Estado Financiero",
            rows: inversionistas.map((item: any) => ({
              Inversionista: item.nombre,
              Tipo: item.tipo_entidad || "Persona Fisica",
              Origen: item.origen_fondeo || "",
              "Capital Vigente": Number(item.saldo_capital ?? 0),
              "Tasa Mensual %": `${Number(item.tasa_mensual ?? 0)}%`,
              "Compromiso Mensual": Number(item.compromiso_mensual ?? 0),
              "Día de Pago": item.dia_pago || "",
              "Rendimientos Periodo": Number(item.rendimientos_periodo ?? 0),
              "Rendimientos Históricos": Number(item.rendimientos_historicos ?? 0),
            })),
          },
          {
            name: "Calendario Pagos",
            rows: inversionistas.map((item: any) => ({
              Inversionista: item.nombre,
              "Día de Pago": item.dia_pago || "",
              "Monto Fijo Mensual": Number(item.compromiso_mensual ?? 0),
              "Tasa Nominal": `${Number(item.tasa_mensual ?? 0)}%`,
              "Capital Vigente": Number(item.saldo_capital ?? 0),
            })),
          },
          {
            name: "Cédula Movimientos",
            rows: todosLosMovimientos.map((mov: any) => ({
              Inversionista: mov.inversionista_nombre,
              Fecha: mov.fecha,
              Tipo: mov.tipo,
              Concepto: mov.descripcion || "",
              Monto: Number(mov.monto ?? 0),
            })),
          },
        ],
        `estado_financiero_inversionistas_${fechaInicio}_${fechaFin}.xlsx`
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    if (!data) {
      toast.error("No hay datos cargados para generar el PDF");
      return;
    }
    exportarEstadoFinancieroInversionistasPdf({
      data,
      fechaInicio,
      fechaFin,
      todosLosMovimientos,
    });
  };

  const verMovimientosDeInversionista = (id: number) => {
    setSelectedId(id);
    setActiveTab("movimientos");
  };

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground/90">Estado Financiero de Inversionistas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cédula financiera de fuentes de fondeo, tasas pactadas, compromisos fijos y rendimientos liquidados.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-9 text-xs" onClick={handleExport} disabled={loading || isExporting}>
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "Exportando..." : "Exportar Excel"}
          </Button>
          <Button variant="outline" className="h-9 text-xs" onClick={handlePrint} disabled={loading}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir Reporte
          </Button>
        </div>
      </div>

      {/* Barra de Filtros de Rango de Fechas con Accesos Rápidos */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-muted/40 p-3.5 rounded-xl border">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Desde:</Label>
            <Input
              type="date"
              className="h-8 text-xs w-[140px]"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Hasta:</Label>
            <Input
              type="date"
              className="h-8 text-xs w-[140px]"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground mr-1">Rango rápido:</span>
          <Button size="sm" variant="ghost" className="h-7 text-xs px-2.5" onClick={setRangoMesActual}>
            Mes Actual
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs px-2.5" onClick={setRangoAnioActual}>
            Año {currentYear}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs px-2.5 font-semibold text-primary" onClick={setRangoHistorico}>
            Todo el Histórico
          </Button>
        </div>
      </div>

      {/* Tarjetas KPI de Resumen Financiero Ejecutivo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Card className="p-4 border shadow-sm bg-card hover:border-primary/30 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Capital Total Fondeado
            </span>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Landmark className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-primary mt-2">
            {fmt(data?.resumen?.saldo_capital)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {data?.resumen?.fuentes_activas ?? 0} fuentes activas colocadas
          </p>
        </Card>

        <Card className="p-4 border shadow-sm bg-card hover:border-amber-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Rendimientos Periodo
            </span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-700 mt-2">
            {fmt(data?.resumen?.rendimientos_periodo)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Histórico: {fmt(data?.resumen?.rendimientos_historicos)}
          </p>
        </Card>

        <Card className="p-4 border shadow-sm bg-card hover:border-blue-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Compromiso Mensual Fijo
            </span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-foreground mt-2">
            {fmt(data?.resumen?.compromiso_mensual_total)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Tasa ponderada: {data?.resumen?.tasa_ponderada_mensual ?? 0}% mensual
          </p>
        </Card>
      </div>

      {/* Pestañas de Navegación Analítica */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-lg h-10">
          <TabsTrigger value="resumen" className="text-xs sm:text-sm font-medium">
            <ListFilter className="h-4 w-4 mr-2" />
            Cédula de Inversionistas
          </TabsTrigger>
          <TabsTrigger value="calendario" className="text-xs sm:text-sm font-medium">
            <Calendar className="h-4 w-4 mr-2" />
            Calendario de Pagos
          </TabsTrigger>
          <TabsTrigger value="movimientos" className="text-xs sm:text-sm font-medium">
            <History className="h-4 w-4 mr-2" />
            Movimientos Detallados
          </TabsTrigger>
        </TabsList>

        {/* Pestaña 1: Cédula de Inversionistas */}
        <TabsContent value="resumen" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <TableSearch
              placeholder="Buscar por inversionista, origen o tasa..."
              value={search}
              onChange={handleSearch}
              className="flex-1 max-w-md"
            />
          </div>

          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Inversionista / Fuente</TableHead>
                  <TableHead>Tipo / Origen</TableHead>
                  <TableHead className="text-right">Capital Fondeado</TableHead>
                  <TableHead className="text-center">Tasa Mensual</TableHead>
                  <TableHead className="text-right">Compromiso / Mes</TableHead>
                  <TableHead>Día de Pago</TableHead>
                  <TableHead className="text-right">Pagado en Rango</TableHead>
                  <TableHead className="text-right">Pagado Histórico</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        <p className="text-sm">Cargando estado financiero...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredInversionistas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                      {search ? "No se encontraron fuentes." : "Sin fuentes registradas."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedInversionistas.map((item: any) => (
                    <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-semibold text-foreground text-xs">
                        {item.nombre}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.tipo_entidad || "Persona Fisica"}
                        {item.origen_fondeo && ` (${item.origen_fondeo})`}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary font-mono text-xs">
                        {fmt(item.saldo_capital)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-xs font-mono">
                          {Number(item.tasa_mensual ?? 0)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-foreground font-mono">
                        {fmt(item.compromiso_mensual)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.dia_pago || "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs text-amber-700 font-bold font-mono">
                        {fmt(item.rendimientos_periodo)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground font-mono">
                        {fmt(item.rendimientos_historicos)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs hover:bg-muted"
                            onClick={() => verMovimientosDeInversionista(item.id)}
                          >
                            <History className="mr-1 h-3.5 w-3.5 text-primary" />
                            Movs.
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {!loading && (
            <TablePagination
              page={page}
              totalItems={filteredInversionistas.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              label="inversionistas"
            />
          )}
        </TabsContent>

        {/* Pestaña 2: Calendario y Cronograma de Pagos */}
        <TabsContent value="calendario" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-3.5 rounded-xl border">
            <div>
              <h3 className="text-sm font-bold text-foreground">Cronograma Mensual Recurrente de Rendimientos</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Fechas fijas pactadas, tasas nominales y montos periódicos de desembolso por inversionista.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-300 font-mono py-1 px-2.5 font-bold">
                Compromiso Total: {fmt(data?.resumen?.compromiso_mensual_total)} / mes
              </Badge>
            </div>
          </div>

          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[180px]">Día Programado</TableHead>
                  <TableHead>Inversionista / Fuente</TableHead>
                  <TableHead>Tipo / Entidad</TableHead>
                  <TableHead className="text-right">Capital Fondeado</TableHead>
                  <TableHead className="text-center">Tasa Mensual</TableHead>
                  <TableHead className="text-right">Rendimiento Mensual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        <p className="text-sm">Cargando calendario de pagos...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : inversionistas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      Sin fuentes de fondeo configuradas.
                    </TableCell>
                  </TableRow>
                ) : (
                  [...inversionistas]
                    .sort((a, b) => {
                      const getDayNum = (str: string) => {
                        const m = (str || "").match(/\d+/);
                        return m ? parseInt(m[0], 10) : 99;
                      };
                      return getDayNum(a.dia_pago) - getDayNum(b.dia_pago);
                    })
                    .map((inv: any) => (
                      <TableRow key={`cal-${inv.id}`} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-semibold text-xs text-primary">
                          <span className="inline-flex items-center gap-1.5 bg-primary/10 px-2 py-1 rounded-md text-primary font-medium">
                            <Calendar className="h-3.5 w-3.5" />
                            {inv.dia_pago || "Sin fecha fija"}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium text-foreground text-xs">
                          {inv.nombre}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {inv.tipo_entidad || "Persona Fisica"}
                          {inv.origen_fondeo && ` • ${inv.origen_fondeo}`}
                        </TableCell>
                        <TableCell className="text-right font-bold text-foreground font-mono text-xs">
                          {fmt(inv.saldo_capital)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="text-xs font-mono">
                            {Number(inv.tasa_mensual ?? 0)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-extrabold text-amber-700 font-mono text-xs">
                          {fmt(inv.compromiso_mensual)}
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
              {inversionistas.length > 0 && (
                <tfoot>
                  <TableRow className="bg-muted/60 font-bold border-t-2">
                    <TableCell colSpan={3} className="text-foreground text-xs uppercase tracking-wider">
                      TOTAL COMPROMISO MENSUAL ({inversionistas.length} FUENTES)
                    </TableCell>
                    <TableCell className="text-right text-primary font-mono text-xs">
                      {fmt(data?.resumen?.saldo_capital)}
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono text-muted-foreground">
                      {data?.resumen?.tasa_ponderada_mensual ?? 0}% pond.
                    </TableCell>
                    <TableCell className="text-right text-amber-700 font-mono text-xs font-extrabold">
                      {fmt(data?.resumen?.compromiso_mensual_total)} / mes
                    </TableCell>
                  </TableRow>
                </tfoot>
              )}
            </Table>
          </div>
        </TabsContent>

        {/* Pestaña 3: Movimientos Detallados */}
        <TabsContent value="movimientos" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-3.5 rounded-xl border">
            <div className="flex flex-wrap items-center gap-2">
              <Label className="text-xs font-semibold">Filtrar por Inversionista:</Label>
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-xs font-medium"
                value={selectedId ?? "all"}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedId(val === "all" ? null : Number(val));
                }}
              >
                <option value="all">▶ Todos los Inversionistas ({todosLosMovimientos.length} movimientos)</option>
                {inversionistas.map((inv: any) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.nombre} ({fmt(inv.saldo_capital)})
                  </option>
                ))}
              </select>
            </div>

            {selected && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-semibold py-1">
                  Capital: {fmt(selected.saldo_capital)}
                </Badge>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <TableSearch
              placeholder="Buscar movimiento por concepto, fecha o monto..."
              value={searchMovs}
              onChange={handleSearchMovs}
              className="flex-1 max-w-md"
            />
          </div>

          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[120px]">Fecha</TableHead>
                  <TableHead>Inversionista</TableHead>
                  <TableHead className="text-center">Tipo</TableHead>
                  <TableHead>Concepto / Motivo</TableHead>
                  <TableHead className="text-right">Monto ($)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        <p className="text-sm">Cargando movimientos...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : movimientosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      {searchMovs
                        ? "No se encontraron movimientos con ese criterio."
                        : `No hay movimientos registrados para ${selected ? selected.nombre : "los inversionistas"} en el rango ${fmtFecha(fechaInicio)} al ${fmtFecha(fechaFin)}.`}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedMovimientos.map((mov: any, index: number) => {
                    const isRendimiento = mov.tipo === "Rendimiento";
                    const isRetiro = mov.tipo === "Retiro";
                    const isAportacion = mov.tipo === "Aportacion";

                    return (
                      <TableRow key={`${mov.fecha}-${mov.tipo}-${mov.monto}-${index}`} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="text-xs font-mono">{fmtFecha(mov.fecha)}</TableCell>
                        <TableCell className="font-medium text-xs">{mov.inversionista_nombre}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={isRendimiento ? "secondary" : isRetiro ? "destructive" : "outline"}
                            className={`text-xs ${
                              isRendimiento
                                ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300"
                                : isAportacion
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                                : ""
                            }`}
                          >
                            {mov.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{mov.descripcion || "—"}</TableCell>
                        <TableCell
                          className={`text-right font-bold text-xs font-mono ${
                            isRendimiento
                              ? "text-amber-700"
                              : isRetiro
                              ? "text-rose-600"
                              : "text-emerald-700"
                          }`}
                        >
                          {isRetiro ? `-${fmt(mov.monto)}` : fmt(mov.monto)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {!loading && (
            <TablePagination
              page={pageMovs}
              totalItems={movimientosFiltrados.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPageMovs}
              label="movimientos"
            />
          )}
        </TabsContent>
      </Tabs>

    </div>
  );
}
