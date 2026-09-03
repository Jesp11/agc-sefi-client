"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PlusCircle,
  Users,
  Download,
  FileDown,
  FileSpreadsheet,
  ChevronDown,
  Printer,
} from "lucide-react";
import { CreateGroupForm } from "@/components/create-group-form";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { fetchAllPages, grupoSearchFields } from "@/lib/table-utils";
import { apiFetch } from "@/lib/api";
import { fmtFecha } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { isFieldRoleName } from "@/lib/authz";
import { exportarGruposPdf } from "@/lib/reporte-grupos-pdf";
import * as XLSX from "xlsx";

export default function GruposPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAsesor = isFieldRoleName(user?.role?.nombre);

  const [grupos, setGrupos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { search, handleSearch, page, setPage } = useTableControls();
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const fetchGrupos = async () => {
    setLoading(true);
    try {
      const rows = await fetchAllPages("/grupos");
      setGrupos(rows);
    } catch {
      toast.error("Error al cargar grupos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrupos();
  }, []);

  const filtered = filterBySearch(grupos, search, grupoSearchFields);
  const paginated = paginateItems(filtered, page);

  const handleExportTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Nombre del Grupo", "Gestor Cobranza", "Socio Preferencial", "Integrantes"],
      ["Grupo Las Flores", "Carlos López", "No", "María García López, Juan Pérez"],
      ["Emprendedoras del Valle", "María Gómez", "Sí", ""],
    ]);
    ws["!cols"] = [{ wch: 28 }, { wch: 24 }, { wch: 20 }, { wch: 40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla Grupos");
    XLSX.writeFile(wb, "plantilla_grupos.xlsx");
    toast.success("Plantilla descargada");
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let rows: any[] = [];
      try {
        const res = await apiFetch("/grupos/export");
        if (res.ok) {
          const json = await res.json();
          rows = (json.data || []).map((g: any) => ({
            "ID Grupo": g.id,
            "Nombre del Grupo": g.nombre_grupo,
            "Gestor Cobranza": g.nombre_asesor ?? "",
            "Total Integrantes": g.total_integrantes ?? 0,
            "Integrantes": g.integrantes ?? "",
            "Socio Preferencial": g.es_socio_preferencial ?? "No",
            "Fecha de Alta": g.created_at ? fmtFecha(g.created_at.split("T")[0]) : "",
          }));
        }
      } catch {
        // Fallback local si falla la ruta de export
      }

      if (rows.length === 0) {
        rows = filtered.map((g: any) => ({
          "ID Grupo": g.id_grupo || g.id,
          "Nombre del Grupo": g.nombre_grupo,
          "Gestor Cobranza": g.asesor?.nombre_asesor ?? "",
          "Total Integrantes": g.clientes?.length ?? 0,
          "Integrantes": (g.clientes || []).map((c: any) => c.nombre_completo).join(", "),
          "Socio Preferencial": g.es_socio_preferencial ? "Sí" : "No",
          "Fecha de Alta": g.created_at ? fmtFecha(g.created_at.split("T")[0]) : "",
        }));
      }

      if (rows.length === 0) {
        toast.error("No hay grupos para exportar");
        return;
      }

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Grupos");
      XLSX.writeFile(wb, `grupos_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`${rows.length} grupo(s) exportado(s) a Excel`);
    } catch {
      toast.error("Error al exportar grupos");
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

      if (
        h === "nombre" ||
        h === "nombre_grupo" ||
        h === "nombre grupo" ||
        h === "nombre del grupo" ||
        h === "grupo"
      ) {
        mapped.nombre_grupo = val;
      } else if (
        h === "asesor" ||
        h === "nombre_asesor" ||
        h === "nombre asesor" ||
        h === "gestor" ||
        h === "gestor cobranza" ||
        h === "gestor_cobranza"
      ) {
        mapped.nombre_asesor = val;
      } else if (
        h === "socio preferencial" ||
        h === "socio_preferencial" ||
        h === "preferencial" ||
        h === "es_socio_preferencial"
      ) {
        mapped.es_socio_preferencial = val;
      } else if (
        h === "integrantes" ||
        h === "clientes" ||
        h === "miembros"
      ) {
        mapped.integrantes = val;
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

      const gruposImport = rawRows
        .map(mapImportRow)
        .filter((row) => row.nombre_grupo);

      if (gruposImport.length === 0) {
        toast.error("El archivo no contiene filas válidas. Use la columna: Nombre del Grupo.");
        return;
      }

      const res = await apiFetch("/grupos/import", {
        method: "POST",
        body: JSON.stringify({ grupos: gruposImport }),
      });
      const data = await res.json();

      if ((data.created ?? 0) > 0 || (data.updated ?? 0) > 0) {
        toast.success(data.message || "Importación completada");
        fetchGrupos();
      }

      if (data.errors?.length) {
        const detalle = data.errors
          .slice(0, 3)
          .map((err: { fila: number; mensajes: string[] }) => `Fila ${err.fila}: ${err.mensajes.join(", ")}`)
          .join(" · ");
        toast.error(`${data.errors.length} fila(s) con error. ${detalle}`);
      } else if (!res.ok && !data.created && !data.updated) {
        toast.error(data.message || "Error al importar grupos");
      }
    } catch {
      toast.error("Error al leer el archivo Excel");
    } finally {
      setIsImporting(false);
    }
  };

  const handlePrintPdf = () => {
    if (filtered.length === 0) {
      toast.error("No hay grupos para exportar en PDF");
      return;
    }
    exportarGruposPdf({
      grupos: filtered,
      search: search.trim() ? search : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground/90">Catálogo de Grupos</h1>
          <p className="text-muted-foreground">Administración de grupos de clientes.</p>
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
                Exportar plantilla Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport} disabled={isImporting || isExporting}>
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? "Exportando..." : "Exportar grupos (Excel)"}
              </DropdownMenuItem>
              {!isAsesor && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => importInputRef.current?.click()}
                    disabled={isImporting || isExporting}
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    {isImporting ? "Importando..." : "Importar Excel"}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {!isAsesor && (
            <Button size="sm" className="h-9 px-4" onClick={() => setIsNewGroupModalOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Grupo
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <TableSearch
          placeholder="Buscar por nombre de grupo..."
          value={search}
          onChange={handleSearch}
          className="flex-1 max-w-md"
        />
      </div>

      <Dialog open={isNewGroupModalOpen} onOpenChange={setIsNewGroupModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Grupo</DialogTitle>
          </DialogHeader>
          <CreateGroupForm
            onSuccess={() => { fetchGrupos(); setIsNewGroupModalOpen(false); }}
            onClose={() => setIsNewGroupModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>Nombre del Grupo</TableHead>
              <TableHead>Gestor Cobranza</TableHead>
              <TableHead className="text-center">Día de Pago</TableHead>
              <TableHead className="text-center">Integrantes</TableHead>
              <TableHead className="text-center">Socio Preferencial</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    <p className="text-sm text-muted-foreground">Cargando grupos...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  {search ? "No se encontraron grupos con ese nombre." : "No hay grupos registrados."}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((grupo: any) => {
                const creditosOrdenados = [...(grupo.creditos || [])].sort((a: any, b: any) => (b.num_prog || 0) - (a.num_prog || 0));
                const creditoActivo = creditosOrdenados.find((c: any) => c.estado === "Activo" || c.estado === "EnMora") || creditosOrdenados[0] || null;
                const diaPago = creditoActivo?.dias_pago;

                return (
                  <TableRow key={grupo.id_grupo || grupo.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs font-semibold text-primary/80">
                      #{grupo.id_grupo || grupo.id}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary/70" />
                        {grupo.nombre_grupo}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{grupo.asesor?.nombre_asesor ?? "—"}</TableCell>
                    <TableCell className="text-center">
                      {diaPago ? (
                        <Badge variant="outline" className="text-xs font-semibold">
                          {diaPago}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-bold">
                        {grupo.clientes?.length ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={grupo.es_socio_preferencial ? "default" : "outline"} className="text-xs">
                        {grupo.es_socio_preferencial ? "Sí" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs font-medium"
                        onClick={() => router.push(`/dashboard/grupos/${grupo.id_grupo || grupo.id}`)}
                      >
                        Ver / Editar
                      </Button>
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
          label="grupos"
        />
      )}
    </div>
  );
}
