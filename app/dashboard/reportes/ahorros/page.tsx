"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { empleadoAhorroSearchFields } from "@/lib/table-utils";

export default function ReporteAhorrosPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { search, handleSearch, page, setPage } = useTableControls();

  useEffect(() => {
    setLoading(true);
    apiFetch("/reportes/ahorros").then(async (res) => {
      if (res.ok) setData(await res.json());
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8">Cargando...</div>;
  if (!data) return <div className="p-8">Error al cargar datos.</div>;

  const ahorros = data.ahorros || [];
  const filtered = filterBySearch(ahorros, search, empleadoAhorroSearchFields);
  const paginated = paginateItems(filtered, page);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Reporte de Ahorros</h1>
      <Card><CardHeader><CardTitle>Total Fondos</CardTitle></CardHeader><CardContent className="text-3xl font-bold">${Number(data.total_saldo).toLocaleString()}</CardContent></Card>
      <Card className="p-6 space-y-4">
        <TableSearch placeholder="Buscar empleados..." value={search} onChange={handleSearch} />
        <Table>
          <TableHeader><TableRow><TableHead>Empleado</TableHead><TableHead className="text-right">Saldo</TableHead><TableHead>Movimientos</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">{search ? "No se encontraron empleados." : "Sin registros."}</TableCell></TableRow>
            ) : paginated.map((a: any) => (
              <TableRow key={a.id}>
                <TableCell>{a.empleado?.nombre}</TableCell>
                <TableCell className="text-right font-semibold">${Number(a.saldo).toLocaleString()}</TableCell>
                <TableCell>{a.movimientos?.length ?? 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination page={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} label="empleados" />
      </Card>
    </div>
  );
}
