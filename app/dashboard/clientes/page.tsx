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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlusCircle, Download, FileSpreadsheet, ChevronDown, FileDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { fmtFecha } from "@/lib/utils";
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

  const filtered = filterBySearch(Array.isArray(clientes) ? clientes : [], search, clienteSearchFields);
  const paginated = paginateItems(filtered, page);

  const handleExportTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Nombre", "CURP", "Clave elector", "Teléfono", "Dirección", "Entre calles", "Ocupación", "Dirección trabajo", "Teléfono trabajo", "Asesor", "Grupo"],
      ["Ej. María García López", "GALM850101MDFRPR09", "GALM850101HDFRPR09", "5512345678", "Calle Principal 123", "Entre Reforma y Juárez", "Comerciante", "Mercado Central Local 5", "5598765432", "Carlos López", ""],
    ]);
    ws["!cols"] = [{ wch: 28 }, { wch: 20 }, { wch: 22 }, { wch: 14 }, { wch: 30 }, { wch: 24 }, { wch: 18 }, { wch: 28 }, { wch: 16 }, { wch: 22 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, "plantilla_clientes.xlsx");
    toast.success("Plantilla descargada");
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await apiFetch("/clientes/export");
      const json = await res.json();
      if (!res.ok) {
        toast.error("Error al exportar clientes");
        return;
      }

      const rows = (json.data || []).map((c: any) => ({
        "ID Cliente": c.id_cliente ?? "",
        "Nombre": c.nombre_completo ?? "",
        "CURP": c.curp ?? "",
        "Clave elector": c.clave_elector ?? "",
        "Teléfono": c.telefono ?? "",
        "Dirección": c.direccion ?? "",
        "Entre calles": c.entre_calles ?? "",
        "Ocupación": c.ocupacion ?? "",
        "Dirección trabajo": c.direccion_trabajo ?? "",
        "Teléfono trabajo": c.telefono_trabajo ?? "",
        "Gestor Cobranza": c.nombre_asesor ?? "",
        "Grupo": c.nombre_grupo ?? "",
        "Estatus": c.estatus ?? "",
        "Fecha de alta": c.created_at ? fmtFecha(c.created_at.split("T")[0]) : "",
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Clientes");
      XLSX.writeFile(wb, `clientes_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`${rows.length} cliente(s) exportado(s)`);
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
      } else if (h === "telefono" || h === "tel") {
        mapped.telefono = val;
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
      } else if (h === "asesor" || h === "nombre_asesor" || h === "nombre asesor") {
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground/90">Clientes</h1>
        <p className="text-muted-foreground">Gestión de cartera de clientes y sus perfiles de préstamo.</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <TableSearch
          placeholder="Buscar clientes..."
          value={search}
          onChange={handleSearch}
          className="flex-1 max-w-md"
        />
        <div className="flex items-center gap-2">
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
                <Button variant="outline" size="sm" className="h-10 px-4" disabled={isImporting || isExporting}>
                  Acciones
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="min-w-52">
              <DropdownMenuItem onClick={handleExportTemplate} disabled={isImporting || isExporting}>
                <FileDown className="mr-2 h-4 w-4" />
                Exportar plantilla
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport} disabled={isImporting || isExporting}>
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? "Exportando..." : "Exportar clientes"}
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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger
              render={
                <Button size="sm" className="h-10 px-4">
                  <PlusCircle className="mr-2 h-4 w-4" />
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

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Cliente</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Grupo</TableHead>
              <TableHead>Ciclo</TableHead>
              <TableHead>Día de Pago</TableHead>
              <TableHead>Gestor Cobranza</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow key="loading">
                <TableCell colSpan={7} className="h-24 text-center">
                  Cargando clientes...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow key="empty">
                <TableCell colSpan={7} className="h-24 text-center">
                  {search ? "No se encontraron clientes con ese criterio." : "No hay clientes registrados."}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((cliente: any, index: number) => {
                const ultimoCredito = cliente.creditos && cliente.creditos.length > 0
                  ? cliente.creditos[cliente.creditos.length - 1]
                  : null;
                const grupo = cliente.grupos && cliente.grupos.length > 0 ? cliente.grupos[0] : null;

                return (
                  <TableRow key={cliente.id_cliente || cliente.id || index}>
                    <TableCell className="font-mono text-xs">{cliente.id_cliente || cliente.id}</TableCell>
                    <TableCell className="font-medium">{cliente.nombre_completo}</TableCell>
                    <TableCell>
                      {grupo ? (
                        <span className="text-xs font-semibold text-primary">
                          {grupo.nombre_grupo}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Individual</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">
                        {ultimoCredito?.ciclo ?? "0"}
                      </span>
                    </TableCell>
                    <TableCell>{ultimoCredito?.dias_pago ?? "N/A"}</TableCell>
                    <TableCell className="text-xs">{cliente.asesor?.nombre_asesor || "N/A"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
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
