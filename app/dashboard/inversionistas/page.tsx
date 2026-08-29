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
import { FileText } from "lucide-react";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { fetchAllPages, inversionistaSearchFields } from "@/lib/table-utils";
import { InversionistaDocumentoDialog } from "@/components/inversionista-documento-dialog";

export default function InversionistasPage() {
  const [items, setItems] = useState<any[]>([]);
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
    }
    else toast.error("Error al crear");
  };

  const filtered = filterBySearch(items, search, inversionistaSearchFields);
  const paginated = paginateItems(filtered, page);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Inversionistas</h1>
          <p className="text-muted-foreground">Personas o fuentes externas que aportan fondeo al capital.</p>
        </div>
        <Dialog>
          <DialogTrigger render={<Button>Nueva Fuente</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>Alta de Fuente de Fondeo</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Nombre</Label><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
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
              <div><Label>Contacto</Label><Input value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} /></div>
              <div><Label>Teléfono</Label><Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <Button onClick={handleCreate}>Guardar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <TableSearch placeholder="Buscar inversionistas o fuentes..." value={search} onChange={handleSearch} />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Tipo</TableHead><TableHead>Origen</TableHead><TableHead>Contacto</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acción</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">{search ? "No se encontraron registros." : "Sin fuentes de fondeo registradas."}</TableCell></TableRow>
            ) : paginated.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">{inv.nombre}</TableCell>
                <TableCell>{inv.tipo_entidad || "Persona Fisica"}</TableCell>
                <TableCell>{inv.origen_fondeo || "—"}</TableCell>
                <TableCell>{inv.contacto || inv.telefono || inv.email || "—"}</TableCell>
                <TableCell>{inv.activo ? "Activo" : "Inactivo"}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => {
                      setSelectedDoc(inv);
                      setDocOpen(true);
                    }}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Documentos
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      {!loading && (
        <TablePagination page={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} label="inversionistas" />
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
