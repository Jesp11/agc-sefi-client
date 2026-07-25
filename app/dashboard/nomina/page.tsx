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

export default function NominaPage() {
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { search, handleSearch, page, setPage } = useTableControls();
  const [form, setForm] = useState({ fecha_inicio: "", fecha_fin: "" });

  const fetchData = async () => {
    setLoading(true);
    try {
      const rows = await fetchAllPages("/nomina");
      setPeriodos(rows);
    } catch {
      toast.error("Error al cargar nómina");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const procesar = async () => {
    const res = await apiFetch("/nomina", { method: "POST", body: JSON.stringify(form) });
    if (res.ok) { toast.success("Nómina procesada"); fetchData(); }
    else toast.error("Error al procesar nómina");
  };

  const filtered = filterBySearch(periodos, search, nominaSearchFields);
  const paginated = paginateItems(filtered, page);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Nómina de Personal</h1>
        <Dialog>
          <DialogTrigger render={<Button>Procesar Nómina</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>Periodo de Nómina</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Inicio</Label><Input type="date" value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} /></div>
              <div><Label>Fin</Label><Input type="date" value={form.fecha_fin} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} /></div>
              <Button onClick={procesar}>Dispersar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <TableSearch placeholder="Buscar periodos..." value={search} onChange={handleSearch} />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Periodo</TableHead><TableHead>Total Dispersado</TableHead><TableHead>Empleados</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">{search ? "No se encontraron periodos." : "Sin periodos registrados."}</TableCell></TableRow>
            ) : paginated.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{fmtFecha(p.fecha_inicio)} — {fmtFecha(p.fecha_fin)}</TableCell>
                <TableCell className="font-semibold">${Number(p.total_dispersado).toLocaleString()}</TableCell>
                <TableCell>{p.detalles?.length ?? 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      {!loading && (
        <TablePagination page={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} label="periodos" />
      )}
    </div>
  );
}
