"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { fmtFecha } from "@/lib/utils";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { fetchAllPages, nominaSearchFields } from "@/lib/table-utils";

function parseConceptoMontoLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [concepto, monto] = line.split(":");
      return { concepto: (concepto || "").trim(), monto: Number((monto || "").trim()) || 0 };
    })
    .filter((item) => item.concepto && item.monto >= 0);
}

function formatConceptoMontoLines(items?: Array<{ concepto: string; monto: number }>) {
  return (items ?? []).map((item) => `${item.concepto}: ${item.monto}`).join("\n");
}

export default function NominaPage() {
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { search, handleSearch, page, setPage } = useTableControls();
  const [form, setForm] = useState({ fecha_inicio: "", fecha_fin: "" });
  const [procesando, setProcesando] = useState(false);
  const [catalogoOpen, setCatalogoOpen] = useState(false);
  const [editingEmpleado, setEditingEmpleado] = useState<any | null>(null);
  const [empleadoForm, setEmpleadoForm] = useState({ sueldo_base: "", porcentaje_ahorro: "", percepciones: "", deducciones: "" });
  const [ajustesPeriodo, setAjustesPeriodo] = useState<Record<string, { percepciones: string; deducciones: string }>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rows, empleadosRows] = await Promise.all([
        fetchAllPages("/nomina"),
        fetchAllPages("/empleados"),
      ]);
      setPeriodos(rows);
      setEmpleados(empleadosRows);
    } catch {
      toast.error("Error al cargar nómina");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const procesar = async () => {
    setProcesando(true);
    const ajustes = Object.entries(ajustesPeriodo)
      .map(([empleado_id, ajustesItem]) => ({
        empleado_id: Number(empleado_id),
        percepciones: parseConceptoMontoLines(ajustesItem.percepciones),
        deducciones: parseConceptoMontoLines(ajustesItem.deducciones),
      }))
      .filter((item) => item.percepciones.length || item.deducciones.length);

    const res = await apiFetch("/nomina", { method: "POST", body: JSON.stringify({ ...form, ajustes }) });
    if (res.ok) {
      toast.success("Nómina procesada");
      setAjustesPeriodo({});
      fetchData();
    } else {
      toast.error("Error al procesar nómina");
    }
    setProcesando(false);
  };

  const openEditEmpleado = (empleado: any) => {
    setEditingEmpleado(empleado);
    setEmpleadoForm({
      sueldo_base: String(empleado.sueldo_base ?? ""),
      porcentaje_ahorro: String(empleado.porcentaje_ahorro ?? ""),
      percepciones: formatConceptoMontoLines(empleado.percepciones_config),
      deducciones: formatConceptoMontoLines(empleado.deducciones_config),
    });
  };

  const guardarEmpleado = async () => {
    if (!editingEmpleado) return;
    const res = await apiFetch(`/empleados/${editingEmpleado.id}`, {
      method: "PUT",
      body: JSON.stringify({
        sueldo_base: Number(empleadoForm.sueldo_base),
        porcentaje_ahorro: empleadoForm.porcentaje_ahorro === "" ? null : Number(empleadoForm.porcentaje_ahorro),
        percepciones_config: parseConceptoMontoLines(empleadoForm.percepciones),
        deducciones_config: parseConceptoMontoLines(empleadoForm.deducciones),
      }),
    });
    if (res.ok) {
      toast.success("Empleado actualizado");
      setEditingEmpleado(null);
      fetchData();
    } else {
      toast.error("No se pudo actualizar el empleado");
    }
  };

  const filtered = filterBySearch(periodos, search, nominaSearchFields);
  const paginated = paginateItems(filtered, page);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Nómina de Personal</h1>
        <div className="flex items-center gap-2">
        <Dialog open={catalogoOpen} onOpenChange={setCatalogoOpen}>
          <DialogTrigger render={<Button variant="outline">Configurar empleados</Button>} />
          <DialogContent className="max-w-4xl">
            <DialogHeader><DialogTitle>Configuración de nómina</DialogTitle></DialogHeader>
            <Table>
              <TableHeader><TableRow><TableHead>Empleado</TableHead><TableHead>Puesto</TableHead><TableHead>Sueldo base</TableHead><TableHead>% ahorro</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {empleados.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Sin empleados.</TableCell></TableRow>
                ) : empleados.map((empleado) => (
                  <TableRow key={empleado.id}>
                    <TableCell>{empleado.nombre}</TableCell>
                    <TableCell>{empleado.puesto || "—"}</TableCell>
                    <TableCell>${Number(empleado.sueldo_base).toLocaleString()}</TableCell>
                    <TableCell>{empleado.porcentaje_ahorro ?? 0}%</TableCell>
                    <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => openEditEmpleado(empleado)}>Editar</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DialogContent>
        </Dialog>
        <Dialog>
          <DialogTrigger render={<Button>Procesar Nómina</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>Periodo de Nómina</DialogTitle></DialogHeader>
            <div className="grid gap-3 max-h-[70vh] overflow-auto">
              <div><Label>Inicio</Label><Input type="date" value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} /></div>
              <div><Label>Fin</Label><Input type="date" value={form.fecha_fin} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} /></div>
              {empleados.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Ajustes por periodo</p>
                  {empleados.map((empleado) => {
                    const current = ajustesPeriodo[String(empleado.id)] ?? { percepciones: "", deducciones: "" };
                    return (
                      <div key={empleado.id} className="rounded-md border p-3 space-y-2">
                        <p className="text-sm font-semibold">{empleado.nombre}</p>
                        <div>
                          <Label>Percepciones extraordinarias</Label>
                          <textarea
                            className="mt-1 min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            placeholder="Bono puntualidad: 250"
                            value={current.percepciones}
                            onChange={(e) => setAjustesPeriodo((prev) => ({ ...prev, [empleado.id]: { ...current, percepciones: e.target.value } }))}
                          />
                        </div>
                        <div>
                          <Label>Deducciones extraordinarias</Label>
                          <textarea
                            className="mt-1 min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            placeholder="Préstamo interno: 300"
                            value={current.deducciones}
                            onChange={(e) => setAjustesPeriodo((prev) => ({ ...prev, [empleado.id]: { ...current, deducciones: e.target.value } }))}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <Button onClick={procesar} disabled={procesando}>{procesando ? "Procesando..." : "Dispersar"}</Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>
      <TableSearch placeholder="Buscar periodos..." value={search} onChange={handleSearch} />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Periodo</TableHead><TableHead>Total Dispersado</TableHead><TableHead>Percepciones</TableHead><TableHead>Deducciones</TableHead><TableHead>Empleados</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">{search ? "No se encontraron periodos." : "Sin periodos registrados."}</TableCell></TableRow>
            ) : paginated.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{fmtFecha(p.fecha_inicio)} — {fmtFecha(p.fecha_fin)}</TableCell>
                <TableCell className="font-semibold">${Number(p.total_dispersado).toLocaleString()}</TableCell>
                <TableCell>${Number((p.detalles ?? []).reduce((sum: number, item: any) => sum + Number(item.total_percepciones ?? 0), 0)).toLocaleString()}</TableCell>
                <TableCell>${Number((p.detalles ?? []).reduce((sum: number, item: any) => sum + Number(item.total_deducciones ?? 0) + Number(item.retencion_ahorro ?? 0), 0)).toLocaleString()}</TableCell>
                <TableCell>{p.detalles?.length ?? 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Dialog open={Boolean(editingEmpleado)} onOpenChange={(open) => !open && setEditingEmpleado(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar configuración de nómina</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Sueldo base</Label><Input type="number" value={empleadoForm.sueldo_base} onChange={(e) => setEmpleadoForm((prev) => ({ ...prev, sueldo_base: e.target.value }))} /></div>
            <div><Label>% ahorro</Label><Input type="number" value={empleadoForm.porcentaje_ahorro} onChange={(e) => setEmpleadoForm((prev) => ({ ...prev, porcentaje_ahorro: e.target.value }))} /></div>
            <div>
              <Label>Percepciones fijas</Label>
              <textarea className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={empleadoForm.percepciones} onChange={(e) => setEmpleadoForm((prev) => ({ ...prev, percepciones: e.target.value }))} placeholder="Bono puntualidad: 250" />
            </div>
            <div>
              <Label>Deducciones fijas</Label>
              <textarea className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={empleadoForm.deducciones} onChange={(e) => setEmpleadoForm((prev) => ({ ...prev, deducciones: e.target.value }))} placeholder="Préstamo interno: 300" />
            </div>
            <Button onClick={guardarEmpleado}>Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>
      {!loading && (
        <TablePagination page={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} label="periodos" />
      )}
    </div>
  );
}
