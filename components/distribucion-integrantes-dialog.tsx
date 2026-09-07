"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

type Fila = { id_cliente: string; nombre: string; capital: string };
type DistribucionAbono = { id_cliente_integrante: string; monto: number };
const ASIGNACIONES_VACIAS: Record<string, string> = {};

export function DistribucionIntegrantesDialog({
  credito,
  open,
  onOpenChange,
  onSaved,
  modo = "documental",
  totalAbonos = 0,
  asignacionesIniciales = ASIGNACIONES_VACIAS,
  onGuardarAbonos,
}: {
  credito: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
  modo?: "documental" | "abonos";
  totalAbonos?: number;
  asignacionesIniciales?: Record<string, string>;
  onGuardarAbonos?: (distribucion: DistribucionAbono[]) => Promise<void>;
}) {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!open) return;
    const existentes = new Map<string, any>((credito?.distribuciones_integrantes || []).map((item: any) => [item.id_cliente, item]));
    setFilas((credito?.grupo?.clientes || []).map((cliente: any) => {
      const existente = existentes.get(cliente.id_cliente);
      return {
        id_cliente: cliente.id_cliente,
        nombre: cliente.nombre_completo || existente?.nombre_cliente || existente?.cliente?.nombre_completo || `Integrante ${cliente.id_cliente}`,
        capital: modo === "abonos"
          ? asignacionesIniciales[cliente.id_cliente] || ""
          : existente ? String(existente.capital) : "",
      };
    }));
  }, [open, credito, modo, asignacionesIniciales]);

  const suma = useMemo(() => filas.reduce((total, fila) => total + (Number(fila.capital) || 0), 0), [filas]);
  const montoTotal = modo === "abonos" ? Number(totalAbonos) : Number(credito?.monto_otorgado || 0);
  const montoPendiente = Math.max(0, montoTotal - suma);
  const valida = modo === "abonos"
    ? filas.length > 0 && suma <= montoTotal + 0.009
    : filas.length > 0 && filas.every((fila) => Number(fila.capital) > 0)
      && Math.round(suma * 100) === Math.round(montoTotal * 100);

  const guardar = async () => {
    if (!valida) {
      toast.error(modo === "abonos"
        ? "La distribución no puede superar el total de abonos registrados."
        : "Cada integrante necesita un capital positivo y la suma debe coincidir exactamente con el crédito grupal.");
      return;
    }
    setGuardando(true);
    try {
      if (modo === "abonos") {
        if (!onGuardarAbonos) throw new Error("No se configuró el guardado de abonos.");
        await onGuardarAbonos(filas
          .filter((fila) => Number(fila.capital) > 0)
          .map((fila) => ({ id_cliente_integrante: fila.id_cliente, monto: Number(fila.capital) })));
        toast.success("Abonos distribuidos correctamente.");
        onOpenChange(false);
        await onSaved();
        return;
      }
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
          <DialogTitle>{modo === "abonos" ? "Distribuir abonos grupales" : "Distribución documental por integrante"}</DialogTitle>
          <DialogDescription>
            {modo === "abonos"
              ? "Asigna los abonos grupales registrados a sus integrantes. Esto no modifica el contrato, saldo grupal ni caja."
              : "Captura el capital de cada integrante. El interés, total y ficha se prorratean para conciliar con el crédito grupal. Esto no modifica pagos, saldo ni caja."}
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
                <Label className="sr-only" htmlFor={`capital-${fila.id_cliente}`}>{modo === "abonos" ? "Abono" : "Capital"}</Label>
                <Input id={`capital-${fila.id_cliente}`} type="number" min={modo === "abonos" ? "0" : "0.01"} step="0.01" placeholder={modo === "abonos" ? "Abono" : "Capital"} value={fila.capital}
                  onChange={(event) => setFilas((actual) => actual.map((item, pos) => pos === indice ? { ...item, capital: event.target.value } : item))} />
              </div>
            </div>
          ))}
          <div className={`rounded-md border p-3 text-sm flex justify-between ${valida ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
            <span>{modo === "abonos" ? "Abonos distribuidos" : "Capital distribuido"}</span>
            <div className="text-right">
              <strong>${suma.toLocaleString("es-MX", { minimumFractionDigits: 2 })} / ${montoTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</strong>
              {modo === "abonos" && <p className="text-xs font-medium">Por distribuir: ${montoPendiente.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>}
            </div>
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
