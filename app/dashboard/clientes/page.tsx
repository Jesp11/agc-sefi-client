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
import { PlusCircle, Edit } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

import { ClientFormWizard } from "@/components/cliente-form-wizard";

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const router = useRouter();

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/clientes");
      const data = await res.json();
      if (res.ok) {
        setClientes(data.data || data);
      }
    } catch (error) {
      toast.error("Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground/90">Clientes</h1>
        <p className="text-muted-foreground">Gestión de cartera de clientes y sus perfiles de crédito.</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Buscar clientes..."
            className="bg-background border-muted-foreground/20 focus-visible:ring-primary/30 h-10"
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger
            render={
              <Button size="sm" className="h-10 px-4">
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Cliente
              </Button>
            }
          />
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Registro de Nuevo Cliente</DialogTitle>
            </DialogHeader>
            <ClientFormWizard 
              onSuccess={() => {
                fetchClientes();
                setIsDialogOpen(false);
              }} 
              onClose={() => setIsDialogOpen(false)} 
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Cliente</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Grupo</TableHead>
              <TableHead>Ciclo</TableHead>
              <TableHead>Día de Pago</TableHead>
              <TableHead>Asesor</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow key="loading">
                <TableCell colSpan={7} className="h-24 text-center">
                  Cargando clientes...
                </TableCell>
              </TableRow>
            ) : clientes.length === 0 ? (
              <TableRow key="empty">
                <TableCell colSpan={7} className="h-24 text-center">
                  No hay clientes registrados.
                </TableCell>
              </TableRow>
            ) : (
              clientes.map((cliente: any, index: number) => {
                const ultimoCredito = cliente.creditos && cliente.creditos.length > 0 
                  ? cliente.creditos[cliente.creditos.length - 1] 
                  : null;
                const grupo = cliente.grupos && cliente.grupos.length > 0 ? cliente.grupos[0] : null;
                
                return (
                  <TableRow key={cliente.id_cliente || cliente.id || index}>
                    <TableCell className="font-mono text-xs">{cliente.id_cliente || cliente.id}</TableCell>
                    <TableCell className="font-medium">{cliente.nombre_completo}</TableCell>
                    <TableCell>
                      {grupo ? (
                        <span className="text-xs font-semibold text-primary">
                          {grupo.nombre_grupo}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Individual</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">
                        {ultimoCredito?.ciclo ?? "0"}
                      </span>
                    </TableCell>
                    <TableCell>{ultimoCredito?.dias_pago ?? "N/A"}</TableCell>
                    <TableCell className="text-xs">{cliente.asesor?.nombre_asesor || "N/A"}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 text-xs font-medium transition-colors"
                        onClick={() => router.push(`/dashboard/clientes/${cliente.id_cliente || cliente.id}`)}
                      >
                        Ver Perfil
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
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
