"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, User, Users, CreditCard, Component, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { fmtFecha } from "@/lib/utils";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { GroupCreditForm } from "@/components/group-credit-form";

export default function GrupoDetallePage() {
  const { id } = useParams();
  const router = useRouter();
  const [grupo, setGrupo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false);

  const fetchGrupo = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/grupos/${id}`);
      const data = await res.json();
      if (res.ok) {
        setGrupo(data);
      } else {
        toast.error("No se encontró el grupo");
        router.push("/dashboard/grupos");
      }
    } catch (error) {
      toast.error("Error al cargar detalles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrupo();
  }, [id]);

  if (loading) return <div className="p-8 text-center">Cargando detalles del grupo...</div>;
  if (!grupo) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Component className="h-8 w-8 text-primary" />
              {grupo.nombre_grupo}
            </h1>
            <p className="text-muted-foreground italic text-sm">ID Grupo: {grupo.id_grupo || grupo.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-lg px-4 py-1 border-primary/20 bg-primary/5">
            {grupo.clientes?.length || 0} Integrantes
          </Badge>
          
          <Dialog open={isCreditDialogOpen} onOpenChange={setIsCreditDialogOpen}>
            <DialogTrigger
              render={
                <Button size="sm" className="h-10 px-4 font-bold">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Nuevo Crédito
                </Button>
              }
            />
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Otorgar Crédito Grupal</DialogTitle>
              </DialogHeader>
              <GroupCreditForm 
                group={grupo} 
                onSuccess={() => {
                  setIsCreditDialogOpen(false);
                  fetchGrupo();
                }}
                onCancel={() => setIsCreditDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Tabs defaultValue="integrantes" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="integrantes">Integrantes</TabsTrigger>
            <TabsTrigger value="creditos">Créditos</TabsTrigger>
            <TabsTrigger value="asesor">Asesor</TabsTrigger>
          </TabsList>

          <TabsContent value="integrantes" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5" /> Integrantes del Grupo
                </CardTitle>
                <CardDescription>Lista de clientes que conforman este grupo de confianza.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Cliente</TableHead>
                      <TableHead>Nombre Completo</TableHead>
                      <TableHead>CURP</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grupo.clientes && grupo.clientes.length > 0 ? (
                      grupo.clientes.map((cliente: any) => (
                        <TableRow key={cliente.id_cliente}>
                          <TableCell className="font-mono text-xs">{cliente.id_cliente}</TableCell>
                          <TableCell className="font-medium">{cliente.nombre_completo}</TableCell>
                          <TableCell className="text-xs">{cliente.curp}</TableCell>
                          <TableCell>{cliente.telefono}</TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => router.push(`/dashboard/clientes/${cliente.id_cliente}`)}
                            >
                              Ver Perfil
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">No hay integrantes en este grupo</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="creditos" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="h-5 w-5" /> Historial de Créditos Grupales
                </CardTitle>
                <CardDescription>Ciclos de crédito otorgados a la sociedad del grupo.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ciclo</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Día Pago</TableHead>
                      <TableHead>Plazos</TableHead>
                      <TableHead>Monto Otorgado</TableHead>
                      <TableHead>Interés</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grupo.creditos && grupo.creditos.length > 0 ? (
                      grupo.creditos.map((credito: any) => (
                        <TableRow key={credito.id}>
                          <TableCell className="font-bold">Ciclo {credito.ciclo}</TableCell>
                          <TableCell className="text-xs">{fmtFecha(credito.fecha_otorgacion)}</TableCell>
                          <TableCell>{credito.dias_pago}</TableCell>
                          <TableCell className="text-center">{credito.plazos} sem</TableCell>
                          <TableCell className="font-bold">${credito.monto_otorgado}</TableCell>
                          <TableCell className="text-muted-foreground">${credito.interes}</TableCell>
                          <TableCell className="font-bold text-primary">${credito.total}</TableCell>
                          <TableCell>
                            <Badge variant={credito.estado === 'Activo' ? 'default' : 'secondary'}>
                              {credito.estado}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">Sin historial de créditos</TableCell>
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
                <CardTitle className="text-lg">Asesor del Grupo</CardTitle>
              </CardHeader>
              <CardContent>
                {grupo.asesor ? (
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-lg">{grupo.asesor.nombre_asesor}</p>
                      <p className="text-muted-foreground">ID Asesor: {grupo.asesor.id}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">No hay un asesor asignado a este grupo.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
