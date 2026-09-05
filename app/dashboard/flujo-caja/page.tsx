"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { fmtFecha } from "@/lib/utils";
import { ArrowDownCircle, ArrowUpCircle, Plus, FileSpreadsheet, Download, FileDown, ChevronDown, Pencil, Trash2, CircleHelp } from "lucide-react";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { fetchAllPages, movimientoCajaSearchFields } from "@/lib/table-utils";
import { parseFlujoCajaImportFile } from "@/lib/flujo-caja-xlsx";
import * as XLSX from "xlsx";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const CATEGORIAS = [
  { value: "CobroCartera", label: "Cobro cartera" },
  { value: "Desembolso", label: "Desembolso / renovación" },
  { value: "Nomina", label: "Nómina" },
  { value: "RecuperacionMora", label: "Recuperación mora" },
  { value: "InsumosSocios", label: "Insumos socios" },
  { value: "ServicioTelefono", label: "Servicio telefónico" },
  { value: "Rendimiento", label: "Rendimiento inversionista" },
  { value: "GastoOperativo", label: "Gasto operativo" },
  { value: "SaldoInicial", label: "Saldo inicial mes" },
  { value: "OtroIngreso", label: "Otro ingreso" },
  { value: "OtroEgreso", label: "Otro egreso" },
];

const emptyForm = () => ({
  fecha: new Date().toISOString().split("T")[0],
  id_asesor: "",
  motivo: "",
  tipo: "Ingreso" as "Ingreso" | "Egreso",
  monto: "",
  categoria: "",
  cuenta: "Efectivo",
});

const isGastoGenerado = (movimiento: { referencia?: string | null } | null) => String(movimiento?.referencia ?? "").startsWith("GASTO-");
type MovimientoGenerado = { id: number; motivo?: string | null; pago_id?: number | null; referencia?: string | null };

const isMovimientoGenerado = (movimiento: MovimientoGenerado | null) => Boolean(movimiento?.pago_id)
  || isGastoGenerado(movimiento)
  || String(movimiento?.referencia ?? "").startsWith("DESEMBOLSO-");

const amount = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

function IndicatorTitle({ title, calculation }: { title: string; calculation: string }) {
  return (
    <CardTitle className="flex items-center gap-1 text-sm text-muted-foreground">
      {title}
      <Tooltip>
        <TooltipTrigger
          render={
            <button type="button" className="text-muted-foreground/70 hover:text-foreground" aria-label={`Cálculo de ${title}`}>
              <CircleHelp className="size-3.5" />
            </button>
          }
        />
        <TooltipContent>{calculation}</TooltipContent>
      </Tooltip>
    </CardTitle>
  );
}

