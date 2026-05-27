"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ArrowLeft, User, Users, CreditCard, Component, PlusCircle, UserMinus, UserPlus, Search } from "lucide-react";
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
  const [isAddClientDialogOpen, setIsAddClientDialogOpen] = useState(false);
  const [clienteActionLoading, setClienteActionLoading] = useState(false);

  const [todosClientes, setTodosClientes] = useState<any[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [clienteSearch, setClienteSearch] = useState("");

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
    } catch {
      toast.error("Error al cargar detalles");
    } finally {
      setLoading(false);
    }
  };

  const fetchClientesDisponibles = async () => {
    setLoadingClientes(true);
    try {
      const res = await apiFetch("/clientes");
      const data = await res.json();
      if (res.ok) setTodosClientes(data.data || data);
    } catch {
      toast.error("Error al cargar clientes");
    } finally {
      setLoadingClientes(false);
    }
  };

  const handleAgregarCliente = async (idCliente: string) => {
    setClienteActionLoading(true);
    try {
      const res = await apiFetch(`/grupos/${id}/agregar-cliente`, {
        method: "POST",
        body: JSON.stringify({ id_cliente: idCliente }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Cliente agregado al grupo");
        setIsAddClientDialogOpen(false);
        setClienteSearch("");
        fetchGrupo();
      } else {
        toast.error(data.message || "Error al agregar cliente");
      }
    } catch {
      toast.error("Error al conectar con el servidor");
    } finally {
      setClienteActionLoading(false);
    }
  };

  const handleQuitarCliente = async (idCliente: string) => {
    setClienteActionLoading(true);
    try {
      const res = await apiFetch(`/grupos/${id}/quitar-cliente`, {
        method: "POST",
        body: JSON.stringify({ id_cliente: idCliente }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Cliente removido del grupo");
        fetchGrupo();
      } else {
        toast.error(data.message || "Error al quitar cliente");
      }
    } catch {
      toast.error("Error al conectar con el servidor");
    } finally {
      setClienteActionLoading(false);
    }
  };

  useEffect(() => {
    fetchGrupo();
  }, [id]);

  const idsEnGrupo = new Set(grupo?.clientes?.map((c: any) => c.id_cliente) ?? []);

  const clientesFiltrados = todosClientes
    .filter((c) => !idsEnGrupo.has(c.id_cliente))
    .filter((c) => {
      const q = clienteSearch.toLowerCase();
      return (
        c.nombre_completo?.toLowerCase().includes(q) ||
        c.id_cliente?.toLowerCase().includes(q)
      );
    });

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

          <Dialog
            open={isAddClientDialogOpen}
            onOpenChange={(open) => {
              setIsAddClientDialogOpen(open);
              if (open) { setClienteSearch(""); fetchClientesDisponibles(); }
            }}
          >
            <DialogTrigger
              render={
                <Button size="sm" variant="outline" className="h-10 px-4">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Agregar Cliente
                </Button>
              }
            />
            <DialogContent className="sm:max-w-[640px]">
              <DialogHeader>
                <DialogTitle>Agregar Cliente al Grupo</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 pt-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o ID..."
                    value={clienteSearch}
                    onChange={(e) => setClienteSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="rounded-lg border overflow-hidden max-h-[360px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0">
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingClientes ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                            Cargando clientes...
                          </TableCell>
                        </TableRow>
                      ) : clientesFiltrados.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                            {clienteSearch
                              ? "No se encontraron clientes con ese criterio."
                              : "Todos los clientes ya pertenecen al grupo."}
                          </TableCell>
                        </TableRow>
                      ) : (
                        clientesFiltrados.map((cliente) => (
                          <TableRow key={cliente.id_cliente} className="hover:bg-muted/30">
                            <TableCell className="font-mono text-xs">{cliente.id_cliente}</TableCell>
                            <TableCell className="font-medium">{cliente.nombre_completo}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{cliente.telefono}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                disabled={clienteActionLoading}
                                onClick={() => handleAgregarCliente(cliente.id_cliente)}
                              >
                                Agregar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground">
                  El cliente heredará el asesor y días de pago del grupo.
                </p>
              </div>
            </DialogContent>
          </Dialog>

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
                onSuccess={() => { setIsCreditDialogOpen(false); fetchGrupo(); }}
                onCancel={() => setIsCreditDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

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
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/dashboard/clientes/${cliente.id_cliente}`)}
                            >
                              Ver Perfil
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              disabled={clienteActionLoading}
                              onClick={() => handleQuitarCliente(cliente.id_cliente)}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No hay integrantes en este grupo.
                      </TableCell>
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
                          <Badge variant={credito.estado === "Activo" ? "default" : "secondary"}>
                            {credito.estado}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Sin historial de créditos.
                      </TableCell>
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
  );
}
