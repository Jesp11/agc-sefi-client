"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { Badge } from "@/components/ui/badge";

const searchFields = (item: any) => [item.tipo_cartera, item.nombre, item.codigo, item.saldo];

export default function ReporteCarteraAhorroPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { search, handleSearch, page, setPage } = useTableControls();

  useEffect(() => {
    setLoading(true);
    apiFetch("/reportes/cartera-ahorro").then(async (res) => {
      if (res.ok) setData(await res.json());
      setLoading(false);
    });
  }, []);

  const registros = data?.registros ?? [];
  const filtered = filterBySearch(registros, search, searchFields);
  const paginated = paginateItems(filtered, page);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cartera de Ahorro</h1>
        <p className="text-muted-foreground">Concentrado de ahorro personal y de socios.</p>
      </div>
      {data && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardHeader><CardTitle className="text-sm">Total general</CardTitle></CardHeader><CardContent className="text-xl font-bold">${Number(data.total_general).toLocaleString()}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Personal</CardTitle></CardHeader><CardContent className="text-xl font-bold">${Number(data.totales_por_tipo?.personal ?? 0).toLocaleString()}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Socios</CardTitle></CardHeader><CardContent className="text-xl font-bold">${Number(data.totales_por_tipo?.socios ?? 0).toLocaleString()}</CardContent></Card>
        </div>
      )}
      <TableSearch placeholder="Buscar registros..." value={search} onChange={handleSearch} />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Nombre</TableHead><TableHead>Código</TableHead><TableHead className="text-right">Saldo</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">{search ? "No se encontraron registros." : "Sin registros."}</TableCell></TableRow>
            ) : paginated.map((item: any) => (
              <TableRow key={`${item.tipo_cartera}-${item.id}`}>
                <TableCell><Badge variant={item.tipo_cartera === "personal" ? "secondary" : "outline"}>{item.tipo_cartera}</Badge></TableCell>
                <TableCell>{item.nombre}</TableCell>
                <TableCell>{item.codigo || "—"}</TableCell>
                <TableCell className="text-right font-semibold">${Number(item.saldo).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      {!loading && <TablePagination page={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} label="registros" />}
    </div>
  );
}
