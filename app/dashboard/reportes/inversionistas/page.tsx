"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { inversionistaSearchFields } from "@/lib/table-utils";

export default function ReporteInversionistasPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { search, handleSearch, page, setPage } = useTableControls();

  useEffect(() => {
    setLoading(true);
    apiFetch("/reportes/inversionistas").then(async (res) => {
      if (res.ok) setData(await res.json());
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8">Cargando...</div>;
  if (!data) return <div className="p-8">Error al cargar datos.</div>;

  const inversionistas = data.inversionistas || [];
  const filtered = filterBySearch(inversionistas, search, (inv: any) => [
    ...inversionistaSearchFields(inv),
    inv.total_aportado,
  ]);
  const paginated = paginateItems(filtered, page);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Reporte de Inversionistas</h1>
      <div className="grid md:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle className="text-sm">Inversionistas Activos</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{data.total_activos}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Total Aportado</CardTitle></CardHeader><CardContent className="text-3xl font-bold text-primary">${Number(data.total_aportado).toLocaleString()}</CardContent></Card>
      </div>
      <Card className="p-6 space-y-4">
        <TableSearch placeholder="Buscar inversionistas..." value={search} onChange={handleSearch} />
        <Table>
          <TableHeader><TableRow><TableHead>Inversionista</TableHead><TableHead>Contacto</TableHead><TableHead className="text-right">Aportado</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">{search ? "No se encontraron inversionistas." : "Sin registros."}</TableCell></TableRow>
            ) : paginated.map((inv: any) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">{inv.nombre}</TableCell>
                <TableCell>{inv.contacto || inv.telefono}</TableCell>
                <TableCell className="text-right font-semibold">${Number(inv.total_aportado).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination page={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} label="inversionistas" />
      </Card>
    </div>
  );
}
