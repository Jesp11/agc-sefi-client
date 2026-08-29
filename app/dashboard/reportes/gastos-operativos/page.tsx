"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { gastoSearchFields } from "@/lib/table-utils";
import { fmtFecha } from "@/lib/utils";

export default function ReporteGastosOperativosPage() {
  const now = new Date().toISOString().split("T")[0];
  const [fechaInicio, setFechaInicio] = useState(now.slice(0, 8) + "01");
  const [fechaFin, setFechaFin] = useState(now);
  const [categoria, setCategoria] = useState("");
  const [cuenta, setCuenta] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { search, handleSearch, page, setPage } = useTableControls();

  const loadData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (fechaInicio) params.set("fecha_inicio", fechaInicio);
    if (fechaFin) params.set("fecha_fin", fechaFin);
    if (categoria) params.set("categoria", categoria);
    if (cuenta) params.set("cuenta", cuenta);
    const res = await apiFetch(`/reportes/gastos-operativos?${params.toString()}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [fechaInicio, fechaFin, categoria, cuenta]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const registros = data?.registros ?? [];
  const filtered = filterBySearch(registros, search, gastoSearchFields);
  const paginated = paginateItems(filtered, page);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reporte de Gastos Operativos</h1>
        <p className="text-muted-foreground">Consulta por periodo, categoría y cuenta.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <div><Label>Inicio</Label><Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} /></div>
        <div><Label>Fin</Label><Input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} /></div>
        <div>
          <Label>Categoría</Label>
          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">Todas</option>
            {(data?.categorias ?? []).map((item: string) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div>
          <Label>Cuenta</Label>
          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={cuenta} onChange={(e) => setCuenta(e.target.value)}>
            <option value="">Todas</option>
            {(data?.cuentas ?? []).map((item: string) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </div>
      <Card className="p-4 text-lg font-semibold">Total: ${Number(data?.total ?? 0).toLocaleString()}</Card>
      <TableSearch placeholder="Buscar gastos..." value={search} onChange={handleSearch} />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Concepto</TableHead><TableHead>Categoría</TableHead><TableHead>Cuenta</TableHead><TableHead className="text-right">Monto</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">{search ? "No se encontraron gastos." : "Sin gastos."}</TableCell></TableRow>
            ) : paginated.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell>{fmtFecha(item.fecha)}</TableCell>
                <TableCell>{item.concepto}</TableCell>
                <TableCell>{item.categoria || "—"}</TableCell>
                <TableCell>{item.cuenta || "—"}</TableCell>
                <TableCell className="text-right font-semibold">${Number(item.monto).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      {!loading && <TablePagination page={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} label="gastos" />}
    </div>
  );
}
