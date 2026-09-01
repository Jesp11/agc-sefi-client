"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User,
  Users,
  DollarSign,
  TrendingUp,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Filter,
  X,
  Printer,
  Download,
  FileDown,
} from "lucide-react";
import { toast } from "sonner";
import { fmtFecha } from "@/lib/utils";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { creditoSearchFields, creditoTotal, fetchAllPages, onlyCarteraActiva } from "@/lib/table-utils";
import { CarteraAcciones } from "@/components/cartera-acciones";
import { exportarCarteraPdf } from "@/lib/reporte-cartera-pdf";
import * as XLSX from "xlsx";

export default function CarteraGeneralPage() {
  const router = useRouter();
  const [creditos, setCreditos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { search, handleSearch, page, setPage } = useTableControls();
  const [isExporting, setIsExporting] = useState(false);

  // Estados de filtros desplegables
  const [showFilters, setShowFilters] = useState(false);
  const [filtroTipoCredito, setFiltroTipoCredito] = useState("todos");
  const [filtroAsesor, setFiltroAsesor] = useState("todos");
  const [filtroDia, setFiltroDia] = useState("todos");
  const [filtroCiclo, setFiltroCiclo] = useState("todos");
  const [filtroSaldo, setFiltroSaldo] = useState("todos");
  const [ordenarPor, setOrdenarPor] = useState("folio_asc");

  const fetchCreditos = async () => {
    setLoading(true);
    try {
      const rows = await fetchAllPages("/cartera/activa");
      setCreditos(onlyCarteraActiva(rows));
    } catch {
      toast.error("Error al cargar cartera");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditos();
  }, []);

  // Lista de asesores únicos presentes
  const asesoresList = useMemo(() => {
    const map = new Map<string, string>();
    creditos.forEach((c: any) => {
      const nombre = c.asesor?.nombre_asesor?.trim();
      if (nombre) map.set(nombre, nombre);
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [creditos]);

  // Lista de días de pago únicos presentes
  const diasPagoList = useMemo(() => {
    const set = new Set<string>();
    creditos.forEach((c: any) => {
      if (c.dias_pago) set.add(c.dias_pago.trim().toUpperCase());
    });
    const diasOrden = ["LUNES", "MARTES", "MIERCOLES", "MIÉRCOLES", "JUEVES", "VIERNES", "SABADO", "SÁBADO", "DOMINGO"];
    return Array.from(set).sort((a, b) => {
      const idxA = diasOrden.indexOf(a);
      const idxB = diasOrden.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return a.localeCompare(b);
    });
  }, [creditos]);

  // Contador de filtros activos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filtroTipoCredito !== "todos") count++;
    if (filtroAsesor !== "todos") count++;
    if (filtroDia !== "todos") count++;
    if (filtroCiclo !== "todos") count++;
    if (filtroSaldo !== "todos") count++;
    if (ordenarPor !== "folio_asc") count++;
    if (search.trim()) count++;
    return count;
  }, [filtroTipoCredito, filtroAsesor, filtroDia, filtroCiclo, filtroSaldo, ordenarPor, search]);

  const resetFiltros = () => {
    setFiltroTipoCredito("todos");
    setFiltroAsesor("todos");
    setFiltroDia("todos");
    setFiltroCiclo("todos");
    setFiltroSaldo("todos");
    setOrdenarPor("folio_asc");
    handleSearch("");
    setPage(1);
  };

  // Filtrado compuesto y ordenamiento
  const filtered = useMemo(() => {
    let list = creditos;

    // 1. Tipo de crédito
    if (filtroTipoCredito !== "todos") {
      list = list.filter((c: any) => (c.tipo_credito || "").toLowerCase() === filtroTipoCredito.toLowerCase());
    }

    // 2. Asesor
    if (filtroAsesor !== "todos") {
      list = list.filter((c: any) => (c.asesor?.nombre_asesor || "").trim() === filtroAsesor);
    }

    // 3. Día de pago
    if (filtroDia !== "todos") {
      list = list.filter((c: any) => (c.dias_pago || "").trim().toUpperCase() === filtroDia.toUpperCase());
    }

    // 4. Ciclo
    if (filtroCiclo !== "todos") {
      list = list.filter((c: any) => {
        const ciclo = Number(c.ciclo ?? 1);
        if (filtroCiclo === "1") return ciclo === 1;
        if (filtroCiclo === "2") return ciclo === 2;
        if (filtroCiclo === "3") return ciclo === 3;
        if (filtroCiclo === "4+") return ciclo >= 4;
        return true;
      });
    }

    // 5. Saldo
    if (filtroSaldo !== "todos") {
      list = list.filter((c: any) => {
        const saldo = Number(c.saldo_pendiente ?? c.saldo_total ?? c.total ?? 0);
        if (filtroSaldo === "mayor_10k") return saldo >= 10000;
        if (filtroSaldo === "entre_5k_10k") return saldo >= 5000 && saldo < 10000;
        if (filtroSaldo === "menor_5k") return saldo < 5000;
        if (filtroSaldo === "por_liquidar") return saldo > 0 && saldo <= 2000;
        return true;
      });
    }

    // 6. Búsqueda por texto
    if (search.trim()) {
      list = filterBySearch(list, search, creditoSearchFields);
    }

    // 7. Ordenamiento
    const sorted = [...list].sort((a: any, b: any) => {
      if (ordenarPor === "folio_asc") return Number(a.num_prog) - Number(b.num_prog);
      if (ordenarPor === "folio_desc") return Number(b.num_prog) - Number(a.num_prog);
      if (ordenarPor === "saldo_desc") {
        const sA = Number(a.saldo_pendiente ?? a.saldo_total ?? a.total ?? 0);
        const sB = Number(b.saldo_pendiente ?? b.saldo_total ?? b.total ?? 0);
        return sB - sA;
      }
      if (ordenarPor === "saldo_asc") {
        const sA = Number(a.saldo_pendiente ?? a.saldo_total ?? a.total ?? 0);
        const sB = Number(b.saldo_pendiente ?? b.saldo_total ?? b.total ?? 0);
        return sA - sB;
      }
      if (ordenarPor === "monto_desc") return Number(b.monto_otorgado ?? 0) - Number(a.monto_otorgado ?? 0);
      if (ordenarPor === "nombre_asc") {
        const nameA = a.cliente?.nombre_completo || a.grupo?.nombre_grupo || "";
        const nameB = b.cliente?.nombre_completo || b.grupo?.nombre_grupo || "";
        return nameA.localeCompare(nameB);
      }
      return 0;
    });

    return sorted;
  }, [creditos, filtroTipoCredito, filtroAsesor, filtroDia, filtroCiclo, filtroSaldo, search, ordenarPor]);

  const paginated = paginateItems(filtered, page);

  // KPIs de Cartera General
  const {
    saldoInd,
    saldoGrup,
    totalSaldo,
    totalSaldoInvertido,
    montoInd,
    montoGrup,
    totalMontoColocado,
    conteoInd,
    conteoGrup,
  } = useMemo(() => {
    let sInd = 0;
    let sGrup = 0;
    let sInvTotal = 0;
    let mInd = 0;
    let mGrup = 0;
    let cInd = 0;
    let cGrup = 0;

    for (const c of filtered) {
      const isGrupal = (c.tipo_credito || "").toLowerCase() === "grupal";

      // Saldo total
      const saldo = Number(c.saldo_pendiente ?? c.saldo_total ?? c.total ?? 0);
      const validSaldo = isNaN(saldo) ? 0 : saldo;
      if (isGrupal) {
        sGrup += validSaldo;
        cGrup++;
      } else {
        sInd += validSaldo;
        cInd++;
      }

      // Saldo invertido
      const interes = Number(c.interes ?? 0);
      const invertido = Number(c.saldo_inversion ?? (validSaldo - (isNaN(interes) ? 0 : interes)));
      sInvTotal += isNaN(invertido) ? 0 : invertido;

      // Monto colocado
      const monto = Number(c.monto_otorgado ?? 0);
      const validMonto = isNaN(monto) ? 0 : monto;
      if (isGrupal) {
        mGrup += validMonto;
      } else {
        mInd += validMonto;
      }
    }

    return {
      saldoInd: sInd,
      saldoGrup: sGrup,
      totalSaldo: sInd + sGrup,
      totalSaldoInvertido: sInvTotal,
      montoInd: mInd,
      montoGrup: mGrup,
      totalMontoColocado: mInd + mGrup,
      conteoInd: cInd,
      conteoGrup: cGrup,
    };
  }, [filtered]);

  const getFiltrosAplicados = () => {
    const list: Array<{ label: string; valor: string; reset: () => void }> = [];
    if (filtroTipoCredito !== "todos") {
      list.push({
        label: "Modalidad",
        valor: filtroTipoCredito,
        reset: () => { setFiltroTipoCredito("todos"); setPage(1); },
      });
    }
    if (filtroAsesor !== "todos") {
      list.push({
        label: "Gestor",
        valor: filtroAsesor,
        reset: () => { setFiltroAsesor("todos"); setPage(1); },
      });
    }
    if (filtroDia !== "todos") {
      list.push({
        label: "Día",
        valor: filtroDia,
        reset: () => { setFiltroDia("todos"); setPage(1); },
      });
    }
    if (filtroCiclo !== "todos") {
      list.push({
        label: "Ciclo",
        valor: filtroCiclo === "4+" ? "Ciclo 4+" : `Ciclo ${filtroCiclo}`,
        reset: () => { setFiltroCiclo("todos"); setPage(1); },
      });
    }
    if (filtroSaldo !== "todos") {
      const labels: Record<string, string> = {
        mayor_10k: "> $10,000",
        entre_5k_10k: "$5,000 - $10,000",
        menor_5k: "< $5,000",
        por_liquidar: "Por liquidar (≤ $2,000)",
      };
      list.push({
        label: "Saldo",
        valor: labels[filtroSaldo] || filtroSaldo,
        reset: () => { setFiltroSaldo("todos"); setPage(1); },
      });
    }
    if (ordenarPor !== "folio_asc") {
      const labels: Record<string, string> = {
        folio_desc: "Folio Desc.",
        saldo_desc: "Saldo (Mayor)",
        saldo_asc: "Saldo (Menor)",
        monto_desc: "Monto (Mayor)",
        nombre_asc: "Nombre A-Z",
      };
      list.push({
        label: "Orden",
        valor: labels[ordenarPor] || ordenarPor,
        reset: () => { setOrdenarPor("folio_asc"); setPage(1); },
      });
    }
    return list;
  };

  const handleExportTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      [
        "NUM. PROG",
        "FECHA",
        "TIPO",
        "CLIENTE / GRUPO",
        "DIA",
        "MES",
        "ID CLIENTE",
        "CICLO",
        "DIAS DE PAGO",
        "ASESOR",
        "VALOR FICHA",
        "PLAZOS",
        "MONTO OTORGADO",
        "INTERES",
        "TOTAL",
        "SALDO TOTAL",
        "SALDO INVERSION",
        "SEMANAS RESTANTES",
        "P-1",
        "P-2",
        "P-3",
        "P-4",
      ],
      [
        "1001",
        "2026-08-01",
        "Individual",
        "MARIA GARCIA LOPEZ",
        "1",
        "AGOSTO",
        "MGL001",
        "1",
        "LUNES",
        "CARLOS LOPEZ",
        "500",
        "16",
        "8000",
        "4800",
        "12800",
        "9600",
        "3600",
        "12",
        "800",
        "800",
        "",
        "",
      ],
      [
        "2001",
        "2026-08-01",
        "Grupal",
        "GRUPO LAS FLORES",
        "1",
        "AGOSTO",
        "",
        "1",
        "MARTES",
        "CARLOS LOPEZ",
        "1500",
        "16",
        "24000",
        "14400",
        "38400",
        "28800",
        "10800",
        "12",
        "2400",
        "2400",
        "",
        "",
      ],
    ]);
    ws["!cols"] = Array.from({ length: 22 }, () => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cartera General");
    XLSX.writeFile(wb, "plantilla_cartera_general.xlsx");
    toast.success("Plantilla descargada");
  };

  const handleExportInfo = () => {
    setIsExporting(true);
    try {
      if (filtered.length === 0) {
        toast.error("No hay créditos para exportar");
        return;
      }

      const rows = filtered.map((c: any) => {
        const isGrupal = (c.tipo_credito || "").toLowerCase() === "grupal";
        const nombre = isGrupal
          ? (c.grupo?.nombre_grupo ?? "Grupo")
          : (c.cliente?.nombre_completo ?? "Cliente");
        const idRef = isGrupal
          ? (c.id_grupo ?? "")
          : (c.id_cliente ?? c.cliente?.id_cliente ?? "");

        return {
          "Folio": c.num_prog ?? "",
          "Tipo": c.tipo_credito ?? (isGrupal ? "Grupal" : "Individual"),
          "Cliente / Grupo": nombre,
          "ID": idRef,
          "Fecha": c.fecha_otorgacion ?? "",
          "Ciclo": c.ciclo ?? "",
          "Días de pago": c.dias_pago ?? "",
          "Gestor Cobranza": c.asesor?.nombre_asesor ?? "",
          "Valor ficha": Number(c.valor_ficha ?? 0),
          "Plazos": Number(c.plazos ?? 0),
          "Monto otorgado": Number(c.monto_otorgado ?? 0),
          "Interés": Number(c.interes ?? 0),
          "Total": Number(c.total ?? 0),
          "Saldo pendiente": Number(c.saldo_pendiente ?? c.saldo_total ?? 0),
          "Saldo inversión": Number(c.saldo_inversion ?? 0),
          "Estado": c.estado ?? "",
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Cartera General");
      XLSX.writeFile(wb, `cartera_general_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success("Información exportada a Excel");
    } catch {
      toast.error("Error al exportar cartera");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintPdf = () => {
    if (filtered.length === 0) {
      toast.error("No hay créditos para exportar en PDF");
      return;
    }
    exportarCarteraPdf({
      tipo: "general",
      creditos: filtered,
      filtros: getFiltrosAplicados().map((f) => ({ label: f.label, valor: f.valor })),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground/90">Cartera General</h1>
          <p className="text-muted-foreground">Préstamos activos (individuales y grupales). La mora se gestiona en Cartera en Mora.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3"
            onClick={handlePrintPdf}
            disabled={loading || filtered.length === 0}
          >
            <Printer className="mr-2 h-4 w-4 text-primary" />
            Exportar PDF
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm" className="h-9 px-4" disabled={isExporting}>
                  Acciones
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="min-w-52">
              <DropdownMenuItem onClick={handleExportTemplate} disabled={isExporting}>
                <FileDown className="mr-2 h-4 w-4" />
                Exportar plantilla Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportInfo} disabled={isExporting}>
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? "Exportando..." : "Exportar cartera Excel"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tarjetas KPI de Cartera General */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Cartera Individual */}
        <Card className="p-4 border shadow-sm bg-card hover:border-sky-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Cartera Individual
            </span>
            <div className="p-2 rounded-lg bg-sky-50 text-sky-700">
              <User className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-foreground mt-2">
            ${saldoInd.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {conteoInd} activos · Colocado: ${montoInd.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </Card>

        {/* KPI 2: Cartera Grupal */}
        <Card className="p-4 border shadow-sm bg-card hover:border-purple-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Cartera Grupal
            </span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-700">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-foreground mt-2">
            ${saldoGrup.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {conteoGrup} grupos · Colocado: ${montoGrup.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </Card>

        {/* KPI 3: Saldo Total */}
        <Card className="p-4 border shadow-sm bg-card hover:border-primary/30 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Saldo Total
            </span>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-primary mt-2">
            ${totalSaldo.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {filtered.length} préstamos activos (Colocado: ${totalMontoColocado.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
          </p>
        </Card>

        {/* KPI 4: Saldo Invertido */}
        <Card className="p-4 border shadow-sm bg-card hover:border-teal-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Saldo Invertido
            </span>
            <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-foreground mt-2">
            ${totalSaldoInvertido.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Ganancia proyectada: ${Math.max(0, totalSaldo - totalSaldoInvertido).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </Card>
      </div>

      {/* Barra de Búsqueda y Botón de Filtros */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <TableSearch
            placeholder="Buscar por folio, cliente o grupo..."
            value={search}
            onChange={handleSearch}
            className="flex-1 max-w-md"
          />
          <Button
            variant={showFilters ? "secondary" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="h-9 font-medium shrink-0"
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
        </div>

        {/* Panel Desplegable de Filtros */}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* 1. Modalidad */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Modalidad</Label>
                  <select
                    className="w-full border rounded-md px-2.5 py-1.5 text-xs bg-background h-8"
                    value={filtroTipoCredito}
                    onChange={(e) => {
                      setFiltroTipoCredito(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="todos">— Todas —</option>
                    <option value="Individual">Individual</option>
                    <option value="Grupal">Grupal</option>
                  </select>
                </div>

                {/* 2. Gestor / Asesor */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Gestor Cobranza</Label>
                  <select
                    className="w-full border rounded-md px-2.5 py-1.5 text-xs bg-background h-8"
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

                {/* 3. Día de Pago */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Día de Pago</Label>
                  <select
                    className="w-full border rounded-md px-2.5 py-1.5 text-xs bg-background h-8"
                    value={filtroDia}
                    onChange={(e) => {
                      setFiltroDia(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="todos">— Todos los días —</option>
                    {diasPagoList.map((dia) => (
                      <option key={dia} value={dia}>
                        {dia}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Ciclo */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Ciclo</Label>
                  <select
                    className="w-full border rounded-md px-2.5 py-1.5 text-xs bg-background h-8"
                    value={filtroCiclo}
                    onChange={(e) => {
                      setFiltroCiclo(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="todos">— Todos los ciclos —</option>
                    <option value="1">Ciclo 1 (Nuevos)</option>
                    <option value="2">Ciclo 2</option>
                    <option value="3">Ciclo 3</option>
                    <option value="4+">Ciclo 4 o más</option>
                  </select>
                </div>

                {/* 5. Saldo */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Rango de Saldo</Label>
                  <select
                    className="w-full border rounded-md px-2.5 py-1.5 text-xs bg-background h-8"
                    value={filtroSaldo}
                    onChange={(e) => {
                      setFiltroSaldo(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="todos">— Todos los saldos —</option>
                    <option value="mayor_10k">Mayor a $10,000</option>
                    <option value="entre_5k_10k">$5,000 a $10,000</option>
                    <option value="menor_5k">Menor a $5,000</option>
                    <option value="por_liquidar">Por liquidar (≤ $2,000)</option>
                  </select>
                </div>

                {/* 6. Ordenar */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Ordenar por</Label>
                  <select
                    className="w-full border rounded-md px-2.5 py-1.5 text-xs bg-background h-8"
                    value={ordenarPor}
                    onChange={(e) => {
                      setOrdenarPor(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="folio_asc">Folio (Menor a Mayor)</option>
                    <option value="folio_desc">Folio (Mayor a Menor)</option>
                    <option value="saldo_desc">Saldo (Mayor a Menor)</option>
                    <option value="saldo_asc">Saldo (Menor a Mayor)</option>
                    <option value="monto_desc">Monto Colocado (Mayor)</option>
                    <option value="nombre_asc">Nombre (A-Z)</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chips de Filtros Activos */}
        {getFiltrosAplicados().length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1">
            <span className="text-muted-foreground font-medium">Filtros aplicados:</span>
            {getFiltrosAplicados().map((f, i) => (
              <Badge key={i} variant="outline" className="bg-background text-xs py-0.5 px-2 font-normal flex items-center gap-1">
                <span className="text-muted-foreground">{f.label}:</span>
                <span className="font-semibold text-foreground">{f.valor}</span>
                <button
                  type="button"
                  onClick={f.reset}
                  className="hover:text-destructive text-muted-foreground ml-0.5"
                >
                  <X className="size-3" />
                </button>
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

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[80px]">Folio</TableHead>
              <TableHead>Cliente / Grupo</TableHead>
              <TableHead className="text-center">Tipo</TableHead>
              <TableHead className="text-center">Ciclo</TableHead>
              <TableHead>Día Pago</TableHead>
              <TableHead>Gestor Cobranza</TableHead>
              <TableHead className="text-center">Plazos</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Interés</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Primer Pago</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={12} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    <p className="text-sm text-muted-foreground">Cargando cartera...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="h-32 text-center text-muted-foreground">
                  {search ? "No se encontraron préstamos con ese criterio." : "No hay préstamos registrados."}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((c: any) => {
                const isGrupal = c.tipo_credito === "Grupal";
                const nombre = isGrupal
                  ? (c.grupo?.nombre_grupo ?? "Grupo desconocido")
                  : (c.cliente?.nombre_completo ?? "Cliente desconocido");
                return (
                  <TableRow key={c.num_prog} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs font-semibold text-primary/80">
                      #{c.num_prog}
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {isGrupal
                          ? <Users className="h-4 w-4 text-primary/70" />
                          : <User className="h-4 w-4 text-primary/70" />}
                        {nombre}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={isGrupal ? "default" : "secondary"} className="text-xs">
                        {c.tipo_credito}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-bold text-xs">
                        {c.ciclo ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{c.dias_pago ?? "—"}</TableCell>
                    <TableCell className="text-xs">{c.asesor?.nombre_asesor ?? "—"}</TableCell>
                    <TableCell className="text-center text-xs">{c.plazos} sem</TableCell>
                    <TableCell className="text-xs font-semibold">${c.monto_otorgado}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">${c.interes}</TableCell>
                    <TableCell className="text-xs font-bold text-primary">${creditoTotal(c).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-xs">{c.fecha_primer_pago ? fmtFecha(c.fecha_primer_pago) : "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <CarteraAcciones credito={c} onSuccess={fetchCreditos} />
                        <Button
                          size="sm"
                          className="h-8 text-xs font-medium"
                          onClick={() => router.push(`/dashboard/creditos/${c.num_prog}`)}
                        >
                          Ver Préstamo
                        </Button>
                      </div>
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
          page={page}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          label="préstamos"
        />
      )}
    </div>
  );
}
