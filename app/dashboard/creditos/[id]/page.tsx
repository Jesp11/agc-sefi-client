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
  History
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
        if (res.ok) {
          setCredito(data);
        } else {
          toast.error("No se pudo cargar la información del crédito");
        }
      } catch (error) {
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button onClick={() => router.back()} variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground/90">Detalles del Crédito</h1>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100">
                Crédito Activo
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
              <Hash className="h-3.5 w-3.5" /> Folio #{credito.num_prog}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="h-10 px-4 font-semibold shadow-lg shadow-primary/20">
            <ClipboardCheck className="mr-2 h-4 w-4" /> Registrar Pago
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Info Card */}
        <Card className="md:col-span-2 shadow-sm border-muted/40 overflow-hidden">
          <CardHeader className="bg-muted/30 border-b pb-3">
            <CardTitle className="text-base flex items-center gap-2 font-bold">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              Información del Contrato
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tipo de Crédito</p>
                <div className="flex items-center gap-2 text-sm font-medium">
                  {credito.tipo_credito === 'Individual' ? <User className="h-4 w-4 text-primary" /> : <Users className="h-4 w-4 text-primary" />}
                  {credito.tipo_credito}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ciclo</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-bold">{credito.ciclo}</Badge>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Día de Pago</p>
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Clock className="h-4 w-4" />
                  {credito.dias_pago || "N/A"}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Fecha de Inicio</p>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {credito.fecha_otorgacion || "N/A"}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">ID Folio</p>
                <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                  #{credito.num_prog}
                </div>
              </div>
              
              <div className="col-span-full pt-4 mt-2 border-t grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Beneficiario</p>
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30 h-full">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {credito.tipo_credito === 'Individual' ? <User className="h-5 w-5 text-primary" /> : <Users className="h-5 w-5 text-primary" />}
                      </div>
                      <div>
                        <p className="font-bold text-sm leading-tight">
                          {credito.tipo_credito === 'Individual' 
                            ? credito.cliente?.nombre_completo 
                            : credito.grupo?.nombre_grupo}
                        </p>
                        <p className="text-[10px] text-muted-foreground">ID: {credito.id_cliente || credito.id_grupo}</p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-[10px] font-bold text-primary h-7"
                      onClick={() => {
                        if (credito.tipo_credito === 'Individual') {
                          router.push(`/dashboard/clientes/${credito.id_cliente}`);
                        } else {
                          router.push(`/dashboard/grupos/${credito.id_grupo}`);
                        }
                      }}
                    >
                      Perfil
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Asesor Responsable</p>
                  <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30 h-full">
                    <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold text-sm leading-tight">{credito.asesor?.nombre_asesor || "SIN ASESOR"}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">Agente de Crédito</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Totals Card */}
        <Card className="shadow-sm border-muted/40 overflow-hidden h-fit">
          <CardHeader className="bg-muted/30 border-b pb-3">
            <CardTitle className="text-base flex items-center gap-2 font-bold">
              <DollarSign className="h-4 w-4 text-primary" />
              Estado Financiero
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Monto Otorgado</p>
              <p className="text-3xl font-bold text-foreground">${credito.monto_otorgado}</p>
            </div>
            
            <div className="space-y-3 pt-4 border-t border-dashed">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Plazos</span>
                <span className="text-sm font-bold">{credito.plazos} semanas</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Interés</span>
                <span className="text-sm font-bold text-orange-600">${credito.interes}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-sm font-bold uppercase">Total a Liquidar</span>
                <span className="text-xl font-bold text-primary">${credito.total}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section */}
      <div className="pt-4">
        <Tabs defaultValue="amortizacion" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted/40 p-1 h-12">
            <TabsTrigger value="amortizacion" className="flex items-center gap-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <TableIcon className="h-4 w-4" />
              Tabla de Amortización
            </TabsTrigger>
            <TabsTrigger value="historial" className="flex items-center gap-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <History className="h-4 w-4" />
              Historial de Pagos
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="amortizacion" className="mt-4">
            <Card className="border-muted/40 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <TableIcon className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">Tabla de Amortización</h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-2">
                  Esta sección se encuentra en desarrollo. Próximamente podrás consultar el calendario de pagos detallado.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="historial" className="mt-4">
            <Card className="border-muted/40 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <History className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">Historial de Pagos</h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-2">
                  Esta sección se encuentra en desarrollo. Próximamente podrás ver los pagos realizados y pendientes.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
