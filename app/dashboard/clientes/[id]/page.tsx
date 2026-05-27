"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, User, Phone, MapPin, Briefcase, ShieldCheck, ClipboardList, CreditCard, PlusCircle, Edit, Component } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CreditForm } from "@/components/credit-form";
import { Badge } from "../../../../components/ui/badge";

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

      <div className="grid gap-6 md:grid-cols-3">
        {/* Información General */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              Información General
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground font-medium">Grupo</span>
              {cliente.grupos && cliente.grupos.length > 0 ? (
                <div className="flex items-center gap-2">
                  <Component className="h-3 w-3 text-primary" />
                  <span className="font-bold text-primary">{cliente.grupos[0].nombre_grupo}</span>
                </div>
              ) : (
                <Badge variant="outline" className="w-fit">Individual</Badge>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground font-medium">CURP</span>
              <span>{cliente.curp}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground font-medium">Clave Elector</span>
              <span className="flex items-center gap-2">
                {cliente.clave_elector}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground font-medium">Teléfono</span>
              <span className="flex items-center gap-2">
                <Phone className="h-3 w-3" /> {cliente.telefono}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground font-medium">Dirección</span>
              <span className="flex items-center gap-2">
                <MapPin className="h-3 w-3" /> {cliente.direccion}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground font-medium">Entre Calle y Calle</span>
              <span className="flex items-center gap-2">
                <MapPin className="h-3 w-3" /> {cliente.entre_calles}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground font-medium">Ocupación</span>
              <span className="flex items-center gap-2">
                <Briefcase className="h-3 w-3" /> {cliente.ocupacion}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground font-medium">Dirección de Trabajo</span>
              <span className="flex items-center gap-2">
                <MapPin className="h-3 w-3" /> {cliente.direccion_trabajo}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground font-medium">Teléfono de Trabajo</span>
              <span className="flex items-center gap-2">
                <Phone className="h-3 w-3" /> {cliente.telefono_trabajo}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Tabs de Información Relacionada */}
        <div className="md:col-span-2">
          <Tabs defaultValue="creditos" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="creditos">Créditos</TabsTrigger>
              <TabsTrigger value="avales">Avales</TabsTrigger>
              <TabsTrigger value="referencias">Referencias</TabsTrigger>
              <TabsTrigger value="asesor">Asesor</TabsTrigger>
            </TabsList>

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
                        <TableHead>Interes</TableHead>
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
                                <DialogTrigger render={
                                  <Button variant="outline" size="sm">
                                    Ver Tabla
                                  </Button>
                                } />
                                <DialogContent className="sm:max-w-[600px]">
                                  <DialogHeader>
                                    <DialogTitle>Tabla de Amortización - Ciclo {c.ciclo}</DialogTitle>
                                    <DialogDescription>
                                      Monto: ${c.monto_otorgado} | Total a pagar: ${c.total}
                                    </DialogDescription>
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
                                          (typeof c.tabla_amortizacion === 'string' 
                                            ? JSON.parse(c.tabla_amortizacion) 
                                            : c.tabla_amortizacion).map((p: any) => (
                                            <TableRow key={p.pago_numero}>
                                              <TableCell className="font-medium">#{p.pago_numero}</TableCell>
                                              <TableCell className="text-xs">{p.fecha_sugerida}</TableCell>
                                              <TableCell className="text-right font-bold">${p.monto_pago}</TableCell>
                                              <TableCell className="text-right text-muted-foreground text-xs">${p.saldo_restante}</TableCell>
                                            </TableRow>
                                          ))
                                        ) : (
                                          <TableRow>
                                            <TableCell colSpan={4} className="text-center p-4">No hay tabla disponible</TableCell>
                                          </TableRow>
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

            <TabsContent value="avales" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ShieldCheck className="h-5 w-5" /> Avales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                   <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Dirección</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Parentesco</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cliente.avales && cliente.avales.length > 0 ? (
                        cliente.avales.map((a: any, index: number) => (
                          <TableRow key={a.id_aval || a.id || index}>
                            <TableCell className="font-medium">{a.nombre}</TableCell>
                            <TableCell className="text-xs">{a.direccion}</TableCell>
                            <TableCell>{a.telefono}</TableCell>
                            <TableCell>{a.parentesco}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow key="empty-avales">
                          <TableCell colSpan={4} className="text-center">Sin avales registrados</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="referencias" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ClipboardList className="h-5 w-5" /> Referencias
                  </CardTitle>
                </CardHeader>
                <CardContent>
                   <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Parentesco</TableHead>
                        <TableHead>Dirección</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead> Tiempo de conocerse </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cliente.referencias && cliente.referencias.length > 0 ? (
                        cliente.referencias.map((r: any, index: number) => (
                          <TableRow key={r.id_referencia || r.id || index}>
                            <TableCell className="font-medium">{r.nombre}</TableCell>
                            <TableCell>{r.parentesco}</TableCell>
                            <TableCell>{r.direccion}</TableCell>
                            <TableCell>{r.telefono}</TableCell>
                            <TableCell>{r.años_amistad}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow key="empty-referencias">
                          <TableCell colSpan={5} className="text-center">Sin referencias registradas</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="asesor" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Asesor Asignado</CardTitle>
                </CardHeader>
                <CardContent>
                  {cliente.asesor ? (
                    <div className="flex items-center gap-4">
                      <div className="bg-primary/10 p-3 rounded-full">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-lg">{cliente.asesor.nombre_asesor}</p>
                        <p className="text-muted-foreground">ID Asesor: {cliente.asesor.id_asesor ?? cliente.asesor.id}</p>
                      </div>
                    </div>
                  ) : (
                    <p>No tiene asesor asignado directamente.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
