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
} from "@/components/ui/dialog";
import { PlusCircle, Users } from "lucide-react";
import { CreateGroupForm } from "@/components/create-group-form";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export default function GruposPage() {
  const router = useRouter();
  const [grupos, setGrupos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);

  const fetchGrupos = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/grupos");
      const data = await res.json();
      if (res.ok) setGrupos(data.data || data);
    } catch {
      toast.error("Error al cargar grupos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrupos();
  }, []);

  const filtered = grupos.filter((g) =>
    g.nombre_grupo?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground/90">Catálogo de Grupos</h1>
        <p className="text-muted-foreground">Administración de grupos de clientes.</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Buscar por nombre de grupo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-background border-muted-foreground/20 focus-visible:ring-primary/30 h-10"
          />
        </div>
        <Button size="sm" className="h-10 px-4" onClick={() => setIsNewGroupModalOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nuevo Grupo
        </Button>
      </div>

      <Dialog open={isNewGroupModalOpen} onOpenChange={setIsNewGroupModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Grupo</DialogTitle>
          </DialogHeader>
          <CreateGroupForm
            onSuccess={() => { fetchGrupos(); setIsNewGroupModalOpen(false); }}
            onClose={() => setIsNewGroupModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>Nombre del Grupo</TableHead>
              <TableHead>Asesor</TableHead>
              <TableHead className="text-center">Integrantes</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    <p className="text-sm text-muted-foreground">Cargando grupos...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  {search ? "No se encontraron grupos con ese nombre." : "No hay grupos registrados."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((grupo: any) => (
                <TableRow key={grupo.id_grupo || grupo.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono text-xs font-semibold text-primary/80">
                    #{grupo.id_grupo || grupo.id}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary/70" />
                      {grupo.nombre_grupo}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{grupo.asesor?.nombre_asesor ?? "—"}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-bold">
                      {grupo.clientes?.length ?? 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs font-medium"
                      onClick={() => router.push(`/dashboard/grupos/${grupo.id_grupo || grupo.id}`)}
                    >
                      Ver / Editar
                    </Button>
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
