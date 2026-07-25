"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { fmtFecha } from "@/lib/utils";
import { ArrowDownCircle, ArrowUpCircle, Plus } from "lucide-react";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { fetchAllPages, movimientoCajaSearchFields } from "@/lib/table-utils";

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

export default function FlujoCajaPage() {
  const now = new Date();
  const [anio, setAnio] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [resumen, setResumen] = useState<any>(null);
  const [asesores, setAsesores] = useState<any[]>([]);
  const [cuentas, setCuentas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tab, setTab] = useState("todos");
  const listControls = useTableControls();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [movRows, resRes] = await Promise.all([
        fetchAllPages(`/flujo-caja?mes=${mes}&anio=${anio}`),
        apiFetch(`/flujo-caja/resumen?mes=${mes}&anio=${anio}`),
      ]);
      setMovimientos(movRows);
      if (resRes.ok) setResumen(await resRes.json());
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

  const handleCreate = async () => {
    const res = await apiFetch("/flujo-caja", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        monto: parseFloat(form.monto),
        id_asesor: form.id_asesor ? parseInt(form.id_asesor) : null,
        categoria: form.categoria || undefined,
        cuenta: form.cuenta || undefined,
      }),
    });
    if (res.ok) {
      toast.success("Movimiento registrado");
      setDialogOpen(false);
      setForm(emptyForm());
      fetchData();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || "Error al registrar");
    }
  };

  const filteredByTab = movimientos.filter((m) => {
    if (tab === "ingresos") return m.tipo === "Ingreso";
    if (tab === "egresos") return m.tipo === "Egreso";
    return true;
  });
  const filtered = filterBySearch(filteredByTab, listControls.search, movimientoCajaSearchFields);
  const paginated = paginateItems(filtered, listControls.page);

  const fmt = (n: number) => `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold">Ingresos y Egresos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Control de caja — movimientos diarios con saldo acumulado (como el Excel de contabilidad).
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button><Plus className="size-4 mr-1" />Registrar movimiento</Button>} />
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Nuevo movimiento de caja</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={form.tipo === "Ingreso" ? "default" : "outline"}
                    onClick={() => setForm({ ...form, tipo: "Ingreso" })}
                  >
                    <ArrowDownCircle className="size-4 mr-1 text-green-600" /> Ingreso
                  </Button>
                  <Button
                    type="button"
                    variant={form.tipo === "Egreso" ? "default" : "outline"}
                    onClick={() => setForm({ ...form, tipo: "Egreso" })}
                  >
                    <ArrowUpCircle className="size-4 mr-1 text-red-600" /> Egreso
                  </Button>
                </div>
                <div><Label>Fecha</Label><Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></div>
                <div>
                  <Label>Vendedor / Asesor</Label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background h-9" value={form.id_asesor} onChange={(e) => setForm({ ...form, id_asesor: e.target.value })}>
                    <option value="">— Sin asesor —</option>
                    {asesores.map((a) => (
                      <option key={a.id} value={a.id}>{a.nombre_asesor}</option>
                    ))}
                  </select>
                </div>
                <div><Label>Motivo</Label><Input value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} placeholder="Ej. PAGO 12/16 JUAN PEREZ" /></div>
                <div><Label>Monto</Label><Input type="number" min="0.01" step="0.01" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} /></div>
                <div>
                  <Label>Categoría</Label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background h-9" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                    <option value="">Auto-detectar</option>
                    {CATEGORIAS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Cuenta / forma de pago</Label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background h-9" value={form.cuenta} onChange={(e) => setForm({ ...form, cuenta: e.target.value })}>
                    {cuentas.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <Button onClick={handleCreate}>Guardar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {resumen && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Saldo en caja</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold text-primary">{fmt(resumen.saldo_actual)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Ingresos {MESES[mes - 1]}</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold text-green-600">{fmt(resumen.total_ingresos)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Egresos {MESES[mes - 1]}</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold text-red-600">{fmt(resumen.total_egresos)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Saldo mes anterior</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold">{fmt(resumen.saldo_anterior)}</CardContent>
          </Card>
        </div>
      )}

      {resumen && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Resumen de cartera</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-muted-foreground text-xs">Cartera individual</p><p className="font-semibold">{fmt(resumen.cartera_individual)}</p></div>
              <div><p className="text-muted-foreground text-xs">Cartera grupal</p><p className="font-semibold">{fmt(resumen.cartera_grupal)}</p></div>
              <div><p className="text-muted-foreground text-xs">Mora</p><p className="font-semibold text-red-600">{fmt(resumen.mora)}</p></div>
              <div><p className="text-muted-foreground text-xs">Capital pasivo</p><p className="font-semibold">{fmt(resumen.capital_pasivo)}</p></div>
              <div><p className="text-muted-foreground text-xs">Ahorro personal</p><p className="font-semibold">{fmt(resumen.ahorro_personal)}</p></div>
              <div><p className="text-muted-foreground text-xs">Ahorro grupal (socios)</p><p className="font-semibold">{fmt(resumen.ahorro_grupal)}</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Distribución por cuenta (ingresos del mes)</CardTitle></CardHeader>
            <CardContent>
              {Object.keys(resumen.distribucion_cuentas || {}).length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin ingresos con cuenta asignada este mes.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(resumen.distribucion_cuentas).map(([cuenta, monto]) => (
                    <div key={cuenta} className="flex justify-between text-sm">
                      <span>{cuenta}</span>
                      <span className="font-semibold">{fmt(monto as number)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
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
          <TableSearch placeholder="Buscar por motivo, asesor, cuenta..." value={listControls.search} onChange={listControls.handleSearch} />
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Asesor</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead className="text-right">Egreso</TableHead>
                  <TableHead className="text-right">Ingreso</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">Cargando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">{listControls.search ? "Sin resultados." : "Sin movimientos este mes."}</TableCell></TableRow>
                ) : paginated.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{fmtFecha(m.fecha)}</TableCell>
                    <TableCell className="text-xs">{m.asesor?.nombre_asesor ?? "—"}</TableCell>
                    <TableCell className="max-w-[280px] truncate text-sm" title={m.motivo}>{m.motivo}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{m.categoria ?? "—"}</Badge></TableCell>
                    <TableCell className="text-xs">{m.cuenta ?? "—"}</TableCell>
                    <TableCell className="text-right text-red-600 font-medium">
                      {m.tipo === "Egreso" ? fmt(m.monto) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      {m.tipo === "Ingreso" ? fmt(m.monto) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{m.saldo_resultante != null ? fmt(m.saldo_resultante) : "—"}</TableCell>
                  </TableRow>
                ))}
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
