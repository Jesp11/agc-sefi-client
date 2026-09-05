"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RefinanciarCreditoDialogProps {
  numProg: number | string;
  saldoActual: number;
  tipoCredito?: string | null;
  tasaAsignada?: string | null;
  diasPago?: string | null;
  fechaEfectivaInicial?: string | null;
  onSuccess?: () => void;
  trigger?: React.ReactElement;
}

type CatalogOption = { tasaKey: string; plazoCatalogo: number; factor: number };

const TASA_LABELS: Record<string, string> = {
  TCIN21: "Normal",
  TCIP18: "Preferencial",
  TCIPE14: "Pref. Especial",
  TCIPV10: "VIP",
  TCGN10: "Normal",
  TCGP07: "Preferencial",
  TCGPE04: "Especial",
  TCGPEV01: "VIP",
  TCGEC00: "Exclusivo",
};

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function addWeeks(dateStr: string, weeks: number): string {
  if (!dateStr || weeks < 1) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + weeks * 7);
  return date.toISOString().split("T")[0];
}

function getDiaPago(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  return ["DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"][
    new Date(y, m - 1, d).getDay()
  ];
}

function money(n: number): string {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** factor = pago semanal por cada $1,000 */
function calcInteres(factor: number, monto: number, plazo: number): number {
  return parseFloat((factor * (monto / 1000) * plazo - monto).toFixed(2));
}

export function RefinanciarCreditoDialog({
  numProg,
  saldoActual,
  tipoCredito,
  tasaAsignada,
  diasPago,
  fechaEfectivaInicial,
  onSuccess,
  trigger,
}: RefinanciarCreditoDialogProps) {
  const router = useRouter();
  const isGrupal = tipoCredito === "Grupal";
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingCatalogo, setLoadingCatalogo] = useState(false);
  const [catalogo, setCatalogo] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState<CatalogOption | null>(null);
  const [plazosEditables, setPlazosEditables] = useState(0);
  const [form, setForm] = useState({
    monto_otorgado: "",
    fecha_otorgacion: today(),
    fecha_primer_pago: addWeeks(today(), 1),
    abono_efectivo: "",
    notas: "",
  });

  const saldo = Math.max(0, Number(saldoActual) || 0);

  const plazosDisponibles: number[] = catalogo?.tasas
    ? [...new Set<number>(
        Object.values(catalogo.tasas).flatMap((v: any) => Object.keys(v).map(Number))
      )].sort((a, b) => a - b)
    : [];

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingCatalogo(true);
    setSelectedOption(null);
    setPlazosEditables(0);
    setForm({
      monto_otorgado: "",
      fecha_otorgacion: fechaEfectivaInicial || today(),
      fecha_primer_pago: addWeeks(fechaEfectivaInicial || today(), 1),
      abono_efectivo: "",
      notas: "",
    });

    const url = isGrupal ? "/simular/catalogo/grupal" : "/simular/catalogo/individual";
    apiFetch(url)
      .then(async (res) => {
        const data = await res.json();
        if (!cancelled && res.ok) {
          setCatalogo(data);
          // Precargar tasa del crédito actual si existe en el catálogo.
          if (tasaAsignada && data?.tasas?.[tasaAsignada]) {
            const plazos = Object.keys(data.tasas[tasaAsignada]).map(Number).sort((a, b) => a - b);
            const plazo = plazos[plazos.length - 1];
            const factor = Number(data.tasas[tasaAsignada][plazo] ?? data.tasas[tasaAsignada][String(plazo)]);
            if (plazo && Number.isFinite(factor)) {
              setSelectedOption({ tasaKey: tasaAsignada, plazoCatalogo: plazo, factor });
              setPlazosEditables(plazo);
            }
          }
        } else if (!cancelled) {
          toast.error("No se pudo cargar el catálogo de tasas");
        }
      })
      .catch(() => {
        if (!cancelled) toast.error("Error al cargar catálogo de tasas");
      })
      .finally(() => {
        if (!cancelled) setLoadingCatalogo(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, isGrupal, tasaAsignada, fechaEfectivaInicial]);

  const abonoEfectivo = Math.min(saldo, Math.max(0, parseFloat(form.abono_efectivo) || 0));
  const saldoAbsorbido = Math.max(0, saldo - abonoEfectivo);

  const calc = useMemo(() => {
    const monto = parseFloat(form.monto_otorgado) || 0;
    const plazos = plazosEditables > 0 ? plazosEditables : (selectedOption?.plazoCatalogo ?? 0);
    const factor = selectedOption?.factor ?? 0;
    const interes = selectedOption && monto > 0 && plazos > 0
      ? Math.max(0, calcInteres(factor, monto, plazos))
      : 0;
    const total = parseFloat((monto + interes).toFixed(2));
    const valorFicha = plazos > 0 ? parseFloat((total / plazos).toFixed(2)) : 0;
    const montoNeto = parseFloat((monto - saldoAbsorbido).toFixed(2));
    const porcentajeInteres = monto > 0 ? parseFloat(((interes / monto) * 100).toFixed(2)) : 0;
    return { monto, plazos, interes, total, valorFicha, montoNeto, porcentajeInteres };
  }, [form.monto_otorgado, selectedOption, plazosEditables, saldoAbsorbido]);

  const canSubmit =
    !!selectedOption &&
    calc.monto >= saldoAbsorbido &&
    calc.plazos > 0 &&
    calc.total > 0 &&
    calc.valorFicha > 0 &&
    !!form.fecha_otorgacion &&
    !!form.fecha_primer_pago;

  const handleSelectOption = (tasaKey: string, plazo: number, factor: number) => {
    const isSame = selectedOption?.tasaKey === tasaKey && selectedOption?.plazoCatalogo === plazo;
    if (isSame) {
      setSelectedOption(null);
      setPlazosEditables(0);
      return;
    }
    setSelectedOption({ tasaKey, plazoCatalogo: plazo, factor });
    setPlazosEditables(plazo);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOption) {
      toast.error("Selecciona una tasa y plazo del catálogo");
      return;
    }
    if (!canSubmit) {
      toast.error("El nuevo monto no puede ser menor al saldo a absorber");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch(`/creditos/${numProg}/refinanciar`, {
        method: "POST",
        body: JSON.stringify({
          monto_otorgado: calc.monto,
          interes: calc.interes,
          total: calc.total,
          plazos: calc.plazos,
          valor_ficha: calc.valorFicha,
          porcentaje_interes: calc.porcentajeInteres,
          tasa_asignada: selectedOption.tasaKey,
          fecha_otorgacion: form.fecha_otorgacion,
          fecha_efectiva: form.fecha_otorgacion,
          fecha_primer_pago: form.fecha_primer_pago,
          dias_pago: getDiaPago(form.fecha_primer_pago) || diasPago || null,
          abono_efectivo: abonoEfectivo || null,
          notas: form.notas || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(data.message || "Refinanciamiento realizado");
        setOpen(false);
        onSuccess?.();
        const nuevoId = data.data?.num_prog;
        if (nuevoId) {
          router.push(`/dashboard/creditos/${nuevoId}`);
        }
      } else {
        toast.error(data.message || "Error al refinanciar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button size="sm" variant="outline" className="h-10 px-4 font-semibold shadow-sm">
              <RefreshCw className="mr-2 h-4 w-4" /> Refinanciar
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Refinanciar — Folio #{numProg}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <p className="text-sm text-muted-foreground">
            Define la renovación efectiva. El saldo pendiente se absorbe del nuevo monto y el
            abono efectivo, si existe, se registra como cobro independiente.
          </p>

          <div className="rounded-lg border bg-muted/30 p-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Saldo actual</p>
              <p className="font-semibold">${money(saldo)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Saldo a absorber</p>
              <p className="font-semibold">${money(saldoAbsorbido)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Monto neto a entregar</p>
              <p className="font-semibold text-primary">
                {calc.montoNeto > 0 ? `$${money(calc.montoNeto)}` : "—"}
              </p>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Nuevo monto</Label>
            <Input
              type="number"
              step="0.01"
              min={saldoAbsorbido}
              required
              placeholder={`Mínimo ${money(saldoAbsorbido)}`}
              value={form.monto_otorgado}
              onChange={(e) => setForm({ ...form, monto_otorgado: e.target.value })}
            />
            {calc.monto > 0 && calc.monto < saldoAbsorbido && (
              <p className="text-xs text-destructive">No puede ser menor al saldo a absorber.</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Abono efectivo del cliente (opcional)</Label>
            <Input
              type="number"
              min="0"
              max={saldo}
              step="0.01"
              value={form.abono_efectivo}
              onChange={(e) => setForm({ ...form, abono_efectivo: e.target.value })}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">Se registra como cobro del crédito anterior antes de absorber el saldo.</p>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Tasa y plazo{" "}
              <span className="normal-case font-normal text-muted-foreground/70">
                — determina el interés y el pago semanal
              </span>
            </Label>
            {loadingCatalogo ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Cargando catálogo...</p>
            ) : catalogo?.tasas && plazosDisponibles.length > 0 ? (
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Tasa</th>
                      {plazosDisponibles.map((p) => (
                        <th key={p} className="px-3 py-2 text-center font-medium text-muted-foreground">
                          {p} sem
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {Object.entries(catalogo.tasas).map(([key, val]: [string, any]) => (
                      <tr key={key} className="hover:bg-muted/20">
                        <td className="px-3 py-1.5 font-medium whitespace-nowrap">
                          {TASA_LABELS[key] || key}
                        </td>
                        {plazosDisponibles.map((p) => {
                          const factor = val[p] ?? val[String(p)];
                          const isSelected =
                            selectedOption?.tasaKey === key && selectedOption?.plazoCatalogo === p;
                          return (
                            <td key={p} className="px-2 py-1.5 text-center">
                              {factor != null ? (
                                <button
                                  type="button"
                                  onClick={() => handleSelectOption(key, p, Number(factor))}
                                  className={cn(
                                    "w-full px-2 py-1 rounded text-xs font-mono transition-colors border",
                                    isSelected
                                      ? "bg-primary text-primary-foreground border-primary font-bold"
                                      : "bg-background hover:bg-primary/10 border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                                  )}
                                >
                                  ${factor}
                                </button>
                              ) : (
                                <span className="text-muted-foreground/30">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-destructive py-2">No hay tasas disponibles en el catálogo.</p>
            )}
            {selectedOption && (
              <p className="text-xs text-muted-foreground">
                Seleccionado: {TASA_LABELS[selectedOption.tasaKey] || selectedOption.tasaKey} · factor $
                {selectedOption.factor}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Semanas</Label>
              <Input
                type="number"
                min={1}
                max={104}
                required
                disabled={!selectedOption}
                value={plazosEditables || ""}
                onChange={(e) => setPlazosEditables(parseInt(e.target.value, 10) || 0)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Fecha efectiva</Label>
              <Input
                type="date"
                required
                value={form.fecha_otorgacion}
                onChange={(e) => setForm({ ...form, fecha_otorgacion: e.target.value })}
              />
            </div>
            <div className="grid gap-2 col-span-2">
              <Label>Primer pago</Label>
              <Input
                type="date"
                required
                value={form.fecha_primer_pago}
                onChange={(e) => setForm({ ...form, fecha_primer_pago: e.target.value })}
              />
            </div>
          </div>

          {calc.monto >= saldoAbsorbido && selectedOption && (
            <div className="rounded-lg border divide-y text-sm">
              <div className="flex justify-between px-3 py-2">
                <span className="text-muted-foreground">Plazos</span>
                <span className="font-semibold">{calc.plazos} semanas</span>
              </div>
              <div className="flex justify-between px-3 py-2">
                <span className="text-muted-foreground">Interés ({calc.porcentajeInteres}%)</span>
                <span className="font-semibold">${money(calc.interes)}</span>
              </div>
              <div className="flex justify-between px-3 py-2">
                <span className="text-muted-foreground">Pago semanal</span>
                <span className="font-semibold">${money(calc.valorFicha)}</span>
              </div>
              <div className="flex justify-between px-3 py-2 bg-primary/5">
                <span className="font-bold">Total contrato</span>
                <span className="font-bold text-primary">${money(calc.total)}</span>
              </div>
            </div>
          )}

          <div className="grid gap-2">
            <Label>Notas (opcional)</Label>
            <Input
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              placeholder="Motivo del refinanciamiento"
            />
          </div>

          <Button type="submit" disabled={loading || !canSubmit}>
            {loading ? "Procesando..." : "Confirmar refinanciamiento"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
