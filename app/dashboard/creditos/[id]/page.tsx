"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  User,
  Users,
  Calendar,
  DollarSign,
  Hash,
  ClipboardCheck,
  TrendingUp,
  Clock,
  Table as TableIcon,
  History,
  Wrench,
  CalendarCheck,
  CalendarX,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { fmtFecha } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const getDiaSemana = (dateStr: string) => {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  return ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"][new Date(y, m - 1, d).getDay()];
};

const calcFechaUltimoPago = (first: string, plazos: number): string => {
  if (!first || !plazos) return "";
  const [y, m, d] = first.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + (plazos - 1) * 7);
  return date.toISOString().split("T")[0];
};

const generateSchedule = (fechaPrimerPago: string, plazos: number, valorFicha: number) => {
  if (!fechaPrimerPago || !plazos || !valorFicha) return [];
  const [y, m, d] = fechaPrimerPago.split("-").map(Number);
  return Array.from({ length: plazos }, (_, i) => {
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + i * 7);
    return {
      semana: i + 1,
      fecha: date.toISOString().split("T")[0],
      dia: getDiaSemana(date.toISOString().split("T")[0]),
      pago: valorFicha,
    };
  });
};

const estadoStyles: Record<string, string> = {
  Activo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Finalizado: "bg-blue-50 text-blue-700 border-blue-200",
  Cancelado: "bg-red-50 text-red-700 border-red-200",
};

