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
import { PlusCircle } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

export default function AsesoresPage() {
  const [asesores, setAsesores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [nombreAsesor, setNombreAsesor] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAsesores = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/asesores");
      const data = await res.json();
      if (res.ok) {
        setAsesores(data.data || data);
      }
    } catch (error) {
      toast.error("Error al cargar asesores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAsesores();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreAsesor.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch("/asesores", {
        method: "POST",
        body: JSON.stringify({ nombre_asesor: nombreAsesor }),
      });

      if (res.ok) {
        toast.success("Asesor creado exitosamente");
        setNombreAsesor("");
        setIsOpen(false);
        fetchAsesores();
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || "Error al crear asesor");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground/90">Asesores</h1>
        <p className="text-muted-foreground">Gestión de asesores de crédito registrados en el sistema.</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Buscar asesores..."
            className="bg-background border-muted-foreground/20 focus-visible:ring-primary/30 h-10"
          />
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger
            render={
              <Button size="sm" className="h-10 px-4">
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Asesor
              </Button>
            }
          />
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Crear Asesor</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="nombre" className="text-sm font-medium">Nombre Completo</label>
                <Input 
                  id="nombre" 
                  placeholder="Ej. Carlos López" 
                  value={nombreAsesor}
                  onChange={(e) => setNombreAsesor(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>


      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow key="loading">
                <TableCell colSpan={3} className="h-24 text-center">
                  Cargando asesores...
                </TableCell>
              </TableRow>
            ) : asesores.length === 0 ? (
              <TableRow key="empty">
                <TableCell colSpan={3} className="h-24 text-center">
                  No hay asesores registrados.
                </TableCell>
              </TableRow>
            ) : (
              asesores.map((asesor: any) => (
                <TableRow key={asesor.id}>
                  <TableCell className="font-mono text-xs">{asesor.id}</TableCell>
                  <TableCell className="font-medium">{asesor.nombre_asesor}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Editar</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
