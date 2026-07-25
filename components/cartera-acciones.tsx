"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { AlertTriangle, ChevronDown, UserX } from "lucide-react";

type Props = {
  credito: { num_prog: number; estado?: string };
  onSuccess: () => void;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default";
};

export function CarteraAcciones({ credito, onSuccess, variant = "outline", size = "sm" }: Props) {
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"mora" | "cerrar" | null>(null);

  const puedeMover = credito.estado === "Activo";
  const puedeCerrar = credito.estado === "Activo" || credito.estado === "EnMora";

  if (!puedeMover && !puedeCerrar) return null;

  const ejecutar = async (action: "mora" | "cerrar") => {
    setLoading(true);
    const endpoint = action === "mora"
      ? `/creditos/${credito.num_prog}/enviar-mora`
      : `/creditos/${credito.num_prog}/cerrar-cartera`;

    try {
      const res = await apiFetch(endpoint, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(data.message || "Operación completada");
        setConfirmAction(null);
        onSuccess();
      } else {
        toast.error(data.message || "No se pudo completar la operación");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant={variant} size={size} disabled={loading}>
              Cartera
              <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          {puedeMover && (
            <DropdownMenuItem onClick={() => setConfirmAction("mora")}>
              <AlertTriangle className="mr-2 h-4 w-4 text-amber-600" />
              Enviar a mora
            </DropdownMenuItem>
          )}
          {puedeMover && puedeCerrar && <DropdownMenuSeparator />}
          {puedeCerrar && (
            <DropdownMenuItem onClick={() => setConfirmAction("cerrar")}>
              <UserX className="mr-2 h-4 w-4 text-muted-foreground" />
              Cerrar sin renovación
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmAction === "mora"} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar a cartera en mora</DialogTitle>
            <DialogDescription>
              El préstamo #{credito.num_prog} dejará de aparecer en cartera activa y solo se verá en Cartera en Mora.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setConfirmAction(null)} disabled={loading}>Cancelar</Button>
            <Button variant="destructive" onClick={() => ejecutar("mora")} disabled={loading}>
              {loading ? "Enviando..." : "Confirmar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmAction === "cerrar"} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar sin renovación</DialogTitle>
            <DialogDescription>
              El préstamo #{credito.num_prog} pasará a Clientes Cerrados. El cliente o integrantes del grupo quedarán marcados como cerrados sin renovación.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setConfirmAction(null)} disabled={loading}>Cancelar</Button>
            <Button onClick={() => ejecutar("cerrar")} disabled={loading}>
              {loading ? "Cerrando..." : "Confirmar cierre"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
