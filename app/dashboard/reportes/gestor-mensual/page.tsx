"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchAllPages } from "@/lib/table-utils";

export default function ReporteGestorMensualPage() {
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [asesores, setAsesores] = useState<any[]>([]);
  const [idAsesor, setIdAsesor] = useState("");
  const [data, setData] = useState<any>(null);

  const loadData = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("mes", `${mes}-01`);
    if (idAsesor) params.set("id_asesor", idAsesor);
    const res = await apiFetch(`/reportes/gestor/mensual?${params.toString()}`);
    if (res.ok) setData(await res.json());
  }, [mes, idAsesor]);

  useEffect(() => {
    fetchAllPages("/asesores").then(setAsesores).catch(() => setAsesores([]));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reporte Mensual por Gestor</h1>
        <p className="text-muted-foreground">Corte mensual diario de cobranza y colocación.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div><Label>Mes</Label><Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} /></div>
        <div>
          <Label>Gestor</Label>
          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={idAsesor} onChange={(e) => setIdAsesor(e.target.value)}>
            <option value="">Todos</option>
            {asesores.map((a) => <option key={a.id} value={a.id}>{a.nombre_asesor}</option>)}
          </select>
        </div>
      </div>
      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card><CardHeader><CardTitle className="text-sm">Abonos</CardTitle></CardHeader><CardContent className="text-xl font-bold">${Number(data.total_abonos).toLocaleString()}</CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Multas</CardTitle></CardHeader><CardContent className="text-xl font-bold">${Number(data.total_multas).toLocaleString()}</CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Recibido</CardTitle></CardHeader><CardContent className="text-xl font-bold">${Number(data.total_recibido).toLocaleString()}</CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Colocación</CardTitle></CardHeader><CardContent className="text-xl font-bold">${Number(data.monto_colocado).toLocaleString()}</CardContent></Card>
          </div>
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>Gestor</TableHead><TableHead>Abonos</TableHead><TableHead>Multas</TableHead><TableHead>Recibido</TableHead><TableHead>Créditos</TableHead><TableHead>Colocación</TableHead></TableRow></TableHeader>
              <TableBody>
                {(data.por_gestor ?? []).length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Sin movimientos.</TableCell></TableRow>
                ) : (data.por_gestor ?? []).map((item: any) => (
                  <TableRow key={item.id_asesor ?? item.nombre_asesor}>
                    <TableCell>{item.nombre_asesor}</TableCell>
                    <TableCell>${Number(item.abonos).toLocaleString()}</TableCell>
                    <TableCell>${Number(item.multas).toLocaleString()}</TableCell>
                    <TableCell>${Number(item.monto_recibido).toLocaleString()}</TableCell>
                    <TableCell>{item.creditos_otorgados}</TableCell>
                    <TableCell>${Number(item.monto_colocado).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
