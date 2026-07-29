"use client";

import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import {
  PrintTicket,
  buildPagoTicketProps,
  type PagoTicketData,
} from "@/components/print-ticket";

interface RegistrarPagoDialogProps {
  numProg: number | string;
  /** Valor de ficha semanal; se precarga como monto de abono. */
  valorFicha?: number | string | null;
  /** Saldo pendiente del préstamo; si es menor a la ficha, se precarga el saldo. */
  saldoPendiente?: number | string | null;
  onSuccess?: () => void;
  trigger?: React.ReactElement;
}

function nowTime(): string {
  return new Date().toTimeString().slice(0, 8);
}

function montoAbonoSugerido(
  valorFicha?: number | string | null,
  saldoPendiente?: number | string | null,
): string {
  const ficha = Number(valorFicha);
  if (!Number.isFinite(ficha) || ficha <= 0) return "";

  const saldo = saldoPendiente == null || saldoPendiente === ""
    ? null
    : Number(saldoPendiente);

  if (saldo != null && Number.isFinite(saldo)) {
    if (saldo <= 0) return "";
    return String(Math.min(ficha, saldo));
  }

  return String(ficha);
}

export function RegistrarPagoDialog({
  numProg,
  valorFicha,
  saldoPendiente,
  onSuccess,
  trigger,
}: RegistrarPagoDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<PagoTicketData | null>(null);

  const buildForm = () => ({
    monto: montoAbonoSugerido(valorFicha, saldoPendiente),
    monto_multa: "",
    fecha: new Date().toISOString().split("T")[0],
    hora: nowTime(),
    metodo_pago: "Efectivo",
    notas: "",
  });

  const [form, setForm] = useState(buildForm);

  const total = useMemo(() => {
    const abono = parseFloat(form.monto) || 0;
    const multa = parseFloat(form.monto_multa) || 0;
    return abono + multa;
  }, [form.monto, form.monto_multa]);

  const handleClose = (next: boolean) => {
    if (!next) {
      const hadTicket = Boolean(ticket);
      setTicket(null);
      setOpen(false);
      if (hadTicket) onSuccess?.();
      return;
    }
    setTicket(null);
    setForm(buildForm());
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const abono = parseFloat(form.monto);
    if (!Number.isFinite(abono) || abono <= 0) {
      toast.error("Indica un monto de abono válido");
      return;
    }

    const multaRaw = form.monto_multa.trim();
    const multa = multaRaw === "" ? 0 : parseFloat(multaRaw);
    if (multaRaw !== "" && (!Number.isFinite(multa) || multa < 0)) {
      toast.error("Indica un monto de multa válido");
      return;
    }

    let hora = form.hora;
    if (/^\d{2}:\d{2}$/.test(hora)) {
      hora = `${hora}:00`;
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        monto: abono,
        fecha: form.fecha,
        hora,
        metodo_pago: form.metodo_pago,
        tipo: "Abono",
        notas: form.notas || null,
      };
      if (multa > 0) {
        payload.monto_multa = multa;
      }

      const res = await apiFetch(`/creditos/${numProg}/pagos`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.success(data.message || "Pago registrado exitosamente");
        if (data.ticket) {
          setTicket(data.ticket);
        } else {
          setTicket({
            num_prog: numProg,
            fecha: form.fecha,
            hora,
            metodo_pago: form.metodo_pago,
            abono,
            multa,
            total: abono + multa,
            notas: form.notas || null,
          });
        }
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || "Error al registrar pago");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const ticketProps = ticket ? buildPagoTicketProps(ticket) : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button size="sm" className="h-10 px-4 font-semibold shadow-sm">
              <ClipboardCheck className="mr-2 h-4 w-4" /> Registrar Pago
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col gap-4 overflow-hidden print:shadow-none print:border-0">
        {ticket && ticketProps ? (
          <>
            <DialogHeader>
              <DialogTitle>Pago registrado</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col flex-1 min-h-0 gap-4">
              <div className="flex items-start justify-between gap-2 print:hidden">
                <p className="text-sm text-muted-foreground">
                  Puedes imprimir el comprobante para entregarlo al cliente.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleClose(false)}
                >
                  Cerrar
                </Button>
              </div>
              <PrintTicket
                {...ticketProps}
                visible
                ticketId="pago-print-ticket"
                buttonAtBottom
                className="flex-1 min-h-0"
              />
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Registrar Pago — Folio #{numProg}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label>Método</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.metodo_pago}
                  onChange={(e) => setForm({ ...form, metodo_pago: e.target.value })}
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Monto abono</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={form.monto}
                    onChange={(e) => setForm({ ...form, monto: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>
                    Multa <span className="text-muted-foreground font-normal">(opcional)</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.monto_multa}
                    onChange={(e) => setForm({ ...form, monto_multa: e.target.value })}
                  />
                </div>
              </div>

              {total > 0 && (
                <p className="text-sm text-muted-foreground">
                  Total recibido:{" "}
                  <span className="font-semibold text-foreground">
                    ${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </span>
                  {parseFloat(form.monto_multa) > 0 && (
                    <span className="text-xs">
                      {" "}
                      (abono ${Number(form.monto || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      {" + "}
                      multa ${Number(form.monto_multa).toLocaleString("es-MX", { minimumFractionDigits: 2 })})
                    </span>
                  )}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Fecha</Label>
                  <Input
                    type="date"
                    required
                    value={form.fecha}
                    onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Hora</Label>
                  <Input
                    type="time"
                    step="1"
                    required
                    value={form.hora.slice(0, 8)}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm({ ...form, hora: v.length === 5 ? `${v}:00` : v });
                    }}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Notas (opcional)</Label>
                <Input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : "Registrar"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
