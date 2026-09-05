"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  FileText,
  Landmark,
  TrendingDown,
  Users,
  ShieldCheck,
  PlusCircle,
  FileSpreadsheet,
  Download,
  FileDown,
  ChevronDown,
} from "lucide-react";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { fetchAllPages, inversionistaSearchFields } from "@/lib/table-utils";
import { InversionistaDocumentoDialog } from "@/components/inversionista-documento-dialog";
import * as XLSX from "xlsx";
import { parseInversionistasImportFile } from "@/lib/inversionistas-xlsx";

export default function InversionistasPage() {
  const [items, setItems] = useState<any[]>([]);
  const [resumen, setResumen] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { search, handleSearch, page, setPage } = useTableControls();
  const [form, setForm] = useState({
    nombre: "",
    tipo_entidad: "Persona Fisica",
    origen_fondeo: "",
    contacto: "",
    telefono: "",
    email: "",
  });
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [docOpen, setDocOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/inversionistas");
      if (res.ok) {
        const payload = await res.json();
        const list = Array.isArray(payload) ? payload : (payload.data ?? []);
        setItems(list);
        setResumen(payload.resumen ?? null);
      } else {
        const rows = await fetchAllPages("/inversionistas");
        setItems(rows);
      }
    } catch {
      toast.error("Error al cargar inversionistas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async () => {
    const res = await apiFetch("/inversionistas", { method: "POST", body: JSON.stringify(form) });
    if (res.ok) {
      toast.success("Fuente de fondeo creada");
      fetchData();
      setForm({
        nombre: "",
        tipo_entidad: "Persona Fisica",
        origen_fondeo: "",
        contacto: "",
        telefono: "",
        email: "",
      });
    } else {
      toast.error("Error al crear");
    }
  };

  const filtered = filterBySearch(items, search, inversionistaSearchFields);
  const paginated = paginateItems(filtered, page);

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const { rows, errores } = parseInversionistasImportFile(buffer);
      if (errores.length > 0 && rows.length === 0) {
        toast.error(errores[0]);
        return;
      }

      const res = await apiFetch("/inversionistas/import", {
        method: "POST",
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();

      if (!res.ok) {
        const detail = [...(data.errors ?? [])]
          .slice(0, 3)
          .map((item: { fila?: number; mensaje?: string }) => `Fila ${item.fila ?? "?"}: ${item.mensaje ?? "Error"}`)
          .join(" · ");
        toast.error(detail || data.message || "Error al importar inversionistas");
        return;
      }

      if (data.warnings?.length) {
        const detail = data.warnings
          .slice(0, 2)
          .map((item: { fila?: number; mensaje?: string }) => `Fila ${item.fila ?? "?"}: ${item.mensaje ?? ""}`)
          .join(" · ");
        toast.warning(detail);
      }

      toast.success(data.message || "Inversionistas importados");
      fetchData();
    } catch {
      toast.error("Error al importar inversionistas");
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["EMPLEADO", "INVERSION", "2026-01-31", "2026-02-28", "2026-03-31", "TOTAL"],
      ["JUAN PEREZ", "100000", "4000", "4000", "4000", "12000"],
    ]);
    ws["!cols"] = [{ wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inversionistas");
    XLSX.writeFile(wb, "plantilla_inversionistas.xlsx");
    toast.success("Plantilla descargada");
  };

  const handleExportInfo = () => {
    setIsExporting(true);
    try {
      if (filtered.length === 0) {
        toast.error("No hay inversionistas para exportar");
        return;
      }

      const rows = filtered.map((inv) => ({
        "Nombre": inv.nombre ?? "",
        "Tipo": inv.tipo_entidad ?? "",
        "Origen / Fondeo": inv.origen_fondeo ?? "",
        "Contacto": inv.contacto ?? "",
        "Teléfono": inv.telefono ?? "",
        "Email": inv.email ?? "",
        "Capital vigente": Number(inv.saldo_capital ?? ((inv.total_aportaciones ?? 0) - (inv.total_retiros ?? 0))),
        "Total aportaciones": Number(inv.total_aportaciones ?? 0),
        "Total retiros": Number(inv.total_retiros ?? 0),
        "Total rendimientos": Number(inv.total_rendimientos ?? 0),
        "Estado": inv.activo !== false ? "Activo" : "Inactivo",
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inversionistas");
      XLSX.writeFile(wb, `inversionistas_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success("Información exportada");
    } finally {
      setIsExporting(false);
    }
  };

  // KPIs Contables de Inversionistas
  const totalCapitalFondeado = useMemo(() => {
    return filtered.reduce((sum, inv) => {
      const saldo = Number(inv.saldo_capital ?? ((inv.total_aportaciones ?? 0) - (inv.total_retiros ?? 0)));
      return sum + (isNaN(saldo) ? 0 : saldo);
    }, 0);
  }, [filtered]);

  const totalRendimientosPagados = useMemo(() => {
    return filtered.reduce((sum, inv) => {
      const rend = Number(inv.total_rendimientos ?? 0);
      return sum + (isNaN(rend) ? 0 : rend);
    }, 0);
  }, [filtered]);

  const inversionistasActivosCount = useMemo(() => {
    return filtered.filter((inv) => {
      const saldo = Number(inv.saldo_capital ?? ((inv.total_aportaciones ?? 0) - (inv.total_retiros ?? 0)));
      return saldo > 0;
    }).length;
  }, [filtered]);

  const ratioCobertura = useMemo(() => {
    const cartera = Number(resumen?.cartera_activa_total ?? 875815);
    return totalCapitalFondeado > 0 ? (cartera / totalCapitalFondeado).toFixed(2) : "0.00";
  }, [totalCapitalFondeado, resumen]);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground/90">Inversionistas y Fondeo</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestión contable de fuentes de financiamiento de capital, contratos y rendimientos. Importa solo el Excel de esta pantalla.
          </p>
        </div>
        <div className="flex gap-2">
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
                <Button variant="outline" className="h-9 px-4" disabled={isImporting || isExporting}>
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
              <DropdownMenuItem onClick={handleExportInfo} disabled={isImporting || isExporting}>
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? "Exportando..." : "Exportar inversionistas"}
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
          <Dialog>
            <DialogTrigger render={<Button className="h-9 px-4"><PlusCircle className="mr-2 h-4 w-4" />Nueva Fuente</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Alta de Fuente de Fondeo</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div>
                  <Label>Nombre</Label>
                  <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.tipo_entidad}
                    onChange={(e) => setForm({ ...form, tipo_entidad: e.target.value })}
                  >
                    <option value="Persona Fisica">Persona Fisica</option>
                    <option value="Persona Moral">Persona Moral</option>
                    <option value="Financiamiento Externo">Financiamiento Externo</option>
                  </select>
                </div>
                <div>
                  <Label>Origen / Plataforma</Label>
                  <Input
                    value={form.origen_fondeo}
                    onChange={(e) => setForm({ ...form, origen_fondeo: e.target.value })}
                    placeholder="Ej. Mercado Pago, Prestamista externo"
                  />
                </div>
                <div>
                  <Label>Contacto</Label>
                  <Input value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} />
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <Button onClick={handleCreate}>Guardar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tarjetas KPI Contables de Inversionistas */}
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
            ${totalCapitalFondeado.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Saldo pasivo total colocado</p>
        </Card>

        <Card className="p-4 border shadow-sm bg-card hover:border-amber-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Rendimientos Pagados
            </span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-700 mt-2">
            ${totalRendimientosPagados.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Costo financiero acumulado</p>
        </Card>

        <Card className="p-4 border shadow-sm bg-card hover:border-blue-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Inversionistas Activos
            </span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-foreground mt-2">
            {inversionistasActivosCount}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">De {filtered.length} fuentes registradas</p>
        </Card>
      </div>

      {/* Barra de Búsqueda */}
      <TableSearch placeholder="Buscar inversionistas o fuentes..." value={search} onChange={handleSearch} />

      {/* Tabla de Inversionistas */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Origen / Fondeo</TableHead>
              <TableHead className="text-right">Capital Vigente</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    <p className="text-sm">Cargando inversionistas...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  {search ? "No se encontraron registros." : "Sin fuentes de fondeo registradas."}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((inv) => {
                const saldoCapital = Number(inv.saldo_capital ?? ((inv.total_aportaciones ?? 0) - (inv.total_retiros ?? 0)));
                return (
                  <TableRow key={inv.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-foreground">{inv.nombre}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{inv.tipo_entidad || "Persona Fisica"}</TableCell>
                    <TableCell className="text-xs">{inv.origen_fondeo || "—"}</TableCell>
                    <TableCell className="text-right font-bold text-primary font-mono text-xs">
                      ${saldoCapital.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-xs">{inv.contacto || inv.telefono || inv.email || "—"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={inv.activo !== false ? "default" : "secondary"} className="text-xs">
                        {inv.activo !== false ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => {
                            setSelectedDoc(inv);
                            setDocOpen(true);
                          }}
                        >
                          <FileText className="mr-1 h-3.5 w-3.5" />
                          Documentos
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
          label="inversionistas"
        />
      )}

      {selectedDoc && (
        <InversionistaDocumentoDialog
          inversionista={selectedDoc}
          open={docOpen}
          onOpenChange={setDocOpen}
        />
      )}
    </div>
  );
}
