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
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { fetchAllPages, inversionistaSearchFields } from "@/lib/table-utils";

export default function InversionistasPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { search, handleSearch, page, setPage } = useTableControls();
  const [form, setForm] = useState({ nombre: "", contacto: "", telefono: "", email: "" });

  const fetchData = async () => {
    setLoading(true);
    try {
      const rows = await fetchAllPages("/inversionistas");
      setItems(rows);
    } catch {
      toast.error("Error al cargar inversionistas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    const res = await apiFetch("/inversionistas", { method: "POST", body: JSON.stringify(form) });
    if (res.ok) { toast.success("Inversionista creado"); fetchData(); setForm({ nombre: "", contacto: "", telefono: "", email: "" }); }
    else toast.error("Error al crear");
  };

  const filtered = filterBySearch(items, search, inversionistaSearchFields);
  const paginated = paginateItems(filtered, page);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Inversionistas</h1>
        <Dialog>
          <DialogTrigger render={<Button>Nuevo Inversionista</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>Alta de Inversionista</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Nombre</Label><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
              <div><Label>Contacto</Label><Input value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} /></div>
              <div><Label>Teléfono</Label><Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <Button onClick={handleCreate}>Guardar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <TableSearch placeholder="Buscar inversionistas..." value={search} onChange={handleSearch} />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Contacto</TableHead><TableHead>Teléfono</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">{search ? "No se encontraron inversionistas." : "Sin inversionistas registrados."}</TableCell></TableRow>
            ) : paginated.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">{inv.nombre}</TableCell>
                <TableCell>{inv.contacto}</TableCell>
                <TableCell>{inv.telefono}</TableCell>
                <TableCell>{inv.activo ? "Activo" : "Inactivo"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      {!loading && (
        <TablePagination page={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} label="inversionistas" />
      )}
    </div>
  );
}
