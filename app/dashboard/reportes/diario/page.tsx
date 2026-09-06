"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
import { downloadRoutePaymentTemplate } from "@/lib/pagos-ruta-xlsx";
import { ImportarPagosRutaDialog } from "@/components/importar-pagos-ruta-dialog";
import { User, Users, AlertTriangle, Banknote, ChevronDown, ChevronUp, ChevronsUpDown, FileText, Download, Upload, RefreshCw } from "lucide-react";
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

function FolioLink({ folio }: { folio?: number | string | null }) {
  if (folio == null) return <>—</>;

  return (
    <Link
      href={`/dashboard/creditos/${folio}`}
      className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
    >
      #{folio}
    </Link>
  );
}

function BeneficiarioLink({
  nombre,
  clienteId,
  grupoId,
}: {
  nombre?: string | null;
  clienteId?: string | number | null;
  grupoId?: string | number | null;
}) {
  const href = clienteId
    ? `/dashboard/clientes/${clienteId}`
    : grupoId
      ? `/dashboard/grupos/${grupoId}`
      : null;

  if (!href) return <>{nombre || "—"}</>;

  return (
    <Link
      href={href}
      className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
    >
      {nombre || "—"}
    </Link>
  );
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
  const pagos = data?.pagos || [];
  const searchTerm = search.toLowerCase().trim();
  const matchesSearch = (fields: unknown[]) =>
    fields.some((field) => String(field ?? "").toLowerCase().includes(searchTerm));
  const filtered = filterBySearch(porAsesor, search, (a: any) => {
    const pagosAsesor = pagos.filter(
      (p: any) => (p.credito?.id_asesor ?? 0) === Number(a.id_asesor),
    );

    return [
      a.nombre_asesor,
      a.codigo_asesor,
      a.a_recibir,
      a.total_cobrado,
      a.num_abonos,
      ...pagosAsesor.flatMap((p: any) => [
        p.credito?.cliente?.nombre_completo,
        p.credito?.grupo?.nombre_grupo,
      ]),
      ...(a.clientes_programados || []).flatMap((c: any) => [
        c.cliente?.nombre_completo,
        c.grupo?.nombre_grupo,
      ]),
    ];
  });
  const paginated = paginateItems(filtered, page);
  const money = (n: number) =>
    `$${Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const [expandedAsesores, setExpandedAsesores] = useState<Record<string, boolean>>({});
  const [recibiendo, setRecibiendo] = useState<any | null>(null);
  const [montoRecibido, setMontoRecibido] = useState("");
  const [notasRecepcion, setNotasRecepcion] = useState("");
  const [savingRecepcion, setSavingRecepcion] = useState(false);
  const [importandoRuta, setImportandoRuta] = useState(false);

  const toggleAsesor = (key: string) => {
    setExpandedAsesores((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    (data?.por_asesor || []).forEach((a: any) => {
      const key = String(a.id_asesor ?? a.nombre_asesor);
      next[key] = true;
    });
    setExpandedAsesores(next);
  };

  const collapseAll = () => {
    setExpandedAsesores({});
  };

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
            Resumen y desglose de clientes que pagaron por asesor el {fmtFecha(fecha)}
            {isAdmin ? " — abonos a recibir (sin multas)" : ""}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />Actualizar
          </Button>
          {isAdmin && <>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => downloadRoutePaymentTemplate(fecha, data?.cobros_programados || [], data?.pagos || [])}
              disabled={!data}
            >
              <Download className="size-4" />Descargar plantilla de pagos
            </Button>
            <Button className="gap-2" onClick={() => setImportandoRuta(true)}>
              <Upload className="size-4" />Importar pagos de ruta
            </Button>
          </>}
          <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-40" />
        </div>
      </div>

      {data && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Ruta del Día (A recibir)</CardTitle></CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-primary">
                {money(data.total_programado_dia || 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Cobrado por Gestores</CardTitle></CardHeader>
            <CardContent className="text-xl font-bold text-blue-600">
              {money(data.total_abonos || 0)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Efectivo Recibido (Caja)</CardTitle></CardHeader>
            <CardContent className="text-xl font-bold text-emerald-700">
              {money(data.total_recibido ?? 0)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Diferencia por Entregar</CardTitle></CardHeader>
            <CardContent className="text-xl font-bold text-red-600">
              {money(data.diferencia_cobrado_recibido ?? ((data.total_abonos ?? 0) - (data.total_recibido ?? 0)))}
            </CardContent>
          </Card>
        </div>
      )}

      {(data?.renovaciones_del_dia?.length ?? 0) > 0 && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle>Renovaciones del día</CardTitle>
            <p className="text-sm font-normal text-muted-foreground">La cuota del crédito anterior se excluye de la ruta desde esta fecha.</p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Cliente / Grupo</TableHead><TableHead>Crédito anterior</TableHead><TableHead>Crédito nuevo</TableHead><TableHead className="text-right">Saldo absorbido</TableHead><TableHead className="text-right">Comisión</TableHead><TableHead className="text-right">Efectivo neto</TableHead><TableHead>Plazo</TableHead><TableHead>Gestor</TableHead></TableRow></TableHeader>
              <TableBody>{data.renovaciones_del_dia.map((renovacion: any) => (
                <TableRow key={renovacion.id}>
                  <TableCell className="font-medium">
                    <BeneficiarioLink
                      nombre={renovacion.cliente}
                      clienteId={renovacion.cliente_id}
                      grupoId={renovacion.grupo_id}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs"><FolioLink folio={renovacion.num_prog_anterior} /></TableCell>
                  <TableCell className="font-mono text-xs"><FolioLink folio={renovacion.num_prog_nuevo} /></TableCell>
                  <TableCell className="text-right">{money(renovacion.saldo_absorbido)}</TableCell>
                  <TableCell className="text-right text-amber-700">{money(renovacion.comision_apertura)}</TableCell>
                  <TableCell className="text-right">{money(renovacion.monto_neto)}</TableCell>
                  <TableCell>{renovacion.plazos} semanas</TableCell>
                  <TableCell>{renovacion.gestor || "—"}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Desglose de Cobranza por Gestor Cobranza</CardTitle>
            <p className="text-sm font-normal text-muted-foreground">
              Haz clic en cada asesor para ver sus abonos registrados y la ruta que aún queda por cobrar.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={expandAll} className="text-xs h-8">
              <ChevronsUpDown className="mr-1.5 h-3.5 w-3.5" />
              Expandir todos
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll} className="text-xs h-8">
              Colapsar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <TableSearch placeholder="Buscar gestor, cliente o grupo..." value={search} onChange={handleSearch} />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Gestor Cobranza</TableHead>
                <TableHead className="text-right">Cobrado App</TableHead>
                <TableHead className="text-right">A recibir</TableHead>
                <TableHead className="text-right">Ajuste comisión</TableHead>
                <TableHead className="text-right">Entregó Caja</TableHead>
                <TableHead className="text-right">Faltante</TableHead>
                <TableHead className="text-center">Estado</TableHead>
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
                    {search ? "No se encontraron gestores de cobranza." : "Sin movimientos del día."}
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((a: any) => {
                  const asesorKey = String(a.id_asesor ?? a.nombre_asesor);
                  const pendiente = a.pendiente_entrega ?? a.a_recibir ?? 0;
                  const completo = a.recibido && pendiente <= 0.009;
                  const pagosAsesor = (data?.pagos || []).filter(
                    (p: any) => (p.credito?.id_asesor ?? 0) === Number(a.id_asesor)
                  );
                  // La ruta y los abonos son listas excluyentes: en cuanto un
                  // crédito recibe un abono del día, deja de aparecer en ruta.
                  const foliosConAbono = new Set(
                    pagosAsesor
                      .filter((p: any) => Number(p.monto || 0) > 0)
                      .map((p: any) => String(p.credito?.num_prog ?? "")),
                  );
                  const rutaPendienteAsesor = (a.clientes_programados || []).filter(
                    (c: any) => !foliosConAbono.has(String(c.num_prog)),
                  );
                  const creditosAsesor = (data?.creditos || []).filter(
                    (c: any) => (c.id_asesor ?? 0) === Number(a.id_asesor)
                  );
                  const asesorCoincide = !searchTerm || matchesSearch([
                    a.nombre_asesor,
                    a.codigo_asesor,
                    a.a_recibir,
                    a.total_cobrado,
                    a.num_abonos,
                  ]);
                  const pagoCoincide = (p: any) => matchesSearch([
                    p.credito?.cliente?.nombre_completo,
                    p.credito?.grupo?.nombre_grupo,
                  ]);
                  const clienteProgramadoCoincide = (c: any) => matchesSearch([
                    c.cliente?.nombre_completo,
                    c.grupo?.nombre_grupo,
                  ]);
                  const pagosMostrados = asesorCoincide
                    ? pagosAsesor
                    : pagosAsesor.filter(pagoCoincide);
                  const clientesProgramadosMostrados = asesorCoincide
                    ? rutaPendienteAsesor
                    : rutaPendienteAsesor.filter(clienteProgramadoCoincide);
                  const creditosOtorgadosMostrados = asesorCoincide
                    ? creditosAsesor
                    : creditosAsesor.filter((c: any) => matchesSearch([
                      c.cliente?.nombre_completo,
                      c.grupo?.nombre_grupo,
                    ]));
                  const isExpanded = Boolean(expandedAsesores[asesorKey]) || (Boolean(searchTerm) && !asesorCoincide);

                  return (
                    <React.Fragment key={asesorKey}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/40 transition-colors"
                        onClick={() => toggleAsesor(asesorKey)}
                      >
                        <TableCell className="w-10 pr-0">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-foreground flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              {a.nombre_asesor}
                              {a.codigo_asesor && <Badge variant="outline" className="text-[10px] bg-background">#{a.codigo_asesor}</Badge>}
                            </div>
                            <Badge variant="outline" className="w-fit text-[11px] font-normal py-0">
                              {rutaPendienteAsesor.length} {rutaPendienteAsesor.length === 1 ? "pendiente en ruta" : "pendientes en ruta"}
                            </Badge>
                            {pagosAsesor.length > 0 && (
                              <Badge variant="outline" className="w-fit border-emerald-200 bg-emerald-50 text-[11px] font-normal py-0 text-emerald-700">
                                {pagosAsesor.length} {pagosAsesor.length === 1 ? "abono registrado" : "abonos registrados"}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-blue-600">
                          {a.total_cobrado > 0 ? money(a.total_cobrado) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {money(a.a_recibir)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-amber-700">
                          {a.comisiones_renovacion > 0 ? `-${money(a.comisiones_renovacion)}` : "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium text-emerald-700">
                          {a.recibido ? money(a.monto_recibido) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {pendiente > 0.009 ? (
                            <span className="font-medium text-red-600">{money(pendiente)}</span>
                          ) : (
                            <span className="text-muted-foreground">{money(0)}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {completo ? (
                            <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">Entregado</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">Pendiente</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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

                      {/* Abonos y ruta pendiente son excluyentes para no duplicar clientes. */}
                      {isExpanded && (
                        <TableRow className="bg-muted/15 hover:bg-muted/15 border-b-2">
                          <TableCell colSpan={9} className="p-3 pl-8">
                            <div className="rounded-lg border bg-background p-4 shadow-sm space-y-4">
                              {/* Pagos registrados */}
                              {pagosMostrados.length > 0 && (
                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                                    <div className="flex items-center gap-2">
                                      <Users className="h-4 w-4 text-emerald-600" />
                                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Abonos Registrados — {a.nombre_asesor} ({pagosMostrados.length})
                                      </span>
                                    </div>
                                    <span className="text-xs font-semibold text-emerald-700">
                                      Cobrado en caja: {money(pagosMostrados.reduce((total: number, p: any) => total + Number(p.monto || 0), 0))}
                                    </span>
                                  </div>
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="border-b bg-muted/40 hover:bg-muted/40">
                                        <TableHead className="text-xs h-8">Folio</TableHead>
                                        <TableHead className="text-xs h-8">Cliente / Grupo</TableHead>
                                        <TableHead className="text-xs h-8">Tipo</TableHead>
                                        <TableHead className="text-xs h-8">Método</TableHead>
                                        <TableHead className="text-xs h-8 text-right">Abono</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {pagosMostrados.map((p: any) => (
                                        <TableRow key={p.id} className="text-xs hover:bg-muted/30">
                                          <TableCell className="font-mono font-medium">
                                            <FolioLink folio={p.credito?.num_prog ?? p.id} />
                                          </TableCell>
                                          <TableCell className="font-medium text-foreground">
                                            <BeneficiarioLink
                                              nombre={p.credito?.cliente?.nombre_completo || p.credito?.grupo?.nombre_grupo || "Cliente sin nombre"}
                                              clienteId={p.credito?.cliente?.id_cliente ?? p.credito?.id_cliente}
                                              grupoId={p.credito?.grupo?.id ?? p.credito?.id_grupo}
                                            />
                                          </TableCell>
                                          <TableCell>
                                            <Badge variant="outline" className="text-[10px] py-0">
                                              {p.credito?.tipo_credito || "Individual"}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="text-muted-foreground">
                                            {p.metodo_pago || "Efectivo"}
                                          </TableCell>
                                          <TableCell className="text-right font-bold text-emerald-700">
                                            {money(p.monto)}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}

                              {/* Ruta pendiente: los clientes con abono ya están en la sección anterior. */}
                              {clientesProgramadosMostrados.length > 0 && (
                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                                    <div className="flex items-center gap-2">
                                      <Users className="h-4 w-4 text-primary" />
                                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Ruta pendiente / Clientes programados para cobro ({clientesProgramadosMostrados.length})
                                      </span>
                                    </div>
                                    <span className="text-xs font-semibold text-primary">
                                      Pendiente de ruta: {money(clientesProgramadosMostrados.reduce((total: number, c: any) => total + Number(c.monto_a_cobrar || 0), 0))}
                                    </span>
                                  </div>
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="border-b bg-muted/40 hover:bg-muted/40">
                                        <TableHead className="text-xs h-8">Folio</TableHead>
                                        <TableHead className="text-xs h-8">Cliente / Grupo</TableHead>
                                        <TableHead className="text-xs h-8">Día de pago</TableHead>
                                        <TableHead className="text-xs h-8">Estado</TableHead>
                                        <TableHead className="text-xs h-8 text-right">A cobrar</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {clientesProgramadosMostrados.map((c: any) => (
                                          <TableRow key={c.num_prog} className="text-xs hover:bg-muted/30">
                                            <TableCell className="font-mono font-medium"><FolioLink folio={c.num_prog} /></TableCell>
                                            <TableCell className="font-medium text-foreground">
                                              <BeneficiarioLink
                                                nombre={c.cliente?.nombre_completo || c.grupo?.nombre_grupo}
                                                clienteId={c.cliente?.id_cliente ?? c.id_cliente}
                                                grupoId={c.grupo?.id ?? c.id_grupo}
                                              />
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{c.dias_pago}</TableCell>
                                            <TableCell>
                                              <Badge
                                                variant={c.categoria === "del_dia" ? "secondary" : "outline"}
                                                className={`text-[10px] py-0 ${c.categoria === "del_dia" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"}`}
                                              >
                                                {c.categoria === "del_dia" ? "Del día" : `Atrasado`}
                                              </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-primary">
                                              {money(c.monto_a_cobrar)}
                                            </TableCell>
                                          </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}

                              {rutaPendienteAsesor.length === 0 && (a.clientes_programados || []).length > 0 && (
                                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                                  Toda la ruta programada ya tiene abonos registrados.
                                </div>
                              )}

                              {pagosMostrados.length === 0 && clientesProgramadosMostrados.length === 0 && creditosOtorgadosMostrados.length === 0 && (
                                <p className="text-xs text-muted-foreground text-center py-3">
                                  Sin cobranza programada ni pagos registrados para este gestor de cobranza.
                                </p>
                              )}

                              {creditosOtorgadosMostrados.length > 0 && (
                                <div className="mt-3 pt-3 border-t">
                                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                                    Préstamos nuevos otorgados hoy ({creditosOtorgadosMostrados.length})
                                  </span>
                                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                                    {creditosOtorgadosMostrados.map((cr: any) => (
                                      <div key={cr.id_credito ?? cr.num_prog} className="flex items-center justify-between p-2 rounded border bg-muted/20 text-xs">
                                        <div>
                                          <span className="font-mono font-semibold"><FolioLink folio={cr.num_prog} /></span>
                                          <p className="truncate max-w-40 font-medium">
                                            <BeneficiarioLink
                                              nombre={cr.cliente?.nombre_completo || cr.grupo?.nombre_grupo}
                                              clienteId={cr.cliente?.id_cliente ?? cr.id_cliente}
                                              grupoId={cr.grupo?.id ?? cr.id_grupo}
                                            />
                                          </p>
                                        </div>
                                        <span className="font-bold text-primary">{money(cr.monto_otorgado)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
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
              Indica el efectivo que entregó el gestor de cobranza el {fmtFecha(fecha)}.
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
      {isAdmin && <ImportarPagosRutaDialog
        open={importandoRuta}
        onOpenChange={setImportandoRuta}
        fecha={fecha}
        cobros={data?.cobros_programados || []}
        pagos={data?.pagos || []}
        onImported={onRefresh}
      />}
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
                      <TableCell className="font-mono text-xs"><FolioLink folio={c.num_prog} /></TableCell>
                      <TableCell className="font-medium whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isGrupal
                            ? <Users className="h-4 w-4 text-primary/70" />
                            : <User className="h-4 w-4 text-primary/70" />}
                          <BeneficiarioLink
                            nombre={nombre}
                            clienteId={c.cliente?.id_cliente ?? c.id_cliente}
                            grupoId={c.grupo?.id ?? c.id_grupo}
                          />
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
