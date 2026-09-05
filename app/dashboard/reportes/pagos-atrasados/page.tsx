"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { canViewAllPagosAtrasados } from "@/lib/authz";
import { exportWorkbook } from "@/lib/report-export";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileSpreadsheet, Search } from "lucide-react";
import { toast } from "sonner";

type Cuota = {
  fecha_vencimiento: string;
  dias_atraso: number;
  folio: number;
  cliente_grupo: string;
  tipo_credito: string;
  cuota: number;
  importe_programado: number;
  importe_pendiente: number;
};

type Asesor = {
  id_asesor: number | null;
  nombre_asesor: string;
  codigo_asesor?: string | null;
  resumen: { creditos: number; cuotas_atrasadas: number; importe_pendiente: number };
  cuotas: Cuota[];
};

type Reporte = {
  fecha_inicio: string;
  fecha_fin: string;
  resumen: { creditos: number; cuotas_atrasadas: number; importe_pendiente: number };
  por_asesor: Asesor[];
};

const toLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const money = (value: number) => `$${Number(value || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PagosAtrasadosPage() {
  const { user } = useAuth();
  const vistaCompleta = canViewAllPagosAtrasados(user?.role?.nombre);
  const today = new Date();
  const [fechaInicio, setFechaInicio] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return toLocalDate(date);
  });
  const [fechaFin, setFechaFin] = useState(() => toLocalDate(today));
  const [idAsesor, setIdAsesor] = useState("");
  const [asesores, setAsesores] = useState<Array<{ id: number; nombre_asesor: string }>>([]);
  const [data, setData] = useState<Reporte | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!fechaInicio || !fechaFin) return;
    setLoading(true);
    const params = new URLSearchParams({ fecha_inicio: fechaInicio, fecha_fin: fechaFin });
    if (vistaCompleta && idAsesor) params.set("id_asesor", idAsesor);

    try {
      const response = await apiFetch(`/reportes/pagos-atrasados?${params.toString()}`);
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || "No se pudo cargar el reporte");
      }
      setData(await response.json());
    } catch (error) {
      setData(null);
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el reporte");
    } finally {
      setLoading(false);
    }
  }, [fechaInicio, fechaFin, idAsesor, vistaCompleta]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  useEffect(() => {
    if (!vistaCompleta) return;
    apiFetch("/asesores?per_page=200")
      .then(async (response) => response.ok ? response.json() : [])
      .then((body) => setAsesores(body.data ?? body ?? []))
      .catch(() => setAsesores([]));
  }, [vistaCompleta]);

  const exportar = () => {
    if (!data) return;
    const resumen = [
      { Concepto: "Periodo", Valor: `${data.fecha_inicio} al ${data.fecha_fin}` },
      { Concepto: "Créditos con atraso", Valor: data.resumen.creditos },
      { Concepto: "Cuotas atrasadas", Valor: data.resumen.cuotas_atrasadas },
      { Concepto: "Importe pendiente", Valor: data.resumen.importe_pendiente },
      ...data.por_asesor.map((asesor) => ({
        Concepto: `Subtotal — ${asesor.nombre_asesor}`,
        Valor: `${asesor.resumen.creditos} crédito(s), ${asesor.resumen.cuotas_atrasadas} cuota(s), ${money(asesor.resumen.importe_pendiente)}`,
      })),
    ];
    const sheets: Array<{ name: string; rows: Record<string, unknown>[] }> = [
      { name: "Resumen", rows: resumen },
      ...data.por_asesor.map((asesor) => ({
        name: `${asesor.nombre_asesor.replace(/[\\/?*\[\]:]/g, " ").trim() || "Sin asesor"} ${asesor.id_asesor ?? ""}`,
        rows: [
          ...asesor.cuotas.map((cuota) => ({
            "Fecha vencimiento": cuota.fecha_vencimiento,
            "Días atraso": cuota.dias_atraso,
            Folio: cuota.folio,
            "Cliente / Grupo": cuota.cliente_grupo,
            "Tipo crédito": cuota.tipo_credito,
            Cuota: cuota.cuota,
            "Importe programado": cuota.importe_programado,
            "Importe pendiente": cuota.importe_pendiente,
          })),
          {
            "Fecha vencimiento": "SUBTOTAL",
            "Días atraso": "",
            Folio: "",
            "Cliente / Grupo": `${asesor.resumen.creditos} crédito(s) · ${asesor.resumen.cuotas_atrasadas} cuota(s)`,
            "Tipo crédito": "",
            Cuota: "",
            "Importe programado": "",
            "Importe pendiente": asesor.resumen.importe_pendiente,
          },
        ],
      })),
    ];
    exportWorkbook(sheets, `pagos_atrasados_${data.fecha_inicio}_${data.fecha_fin}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Pagos atrasados</h1>
          <p className="mt-1 text-muted-foreground">Cuotas vencidas que continúan pendientes, agrupadas por asesor.</p>
        </div>
        <Button variant="outline" onClick={exportar} disabled={!data || loading}>
          <FileSpreadsheet className="mr-2 size-4" /> Exportar Excel
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-3 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-1"><Label htmlFor="atrasados-inicio">Desde</Label><Input id="atrasados-inicio" type="date" value={fechaInicio} onChange={(event) => setFechaInicio(event.target.value)} /></div>
          <div className="grid gap-1"><Label htmlFor="atrasados-fin">Hasta</Label><Input id="atrasados-fin" type="date" value={fechaFin} onChange={(event) => setFechaFin(event.target.value)} /></div>
          {vistaCompleta && <div className="grid gap-1"><Label htmlFor="atrasados-asesor">Asesor</Label><select id="atrasados-asesor" className="h-9 rounded-md border bg-background px-3 text-sm" value={idAsesor} onChange={(event) => setIdAsesor(event.target.value)}><option value="">Todos</option>{asesores.map((asesor) => <option key={asesor.id} value={asesor.id}>{asesor.nombre_asesor}</option>)}</select></div>}
          <div className="flex items-end"><Button onClick={load} className="w-full" disabled={loading || !fechaInicio || !fechaFin}><Search className="mr-2 size-4" /> Consultar</Button></div>
        </CardContent>
      </Card>

      {data && <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-sm">Créditos con atraso</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{data.resumen.creditos}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Cuotas atrasadas</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{data.resumen.cuotas_atrasadas}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Importe pendiente</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{money(data.resumen.importe_pendiente)}</CardContent></Card>
      </div>}

      {loading ? <p className="py-12 text-center text-muted-foreground">Cargando pagos atrasados...</p> : data?.por_asesor.length === 0 ? <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">No hay cuotas vencidas pendientes en el rango seleccionado.</div> : data?.por_asesor.map((asesor) => (
        <Card key={asesor.id_asesor ?? asesor.nombre_asesor} className="overflow-hidden">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 bg-muted/30 py-4">
            <div><CardTitle className="text-lg">{asesor.nombre_asesor}</CardTitle><p className="text-sm text-muted-foreground">{asesor.resumen.creditos} crédito(s) · {asesor.resumen.cuotas_atrasadas} cuota(s) atrasada(s)</p></div>
            <div className="text-right text-lg font-bold">{money(asesor.resumen.importe_pendiente)}</div>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Vencimiento</TableHead><TableHead className="text-right">Días atraso</TableHead><TableHead>Folio</TableHead><TableHead>Cliente / Grupo</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">Cuota</TableHead><TableHead className="text-right">Programado</TableHead><TableHead className="text-right">Pendiente</TableHead></TableRow></TableHeader>
              <TableBody>{asesor.cuotas.map((cuota) => <TableRow key={`${cuota.folio}-${cuota.cuota}`}><TableCell>{cuota.fecha_vencimiento}</TableCell><TableCell className="text-right">{cuota.dias_atraso}</TableCell><TableCell className="font-mono text-xs">#{cuota.folio}</TableCell><TableCell className="font-medium">{cuota.cliente_grupo}</TableCell><TableCell>{cuota.tipo_credito}</TableCell><TableCell className="text-right">{cuota.cuota}</TableCell><TableCell className="text-right">{money(cuota.importe_programado)}</TableCell><TableCell className="text-right font-medium">{money(cuota.importe_pendiente)}</TableCell></TableRow>)}</TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
