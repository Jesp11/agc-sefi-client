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
  Pencil,
  DollarSign,
  WalletCards,
  History,
  SlidersHorizontal,
  RotateCcw,
} from "lucide-react";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { fetchAllPages, inversionistaSearchFields } from "@/lib/table-utils";
import { InversionistaDocumentoDialog } from "@/components/inversionista-documento-dialog";
import { LiquidacionDocumentoDialog } from "@/components/liquidacion-documento-dialog";
import * as XLSX from "xlsx";
import { parseInversionistasImportFile } from "@/lib/inversionistas-xlsx";

const emptyInversionistaForm = () => ({
  nombre: "",
  tipo_entidad: "Persona Fisica",
  origen_fondeo: "",
  telefono: "",
  email: "",
  tasa_mensual: "0",
});

type InversionistaEditable = ReturnType<typeof emptyInversionistaForm> & {
  id: number;
  saldo_capital?: number | string | null;
  total_aportaciones?: number | string | null;
  activo?: boolean;
  liquidacion_pendiente?: unknown;
};

export default function InversionistasPage() {
  const [items, setItems] = useState<any[]>([]);
  const [resumen, setResumen] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { search, handleSearch, page, setPage } = useTableControls();
  const [form, setForm] = useState(emptyInversionistaForm);
  const [editingInversionista, setEditingInversionista] = useState<InversionistaEditable | null>(null);
  const [editForm, setEditForm] = useState(emptyInversionistaForm);
  const [editOpen, setEditOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [docOpen, setDocOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [rendimientoOpen, setRendimientoOpen] = useState(false);
  const [selectedInvForRendimiento, setSelectedInvForRendimiento] = useState<any>(null);
  const [rendimientoForm, setRendimientoForm] = useState({
    monto: "",
    fecha: new Date().toISOString().slice(0, 10),
    cuenta: "Efectivo",
  });
  const [savingRendimiento, setSavingRendimiento] = useState(false);
  const [puedeLiquidar, setPuedeLiquidar] = useState(false);
  const [esLiquidacion, setEsLiquidacion] = useState(false);
  const [liquidacionForm, setLiquidacionForm] = useState({
    rendimiento_final: "",
    fecha: new Date().toISOString().slice(0, 10),
    cuenta: "Efectivo",
    notas: "",
  });
  const [savingLiquidacion, setSavingLiquidacion] = useState(false);
  const [historialLiquidaciones, setHistorialLiquidaciones] = useState<any>(null);
  const [liquidacionDocumento, setLiquidacionDocumento] = useState<{ inversionista: any; liquidacion: any } | null>(null);
  const [capitalForm, setCapitalForm] = useState({
    total_aportaciones: "",
    saldo_capital: "",
    fecha: new Date().toISOString().slice(0, 10),
    motivo: "",
  });
  const [savingCapital, setSavingCapital] = useState(false);
  const [reactivacionOpen, setReactivacionOpen] = useState(false);
  const [selectedInvForReactivacion, setSelectedInvForReactivacion] = useState<any>(null);
  const [reactivacionForm, setReactivacionForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    motivo: "",
  });
  const [savingReactivacion, setSavingReactivacion] = useState(false);
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
        setPuedeLiquidar(Boolean(payload.puede_liquidar));
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
    const tasaMensual = Number(form.tasa_mensual);
    if (!Number.isFinite(tasaMensual) || tasaMensual < 0 || tasaMensual > 100) {
      toast.error("La tasa mensual debe estar entre 0% y 100%");
      return;
    }

    const res = await apiFetch("/inversionistas", { method: "POST", body: JSON.stringify(form) });
    if (res.ok) {
      toast.success("Fuente de fondeo creada");
      fetchData();
      setForm(emptyInversionistaForm());
    } else {
      toast.error("Error al crear");
    }
  };

  const openEdit = (inversionista: InversionistaEditable) => {
    setEditingInversionista(inversionista);
    setEditForm({
      nombre: inversionista.nombre ?? "",
      tipo_entidad: inversionista.tipo_entidad ?? "Persona Fisica",
      origen_fondeo: inversionista.origen_fondeo ?? "",
      telefono: inversionista.telefono ?? "",
      email: inversionista.email ?? "",
      tasa_mensual: String(inversionista.tasa_mensual ?? 0),
    });
    setCapitalForm({
      total_aportaciones: String(Number(inversionista.total_aportaciones ?? 0).toFixed(2)),
      saldo_capital: String(Number(inversionista.saldo_capital ?? 0).toFixed(2)),
      fecha: new Date().toISOString().slice(0, 10),
      motivo: "",
    });
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingInversionista || !editForm.nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    const tasaMensual = Number(editForm.tasa_mensual);
    if (!Number.isFinite(tasaMensual) || tasaMensual < 0 || tasaMensual > 100) {
      toast.error("La tasa mensual debe estar entre 0% y 100%");
      return;
    }

    setIsSavingEdit(true);
    try {
      const res = await apiFetch(`/inversionistas/${editingInversionista.id}`, {
        method: "PUT",
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        toast.error(error.message || "No fue posible actualizar la fuente de fondeo");
        return;
      }
      toast.success("Información del inversionista actualizada");
      setEditOpen(false);
      setEditingInversionista(null);
      fetchData();
    } catch {
      toast.error("No fue posible actualizar la fuente de fondeo");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const openPagarRendimiento = (inversionista: any) => {
    setSelectedInvForRendimiento(inversionista);
    setEsLiquidacion(false);
    setRendimientoForm({
      monto: Number(inversionista.rendimiento_mensual ?? 0) > 0
        ? String(inversionista.rendimiento_mensual)
        : "",
      fecha: new Date().toISOString().slice(0, 10),
      cuenta: "Efectivo",
    });
    setLiquidacionForm({
      rendimiento_final: String(Number(inversionista.rendimiento_mensual ?? 0).toFixed(2)),
      fecha: new Date().toISOString().slice(0, 10),
      cuenta: "Efectivo",
      notas: "",
    });
    setRendimientoOpen(true);
  };

  const handleSaveRendimiento = async (event: React.FormEvent) => {
    event.preventDefault();
    const monto = Number(rendimientoForm.monto);
    if (!selectedInvForRendimiento || !Number.isFinite(monto) || monto <= 0) {
      toast.error("Indica un monto válido");
      return;
    }

    setSavingRendimiento(true);
    try {
      const res = await apiFetch(`/inversionistas/${selectedInvForRendimiento.id}/rendimiento`, {
        method: "POST",
        body: JSON.stringify({
          monto,
          fecha: rendimientoForm.fecha,
          cuenta: rendimientoForm.cuenta,
          concepto: `PAGO DE RENDIMIENTO — ${selectedInvForRendimiento.nombre}`,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(payload.message || "No fue posible registrar el rendimiento");
        return;
      }
      toast.success(payload.message || "Pago de rendimiento registrado");
      setRendimientoOpen(false);
      setSelectedInvForRendimiento(null);
      fetchData();
    } catch {
      toast.error("No fue posible registrar el rendimiento");
    } finally {
      setSavingRendimiento(false);
    }
  };

  const handleSolicitarLiquidacion = async (event: React.FormEvent) => {
    event.preventDefault();
    const rendimientoFinal = Number(liquidacionForm.rendimiento_final);
    if (!selectedInvForRendimiento || !Number.isFinite(rendimientoFinal) || rendimientoFinal < 0) {
      toast.error("El rendimiento final debe ser un monto válido igual o mayor a cero");
      return;
    }

    setSavingLiquidacion(true);
    try {
      const res = await apiFetch(`/inversionistas/${selectedInvForRendimiento.id}/liquidacion`, {
        method: "POST",
        body: JSON.stringify({ ...liquidacionForm, rendimiento_final: rendimientoFinal }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(payload.message || "No fue posible solicitar la liquidación");
        return;
      }
      toast.success(payload.message || "Liquidación enviada a Caja");
      setRendimientoOpen(false);
      setSelectedInvForRendimiento(null);
      setEsLiquidacion(false);
      fetchData();
    } catch {
      toast.error("No fue posible solicitar la liquidación");
    } finally {
      setSavingLiquidacion(false);
    }
  };

  const handleAjustarCapital = async () => {
    const totalAportaciones = Number(capitalForm.total_aportaciones);
    const saldoCapital = Number(capitalForm.saldo_capital);
    if (!editingInversionista || !Number.isFinite(totalAportaciones) || !Number.isFinite(saldoCapital) || totalAportaciones < 0 || saldoCapital < 0 || saldoCapital > totalAportaciones) {
      toast.error("El capital vigente debe estar entre cero y el total aportado");
      return;
    }
    if (capitalForm.motivo.trim().length < 5) {
      toast.error("Describe el motivo de la corrección");
      return;
    }

    setSavingCapital(true);
    try {
      const res = await apiFetch(`/inversionistas/${editingInversionista.id}/capital`, {
        method: "PATCH",
        body: JSON.stringify({
          ...capitalForm,
          total_aportaciones: totalAportaciones,
          saldo_capital: saldoCapital,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(payload.message || "No fue posible corregir el capital");
        return;
      }
      toast.success(payload.message || "Capital corregido");
      setCapitalForm((current) => ({ ...current, motivo: "" }));
      fetchData();
    } catch {
      toast.error("No fue posible corregir el capital");
    } finally {
      setSavingCapital(false);
    }
  };

  const openReactivacion = (inversionista: any) => {
    setSelectedInvForReactivacion(inversionista);
    setReactivacionForm({
      fecha: new Date().toISOString().slice(0, 10),
      motivo: "",
    });
    setReactivacionOpen(true);
  };

  const handleReactivar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedInvForReactivacion || reactivacionForm.motivo.trim().length < 5) {
      toast.error("Describe el motivo de la reactivación");
      return;
    }

    setSavingReactivacion(true);
    try {
      const res = await apiFetch(`/inversionistas/${selectedInvForReactivacion.id}/reactivacion`, {
        method: "POST",
        body: JSON.stringify(reactivacionForm),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(payload.message || "No fue posible reactivar al inversionista");
        return;
      }
      toast.success(payload.message || "Inversionista reactivado");
      setReactivacionOpen(false);
      setSelectedInvForReactivacion(null);
      fetchData();
    } catch {
      toast.error("No fue posible reactivar al inversionista");
    } finally {
      setSavingReactivacion(false);
    }
  };

  const orderedItems = useMemo(
    () => items
      .map((item, index) => ({ item, index }))
      .sort((a, b) => Number(a.item.activo === false) - Number(b.item.activo === false) || a.index - b.index)
      .map(({ item }) => item),
    [items]
  );
  const filtered = filterBySearch(orderedItems, search, inversionistaSearchFields);
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
        "Tasa mensual %": Number(inv.tasa_mensual ?? 0),
        "Rendimiento mensual calculado": Number(inv.rendimiento_mensual ?? 0),
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
                  <Label>Teléfono</Label>
                  <Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <Label>Tasa mensual (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.tasa_mensual}
                    onChange={(e) => setForm({ ...form, tasa_mensual: e.target.value })}
                    placeholder="Ej. 4.00"
                  />
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
              <TableHead className="text-center">Tasa mensual</TableHead>
              <TableHead className="text-right">Rendimiento mensual</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    <p className="text-sm">Cargando inversionistas...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
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
                    <TableCell className="text-center font-mono text-xs">
                      {Number(inv.tasa_mensual ?? 0).toLocaleString("es-MX", { maximumFractionDigits: 2 })}%
                    </TableCell>
                    <TableCell className="text-right font-semibold text-amber-700 font-mono text-xs">
                      ${Number(inv.rendimiento_mensual ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">
                      {inv.liquidacion_pendiente ? (
                        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-xs text-amber-800">Liquidación pendiente</Badge>
                      ) : (
                        <Badge variant={inv.activo !== false ? "default" : "secondary"} className="text-xs">
                          {inv.activo !== false ? "Activo" : "Liquidado"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {inv.activo !== false && (
                          <>
                            <Button
                              size="sm"
                              className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                              onClick={() => openPagarRendimiento(inv)}
                              disabled={Boolean(inv.liquidacion_pendiente) || (Number(inv.rendimiento_mensual ?? 0) <= 0 && (!puedeLiquidar || saldoCapital <= 0))}
                            >
                              <DollarSign className="mr-1 h-3.5 w-3.5" />
                              Pagar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              onClick={() => openEdit(inv)}
                            >
                              <Pencil className="mr-1 h-3.5 w-3.5" />
                              Editar
                            </Button>
                          </>
                        )}
                        {puedeLiquidar && inv.activo === false && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 border-emerald-300 text-xs text-emerald-700 hover:bg-emerald-50"
                            onClick={() => openReactivacion(inv)}
                            disabled={Number(inv.saldo_capital ?? 0) !== 0 || Boolean(inv.liquidacion_pendiente)}
                          >
                            <RotateCcw className="mr-1 h-3.5 w-3.5" />
                            Reactivar
                          </Button>
                        )}
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
                        {Array.isArray(inv.liquidaciones) && inv.liquidaciones.length > 0 && (
                          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setHistorialLiquidaciones(inv)}>
                            <History className="mr-1 h-3.5 w-3.5" />
                            Liquidaciones
                          </Button>
                        )}
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

      <Dialog open={editOpen} onOpenChange={(open) => {
        setEditOpen(open);
        if (!open) setEditingInversionista(null);
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>Editar inversionista y fondeo</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Nombre</Label><Input value={editForm.nombre} onChange={(event) => setEditForm({ ...editForm, nombre: event.target.value })} /></div>
            <div>
              <Label>Tipo</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={editForm.tipo_entidad} onChange={(event) => setEditForm({ ...editForm, tipo_entidad: event.target.value })}>
                <option value="Persona Fisica">Persona Fisica</option>
                <option value="Persona Moral">Persona Moral</option>
                <option value="Financiamiento Externo">Financiamiento Externo</option>
              </select>
            </div>
            <div><Label>Origen / Plataforma</Label><Input value={editForm.origen_fondeo} onChange={(event) => setEditForm({ ...editForm, origen_fondeo: event.target.value })} /></div>
            <div><Label>Teléfono</Label><Input value={editForm.telefono} onChange={(event) => setEditForm({ ...editForm, telefono: event.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={editForm.email} onChange={(event) => setEditForm({ ...editForm, email: event.target.value })} /></div>
            <div>
              <Label>Tasa mensual (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={editForm.tasa_mensual}
                onChange={(event) => setEditForm({ ...editForm, tasa_mensual: event.target.value })}
              />
              {editingInversionista && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Rendimiento estimado: ${(
                    Number(editingInversionista.saldo_capital ?? 0) * (Number(editForm.tasa_mensual) || 0) / 100
                  ).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} al mes
                </p>
              )}
            </div>
            <Button onClick={handleUpdate} disabled={isSavingEdit}>{isSavingEdit ? "Guardando..." : "Guardar datos generales"}</Button>

            {puedeLiquidar && editingInversionista?.activo !== false && (
              <div className="mt-2 grid gap-3 border-t pt-4">
                <div className="flex items-start gap-2">
                  <SlidersHorizontal className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">Corrección de capital</p>
                    <p className="text-xs text-muted-foreground">Úsala solamente para corregir saldos cargados incorrectamente. No genera movimientos en Caja.</p>
                  </div>
                </div>
                {editingInversionista?.liquidacion_pendiente ? (
                  <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">No se puede corregir el capital mientras exista una liquidación pendiente.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label htmlFor="capital-total-aportado">Capital aportado total</Label><Input id="capital-total-aportado" type="number" min="0" step="0.01" value={capitalForm.total_aportaciones} onChange={(event) => setCapitalForm({ ...capitalForm, total_aportaciones: event.target.value })} /></div>
                      <div><Label htmlFor="capital-vigente">Capital vigente</Label><Input id="capital-vigente" type="number" min="0" step="0.01" max={capitalForm.total_aportaciones || undefined} value={capitalForm.saldo_capital} onChange={(event) => setCapitalForm({ ...capitalForm, saldo_capital: event.target.value })} /></div>
                    </div>
                    <div><Label htmlFor="capital-fecha">Fecha de corrección</Label><Input id="capital-fecha" type="date" max={new Date().toISOString().slice(0, 10)} value={capitalForm.fecha} onChange={(event) => setCapitalForm({ ...capitalForm, fecha: event.target.value })} /></div>
                    <div><Label htmlFor="capital-motivo">Motivo de la corrección</Label><textarea id="capital-motivo" rows={2} minLength={5} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Ej. El capital inicial fue importado con un monto incorrecto" value={capitalForm.motivo} onChange={(event) => setCapitalForm({ ...capitalForm, motivo: event.target.value })} /></div>
                    <Button variant="outline" onClick={handleAjustarCapital} disabled={savingCapital}>{savingCapital ? "Guardando corrección..." : "Guardar corrección de capital"}</Button>
                  </>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={rendimientoOpen} onOpenChange={(open) => {
        setRendimientoOpen(open);
        if (!open) setSelectedInvForRendimiento(null);
      }}>
        <DialogContent className="h-[calc(100dvh-2rem)] max-h-[680px] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>{esLiquidacion ? "Solicitar liquidación total" : "Registrar pago de rendimiento"}</DialogTitle></DialogHeader>
          <form onSubmit={esLiquidacion ? handleSolicitarLiquidacion : handleSaveRendimiento} className="grid gap-4">
            <div>
              <Label>Inversionista</Label>
              <Input value={selectedInvForRendimiento?.nombre ?? ""} disabled />
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Capital vigente</span>
                <span className="font-semibold">
                  ${Number(selectedInvForRendimiento?.saldo_capital ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="mt-1 flex justify-between gap-3">
                <span className="text-muted-foreground">Tasa mensual</span>
                <span className="font-semibold">{Number(selectedInvForRendimiento?.tasa_mensual ?? 0)}%</span>
              </div>
            </div>

            {puedeLiquidar && Number(selectedInvForRendimiento?.saldo_capital ?? 0) > 0 && (
              <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${esLiquidacion ? "border-destructive/40 bg-destructive/5" : "hover:bg-muted/40"}`}>
                <input type="checkbox" className="mt-0.5 h-4 w-4" checked={esLiquidacion} onChange={(event) => setEsLiquidacion(event.target.checked)} />
                <span>
                  <span className="flex items-center gap-1.5 text-sm font-semibold"><WalletCards className="h-4 w-4" />Liquidar completamente al inversionista</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">Retira todo el capital y envía el total a confirmación de Caja.</span>
                </span>
              </label>
            )}

            {esLiquidacion ? (
              <>
                <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Capital a retirar</span><strong>${Number(selectedInvForRendimiento?.saldo_capital ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
                  <div className="mt-2 flex justify-between gap-3 border-t pt-2 text-base"><span>Total estimado</span><strong className="text-primary">${(Number(selectedInvForRendimiento?.saldo_capital ?? 0) + (Number(liquidacionForm.rendimiento_final) || 0)).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label htmlFor="liquidacion-rendimiento">Rendimiento final</Label><Input id="liquidacion-rendimiento" type="number" min="0" step="0.01" required value={liquidacionForm.rendimiento_final} onChange={(event) => setLiquidacionForm({ ...liquidacionForm, rendimiento_final: event.target.value })} /></div>
                  <div><Label htmlFor="liquidacion-fecha">Fecha</Label><Input id="liquidacion-fecha" type="date" max={new Date().toISOString().slice(0, 10)} required value={liquidacionForm.fecha} onChange={(event) => setLiquidacionForm({ ...liquidacionForm, fecha: event.target.value })} /></div>
                </div>
                <div>
                  <Label htmlFor="liquidacion-cuenta">Cuenta</Label>
                  <select id="liquidacion-cuenta" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={liquidacionForm.cuenta} onChange={(event) => setLiquidacionForm({ ...liquidacionForm, cuenta: event.target.value })}>
                    <option value="Efectivo">Efectivo</option><option value="Spin">Spin</option><option value="Bancomer">Bancomer</option><option value="Banorte">Banorte</option><option value="Banamex">Banamex</option><option value="BBVA">BBVA</option><option value="Nue">Nue</option><option value="Otro">Otro</option>
                  </select>
                </div>
                <div><Label htmlFor="liquidacion-notas">Notas</Label><textarea id="liquidacion-notas" rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={liquidacionForm.notas} onChange={(event) => setLiquidacionForm({ ...liquidacionForm, notas: event.target.value })} /></div>
                <p className="text-xs text-muted-foreground">El saldo llegará a cero y el inversionista quedará inactivo solamente después de que Caja confirme el egreso.</p>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="rendimiento-monto">Monto</Label>
                    <Input id="rendimiento-monto" type="number" min="0.01" step="0.01" required value={rendimientoForm.monto} onChange={(event) => setRendimientoForm({ ...rendimientoForm, monto: event.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="rendimiento-fecha">Fecha</Label>
                    <Input id="rendimiento-fecha" type="date" required value={rendimientoForm.fecha} onChange={(event) => setRendimientoForm({ ...rendimientoForm, fecha: event.target.value })} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="rendimiento-cuenta">Cuenta</Label>
                  <select id="rendimiento-cuenta" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={rendimientoForm.cuenta} onChange={(event) => setRendimientoForm({ ...rendimientoForm, cuenta: event.target.value })}>
                    <option value="Efectivo">Efectivo</option><option value="Spin">Spin</option><option value="Bancomer">Bancomer</option><option value="Banorte">Banorte</option><option value="Banamex">Banamex</option><option value="Otro">Otro</option>
                  </select>
                </div>
                <p className="text-xs text-muted-foreground">El monto se propone automáticamente con la tasa configurada, pero puedes ajustarlo antes de registrar el pago.</p>
              </>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setRendimientoOpen(false)} disabled={savingRendimiento || savingLiquidacion}>Cancelar</Button>
              <Button type="submit" variant={esLiquidacion ? "destructive" : "default"} disabled={savingRendimiento || savingLiquidacion}>
                {esLiquidacion ? (savingLiquidacion ? "Enviando..." : "Enviar liquidación a Caja") : (savingRendimiento ? "Guardando..." : "Registrar pago")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={reactivacionOpen} onOpenChange={(open) => {
        setReactivacionOpen(open);
        if (!open) setSelectedInvForReactivacion(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Reactivar inversionista</DialogTitle></DialogHeader>
          <form onSubmit={handleReactivar} className="grid gap-4">
            <div><Label>Inversionista</Label><Input value={selectedInvForReactivacion?.nombre ?? ""} disabled /></div>
            <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
              La liquidación anterior y su comprobante permanecerán en el historial. El inversionista se reactivará con capital vigente en cero para iniciar un nuevo ciclo.
            </div>
            <div><Label htmlFor="reactivacion-fecha">Fecha de reactivación</Label><Input id="reactivacion-fecha" type="date" max={new Date().toISOString().slice(0, 10)} required value={reactivacionForm.fecha} onChange={(event) => setReactivacionForm({ ...reactivacionForm, fecha: event.target.value })} /></div>
            <div><Label htmlFor="reactivacion-motivo">Motivo</Label><textarea id="reactivacion-motivo" rows={3} required minLength={5} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Ej. El inversionista iniciará un nuevo ciclo de inversión" value={reactivacionForm.motivo} onChange={(event) => setReactivacionForm({ ...reactivacionForm, motivo: event.target.value })} /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setReactivacionOpen(false)} disabled={savingReactivacion}>Cancelar</Button><Button type="submit" disabled={savingReactivacion}>{savingReactivacion ? "Reactivando..." : "Confirmar reactivación"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(historialLiquidaciones)} onOpenChange={(open) => { if (!open) setHistorialLiquidaciones(null); }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader><DialogTitle>Liquidaciones de {historialLiquidaciones?.nombre ?? "inversionista"}</DialogTitle></DialogHeader>
          <div className="max-h-[60vh] overflow-auto rounded-lg border">
            <Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Capital</TableHead><TableHead className="text-right">Rendimiento</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Comprobante</TableHead></TableRow></TableHeader><TableBody>
              {(historialLiquidaciones?.liquidaciones ?? []).map((liquidacion: any) => <TableRow key={liquidacion.id}><TableCell>{String(liquidacion.fecha ?? "").slice(0, 10)}</TableCell><TableCell><Badge variant={liquidacion.estado === "Confirmada" ? "default" : liquidacion.estado === "Cancelada" ? "secondary" : "outline"}>{liquidacion.estado}</Badge></TableCell><TableCell className="text-right">${Number(liquidacion.capital).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</TableCell><TableCell className="text-right">${Number(liquidacion.rendimiento_final).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</TableCell><TableCell className="text-right font-semibold">${Number(liquidacion.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</TableCell><TableCell className="text-right">{liquidacion.estado === "Confirmada" ? <Button size="sm" variant="outline" onClick={() => { setLiquidacionDocumento({ inversionista: historialLiquidaciones, liquidacion }); setHistorialLiquidaciones(null); }}><FileText className="mr-1 h-3.5 w-3.5" />Editar / imprimir</Button> : <span className="text-xs text-muted-foreground">No disponible</span>}</TableCell></TableRow>)}
            </TableBody></Table>
          </div>
        </DialogContent>
      </Dialog>

      {liquidacionDocumento && (
        <LiquidacionDocumentoDialog
          inversionista={liquidacionDocumento.inversionista}
          liquidacion={liquidacionDocumento.liquidacion}
          open
          onOpenChange={(open) => { if (!open) setLiquidacionDocumento(null); }}
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
