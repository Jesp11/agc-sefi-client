"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { fetchAllPages } from "@/lib/table-utils";
import { fmtFecha } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const diaSearchFields = (d: any) => [d.fecha, fmtFecha(d.fecha), d.total_abonos, d.monto_colocado, d.creditos_otorgados];

export default function ReporteSemanalPage() {
  const [semanaInicio, setSemanaInicio] = useState("");
  const [asesores, setAsesores] = useState<any[]>([]);
  const [idAsesor, setIdAsesor] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { search, handleSearch, page, setPage } = useTableControls();

  const loadData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (semanaInicio) params.set("semana_inicio", semanaInicio);
    if (idAsesor) params.set("id_asesor", idAsesor);
    apiFetch(`/reportes/${idAsesor ? "gestor/semanal" : "semanal"}?${params.toString()}`).then(async (res) => {
      if (res.ok) setData(await res.json());
      setLoading(false);
    });
  }, [semanaInicio, idAsesor]);

  useEffect(() => {
    fetchAllPages("/asesores").then(setAsesores).catch(() => setAsesores([]));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <div className="p-8">Cargando...</div>;
  if (!data) return <div className="p-8">Error al cargar datos.</div>;

  const dias = data.dias || [];
  const filtered = filterBySearch(dias, search, diaSearchFields);
  const paginated = paginateItems(filtered, page);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Reporte Semanal</h1>
          <p className="text-muted-foreground">{fmtFecha(data.semana_inicio)} — {fmtFecha(data.semana_fin)} (Lun–Sáb)</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Semana base</Label>
            <Input type="date" value={semanaInicio} onChange={(e) => setSemanaInicio(e.target.value)} className="w-40" />
          </div>
          <div>
            <Label>Gestor</Label>
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={idAsesor} onChange={(e) => setIdAsesor(e.target.value)}>
              <option value="">Global</option>
              {asesores.map((a) => <option key={a.id} value={a.id}>{a.nombre_asesor}</option>)}
            </select>
          </div>
        </div>
      </div>
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
