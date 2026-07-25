"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { fmtFecha } from "@/lib/utils";

const diaSearchFields = (d: any) => [d.fecha, fmtFecha(d.fecha), d.total_abonos, d.monto_colocado, d.creditos_otorgados];

export default function ReporteSemanalPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { search, handleSearch, page, setPage } = useTableControls();

  useEffect(() => {
    setLoading(true);
    apiFetch("/reportes/semanal").then(async (res) => {
      if (res.ok) setData(await res.json());
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8">Cargando...</div>;
  if (!data) return <div className="p-8">Error al cargar datos.</div>;

  const dias = data.dias || [];
  const filtered = filterBySearch(dias, search, diaSearchFields);
  const paginated = paginateItems(filtered, page);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Reporte Global Semanal</h1>
      <p className="text-muted-foreground">{fmtFecha(data.semana_inicio)} — {fmtFecha(data.semana_fin)} (Lun–Sáb)</p>
      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle className="text-sm">Total Abonos</CardTitle></CardHeader><CardContent className="text-xl font-bold">${Number(data.totales.abonos).toLocaleString()}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Préstamos nuevos (monto)</CardTitle></CardHeader><CardContent className="text-xl font-bold">${Number(data.totales.colocacion).toLocaleString()}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Créditos Nuevos</CardTitle></CardHeader><CardContent className="text-xl font-bold">{data.totales.creditos}</CardContent></Card>
      </div>
      <Card className="p-6 space-y-4">
        <TableSearch placeholder="Buscar por día..." value={search} onChange={handleSearch} />
        <Table>
          <TableHeader><TableRow><TableHead>Día</TableHead><TableHead>Abonos</TableHead><TableHead>Préstamos nuevos</TableHead><TableHead>Créditos</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">{search ? "No se encontraron días." : "Sin datos."}</TableCell></TableRow>
            ) : paginated.map((d: any) => (
              <TableRow key={d.fecha}>
                <TableCell>{fmtFecha(d.fecha)}</TableCell>
                <TableCell>${Number(d.total_abonos).toLocaleString()}</TableCell>
                <TableCell>${Number(d.monto_colocado).toLocaleString()}</TableCell>
                <TableCell>{d.creditos_otorgados}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination page={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} label="días" />
      </Card>
    </div>
  );
}
