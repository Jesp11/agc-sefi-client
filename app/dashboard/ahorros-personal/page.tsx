"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { ArrowDownCircle, ArrowUpCircle, ChevronDown, Download, FileDown, FileSpreadsheet, History } from "lucide-react";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { asesorAhorroSearchFields, historialMovSearchFields } from "@/lib/table-utils";
import { downloadAhorroWorkbook, parseAhorroImportFile } from "@/lib/ahorro-personal-xlsx";

type Movimiento = { id: number; tipo: string; monto: number; fecha: string; notas?: string };
type AsesorAhorro = {
  id: number;
  nombre: string;
  codigo: string;
  saldo: number;
  movimientos: Movimiento[];
};

type Resumen = {
  anio: number;
  meses: string[];
  asesores: Array<{ id: number; nombre: string; codigo: string; saldo: number; meses: Record<string, number>; total_anio: number }>;
  totales_mes: Record<string, number>;
  total_general: number;
  total_saldo: number;
};

const TITULO_RESUMEN = (anio: number) =>
  `RESUMEN DE AHORRO VOLUNTARIO DEL PERSONAL DE AGC SERVICIOS FINANCIEROS CORRESPONDIENTES AL AÑO ${anio}.`;

const emptyMovForm = () => ({
  monto: "",
  fecha: new Date().toISOString().split("T")[0],
  notas: "",
});

type MovimientoDetalle = Movimiento & { saldoResultante: number; personaNombre?: string; codigo?: string };

function enrichMovimientosWithSaldo(movimientos: Movimiento[]): MovimientoDetalle[] {
  const sorted = [...movimientos].sort((a, b) => {
    const byDate = a.fecha.localeCompare(b.fecha);
    return byDate !== 0 ? byDate : a.id - b.id;
  });
  let running = 0;
  return sorted.map((m) => {
    if (m.tipo === "Ingreso") running += Number(m.monto);
    else running -= Number(m.monto);
    return { ...m, saldoResultante: running };
  });
}

function movimientoEnAnio(fecha: string, anio: number) {
  return new Date(fecha).getFullYear() === anio;
}

