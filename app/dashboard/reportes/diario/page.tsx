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
import { cn, fmtFecha } from "@/lib/utils";
import { downloadRoutePaymentTemplate } from "@/lib/pagos-ruta-xlsx";
import { exportarCorteDiarioPdf } from "@/lib/reporte-corte-diario-pdf";
import { ImportarPagosRutaDialog } from "@/components/importar-pagos-ruta-dialog";
import { PrintTicket, buildPagoTicketProps, type PagoTicketData } from "@/components/print-ticket";
import { User, Users, Banknote, ChevronDown, ChevronUp, ChevronsUpDown, Download, Upload, RefreshCw, Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Cobro = {
  num_prog: number;
  tipo_credito?: string;
  dias_pago?: string | null;
  categoria?: string;
  valor_ficha?: number | string | null;
  monto_a_cobrar?: number | string | null;
  cuotas_pendientes?: number;
  cuotas_atrasadas?: number;
  dias_atraso?: number;
  pagado_hoy?: boolean;
  monto_abonado_hoy?: number | string;
  cliente?: { id_cliente?: string | number; nombre_completo?: string | null } | null;
  grupo?: { id?: string | number; nombre_grupo?: string | null } | null;
  id_cliente?: string | number;
  id_grupo?: string | number;
  asesor?: { nombre_asesor?: string | null } | null;
};

type CreditoMora = {
  num_prog: number;
  tipo_credito?: string;
  dias_pago?: string | null;
  saldo_actual?: number | string | null;
  dias_mora?: number;
  pagado_hoy?: boolean;
  cliente?: { id_cliente?: string | number; nombre_completo?: string | null } | null;
  grupo?: { id?: string | number; nombre_grupo?: string | null } | null;
};

type PagoDelDia = {
  monto_adelantado_hoy?: number | string;
  id: number;
  num_prog: number | string;
  monto: number | string;
  fecha: string;
  hora?: string | null;
  metodo_pago?: string | null;
  notas?: string | null;
  credito?: {
    num_prog?: number | string;
    tipo_credito?: string | null;
    saldo_pendiente?: number | string | null;
    cliente?: { nombre_completo?: string | null } | null;
    grupo?: { nombre_grupo?: string | null } | null;
    asesor?: { nombre_asesor?: string | null } | null;
  } | null;
};

type DesembolsoRenovacionPendiente = {
  id: number;
  fecha: string;
  estado: "EntregadoGestor" | "Confirmado" | "PendienteReintegro" | "Reintegrado" | "Cancelado";
  num_prog?: number | string | null;
  motivo?: string | null;
  monto: number | string;
  credito?: {
    cliente?: { nombre_completo?: string | null } | null;
    grupo?: { nombre_grupo?: string | null } | null;
  } | null;
};

const cobroSearchFields = (c: Cobro) => [
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

function todayLocal(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
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

function ReimprimirTicketPago({ pago, seccion = "abonos" }: { pago: PagoDelDia; seccion?: string }) {
  const credito = pago.credito;
  const ticket: PagoTicketData = {
    num_prog: credito?.num_prog ?? pago.num_prog,
    tipo_credito: credito?.tipo_credito ?? undefined,
    beneficiario: credito?.cliente?.nombre_completo || credito?.grupo?.nombre_grupo || undefined,
    asesor: credito?.asesor?.nombre_asesor ?? null,
    fecha: pago.fecha,
    hora: pago.hora,
    metodo_pago: pago.metodo_pago ?? undefined,
    abono: Number(pago.monto || 0),
    total: Number(pago.monto || 0),
    notas: pago.notas ?? null,
    saldo_pendiente: credito?.saldo_pendiente == null ? undefined : Number(credito.saldo_pendiente),
  };

  return (
    <PrintTicket
      {...buildPagoTicketProps(ticket)}
      ticketId={`reimpresion-${seccion}-pago-${pago.id}`}
      buttonLabel="Reimprimir ticket"
    />
  );
}

export default function ReporteDiarioPage() {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const isAsesor = isFieldRoleName(user?.role?.nombre);
  const [fecha, setFecha] = useState(todayLocal);
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

  // Al registrar desde una ficha se navega a otra pantalla. Next puede
  // conservar esta vista en caché al volver, por lo que se vuelve a consultar
  // para mostrar el abono recién registrado en "Cobrado App".
  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState !== "hidden") {
        loadData();
      }
    };

    window.addEventListener("focus", refreshWhenVisible);
    window.addEventListener("pageshow", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.removeEventListener("focus", refreshWhenVisible);
      window.removeEventListener("pageshow", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadData]);

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
  const foliosPrestamosNuevos = new Set((data?.creditos || []).map((credito: any) => String(credito.num_prog)));
  const renovacionesVisibles = (data?.renovaciones_del_dia || []).filter(
    (renovacion: any) => foliosPrestamosNuevos.has(String(renovacion.num_prog_nuevo)),
  );
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
      ...(a.creditos_mora || []).flatMap((c: any) => [
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
  const [modoRecepcion, setModoRecepcion] = useState<"recibir" | "editar" | "agregar">("recibir");
  const [montoRecibido, setMontoRecibido] = useState("");
  const [notasRecepcion, setNotasRecepcion] = useState("");
  const [savingRecepcion, setSavingRecepcion] = useState(false);
  const [eliminandoPagoId, setEliminandoPagoId] = useState<number | null>(null);
  const [importandoRuta, setImportandoRuta] = useState(false);
  const montoPosteriorCorte = Math.max(0, Number(recibiendo?.monto_posterior_corte ?? 0));
  const montoActual = Number(recibiendo?.monto_recibido ?? 0);
  const montoPropuesto = modoRecepcion === "agregar"
    ? montoActual + (parseFloat(montoRecibido) || 0)
    : parseFloat(montoRecibido) || 0;

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
    setModoRecepcion(asesorRow.recibido ? "editar" : "recibir");
    setMontoRecibido(
      asesorRow.monto_recibido != null
        ? String(asesorRow.monto_recibido)
        : String(asesorRow.a_recibir ?? 0),
    );
    setNotasRecepcion(asesorRow.recepcion_notas ?? "");
  };

  const openAgregar = (asesorRow: any) => {
    setRecibiendo(asesorRow);
    setModoRecepcion("agregar");
    setMontoRecibido("");
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
          agregar: modoRecepcion === "agregar",
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

  const eliminarAbono = async (pago: any) => {
    const folio = pago.credito?.num_prog ?? pago.num_prog;
    if (!folio || !pago.id) return;
    if (!window.confirm(`¿Eliminar definitivamente el abono #${pago.id} de ${money(pago.monto)} del ${fmtFecha(pago.fecha)}${pago.hora ? ` a las ${String(pago.hora).slice(0, 5)}` : ""}? También se eliminará su ingreso de caja asociado, si existe, y se ajustarán los saldos del crédito y del corte. Esta acción no se puede deshacer.`)) return;

    setEliminandoPagoId(Number(pago.id));
    try {
      const res = await apiFetch(`/creditos/${folio}/pagos/${pago.id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.message || "No se pudo eliminar el abono.");
        return;
      }
      toast.success(body.message || "Abono eliminado.");
      onRefresh();
    } catch {
      toast.error("Error de conexión al eliminar el abono.");
    } finally {
      setEliminandoPagoId(null);
    }
  };

  const exportarPdf = () => {
    if (!data?.por_asesor?.length) {
      toast.error("No hay información de gestores para exportar.");
      return;
    }
    exportarCorteDiarioPdf(data);
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
            <Button variant="outline" className="gap-2" onClick={exportarPdf} disabled={!data}>
              <Printer className="size-4" />Exportar corte PDF
            </Button>
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
            <CardHeader className="pb-2"><CardTitle className="text-sm">Diferencia por Entregar</CardTitle></CardHeader>
            <CardContent className="text-xl font-bold text-red-600">
              {money(data.diferencia_cobrado_recibido ?? ((data.total_abonos ?? 0) - (data.total_recibido ?? 0)))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Monto Pendiente</CardTitle></CardHeader>
            <CardContent className="text-xl font-bold text-amber-700">
              {money(data.total_pendiente_cobro ?? 0)}
            </CardContent>
          </Card>
        </div>
      )}

      {renovacionesVisibles.length > 0 && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle>Renovaciones del día</CardTitle>
            <p className="text-sm font-normal text-muted-foreground">La cuota del crédito anterior se excluye de la ruta desde esta fecha.</p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Cliente / Grupo</TableHead><TableHead>Crédito anterior</TableHead><TableHead>Crédito nuevo</TableHead><TableHead className="text-right">Saldo absorbido</TableHead><TableHead className="text-right">Comisión</TableHead><TableHead className="text-right">Efectivo neto</TableHead><TableHead>Plazo</TableHead><TableHead>Gestor</TableHead></TableRow></TableHeader>
              <TableBody>{renovacionesVisibles.map((renovacion: any) => (
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
              Haz clic en cada asesor para ver la ruta del día, sus abonos de ruta, atrasados y créditos en mora.
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
                <TableHead className="text-right">Saldo favor clientes</TableHead>
                <TableHead className="text-right">Comisión</TableHead>
                <TableHead className="text-right">Entregó Caja</TableHead>
                <TableHead className="text-right">Por cobrar</TableHead>
                <TableHead className="text-right">Por entregar</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">Cargando...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                    {search ? "No se encontraron gestores de cobranza." : "Sin movimientos del día."}
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((a: any) => {
                  const asesorKey = String(a.id_asesor ?? a.nombre_asesor);
                  const pendienteEntrega = a.pendiente_entrega ?? Math.max(0, Number(a.a_recibir ?? 0) - Number(a.monto_recibido ?? 0));
                  const pendienteCobro = a.monto_pendiente_cobro ?? 0;
                  const completo = a.recibido && pendienteEntrega <= 0.009;
                  const pagosAsesor = (data?.pagos || []).filter(
                    (p: any) => (p.credito?.id_asesor ?? 0) === Number(a.id_asesor)
                  );
                  // La ruta diaria sólo incluye la cuota calendarizada para hoy.
                  // Los atrasados se gestionan fuera de esta ruta y no deben
                  // mezclarse con los clientes que el asesor visita hoy.
                  const rutaDelDiaAsesor = (a.clientes_programados || []).filter(
                    (c: any) => c.categoria === "del_dia",
                  );
                  const atrasadosAsesor = (a.clientes_programados || []).filter(
                    (c: any) => c.categoria === "atrasado",
                  );
                  const moraAsesor = a.creditos_mora || [];
                  const pagosAnticipadosAsesor = a.pagos_anticipados || [];
                  const foliosRutaDelDia = new Set(rutaDelDiaAsesor.map((c: any) => String(c.num_prog)));
                  const foliosMora = new Set(moraAsesor.map((c: any) => String(c.num_prog)));
                  const pagosDelFolio = (folio: number | string) => pagosAsesor.filter(
                    (p: any) => String(p.credito?.num_prog ?? p.num_prog) === String(folio),
                  );
                  const montoRutaDelPago = (pago: any) => {
                    const montoClasificado = Number(pago.monto_del_dia_hoy || 0);
                    return montoClasificado > 0.009
                      ? montoClasificado
                      : (foliosRutaDelDia.has(String(pago.credito?.num_prog ?? pago.num_prog)) ? Number(pago.monto || 0) : 0);
                  };
                  const montoAtrasadoDelPago = (pago: any) => Number(pago.monto_atrasado_hoy || 0);
                  const montoAnticipadoDelPago = (pago: any) => Number(pago.monto_adelantado_hoy || 0);
                  const botonEliminarAbono = (pago: any) => isAdmin && pago.tipo === "Abono" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 px-2 text-[11px]"
                      disabled={eliminandoPagoId === Number(pago.id)}
                      onClick={() => eliminarAbono(pago)}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      {eliminandoPagoId === Number(pago.id) ? "Eliminando" : "Eliminar"}
                    </Button>
                  );
                  const accionesAbonos = (abonos: any[]) => (
                    <div className="flex flex-col items-end gap-2">
                      {abonos.filter((pago) => pago.tipo === "Abono").map((pago) => (
                        <div key={pago.id} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            Abono #{pago.id} · {money(pago.monto)}
                            {pago.hora ? ` · ${String(pago.hora).slice(0, 5)}` : ""}
                          </span>
                          {botonEliminarAbono(pago)}
                        </div>
                      ))}
                    </div>
                  );
                  // La sección de abonos es exclusivamente para la ruta del
                  // día. Un abono a un atrasado conserva su lugar en la lista
                  // de atrasados, donde se mostrará como pagado en verde.
                  const pagosRutaAsesor = pagosAsesor.filter((p: any) =>
                    foliosRutaDelDia.has(String(p.credito?.num_prog ?? p.num_prog)),
                  );
                  // La ruta y sus abonos son listas excluyentes: en cuanto un
                  // crédito de la ruta recibe un abono, deja de aparecer como
                  // pendiente de ruta.
                  const foliosRutaConAbono = new Set(
                    pagosRutaAsesor
                      .filter((p: any) => montoRutaDelPago(p) > 0.009)
                      .map((p: any) => String(p.credito?.num_prog ?? "")),
                  );
                  const rutaPendienteAsesor = rutaDelDiaAsesor.filter(
                    (c: any) => !foliosRutaConAbono.has(String(c.num_prog)),
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
                  const pagosRutaMostrados = asesorCoincide
                    ? pagosRutaAsesor
                    : pagosRutaAsesor.filter(pagoCoincide);
                  const clientesProgramadosMostrados = asesorCoincide
                    ? rutaPendienteAsesor
                    : rutaPendienteAsesor.filter(clienteProgramadoCoincide);
                  const atrasadosMostrados = asesorCoincide
                    ? atrasadosAsesor
                    : atrasadosAsesor.filter(clienteProgramadoCoincide);
                  const totalAbonadoAtrasados = atrasadosMostrados.reduce(
                    (total: number, cobro: any) => total + Number(cobro.monto_abonado_atrasado_hoy ?? cobro.monto_abonado_hoy ?? 0),
                    0,
                  );
                  const moraMostrada = asesorCoincide
                    ? moraAsesor
                    : moraAsesor.filter(clienteProgramadoCoincide);
                  const pagosAnticipadosMostrados = asesorCoincide
                    ? pagosAnticipadosAsesor
                    : pagosAnticipadosAsesor.filter(pagoCoincide);
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
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-blue-600">
                          {a.total_cobrado > 0 ? money(a.total_cobrado) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {money(a.a_recibir)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-sky-700">
                          {a.saldo_favor_clientes > 0 ? money(a.saldo_favor_clientes) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium text-amber-700">
                          {a.comisiones_renovacion > 0 ? money(a.comisiones_renovacion) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium text-emerald-700">
                          {a.recibido ? money(a.monto_recibido) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {pendienteCobro > 0.009 ? (
                            <span className="font-medium text-red-600">{money(pendienteCobro)}</span>
                          ) : (
                            <span className="text-muted-foreground">{money(0)}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {pendienteEntrega > 0.009 ? (
                            <span className="text-amber-700">{money(pendienteEntrega)}</span>
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
                          {a.id_asesor ? a.recibido ? (
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => openRecibir(a)}>
                                <Banknote className="mr-1.5 h-3.5 w-3.5" />Editar
                              </Button>
                              <Button size="sm" onClick={() => openAgregar(a)}>
                                <Plus className="mr-1.5 h-3.5 w-3.5" />Agregar
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant={a.recibido ? "outline" : "default"} onClick={() => openRecibir(a)}>
                              <Banknote className="mr-1.5 h-3.5 w-3.5" />
                              Recibir
                            </Button>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>

                      {/* La ruta, sus abonos y los atrasados se muestran por separado. */}
                      {isExpanded && (
                        <TableRow className="bg-muted/15 hover:bg-muted/15 border-b-2">
                          <TableCell colSpan={11} className="p-3 pl-8">
                            <div className="rounded-lg border bg-background p-4 shadow-sm space-y-4">
                              {/* Solo los abonos de la ruta del día van en esta sección. */}
                              {pagosRutaMostrados.length > 0 && (
                                <ExpandableReportSection
                                  title={`Abonos de ruta diaria (${pagosRutaMostrados.length})`}
                                  toneClass="text-emerald-600"
                                  summary={<span className="text-emerald-700">{money(pagosRutaMostrados.reduce((total: number, p: any) => total + montoRutaDelPago(p), 0))}</span>}
                                >
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="border-b bg-muted/40 hover:bg-muted/40">
                                        <TableHead className="text-xs h-8">Folio</TableHead>
                                        <TableHead className="text-xs h-8">Cliente / Grupo</TableHead>
                                        <TableHead className="text-xs h-8">Tipo</TableHead>
                                        <TableHead className="text-xs h-8">Método</TableHead>
                                        <TableHead className="text-xs h-8 text-right">Abono</TableHead>
                                        <TableHead className="text-xs h-8 text-right">Saldo a favor</TableHead>
                                        {isAdmin && <TableHead className="text-xs h-8 text-right">Acción</TableHead>}
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {pagosRutaMostrados.map((p: any) => (
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
                                            {Number(p.saldo_favor_cliente || 0) > 0 && (
                                              <div className="mt-1 text-[11px] font-semibold text-sky-700">
                                                Saldo a favor: {money(p.saldo_favor_cliente)}
                                              </div>
                                            )}
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
                                            {money(montoRutaDelPago(p))}
                                          </TableCell>
                                          <TableCell className="text-right font-medium text-sky-700">
                                            {Number(p.saldo_favor_cliente || 0) > 0 ? money(p.saldo_favor_cliente) : "—"}
                                          </TableCell>
                                          {isAdmin && <TableCell className="text-right">{botonEliminarAbono(p)}</TableCell>}
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </ExpandableReportSection>
                              )}

                              {pagosAnticipadosMostrados.length > 0 && (
                                <ExpandableReportSection
                                  title={`Pagos anticipados (${pagosAnticipadosMostrados.length})`}
                                  toneClass="text-violet-700"
                                  summary={<span className="text-violet-700">{money(pagosAnticipadosMostrados.reduce((total: number, p: any) => total + montoAnticipadoDelPago(p), 0))}</span>}
                                >
                                  <p className="mb-2 text-xs text-muted-foreground">
                                    Estos abonos ya se aplicarán a su cuota futura y no volverán a aparecer como pendientes al llegar su fecha de pago.
                                  </p>
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="border-b bg-muted/40 hover:bg-muted/40">
                                        <TableHead className="text-xs h-8">Folio</TableHead>
                                        <TableHead className="text-xs h-8">Cliente / Grupo</TableHead>
                                        <TableHead className="text-xs h-8">Tipo</TableHead>
                                        <TableHead className="text-xs h-8">Método</TableHead>
                                        <TableHead className="text-xs h-8 text-right">Abono</TableHead>
                                        {isAdmin && <TableHead className="text-xs h-8 text-right">Acción</TableHead>}
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {pagosAnticipadosMostrados.map((p: any) => (
                                        <TableRow key={p.id} className="text-xs hover:bg-muted/30">
                                          <TableCell className="font-mono font-medium">
                                            <FolioLink folio={p.credito?.num_prog ?? p.num_prog} />
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
                                          <TableCell className="text-right font-bold text-violet-700">
                                            {money(montoAnticipadoDelPago(p))}
                                          </TableCell>
                                          {isAdmin && <TableCell className="text-right">{botonEliminarAbono(p)}</TableCell>}
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </ExpandableReportSection>
                              )}

                              {/* Ruta pendiente: los clientes con abono ya están en la sección anterior. */}
                              {clientesProgramadosMostrados.length > 0 && (
                                <ExpandableReportSection
                                  title={`Ruta del día (${clientesProgramadosMostrados.length})`}
                                  toneClass="text-primary"
                                  summary={<span className="text-primary">{money(clientesProgramadosMostrados.reduce((total: number, c: any) => total + Number(c.monto_a_cobrar || 0), 0))}</span>}
                                >
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="border-b bg-muted/40 hover:bg-muted/40">
                                        <TableHead className="text-xs h-8">Folio</TableHead>
                                        <TableHead className="text-xs h-8">Cliente / Grupo</TableHead>
                                        <TableHead className="text-xs h-8">Día de pago</TableHead>
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
                                            <TableCell className="text-right font-bold text-primary">
                                              {money(c.monto_a_cobrar)}
                                            </TableCell>
                                          </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </ExpandableReportSection>
                              )}

                              {/* Los atrasados permanecen aquí aunque se cobren hoy. */}
                              {atrasadosMostrados.length > 0 && (
                                <ExpandableReportSection
                                  title={`Pagos atrasados (${atrasadosMostrados.length})`}
                                  toneClass="text-amber-600"
                                  summary={<span className="text-amber-700">Abonado: {money(totalAbonadoAtrasados)}</span>}
                                >
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="border-b bg-muted/40 hover:bg-muted/40">
                                        <TableHead className="text-xs h-8">Folio</TableHead>
                                        <TableHead className="text-xs h-8">Cliente / Grupo</TableHead>
                                        <TableHead className="text-xs h-8">Vencimiento</TableHead>
                                        <TableHead className="text-xs h-8 text-center">Atraso</TableHead>
                                        <TableHead className="text-xs h-8 text-right">A cobrar</TableHead>
                                        <TableHead className="text-xs h-8 text-right">Abonado hoy</TableHead>
                                        <TableHead className="text-xs h-8 text-center">Estado</TableHead>
                                        {isAdmin && <TableHead className="text-xs h-8 text-right">Acción</TableHead>}
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {atrasadosMostrados.map((c: any) => {
                                        const montoAbonadoHoy = Number(c.monto_abonado_atrasado_hoy ?? c.monto_abonado_hoy ?? 0);
                                        const pagadoHoy = montoAbonadoHoy >= Number(c.monto_a_cobrar || 0) - 0.009;
                                        const abonosAtrasados = pagosDelFolio(c.num_prog).filter((p: any) => montoAtrasadoDelPago(p) > 0.009);
                                        return (
                                          <TableRow key={c.num_prog} className={cn("text-xs hover:bg-muted/30", pagadoHoy && "bg-emerald-100 text-emerald-950 hover:bg-emerald-200/80 [&_a]:text-emerald-800 [&_a]:decoration-emerald-600/50")}>
                                            <TableCell className="font-mono font-medium"><FolioLink folio={c.num_prog} /></TableCell>
                                            <TableCell className="font-medium text-foreground">
                                              <BeneficiarioLink
                                                nombre={c.cliente?.nombre_completo || c.grupo?.nombre_grupo}
                                                clienteId={c.cliente?.id_cliente ?? c.id_cliente}
                                                grupoId={c.grupo?.id ?? c.id_grupo}
                                              />
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{c.pendientes?.[0]?.fecha ? fmtFecha(c.pendientes[0].fecha) : "—"}</TableCell>
                                            <TableCell className="text-center text-amber-800 font-medium">{c.dias_atraso ? `${c.dias_atraso} d` : "—"}</TableCell>
                                            <TableCell className="text-right font-bold text-amber-700">{money(c.monto_a_cobrar)}</TableCell>
                                            <TableCell className="text-right font-bold text-emerald-700">
                                              {montoAbonadoHoy > 0 ? money(montoAbonadoHoy) : "—"}
                                            </TableCell>
                                            <TableCell className="text-center">
                                              {pagadoHoy ? (
                                                <Badge className="border-emerald-300 bg-emerald-200 text-emerald-900 hover:bg-emerald-200">Pagado</Badge>
                                              ) : montoAbonadoHoy > 0 ? (
                                                <Badge className="border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-100">Abono parcial</Badge>
                                              ) : (
                                                <Badge variant="outline" className="border-amber-300 text-amber-800">Pendiente</Badge>
                                              )}
                                            </TableCell>
                                            {isAdmin && (
                                              <TableCell className="text-right">
                                                {accionesAbonos(abonosAtrasados)}
                                              </TableCell>
                                            )}
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                </ExpandableReportSection>
                              )}

                              {/* La mora se consulta aparte de la ruta; un abono sólo cambia su estado visual. */}
                              {moraMostrada.length > 0 && (
                                <ExpandableReportSection
                                  title={`Mora (${moraMostrada.length})`}
                                  toneClass="text-red-600"
                                  summary={<span className="text-red-700">{money(moraMostrada.reduce((total: number, c: any) => total + Number(c.saldo_actual || 0), 0))}</span>}
                                >
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="border-b bg-muted/40 hover:bg-muted/40">
                                        <TableHead className="text-xs h-8">Folio</TableHead>
                                        <TableHead className="text-xs h-8">Cliente / Grupo</TableHead>
                                        <TableHead className="text-xs h-8">Día de pago</TableHead>
                                        <TableHead className="text-xs h-8 text-center">Días mora</TableHead>
                                        <TableHead className="text-xs h-8 text-right">Saldo</TableHead>
                                        <TableHead className="text-xs h-8 text-center">Estado</TableHead>
                                        {isAdmin && <TableHead className="text-xs h-8 text-right">Acción</TableHead>}
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {moraMostrada.map((c: any) => {
                                        const pagadoHoy = Boolean(c.pagado_hoy);
                                        const abonosMora = pagosDelFolio(c.num_prog).filter((p: any) =>
                                          foliosMora.has(String(p.credito?.num_prog ?? p.num_prog)),
                                        );
                                        return (
                                          <TableRow key={c.num_prog} className={cn("text-xs hover:bg-muted/30", pagadoHoy && "bg-emerald-100 text-emerald-950 hover:bg-emerald-200/80 [&_a]:text-emerald-800 [&_a]:decoration-emerald-600/50")}>
                                            <TableCell className="font-mono font-medium"><FolioLink folio={c.num_prog} /></TableCell>
                                            <TableCell className="font-medium text-foreground">
                                              <BeneficiarioLink
                                                nombre={c.cliente?.nombre_completo || c.grupo?.nombre_grupo}
                                                clienteId={c.cliente?.id_cliente ?? c.id_cliente}
                                                grupoId={c.grupo?.id ?? c.id_grupo}
                                              />
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{c.dias_pago || "—"}</TableCell>
                                            <TableCell className="text-center text-red-800 font-medium">{c.dias_mora ? `${c.dias_mora} d` : "—"}</TableCell>
                                            <TableCell className="text-right font-bold text-red-700">{money(c.saldo_actual)}</TableCell>
                                            <TableCell className="text-center">
                                              {pagadoHoy ? (
                                                <Badge className="border-emerald-300 bg-emerald-200 text-emerald-900 hover:bg-emerald-200">Pagado</Badge>
                                              ) : (
                                                <Badge variant="outline" className="border-red-300 text-red-800">En mora</Badge>
                                              )}
                                            </TableCell>
                                            {isAdmin && (
                                              <TableCell className="text-right">
                                                {accionesAbonos(abonosMora)}
                                              </TableCell>
                                            )}
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                </ExpandableReportSection>
                              )}

                              {rutaPendienteAsesor.length === 0 && rutaDelDiaAsesor.length > 0 && (
                                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                                  Toda la ruta programada para hoy ya tiene abonos registrados.
                                </div>
                              )}

                              {pagosRutaMostrados.length === 0 && pagosAnticipadosMostrados.length === 0 && clientesProgramadosMostrados.length === 0 && atrasadosMostrados.length === 0 && moraMostrada.length === 0 && creditosOtorgadosMostrados.length === 0 && (
                                <p className="text-xs text-muted-foreground text-center py-3">
                                  Sin cobranza programada ni pagos registrados para este gestor de cobranza.
                                </p>
                              )}

                              {creditosOtorgadosMostrados.length > 0 && (
                                <ExpandableReportSection
                                  title={`Préstamos nuevos (${creditosOtorgadosMostrados.length})`}
                                  toneClass="text-primary"
                                  summary={<span className="text-primary">{money(creditosOtorgadosMostrados.reduce((total: number, credito: any) => total + Number(credito.monto_otorgado || 0), 0))}</span>}
                                >
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
                                </ExpandableReportSection>
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
            <DialogTitle>{modoRecepcion === "agregar" ? "Agregar recepción de" : "Recibir de"} {recibiendo?.nombre_asesor}</DialogTitle>
            <DialogDescription>
              {modoRecepcion === "agregar" ? (
                <>Registra únicamente el efectivo adicional entregado por el gestor. Ya se recibieron: {money(montoActual)}.</>
              ) : (
                <>Indica el efectivo que entregó el gestor de cobranza el {fmtFecha(fecha)}. Esperado (abonos): {money(recibiendo?.a_recibir ?? 0)}.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecibir} className="grid gap-4">
            {montoPosteriorCorte > 0.009 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Desde el último corte se registraron abonos por <strong>{money(montoPosteriorCorte)}</strong>.
                Falta recibir esa cantidad para llevarla a caja.
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="monto-recibido">{modoRecepcion === "agregar" ? "Monto a agregar" : "Monto recibido acumulado"}</Label>
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
              {modoRecepcion === "agregar" ? (
                <p className="text-xs text-muted-foreground">Se sumará al efectivo ya recibido; no reemplaza el total del corte.</p>
              ) : recibiendo?.recibido && (
                <p className="text-xs text-muted-foreground">
                  Conserva o actualiza el total entregado por el gestor; no se precarga la diferencia.
                </p>
              )}
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
                  {money(montoPropuesto - Number(recibiendo?.a_recibir ?? 0))}
                </span>
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => setRecibiendo(null)} disabled={savingRecepcion}>
                Cancelar
              </Button>
              <Button type="submit" disabled={savingRecepcion}>
                {savingRecepcion ? "Guardando..." : modoRecepcion === "agregar" ? "Agregar efectivo" : "Confirmar recepción"}
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

function ExpandableReportSection({
  title,
  summary,
  toneClass,
  children,
}: {
  title: string;
  summary?: React.ReactNode;
  toneClass: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-md border bg-background">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Users className={cn("h-4 w-4", toneClass)} />
          {title}
        </span>
        <span className="flex items-center gap-2 text-xs font-semibold">
          {summary}
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div className="border-t p-3">{children}</div>
    </details>
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
  const cobros: Cobro[] = data?.cobros ?? [];
  const abonosDelDia: PagoDelDia[] = data?.pagos ?? [];
  const [desembolsosPendientes, setDesembolsosPendientes] = useState<DesembolsoRenovacionPendiente[]>([]);
  const [loadingDesembolsos, setLoadingDesembolsos] = useState(true);
  const [confirmandoDesembolsoId, setConfirmandoDesembolsoId] = useState<number | null>(null);
  const cargarDesembolsosPendientes = useCallback(async () => {
    setLoadingDesembolsos(true);
    try {
      const response = await apiFetch(`/confirmaciones-movimientos/gestor?fecha=${fecha}`);
      if (!response.ok) throw new Error();
      setDesembolsosPendientes(await response.json());
    } catch {
      toast.error("No se pudieron cargar los desembolsos pendientes.");
    } finally {
      setLoadingDesembolsos(false);
    }
  }, [fecha]);
  useEffect(() => {
    cargarDesembolsosPendientes();
  }, [cargarDesembolsosPendientes]);
  const confirmarDesembolso = async (desembolso: DesembolsoRenovacionPendiente) => {
    if (!window.confirm(`¿Confirmas que entregaste $${Number(desembolso.monto || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })} al cliente?`)) return;
    setConfirmandoDesembolsoId(desembolso.id);
    try {
      const response = await apiFetch(`/confirmaciones-movimientos/${desembolso.id}/confirmar-desembolso`, { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(body.message || "No se pudo confirmar el desembolso.");
        return;
      }
      toast.success(body.message || "Desembolso confirmado.");
      setDesembolsosPendientes((actuales) => actuales.map((item) => item.id === desembolso.id ? body.data : item));
    } catch {
      toast.error("Error de conexión.");
    } finally {
      setConfirmandoDesembolsoId(null);
    }
  };
  const cancelarDesembolso = async (desembolso: DesembolsoRenovacionPendiente) => {
    if (!window.confirm("¿Confirmas que no lograste realizar este desembolso? El egreso seguirá registrado porque el recurso ya fue entregado al gestor.")) return;
    setConfirmandoDesembolsoId(desembolso.id);
    try {
      const response = await apiFetch(`/confirmaciones-movimientos/${desembolso.id}/cancelar-desembolso`, { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(body.message || "No se pudo cancelar el desembolso.");
        return;
      }
      toast.success(body.message || "Desembolso cancelado.");
      setDesembolsosPendientes((actuales) => actuales.map((item) => item.id === desembolso.id ? body.data : item));
    } catch {
      toast.error("Error de conexión.");
    } finally {
      setConfirmandoDesembolsoId(null);
    }
  };
  const pagosAdelantados: PagoDelDia[] = data?.pagos_anticipados ?? [];
  const rutaDelDia = cobros.filter((c) => c.categoria === "del_dia");
  const pagosAtrasados = cobros.filter((c) => c.categoria === "atrasado");
  const rutaFiltrada = filterBySearch(rutaDelDia, search, cobroSearchFields);
  const rutaPaginada = paginateItems(rutaFiltrada, page);
  const atrasadosControls = useTableControls();
  const atrasadosFiltrados = filterBySearch(pagosAtrasados, atrasadosControls.search, cobroSearchFields);
  const atrasadosPage = Math.min(
    atrasadosControls.page,
    Math.max(1, Math.ceil(atrasadosFiltrados.length / PAGE_SIZE)),
  );
  const atrasadosPaginados = paginateItems(atrasadosFiltrados, atrasadosPage);
  const creditosMora: CreditoMora[] = data?.creditos_mora ?? [];
  const moraControls = useTableControls();
  const moraFiltrada = filterBySearch(creditosMora, moraControls.search, (credito) => [
    credito.num_prog,
    credito.cliente?.nombre_completo,
    credito.grupo?.nombre_grupo,
    credito.dias_pago,
  ]);
  const moraPage = Math.min(
    moraControls.page,
    Math.max(1, Math.ceil(moraFiltrada.length / PAGE_SIZE)),
  );
  const moraPaginada = paginateItems(moraFiltrada, moraPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reporte Diario</h1>
          <p className="text-muted-foreground">
            Ruta de cobros del día
            {data?.dia_semana ? ` — ${labelDia(data.dia_semana)}` : ""}
            {" "}con pagos atrasados y mora por recuperar.
          </p>
        </div>
        <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-40" />
      </div>

      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
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

      {(loadingDesembolsos || desembolsosPendientes.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Desembolsos de préstamos y renovaciones</CardTitle>
            <p className="text-sm text-muted-foreground">
              Seguimiento de los desembolsos entregados al gestor en la fecha seleccionada.
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Folio</TableHead>
                  <TableHead>Cliente / Grupo</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingDesembolsos ? (
                  <TableRow><TableCell colSpan={7} className="h-20 text-center text-sm text-muted-foreground">Cargando desembolsos...</TableCell></TableRow>
                ) : desembolsosPendientes.map((desembolso) => (
                  <TableRow key={desembolso.id}>
                    <TableCell>{String(desembolso.fecha).slice(0, 10)}</TableCell>
                    <TableCell className="font-mono text-xs"><FolioLink folio={desembolso.num_prog} /></TableCell>
                    <TableCell className="font-medium">{desembolso.credito?.cliente?.nombre_completo || desembolso.credito?.grupo?.nombre_grupo || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{desembolso.motivo || "Desembolso"}</TableCell>
                    <TableCell className="text-right font-bold text-amber-700">${Number(desembolso.monto || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>
                      {desembolso.estado === "Confirmado" ? <Badge className="border-emerald-300 bg-emerald-200 text-emerald-900 hover:bg-emerald-200">Entregado al cliente</Badge>
                        : desembolso.estado === "PendienteReintegro" ? <Badge className="border-red-300 bg-red-100 text-red-900 hover:bg-red-100">Pendiente de reintegro</Badge>
                          : desembolso.estado === "Reintegrado" ? <Badge className="border-sky-300 bg-sky-100 text-sky-900 hover:bg-sky-100">Reintegrado a caja</Badge>
                            : desembolso.estado === "Cancelado" ? <Badge variant="outline" className="border-red-300 text-red-800">Cancelado</Badge>
                          : <Badge className="border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-100">Pendiente de entrega</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      {desembolso.estado === "EntregadoGestor" ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={() => confirmarDesembolso(desembolso)} disabled={confirmandoDesembolsoId === desembolso.id}>
                            {confirmandoDesembolsoId === desembolso.id ? "Confirmando..." : "Confirmar entrega"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => cancelarDesembolso(desembolso)} disabled={confirmandoDesembolsoId === desembolso.id}>Cancelar</Button>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">Sin acciones pendientes</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <PagosRegistradosSection pagos={abonosDelDia} loading={loading} />
      <PagosRegistradosSection pagos={pagosAdelantados} loading={loading} adelantados />

      <CobrosSection
        title="Ruta de cobros del día"
        description="Créditos programados para cobrar en la ruta de hoy."
        emptyMessage="No hay cobros programados para este día."
        search={search}
        onSearchChange={handleSearch}
        page={page}
        onPageChange={setPage}
        filtered={rutaFiltrada}
        paginated={rutaPaginada}
        loading={loading}
        onCobrar={onCobrar}
      />

      <CobrosSection
        title="Pagos atrasados"
        description="Créditos con cuotas vencidas de días anteriores."
        emptyMessage="No hay pagos atrasados pendientes."
        search={atrasadosControls.search}
        onSearchChange={atrasadosControls.handleSearch}
        page={atrasadosPage}
        onPageChange={atrasadosControls.setPage}
        filtered={atrasadosFiltrados}
        paginated={atrasadosPaginados}
        loading={loading}
        onCobrar={onCobrar}
      />

      <MoraSection
        search={moraControls.search}
        onSearchChange={moraControls.handleSearch}
        page={moraPage}
        onPageChange={moraControls.setPage}
        filtered={moraFiltrada}
        paginated={moraPaginada}
        loading={loading}
        onCobrar={onCobrar}
      />
    </div>
  );
}

function PagosRegistradosSection({
  pagos,
  loading,
  adelantados = false,
}: {
  pagos: PagoDelDia[];
  loading: boolean;
  adelantados?: boolean;
}) {
  const controls = useTableControls();
  const filtrados = filterBySearch(pagos, controls.search, (pago) => [
    pago.id, pago.num_prog, pago.credito?.cliente?.nombre_completo,
    pago.credito?.grupo?.nombre_grupo, pago.metodo_pago,
  ]);
  const page = Math.min(controls.page, Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE)));
  const monto = (pago: PagoDelDia) => Number(adelantados ? pago.monto_adelantado_hoy || 0 : pago.monto || 0);
  const money = (value: number) => `$${value.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{adelantados ? "Pagos adelantados" : "Abonos del día y reimpresión de tickets"}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {adelantados
            ? "Importes aplicados a cuotas futuras en la fecha seleccionada. Ya están incluidos en los abonos del día; el ticket muestra el pago completo."
            : "Pagos de la fecha seleccionada. Usa Reimprimir ticket al final de cada fila para obtener el comprobante."}
        </p>
        {!loading && <p className="font-semibold text-emerald-700">{pagos.length} pagos · {money(pagos.reduce((total, pago) => total + monto(pago), 0))}</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        <TableSearch placeholder="Buscar por folio, cliente o grupo..." value={controls.search} onChange={controls.handleSearch} />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Folio</TableHead>
              <TableHead>Cliente / Grupo</TableHead>
              <TableHead>Hora</TableHead>
              <TableHead>Método</TableHead>
              <TableHead className="text-right">{adelantados ? "Monto adelantado" : "Abono"}</TableHead>
              <TableHead className="text-right">Ticket</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Cargando pagos...</TableCell></TableRow>
            ) : filtrados.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                {controls.search ? "No se encontraron pagos." : adelantados ? "Sin pagos adelantados en esta fecha." : "Sin abonos registrados en esta fecha."}
              </TableCell></TableRow>
            ) : paginateItems(filtrados, page).map((pago) => (
              <TableRow key={pago.id}>
                <TableCell className="font-mono text-xs"><FolioLink folio={pago.credito?.num_prog ?? pago.num_prog} /></TableCell>
                <TableCell className="font-medium">{pago.credito?.cliente?.nombre_completo || pago.credito?.grupo?.nombre_grupo || "Cliente sin nombre"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{pago.hora ? String(pago.hora).slice(0, 5) : "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{pago.metodo_pago || "Efectivo"}</TableCell>
                <TableCell className="text-right font-bold text-emerald-700">{money(monto(pago))}</TableCell>
                <TableCell className="text-right">
                  <ReimprimirTicketPago pago={pago} seccion={adelantados ? "adelantados" : "abonos"} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination page={page} totalItems={filtrados.length} pageSize={PAGE_SIZE} onPageChange={controls.setPage} />
      </CardContent>
    </Card>
  );
}

function MoraSection({
  search,
  onSearchChange,
  page,
  onPageChange,
  filtered,
  paginated,
  loading,
  onCobrar,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  page: number;
  onPageChange: (value: number) => void;
  filtered: CreditoMora[];
  paginated: CreditoMora[];
  loading: boolean;
  onCobrar: (numProg: number) => void;
}) {
  return (
    <Card>
      <details className="group">
        <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          <CardHeader className="flex-row items-center justify-between gap-3 hover:bg-muted/40">
            <div>
              <CardTitle>Mora</CardTitle>
              <p className="text-sm text-muted-foreground">Créditos en mora asignados al gestor.</p>
            </div>
            <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          </CardHeader>
        </summary>
        <CardContent className="space-y-4 border-t pt-4">
          <TableSearch placeholder="Buscar por folio, cliente o grupo..." value={search} onChange={onSearchChange} />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folio</TableHead>
                <TableHead>Cliente / Grupo</TableHead>
                <TableHead>Día pago</TableHead>
                <TableHead className="text-center">Días mora</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">{search ? "No se encontraron créditos en mora." : "No hay créditos en mora."}</TableCell></TableRow>
              ) : (
                paginated.map((credito) => {
                  const pagadoHoy = Boolean(credito.pagado_hoy);
                  const nombre = credito.tipo_credito === "Grupal"
                    ? (credito.grupo?.nombre_grupo ?? "Grupo")
                    : (credito.cliente?.nombre_completo ?? "Cliente");
                  return (
                    <TableRow key={credito.num_prog} className={cn(pagadoHoy && "bg-emerald-100 text-emerald-950 hover:bg-emerald-200/80 [&_a]:text-emerald-800 [&_a]:decoration-emerald-600/50")}>
                      <TableCell className="font-mono text-xs"><FolioLink folio={credito.num_prog} /></TableCell>
                      <TableCell className="font-medium whitespace-nowrap"><BeneficiarioLink nombre={nombre} clienteId={credito.cliente?.id_cliente} grupoId={credito.grupo?.id} /></TableCell>
                      <TableCell className="text-xs">{credito.dias_pago ?? "—"}</TableCell>
                      <TableCell className="text-center text-xs font-medium text-red-800">{credito.dias_mora ? `${credito.dias_mora} d` : "—"}</TableCell>
                      <TableCell className="text-right text-xs font-bold text-red-700">${Number(credito.saldo_actual || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-center">{pagadoHoy ? <Badge className="border-emerald-300 bg-emerald-200 text-emerald-900 hover:bg-emerald-200">Pagado</Badge> : <Badge variant="outline" className="border-red-300 text-red-800">En mora</Badge>}</TableCell>
                      <TableCell className="text-right"><Button size="sm" className="h-8 text-xs" onClick={() => onCobrar(credito.num_prog)}>{pagadoHoy ? "Otro pago" : "Cobrar"}</Button></TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          {!loading && <TablePagination page={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={onPageChange} label="créditos en mora" />}
        </CardContent>
      </details>
    </Card>
  );
}

function CobrosSection({
  title,
  description,
  emptyMessage,
  search,
  onSearchChange,
  page,
  onPageChange,
  filtered,
  paginated,
  loading,
  onCobrar,
}: {
  title: string;
  description: string;
  emptyMessage: string;
  search: string;
  onSearchChange: (value: string) => void;
  page: number;
  onPageChange: (value: number) => void;
  filtered: Cobro[];
  paginated: Cobro[];
  loading: boolean;
  onCobrar: (numProg: number) => void;
}) {
  return (
    <Card>
      <details className="group">
        <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          <CardHeader className="flex-row items-center justify-between gap-3 hover:bg-muted/40">
            <div>
              <CardTitle>{title}</CardTitle>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          </CardHeader>
        </summary>
        <CardContent className="space-y-4 border-t pt-4">
        <TableSearch placeholder="Buscar por folio, cliente o grupo..." value={search} onChange={onSearchChange} />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Folio</TableHead>
              <TableHead>Cliente / Grupo</TableHead>
              <TableHead>Día pago</TableHead>
              <TableHead className="text-right">Valor ficha</TableHead>
              <TableHead className="text-right">A cobrar</TableHead>
              <TableHead className="text-right">Abonado hoy</TableHead>
              <TableHead className="text-center">Cuotas pend.</TableHead>
              <TableHead className="text-center">Atraso</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">Cargando...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                  {search ? "No se encontraron cobros." : emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((c) => {
                const isGrupal = c.tipo_credito === "Grupal";
                const nombre = isGrupal
                  ? (c.grupo?.nombre_grupo ?? "Grupo")
                  : (c.cliente?.nombre_completo ?? "Cliente");
                const montoAbonadoHoy = Number(c.monto_abonado_hoy || 0);
                const pagadoHoy = montoAbonadoHoy >= Number(c.monto_a_cobrar || 0) - 0.009;

                return (
                  <TableRow
                    key={c.num_prog}
                    className={cn(
                      pagadoHoy && "bg-emerald-100 text-emerald-950 hover:bg-emerald-200/80 [&_a]:text-emerald-800 [&_a]:decoration-emerald-600/50",
                    )}
                  >
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
                    <TableCell className="text-right text-xs">
                      ${Number(c.valor_ficha || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-xs font-bold text-primary">
                      ${Number(c.monto_a_cobrar || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-xs font-bold text-emerald-700">
                      {montoAbonadoHoy > 0
                        ? `$${montoAbonadoHoy.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-center text-xs">
                      {c.cuotas_pendientes}
                      {(c.cuotas_atrasadas ?? 0) > 0 && (
                        <span className="text-amber-700"> ({c.cuotas_atrasadas} atr.)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-xs">
                      {(c.dias_atraso ?? 0) > 0 ? (
                        <span className="text-amber-800 font-medium">{c.dias_atraso} d</span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {pagadoHoy ? (
                        <Badge className="border-emerald-300 bg-emerald-200 text-emerald-900 hover:bg-emerald-200">
                          Pagado
                        </Badge>
                      ) : montoAbonadoHoy > 0 ? (
                        <Badge className="border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-100">
                          Abono parcial
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pendiente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" className="h-8 text-xs" onClick={() => onCobrar(c.num_prog)}>
                        {pagadoHoy ? "Otro pago" : "Cobrar"}
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
            onPageChange={onPageChange}
            label="cobros"
          />
        )}
        </CardContent>
      </details>
    </Card>
  );
}
