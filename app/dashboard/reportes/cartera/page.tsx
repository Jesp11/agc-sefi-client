"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { isFieldRoleName } from "@/lib/authz";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { creditoSearchFields } from "@/lib/table-utils";
import {
  Printer,
  FileSpreadsheet,
  Filter,
  SlidersHorizontal,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { exportWorkbook } from "@/lib/report-export";
import { exportarCarteraPdf } from "@/lib/reporte-cartera-pdf";

export default function ReporteCarteraPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAsesor = isFieldRoleName(user?.role?.nombre);

  // Estados de consulta y datos
  const [tipo, setTipo] = useState("general");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const { search, handleSearch, page, setPage } = useTableControls();

  // Estados de filtros desplegables
  const [showFilters, setShowFilters] = useState(false);
  const [filtroAsesor, setFiltroAsesor] = useState("todos");
  const [filtroTipoCredito, setFiltroTipoCredito] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroSemanas, setFiltroSemanas] = useState("todas");
  const [filtroSaldo, setFiltroSaldo] = useState("todos");
  const [ordenarPor, setOrdenarPor] = useState("folio_asc");

  useEffect(() => {
    if (isAsesor) {
      router.replace("/dashboard/reportes/diario");
    }
  }, [isAsesor, router]);

  useEffect(() => {
    if (isAsesor) return;
    setLoading(true);
    setPage(1);
    apiFetch(`/reportes/cartera?tipo=${tipo}`).then(async (res) => {
      if (res.ok) setData(await res.json());
      setLoading(false);
    });
  }, [tipo, isAsesor, setPage]);

  // Lista dinámica de asesores únicos en los datos
  const asesoresList = useMemo(() => {
    const map = new Map<string, { id: string; nombre: string }>();
    (data?.creditos || []).forEach((c: any) => {
      if (c.asesor?.nombre_asesor) {
        const nombre = c.asesor.nombre_asesor.trim();
        const id = String(c.id_asesor || c.asesor.id || nombre);
        if (!map.has(nombre)) {
          map.set(nombre, { id, nombre });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [data]);

  // Contador de filtros activos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (tipo !== "general") count++;
    if (filtroAsesor !== "todos") count++;
    if (filtroTipoCredito !== "todos") count++;
    if (filtroEstado !== "todos") count++;
    if (filtroSemanas !== "todas") count++;
    if (filtroSaldo !== "todos") count++;
    if (search.trim()) count++;
    return count;
  }, [tipo, filtroAsesor, filtroTipoCredito, filtroEstado, filtroSemanas, filtroSaldo, search]);

  // Generador de etiquetas legibles de filtros para la exportación
  const getFiltrosAplicados = () => {
    const list: Array<{ label: string; valor: string }> = [];
    if (tipo !== "general") {
      const labels: Record<string, string> = {
        individual: "Cartera Individual",
        grupal: "Cartera Grupal",
        mora: "En Mora",
        mora_activa: "Mora Activa",
        mora_muerta: "Mora Muerta",
        cerrados: "Cerrados / Finalizados",
      };
      list.push({ label: "Clasificación", valor: labels[tipo] || tipo });
    }
    if (filtroAsesor !== "todos") {
      const as = asesoresList.find((a) => a.id === filtroAsesor || a.nombre === filtroAsesor);
      list.push({ label: "Asesor", valor: as?.nombre || filtroAsesor });
    }
    if (filtroTipoCredito !== "todos") {
      list.push({ label: "Modalidad", valor: filtroTipoCredito });
    }
    if (filtroEstado !== "todos") {
      list.push({ label: "Estado", valor: filtroEstado });
    }
    if (filtroSemanas !== "todas") {
      const semMap: Record<string, string> = {
        "1-4": "1 a 4 semanas (Por liquidar)",
        "5-8": "5 a 8 semanas (Mitad de ciclo)",
        "9-12": "9 a 12 semanas",
        "13+": "13 o más semanas",
        "0": "0 semanas restantes",
      };
      list.push({ label: "Semanas restantes", valor: semMap[filtroSemanas] || filtroSemanas });
    }
    if (filtroSaldo !== "todos") {
      const salMap: Record<string, string> = {
        con_saldo: "Con saldo (> $0)",
        liquidado: "Liquidado ($0)",
        mayor_10k: "Saldo > $10,000",
      };
      list.push({ label: "Saldo", valor: salMap[filtroSaldo] || filtroSaldo });
    }
    if (search.trim()) {
      list.push({ label: "Búsqueda", valor: `"${search.trim()}"` });
    }
    return list;
  };

  // Restablecer filtros
  const resetFiltros = () => {
    setFiltroAsesor("todos");
    setFiltroTipoCredito("todos");
    setFiltroEstado("todos");
    setFiltroSemanas("todas");
    setFiltroSaldo("todos");
    setOrdenarPor("folio_asc");
    handleSearch("");
    setPage(1);
  };

  // Filtrado compuesto y ordenamiento
  const filtered = useMemo(() => {
    let list = data?.creditos || [];

    // 1. Filtro por asesor
    if (filtroAsesor !== "todos") {
      list = list.filter((c: any) => {
        const id = String(c.id_asesor || c.asesor?.id || "");
        const nombre = c.asesor?.nombre_asesor || "";
        return id === filtroAsesor || nombre === filtroAsesor;
      });
    }

    // 2. Filtro por tipo de crédito
    if (filtroTipoCredito !== "todos") {
      list = list.filter((c: any) => (c.tipo_credito || "").toLowerCase() === filtroTipoCredito.toLowerCase());
    }

    // 3. Filtro por estado
    if (filtroEstado !== "todos") {
      list = list.filter((c: any) => (c.estado || "").toLowerCase() === filtroEstado.toLowerCase());
    }

    // 4. Filtro por semanas restantes
    if (filtroSemanas !== "todas") {
      list = list.filter((c: any) => {
        const sem = Number(c.semanas_restantes ?? 0);
        if (filtroSemanas === "0") return sem === 0;
        if (filtroSemanas === "1-4") return sem >= 1 && sem <= 4;
        if (filtroSemanas === "5-8") return sem >= 5 && sem <= 8;
        if (filtroSemanas === "9-12") return sem >= 9 && sem <= 12;
        if (filtroSemanas === "13+") return sem >= 13;
        return true;
      });
    }

    // 5. Filtro por saldo
    if (filtroSaldo !== "todos") {
      list = list.filter((c: any) => {
        const saldo = Number(c.saldo_total ?? c.mora?.saldo_actual ?? c.saldo_pendiente ?? 0);
        if (filtroSaldo === "con_saldo") return saldo > 0.01;
        if (filtroSaldo === "liquidado") return saldo <= 0.01;
        if (filtroSaldo === "mayor_10k") return saldo >= 10000;
        return true;
      });
    }

    // 6. Búsqueda por texto
    if (search.trim()) {
      list = filterBySearch(list, search, (c: any) => [
        ...creditoSearchFields(c),
        c.asesor?.nombre_asesor,
        c.estado,
        c.mora?.saldo_actual,
        c.saldo_pendiente,
        c.saldo_total,
        c.saldo_inversion,
        c.semanas_restantes,
      ]);
    }

    // 7. Ordenamiento
    const sorted = [...list].sort((a: any, b: any) => {
      if (ordenarPor === "folio_asc") return Number(a.num_prog) - Number(b.num_prog);
      if (ordenarPor === "folio_desc") return Number(b.num_prog) - Number(a.num_prog);
      if (ordenarPor === "cliente_asc") {
        const nameA = a.cliente?.nombre_completo || a.grupo?.nombre_grupo || "";
        const nameB = b.cliente?.nombre_completo || b.grupo?.nombre_grupo || "";
        return nameA.localeCompare(nameB);
      }
      if (ordenarPor === "monto_desc") return Number(b.monto_otorgado ?? 0) - Number(a.monto_otorgado ?? 0);
      if (ordenarPor === "saldo_desc") {
        const saldoA = Number(a.saldo_total ?? a.mora?.saldo_actual ?? a.saldo_pendiente ?? 0);
        const saldoB = Number(b.saldo_total ?? b.mora?.saldo_actual ?? b.saldo_pendiente ?? 0);
        return saldoB - saldoA;
      }
      if (ordenarPor === "semanas_asc") return Number(a.semanas_restantes ?? 0) - Number(b.semanas_restantes ?? 0);
      return 0;
    });

    return sorted;
  }, [data, filtroAsesor, filtroTipoCredito, filtroEstado, filtroSemanas, filtroSaldo, search, ordenarPor]);

  const paginated = paginateItems(filtered, page);
  const showGroupFields = tipo === "grupal" || tipo === "general" || filtered.some((c) => c.tipo_credito === "Grupal");

  // Totales dinámicos
  const totalMonto = filtered.reduce((s, c) => s + Number(c.monto_otorgado ?? 0), 0);
  const totalSaldo = filtered.reduce((s, c) => s + Number(c.saldo_total ?? c.mora?.saldo_actual ?? c.saldo_pendiente ?? 0), 0);
  const totalInversion = filtered.reduce((s, c) => s + Number(c.saldo_inversion ?? 0), 0);
  const totalAsesores = new Set(filtered.map((c) => c.asesor?.nombre_asesor).filter(Boolean)).size;

  // Exportar a Excel considerando filtros activos
  const handleExport = () => {
    setIsExporting(true);
    try {
      const rows = filtered.map((c: any) => ({
        "Folio": c.num_prog,
        "Tipo": c.tipo_credito,
        "Estado": c.estado,
        "Cliente": c.cliente?.nombre_completo ?? "",
        "Grupo": c.grupo?.nombre_grupo ?? "",
        "Gestor Cobranza": c.asesor?.nombre_asesor ?? "",
        "Monto otorgado": Number(c.monto_otorgado ?? 0),
        "Interes": Number(c.interes ?? 0),
        ...(showGroupFields ? {
          "Credito total grupal": Number(c.credito_total_grupal ?? 0),
          "Saldo grupal": Number(c.saldo_grupal ?? 0),
          "Ahorro total grupal": Number(c.ahorro_total_grupal ?? 0),
        } : {}),
        "Saldo total": Number(c.saldo_total ?? c.mora?.saldo_actual ?? c.saldo_pendiente ?? 0),
        "Saldo inversion": Number(c.saldo_inversion ?? 0),
        "Semanas restantes": Number(c.semanas_restantes ?? 0),
      }));

      exportWorkbook([
        { name: "Cartera", rows },
      ], `reporte_cartera_${tipo}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success("Reporte exportado a Excel");
    } catch {
      toast.error("No se pudo exportar el reporte");
    } finally {
      setIsExporting(false);
    }
  };

  // Exportar a PDF adaptado a los filtros seleccionados
  const handlePrintPdf = () => {
    exportarCarteraPdf({
      tipo,
      creditos: filtered,
      filtros: getFiltrosAplicados(),
    });
  };

  return (
    <div className="space-y-5">
      {/* Barra de Título y Botones de Acción */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reporte de Cartera</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Consulta y exportación detallada de cartera por asesor y tipo de crédito.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={showFilters ? "secondary" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="h-9 font-medium"
          >
            <SlidersHorizontal className="mr-1.5 h-4 w-4" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge variant="default" className="ml-1.5 h-5 px-1.5 text-[11px] font-mono">
                {activeFiltersCount}
              </Badge>
            )}
            {showFilters ? <ChevronUp className="ml-1.5 h-3.5 w-3.5" /> : <ChevronDown className="ml-1.5 h-3.5 w-3.5" />}
          </Button>

          <Button
            variant="default"
            onClick={handlePrintPdf}
            disabled={loading || filtered.length === 0}
            className="h-9"
          >
            <Printer className="mr-1.5 h-4 w-4" />
            Exportar PDF
          </Button>

          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isExporting || loading || filtered.length === 0}
            className="h-9"
          >
            <FileSpreadsheet className="mr-1.5 h-4 w-4 text-emerald-600" />
            {isExporting ? "Exportando..." : "Excel"}
          </Button>
        </div>
      </div>

      {/* Panel Desplegable de Filtros Avanzados */}
      {showFilters && (
        <Card className="border shadow-sm bg-muted/20 animate-in fade-in-50 duration-200">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Filter className="size-4 text-primary" />
                <span>Criterios y Filtros de Cartera</span>
                {activeFiltersCount > 0 && (
                  <span className="text-xs font-normal text-muted-foreground">
                    ({activeFiltersCount} {activeFiltersCount === 1 ? "filtro activo" : "filtros activos"})
                  </span>
                )}
              </div>
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFiltros}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="size-3 mr-1" />
                  Restablecer filtros
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {/* 1. Clasificación / Tipo de Cartera */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Clasificación de Cartera</Label>
                <select
                  className="w-full border rounded-md px-2.5 py-1.5 text-xs bg-background h-8"
                  value={tipo}
                  onChange={(e) => {
                    setTipo(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="general">Cartera General (Activa)</option>
                  <option value="individual">Solo Cartera Individual</option>
                  <option value="grupal">Solo Cartera Grupal</option>
                  <option value="mora">Cartera en Mora</option>
                  <option value="mora_activa">Mora Activa</option>
                  <option value="mora_muerta">Mora Muerta</option>
                  <option value="cerrados">Cerrados / Finalizados</option>
                </select>
              </div>

              {/* 2. Asesor */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Asesor / Gestor</Label>
                <select
                  className="w-full border rounded-md px-2.5 py-1.5 text-xs bg-background h-8"
                  value={filtroAsesor}
                  onChange={(e) => {
                    setFiltroAsesor(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="todos">— Todos los gestores de cobranza —</option>
                  {asesoresList.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Modalidad */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Modalidad de Crédito</Label>
                <select
                  className="w-full border rounded-md px-2.5 py-1.5 text-xs bg-background h-8"
                  value={filtroTipoCredito}
                  onChange={(e) => {
                    setFiltroTipoCredito(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="todos">— Individuales y Grupales —</option>
                  <option value="Individual">Solo Individual</option>
                  <option value="Grupal">Solo Grupal</option>
                </select>
              </div>

              {/* 4. Estado */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Estado del Crédito</Label>
                <select
                  className="w-full border rounded-md px-2.5 py-1.5 text-xs bg-background h-8"
                  value={filtroEstado}
                  onChange={(e) => {
                    setFiltroEstado(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="todos">— Todos los estados —</option>
                  <option value="Activo">Activo / Vigente</option>
                  <option value="EnMora">En Mora</option>
                  <option value="CerradoSinRenovacion">Cerrado sin renovación</option>
                  <option value="Finalizado">Finalizado</option>
                </select>
              </div>

              {/* 5. Semanas Restantes */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Semanas Restantes</Label>
                <select
                  className="w-full border rounded-md px-2.5 py-1.5 text-xs bg-background h-8"
                  value={filtroSemanas}
                  onChange={(e) => {
                    setFiltroSemanas(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="todas">— Cualquier plazo restante —</option>
                  <option value="1-4">Por liquidar (1 a 4 sem.)</option>
                  <option value="5-8">Mitad de ciclo (5 a 8 sem.)</option>
                  <option value="9-12">Primer tercio (9 a 12 sem.)</option>
                  <option value="13+">Recién colocados (13+ sem.)</option>
                  <option value="0">0 semanas (Mora o liquidado)</option>
                </select>
              </div>

              {/* 6. Saldo */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Filtro de Saldo</Label>
                <select
                  className="w-full border rounded-md px-2.5 py-1.5 text-xs bg-background h-8"
                  value={filtroSaldo}
                  onChange={(e) => {
                    setFiltroSaldo(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="todos">— Todos los saldos —</option>
                  <option value="con_saldo">Con saldo pendiente (&gt; $0)</option>
                  <option value="liquidado">Liquidado ($0)</option>
                  <option value="mayor_10k">Saldo mayor a $10,000</option>
                </select>
              </div>

              {/* 7. Ordenar por */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-medium text-muted-foreground">Ordenar resultados por</Label>
                <select
                  className="w-full border rounded-md px-2.5 py-1.5 text-xs bg-background h-8"
                  value={ordenarPor}
                  onChange={(e) => {
                    setOrdenarPor(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="folio_asc">Folio (# menor a mayor)</option>
                  <option value="folio_desc">Folio (# mayor a menor)</option>
                  <option value="cliente_asc">Cliente / Grupo (A - Z)</option>
                  <option value="monto_desc">Monto Otorgado (Mayor a menor)</option>
                  <option value="saldo_desc">Saldo Total (Mayor a menor)</option>
                  <option value="semanas_asc">Semanas Restantes (Menor a mayor)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tarjetas KPI de Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="p-3">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Créditos</div>
          <div className="text-xl font-extrabold text-foreground mt-0.5">{filtered.length}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Monto Colocado</div>
          <div className="text-xl font-extrabold text-emerald-700 mt-0.5">
            ${totalMonto.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Saldo Total</div>
          <div className="text-xl font-extrabold text-primary mt-0.5">
            ${totalSaldo.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Saldo Inversión</div>
          <div className="text-xl font-extrabold text-foreground mt-0.5">
            ${totalInversion.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </Card>
        <Card className="p-3 col-span-2 sm:col-span-1">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Asesores</div>
          <div className="text-xl font-extrabold text-foreground mt-0.5">{totalAsesores}</div>
        </Card>
      </div>

      {/* Barra de Búsqueda y Filtros Activos */}
      <div className="space-y-2">
        <TableSearch placeholder="Buscar créditos por cliente, grupo, gestor de cobranza, folio..." value={search} onChange={handleSearch} />

        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1">
            <span className="text-muted-foreground font-medium">Filtros aplicados:</span>
            {getFiltrosAplicados().map((f, i) => (
              <Badge key={i} variant="outline" className="bg-background text-xs py-0.5 px-2 font-normal">
                <span className="text-muted-foreground mr-1">{f.label}:</span>
                <span className="font-semibold text-foreground">{f.valor}</span>
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFiltros}
              className="h-6 text-[11px] text-destructive hover:text-destructive px-1.5 ml-1"
            >
              <X className="size-3 mr-0.5" />
              Limpiar todo
            </Button>
          </div>
        )}
      </div>

      {/* Tabla de Resultados */}
      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Folio</TableHead>
              <TableHead>Cliente / Grupo</TableHead>
              <TableHead>Gestor Cobranza</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Monto</TableHead>
              {showGroupFields && <TableHead>Crédito Total</TableHead>}
              {showGroupFields && <TableHead>Saldo Grupal</TableHead>}
              <TableHead>Saldo Total</TableHead>
              <TableHead>Saldo Inversión</TableHead>
              {showGroupFields && <TableHead>Ahorro Total</TableHead>}
              <TableHead>Semanas Restantes</TableHead>
              {Array.from({ length: 16 }, (_, i) => (
                <TableHead key={i}>{`P-${i + 1}`}</TableHead>
              ))}
              {showGroupFields && Array.from({ length: 16 }, (_, i) => (
                <TableHead key={`a-${i}`}>{`A P${i + 1}`}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={showGroupFields ? 44 : 25} className="h-24 text-center text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showGroupFields ? 44 : 25} className="h-24 text-center text-muted-foreground">
                  {activeFiltersCount > 0
                    ? "No se encontraron créditos con los filtros seleccionados."
                    : "Sin créditos registrados."}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((c: any) => (
                <TableRow key={c.num_prog}>
                  <TableCell className="font-mono">#{c.num_prog}</TableCell>
                  <TableCell className="font-medium whitespace-nowrap">
                    {c.cliente?.nombre_completo || c.grupo?.nombre_grupo || "S/N"}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {c.asesor?.nombre_asesor || "Sin gestor"}
                  </TableCell>
                  <TableCell>{c.tipo_credito}</TableCell>
                  <TableCell>{c.estado}</TableCell>
                  <TableCell>${Number(c.monto_otorgado).toLocaleString("es-MX")}</TableCell>
                  {showGroupFields && <TableCell>${Number(c.credito_total_grupal ?? 0).toLocaleString("es-MX")}</TableCell>}
                  {showGroupFields && <TableCell>${Number(c.saldo_grupal ?? 0).toLocaleString("es-MX")}</TableCell>}
                  <TableCell>
                    ${Number(c.saldo_total ?? c.mora?.saldo_actual ?? c.saldo_pendiente ?? 0).toLocaleString("es-MX")}
                  </TableCell>
                  <TableCell>${Number(c.saldo_inversion ?? 0).toLocaleString("es-MX")}</TableCell>
                  {showGroupFields && <TableCell>${Number(c.ahorro_total_grupal ?? 0).toLocaleString("es-MX")}</TableCell>}
                  <TableCell>{c.semanas_restantes ?? 0}</TableCell>
                  {Array.from({ length: 16 }, (_, i) => (
                    <TableCell key={i}>
                      {Number(c.pagos_programados?.[i] ?? 0) > 0
                        ? `$${Number(c.pagos_programados[i]).toLocaleString("es-MX")}`
                        : "—"}
                    </TableCell>
                  ))}
                  {showGroupFields &&
                    Array.from({ length: 16 }, (_, i) => (
                      <TableCell key={`a-cell-${i}`}>
                        {Number(c.ahorro_programado?.[i] ?? 0) > 0
                          ? `$${Number(c.ahorro_programado[i]).toLocaleString("es-MX")}`
                          : "—"}
                      </TableCell>
                    ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {!loading && (
        <TablePagination
          page={page}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          label="créditos"
        />
      )}
    </div>
  );
}
