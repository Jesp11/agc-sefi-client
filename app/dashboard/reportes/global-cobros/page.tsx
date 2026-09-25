"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { isFieldRoleName } from "@/lib/authz";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Totales = { abonos: number; multas: number; total_cobrado: number };
type Asesor = { id: number; nombre_asesor: string };
type Dia = {
  fecha: string;
  totales: Totales;
  por_asesor: (Totales & { id_asesor: number | null; nombre_asesor: string })[];
};
type Semana = Omit<Dia, "fecha"> & { numero: number; inicio: string; fin: string };
type Reporte = { periodo: "semana" | "mes"; inicio: string; fin: string; fecha_base: string; totales: Totales; dias: Dia[]; semanas: Semana[] };
const fechaCorta = (fecha: string) => new Date(`${fecha}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
const dinero = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const fechaLarga = (fecha: string) => new Date(`${fecha}T12:00:00`).toLocaleDateString("es-MX", {
  weekday: "long", day: "numeric", month: "long", year: "numeric",
});
const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring";

export default function GlobalCobrosPage() {
  const { user } = useAuth();
  const esAsesor = isFieldRoleName(user?.role?.nombre);
  const [periodo, setPeriodo] = useState<"semana" | "mes">("semana");
  // An omitted initial date lets the API use the application's timezone.
  const [fecha, setFecha] = useState("");
  const [idAsesor, setIdAsesor] = useState("");
  const [asesores, setAsesores] = useState<Asesor[]>([]);
  const [errorAsesores, setErrorAsesores] = useState(false);
  const [data, setData] = useState<Reporte | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!user || esAsesor) return;
    const controller = new AbortController();
    async function loadAsesores() {
      setErrorAsesores(false);
      try {
        const rows: Asesor[] = [];
        let lastPage = 1;
        for (let page = 1; page <= lastPage; page++) {
          const res = await apiFetch(`/asesores?per_page=100&page=${page}`, { signal: controller.signal });
          if (!res.ok) throw new Error();
          const result = await res.json();
          rows.push(...(Array.isArray(result) ? result : result.data ?? []));
          lastPage = result.meta?.last_page ?? result.last_page ?? 1;
        }
        if (!controller.signal.aborted) setAsesores(rows);
      } catch {
        if (!controller.signal.aborted) setErrorAsesores(true);
      }
    }
    void loadAsesores();
    return () => controller.abort();
  }, [user, esAsesor, intento]);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    async function loadReporte() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ periodo });
        if (fecha) params.set("fecha", fecha);
        if (idAsesor && !esAsesor) params.set("id_asesor", idAsesor);
        const res = await apiFetch(`/reportes/global-cobros?${params}`, { signal: controller.signal });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.message ?? "No se pudo cargar el reporte.");
        }
        const result: Reporte = await res.json();
        if (!controller.signal.aborted) setData(result);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "No se pudo cargar el reporte.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadReporte();
    return () => controller.abort();
  }, [user, periodo, fecha, idAsesor, esAsesor, intento]);

  const bloques = data?.periodo === "mes"
    ? data.semanas.map((semana) => ({ ...semana, clave: semana.inicio, titulo: `Semana ${semana.numero}: ${fechaCorta(semana.inicio)} — ${fechaCorta(semana.fin)}` }))
    : (data?.dias ?? []).map((dia) => ({ ...dia, clave: dia.fecha, titulo: fechaLarga(dia.fecha) }));
  const fechaSeleccionada = fecha || data?.fecha_base || "";
  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Reporte Global Cobros</h1>
        <p className="text-muted-foreground">{periodo === "mes" ? "Cobros del mes por semana y asesor." : "Cobros de la semana por día y asesor."}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="periodo-cobros">Período</Label>
          <select id="periodo-cobros" className={selectClass} value={periodo} onChange={(e) => setPeriodo(e.target.value as "semana" | "mes")}>
            <option value="semana">Semanal</option><option value="mes">Mensual</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="fecha-cobros">{periodo === "semana" ? "Semana de la fecha" : "Mes"}</Label>
          <Input id="fecha-cobros" type={periodo === "semana" ? "date" : "month"}
            value={periodo === "semana" ? fechaSeleccionada : fechaSeleccionada.slice(0, 7)}
            onChange={(e) => { if (e.target.value) setFecha(periodo === "mes" ? `${e.target.value}-01` : e.target.value); }} />
          <p className="text-xs text-muted-foreground">{periodo === "mes" ? "Semanas de lunes a viernes, dentro del mes" : "Lunes a viernes, dentro del mes seleccionado"}</p>
        </div>
        {!esAsesor && <div className="space-y-2">
          <Label htmlFor="asesor-cobros">Asesor</Label>
          <select id="asesor-cobros" className={selectClass} value={idAsesor} onChange={(e) => setIdAsesor(e.target.value)}>
            <option value="">Todos los asesores</option>
            {asesores.map((a) => <option key={a.id} value={a.id}>{a.nombre_asesor}</option>)}
          </select>
          {errorAsesores && <div role="alert" className="text-sm text-destructive">No se pudo cargar la lista de asesores. <Button variant="link" onClick={() => setIntento((n) => n + 1)}>Reintentar</Button></div>}
        </div>}
      </div>
      {loading ? <p role="status" className="py-8 text-muted-foreground">Cargando cobros...</p> : error ? (
        <div role="alert" className="space-y-3 rounded-md border p-4">
          <p>{error}</p><Button variant="outline" onClick={() => setIntento((n) => n + 1)}>Reintentar</Button>
        </div>
      ) : data && <>
        <p className="text-sm text-muted-foreground">{fechaLarga(data.inicio)} — {fechaLarga(data.fin)}</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {([['Abonos', 'abonos'], ['Multas', 'multas'], ['Total cobrado', 'total_cobrado']] as const).map(([label, key]) => (
            <Card key={key}><CardHeader><CardTitle className="text-sm">{label}</CardTitle></CardHeader>
              <CardContent className="text-2xl font-bold tabular-nums">{dinero.format(data.totales[key])}</CardContent></Card>
          ))}
        </div>
        {bloques.every((dia) => dia.por_asesor.length === 0) && <p role="status" className="text-muted-foreground">Sin movimientos en este período.</p>}
        <div className="space-y-4">
          {bloques.map((dia) => <Card key={dia.clave} className="min-w-0 gap-3 py-4">
            <CardHeader><h2 id={`bloque-${dia.clave}`} className="font-semibold capitalize">{dia.titulo}</h2></CardHeader>
            <CardContent className="px-3 sm:px-6">
              <Table aria-labelledby={`bloque-${dia.clave}`}>
                <TableHeader><TableRow><TableHead scope="col">Asesor</TableHead><TableHead scope="col" className="text-right">Abonos</TableHead><TableHead scope="col" className="text-right">Multas</TableHead><TableHead scope="col" className="text-right">Total cobrado</TableHead></TableRow></TableHeader>
                <TableBody>{dia.por_asesor.length ? dia.por_asesor.map((asesor) => <TableRow key={asesor.id_asesor ?? "sin-asesor"}>
                  <TableCell className="whitespace-normal">{asesor.nombre_asesor}</TableCell>
                  <TableCell className="text-right tabular-nums">{dinero.format(asesor.abonos)}</TableCell>
                  <TableCell className="text-right tabular-nums">{dinero.format(asesor.multas)}</TableCell>
                  <TableCell className="text-right tabular-nums">{dinero.format(asesor.total_cobrado)}</TableCell>
                </TableRow>) : <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Sin movimientos</TableCell></TableRow>}</TableBody>
                <TableFooter><TableRow><TableCell>{data.periodo === "mes" ? "Subtotal de la semana" : "Subtotal del día"}</TableCell>
                  <TableCell className="text-right tabular-nums">{dinero.format(dia.totales.abonos)}</TableCell>
                  <TableCell className="text-right tabular-nums">{dinero.format(dia.totales.multas)}</TableCell>
                  <TableCell className="text-right tabular-nums">{dinero.format(dia.totales.total_cobrado)}</TableCell>
                </TableRow></TableFooter>
              </Table>
            </CardContent>
          </Card>)}
        </div>
      </>}
    </div>
  );
}
