"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { isFieldRoleName } from "@/lib/authz";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, PlusCircle, CalendarDays, DollarSign, TrendingUp, FileSpreadsheet, Download, FileDown, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CustomLoanForm } from "@/components/custom-loan-form";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { creditoSearchFields, fetchAllPages, onlyCarteraActiva } from "@/lib/table-utils";
import { CarteraAcciones } from "@/components/cartera-acciones";
import { apiUpload } from "@/lib/api";
import * as XLSX from "xlsx";

export default function CreditosIndividualesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAsesor = isFieldRoleName(user?.role?.nombre);
  const [creditos, setCreditos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { search: searchTerm, handleSearch, page, setPage } = useTableControls();
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const fetchCreditos = async () => {
    setLoading(true);
    try {
      const rows = await fetchAllPages("/cartera/activa?tipo=individual");
      setCreditos(onlyCarteraActiva(rows));
    } catch {
      toast.error("Error al cargar créditos");
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

      const res = await apiUpload("/cartera/import/individual", formData);
      const data = await res.json();

      if (!res.ok) {
        const detail = [...(data.error ?? []), ...(data.output ?? [])].slice(0, 4).join(" · ");
        toast.error(detail || data.message || "Error al importar cartera individual");
        return;
      }

      toast.success("Cartera individual importada");
      fetchCreditos();
    } catch {
      toast.error("Error al importar cartera individual");
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["NUM. PROG", "FECHA", "CLIENTE", "DIA", "MES", "ID CLIENTE", "CICLO", "DIAS DE PAGO", "ASESOR", "VALOR FICHA", "PLAZOS", "MONTO OTORGADO", "INTERES", "TOTAL", "SALDO TOTAL", "SALDO INVERSION", "SEMANAS RESTANTES", "P-1", "P-2", "P-3", "P-4"],
      ["1001", "2026-08-01", "MARIA GARCIA LOPEZ", "1", "AGOSTO", "MGL001", "1", "LUNES", "CARLOS LOPEZ", "500", "16", "8000", "4800", "12800", "9600", "3600", "12", "800", "800", "", ""],
    ]);
    ws["!cols"] = Array.from({ length: 21 }, () => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cartera Individual");
    XLSX.writeFile(wb, "plantilla_cartera_individual.xlsx");
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
        "Cliente": c.cliente?.nombre_completo ?? "",
        "ID Cliente": c.id_cliente ?? c.cliente?.id_cliente ?? "",
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
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Créditos Individuales");
      XLSX.writeFile(wb, `creditos_individuales_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success("Información exportada");
    } finally {
      setIsExporting(false);
    }
  };

  const filtered = filterBySearch(creditos, searchTerm, creditoSearchFields);
  const paginated = paginateItems(filtered, page);

  // KPIs solicitados para Cartera Individual
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

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground/90">Créditos Individuales</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestión y seguimiento de cartera individual activa. Importa solo el Excel de esta pantalla.
          </p>
        </div>
        {!isAsesor && (
          <div className="flex items-center gap-2">
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
            <Button onClick={() => setIsCustomModalOpen(true)} size="sm" className="h-9 px-4">
              <PlusCircle className="mr-2 h-4 w-4" /> Crear Préstamo
            </Button>
          </div>
        )}
      </div>

      {/* Tarjetas KPI de Cartera Individual */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="p-4 border shadow-sm bg-card hover:border-emerald-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Recuperación Semanal
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
              Saldo Total
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
              Créditos Activos
            </span>
            <div className="p-2 rounded-lg bg-muted text-muted-foreground">
              <User className="h-4 w-4" />
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

      {/* Barra de Búsqueda */}
      <div className="flex items-center justify-between gap-3">
        <TableSearch
          placeholder="Buscar por cliente, gestor de cobranza o folio..."
          value={searchTerm}
          onChange={handleSearch}
          className="flex-1 max-w-md"
        />
      </div>

      {/* Modal de Crear Préstamo */}
      {!isAsesor && (
        <Dialog open={isCustomModalOpen} onOpenChange={setIsCustomModalOpen}>
          <DialogContent className="sm:max-w-[600px] h-[560px] flex flex-col">
            <DialogHeader>
              <DialogTitle>Crear Préstamo Individual</DialogTitle>
            </DialogHeader>
            <CustomLoanForm
              type="individual"
              onSuccess={() => {
                fetchCreditos();
                setIsCustomModalOpen(false);
              }}
              onClose={() => setIsCustomModalOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Tabla de Créditos Individuales */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[80px]">Folio</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="text-center">Ciclo</TableHead>
              <TableHead>Día Pago</TableHead>
              <TableHead>Gestor Cobranza</TableHead>
              <TableHead className="text-center">Plazos</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Interés</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-sm text-muted-foreground">Cargando créditos...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                  {searchTerm
                    ? "No se encontraron créditos con ese criterio."
                    : "No se encontraron créditos individuales para mostrar."}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((c: any) => (
                <TableRow key={c.num_prog} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono text-xs font-semibold text-primary/80">#{c.num_prog}</TableCell>
                  <TableCell className="font-medium whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-primary/70" />
                      {c.cliente?.nombre_completo || "Desconocido"}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-bold">
                      {c.ciclo}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{c.dias_pago || "—"}</TableCell>
                  <TableCell className="text-xs">{c.asesor?.nombre_asesor || "—"}</TableCell>
                  <TableCell className="text-center text-xs">{c.plazos} sem</TableCell>
                  <TableCell className="text-xs font-semibold">${Number(c.monto_otorgado).toLocaleString("es-MX")}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">${Number(c.interes).toLocaleString("es-MX")}</TableCell>
                  <TableCell className="text-xs font-bold text-primary">${Number(c.total).toLocaleString("es-MX")}</TableCell>
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
