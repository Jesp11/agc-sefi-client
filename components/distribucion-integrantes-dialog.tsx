"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

type Fila = { id_cliente: string; nombre: string; capital: string };

export function DistribucionIntegrantesDialog({
  credito,
  open,
  onOpenChange,
  onSaved,
}: {
  credito: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
}) {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!open) return;
    const existentes = new Map<string, any>((credito?.distribuciones_integrantes || []).map((item: any) => [item.id_cliente, item]));
    setFilas((credito?.grupo?.clientes || []).map((cliente: any) => ({
      id_cliente: cliente.id_cliente,
      nombre: cliente.nombre_completo,
      capital: existentes.has(cliente.id_cliente) ? String(existentes.get(cliente.id_cliente).capital) : "",
    })));
  }, [open, credito]);

  const suma = useMemo(() => filas.reduce((total, fila) => total + (Number(fila.capital) || 0), 0), [filas]);
  const montoGrupo = Number(credito?.monto_otorgado || 0);
  const valida = filas.length > 0 && filas.every((fila) => Number(fila.capital) > 0)
    && Math.round(suma * 100) === Math.round(montoGrupo * 100);

  const guardar = async () => {
    if (!valida) {
      toast.error("Cada integrante necesita un capital positivo y la suma debe coincidir exactamente con el crédito grupal.");
      return;
    }
    setGuardando(true);
    try {
      // Usa la ruta estándar del crédito para funcionar también cuando una
      // instancia aún conserva caché de rutas anterior.
      const response = await apiFetch(`/creditos/${credito.num_prog}`, {
        method: "PUT",
        body: JSON.stringify({ distribucion_integrantes: filas.map((fila) => ({ id_cliente: fila.id_cliente, capital: Number(fila.capital) })) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "No se pudo guardar la distribución.");
      toast.success(result.message || "Distribución documental guardada.");
      onOpenChange(false);
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la distribución.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Distribución documental por integrante</DialogTitle>
          <DialogDescription>
            Captura el capital de cada integrante. El interés, total y ficha se prorratean para conciliar con el crédito grupal. Esto no modifica pagos, saldo ni caja.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {filas.map((fila, indice) => (
            <div key={fila.id_cliente} className="grid grid-cols-[1fr_9rem] gap-3 items-center">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{fila.nombre}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{fila.id_cliente}</p>
              </div>
              <div className="grid gap-1">
                <Label className="sr-only" htmlFor={`capital-${fila.id_cliente}`}>Capital</Label>
                <Input id={`capital-${fila.id_cliente}`} type="number" min="0.01" step="0.01" placeholder="Capital" value={fila.capital}
                  onChange={(event) => setFilas((actual) => actual.map((item, pos) => pos === indice ? { ...item, capital: event.target.value } : item))} />
              </div>
            </div>
          ))}
          <div className={`rounded-md border p-3 text-sm flex justify-between ${valida ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
            <span>Capital distribuido</span>
            <strong>${suma.toLocaleString("es-MX", { minimumFractionDigits: 2 })} / ${montoGrupo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</strong>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={guardando}>Cancelar</Button>
          <Button onClick={guardar} disabled={guardando || !valida}>{guardando ? "Guardando..." : "Guardar distribución"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
