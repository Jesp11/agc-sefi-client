"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/context/auth-context";
import { isFieldRoleName } from "@/lib/authz";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  PlusCircle,
  CalendarDays,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  Download,
  FileDown,
  ChevronDown,
  SlidersHorizontal,
  ChevronUp,
  RotateCcw,
  Filter,
  X,
  Printer,
} from "lucide-react";
import { CustomLoanForm } from "@/components/custom-loan-form";
import { CarteraAcciones } from "@/components/cartera-acciones";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { creditoSearchFields, creditoTotal, fetchAllPages, onlyCarteraActiva } from "@/lib/table-utils";
import { exportarCarteraPdf } from "@/lib/reporte-cartera-pdf";
import { apiUpload } from "@/lib/api";
import * as XLSX from "xlsx";

export default function CreditosGrupalesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAsesor = isFieldRoleName(user?.role?.nombre);
  const [creditos, setCreditos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { search, handleSearch, page, setPage } = useTableControls();
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Estados de filtros desplegables
  const [showFilters, setShowFilters] = useState(false);
  const [filtroAsesor, setFiltroAsesor] = useState("todos");
  const [filtroDia, setFiltroDia] = useState("todos");
  const [filtroCiclo, setFiltroCiclo] = useState("todos");
  const [filtroSaldo, setFiltroSaldo] = useState("todos");
  const [ordenarPor, setOrdenarPor] = useState("folio_asc");

  const fetchCreditos = async () => {
    setLoading(true);
    try {
      const rows = await fetchAllPages("/cartera/activa?tipo=grupal");
      setCreditos(onlyCarteraActiva(rows));
    } catch {
      toast.error("Error al cargar créditos grupales");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditos();
  }, []);

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append("archivo", file);

      const res = await apiUpload("/cartera/import/grupal", formData);
      const data = await res.json();

      if (!res.ok) {
        const detail = [...(data.error ?? []), ...(data.output ?? [])].slice(0, 4).join(" · ");
        toast.error(detail || data.message || "Error al importar cartera grupal");
        return;
      }

      toast.success("Cartera grupal importada");
      fetchCreditos();
    } catch {
      toast.error("Error al importar cartera grupal");
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["NUM. PROG", "FECHA", "CLIENTE", "CURP", "CLAVE DE ELECTOR", "DIA", "MES", "ID CLIENTE", "GRUPO", "CICLO", "DIAS DE PAGO", "ASESOR", "VALOR", "PLAZOS", "MONTO OTORGADO", "INTERES", "TOTAL", "SALDO TOTAL", "SALDO INVERSION", "SEMANAS FALTANTES", "CREDITO TOTAL", "SALDO GRUPAL", "P-1", "P-2", "P-3", "P-4"],
      ["2001", "2026-08-01", "JUANA PEREZ", "PEPJ900101MTSRNN08", "ABC1234567890", "1", "AGOSTO", "JP001", "LAS FLORES", "1", "MARTES", "LUIS HERNANDEZ", "450", "16", "6000", "2400", "8400", "6300", "4500", "12", "25200", "18900", "450", "450", "", ""],
    ]);
    ws["!cols"] = Array.from({ length: 26 }, () => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cartera Grupal");
    XLSX.writeFile(wb, "plantilla_cartera_grupal.xlsx");
    toast.success("Plantilla descargada");
  };

  const handleExportInfo = () => {
    setIsExporting(true);
    try {
      if (filtered.length === 0) {
        toast.error("No hay créditos para exportar");
        return;
      }

      const rows = filtered.map((c: any) => ({
        "Folio": c.num_prog ?? "",
        "Fecha": c.fecha_otorgacion ?? "",
        "Grupo": c.grupo?.nombre_grupo ?? "",
        "Ciclo": c.ciclo ?? "",
        "Días de pago": c.dias_pago ?? "",
        "Gestor Cobranza": c.asesor?.nombre_asesor ?? "",
        "Valor ficha": Number(c.valor_ficha ?? 0),
        "Plazos": Number(c.plazos ?? 0),
        "Monto otorgado": Number(c.monto_otorgado ?? 0),
        "Interés": Number(c.interes ?? 0),
        "Total": Number(creditoTotal(c) ?? 0),
        "Saldo pendiente": Number(c.saldo_pendiente ?? c.saldo_total ?? 0),
        "Saldo inversión": Number(c.saldo_inversion ?? 0),
        "Estado": c.estado ?? "",
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Créditos Grupales");
      XLSX.writeFile(wb, `creditos_grupales_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success("Información exportada");
    } finally {
      setIsExporting(false);
    }
  };

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
    if (filtroAsesor !== "todos") count++;
    if (filtroDia !== "todos") count++;
    if (filtroCiclo !== "todos") count++;
    if (filtroSaldo !== "todos") count++;
    if (ordenarPor !== "folio_asc") count++;
    if (search.trim()) count++;
    return count;
  }, [filtroAsesor, filtroDia, filtroCiclo, filtroSaldo, ordenarPor, search]);

  const resetFiltros = () => {
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

    // 1. Asesor
    if (filtroAsesor !== "todos") {
      list = list.filter((c: any) => (c.asesor?.nombre_asesor || "").trim() === filtroAsesor);
    }

    // 2. Día de pago
    if (filtroDia !== "todos") {
      list = list.filter((c: any) => (c.dias_pago || "").trim().toUpperCase() === filtroDia.toUpperCase());
    }

    // 3. Ciclo
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

    // 4. Saldo (adaptado a montos grupales)
    if (filtroSaldo !== "todos") {
      list = list.filter((c: any) => {
        const saldo = Number(c.saldo_pendiente ?? c.saldo_total ?? c.total ?? 0);
        if (filtroSaldo === "mayor_25k") return saldo >= 25000;
        if (filtroSaldo === "entre_10k_25k") return saldo >= 10000 && saldo < 25000;
        if (filtroSaldo === "menor_10k") return saldo < 10000;
        if (filtroSaldo === "por_liquidar") return saldo > 0 && saldo <= 5000;
        return true;
      });
    }

    // 5. Búsqueda por texto
    if (search.trim()) {
      list = filterBySearch(list, search, creditoSearchFields);
    }

    // 6. Ordenamiento
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
        const nameA = a.grupo?.nombre_grupo || "";
        const nameB = b.grupo?.nombre_grupo || "";
        return nameA.localeCompare(nameB);
      }
      return 0;
    });

    return sorted;
  }, [creditos, filtroAsesor, filtroDia, filtroCiclo, filtroSaldo, search, ordenarPor]);

  const paginated = paginateItems(filtered, page);

  // KPIs solicitados para Cartera Grupal
  const totalRecuperacionSemanal = useMemo(() => {
    return filtered.reduce((sum, c) => {
      const ficha = Number(c.valor_ficha ?? (c.plazos ? Number(c.total) / Number(c.plazos) : 0));
      return sum + (isNaN(ficha) ? 0 : ficha);
    }, 0);
  }, [filtered]);

  const totalSaldo = useMemo(() => {
    return filtered.reduce((sum, c) => {
      const saldo = Number(c.saldo_pendiente ?? c.saldo_total ?? c.total ?? 0);
      return sum + (isNaN(saldo) ? 0 : saldo);
    }, 0);
  }, [filtered]);

  const totalSaldoInvertido = useMemo(() => {
    return filtered.reduce((sum, c) => {
      const saldo = Number(c.saldo_pendiente ?? c.saldo_total ?? c.total ?? 0);
      const interes = Number(c.interes ?? 0);
      const invertido = Number(c.saldo_inversion ?? (saldo - interes));
      return sum + (isNaN(invertido) ? 0 : invertido);
    }, 0);
  }, [filtered]);

  const totalMontoColocado = useMemo(() => {
    return filtered.reduce((sum, c) => sum + Number(c.monto_otorgado ?? 0), 0);
  }, [filtered]);

  const getFiltrosAplicados = () => {
    const list: Array<{ label: string; valor: string; reset: () => void }> = [];
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
        mayor_25k: "> $25,000",
        entre_10k_25k: "$10,000 - $25,000",
        menor_10k: "< $10,000",
        por_liquidar: "Por liquidar (≤ $5,000)",
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
        nombre_asc: "Grupo A-Z",
      };
      list.push({
        label: "Orden",
        valor: labels[ordenarPor] || ordenarPor,
        reset: () => { setOrdenarPor("folio_asc"); setPage(1); },
      });
    }
    return list;
  };

  const handlePrintPdf = () => {
    if (filtered.length === 0) {
      toast.error("No hay créditos para exportar en PDF");
      return;
    }
    exportarCarteraPdf({
      tipo: "grupal",
      creditos: filtered,
      filtros: getFiltrosAplicados().map((f) => ({ label: f.label, valor: f.valor })),
    });
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground/90">Préstamo Grupal</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestión y seguimiento de créditos grupales activos. Importa solo el Excel de esta pantalla.
          </p>
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
          {!isAsesor && (
            <>
              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleImportFile}
              />
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="outline" size="sm" className="h-9 px-4" disabled={isImporting || isExporting}>
                      Acciones
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="min-w-52">
                  <DropdownMenuItem onClick={handlePrintPdf} disabled={isImporting || isExporting || filtered.length === 0}>
                    <Printer className="mr-2 h-4 w-4" />
                    Exportar PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportTemplate} disabled={isImporting || isExporting}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Exportar plantilla
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportInfo} disabled={isImporting || isExporting}>
                    <Download className="mr-2 h-4 w-4" />
                    {isExporting ? "Exportando..." : "Exportar cartera"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => importInputRef.current?.click()}
                    disabled={isImporting || isExporting}
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    {isImporting ? "Importando..." : "Importar Excel"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="sm" className="h-9 px-4" onClick={() => setIsCustomModalOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Crear Préstamo
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tarjetas KPI de Cartera Grupal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="p-4 border shadow-sm bg-card hover:border-emerald-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Recuperación
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <CalendarDays className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-2">
            ${totalRecuperacionSemanal.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Suma del valor de fichas semanales</p>
        </Card>

        <Card className="p-4 border shadow-sm bg-card hover:border-primary/30 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Valor Total
            </span>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-primary mt-2">
            ${totalSaldo.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Suma de saldos totales pendientes</p>
        </Card>

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
          <p className="text-[11px] text-muted-foreground mt-1">Suma del capital activo en colocación</p>
        </Card>

        <Card className="p-4 border shadow-sm bg-card hover:border-muted-foreground/30 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Grupos
            </span>
            <div className="p-2 rounded-lg bg-muted text-muted-foreground">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-foreground mt-2">
            {filtered.length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Colocado: ${totalMontoColocado.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </Card>
      </div>

      {/* Barra de Búsqueda y Botón de Filtros */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <TableSearch
            placeholder="Buscar por grupo, gestor de cobranza o folio..."
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
                  <span>Criterios y Filtros de Cartera Grupal</span>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* 1. Gestor / Asesor */}
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

                {/* 2. Día de Pago */}
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

                {/* 3. Ciclo */}
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

                {/* 4. Saldo */}
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
                    <option value="mayor_25k">Mayor a $25,000</option>
                    <option value="entre_10k_25k">$10,000 a $25,000</option>
                    <option value="menor_10k">Menor a $10,000</option>
                    <option value="por_liquidar">Por liquidar (≤ $5,000)</option>
                  </select>
                </div>

                {/* 5. Ordenar */}
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
                    <option value="nombre_asc">Grupo (A-Z)</option>
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

      {/* Modal de Crear Préstamo Grupal */}
      {!isAsesor && (
        <Dialog open={isCustomModalOpen} onOpenChange={setIsCustomModalOpen}>
          <DialogContent className="sm:max-w-[600px] h-[560px] flex flex-col">
            <DialogHeader>
              <DialogTitle>Crear Préstamo Grupal</DialogTitle>
            </DialogHeader>
            <CustomLoanForm
              type="grupal"
              onSuccess={() => {
                fetchCreditos();
                setIsCustomModalOpen(false);
              }}
              onClose={() => setIsCustomModalOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Tabla de Créditos Grupales */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[80px]">Folio</TableHead>
              <TableHead>Nombre Grupo</TableHead>
              <TableHead className="text-center">Ciclo</TableHead>
              <TableHead>Día Pago</TableHead>
              <TableHead>Gestor Cobranza</TableHead>
              <TableHead className="text-center">Plazos</TableHead>
              <TableHead>Ficha semanal</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Interés</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    <p className="text-sm text-muted-foreground">Cargando créditos...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="h-32 text-center text-muted-foreground">
                  {search ? "No se encontraron créditos con ese criterio." : "No hay créditos grupales activos."}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((c: any) => (
                <TableRow key={c.num_prog} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono text-xs font-semibold text-primary/80">#{c.num_prog}</TableCell>
                  <TableCell className="font-medium whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary/70" />
                      {c.grupo?.nombre_grupo ?? "—"}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-bold">
                      {c.ciclo}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{c.dias_pago ?? "—"}</TableCell>
                  <TableCell className="text-xs">{c.asesor?.nombre_asesor ?? "—"}</TableCell>
                  <TableCell className="text-center text-xs">{c.plazos} sem</TableCell>
                  <TableCell className="text-xs font-bold text-emerald-700">
                    ${Number(c.valor_ficha ?? (c.plazos ? creditoTotal(c) / Number(c.plazos) : 0)).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-xs font-semibold">${Number(c.monto_otorgado).toLocaleString("es-MX")}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">${Number(c.interes).toLocaleString("es-MX")}</TableCell>
                  <TableCell className="text-xs font-bold text-primary">
                    ${creditoTotal(c).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
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
              ))
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
          label="créditos"
        />
      )}
    </div>
  );
}