export default function CreditoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();
  const [credito, setCredito] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCredito = async () => {
      try {
        const res = await apiFetch(`/creditos/${id}`);
        const data = await res.json();
        if (res.ok) setCredito(data);
        else toast.error("No se pudo cargar la información del crédito");
      } catch {
        toast.error("Error al conectar con el servidor");
      } finally {
        setLoading(false);
      }
    };
    fetchCredito();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        <p className="text-muted-foreground animate-pulse">Cargando detalles del crédito...</p>
      </div>
    );
  }

  if (!credito) {
    return (
      <div className="text-center py-10">
        <h2 className="text-xl font-semibold">Crédito no encontrado</h2>
        <Button onClick={() => router.back()} variant="ghost" className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
      </div>
    );
  }

  const fechaUltimoPago = calcFechaUltimoPago(credito.fecha_primer_pago, credito.plazos);
  const schedule = generateSchedule(credito.fecha_primer_pago, credito.plazos, credito.valor_ficha);
  const diaDesembolso = getDiaSemana(credito.fecha_otorgacion);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button onClick={() => router.back()} variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-foreground/90">Detalle del Crédito</h1>
              <Badge className={estadoStyles[credito.estado] ?? "bg-muted text-muted-foreground"}>
                {credito.estado}
              </Badge>
              {credito.es_personalizado && (
                <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 gap-1">
                  <Wrench className="h-3 w-3" /> Personalizado
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Hash className="h-3.5 w-3.5" /> Folio #{credito.num_prog}
            </p>
          </div>
        </div>
        <Button size="sm" className="h-10 px-4 font-semibold shadow-sm">
          <ClipboardCheck className="mr-2 h-4 w-4" /> Registrar Pago
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Contract Info */}
        <Card className="md:col-span-2 shadow-sm border-muted/40">
          <CardHeader className="bg-muted/30 border-b pb-3">
            <CardTitle className="text-base flex items-center gap-2 font-bold">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              Información del Contrato
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tipo</p>
                <div className="flex items-center gap-2 text-sm font-medium">
                  {credito.tipo_credito === "Individual"
                    ? <User className="h-4 w-4 text-primary" />
                    : <Users className="h-4 w-4 text-primary" />}
                  {credito.tipo_credito}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ciclo</p>
                <Badge variant="outline" className="font-bold">{credito.ciclo}</Badge>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Día de Pago</p>
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Clock className="h-4 w-4" />
                  {credito.dias_pago || "—"}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Fecha de Desembolso</p>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{fmtFecha(credito.fecha_otorgacion)}</span>
                  {diaDesembolso && <span className="text-xs text-muted-foreground">({diaDesembolso})</span>}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Fecha Primer Pago</p>
                <div className="flex items-center gap-2 text-sm">
                  <CalendarCheck className="h-4 w-4 text-emerald-600" />
                  <span>{fmtFecha(credito.fecha_primer_pago)}</span>
                  {credito.fecha_primer_pago && (
                    <span className="text-xs text-muted-foreground">({getDiaSemana(credito.fecha_primer_pago)})</span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Fecha Último Pago</p>
                <div className="flex items-center gap-2 text-sm">
                  <CalendarX className="h-4 w-4 text-rose-500" />
                  <span>{fmtFecha(fechaUltimoPago)}</span>
                  {fechaUltimoPago && (
                    <span className="text-xs text-muted-foreground">({getDiaSemana(fechaUltimoPago)})</span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tasa</p>
                {credito.tasa_asignada ? (
                  <div className="flex items-center gap-2 text-sm font-mono font-semibold">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    {credito.tasa_asignada}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-600">
                    <Wrench className="h-4 w-4" />
                    Personalizado
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Folio</p>
                <p className="text-sm font-mono text-muted-foreground">#{credito.num_prog}</p>
              </div>

              {/* Beneficiary + Asesor */}
              <div className="col-span-full pt-4 mt-1 border-t grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Beneficiario</p>
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {credito.tipo_credito === "Individual"
                          ? <User className="h-5 w-5 text-primary" />
                          : <Users className="h-5 w-5 text-primary" />}
                      </div>
                      <div>
                        <p className="font-bold text-sm leading-tight">
                          {credito.tipo_credito === "Individual"
                            ? credito.cliente?.nombre_completo
                            : credito.grupo?.nombre_grupo}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          ID: {credito.id_cliente || credito.id_grupo}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[10px] font-bold text-primary h-7"
                      onClick={() => {
                        if (credito.tipo_credito === "Individual") {
                          router.push(`/dashboard/clientes/${credito.id_cliente}`);
                        } else {
                          router.push(`/dashboard/grupos/${credito.id_grupo}`);
                        }
                      }}
                    >
                      Ver Perfil
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Asesor Responsable</p>
                  <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                    <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold text-sm leading-tight">{credito.asesor?.nombre_asesor || "Sin asesor"}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">Agente de Crédito</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Card */}
        <Card className="shadow-sm border-muted/40 h-fit">
          <CardHeader className="bg-muted/30 border-b pb-3">
            <CardTitle className="text-base flex items-center gap-2 font-bold">
              <DollarSign className="h-4 w-4 text-primary" />
              Estado Financiero
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-5">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Monto Otorgado</p>
              <p className="text-3xl font-bold">${Number(credito.monto_otorgado).toLocaleString()}</p>
            </div>

            <div className="space-y-3 pt-4 border-t border-dashed">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider flex items-center gap-1">
                  <CreditCard className="h-3 w-3" /> Pago Semanal
                </span>
                <span className="text-sm font-bold">${Number(credito.valor_ficha).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Plazos</span>
                <span className="text-sm font-bold">{credito.plazos} semanas</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Interés</span>
                <span className="text-sm font-bold text-orange-600">
                  ${Number(credito.interes).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-sm font-bold uppercase">Total a Liquidar</span>
                <span className="text-xl font-bold text-primary">${Number(credito.total).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="pt-2">
        <Tabs defaultValue="amortizacion" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted/40 p-1 h-12">
            <TabsTrigger value="amortizacion" className="flex items-center gap-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <TableIcon className="h-4 w-4" />
              Calendario de Pagos
            </TabsTrigger>
            <TabsTrigger value="historial" className="flex items-center gap-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <History className="h-4 w-4" />
              Historial de Pagos
            </TabsTrigger>
          </TabsList>

          {/* Amortization schedule */}
          <TabsContent value="amortizacion" className="mt-4">
            <Card className="border-muted/40 shadow-sm overflow-hidden">
              {schedule.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-16 text-center">#</TableHead>
                        <TableHead>Fecha de Pago</TableHead>
                        <TableHead>Día</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedule.map((row) => {
                        const isPast = new Date(row.fecha + "T00:00:00") < new Date();
                        return (
                          <TableRow key={row.semana} className={isPast ? "opacity-50" : "hover:bg-muted/30"}>
                            <TableCell className="text-center font-mono text-xs text-muted-foreground">{row.semana}</TableCell>
                            <TableCell className="text-sm">{fmtFecha(row.fecha)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{row.dia}</TableCell>
                            <TableCell className="text-right font-semibold text-sm">${Number(row.pago).toLocaleString()}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <TableIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-semibold">Sin fecha de primer pago registrada</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mt-2">
                    El calendario se genera automáticamente cuando se registra la fecha de primer pago.
                  </p>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          {/* Payment history */}
          <TabsContent value="historial" className="mt-4">
            <Card className="border-muted/40 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <History className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold">Historial de Pagos</h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-2">
                  Próximamente podrás registrar y consultar los pagos realizados.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
