"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { isAdminRoleName } from "@/lib/authz";
import { AgendarRenovacionDialog } from "@/components/agendar-renovacion-dialog";
import { ImportarRenovacionesHistoricasDialog } from "@/components/importar-renovaciones-historicas-dialog";
import { RefinanciarCreditoDialog } from "@/components/refinanciar-credito-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtFecha } from "@/lib/utils";
import { CalendarClock, PlusCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

type AgendaItem = {
  num_prog: number;
  tipo_credito?: string | null;
  cliente?: { nombre_completo?: string | null } | null;
  grupo?: { nombre_grupo?: string | null } | null;
  asesor?: { id?: number; nombre_asesor?: string | null } | null;
  fecha_programada_renovacion: string;
  renovacion_autorizada?: string | null;
  renovacion_tasa?: string | null;
  pagos_pendientes: number;
  saldo_actual: number;
  cuota: number;
  tasa_asignada?: string | null;
  dias_pago?: string | null;
  comision_apertura?: number | string | null;
};

const money = (value: number) => `$${Number(value || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

export default function AgendaRenovacionesPage() {
  const { user } = useAuth();
  const isAdmin = isAdminRoleName(user?.role?.nombre);
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [asesores, setAsesores] = useState<Array<{ id: number; nombre_asesor: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [asesor, setAsesor] = useState("");
  const [autorizacion, setAutorizacion] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (fechaInicio) params.set("fecha_inicio", fechaInicio);
    if (fechaFin) params.set("fecha_fin", fechaFin);
    if (asesor) params.set("id_asesor", asesor);
    if (autorizacion) params.set("autorizacion", autorizacion);
    try {
      const res = await apiFetch(`/reportes/renovaciones-agendadas?${params.toString()}`);
      if (!res.ok) throw new Error();
      setItems(await res.json());
    } catch {
      toast.error("No se pudo cargar la agenda de renovaciones");
    } finally {
      setLoading(false);
    }
  }, [fechaInicio, fechaFin, asesor, autorizacion]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    apiFetch("/asesores?per_page=200").then(async (res) => {
      if (!res.ok) return;
      const body = await res.json();
      setAsesores(body.data ?? body ?? []);
    }).catch(() => undefined);
  }, []);

  const grupos = useMemo(() => {
    return items.reduce<Record<string, AgendaItem[]>>((acc, item) => {
      const date = String(item.fecha_programada_renovacion).split("T")[0];
      (acc[date] ||= []).push(item);
      return acc;
    }, {});
  }, [items]);

  const cancelar = async (item: AgendaItem) => {
    if (!window.confirm(`¿Cancelar la agenda de renovación del crédito #${item.num_prog}?`)) return;
    try {
      const res = await apiFetch(`/reportes/asesor/por-cerrar/${item.num_prog}`, {
        method: "PATCH",
        body: JSON.stringify({
          fecha_programada_renovacion: null,
          renovacion_autorizada: "Pendiente",
          renovacion_tasa: null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Agenda cancelada");
      load();
    } catch {
      toast.error("No se pudo cancelar la agenda");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Agenda de Renovaciones</h1>
          <p className="mt-1 text-muted-foreground">Renovaciones programadas, agrupadas por fecha. Agendar no modifica la ruta ni la caja.</p>
        </div>
        {isAdmin && <ImportarRenovacionesHistoricasDialog />}
      </div>

      <Card>
        <CardContent className="grid gap-3 pt-6 sm:grid-cols-2 lg:grid-cols-5">
          <div className="grid gap-1"><Label>Desde</Label><Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} /></div>
          <div className="grid gap-1"><Label>Hasta</Label><Input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} /></div>
          <div className="grid gap-1"><Label>Gestor</Label><select className="h-9 rounded-md border bg-background px-3 text-sm" value={asesor} onChange={(e) => setAsesor(e.target.value)}><option value="">Todos</option>{asesores.map((a) => <option key={a.id} value={a.id}>{a.nombre_asesor}</option>)}</select></div>
          <div className="grid gap-1"><Label>Autorización</Label><select className="h-9 rounded-md border bg-background px-3 text-sm" value={autorizacion} onChange={(e) => setAutorizacion(e.target.value)}><option value="">Todas</option><option>Pendiente</option><option>Autorizado</option><option>No Autorizado</option></select></div>
          <div className="flex items-end"><Button variant="outline" onClick={() => { setFechaInicio(""); setFechaFin(""); setAsesor(""); setAutorizacion(""); }} className="w-full">Limpiar filtros</Button></div>
        </CardContent>
      </Card>

      {loading ? <p className="py-12 text-center text-muted-foreground">Cargando agenda...</p> : Object.keys(grupos).length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">No hay renovaciones programadas con estos filtros.</div>
      ) : Object.entries(grupos).map(([fecha, registros]) => (
        <Card key={fecha} className="overflow-hidden">
          <CardHeader className="flex flex-row items-center gap-2 bg-muted/30 py-4"><CalendarClock className="size-5 text-primary" /><CardTitle className="text-lg">{fmtFecha(fecha)} <span className="ml-2 text-sm font-normal text-muted-foreground">{registros.length} programada(s)</span></CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Cliente / Grupo</TableHead><TableHead>Crédito</TableHead><TableHead className="text-right">Pagos pend.</TableHead><TableHead className="text-right">Saldo pend.</TableHead><TableHead className="text-right">Cuota</TableHead><TableHead>Gestor</TableHead><TableHead>Autorización / tasa</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
              <TableBody>{registros.map((item) => {
                const nombre = item.tipo_credito === "Grupal" ? item.grupo?.nombre_grupo : item.cliente?.nombre_completo;
                return <TableRow key={item.num_prog}>
                  <TableCell className="font-medium">{nombre || "Sin nombre"}</TableCell>
                  <TableCell className="font-mono text-xs">#{item.num_prog}</TableCell>
                  <TableCell className="text-right">{item.pagos_pendientes}</TableCell>
                  <TableCell className="text-right">{money(item.saldo_actual)}</TableCell>
                  <TableCell className="text-right">{money(item.cuota)}</TableCell>
                  <TableCell>{item.asesor?.nombre_asesor || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{item.renovacion_autorizada || "Pendiente"}</Badge><span className="ml-2 text-xs text-muted-foreground">{item.renovacion_tasa || "Sin tasa"}</span></TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-2">
                    <AgendarRenovacionDialog numProg={item.num_prog} fecha={item.fecha_programada_renovacion} autorizacion={item.renovacion_autorizada} tasa={item.renovacion_tasa} onSaved={load} trigger={<Button size="sm" variant="outline">Reprogramar</Button>} />
                    {isAdmin && <RefinanciarCreditoDialog numProg={item.num_prog} saldoActual={item.saldo_actual} tipoCredito={item.tipo_credito} tasaAsignada={item.renovacion_tasa || item.tasa_asignada} diasPago={item.dias_pago} comisionApertura={item.comision_apertura} fechaEfectivaInicial={item.fecha_programada_renovacion} onSuccess={load} trigger={<Button size="sm"><PlusCircle className="mr-1 size-3.5" />Crear renovación</Button>} />}
                    <Button size="icon" variant="ghost" className="size-8 text-destructive" onClick={() => cancelar(item)} title="Cancelar agenda"><Trash2 className="size-4" /></Button>
                  </div></TableCell>
                </TableRow>;
              })}</TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
