"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusCircle, Users, Edit, Eye } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export default function GruposPage() {
  const router = useRouter();
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchGrupos = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/grupos");
      const data = await res.json();
      if (res.ok) {
        setGrupos(data.data || data);
      }
    } catch (error) {
      toast.error("Error al cargar grupos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrupos();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground/90">Grupos</h1>
        <p className="text-muted-foreground">Gestión de grupos y sus créditos correspondientes.</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Buscar grupos..."
            className="bg-background border-muted-foreground/20 focus-visible:ring-primary/30 h-10"
          />
        </div>
        <Dialog>
          <DialogTrigger
            render={
              <Button size="sm" className="h-10 px-4">
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Grupo
              </Button>
            }
          />
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Crear Grupo</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="nombre" className="text-sm font-medium">Nombre del Grupo</label>
                <Input id="nombre" placeholder="Ej. Grupo Esperanza" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit">Guardar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Nombre Grupo</TableHead>
              <TableHead className="text-center">Ciclo</TableHead>
              <TableHead>Día Pago</TableHead>
              <TableHead>Asesor Asignado</TableHead>
              <TableHead className="text-center">Plazos</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow key="loading">
                <TableCell colSpan={10} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-sm text-muted-foreground">Cargando grupos...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : grupos.length === 0 ? (
              <TableRow key="empty">
                <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                  No hay grupos registrados.
                </TableCell>
              </TableRow>
            ) : (
              grupos.map((grupo: any, index: number) => {
                const lastCredito = grupo.creditos && grupo.creditos.length > 0 
                  ? grupo.creditos[grupo.creditos.length - 1] 
                  : null;
                
                return (
                  <TableRow key={grupo.id_grupo || grupo.id || index} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs font-semibold text-primary/80">#{grupo.id_grupo || grupo.id}</TableCell>
                    <TableCell className="text-xs">
                      {lastCredito ? lastCredito.fecha_otorgacion : (grupo.created_at ? new Date(grupo.created_at).toLocaleDateString() : "N/A")}
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary/70"/>
                        {grupo.nombre_grupo}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-bold">
                        {lastCredito ? lastCredito.ciclo : 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {lastCredito ? lastCredito.dias_pago : "N/A"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {grupo.asesor?.nombre_asesor || "Sin asignar"}
                    </TableCell>
                    <TableCell className="text-center text-xs">
                      {lastCredito ? `${lastCredito.plazos} sem` : "-"}
                    </TableCell>
                    <TableCell className="font-semibold text-xs">
                      {lastCredito ? `$${lastCredito.monto_otorgado}` : "-"}
                    </TableCell>
                    <TableCell className="font-bold text-primary text-xs">
                      {lastCredito ? `$${lastCredito.total}` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {lastCredito && (
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="h-8 text-xs font-medium transition-colors"
                            onClick={() => router.push(`/dashboard/creditos/${lastCredito.num_prog}`)}
                          >
                            Ver Crédito
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-xs font-medium"
                          onClick={() => router.push(`/dashboard/grupos/${grupo.id}`)}
                        >
                          Ver Grupo
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar Grupo">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
