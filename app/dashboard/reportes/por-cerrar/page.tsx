"use client";

import React, { useEffect, useState, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AgendarRenovacionDialog } from "@/components/agendar-renovacion-dialog";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { creditoSearchFields } from "@/lib/table-utils";
import { fmtFecha } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  User,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  Percent,
  Sparkles,
  RotateCcw,
  ChevronDown,
  CalendarPlus,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type ReporteRenovacionItem = {
  num_prog: number;
  tipo_credito?: string;
  cliente?: { nombre_completo?: string | null } | null;
  grupo?: { nombre_grupo?: string | null } | null;
  asesor?: { nombre_asesor?: string | null } | null;
  monto_ultimo_abono?: number | null;
  pagos_restantes: number;
  fecha_ultimo_abono?: string | null;
  fecha_termino?: string | null;
  fecha_programada_renovacion?: string | null;
  renovacion_autorizada?: string | null;
  renovacion_tasa?: string | null;
  dias_restantes: number;
  [key: string]: unknown;
};

export default function ReportePorCerrarPage() {
  const [items, setItems] = useState<ReporteRenovacionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [filtroAutorizado, setFiltroAutorizado] = useState("todos");
  const { search, handleSearch, page, setPage } = useTableControls();

  const fetchItems = () => {
    setLoading(true);
    apiFetch("/reportes/asesor/por-cerrar")
      .then(async (res) => {
        if (res.ok) setItems(await res.json());
      })
      .catch(() => {
        toast.error("Error al cargar clientes por renovar");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleUpdateItem = async (numProg: number, field: string, value: any) => {
    // Actualización optimista inmediata en UI
    setItems((prev) =>
      prev.map((item) => {
        if (item.num_prog === numProg) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );

    try {
      const res = await apiFetch(`/reportes/asesor/por-cerrar/${numProg}`, {
        method: "PATCH",
        body: JSON.stringify({
          [field]: value !== "" ? value : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || "No se pudo guardar el cambio");
      } else {
        toast.success("Renovación actualizada", { duration: 1500 });
      }
    } catch {
      toast.error("Error de conexión al guardar cambio");
    }
  };

  const filtered = useMemo(() => {
    let list = items;

    // Filtro por estatus de autorización
    if (filtroAutorizado !== "todos") {
      list = list.filter((c) => (c.renovacion_autorizada || "Pendiente") === filtroAutorizado);
    }

    // Búsqueda
    if (search.trim()) {
      list = filterBySearch(list, search, (c) => [
        ...creditoSearchFields(c),
        c.fecha_termino,
        c.fecha_ultimo_abono,
        c.fecha_programada_renovacion,
        c.renovacion_autorizada,
        c.renovacion_tasa,
      ]);
    }

    // Ordenar por pagos restantes (1 a 6) y luego por fecha término
    list = [...list].sort((a, b) => {
      const cmp = (Number(a.pagos_restantes) || 0) - (Number(b.pagos_restantes) || 0);
      if (cmp !== 0) return cmp;
      return String(a.fecha_termino || "").localeCompare(String(b.fecha_termino || ""));
    });

    return list;
  }, [items, filtroAutorizado, search]);

  const paginated = paginateItems(filtered, page);

  // KPIs de resumen
  const kpis = useMemo(() => {
    const total = items.length;
    const autorizados = items.filter((i) => i.renovacion_autorizada === "Autorizado").length;
    const noAutorizados = items.filter((i) => i.renovacion_autorizada === "No Autorizado").length;
    const pendientes = items.filter((i) => !i.renovacion_autorizada || i.renovacion_autorizada === "Pendiente").length;
    const conFecha = items.filter((i) => Boolean(i.fecha_programada_renovacion)).length;

    return { total, autorizados, noAutorizados, pendientes, conFecha };
  }, [items]);

  const handleExportExcel = () => {
    if (filtered.length === 0) {
      toast.error("No hay registros para exportar");
      return;
    }

    setIsExporting(true);
    try {
      const rows = filtered.map((c) => {
        const isGrupal = c.tipo_credito === "Grupal";
        const nombre = isGrupal ? c.grupo?.nombre_grupo ?? "Grupo" : c.cliente?.nombre_completo ?? "Cliente";

        return {
          "Folio Crédito": c.num_prog,
          "Tipo Crédito": c.tipo_credito || "Individual",
          "Nombre": nombre,
          "Gestor Cobranza": c.asesor?.nombre_asesor ?? "",
          "Pagos Restante": c.pagos_restantes,
          "Fecha Término": c.fecha_termino ? fmtFecha(c.fecha_termino) : fmtFecha(c.fecha_ultimo_abono),
          "Fecha Programada Renovación": c.fecha_programada_renovacion ? fmtFecha(c.fecha_programada_renovacion) : "Sin programar",
          "Autorizado": c.renovacion_autorizada || "Pendiente",
          "Aplicar Tasa": c.renovacion_tasa || "—",
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Renovaciones");
      XLSX.writeFile(wb, `renovacion_clientes_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success("Reporte de renovación exportado a Excel");
    } catch {
      toast.error("Error al exportar Excel");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Renovación de Clientes</h1>
          <p className="text-muted-foreground mt-1">
            Clientes con entre 1 y 6 pagos restantes listos para seguimiento, programación y autorización de renovación.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 shrink-0 self-start sm:self-auto"
          onClick={handleExportExcel}
          disabled={isExporting || items.length === 0}
        >
          <Download className="size-4" />
          {isExporting ? "Exportando..." : "Exportar a Excel"}
        </Button>
      </div>

      {/* Tarjetas de Resumen (KPIs) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3.5 border shadow-sm bg-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Por Renovar
            </span>
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-foreground mt-1.5">{kpis.total}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">1 a 6 pagos restantes</p>
        </Card>

        <Card className="p-3.5 border shadow-sm bg-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Autorizados
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1.5">{kpis.autorizados}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Listos para desembolso</p>
        </Card>

        <Card className="p-3.5 border shadow-sm bg-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Pendientes
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-700 mt-1.5">{kpis.pendientes}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">En evaluación</p>
        </Card>

        <Card className="p-3.5 border shadow-sm bg-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Con Fecha Prog.
            </span>
            <div className="p-1.5 rounded-lg bg-sky-50 text-sky-700">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-sky-700 mt-1.5">{kpis.conFecha}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Fecha asignada</p>
        </Card>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <TableSearch
          placeholder="Buscar por cliente, grupo o folio..."
          value={search}
          onChange={handleSearch}
          className="flex-1 max-w-md"
        />

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-xs text-muted-foreground shrink-0 font-medium">Autorización:</span>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 bg-background">
                    {filtroAutorizado === "todos"
                      ? "Todos los estados"
                      : filtroAutorizado === "Autorizado"
                      ? "✅ Autorizado"
                      : filtroAutorizado === "No Autorizado"
                      ? "❌ No Autorizado"
                      : "⏳ Pendiente"}
                    <ChevronDown className="size-3 opacity-60 ml-0.5" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onClick={() => {
                    setFiltroAutorizado("todos");
                    setPage(1);
                  }}
                  className="text-xs cursor-pointer"
                >
                  Todos los estados
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setFiltroAutorizado("Pendiente");
                    setPage(1);
                  }}
                  className="text-xs gap-2 text-amber-700 cursor-pointer"
                >
                  <Clock className="size-3.5 text-amber-600" />
                  <span>Pendiente</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setFiltroAutorizado("Autorizado");
                    setPage(1);
                  }}
                  className="text-xs gap-2 text-emerald-700 cursor-pointer"
                >
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                  <span>Autorizado</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setFiltroAutorizado("No Autorizado");
                    setPage(1);
                  }}
                  className="text-xs gap-2 text-rose-700 cursor-pointer"
                >
                  <XCircle className="size-3.5 text-rose-600" />
                  <span>No Autorizado</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {(filtroAutorizado !== "todos" || search) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-destructive hover:text-destructive px-2"
              onClick={() => {
                setFiltroAutorizado("todos");
                handleSearch("");
                setPage(1);
              }}
            >
              <RotateCcw className="size-3 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Tabla Principal */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="text-center w-36">Pagos Restante</TableHead>
              <TableHead className="text-center w-36">Fecha Término</TableHead>
              <TableHead className="text-center w-48">Fecha Programada Renovación</TableHead>
              <TableHead className="text-center w-44">Autorizado</TableHead>
              <TableHead className="text-center w-40">Aplicar Tasa</TableHead>
              <TableHead className="text-right w-44">Agenda</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    <p className="text-sm text-muted-foreground">Cargando clientes para renovación...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  {search || filtroAutorizado !== "todos"
                    ? "No se encontraron clientes con los filtros seleccionados."
                    : "No hay clientes en rango de renovación (1 a 6 pagos restantes)."}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((c) => {
                const isGrupal = c.tipo_credito === "Grupal";
                const nombre = isGrupal
                  ? (c.grupo?.nombre_grupo ?? "Grupo")
                  : (c.cliente?.nombre_completo ?? "Cliente");

                const fechaTermino = c.fecha_termino || c.fecha_ultimo_abono;
                const autorizacionActual = c.renovacion_autorizada || "Pendiente";

                return (
                  <TableRow key={c.num_prog} className="hover:bg-muted/30 transition-colors">
                    {/* 1. Nombre */}
                    <TableCell>
                      <div className="font-semibold text-foreground flex items-center gap-2">
                        {isGrupal ? (
                          <span className="p-1 rounded bg-purple-50 text-purple-700 border border-purple-200">
                            <Users className="h-3.5 w-3.5" />
                          </span>
                        ) : (
                          <span className="p-1 rounded bg-sky-50 text-sky-700 border border-sky-200">
                            <User className="h-3.5 w-3.5" />
                          </span>
                        )}
                        <span>{nombre}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5 ml-7 font-mono">
                        <span>Folio #{c.num_prog}</span>
                        {c.asesor?.nombre_asesor && (
                          <span className="text-muted-foreground/80 font-sans">
                            · Gestor: {c.asesor.nombre_asesor}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* 2. Pagos Restante */}
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`font-bold px-2.5 py-0.5 text-xs ${
                          c.pagos_restantes <= 2
                            ? "bg-rose-50 text-rose-700 border-rose-300 font-extrabold"
                            : c.pagos_restantes <= 4
                            ? "bg-amber-50 text-amber-700 border-amber-300"
                            : "bg-sky-50 text-sky-700 border-sky-300"
                        }`}
                      >
                        {c.pagos_restantes} {c.pagos_restantes === 1 ? "pago" : "pagos"}
                      </Badge>
                    </TableCell>

                    {/* 3. Fecha Termino */}
                    <TableCell className="text-center font-mono text-xs font-semibold text-foreground">
                      {fechaTermino ? fmtFecha(fechaTermino) : "—"}
                    </TableCell>

                    {/* 4. Fecha Programada Renovacion (Llenado Manual) */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        <Input
                          type="date"
                          value={
                            c.fecha_programada_renovacion
                              ? String(c.fecha_programada_renovacion).split("T")[0]
                              : ""
                          }
                          onChange={(e) =>
                            handleUpdateItem(c.num_prog, "fecha_programada_renovacion", e.target.value)
                          }
                          className="h-8 text-xs w-36 font-mono bg-background text-center focus:ring-1"
                        />
                      </div>
                    </TableCell>

                    {/* 5. Autorizado (Llenado Manual - UI DropdownMenu) */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="outline"
                                size="sm"
                                className={`h-7 px-2.5 text-xs font-semibold gap-1.5 rounded-full border shadow-2xs transition-all ${
                                  autorizacionActual === "Autorizado"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800"
                                    : autorizacionActual === "No Autorizado"
                                    ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 hover:text-rose-800"
                                    : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:text-amber-800"
                                }`}
                              >
                                {autorizacionActual === "Autorizado" ? (
                                  <>
                                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                                    <span>Autorizado</span>
                                  </>
                                ) : autorizacionActual === "No Autorizado" ? (
                                  <>
                                    <XCircle className="size-3.5 text-rose-600" />
                                    <span>No Autorizado</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="size-3.5 text-amber-600" />
                                    <span>Pendiente</span>
                                  </>
                                )}
                                <ChevronDown className="size-3 opacity-60 ml-0.5" />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="center" className="w-40">
                            <DropdownMenuItem
                              onClick={() => handleUpdateItem(c.num_prog, "renovacion_autorizada", "Pendiente")}
                              className="text-xs gap-2 text-amber-700 cursor-pointer"
                            >
                              <Clock className="size-3.5 text-amber-600" />
                              <span>Pendiente</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleUpdateItem(c.num_prog, "renovacion_autorizada", "Autorizado")}
                              className="text-xs gap-2 text-emerald-700 cursor-pointer"
                            >
                              <CheckCircle2 className="size-3.5 text-emerald-600" />
                              <span>Autorizado</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleUpdateItem(c.num_prog, "renovacion_autorizada", "No Autorizado")}
                              className="text-xs gap-2 text-rose-700 cursor-pointer"
                            >
                              <XCircle className="size-3.5 text-rose-600" />
                              <span>No Autorizado</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>

                    {/* 6. Aplicar Tasa (Llenado Manual) */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        <Input
                          type="text"
                          placeholder="Ej. 10% / Pref."
                          defaultValue={c.renovacion_tasa || ""}
                          onBlur={(e) => {
                            if (e.target.value !== (c.renovacion_tasa || "")) {
                              handleUpdateItem(c.num_prog, "renovacion_tasa", e.target.value.trim());
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          className="h-8 text-xs w-32 text-center bg-background focus:ring-1"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <AgendarRenovacionDialog
                        numProg={c.num_prog}
                        fecha={c.fecha_programada_renovacion}
                        autorizacion={c.renovacion_autorizada}
                        tasa={c.renovacion_tasa}
                        onSaved={fetchItems}
                        trigger={
                          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                            <CalendarPlus className="size-3.5" />
                            {c.fecha_programada_renovacion ? "Editar agenda" : "Agendar"}
                          </Button>
                        }
                      />
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
          label="clientes por renovar"
        />
      )}
    </div>
  );
}
