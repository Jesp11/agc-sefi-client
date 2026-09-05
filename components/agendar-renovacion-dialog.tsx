"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarPlus } from "lucide-react";
import { toast } from "sonner";

type Props = {
  numProg: number | string;
  fecha?: string | null;
  autorizacion?: string | null;
  tasa?: string | null;
  onSaved?: () => void;
  trigger?: React.ReactElement;
};

export function AgendarRenovacionDialog({
  numProg,
  fecha,
  autorizacion,
  tasa,
  onSaved,
  trigger,
}: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fecha: "", autorizacion: "Pendiente", tasa: "" });

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
    setForm({
      fecha: fecha ? String(fecha).split("T")[0] : "",
      autorizacion: autorizacion || "Pendiente",
      tasa: tasa || "",
    });
    }
    setOpen(nextOpen);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.fecha) {
      toast.error("Indica la fecha programada");
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch(`/reportes/asesor/por-cerrar/${numProg}`, {
        method: "PATCH",
        body: JSON.stringify({
          fecha_programada_renovacion: form.fecha,
          renovacion_autorizada: form.autorizacion,
          renovacion_tasa: form.tasa.trim() || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.message || "No se pudo agendar la renovación");
        return;
      }
      toast.success("Renovación agendada");
      setOpen(false);
      onSaved?.();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger ?? (
        <Button size="sm" variant="outline" className="h-8 gap-1.5">
          <CalendarPlus className="size-3.5" /> Agendar renovación
        </Button>
      )} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Agendar renovación — #{numProg}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="grid gap-4">
          <div className="grid gap-2">
            <Label>Fecha programada</Label>
            <Input type="date" required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>Autorización</Label>
            <select className="h-9 rounded-md border bg-background px-3 text-sm" value={form.autorizacion} onChange={(e) => setForm({ ...form, autorizacion: e.target.value })}>
              <option>Pendiente</option>
              <option>Autorizado</option>
              <option>No Autorizado</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label>Tasa a aplicar</Label>
            <Input value={form.tasa} onChange={(e) => setForm({ ...form, tasa: e.target.value })} placeholder="Ej. TCIP18 o Preferencial" />
          </div>
          <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar agenda"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
