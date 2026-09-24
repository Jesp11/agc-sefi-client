"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ClipboardCheck, RefreshCw, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

const money = (value: unknown) => `$${Number(value ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const todayLocal = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};
const nextDay = (date: string) => {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + 1);
  return next.toISOString().slice(0, 10);
};

type MovimientoConfirmacion = {
  id: number;
  fecha: string;
  motivo: string;
  categoria?: string | null;
  cuenta?: string | null;
  monto: unknown;
  estado: string;
  puede_reprogramar?: boolean;
  puede_cancelar_total?: boolean;
};

function EstadoMovimiento({ estado }: { estado: string }) {
  if (estado === "Confirmado") return <Badge className="border-emerald-300 bg-emerald-200 text-emerald-900 hover:bg-emerald-200">Entregado al cliente</Badge>;
  if (estado === "EntregadoGestor") return <Badge className="border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-100">Pendiente de gestor</Badge>;
  if (estado === "PendienteReintegro") return <Badge className="border-red-300 bg-red-100 text-red-900 hover:bg-red-100">Pendiente de reintegro</Badge>;
  if (estado === "Reintegrado") return <Badge className="border-sky-300 bg-sky-100 text-sky-900 hover:bg-sky-100">Reintegrado a caja</Badge>;
  if (estado === "Reprogramado") return <Badge className="border-violet-300 bg-violet-100 text-violet-900 hover:bg-violet-100">Reprogramado</Badge>;
  if (estado === "Cancelado") return <Badge variant="outline" className="border-red-300 text-red-800">Cancelado</Badge>;
  return <Badge variant="outline">Pendiente</Badge>;
}

export default function ConfirmacionMovimientosPage() {
  const [movimientos, setMovimientos] = useState<MovimientoConfirmacion[]>([]);
  const [fecha, setFecha] = useState(todayLocal);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [reprogramando, setReprogramando] = useState<MovimientoConfirmacion | null>(null);
  const [fechaReprogramacion, setFechaReprogramacion] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`/confirmaciones-movimientos?fecha=${fecha}`);
      if (!response.ok) throw new Error();
      setMovimientos(await response.json());
    } catch { toast.error("No se pudieron cargar los movimientos de la fecha seleccionada."); }
    finally { setLoading(false); }
  }, [fecha]);
  // La consulta remota se vuelve a ejecutar cuando cambia la fecha seleccionada.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const resolver = async (movimiento: MovimientoConfirmacion, accion: "confirmar" | "cancelar" | "confirmar-reintegro" | "reprogramar-desembolso" | "cancelar-definitivamente", fechaNueva?: string) => {
    if (accion === "cancelar" && !window.confirm(`¿Cancelar el egreso pendiente de ${money(movimiento.monto)}?`)) return;
    if (accion === "confirmar-reintegro" && !window.confirm(`¿Confirmas que recibiste ${money(movimiento.monto)} de vuelta en caja? Se registrará un ingreso de compensación.`)) return;
    if (accion === "reprogramar-desembolso" && !window.confirm(`¿Programar de nuevo el desembolso de ${money(movimiento.monto)} para el ${fechaNueva}? Después debes confirmar la nueva entrega al gestor.`)) return;
    if (accion === "cancelar-definitivamente" && !window.confirm(`¿Cancelar definitivamente esta confirmación de ${money(movimiento.monto)}? El movimiento se cerrará y ya no podrá reprogramarse desde este flujo.`)) return;
    setProcessingId(movimiento.id);
    try {
      const response = await apiFetch(`/confirmaciones-movimientos/${movimiento.id}/${accion}`, {
        method: "POST",
        body: accion === "reprogramar-desembolso" ? JSON.stringify({ fecha: fechaNueva }) : undefined,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) { toast.error(body.message || "No se pudo actualizar el movimiento."); return; }
      toast.success(body.message || "Movimiento actualizado.");
      if (accion === "reprogramar-desembolso" && fechaNueva) setFecha(fechaNueva);
      else await load();
    } catch { toast.error("Error de conexión."); }
    finally { setProcessingId(null); }
  };

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-3xl font-bold">Confirmación de Movimientos</h1><p className="text-muted-foreground">Seguimiento diario de egresos, entregas y reintegros de préstamos y renovaciones.</p></div>
      <div className="flex items-center gap-2"><Input type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} className="w-40" /><Button variant="outline" onClick={load} disabled={loading}><RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />Actualizar</Button></div>
    </div>
    <Card><CardHeader className="flex flex-row items-center gap-3"><ClipboardCheck className="size-6 text-primary" /><div><CardTitle>Movimientos y pendientes</CardTitle><p className="text-sm font-normal text-muted-foreground">Además de la fecha seleccionada, se conservan visibles las renovaciones que siguen pendientes de reintegro o de un nuevo desembolso.</p></div></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Concepto</TableHead><TableHead>Origen</TableHead><TableHead>Cuenta</TableHead><TableHead className="text-right">Monto</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader><TableBody>
      {loading ? <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Cargando...</TableCell></TableRow> : movimientos.length === 0 ? <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No hay movimientos para la fecha seleccionada.</TableCell></TableRow> : movimientos.map((movimiento) => <TableRow key={movimiento.id}><TableCell>{String(movimiento.fecha).slice(0, 10)}</TableCell><TableCell className="font-medium">{movimiento.motivo}</TableCell><TableCell className="text-muted-foreground">{movimiento.categoria || "Egreso"}</TableCell><TableCell>{movimiento.cuenta || "—"}</TableCell><TableCell className="text-right font-bold text-red-600">{money(movimiento.monto)}</TableCell><TableCell><EstadoMovimiento estado={movimiento.estado} /></TableCell><TableCell className="text-right">{movimiento.estado === "Pendiente" ? <div className="flex justify-end gap-2"><Button size="sm" onClick={() => resolver(movimiento, "confirmar")} disabled={processingId === movimiento.id}><Check className="mr-1 size-4" />{["renovacion", "desembolso"].includes(String(movimiento.categoria).toLowerCase()) ? "Entregar" : "Confirmar"}</Button><Button size="sm" variant="outline" onClick={() => resolver(movimiento, "cancelar")} disabled={processingId === movimiento.id}><X className="mr-1 size-4" />Cancelar</Button></div> : movimiento.estado === "PendienteReintegro" ? <Button size="sm" onClick={() => resolver(movimiento, "confirmar-reintegro")} disabled={processingId === movimiento.id}><Check className="mr-1 size-4" />Reintegrar</Button> : movimiento.estado === "Reintegrado" && movimiento.puede_reprogramar ? <div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => { setFechaReprogramacion(nextDay(fecha)); setReprogramando(movimiento); }} disabled={processingId === movimiento.id}>Reprogramar</Button>{movimiento.puede_cancelar_total && <Button size="sm" variant="destructive" onClick={() => resolver(movimiento, "cancelar-definitivamente")} disabled={processingId === movimiento.id}><X className="mr-1 size-4" />Cancelar</Button>}</div> : <span className="text-xs text-muted-foreground">Sin acciones pendientes</span>}</TableCell></TableRow>)}
    </TableBody></Table></CardContent></Card>
    <Dialog open={Boolean(reprogramando)} onOpenChange={(open) => { if (!open) setReprogramando(null); }}><DialogContent><DialogHeader><DialogTitle>Programar nuevo desembolso</DialogTitle><DialogDescription>Selecciona una fecha distinta a la cancelación para crear el nuevo intento de entrega.</DialogDescription></DialogHeader><Input type="date" value={fechaReprogramacion} min={nextDay(fecha)} onChange={(event) => setFechaReprogramacion(event.target.value)} /><DialogFooter><Button variant="outline" onClick={() => setReprogramando(null)}>Cancelar</Button><Button disabled={!fechaReprogramacion || !reprogramando} onClick={() => { if (!reprogramando) return; const movimiento = reprogramando; setReprogramando(null); resolver(movimiento, "reprogramar-desembolso", fechaReprogramacion); }}>Programar</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
