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
import { fetchAllPages, gastoSearchFields } from "@/lib/table-utils";
import { BookOpen, Trash2 } from "lucide-react";

type CatalogoGasto = {
  id: number;
  concepto?: string | null;
  categoria?: string | null;
  activo: boolean;
};

type GastoOperativo = {
  id: number;
  catalogo_gasto_id?: number | string | null;
  concepto?: string | null;
  monto?: number | string | null;
  fecha?: string | null;
  categoria?: string | null;
  cuenta?: string | null;
};

const emptyForm = () => ({
  catalogo_gasto_id: "",
  concepto: "",
  monto: "",
  fecha: new Date().toISOString().split("T")[0],
  cuenta: "Efectivo",
});

const emptyCatalogoForm = () => ({
  categoria: "",
});

export default function GastosPage() {
  const [items, setItems] = useState<GastoOperativo[]>([]);
  const [catalogo, setCatalogo] = useState<CatalogoGasto[]>([]);
  const [loading, setLoading] = useState(true);
  const { search, handleSearch, page, setPage } = useTableControls();
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [form, setForm] = useState(emptyForm);
  const [catalogoForm, setCatalogoForm] = useState(emptyCatalogoForm);
  const [gastoOpen, setGastoOpen] = useState(false);
  const [catalogoOpen, setCatalogoOpen] = useState(false);
  const [editingGasto, setEditingGasto] = useState<GastoOperativo | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const rows = await fetchAllPages("/gastos");
      setItems(rows);
    } catch {
      toast.error("Error al cargar gastos");
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalogo = async () => {
    try {
      const rows = await fetchAllPages("/catalogo-gastos");
      setCatalogo(rows);
    } catch {
      toast.error("Error al cargar catálogo de gastos");
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => {
      fetchData();
      fetchCatalogo();
    });
  }, []);

  const activos = catalogo.filter((c) => c.activo);
  const selectedCatalogo = catalogo.find((c) => String(c.id) === form.catalogo_gasto_id);
  const conservarCatalogoInactivo = !!selectedCatalogo
    && !selectedCatalogo.activo
    && String(selectedCatalogo.id) === String(editingGasto?.catalogo_gasto_id);
  const opcionesCatalogo: CatalogoGasto[] = conservarCatalogoInactivo && selectedCatalogo
    ? [selectedCatalogo, ...activos]
    : activos;

  const applyCatalogo = (id: string) => {
    if (!id) {
      setForm((prev) => ({ ...prev, catalogo_gasto_id: "" }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      catalogo_gasto_id: id,
    }));
  };

  const openEditarGasto = (gasto: GastoOperativo) => {
    setEditingGasto(gasto);
    setForm({
      catalogo_gasto_id: gasto.catalogo_gasto_id ? String(gasto.catalogo_gasto_id) : "",
      concepto: gasto.concepto ?? "",
      monto: String(gasto.monto ?? ""),
      fecha: String(gasto.fecha ?? "").slice(0, 10),
      cuenta: gasto.cuenta ?? "",
    });
    setGastoOpen(true);
  };

  const handleSave = async () => {
    const payload: Record<string, unknown> = {
      catalogo_gasto_id: Number(form.catalogo_gasto_id),
      concepto: form.concepto.trim(),
      monto: parseFloat(form.monto),
      fecha: form.fecha,
      cuenta: form.cuenta || null,
    };

    const res = await apiFetch(editingGasto ? `/gastos/${editingGasto.id}` : "/gastos", {
      method: editingGasto ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      toast.success(editingGasto ? "Gasto actualizado" : "Gasto registrado");
      setForm(emptyForm());
      setEditingGasto(null);
      setGastoOpen(false);
      fetchData();
    } else {
      const err = await res.json().catch(() => null);
      toast.error(err?.message || "Error al guardar gasto");
    }
  };

  const handleDeleteGasto = async (gasto: GastoOperativo) => {
    if (!window.confirm(`¿Eliminar el gasto “${gasto.concepto}”? También se eliminarán sus movimientos de Flujo de Caja y Capital Pasivo.`)) {
      return;
    }

    setDeletingId(gasto.id);
    try {
      const res = await apiFetch(`/gastos/${gasto.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Gasto y movimientos relacionados eliminados");
        fetchData();
      } else {
        const err = await res.json().catch(() => null);
        toast.error(err?.message || "Error al eliminar gasto");
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateCatalogo = async () => {
    const payload = {
      categoria: catalogoForm.categoria,
    };
    const res = await apiFetch("/catalogo-gastos", { method: "POST", body: JSON.stringify(payload) });
    if (res.ok) {
      toast.success("Categoría agregada al catálogo");
      setCatalogoForm(emptyCatalogoForm());
      fetchCatalogo();
    } else {
      toast.error("Error al guardar la categoría");
    }
  };

  const toggleCatalogoActivo = async (item: CatalogoGasto) => {
    const res = await apiFetch(`/catalogo-gastos/${item.id}`, {
      method: "PUT",
      body: JSON.stringify({ activo: !item.activo }),
    });
    if (res.ok) {
      toast.success(item.activo ? "Categoría desactivada" : "Categoría activada");
      fetchCatalogo();
    } else {
      toast.error("Error al actualizar catálogo");
    }
  };

  const gastosDelMes = items.filter((gasto) => String(gasto.fecha ?? "").slice(0, 7) === mes);
  const filtered = filterBySearch(gastosDelMes, search, gastoSearchFields);
  const paginated = paginateItems(filtered, page);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <h1 className="text-3xl font-bold">Gastos Operativos</h1>
        <div className="flex items-center gap-2">
          <Dialog open={catalogoOpen} onOpenChange={setCatalogoOpen}>
            <DialogTrigger render={<Button variant="outline"><BookOpen className="size-4" />Catálogo</Button>} />
            <DialogContent className="sm:max-w-xl">
              <DialogHeader><DialogTitle>Catálogo de Categorías</DialogTitle></DialogHeader>
              <div className="grid gap-4">
                <div>
                  <Label>Categoría</Label>
                  <Input
                    value={catalogoForm.categoria}
                    onChange={(e) => setCatalogoForm({ ...catalogoForm, categoria: e.target.value })}
                    placeholder="Ej. Mantenimiento de vehículo"
                  />
                </div>
                <Button onClick={handleCreateCatalogo} disabled={!catalogoForm.categoria.trim()}>
                  Agregar categoría
                </Button>
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {catalogo.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                            Sin categorías en el catálogo.
                          </TableCell>
                        </TableRow>
                      ) : catalogo.map((c) => (
                        <TableRow key={c.id} className={!c.activo ? "opacity-60" : undefined}>
                          <TableCell className="font-medium">{c.categoria}</TableCell>
                          <TableCell>{c.activo ? "Activo" : "Inactivo"}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => toggleCatalogoActivo(c)}>
                              {c.activo ? "Desactivar" : "Activar"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={gastoOpen} onOpenChange={(open) => {
            setGastoOpen(open);
            if (!open) {
              setEditingGasto(null);
              setForm(emptyForm());
            } else if (!editingGasto) {
              setForm(emptyForm());
            }
          }}>
            <DialogTrigger render={<Button>Registrar Gasto</Button>} />
            <DialogContent>
              <DialogHeader><DialogTitle>{editingGasto ? "Editar Gasto" : "Nuevo Gasto"}</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div>
                  <Label>Categoría</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                    value={form.catalogo_gasto_id}
                    onChange={(e) => applyCatalogo(e.target.value)}
                  >
                    <option value="">Seleccionar...</option>
                    {opcionesCatalogo.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.categoria}{!c.activo ? " — inactiva" : ""}
                      </option>
                    ))}
                  </select>
                  {activos.length === 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Primero crea y activa una categoría en el Catálogo para poder registrar gastos.
                    </p>
                  )}
                </div>
                {selectedCatalogo && (
                  <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                    <p><span className="text-muted-foreground">Categoría:</span> {selectedCatalogo.categoria}</p>
                  </div>
                )}
                <div>
                  <Label>Concepto</Label>
                  <Input
                    value={form.concepto}
                    onChange={(e) => setForm({ ...form, concepto: e.target.value })}
                    placeholder="Ej. Reparación de llanta"
                  />
                </div>
                <div>
                  <Label>Monto</Label>
                  <Input type="number" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} />
                </div>
                <div>
                  <Label>Fecha</Label>
                  <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
                </div>
                <div>
                  <Label>Cuenta</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
                    value={form.cuenta}
                    onChange={(e) => setForm({ ...form, cuenta: e.target.value })}
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Spin">Spin</option>
                    <option value="Bancomer">Bancomer</option>
                    <option value="Banorte">Banorte</option>
                    <option value="Banamex">Banamex</option>
                    <option value="BBVA">BBVA</option>
                    <option value="Nue">Nue</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <Button
                  onClick={handleSave}
                  disabled={!form.catalogo_gasto_id || !form.concepto.trim() || !form.monto}
                >
                  {editingGasto ? "Guardar cambios" : "Guardar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:w-48">
          <Label htmlFor="mes-gastos">Mes</Label>
          <Input
            id="mes-gastos"
            type="month"
            value={mes}
            onChange={(e) => {
              setMes(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <TableSearch placeholder="Buscar gastos del mes..." value={search} onChange={handleSearch} />
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Concepto</TableHead><TableHead>Categoría</TableHead><TableHead>Cuenta</TableHead><TableHead className="text-right">Monto</TableHead><TableHead className="text-right">Acción</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">{search ? "No se encontraron gastos." : "Sin gastos registrados. Primero crea una categoría en Catálogo para registrarlo."}</TableCell></TableRow>
            ) : paginated.map((g) => (
              <TableRow key={g.id}>
                <TableCell>{fmtFecha(g.fecha)}</TableCell>
                <TableCell>{g.concepto}</TableCell>
                <TableCell>{g.categoria}</TableCell>
                <TableCell>{g.cuenta || "—"}</TableCell>
                <TableCell className="text-right font-semibold">${Number(g.monto).toLocaleString()}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="outline" onClick={() => openEditarGasto(g)}>Editar</Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteGasto(g)}
                    disabled={deletingId === g.id}
                  >
                    <Trash2 className="size-4" />
                    {deletingId === g.id ? "Eliminando..." : "Eliminar"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      {!loading && (
        <TablePagination page={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} label="gastos" />
      )}
    </div>
  );
}
