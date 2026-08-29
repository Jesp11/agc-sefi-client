"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { isFieldRoleName } from "@/lib/authz";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { fmtFecha } from "@/lib/utils";
import { User, Users, AlertTriangle, Banknote } from "lucide-react";
import { toast } from "sonner";

const cobroSearchFields = (c: any) => [
  c.num_prog,
  c.cliente?.nombre_completo,
  c.grupo?.nombre_grupo,
  c.asesor?.nombre_asesor,
  c.dias_pago,
  c.categoria,
  c.tipo_credito,
];

function labelDia(dia: string) {
  const map: Record<string, string> = {
    DOMINGO: "Domingo",
    LUNES: "Lunes",
    MARTES: "Martes",
    MIERCOLES: "Miércoles",
    JUEVES: "Jueves",
    VIERNES: "Viernes",
    SABADO: "Sábado",
  };
  return map[dia] ?? dia;
}

export default function ReporteDiarioPage() {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const isAsesor = isFieldRoleName(user?.role?.nombre);
  const [fecha, setFecha] = useState(() => new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { search, handleSearch, page, setPage } = useTableControls();

  const loadData = useCallback(async () => {
    if (authLoading || !user) return;
    setLoading(true);
    const endpoint = isAsesor
      ? `/cartera/cobros-del-dia?fecha=${fecha}`
      : `/reportes/diario?fecha=${fecha}`;

    try {
      const res = await apiFetch(endpoint);
      if (res.ok) setData(await res.json());
      else {
        toast.error("No se pudo cargar el reporte diario");
        setData(null);
      }
    } catch {
      toast.error("Error de conexión");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [fecha, isAsesor, user, authLoading]);

  useEffect(() => {
    setPage(1);
    loadData();
  }, [loadData, setPage]);

  if (authLoading) {
    return <div className="p-8 text-muted-foreground">Cargando...</div>;
  }

  if (isAsesor) {
    return (
      <AsesorCobrosView
        fecha={fecha}
        setFecha={setFecha}
        data={data}
        loading={loading}
        search={search}
        handleSearch={handleSearch}
        page={page}
        setPage={setPage}
        onCobrar={(numProg) => router.push(`/dashboard/creditos/${numProg}`)}
      />
    );
  }

  return (
    <AdminPagosView
      fecha={fecha}
      setFecha={setFecha}
      data={data}
      loading={loading}
      search={search}
      handleSearch={handleSearch}
      page={page}
      setPage={setPage}
      isAdmin={isAdmin}
      onRefresh={loadData}
    />
  );
}

function AdminPagosView({
  fecha,
  setFecha,
  data,
  loading,
  search,
  handleSearch,
  page,
  setPage,
  isAdmin,
  onRefresh,
}: {
  fecha: string;
  setFecha: (v: string) => void;
  data: any;
  loading: boolean;
  search: string;
  handleSearch: (v: string) => void;
  page: number;
  setPage: (p: number) => void;
  isAdmin: boolean;
  onRefresh: () => void;
}) {
  const porAsesor = data?.por_asesor || [];
  const filtered = filterBySearch(porAsesor, search, (a: any) => [
    a.nombre_asesor,
    a.codigo_asesor,
    a.a_recibir,
    a.total_cobrado,
    a.num_abonos,
  ]);
  const paginated = paginateItems(filtered, page);
  const money = (n: number) =>
    `$${Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const [recibiendo, setRecibiendo] = useState<any | null>(null);
  const [montoRecibido, setMontoRecibido] = useState("");
  const [notasRecepcion, setNotasRecepcion] = useState("");
  const [savingRecepcion, setSavingRecepcion] = useState(false);

  const openRecibir = (asesorRow: any) => {
    setRecibiendo(asesorRow);
    setMontoRecibido(
      asesorRow.monto_recibido != null
        ? String(asesorRow.monto_recibido)
        : String(asesorRow.a_recibir ?? 0),
    );
    setNotasRecepcion(asesorRow.recepcion_notas ?? "");
  };

  const handleRecibir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recibiendo?.id_asesor) {
      toast.error("Asesor no válido");
      return;
    }
    const monto = parseFloat(montoRecibido);
    if (!Number.isFinite(monto) || monto < 0) {
      toast.error("Indica un monto válido");
      return;
    }

    setSavingRecepcion(true);
    try {
      const res = await apiFetch("/reportes/diario/recibir", {
        method: "POST",
        body: JSON.stringify({
          fecha,
          id_asesor: recibiendo.id_asesor,
          monto_recibido: monto,
          notas: notasRecepcion.trim() || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.message || "No se pudo registrar la recepción");
        return;
      }
      toast.success(body.message || "Recepción registrada");
      setRecibiendo(null);
      onRefresh();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSavingRecepcion(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reporte Diario</h1>
          <p className="text-muted-foreground">
            Resumen por asesor del {fmtFecha(fecha)}
            {isAdmin ? " — abonos a recibir (sin multas)" : ""}.
          </p>
        </div>
        <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-40" />
      </div>

      {data && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Total a recibir</CardTitle></CardHeader>
            <CardContent className="text-xl font-bold text-primary">
              {money(data.total_a_recibir ?? data.total_abonos)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Total recibido</CardTitle></CardHeader>
            <CardContent className="text-xl font-bold text-emerald-700">
              {money(data.total_recibido ?? 0)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Pendiente de entrega</CardTitle></CardHeader>
            <CardContent className="text-xl font-bold text-amber-700">
              {money(data.total_pendiente ?? data.total_a_recibir ?? 0)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Préstamos nuevos (monto)</CardTitle></CardHeader>
            <CardContent className="text-xl font-bold">
              {money(data.monto_colocado)}
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Resumen por asesor</CardTitle>
          <p className="text-sm font-normal text-muted-foreground">
            Registra el efectivo que cada asesor entrega. Las multas no se incluyen.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <TableSearch placeholder="Buscar asesor..." value={search} onChange={handleSearch} />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asesor</TableHead>
                <TableHead className="text-center">Abonos</TableHead>
                <TableHead className="text-right">A recibir</TableHead>
                <TableHead className="text-right">Recibido</TableHead>
                <TableHead className="text-right">Pendiente</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Cargando...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    {search ? "No se encontraron asesores." : "Sin movimientos del día."}
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((a: any) => {
                  const pendiente = a.pendiente_entrega ?? a.a_recibir ?? 0;
                  const completo = a.recibido && pendiente <= 0.009;
                  return (
                    <TableRow key={a.id_asesor ?? a.nombre_asesor}>
                      <TableCell>
                        <div className="font-medium">{a.nombre_asesor}</div>
                        {a.codigo_asesor && (
                          <div className="text-xs text-muted-foreground font-mono">{a.codigo_asesor}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{a.num_abonos}</TableCell>
                      <TableCell className="text-right font-semibold">{money(a.a_recibir)}</TableCell>
                      <TableCell className="text-right">
                        {a.recibido ? money(a.monto_recibido) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {pendiente > 0.009 ? (
                          <span className="font-medium text-amber-700">{money(pendiente)}</span>
                        ) : a.recibido ? (
                          <span className="text-emerald-700">{money(0)}</span>
                        ) : (
                          money(a.a_recibir)
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {completo ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Recibido</Badge>
                        ) : a.recibido ? (
                          <Badge className="bg-amber-50 text-amber-800 border-amber-200">Parcial</Badge>
                        ) : (
                          <Badge variant="secondary">Pendiente</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {a.id_asesor ? (
                          <Button size="sm" variant={a.recibido ? "outline" : "default"} onClick={() => openRecibir(a)}>
                            <Banknote className="mr-1.5 h-3.5 w-3.5" />
                            {a.recibido ? "Editar" : "Recibir"}
                          </Button>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          {!loading && (
            <TablePagination
              page={page}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              label="asesores"
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(recibiendo)} onOpenChange={(o) => !o && setRecibiendo(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recibir de {recibiendo?.nombre_asesor}</DialogTitle>
            <DialogDescription>
              Indica el efectivo que entregó el asesor el {fmtFecha(fecha)}.
              Esperado (abonos): {money(recibiendo?.a_recibir ?? 0)}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecibir} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="monto-recibido">Monto recibido</Label>
              <Input
                id="monto-recibido"
                type="number"
                step="0.01"
                min="0"
                required
                value={montoRecibido}
                onChange={(e) => setMontoRecibido(e.target.value)}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notas-recepcion">
                Notas <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input
                id="notas-recepcion"
                value={notasRecepcion}
                onChange={(e) => setNotasRecepcion(e.target.value)}
                placeholder="Ej. faltante, se completa mañana..."
              />
            </div>
            {Number.isFinite(parseFloat(montoRecibido)) && (
              <p className="text-sm text-muted-foreground">
                Diferencia vs esperado:{" "}
                <span className="font-semibold text-foreground">
                  {money(parseFloat(montoRecibido) - Number(recibiendo?.a_recibir ?? 0))}
                </span>
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => setRecibiendo(null)} disabled={savingRecepcion}>
                Cancelar
              </Button>
              <Button type="submit" disabled={savingRecepcion}>
                {savingRecepcion ? "Guardando..." : "Confirmar recepción"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AsesorCobrosView({
  fecha,
  setFecha,
  data,
  loading,
  search,
  handleSearch,
  page,
  setPage,
  onCobrar,
}: {
  fecha: string;
  setFecha: (v: string) => void;
  data: any;
  loading: boolean;
  search: string;
  handleSearch: (v: string) => void;
  page: number;
  setPage: (p: number) => void;
  onCobrar: (numProg: number) => void;
}) {
  const cobros = data?.cobros ?? [];
  const filtered = filterBySearch(cobros, search, cobroSearchFields);
  const paginated = paginateItems(filtered, page);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reporte Diario</h1>
          <p className="text-muted-foreground">
            Cobros a realizar
            {data?.dia_semana ? ` — ${labelDia(data.dia_semana)}` : ""}
            {" "}(incluye pendientes de días anteriores).
          </p>
        </div>
        <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-40" />
      </div>

      {data && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Monto cobrado</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold text-emerald-700">
              ${Number(data.monto_cobrado || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pendientes por cobrar</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold">{data.total_cobros}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Del día{data.dia_semana ? ` (${labelDia(data.dia_semana)})` : ""}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold text-emerald-700">{data.total_del_dia}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pendientes anteriores</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold text-amber-700">{data.total_atrasados}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Monto a cobrar</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold text-primary">
              ${Number(data.monto_a_cobrar || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Ruta de cobranza</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <TableSearch placeholder="Buscar por folio, cliente o grupo..." value={search} onChange={handleSearch} />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folio</TableHead>
                <TableHead>Cliente / Grupo</TableHead>
                <TableHead>Día pago</TableHead>
                <TableHead className="text-center">Categoría</TableHead>
                <TableHead className="text-right">Valor ficha</TableHead>
                <TableHead className="text-right">A cobrar</TableHead>
                <TableHead className="text-center">Cuotas pend.</TableHead>
                <TableHead className="text-center">Atraso</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">Cargando...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    {search ? "No se encontraron cobros." : "No hay cobros pendientes para este día."}
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((c: any) => {
                  const isGrupal = c.tipo_credito === "Grupal";
                  const nombre = isGrupal
                    ? (c.grupo?.nombre_grupo ?? "Grupo")
                    : (c.cliente?.nombre_completo ?? "Cliente");
                  const esAtrasado = c.categoria === "atrasado";
                  return (
                    <TableRow key={c.num_prog}>
                      <TableCell className="font-mono text-xs">#{c.num_prog}</TableCell>
                      <TableCell className="font-medium whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isGrupal
                            ? <Users className="h-4 w-4 text-primary/70" />
                            : <User className="h-4 w-4 text-primary/70" />}
                          {nombre}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{c.dias_pago ?? "—"}</TableCell>
                      <TableCell className="text-center">
                        {esAtrasado ? (
                          <Badge className="bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-50 gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Pendiente anterior
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                            Del día
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        ${Number(c.valor_ficha || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold text-primary">
                        ${Number(c.monto_a_cobrar || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        {c.cuotas_pendientes}
                        {c.cuotas_atrasadas > 0 && (
                          <span className="text-amber-700"> ({c.cuotas_atrasadas} atr.)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        {c.dias_atraso > 0 ? (
                          <span className="text-amber-800 font-medium">{c.dias_atraso} d</span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" className="h-8 text-xs" onClick={() => onCobrar(c.num_prog)}>
                          Cobrar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          {!loading && (
            <TablePagination
              page={page}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              label="cobros"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