export default function AhorrosPersonalPage() {
  const [data, setData] = useState<{ total_saldo: number; asesores: AsesorAhorro[] } | null>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [movForm, setMovForm] = useState(emptyMovForm());
  const [selected, setSelected] = useState<AsesorAhorro | null>(null);
  const [movTipo, setMovTipo] = useState<"ingreso" | "retiro">("ingreso");
  const [movOpen, setMovOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("resumen");
  const [historialAsesorId, setHistorialAsesorId] = useState<string>("all");
  const [historialTipo, setHistorialTipo] = useState<string>("all");
  const listControls = useTableControls();
  const historialControls = useTableControls();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const [listRes, resumenRes] = await Promise.all([
      apiFetch("/ahorros-personal"),
      apiFetch(`/ahorros-personal/resumen?anio=${anio}`),
    ]);
    if (listRes.ok && resumenRes.ok) {
      setData(await listRes.json());
      setResumen(await resumenRes.json());
    } else {
      const err = await listRes.json().catch(() => ({}));
      setLoadError(err.message || "No se pudo cargar. Ejecuta: php artisan migrate");
    }
    setLoading(false);
  }, [anio]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openMovimiento = (asesor: AsesorAhorro, tipo: "ingreso" | "retiro") => {
    setSelected(asesor);
    setMovTipo(tipo);
    setMovForm(emptyMovForm());
    setMovOpen(true);
  };

  const openHistorialAsesor = (asesorId: number) => {
    setHistorialAsesorId(String(asesorId));
    setHistorialTipo("all");
    historialControls.handleSearch("");
    setActiveTab("historial");
  };

  const handleMovimiento = async () => {
    if (!selected) return;
    const res = await apiFetch(`/ahorros-personal/${selected.id}/${movTipo}`, {
      method: "POST",
      body: JSON.stringify({ ...movForm, monto: parseFloat(movForm.monto) }),
    });
    if (res.ok) {
      toast.success(movTipo === "ingreso" ? "Ingreso registrado" : "Retiro registrado");
      setMovOpen(false);
      fetchData();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || "Error al registrar movimiento");
    }
  };

  const filasParaExcel = () =>
    (resumen?.asesores ?? []).map((a) => ({
      nombre: a.nombre,
      codigo: a.codigo,
      meses: a.meses,
      total_anio: a.total_anio,
      saldo: a.saldo,
    }));

  const handleExportTemplate = () => {
    const filas = filasParaExcel();
    if (filas.length === 0) {
      toast.error("No hay asesores en el catálogo.");
      return;
    }
    downloadAhorroWorkbook(anio, filas, false, `plantilla_ahorro_personal_${anio}.xlsx`, TITULO_RESUMEN(anio));
    toast.success("Plantilla anual descargada");
  };

  const handleExportInfo = () => {
    setIsExporting(true);
    try {
      const filas = filasParaExcel();
      if (filas.length === 0) {
        toast.error("No hay datos para exportar.");
        return;
      }
      downloadAhorroWorkbook(anio, filas, true, `ahorro_personal_${anio}.xlsx`, TITULO_RESUMEN(anio));
      toast.success("Información exportada");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setIsImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const { filas, errores: parseErrors } = parseAhorroImportFile(buffer, anio);

      if (parseErrors.length > 0 && filas.length === 0) {
        toast.error(parseErrors[0]);
        return;
      }

      const res = await apiFetch("/ahorros-personal/import", {
        method: "POST",
        body: JSON.stringify({ anio, filas, reemplazar: true }),
      });
      const result = await res.json();

      if ((result.creados ?? 0) > 0) {
        toast.success(result.message || "Importación completada");
        fetchData();
      }

      if (result.errores?.length) {
        const detalle = result.errores
          .slice(0, 3)
          .map((err: { fila: number; mensaje: string }) => `Fila ${err.fila}: ${err.mensaje}`)
          .join(" · ");
        toast.error(`${result.errores.length} advertencia(s). ${detalle}`);
      } else if (!res.ok && !(result.creados > 0)) {
        toast.error(result.message || "Error al importar");
      }

      if (parseErrors.length > 0) toast.warning(parseErrors.join(" "));
    } catch {
      toast.error("Error al leer el archivo Excel");
    } finally {
      setIsImporting(false);
    }
  };

  if (loading) return <div className="p-8">Cargando...</div>;

  if (loadError || !data || !resumen) {
    return (
      <div className="p-8 space-y-4">
        <h1 className="text-3xl font-bold">Ahorro Personal</h1>
        <Card><CardContent className="pt-6 text-muted-foreground">{loadError || "Error al cargar."}</CardContent></Card>
      </div>
    );
  }

  const fmt = (n: number) => (n === 0 ? "—" : `$${Number(n).toLocaleString()}`);
  const listFiltered = filterBySearch(data.asesores, listControls.search, asesorAhorroSearchFields);
  const listPaginated = paginateItems(listFiltered, listControls.page);

  const historialAsesor = historialAsesorId !== "all"
    ? data.asesores.find((a) => a.id === Number(historialAsesorId))
    : null;

  const historialDetalle: MovimientoDetalle[] = (historialAsesor
    ? enrichMovimientosWithSaldo(historialAsesor.movimientos).map((m) => ({
        ...m,
        personaNombre: historialAsesor.nombre,
        codigo: historialAsesor.codigo,
      }))
    : data.asesores.flatMap((a) =>
        enrichMovimientosWithSaldo(a.movimientos).map((m) => ({
          ...m,
          personaNombre: a.nombre,
          codigo: a.codigo,
        }))
      )
  )
    .filter((m) => movimientoEnAnio(m.fecha, anio))
    .filter((m) => historialTipo === "all" || m.tipo === historialTipo)
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);

  const historialFiltered = filterBySearch(historialDetalle, historialControls.search, historialMovSearchFields);
  const historialPaginated = paginateItems(historialFiltered, historialControls.page);

  const historialStats = historialAsesor
    ? historialDetalle.reduce(
        (acc, m) => {
          if (m.tipo === "Ingreso") acc.ingresos += Number(m.monto);
          else acc.retiros += Number(m.monto);
          return acc;
        },
        { ingresos: 0, retiros: 0 }
      )
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Ahorro Personal</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Ahorro voluntario del personal (catálogo de asesores) — ingresos y retiros
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Label htmlFor="anio">Año</Label>
            <Input id="anio" type="number" className="w-24" value={anio} onChange={(e) => setAnio(parseInt(e.target.value) || new Date().getFullYear())} />
          </div>
          <input ref={importInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportFile} />
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
              <DropdownMenuItem onClick={() => importInputRef.current?.click()} disabled={isImporting || isExporting}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {isImporting ? "Importando..." : "Importar"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportInfo} disabled={isImporting || isExporting}>
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? "Exportando..." : "Exportar información"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportTemplate} disabled={isImporting || isExporting}>
                <FileDown className="mr-2 h-4 w-4" />
                Exportar plantilla anual
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Total en Fondos de Ahorro</CardTitle></CardHeader>
        <CardContent className="text-3xl font-bold text-primary">${Number(data.total_saldo).toLocaleString()}</CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[480px]">
          <TabsTrigger value="resumen">Resumen {anio}</TabsTrigger>
          <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Resumen {anio}</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gestor Cobranza</TableHead>
                    <TableHead>ID</TableHead>
                    {resumen.meses.map((m) => (
                      <TableHead key={m} className="text-right text-xs">{m}/{String(anio).slice(2)}</TableHead>
                    ))}
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumen.asesores.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium whitespace-nowrap">{a.nombre}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{a.codigo}</TableCell>
                      {resumen.meses.map((m) => (
                        <TableCell key={m} className="text-right text-sm">{fmt(a.meses[m])}</TableCell>
                      ))}
                      <TableCell className="text-right font-semibold">{fmt(a.total_anio)}</TableCell>
                      <TableCell className="text-right font-semibold">${Number(a.saldo).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={2}>TOTALES</TableCell>
                    {resumen.meses.map((m) => (
                      <TableCell key={m} className="text-right text-sm">{fmt(resumen.totales_mes[m])}</TableCell>
                    ))}
                    <TableCell className="text-right">{fmt(resumen.total_general)}</TableCell>
                    <TableCell className="text-right">${Number(resumen.total_saldo).toLocaleString()}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movimientos" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Movimientos por Gestor Cobranza</CardTitle></CardHeader>
            <CardContent className="p-0 space-y-4">
              <div className="px-6 pt-4">
                <TableSearch placeholder="Buscar gestores de cobranza..." value={listControls.search} onChange={listControls.handleSearch} />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gestor Cobranza</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listFiltered.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">{listControls.search ? "No se encontraron gestores de cobranza." : "No hay gestores de cobranza. Regístralos en Catálogos → Empleados."}</TableCell></TableRow>
                  ) : listPaginated.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.nombre}</TableCell>
                      <TableCell className="text-muted-foreground">{a.codigo}</TableCell>
                      <TableCell className="text-right font-semibold">${Number(a.saldo).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => openMovimiento(a, "ingreso")}>
                            <ArrowDownCircle className="size-4 mr-1 text-green-600" />Ingresar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openMovimiento(a, "retiro")}>
                            <ArrowUpCircle className="size-4 mr-1 text-red-600" />Retirar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openHistorialAsesor(a.id)}>
                            <History className="size-4 mr-1" />Historial
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="px-6 pb-4">
                <TablePagination page={listControls.page} totalItems={listFiltered.length} pageSize={PAGE_SIZE} onPageChange={listControls.setPage} label="asesores" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historial" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {historialAsesor
                  ? `Historial — ${historialAsesor.nombre}`
                  : "Historial de movimientos"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="grid gap-1.5 min-w-[220px]">
                  <Label htmlFor="historial-asesor">Gestor Cobranza</Label>
                  <select
                    id="historial-asesor"
                    className="border rounded-md px-3 py-2 text-sm bg-background h-9"
                    value={historialAsesorId}
                    onChange={(e) => {
                      setHistorialAsesorId(e.target.value);
                      historialControls.setPage(1);
                    }}
                  >
                    <option value="all">Todos los gestores de cobranza</option>
                    {data.asesores.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre} ({a.codigo})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1.5 min-w-[160px]">
                  <Label htmlFor="historial-tipo">Tipo</Label>
                  <select
                    id="historial-tipo"
                    className="border rounded-md px-3 py-2 text-sm bg-background h-9"
                    value={historialTipo}
                    onChange={(e) => {
                      setHistorialTipo(e.target.value);
                      historialControls.setPage(1);
                    }}
                  >
                    <option value="all">Todos</option>
                    <option value="Ingreso">Ingresos</option>
                    <option value="Retiro">Retiros</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <TableSearch
                    placeholder="Buscar por fecha, monto, notas..."
                    value={historialControls.search}
                    onChange={historialControls.handleSearch}
                  />
                </div>
              </div>

              {historialAsesor && historialStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Saldo actual</p>
                    <p className="text-lg font-semibold">${Number(historialAsesor.saldo).toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Ingresos {anio}</p>
                    <p className="text-lg font-semibold text-green-600">${historialStats.ingresos.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Retiros {anio}</p>
                    <p className="text-lg font-semibold text-red-600">${historialStats.retiros.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Movimientos {anio}</p>
                    <p className="text-lg font-semibold">{historialDetalle.length}</p>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      {!historialAsesor && <TableHead>Gestor Cobranza</TableHead>}
                      {!historialAsesor && <TableHead>ID</TableHead>}
                      <TableHead>Tipo</TableHead>
                      <TableHead>Notas</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      {historialAsesor && <TableHead className="text-right">Saldo</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historialFiltered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={historialAsesor ? 5 : 6} className="text-center text-muted-foreground py-8">
                          {historialControls.search || historialTipo !== "all"
                            ? "No se encontraron movimientos con los filtros aplicados."
                            : historialAsesor
                              ? `Sin movimientos en ${anio} para este asesor.`
                              : `Sin movimientos registrados en ${anio}.`}
                        </TableCell>
                      </TableRow>
                    ) : historialPaginated.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{fmtFecha(m.fecha)}</TableCell>
                        {!historialAsesor && <TableCell className="font-medium">{m.personaNombre}</TableCell>}
                        {!historialAsesor && <TableCell className="text-muted-foreground text-sm">{m.codigo}</TableCell>}
                        <TableCell>
                          <span className={m.tipo === "Ingreso" ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                            {m.tipo}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[240px] truncate" title={m.notas || undefined}>
                          {m.notas || "—"}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${m.tipo === "Ingreso" ? "text-green-600" : "text-red-600"}`}>
                          {m.tipo === "Ingreso" ? "+" : "−"}${Number(m.monto).toLocaleString()}
                        </TableCell>
                        {historialAsesor && (
                          <TableCell className="text-right font-medium">
                            ${Number(m.saldoResultante).toLocaleString()}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {historialFiltered.length > 0 && (
                <TablePagination
                  page={historialControls.page}
                  totalItems={historialFiltered.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={historialControls.setPage}
                  label="movimientos"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={movOpen} onOpenChange={setMovOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{movTipo === "ingreso" ? "Registrar Ingreso" : "Registrar Retiro"} — {selected?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div><Label>Monto</Label><Input type="number" min="0.01" step="0.01" value={movForm.monto} onChange={(e) => setMovForm({ ...movForm, monto: e.target.value })} /></div>
            <div><Label>Fecha</Label><Input type="date" value={movForm.fecha} onChange={(e) => setMovForm({ ...movForm, fecha: e.target.value })} /></div>
            <div><Label>Notas</Label><Input value={movForm.notas} onChange={(e) => setMovForm({ ...movForm, notas: e.target.value })} /></div>
            {selected && movTipo === "retiro" && (
              <p className="text-sm text-muted-foreground">Saldo disponible: ${Number(selected.saldo).toLocaleString()}</p>
            )}
            <Button onClick={handleMovimiento}>Confirmar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
