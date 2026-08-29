"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Printer } from "lucide-react";
import { exportWorkbook, printReportHtml } from "@/lib/report-export";

const fmt = (value: unknown) =>
  `$${Number(value ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ReporteCierreMensualPage() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [mes, setMes] = useState(currentMonth);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch(`/reportes/cierre-mensual?mes=${mes}`);
    if (res.ok) {
      setData(await res.json());
    }
    setLoading(false);
  }, [mes]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading && !data) return <div className="p-8">Cargando...</div>;
  if (!data) return <div className="p-8">No se pudo cargar el cierre mensual.</div>;

  const fuentes = data.fondeo?.fuentes ?? [];
  const handleExport = () => {
    setIsExporting(true);
    try {
      exportWorkbook([
        {
          name: "Resumen",
          rows: [{
            Mes: data.mes,
            "Saldo inicial": Number(data.flujo?.saldo_inicial_mes ?? 0),
            Ingresos: Number(data.flujo?.total_ingresos ?? 0),
            Egresos: Number(data.flujo?.total_egresos ?? 0),
            Disponible: Number(data.flujo?.disponible ?? 0),
            "Gastos operativos": Number(data.flujo?.gastos_operativos ?? 0),
            "Cartera total": Number(data.cartera?.total_saldo ?? 0),
            "Capital total": Number(data.fondeo?.capital_total ?? 0),
          }],
        },
        {
          name: "Cartera",
          rows: [
            { Tipo: "Individual", Creditos: data.cartera?.individual?.creditos ?? 0, Colocado: Number(data.cartera?.individual?.monto_otorgado ?? 0), Saldo: Number(data.cartera?.individual?.saldo_total ?? 0) },
            { Tipo: "Grupal", Creditos: data.cartera?.grupal?.creditos ?? 0, Colocado: Number(data.cartera?.grupal?.monto_otorgado ?? 0), Saldo: Number(data.cartera?.grupal?.saldo_total ?? 0) },
            { Tipo: "Adeudos", Creditos: data.cartera?.adeudos?.creditos ?? 0, Colocado: Number(data.cartera?.adeudos?.monto_otorgado ?? 0), Saldo: Number(data.cartera?.adeudos?.saldo_total ?? 0) },
          ],
        },
        {
          name: "Fondeo",
          rows: fuentes.map((fuente: any) => ({
            Fuente: fuente.nombre,
            Tipo: fuente.tipo_entidad,
            Origen: fuente.origen_fondeo || "",
            Capital: Number(fuente.saldo_capital ?? 0),
            "Aportaciones mes": Number(fuente.aportaciones_mes ?? 0),
            "Retiros mes": Number(fuente.retiros_mes ?? 0),
          })),
        },
      ], `cierre_mensual_${mes}.xlsx`);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    printReportHtml(`Cierre Mensual ${mes}`, [
      {
        title: "Flujo",
        rows: [
          ["Saldo inicial", fmt(data.flujo?.saldo_inicial_mes)],
          ["Ingresos", fmt(data.flujo?.total_ingresos)],
          ["Egresos", fmt(data.flujo?.total_egresos)],
          ["Disponible", fmt(data.flujo?.disponible)],
          ["Gastos operativos", fmt(data.flujo?.gastos_operativos)],
        ],
      },
      {
        title: "Cartera",
        rows: [
          ["Individual", fmt(data.cartera?.individual?.saldo_total)],
          ["Grupal", fmt(data.cartera?.grupal?.saldo_total)],
          ["Adeudos", fmt(data.cartera?.adeudos?.saldo_total)],
          ["Total cartera", fmt(data.cartera?.total_saldo)],
        ],
      },
      {
        title: "Fondeo",
        rows: [
          ["Fuentes activas", String(data.fondeo?.total_fuentes ?? 0)],
          ["Capital total", fmt(data.fondeo?.capital_total)],
          ["Capital externo", fmt(data.fondeo?.capital_externo)],
          ["Aportaciones del mes", fmt(data.fondeo?.aportaciones_mes)],
        ],
      },
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Cierre Mensual</h1>
          <p className="text-muted-foreground">Concentrado operativo, cartera y fondeo del mes consultado.</p>
        </div>
        <div className="flex w-full max-w-xl items-end gap-2">
          <div className="flex-1">
            <Label>Mes de corte</Label>
            <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
          </div>
          <Button variant="outline" onClick={handleExport} disabled={isExporting || loading}>
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "Exportando..." : "Exportar"}
          </Button>
          <Button variant="outline" onClick={handlePrint} disabled={loading}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Saldo inicial</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{fmt(data.flujo?.saldo_inicial_mes)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Ingresos</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-green-600">{fmt(data.flujo?.total_ingresos)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Egresos</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-red-600">{fmt(data.flujo?.total_egresos)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Disponible</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{fmt(data.flujo?.disponible)}</CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Cartera Individual</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Créditos</span><span className="font-semibold">{data.cartera?.individual?.creditos ?? 0}</span></div>
            <div className="flex justify-between"><span>Colocado</span><span className="font-semibold">{fmt(data.cartera?.individual?.monto_otorgado)}</span></div>
            <div className="flex justify-between"><span>Saldo</span><span className="font-semibold">{fmt(data.cartera?.individual?.saldo_total)}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Cartera Grupal</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Créditos</span><span className="font-semibold">{data.cartera?.grupal?.creditos ?? 0}</span></div>
            <div className="flex justify-between"><span>Colocado</span><span className="font-semibold">{fmt(data.cartera?.grupal?.monto_otorgado)}</span></div>
            <div className="flex justify-between"><span>Saldo</span><span className="font-semibold">{fmt(data.cartera?.grupal?.saldo_total)}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Adeudos y Mora</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Créditos</span><span className="font-semibold">{data.cartera?.adeudos?.creditos ?? 0}</span></div>
            <div className="flex justify-between"><span>Colocado</span><span className="font-semibold">{fmt(data.cartera?.adeudos?.monto_otorgado)}</span></div>
            <div className="flex justify-between"><span>Saldo</span><span className="font-semibold">{fmt(data.cartera?.adeudos?.saldo_total)}</span></div>
          </CardContent>
        </Card>
      </div>

      <Card className="p-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div><p className="text-sm text-muted-foreground">Fuentes activas</p><p className="text-2xl font-bold">{data.fondeo?.total_fuentes ?? 0}</p></div>
          <div><p className="text-sm text-muted-foreground">Capital total</p><p className="text-2xl font-bold">{fmt(data.fondeo?.capital_total)}</p></div>
          <div><p className="text-sm text-muted-foreground">Capital externo</p><p className="text-2xl font-bold">{fmt(data.fondeo?.capital_externo)}</p></div>
          <div><p className="text-sm text-muted-foreground">Aportaciones del mes</p><p className="text-2xl font-bold">{fmt(data.fondeo?.aportaciones_mes)}</p></div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fuente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead className="text-right">Capital</TableHead>
              <TableHead className="text-right">Aportaciones mes</TableHead>
              <TableHead className="text-right">Retiros mes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fuentes.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Sin fuentes de fondeo registradas.</TableCell></TableRow>
            ) : fuentes.map((fuente: any) => (
              <TableRow key={fuente.id}>
                <TableCell className="font-medium">{fuente.nombre}</TableCell>
                <TableCell>{fuente.tipo_entidad}</TableCell>
                <TableCell>{fuente.origen_fondeo || "—"}</TableCell>
                <TableCell className="text-right font-semibold">{fmt(fuente.saldo_capital)}</TableCell>
                <TableCell className="text-right">{fmt(fuente.aportaciones_mes)}</TableCell>
                <TableCell className="text-right">{fmt(fuente.retiros_mes)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
