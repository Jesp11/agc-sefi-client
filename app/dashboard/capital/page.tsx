"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtFecha } from "@/lib/utils";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { movimientoSearchFields } from "@/lib/table-utils";

export default function CapitalPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { search, handleSearch, page, setPage } = useTableControls();

  useEffect(() => {
    setLoading(true);
    apiFetch("/capital").then(async (res) => {
      if (res.ok) setData(await res.json());
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8">Cargando...</div>;
  if (!data) return <div className="p-8">Error al cargar datos.</div>;

  const movimientos = data.movimientos || [];
  const filtered = filterBySearch(movimientos, search, movimientoSearchFields);
  const paginated = paginateItems(filtered, page);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Capital Pasivo</h1>
      <div className="grid md:grid-cols-4 gap-4">
        <Card><CardHeader><CardTitle className="text-sm">Aportaciones</CardTitle></CardHeader><CardContent className="text-2xl font-bold">${Number(data.total_aportaciones).toLocaleString()}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Colocado</CardTitle></CardHeader><CardContent className="text-2xl font-bold">${Number(data.total_colocado).toLocaleString()}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Gastos</CardTitle></CardHeader><CardContent className="text-2xl font-bold">${Number(data.total_gastos).toLocaleString()}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Capital Disponible</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-primary">${Number(data.capital_pasivo).toLocaleString()}</CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Movimientos Recientes</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <TableSearch placeholder="Buscar movimientos..." value={search} onChange={handleSearch} />
          <Table>
            <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Tipo</TableHead><TableHead>Descripción</TableHead><TableHead className="text-right">Monto</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">{search ? "No se encontraron movimientos." : "Sin movimientos."}</TableCell></TableRow>
              ) : paginated.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell>{fmtFecha(m.fecha)}</TableCell>
                  <TableCell>{m.tipo}</TableCell>
                  <TableCell className="text-sm">{m.descripcion}</TableCell>
                  <TableCell className="text-right font-semibold">${Number(m.monto).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination page={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} label="movimientos" />
        </CardContent>
      </Card>
    </div>
  );
}
