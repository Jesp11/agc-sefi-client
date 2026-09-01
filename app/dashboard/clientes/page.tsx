"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PlusCircle,
  Download,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  FileDown,
  RotateCcw,
  SlidersHorizontal,
  Filter,
  X,
  Users,
  Star,
  CreditCard,
  UserCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { fmtFecha, fmtTelefono, cleanTelefono } from "@/lib/utils";
import * as XLSX from "xlsx";

import { ClientFormWizard } from "@/components/cliente-form-wizard";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { clienteSearchFields, fetchAllPages } from "@/lib/table-utils";

export default function ClientesPage() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { search, handleSearch, page, setPage } = useTableControls();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Control de panel desplegable de filtros
  const [showFilters, setShowFilters] = useState(false);

  // Filtros avanzados
  const [filtroAsesor, setFiltroAsesor] = useState("todos");
  const [filtroGrupo, setFiltroGrupo] = useState("todos");
  const [filtroEstatus, setFiltroEstatus] = useState("todos");
  const [filtroPreferencial, setFiltroPreferencial] = useState("todos");
  const [filtroCredito, setFiltroCredito] = useState("todos");
  const [ordenarPor, setOrdenarPor] = useState("nombre_asc");

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const rows = await fetchAllPages("/clientes");
      setClientes(rows);
    } catch {
      toast.error("Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  // Listas dinámicas para los selectores de filtro
  const asesoresList = useMemo(() => {
    const set = new Set<string>();
    clientes.forEach((c: any) => {
      const nom = (c.asesor?.nombre_asesor || c.nombre_asesor || "").trim();
      if (nom) set.add(nom);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [clientes]);

  const gruposList = useMemo(() => {
    const set = new Set<string>();
    clientes.forEach((c: any) => {
      const nom = (c.grupos?.[0]?.nombre_grupo || c.nombre_grupo || "").trim();
      if (nom) set.add(nom);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [clientes]);

  // Filtrado y ordenamiento compuesto
  const filtered = useMemo(() => {
    let list = Array.isArray(clientes) ? [...clientes] : [];

    // 1. Gestor Cobranza / Asesor
    if (filtroAsesor === "sin_asesor") {
      list = list.filter((c) => !c.asesor?.nombre_asesor && !c.nombre_asesor);
    } else if (filtroAsesor !== "todos") {
      list = list.filter((c) => {
        const nom = (c.asesor?.nombre_asesor || c.nombre_asesor || "").trim();
        return nom.toLowerCase() === filtroAsesor.toLowerCase();
      });
    }

    // 2. Grupo
    if (filtroGrupo === "sin_grupo") {
      list = list.filter((c) => (!c.grupos || c.grupos.length === 0) && !c.nombre_grupo);
    } else if (filtroGrupo === "con_grupo") {
      list = list.filter((c) => (c.grupos && c.grupos.length > 0) || Boolean(c.nombre_grupo));
    } else if (filtroGrupo !== "todos") {
      list = list.filter((c) => {
        const nom = (c.grupos?.[0]?.nombre_grupo || c.nombre_grupo || "").trim();
        return nom.toLowerCase() === filtroGrupo.toLowerCase();
      });
    }

    // 3. Estatus
    if (filtroEstatus !== "todos") {
      list = list.filter((c) => (c.estatus || "Activo").toLowerCase() === filtroEstatus.toLowerCase());
    }

    // 4. Socio Preferencial
    if (filtroPreferencial === "preferencial") {
      list = list.filter((c) => Boolean(c.es_socio_preferencial));
    } else if (filtroPreferencial === "regular") {
      list = list.filter((c) => !c.es_socio_preferencial);
    }

    // 5. Crédito Activo
    if (filtroCredito === "con_credito") {
      list = list.filter((c) => (c.creditos || []).some((cr: any) => cr.estado === "Activo"));
    } else if (filtroCredito === "sin_credito") {
      list = list.filter((c) => !(c.creditos || []).some((cr: any) => cr.estado === "Activo"));
    }

    // 6. Búsqueda por texto libre
    if (search.trim()) {
      list = filterBySearch(list, search, (c: any) => [
        ...clienteSearchFields(c),
        c.asesor?.nombre_asesor,
        c.grupos?.[0]?.nombre_grupo,
        c.direccion,
        c.telefono,
        c.curp,
      ]);
    }

    // 7. Ordenamiento
    if (ordenarPor === "nombre_desc") {
      list.sort((a, b) => (b.nombre_completo || "").localeCompare(a.nombre_completo || ""));
    } else if (ordenarPor === "id_asc") {
      list.sort((a, b) => (a.id_cliente || "").localeCompare(b.id_cliente || ""));
    } else if (ordenarPor === "id_desc") {
      list.sort((a, b) => (b.id_cliente || "").localeCompare(a.id_cliente || ""));
    } else {
      list.sort((a, b) => (a.nombre_completo || "").localeCompare(b.nombre_completo || ""));
    }

    return list;
  }, [clientes, filtroAsesor, filtroGrupo, filtroEstatus, filtroPreferencial, filtroCredito, ordenarPor, search]);

  const paginated = paginateItems(filtered, page);

  // Helper de chips de filtros activos
  const getFiltrosAplicados = () => {
    const list: Array<{ label: string; valor: string; reset: () => void }> = [];
    if (filtroAsesor !== "todos") {
      list.push({
        label: "Gestor",
        valor: filtroAsesor === "sin_asesor" ? "Sin gestor" : filtroAsesor,
        reset: () => { setFiltroAsesor("todos"); setPage(1); },
      });
    }
    if (filtroGrupo !== "todos") {
      list.push({
        label: "Modalidad",
        valor: filtroGrupo === "sin_grupo" ? "Individual" : filtroGrupo === "con_grupo" ? "Grupal" : filtroGrupo,
        reset: () => { setFiltroGrupo("todos"); setPage(1); },
      });
    }
    if (filtroEstatus !== "todos") {
      list.push({
        label: "Estatus",
        valor: filtroEstatus,
        reset: () => { setFiltroEstatus("todos"); setPage(1); },
      });
    }
    if (filtroPreferencial !== "todos") {
      list.push({
        label: "Socio",
        valor: filtroPreferencial === "preferencial" ? "Preferencial" : "Regular",
        reset: () => { setFiltroPreferencial("todos"); setPage(1); },
      });
    }
    if (filtroCredito !== "todos") {
      list.push({
        label: "Crédito",
        valor: filtroCredito === "con_credito" ? "Con crédito activo" : "Sin crédito",
        reset: () => { setFiltroCredito("todos"); setPage(1); },
      });
    }
    if (ordenarPor !== "nombre_asc") {
      const labels: Record<string, string> = {
        nombre_desc: "Cliente (Z-A)",
        id_asc: "ID (Menor a Mayor)",
        id_desc: "ID (Mayor a Menor)",
      };
      list.push({
        label: "Orden",
        valor: labels[ordenarPor] || ordenarPor,
        reset: () => { setOrdenarPor("nombre_asc"); setPage(1); },
      });
    }
    return list;
  };

  const activeFiltersCount = getFiltrosAplicados().length;

  const resetFiltros = () => {
    setFiltroAsesor("todos");
    setFiltroGrupo("todos");
    setFiltroEstatus("todos");
    setFiltroPreferencial("todos");
    setFiltroCredito("todos");
    setOrdenarPor("nombre_asc");
    handleSearch("");
    setPage(1);
  };

  // KPIs superiores
  const totalConCredito = useMemo(() => {
    return clientes.filter((c) => (c.creditos || []).some((cr: any) => cr.estado === "Activo")).length;
  }, [clientes]);

  const totalPreferenciales = useMemo(() => {
    return clientes.filter((c) => Boolean(c.es_socio_preferencial)).length;
  }, [clientes]);

  const totalGrupales = useMemo(() => {
    return clientes.filter((c) => (c.grupos && c.grupos.length > 0) || Boolean(c.nombre_grupo)).length;
  }, [clientes]);

  // Exportar plantilla Excel vacía con ejemplos
  const handleExportTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      [
        "Nombre",
        "CURP",
        "Clave elector",
        "Teléfono",
        "Dirección",
        "Entre calles",
        "Ocupación",
        "Dirección trabajo",
        "Teléfono trabajo",
        "Asesor",
        "Grupo",
      ],
      [
        "Ej. María García López",
        "GALM850101MDFRPR09",
        "GALM850101HDFRPR09",
        "5512345678",
        "Calle Principal 123",
        "Entre Reforma y Juárez",
        "Comerciante",
        "Mercado Central Local 5",
        "5598765432",
        "Carlos López",
        "",
      ],
    ]);
    ws["!cols"] = [
      { wch: 28 },
      { wch: 20 },
      { wch: 22 },
      { wch: 14 },
      { wch: 30 },
      { wch: 24 },
      { wch: 18 },
      { wch: 28 },
      { wch: 16 },
      { wch: 22 },
      { wch: 18 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, "plantilla_clientes.xlsx");
    toast.success("Plantilla descargada");
  };

  // Exportar datos respetando los filtros aplicados
  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error("No hay clientes que coincidan con los filtros para exportar");
      return;
    }

    setIsExporting(true);
    try {
      const headers = [
        "ID Cliente",
        "Nombre",
        "CURP",
        "Clave elector",
        "Teléfono",
        "Dirección",
        "Entre calles",
        "Ocupación",
        "Dirección trabajo",
        "Teléfono trabajo",
        "Gestor Cobranza",
        "Grupo",
        "Socio Preferencial",
        "Estatus",
        "Crédito Activo",
        "Fecha de alta",
      ];

      const dataRows = filtered.map((c: any) => {
        const creditoActivo = (c.creditos || []).find((cr: any) => cr.estado === "Activo");
        const creditoTexto = creditoActivo
          ? `#${creditoActivo.num_prog} (${creditoActivo.tipo_credito || "Individual"})`
          : "Sin crédito activo";

        return [
          c.id_cliente ?? c.id ?? "",
          c.nombre_completo ?? "",
          c.curp ?? "",
          c.clave_elector ?? "",
          c.telefono ?? "",
          c.direccion ?? "",
          c.entre_calles ?? "",
          c.ocupacion ?? "",
          c.direccion_trabajo ?? "",
          c.telefono_trabajo ?? "",
          c.nombre_asesor ?? c.asesor?.nombre_asesor ?? "",
          c.nombre_grupo ?? c.grupos?.[0]?.nombre_grupo ?? "",
          c.es_socio_preferencial ? "Sí" : "No",
          c.estatus ?? "Activo",
          creditoTexto,
          c.created_at ? fmtFecha(String(c.created_at).split("T")[0]) : "",
        ];
      });

      const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
      ws["!cols"] = [
        { wch: 14 }, // ID Cliente
        { wch: 32 }, // Nombre
        { wch: 22 }, // CURP
        { wch: 20 }, // Clave elector
        { wch: 16 }, // Teléfono
        { wch: 35 }, // Dirección
        { wch: 25 }, // Entre calles
        { wch: 22 }, // Ocupación
        { wch: 30 }, // Dirección trabajo
        { wch: 18 }, // Teléfono trabajo
        { wch: 28 }, // Gestor Cobranza
        { wch: 20 }, // Grupo
        { wch: 18 }, // Socio Preferencial
        { wch: 14 }, // Estatus
        { wch: 22 }, // Crédito Activo
        { wch: 16 }, // Fecha de alta
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Clientes");
      XLSX.writeFile(wb, `clientes_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`${dataRows.length} cliente(s) exportado(s) a Excel`);
    } catch {
      toast.error("Error al exportar clientes");
    } finally {
      setIsExporting(false);
    }
  };

  const normalizeHeader = (header: string) =>
    header
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const mapImportRow = (row: Record<string, unknown>) => {
    const mapped: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      const h = normalizeHeader(key);
      const val = String(value ?? "").trim();
      if (!val) continue;
      if (h === "nombre" || h === "nombre_completo" || h === "nombre completo") {
        mapped.nombre_completo = val;
      } else if (h === "curp") {
        mapped.curp = val.toUpperCase();
      } else if (h === "clave elector" || h === "clave_elector") {
        mapped.clave_elector = val;
      } else if (h === "telefono" || h === "tel" || h === "celular") {
        mapped.telefono = cleanTelefono(val) || val;
      } else if (h === "direccion") {
        mapped.direccion = val;
      } else if (h === "entre calles" || h === "entre_calles") {
        mapped.entre_calles = val;
      } else if (h === "ocupacion") {
        mapped.ocupacion = val;
      } else if (h === "direccion trabajo" || h === "direccion_trabajo") {
        mapped.direccion_trabajo = val;
      } else if (h === "telefono trabajo" || h === "telefono_trabajo") {
        mapped.telefono_trabajo = val;
      } else if (
        h === "asesor" ||
        h === "nombre_asesor" ||
        h === "nombre asesor" ||
        h === "gestor" ||
        h === "gestor cobranza"
      ) {
        mapped.nombre_asesor = val;
      } else if (h === "grupo" || h === "nombre_grupo" || h === "nombre grupo") {
        mapped.nombre_grupo = val;
      }
    }
    return mapped;
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setIsImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

      const clientesImport = rawRows
        .map(mapImportRow)
        .filter((row) => row.nombre_completo || row.curp);

      if (clientesImport.length === 0) {
        toast.error("El archivo no contiene filas válidas. Use columnas: Nombre, CURP, Asesor.");
        return;
      }

      const res = await apiFetch("/clientes/import", {
        method: "POST",
        body: JSON.stringify({ clientes: clientesImport }),
      });
      const data = await res.json();

      if ((data.created ?? 0) > 0 || (data.updated ?? 0) > 0) {
        toast.success(data.message || "Importación completada");
        fetchClientes();
      }

      if (data.errors?.length) {
        const detalle = data.errors
          .slice(0, 3)
          .map((err: { fila: number; mensajes: string[] }) => `Fila ${err.fila}: ${err.mensajes.join(", ")}`)
          .join(" · ");
        toast.error(`${data.errors.length} fila(s) con error. ${detalle}`);
      } else if (!res.ok && !data.created && !data.updated) {
        toast.error(data.message || "Error al importar clientes");
      }
    } catch {
      toast.error("Error al leer el archivo Excel");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground/90">Catálogo de Clientes</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Gestión, filtrado y exportación de clientes y sus perfiles de préstamo.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleImportFile}
          />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm" className="h-9 px-3" disabled={isImporting || isExporting}>
                  Acciones
                  <ChevronDown className="ml-1.5 h-4 w-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="min-w-52">
              <DropdownMenuItem onClick={handleExportTemplate} disabled={isImporting || isExporting}>
                <FileDown className="mr-2 h-4 w-4" />
                Exportar plantilla Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport} disabled={isImporting || isExporting || filtered.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? "Exportando..." : `Exportar clientes Excel (${filtered.length})`}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => importInputRef.current?.click()}
                disabled={isImporting || isExporting}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {isImporting ? "Importando..." : "Importar clientes"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3"
            onClick={handleExport}
            disabled={isExporting || filtered.length === 0}
            title="Exporta los clientes que cumplen con los filtros actuales"
          >
            <Download className="mr-1.5 h-4 w-4 text-emerald-600" />
            {isExporting ? "Exportando..." : "Exportar datos"}
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger
              render={
                <Button size="sm" className="h-9 px-3">
                  <PlusCircle className="mr-1.5 h-4 w-4" />
                  Nuevo Cliente
                </Button>
              }
            />
            <DialogContent className="sm:max-w-[600px] h-[520px] flex flex-col">
              <DialogHeader>
                <DialogTitle>Registro de Nuevo Cliente</DialogTitle>
              </DialogHeader>
              <ClientFormWizard
                onSuccess={() => {
                  fetchClientes();
                  setIsDialogOpen(false);
                }}
                onClose={() => setIsDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tarjetas KPI de Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="p-4 border shadow-sm bg-card hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Clientes
            </span>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-foreground mt-2">
            {loading ? "..." : clientes.length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {filtered.length === clientes.length
              ? "Todos los clientes registrados"
              : `Mostrando ${filtered.length} con filtros`}
          </p>
        </Card>

        <Card className="p-4 border shadow-sm bg-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Con Crédito Activo
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-2">
            {loading ? "..." : totalConCredito}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Préstamos vigentes en cobro
          </p>
        </Card>

        <Card className="p-4 border shadow-sm bg-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Socios Preferenciales
            </span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <Star className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-700 mt-2">
            {loading ? "..." : totalPreferenciales}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Clientes con trato preferencial
          </p>
        </Card>

        <Card className="p-4 border shadow-sm bg-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              En Cartera Grupal
            </span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-700">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-purple-700 mt-2">
            {loading ? "..." : totalGrupales}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {clientes.length - totalGrupales} individuales
          </p>
        </Card>
      </div>

      {/* Barra de Búsqueda y Botón de Filtros Estilo Estándar */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <TableSearch
            placeholder="Buscar por nombre, ID, teléfono, CURP o gestor..."
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
            {showFilters ? (
              <ChevronUp className="ml-1.5 h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {/* Panel Desplegable de Filtros */}
        {showFilters && (
          <Card className="border shadow-sm bg-muted/20 animate-in fade-in-50 duration-200">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Filter className="size-4 text-primary" />
                  <span>Criterios y Filtros de Clientes</span>
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
                {/* 1. Gestor / Asesor */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Gestor Cobranza</Label>
                  <select
                    className="w-full border rounded-md px-2.5 py-1.5 text-xs bg-background h-8 cursor-pointer"
                    value={filtroAsesor}
                    onChange={(e) => {
                      setFiltroAsesor(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="todos">— Todos los gestores —</option>
                    {asesoresList.map((nom) => (
                      <option key={nom} value={nom}>
                        {nom}
                      </option>
                    ))}
                    <option value="sin_asesor">Sin gestor asignado</option>
                  </select>
                </div>

                {/* 2. Modalidad / Grupo */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Modalidad / Grupo</Label>
                  <select
                    className="w-full border rounded-md px-2.5 py-1.5 text-xs bg-background h-8 cursor-pointer"
                    value={filtroGrupo}
                    onChange={(e) => {
                      setFiltroGrupo(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="todos">— Todas las modalidades —</option>
                    <option value="sin_grupo">Individual (Sin grupo)</option>
                    <option value="con_grupo">Grupal (Cualquier grupo)</option>
                    {gruposList.length > 0 && (
                      <optgroup label="Grupos específicos">
                        {gruposList.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                {/* 3. Estatus */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Estatus</Label>
                  <select
                    className="w-full border rounded-md px-2.5 py-1.5 text-xs bg-background h-8 cursor-pointer"
                    value={filtroEstatus}
                    onChange={(e) => {
                      setFiltroEstatus(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="todos">— Todos los estatus —</option>
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                    <option value="Cerrado">Cerrado</option>
                  </select>
                </div>

                {/* 4. Socio Preferencial */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Tipo de Socio</Label>
                  <select
                    className="w-full border rounded-md px-2.5 py-1.5 text-xs bg-background h-8 cursor-pointer"
                    value={filtroPreferencial}
                    onChange={(e) => {
                      setFiltroPreferencial(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="todos">— Todos los socios —</option>
                    <option value="preferencial">⭐ Solo Preferenciales</option>
                    <option value="regular">Regulares (No preferenciales)</option>
                  </select>
                </div>

                {/* 5. Crédito Activo */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Crédito Activo</Label>
                  <select
                    className="w-full border rounded-md px-2.5 py-1.5 text-xs bg-background h-8 cursor-pointer"
                    value={filtroCredito}
                    onChange={(e) => {
                      setFiltroCredito(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="todos">— Todos los clientes —</option>
                    <option value="con_credito">Con crédito activo</option>
                    <option value="sin_credito">Sin crédito activo</option>
                  </select>
                </div>

                {/* 6. Ordenar por */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Ordenar por</Label>
                  <select
                    className="w-full border rounded-md px-2.5 py-1.5 text-xs bg-background h-8 cursor-pointer"
                    value={ordenarPor}
                    onChange={(e) => {
                      setOrdenarPor(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="nombre_asc">Cliente (A-Z)</option>
                    <option value="nombre_desc">Cliente (Z-A)</option>
                    <option value="id_asc">ID Cliente (Menor a Mayor)</option>
                    <option value="id_desc">ID Cliente (Mayor a Menor)</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chips de Filtros Activos con botón X */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1">
            <span className="text-muted-foreground font-medium">Filtros aplicados:</span>
            {getFiltrosAplicados().map((f, i) => (
              <Badge
                key={i}
                variant="outline"
                className="bg-background text-xs py-0.5 px-2 font-normal flex items-center gap-1"
              >
                <span className="text-muted-foreground">{f.label}:</span>
                <span className="font-semibold text-foreground">{f.valor}</span>
                <button
                  type="button"
                  onClick={f.reset}
                  className="hover:text-destructive text-muted-foreground ml-0.5 cursor-pointer"
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

      {/* Tabla de Clientes */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[100px]">ID Cliente</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Modalidad / Grupo</TableHead>
              <TableHead className="text-center">Ciclo</TableHead>
              <TableHead>Día de Pago</TableHead>
              <TableHead>Gestor Cobranza</TableHead>
              <TableHead className="text-center">Estatus</TableHead>
              <TableHead className="text-center">Crédito Activo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow key="loading">
                <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    <p className="text-sm">Cargando catálogo de clientes...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow key="empty">
                <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                  {activeFiltersCount > 0 || search
                    ? "No se encontraron clientes que coincidan con los filtros seleccionados."
                    : "No hay clientes registrados en el sistema."}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((cliente: any, index: number) => {
                const creditos = cliente.creditos || [];
                const ultimoCredito = creditos.length > 0 ? creditos[creditos.length - 1] : null;
                const creditoActivo = creditos.find((cr: any) => cr.estado === "Activo");
                const grupo = (cliente.grupos && cliente.grupos.length > 0) ? cliente.grupos[0] : null;
                const esPreferencial = Boolean(cliente.es_socio_preferencial);

                return (
                  <TableRow key={cliente.id_cliente || cliente.id || index} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs font-semibold text-primary/90">
                      #{cliente.id_cliente || cliente.id}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        {cliente.nombre_completo}
                        {esPreferencial && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-amber-100 text-amber-800 border-amber-300 font-semibold px-1.5 py-0"
                            title="Socio Preferencial"
                          >
                            ⭐ Preferencial
                          </Badge>
                        )}
                      </div>
                      {cliente.telefono && cliente.telefono !== "S/N" && (
                        <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          Tel: {fmtTelefono(cliente.telefono)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {grupo ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          {grupo.nombre_grupo}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Individual</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">
                        {ultimoCredito?.ciclo ?? "0"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {ultimoCredito?.dias_pago ? (
                        <span className="capitalize">{String(ultimoCredito.dias_pago).toLowerCase()}</span>
                      ) : (
                        <span className="text-muted-foreground italic">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {cliente.asesor?.nombre_asesor || cliente.nombre_asesor || (
                        <span className="text-muted-foreground italic">Sin gestor</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          cliente.estatus === "Activo"
                            ? "default"
                            : cliente.estatus === "Cerrado"
                            ? "destructive"
                            : "outline"
                        }
                        className="text-xs capitalize font-medium"
                      >
                        {cliente.estatus || "Activo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {creditoActivo ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          #{creditoActivo.num_prog}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin crédito</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => router.push(`/dashboard/clientes/${cliente.id_cliente || cliente.id}`)}
                      >
                        Ver perfil
                      </Button>
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
          label="clientes"
        />
      )}
    </div>
  );
}