export default function FlujoCajaPage() {
  const now = new Date();
  const [anio, setAnio] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [resumen, setResumen] = useState<any>(null);
  const [capitalPasivo, setCapitalPasivo] = useState<number | null>(null);
  const [capitalInversionistas, setCapitalInversionistas] = useState<number | null>(null);
  const [asesores, setAsesores] = useState<any[]>([]);
  const [cuentas, setCuentas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMovimiento, setEditingMovimiento] = useState<any | null>(null);
  const [tab, setTab] = useState("todos");
  const listControls = useTableControls();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [movRows, resRes, capitalRes] = await Promise.all([
        fetchAllPages(`/flujo-caja?mes=${mes}&anio=${anio}`),
        apiFetch(`/flujo-caja/resumen?mes=${mes}&anio=${anio}`),
        apiFetch("/capital"),
      ]);
      setMovimientos(movRows);
      if (resRes.ok) setResumen(await resRes.json());
      if (capitalRes.ok) {
        const capital = await capitalRes.json();
        setCapitalPasivo(Number(capital.capital_pasivo));
        setCapitalInversionistas(Number(capital.total_aportaciones));
      }
    } catch {
      toast.error("Error al cargar flujo de caja");
    } finally {
      setLoading(false);
    }
  }, [mes, anio]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    Promise.all([
      fetchAllPages("/asesores"),
      apiFetch("/flujo-caja/cuentas"),
    ]).then(([asesorRows, cuentasRes]) => {
      setAsesores(asesorRows);
      if (cuentasRes.ok) cuentasRes.json().then((d) => setCuentas(d.cuentas ?? []));
    });
  }, []);

  const handleSave = async () => {
    const isEditing = Boolean(editingMovimiento);
    const res = await apiFetch(isEditing ? `/flujo-caja/${editingMovimiento.id}` : "/flujo-caja", {
      method: isEditing ? "PUT" : "POST",
      body: JSON.stringify({
        ...form,
        monto: parseFloat(form.monto),
        id_asesor: form.id_asesor ? parseInt(form.id_asesor) : null,
        categoria: form.categoria || undefined,
        cuenta: form.cuenta || undefined,
      }),
    });
    if (res.ok) {
      toast.success(isEditing ? "Movimiento actualizado" : "Movimiento registrado");
      setDialogOpen(false);
      setEditingMovimiento(null);
      setForm(emptyForm());
      fetchData();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || "Error al registrar");
    }
  };

  const openCreate = () => {
    setEditingMovimiento(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (movimiento: any) => {
    if (movimiento.pago_id || String(movimiento.referencia ?? "").startsWith("DESEMBOLSO-")) {
      toast.error("Este movimiento se genera automáticamente. Corrige el pago, gasto o desembolso de origen.");
      return;
    }
    setEditingMovimiento(movimiento);
    setForm({
      fecha: String(movimiento.fecha ?? "").slice(0, 10),
      id_asesor: movimiento.id_asesor ? String(movimiento.id_asesor) : "",
      motivo: movimiento.motivo ?? "",
      tipo: movimiento.tipo === "Egreso" ? "Egreso" : "Ingreso",
      monto: String(movimiento.monto ?? ""),
      categoria: movimiento.categoria ?? "",
      cuenta: movimiento.cuenta ?? "Efectivo",
    });
    setDialogOpen(true);
  };

  const editandoGastoGenerado = isGastoGenerado(editingMovimiento);

  const handleDelete = async (movimiento: MovimientoGenerado) => {
    if (isMovimientoGenerado(movimiento)) {
      toast.error("Este movimiento se genera automáticamente. Elimínalo desde el registro de origen.");
      return;
    }
    if (!window.confirm(`¿Eliminar el movimiento “${movimiento.motivo}”? Esta acción no se puede deshacer.`)) return;

    setDeletingId(movimiento.id);
    try {
      const res = await apiFetch(`/flujo-caja/${movimiento.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Movimiento eliminado");
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || "No fue posible eliminar el movimiento");
      }
    } catch {
      toast.error("No fue posible eliminar el movimiento");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredByTab = movimientos.filter((m) => {
    if (tab === "ingresos") return m.tipo === "Ingreso";
    if (tab === "egresos") return m.tipo === "Egreso";
    return true;
  });
  const filtered = filterBySearch(filteredByTab, listControls.search, movimientoCajaSearchFields);
  const paginated = paginateItems(filtered, listControls.page);

  const fmt = (n: number | null | undefined) => {
    if (n == null) return "—";
    const num = Number(n);
    if (isNaN(num)) return "—";
    const formatted = Math.abs(num).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return num < 0 ? `-$${formatted}` : `$${formatted}`;
  };

  const totalBruto = amount(resumen?.cartera_individual) + amount(resumen?.cartera_grupal) + amount(capitalPasivo);
  const totalNeto = totalBruto - amount(capitalInversionistas);
  const totalBrutoConMora = totalBruto + amount(resumen?.mora);
  const totalNetoConMora = totalBrutoConMora - amount(capitalInversionistas);

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const { rows, errores: parseErrors, sheetName } = parseFlujoCajaImportFile(buffer, mes, anio);

      if (parseErrors.length > 0 && rows.length === 0) {
        toast.error(parseErrors[0]);
        return;
      }

      const res = await apiFetch("/flujo-caja/import", {
        method: "POST",
        body: JSON.stringify({ anio, mes, rows, reemplazar: true }),
      });
      const data = await res.json();

      if ((data.created ?? 0) > 0 || (data.deleted ?? 0) > 0) {
        toast.success(
          sheetName
            ? `Importación aplicada en ${sheetName}: ${data.created ?? 0} movimiento(s) creados.`
            : "Flujo de caja importado."
        );
        fetchData();
      }

      if (data.warnings?.length) {
        const detail = data.warnings
          .slice(0, 3)
          .map((item: { fila: number; mensaje: string }) => `Fila ${item.fila}: ${item.mensaje}`)
          .join(" · ");
        toast.warning(`${data.warnings.length} advertencia(s). ${detail}`);
      }

      if (data.errors?.length) {
        const detail = data.errors
          .slice(0, 3)
          .map((item: { fila: number; mensaje: string }) => `Fila ${item.fila}: ${item.mensaje}`)
          .join(" · ");
        toast.error(`${data.errors.length} error(es). ${detail}`);
      } else if (!res.ok && !(data.created > 0 || data.deleted > 0)) {
        toast.error(data.message || "Error al importar flujo de caja");
      }

      if (parseErrors.length > 0) {
        toast.warning(parseErrors.join(" "));
      }
    } catch {
      toast.error("Error al importar flujo de caja");
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      [],
      [],
      [],
      ["", "FECHA", "VENDEDOR", "MOTIVO", "DESEMBOLSO", "INGRESOS", "SALDO"],
      ["", "2026-08-01", "CARLOS LOPEZ", "PAGO 1/16 MARIA GARCIA", "", "500", "500"],
      ["", "2026-08-01", "", "RENTA OFICINA", "2500", "", "-2000"],
    ]);
    ws["!cols"] = [{ wch: 4 }, { wch: 14 }, { wch: 22 }, { wch: 38 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AGOSTO");
    XLSX.writeFile(wb, "plantilla_flujo_caja.xlsx");
    toast.success("Plantilla descargada");
  };

  const handleExportInfo = () => {
    setIsExporting(true);
    try {
      if (filtered.length === 0) {
        toast.error("No hay movimientos para exportar");
        return;
      }

      const rows = filtered.map((m) => ({
        "Fecha": m.fecha ?? "",
        "Empleado": m.asesor?.nombre_asesor ?? m.registrado_por?.name ?? "",
        "Motivo": m.motivo ?? "",
        "Categoría": m.categoria ?? "",
        "Cuenta": m.cuenta ?? "",
        "Tipo": m.tipo ?? "",
        "Egreso": m.tipo === "Egreso" ? Number(m.monto ?? 0) : 0,
        "Ingreso": m.tipo === "Ingreso" ? Number(m.monto ?? 0) : 0,
        "Saldo": Number(m.saldo_resultante ?? 0),
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Flujo Caja");
      XLSX.writeFile(wb, `flujo_caja_${anio}_${String(mes).padStart(2, "0")}.xlsx`);
      toast.success("Información exportada");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold">Ingresos y Egresos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Control de caja — movimientos diarios con saldo acumulado. Importa solo el mes seleccionado de este módulo.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImportFile}
          />
          <div className="flex items-center gap-2">
            <Label htmlFor="mes">Mes</Label>
            <select
              id="mes"
              className="border rounded-md px-3 py-2 text-sm bg-background h-9"
              value={mes}
              onChange={(e) => setMes(parseInt(e.target.value))}
            >
              {MESES.map((nombre, i) => (
                <option key={nombre} value={i + 1}>{nombre}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="anio">Año</Label>
            <Input id="anio" type="number" className="w-24 h-9" value={anio} onChange={(e) => setAnio(parseInt(e.target.value) || anio)} />
          </div>
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
                {isExporting ? "Exportando..." : "Exportar movimientos"}
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
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingMovimiento(null);
              setForm(emptyForm());
            }
          }}>
            <DialogTrigger render={<Button onClick={openCreate}><Plus className="size-4 mr-1" />Registrar movimiento</Button>} />
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>{editandoGastoGenerado ? "Editar empleado del gasto" : (editingMovimiento ? "Editar movimiento de caja" : "Nuevo movimiento de caja")}</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                {editandoGastoGenerado && (
                  <p className="text-sm text-muted-foreground">Solo se puede ajustar el empleado; el resto de la información se administra desde Gastos Operativos.</p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={form.tipo === "Ingreso" ? "default" : "outline"}
                    onClick={() => setForm({ ...form, tipo: "Ingreso" })}
                    disabled={editandoGastoGenerado}
                  >
                    <ArrowDownCircle className="size-4 mr-1 text-green-600" /> Ingreso
                  </Button>
                  <Button
                    type="button"
                    variant={form.tipo === "Egreso" ? "default" : "outline"}
                    onClick={() => setForm({ ...form, tipo: "Egreso" })}
                    disabled={editandoGastoGenerado}
                  >
                    <ArrowUpCircle className="size-4 mr-1 text-red-600" /> Egreso
                  </Button>
                </div>
                <div><Label>Fecha</Label><Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} disabled={editandoGastoGenerado} /></div>
                <div>
                  <Label>Empleado</Label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background h-9" value={form.id_asesor} onChange={(e) => setForm({ ...form, id_asesor: e.target.value })}>
                    <option value="">— Sin empleado —</option>
                    {asesores.map((a) => (
                      <option key={a.id} value={a.id}>{a.nombre_asesor}</option>
                    ))}
                  </select>
                </div>
                <div><Label>Motivo</Label><Input value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} placeholder="Ej. PAGO 12/16 JUAN PEREZ" disabled={editandoGastoGenerado} /></div>
                <div><Label>Monto</Label><Input type="number" min="0.01" step="0.01" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} disabled={editandoGastoGenerado} /></div>
                <div>
                  <Label>Categoría</Label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background h-9" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} disabled={editandoGastoGenerado}>
                    <option value="">Auto-detectar</option>
                    {CATEGORIAS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Cuenta / forma de pago</Label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background h-9" value={form.cuenta} onChange={(e) => setForm({ ...form, cuenta: e.target.value })} disabled={editandoGastoGenerado}>
                    {cuentas.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <Button onClick={handleSave}>{editandoGastoGenerado ? "Guardar empleado" : (editingMovimiento ? "Guardar cambios" : "Guardar")}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {resumen && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Saldo Inicial</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold">{fmt(resumen.saldo_inicial_mes)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Ingresos</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold text-green-600">{fmt(resumen.total_ingresos)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Egresos</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold text-red-600">{fmt(resumen.total_egresos)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Capital Pasivo</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold text-primary">{fmt(capitalPasivo)}</CardContent>
          </Card>
        </div>
      )}

      {resumen && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Gastos Operativos</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold text-red-600">{fmt(resumen.gastos_operativos)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Rendimientos Inversionistas</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold text-red-600">{fmt(resumen.rendimientos_inversionistas)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Nómina</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold text-red-600">{fmt(resumen.nomina)}</CardContent>
          </Card>
        </div>
      )}

      {resumen && (
        <Card>
          <CardHeader><CardTitle className="text-base">Resumen de cartera</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
            <div><p className="text-muted-foreground text-xs">Capital Pasivo</p><p className="font-semibold text-primary">{fmt(capitalPasivo)}</p></div>
            <div><p className="text-muted-foreground text-xs">Cartera Individual</p><p className="font-semibold">{fmt(resumen.cartera_individual)}</p></div>
            <div><p className="text-muted-foreground text-xs">Cartera Grupal</p><p className="font-semibold">{fmt(resumen.cartera_grupal)}</p></div>
            <div><p className="text-muted-foreground text-xs">Mora Total</p><p className="font-semibold text-red-600">{fmt(resumen.mora)}</p></div>
            <div><p className="text-muted-foreground text-xs">Inversionistas</p><p className="font-semibold">{fmt(capitalInversionistas)}</p></div>
          </CardContent>
        </Card>
      )}

      {resumen && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2"><IndicatorTitle title="Total Neto" calculation="Cartera individual + cartera grupal + capital pasivo − capital de inversionistas." /></CardHeader>
            <CardContent className="text-2xl font-bold text-primary">{fmt(totalNeto)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><IndicatorTitle title="Total Bruto" calculation="Cartera individual + cartera grupal + capital pasivo." /></CardHeader>
            <CardContent className="text-2xl font-bold">{fmt(totalBruto)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><IndicatorTitle title="Total Neto c/mora" calculation="Total bruto + mora total − capital de inversionistas." /></CardHeader>
            <CardContent className="text-2xl font-bold text-primary">{fmt(totalNetoConMora)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><IndicatorTitle title="Total Bruto c/mora" calculation="Total bruto + mora total." /></CardHeader>
            <CardContent className="text-2xl font-bold">{fmt(totalBrutoConMora)}</CardContent>
          </Card>
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => { setTab(v); listControls.setPage(1); }}>
        <TabsList>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="ingresos">Ingresos</TabsTrigger>
          <TabsTrigger value="egresos">Egresos</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4 space-y-4">
          <TableSearch placeholder="Buscar por motivo, empleado, cuenta..." value={listControls.search} onChange={listControls.handleSearch} />
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead className="text-right">Egreso</TableHead>
                  <TableHead className="text-right">Ingreso</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="h-32 text-center text-muted-foreground">Cargando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="h-32 text-center text-muted-foreground">{listControls.search ? "Sin resultados." : "Sin movimientos este mes."}</TableCell></TableRow>
                ) : paginated.map((m) => {
                  const isSaldoInicial = m.categoria === "SaldoInicial";
                  return (
                    <TableRow key={m.id} className={isSaldoInicial ? "bg-muted/40 font-medium" : undefined}>
                      <TableCell>{fmtFecha(m.fecha)}</TableCell>
                      <TableCell className="text-xs">{m.asesor?.nombre_asesor ?? m.registrado_por?.name ?? "—"}</TableCell>
                      <TableCell className="max-w-[280px] truncate text-sm" title={m.motivo}>
                        {m.motivo}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={isSaldoInicial ? "secondary" : "outline"}
                          className={`text-xs ${isSaldoInicial ? "bg-blue-50 text-blue-800 border-blue-200" : ""}`}
                        >
                          {isSaldoInicial ? "Saldo Inicial" : (m.categoria ?? "—")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{m.cuenta ?? "—"}</TableCell>
                      <TableCell className="text-right text-red-600 font-medium">
                        {!isSaldoInicial && m.tipo === "Egreso" ? fmt(m.monto) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {!isSaldoInicial && m.tipo === "Ingreso" ? fmt(m.monto) : "—"}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${isSaldoInicial ? "text-primary font-bold" : ""}`}>
                        {m.saldo_resultante != null ? fmt(m.saldo_resultante) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(m)} aria-label={`Editar movimiento ${m.id}`}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(m)}
                          disabled={deletingId === m.id || isMovimientoGenerado(m)}
                          aria-label={`Eliminar movimiento ${m.id}`}
                          title={isMovimientoGenerado(m) ? "Movimiento generado automáticamente" : "Eliminar movimiento"}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
          {!loading && (
            <TablePagination page={listControls.page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={listControls.setPage} label="movimientos" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
