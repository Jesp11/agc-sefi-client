"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ReporteAhorrosPersonalPage() {
  const [data, setData] = useState<any>(null);
  const [anio, setAnio] = useState(new Date().getFullYear());

  useEffect(() => {
    apiFetch(`/reportes/ahorros-personal?anio=${anio}`).then(async (res) => {
      if (res.ok) setData(await res.json());
    });
  }, [anio]);

  if (!data) return <div className="p-8">Cargando...</div>;

  const fmt = (n: number) => (n === 0 ? "—" : `$${Number(n).toLocaleString()}`);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-3xl font-bold">Reporte Ahorro Personal</h1>
        <div className="flex items-center gap-2">
          <Label htmlFor="anio-reporte">Año</Label>
          <Input id="anio-reporte" type="number" className="w-24" value={anio} onChange={(e) => setAnio(parseInt(e.target.value) || new Date().getFullYear())} />
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Total Fondos</CardTitle></CardHeader>
        <CardContent className="text-3xl font-bold">${Number(data.total_saldo).toLocaleString()}</CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Resumen Anual {anio}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asesor</TableHead>
                <TableHead>ID</TableHead>
                {(data.meses || []).map((m: string) => (
                  <TableHead key={m} className="text-right text-xs">{m}/{String(anio).slice(2)}</TableHead>
                ))}
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data.asesores || []).map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium whitespace-nowrap">{a.nombre}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{a.codigo}</TableCell>
                  {(data.meses || []).map((m: string) => (
                    <TableCell key={m} className="text-right text-sm">{fmt(a.meses[m])}</TableCell>
                  ))}
                  <TableCell className="text-right font-semibold">{fmt(a.total_anio)}</TableCell>
                  <TableCell className="text-right font-semibold">${Number(a.saldo).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={2}>TOTALES</TableCell>
                {(data.meses || []).map((m: string) => (
                  <TableCell key={m} className="text-right text-sm">{fmt(data.totales_mes[m])}</TableCell>
                ))}
                <TableCell className="text-right">{fmt(data.total_general)}</TableCell>
                <TableCell className="text-right">${Number(data.total_saldo).toLocaleString()}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
