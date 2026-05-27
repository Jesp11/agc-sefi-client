"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, User, Phone, MapPin, Briefcase, ShieldCheck, ClipboardList, CreditCard, PlusCircle, Edit, Component, Cake } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CreditForm } from "@/components/credit-form";
import { Badge } from "../../../../components/ui/badge";
import { fmtFecha } from "@/lib/utils";

export default function ClienteDetallePage() {
  const { id } = useParams();
  const router = useRouter();
  const [cliente, setCliente] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false);

  const fetchCliente = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/clientes/${id}`);
      const data = await res.json();
      if (res.ok) {
        setCliente(data);
      } else {
        toast.error("No se encontró el cliente");
        router.push("/dashboard/clientes");
      }
    } catch (error) {
      toast.error("Error al cargar detalles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCliente();
  }, [id, router]);

  if (loading) return <div className="p-8 text-center">Cargando detalles del cliente...</div>;
  if (!cliente) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{cliente.nombre_completo}</h1>
            <p className="text-muted-foreground font-mono text-sm">{cliente.id_cliente}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreditDialogOpen} onOpenChange={setIsCreditDialogOpen}>
            <DialogTrigger
              render={
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Nuevo Crédito
                </Button>
              }
            />
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Otorgar Crédito Individual</DialogTitle>
              </DialogHeader>
              <CreditForm 
                client={cliente} 
                onSuccess={() => {
                  setIsCreditDialogOpen(false);
                  fetchCliente();
                }} 
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="domicilio">Domicilio</TabsTrigger>
          <TabsTrigger value="laboral">Laboral</TabsTrigger>
          <TabsTrigger value="creditos">Créditos</TabsTrigger>
          <TabsTrigger value="avales">Avales</TabsTrigger>
          <TabsTrigger value="referencias">Referencias</TabsTrigger>
          <TabsTrigger value="asesor">Asesor</TabsTrigger>
        </TabsList>

        {/* Personal */}
        <TabsContent value="personal" className="mt-4">
          <Card>
            <CardContent className="pt-6 grid grid-cols-2 gap-6 text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium">Grupo</span>
                {cliente.grupos && cliente.grupos.length > 0 ? (
                  <span className="font-bold text-primary flex items-center gap-1">
                    <Component className="h-3 w-3" /> {cliente.grupos[0].nombre_grupo}
                  </span>
                ) : (
                  <Badge variant="outline" className="w-fit">Individual</Badge>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium">Teléfono</span>
                <span className="flex items-center gap-2"><Phone className="h-3 w-3" /> {cliente.telefono}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium">CURP</span>
                <span className="font-mono">{cliente.curp}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium">Clave de Elector</span>
                <span className="font-mono">{cliente.clave_elector}</span>
              </div>
              {cliente.fecha_nacimiento && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground font-medium">Fecha de Nacimiento</span>
                  <span className="flex items-center gap-2">
                    <Cake className="h-3 w-3" />
                    {fmtFecha(cliente.fecha_nacimiento)}
                  </span>
                </div>
              )}
              {cliente.created_at && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground font-medium">Cliente desde</span>
                  <span>{fmtFecha(cliente.created_at.split("T")[0])}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Domicilio */}
        <TabsContent value="domicilio" className="mt-4">
          <Card>
            <CardContent className="pt-6 grid grid-cols-1 gap-6 text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium">Dirección</span>
                <span className="flex items-center gap-2"><MapPin className="h-3 w-3" /> {cliente.direccion}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium">Entre Calle y Calle</span>
                <span className="flex items-center gap-2"><MapPin className="h-3 w-3" /> {cliente.entre_calles}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Laboral */}
        <TabsContent value="laboral" className="mt-4">
          <Card>
            <CardContent className="pt-6 grid grid-cols-2 gap-6 text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium">Ocupación</span>
                <span className="flex items-center gap-2"><Briefcase className="h-3 w-3" /> {cliente.ocupacion}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium">Teléfono de Trabajo</span>
                <span className="flex items-center gap-2"><Phone className="h-3 w-3" /> {cliente.telefono_trabajo}</span>
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <span className="text-xs text-muted-foreground font-medium">Dirección de Trabajo</span>
                <span className="flex items-center gap-2"><MapPin className="h-3 w-3" /> {cliente.direccion_trabajo}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Créditos */}
        <TabsContent value="creditos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5" /> Historial de Créditos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ciclo</TableHead>
                    <TableHead>Dia Pago</TableHead>
                    <TableHead>Asesor</TableHead>
                    <TableHead>Valor Ficha</TableHead>
                    <TableHead>Plazos</TableHead>
                    <TableHead>Monto Otorgado</TableHead>
                    <TableHead>Interés</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cliente.creditos && cliente.creditos.length > 0 ? (
                    cliente.creditos.map((c: any, index: number) => (
                      <TableRow key={c.id_credito || c.id || index}>
                        <TableCell>{c.ciclo}</TableCell>
                        <TableCell>{c.dias_pago}</TableCell>
                        <TableCell>{c.asesor?.nombre_asesor || "N/A"}</TableCell>
                        <TableCell className="font-bold">${c.valor_ficha}</TableCell>
                        <TableCell>{c.plazos} sem</TableCell>
                        <TableCell>${c.monto_otorgado}</TableCell>
                        <TableCell>${c.interes}</TableCell>
                        <TableCell>${c.total}</TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger render={<Button variant="outline" size="sm">Ver Tabla</Button>} />
                            <DialogContent className="sm:max-w-[600px]">
                              <DialogHeader>
                                <DialogTitle>Tabla de Amortización - Ciclo {c.ciclo}</DialogTitle>
                                <DialogDescription>Monto: ${c.monto_otorgado} | Total a pagar: ${c.total}</DialogDescription>
                              </DialogHeader>
                              <div className="max-h-[400px] overflow-y-auto border rounded-md">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="w-[80px]">Pago #</TableHead>
                                      <TableHead>Fecha Sugerida</TableHead>
                                      <TableHead className="text-right">Monto</TableHead>
                                      <TableHead className="text-right">Saldo Restante</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {c.tabla_amortizacion ? (
                                      (typeof c.tabla_amortizacion === 'string' ? JSON.parse(c.tabla_amortizacion) : c.tabla_amortizacion).map((p: any) => (
                                        <TableRow key={p.pago_numero}>
                                          <TableCell className="font-medium">#{p.pago_numero}</TableCell>
                                          <TableCell className="text-xs">{p.fecha_sugerida}</TableCell>
                                          <TableCell className="text-right font-bold">${p.monto_pago}</TableCell>
                                          <TableCell className="text-right text-muted-foreground text-xs">${p.saldo_restante}</TableCell>
                                        </TableRow>
                                      ))
                                    ) : (
                                      <TableRow><TableCell colSpan={4} className="text-center p-4">No hay tabla disponible</TableCell></TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow key="empty-creditos">
                      <TableCell colSpan={9} className="text-center">Sin créditos registrados</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Avales */}
        <TabsContent value="avales" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="h-5 w-5" /> Avales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {cliente.avales && cliente.avales.length > 0 ? (
                  cliente.avales.map((a: any, index: number) => (
                    <div key={a.id_aval || a.id || index} className="border rounded-lg p-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div className="col-span-2 font-semibold text-base">{a.nombre}</div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-muted-foreground">Parentesco</span>
                        <span>{a.parentesco || "—"}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-muted-foreground">Teléfono</span>
                        <span>{a.telefono || "—"}</span>
                      </div>
                      <div className="flex flex-col gap-0.5 col-span-2">
                        <span className="text-xs text-muted-foreground">Dirección</span>
                        <span>{a.direccion || "—"}</span>
                      </div>
                      {(a.ocupacion_laboral || a.empresa || a.tiempo_conocer) && (
                        <>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-muted-foreground">Ocupación Laboral</span>
                            <span>{a.ocupacion_laboral || "—"}</span>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-muted-foreground">Empresa / Negocio</span>
                            <span>{a.empresa || "—"}</span>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-muted-foreground">Tiempo de conocerse</span>
                            <span>{a.tiempo_conocer || "—"}</span>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4 text-sm">Sin avales registrados</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Referencias */}
        <TabsContent value="referencias" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardList className="h-5 w-5" /> Referencias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {cliente.referencias && cliente.referencias.length > 0 ? (
                  cliente.referencias.map((r: any, index: number) => (
                    <div key={r.id_referencia || r.id || index} className="border rounded-lg p-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div className="col-span-2 font-semibold text-base">{r.nombre}</div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-muted-foreground">Parentesco</span>
                        <span>{r.parentesco || "—"}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-muted-foreground">Teléfono</span>
                        <span>{r.telefono || "—"}</span>
                      </div>
                      <div className="flex flex-col gap-0.5 col-span-2">
                        <span className="text-xs text-muted-foreground">Dirección</span>
                        <span>{r.direccion || "—"}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-muted-foreground">Tipo</span>
                        <span>{r.tipo_referencia || "—"}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-muted-foreground">Tiempo de conocerse</span>
                        <span>{r.años_amistad ? `${r.años_amistad} año(s)` : "—"}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4 text-sm">Sin referencias registradas</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Asesor */}
        <TabsContent value="asesor" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {cliente.asesor ? (
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">{cliente.asesor.nombre_asesor}</p>
                    <p className="text-muted-foreground text-sm">ID: {cliente.asesor.id_asesor ?? cliente.asesor.id}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No tiene asesor asignado.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
