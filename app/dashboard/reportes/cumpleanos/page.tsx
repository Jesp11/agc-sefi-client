"use client";

import { useState, useEffect, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Cake,
  Gift,
  CalendarDays,
  Users,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  Phone,
  MessageCircle,
  PartyPopper,
  Sparkles,
  SlidersHorizontal,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { exportarCumpleanosPdf } from "@/lib/reporte-cumpleanos-pdf";
import { fmtTelefono } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { isFieldRoleName } from "@/lib/authz";
import * as XLSX from "xlsx";

const MESES = [
  { valor: 1, nombre: "Enero" },
  { valor: 2, nombre: "Febrero" },
  { valor: 3, nombre: "Marzo" },
  { valor: 4, nombre: "Abril" },
  { valor: 5, nombre: "Mayo" },
  { valor: 6, nombre: "Junio" },
  { valor: 7, nombre: "Julio" },
  { valor: 8, nombre: "Agosto" },
  { valor: 9, nombre: "Septiembre" },
  { valor: 10, nombre: "Octubre" },
  { valor: 11, nombre: "Noviembre" },
  { valor: 12, nombre: "Diciembre" },
];

export default function ReporteCumpleanosPage() {
  const { user } = useAuth();
  const isGestor = isFieldRoleName(user?.role?.nombre);

  const currentMonthNum = new Date().getMonth() + 1;
  const [mesSeleccionado, setMesSeleccionado] = useState<number>(currentMonthNum);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Filtros interactivos
  const [filtroAsesor, setFiltroAsesor] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const { search, handleSearch, page, setPage } = useTableControls();

  const fetchCumpleanos = async (mes: number) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/reportes/cumpleanos?mes=${mes}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        toast.error("No se pudo cargar el reporte de cumpleaños");
      }
    } catch {
      toast.error("Error de conexión al cargar reporte");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCumpleanos(mesSeleccionado);
  }, [mesSeleccionado]);

  const rawClientes = data?.clientes || [];

  // Lista de asesores únicos en el mes
  const asesoresList = useMemo(() => {
    const set = new Set<string>();
    rawClientes.forEach((c: any) => {
      const nom = c.asesor?.nombre_asesor?.trim();
      if (nom) set.add(nom);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rawClientes]);

  // Filtrado compuesto
  const filtered = useMemo(() => {
    let list = rawClientes;

    // 1. Asesor
    if (filtroAsesor !== "todos") {
      list = list.filter((c: any) => (c.asesor?.nombre_asesor || "").trim() === filtroAsesor);
    }

    // 2. Estado dentro del mes
    if (filtroEstado === "hoy") {
      list = list.filter((c: any) => c.es_hoy);
    } else if (filtroEstado === "proximos") {
      list = list.filter((c: any) => !c.ya_paso && !c.es_hoy);
    } else if (filtroEstado === "pasados") {
      list = list.filter((c: any) => c.ya_paso);
    }

    // 3. Búsqueda por texto
    if (search.trim()) {
      list = filterBySearch(list, search, (c: any) => [
        c.nombre_completo,
        c.id_cliente,
        c.telefono,
        c.curp,
        c.asesor?.nombre_asesor,
        c.grupo,
      ]);
    }

    return list;
  }, [rawClientes, filtroAsesor, filtroEstado, search]);

  const paginated = paginateItems(filtered, page);

  // Navegación de mes
  const handlePrevMonth = () => {
    setMesSeleccionado((prev) => (prev === 1 ? 12 : prev - 1));
    setPage(1);
  };

  const handleNextMonth = () => {
    setMesSeleccionado((prev) => (prev === 12 ? 1 : prev + 1));
    setPage(1);
  };

  const handleGoCurrentMonth = () => {
    setMesSeleccionado(currentMonthNum);
    setPage(1);
  };

  const nombreMesActual = useMemo(() => {
    return MESES.find((m) => m.valor === mesSeleccionado)?.nombre || "";
  }, [mesSeleccionado]);

  // Exportar Excel
  const handleExportExcel = () => {
    if (filtered.length === 0) {
      toast.error("No hay registros para exportar");
      return;
    }

    setIsExporting(true);
    try {
      const rows = filtered.map((c: any) => {
        const item: Record<string, any> = {
          "Día": c.dia,
          "Mes": nombreMesActual,
          "ID Cliente": c.id_cliente,
          "Nombre Completo": c.nombre_completo,
          "Edad": c.edad ? `${c.edad} años` : "—",
          "Contacto": fmtTelefono(c.telefono),
        };
        if (!isGestor) {
          item["Gestor Cobranza"] = c.asesor?.nombre_asesor ?? "";
        }
        item["Grupo"] = c.grupo ?? "";
        return item;
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Cumpleaños ${nombreMesActual}`);
      XLSX.writeFile(wb, `cumpleaneros_${nombreMesActual.toLowerCase()}_${data?.anio || new Date().getFullYear()}.xlsx`);
      toast.success("Reporte de cumpleaños exportado a Excel");
    } catch {
      toast.error("Error al exportar Excel");
    } finally {
      setIsExporting(false);
    }
  };

  // Exportar PDF
  const handleExportPdf = () => {
    if (filtered.length === 0) {
      toast.error("No hay registros para exportar en PDF");
      return;
    }

    exportarCumpleanosPdf({
      mesNombre: nombreMesActual,
      mesNumero: mesSeleccionado,
      anio: data?.anio || new Date().getFullYear(),
      clientes: filtered,
      kpis: {
        total: data?.total_cumpleaneros || 0,
        cumplenHoy: data?.cumplen_hoy || 0,
        porCumplir: data?.porCumplir || 0,
        cumplidos: data?.cumplidos || 0,
      },
      filtroAsesor: filtroAsesor !== "todos" ? filtroAsesor : undefined,
      filtroBusqueda: search.trim() ? search : undefined,
    });
  };

  const getCleanPhone = (phone?: string) => {
    if (!phone) return "";
    return phone.replace(/\D/g, "");
  };

  const getWhatsappUrl = (nombre: string, phone?: string) => {
    const clean = getCleanPhone(phone);
    if (!clean) return "#";
    const primerNombre = nombre.split(" ")[0] || "estimado cliente";
    const msg = encodeURIComponent(
      `¡Hola ${primerNombre}! 🎂🎉 De parte de todo el equipo de AGC SEFI te deseamos un muy feliz cumpleaños. Esperamos que pases un excelente día rodeado de tus seres queridos.`
    );
    return `https://wa.me/52${clean}?text=${msg}`;
  };

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Cake className="size-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight text-foreground/90">
              Cumpleaños de Clientes
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Seguimiento de cumpleañeros para fidelización, felicitaciones y atención personalizada.
          </p>
        </div>

        {/* Acciones de Exportación y Mes Actual */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3"
            onClick={handleExportPdf}
            disabled={loading || filtered.length === 0}
          >
            <Printer className="mr-1.5 h-4 w-4 text-primary" />
            Exportar PDF
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3"
            onClick={handleExportExcel}
            disabled={loading || filtered.length === 0 || isExporting}
          >
            <Download className="mr-1.5 h-4 w-4 text-emerald-600" />
            {isExporting ? "Exportando..." : "Exportar Excel"}
          </Button>

          {mesSeleccionado !== currentMonthNum && (
            <Button
              variant="secondary"
              size="sm"
              className="h-9 px-3 text-xs"
              onClick={handleGoCurrentMonth}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
              Mes Actual
            </Button>
          )}
        </div>
      </div>

      {/* Selector de Mes Interactivo */}
      <Card className="border shadow-sm bg-gradient-to-r from-card to-muted/20">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={handlePrevMonth}
              title="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Mes a consultar:
              </span>
              <select
                className="border rounded-md px-3 py-1.5 text-sm font-bold bg-background h-9 text-primary cursor-pointer"
                value={mesSeleccionado}
                onChange={(e) => {
                  setMesSeleccionado(Number(e.target.value));
                  setPage(1);
                }}
              >
                {MESES.map((m) => (
                  <option key={m.valor} value={m.valor}>
                    {m.nombre} {m.valor === currentMonthNum ? "(Mes Actual)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={handleNextMonth}
              title="Mes siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            {mesSeleccionado === currentMonthNum ? (
              <Badge variant="default" className="bg-primary/90 hover:bg-primary font-normal">
                Visualizando mes en curso
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground font-normal">
                Consulta histórica / proyectada
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tarjetas KPI de Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Total Cumpleañeros */}
        <Card className="p-4 border shadow-sm bg-card hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Total {nombreMesActual}
            </span>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Cake className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-foreground mt-2">
            {loading ? "..." : data?.total_cumpleaneros ?? 0}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Clientes registrados en este mes
          </p>
        </Card>

        {/* KPI 2: Cumplen Hoy */}
        <Card
          className={`p-4 border shadow-sm transition-colors ${
            (data?.cumplen_hoy ?? 0) > 0
              ? "bg-amber-50/70 border-amber-300 dark:bg-amber-950/20 dark:border-amber-800"
              : "bg-card"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Cumplen Hoy
            </span>
            <div
              className={`p-2 rounded-lg ${
                (data?.cumplen_hoy ?? 0) > 0
                  ? "bg-amber-500 text-white animate-bounce"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Gift className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-foreground mt-2 flex items-center gap-2">
            {loading ? "..." : data?.cumplen_hoy ?? 0}
            {(data?.cumplen_hoy ?? 0) > 0 && (
              <span className="text-xs font-normal text-amber-700 bg-amber-200/80 px-2 py-0.5 rounded-full font-sans">
                ¡Felicitar hoy!
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Cumpleaños en la fecha actual
          </p>
        </Card>

        {/* KPI 3: Por Cumplir */}
        <Card className="p-4 border shadow-sm bg-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Próximos a Cumplir
            </span>
            <div className="p-2 rounded-lg bg-sky-50 text-sky-700">
              <CalendarDays className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-foreground mt-2">
            {loading ? "..." : data?.por_cumplir ?? 0}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Días restantes de {nombreMesActual}
          </p>
        </Card>

        {/* KPI 4: Ya Celebrados */}
        <Card className="p-4 border shadow-sm bg-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Ya Celebrados
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <PartyPopper className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-foreground mt-2">
            {loading ? "..." : data?.cumplidos ?? 0}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Días transcurridos en el mes
          </p>
        </Card>
      </div>

      {/* Barra de Búsqueda y Filtros Rápidos */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TableSearch
            placeholder="Buscar por cliente, ID, teléfono o gestor..."
            value={search}
            onChange={handleSearch}
            className="flex-1 max-w-md"
          />

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtro Gestor (solo visible para admin/gerencia) */}
            {!isGestor && (
              <div className="flex items-center gap-1.5 text-xs">
                <Label className="text-xs text-muted-foreground shrink-0">Gestor:</Label>
                <select
                  className="border rounded-md px-2.5 py-1 text-xs bg-background h-8"
                  value={filtroAsesor}
                  onChange={(e) => {
                    setFiltroAsesor(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="todos">— Todos los gestores —</option>
                  {asesoresList.map((nombre) => (
                    <option key={nombre} value={nombre}>
                      {nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filtro Estado de celebración */}
            <div className="flex items-center gap-1.5 text-xs">
              <Label className="text-xs text-muted-foreground shrink-0">Ocasión:</Label>
              <select
                className="border rounded-md px-2.5 py-1 text-xs bg-background h-8"
                value={filtroEstado}
                onChange={(e) => {
                  setFiltroEstado(e.target.value);
                  setPage(1);
                }}
              >
                <option value="todos">— Todos los días —</option>
                <option value="hoy">🎉 Cumplen Hoy</option>
                <option value="proximos">📅 Próximos a Cumplir</option>
                <option value="pasados">✅ Ya Celebrados</option>
              </select>
            </div>

            {(filtroAsesor !== "todos" || filtroEstado !== "todos" || search) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-destructive hover:text-destructive px-2"
                onClick={() => {
                  setFiltroAsesor("todos");
                  setFiltroEstado("todos");
                  handleSearch("");
                  setPage(1);
                }}
              >
                <RotateCcw className="size-3 mr-1" />
                Limpiar filtros
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabla de Cumpleañeros */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[70px] text-center">Día</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-center w-24">Edad</TableHead>
              <TableHead className="w-48">Contacto</TableHead>
              {!isGestor && <TableHead>Gestor Cobranza</TableHead>}
              <TableHead className="text-right w-36">Felicitar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={isGestor ? 5 : 6} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    <p className="text-sm text-muted-foreground">Cargando cumpleañeros de {nombreMesActual}...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isGestor ? 5 : 6} className="h-32 text-center text-muted-foreground">
                  {search || filtroAsesor !== "todos" || filtroEstado !== "todos"
                    ? "No se encontraron clientes con los filtros seleccionados."
                    : `No hay clientes registrados que cumplan años en ${nombreMesActual}.`}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((c: any) => {
                const phoneClean = getCleanPhone(c.telefono);
                const hasPhone = Boolean(phoneClean && phoneClean.length >= 10);

                return (
                  <TableRow
                    key={c.id_cliente}
                    className={`transition-colors ${
                      c.es_hoy
                        ? "bg-amber-50/70 hover:bg-amber-100/70 dark:bg-amber-950/30"
                        : "hover:bg-muted/30"
                    }`}
                  >
                    {/* Día */}
                    <TableCell className="text-center font-bold">
                      <div
                        className={`w-9 h-9 mx-auto rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${
                          c.es_hoy
                            ? "bg-amber-500 text-white font-extrabold ring-2 ring-amber-300 animate-pulse"
                            : c.ya_paso
                            ? "bg-muted text-muted-foreground"
                            : "bg-primary/10 text-primary border border-primary/20"
                        }`}
                      >
                        {c.dia}
                      </div>
                    </TableCell>

                    {/* Cliente */}
                    <TableCell>
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        {c.nombre_completo}
                        {c.es_hoy && <span title="¡Cumpleaños hoy!">🎂</span>}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-primary/80 font-medium">#{c.id_cliente}</span>
                        {c.grupo && (
                          <span className="bg-muted px-1.5 py-0.2 rounded text-[11px]">
                            {c.grupo}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Edad */}
                    <TableCell className="text-center">
                      {c.edad ? (
                        <span className="font-semibold text-xs">
                          {c.edad} <span className="text-muted-foreground font-normal">años</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>

                    {/* Contacto */}
                    <TableCell>
                      {c.telefono && phoneClean ? (
                        <a
                          href={`tel:${phoneClean}`}
                          className="font-mono text-xs text-primary hover:underline flex items-center gap-1"
                          title="Llamar"
                        >
                          <Phone className="size-3 text-muted-foreground" />
                          {fmtTelefono(c.telefono)}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin teléfono</span>
                      )}
                    </TableCell>

                    {/* Gestor Cobranza (solo si no es gestor) */}
                    {!isGestor && (
                      <TableCell className="text-xs">
                        {c.asesor?.nombre_asesor ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    )}

                    {/* Acciones para Felicitar */}
                    <TableCell className="text-right">
                      {hasPhone ? (
                        <a
                          href={getWhatsappUrl(c.nombre_completo, c.telefono)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
                          title="Enviar felicitación por WhatsApp"
                        >
                          <MessageCircle className="size-3.5" />
                          WhatsApp
                        </a>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">No disponible</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {!loading && (
        <TablePagination
          page={page}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          label="cumpleañeros"
        />
      )}
    </div>
  );
}
