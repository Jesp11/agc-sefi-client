"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import {
  Check,
  ChevronLeft,
  Search,
  User,
  Users,
  Save,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomLoanFormProps {
  type: "individual" | "grupal";
  onSuccess: () => void;
  onClose: () => void;
}

export function CustomLoanForm({ type, onSuccess, onClose }: CustomLoanFormProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [items, setItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState<any>(null);

  const [formData, setFormData] = useState({
    monto_otorgado: "",
    interes: "0",
    fecha_otorgacion: new Date().toISOString().split("T")[0],
    fecha_primer_pago: "",
    fecha_ultimo_pago: "",
  });

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const url = type === "individual" ? "/clientes?per_page=100" : "/grupos?per_page=100";
        const res = await apiFetch(url);
        const data = await res.json();
        if (res.ok) setItems(data.data || data);
      } catch {
        toast.error(`Error al cargar ${type === "individual" ? "clientes" : "grupos"}`);
      }
    };
    fetchItems();
  }, [type]);

  const filtered = items.filter((item) => {
    const name = type === "individual" ? item.nombre_completo : item.nombre_grupo;
    return name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getDiaPago = (dateStr: string): string => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-").map(Number);
    return ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"][new Date(y, m - 1, d).getDay()];
  };

  const calcPlazos = (first: string, last: string): number => {
    if (!first || !last) return 0;
    const [fy, fm, fd] = first.split("-").map(Number);
    const [ly, lm, ld] = last.split("-").map(Number);
    const diffMs = new Date(ly, lm - 1, ld).getTime() - new Date(fy, fm - 1, fd).getTime();
    const weeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
    return weeks + 1;
  };

  const monto = parseFloat(formData.monto_otorgado) || 0;
  const interes = parseFloat(formData.interes) || 0;
  const total = monto + interes;
  const plazos = calcPlazos(formData.fecha_primer_pago, formData.fecha_ultimo_pago);
  const valorFicha = plazos > 0 ? parseFloat((total / plazos).toFixed(2)) : 0;
  const diaPago = getDiaPago(formData.fecha_primer_pago);
  const porcentajeInteres = monto > 0 ? parseFloat(((interes / monto) * 100).toFixed(2)) : 0;

  const canSubmit =
    selected &&
    monto > 0 &&
    formData.fecha_otorgacion &&
    formData.fecha_primer_pago &&
    formData.fecha_ultimo_pago &&
    plazos > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const body: any = {
        fecha_otorgacion: formData.fecha_otorgacion,
        fecha_primer_pago: formData.fecha_primer_pago,
        monto_otorgado: monto,
        interes,
        total,
        plazos,
        valor_ficha: valorFicha,
        dias_pago: diaPago,
        porcentaje_interes: porcentajeInteres,
        es_personalizado: true,
      };

      if (type === "individual") {
        body.id_cliente = selected.id_cliente;
      } else {
        body.id_grupo = selected.id;
      }

      const res = await apiFetch("/creditos", { method: "POST", body: JSON.stringify(body) });
      if (res.ok) {
        toast.success("Préstamo personalizado creado exitosamente");
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        toast.error(data.message || "Error al crear préstamo");
      }
    } catch {
      toast.error("Error al procesar la solicitud");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0 gap-4">
      {/* Stepper */}
      <div className="flex justify-center items-center gap-1">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
              step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 2 && <div className={cn("w-8 h-1 bg-muted mx-1", step > s && "bg-primary")} />}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        {/* Step 1: Select client or group */}
        {step === 1 && (
          <div className="grid gap-3">
            <div className="flex items-center gap-2 text-sm font-bold">
              {type === "individual" ? <User className="h-4 w-4" /> : <Users className="h-4 w-4" />}
              Seleccionar {type === "individual" ? "Cliente" : "Grupo"}
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2 text-xs text-amber-700">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Préstamo personalizado — omite las reglas de negocio estándar. Úsalo solo para excepciones autorizadas.</span>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={`Buscar ${type === "individual" ? "por nombre, CURP o ID..." : "por nombre..."}`}
                className="pl-9 h-9 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
              <div className="max-h-[200px] overflow-y-auto overflow-x-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0 z-10">
                    <tr className="border-b">
                      <th className="h-9 px-4 text-left font-medium text-muted-foreground">
                        {type === "individual" ? "Cliente" : "Grupo"}
                      </th>
                      <th className="h-9 px-4 text-center font-medium text-muted-foreground">ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtered.length > 0 ? (
                      filtered.map((item) => {
                        const id = type === "individual" ? item.id_cliente : item.id;
                        const name = type === "individual" ? item.nombre_completo : item.nombre_grupo;
                        const sub = type === "individual" ? (item.curp || "S/CURP") : `${item.clientes?.length || 0} integrantes`;
                        return (
                          <tr
                            key={id}
                            onClick={() => { setSelected(item); setStep(2); }}
                            className="hover:bg-muted/50 transition-colors cursor-pointer"
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                  {name?.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-medium leading-none mb-1">{name}</p>
                                  <p className="text-xs text-muted-foreground">{sub}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <Badge variant="outline" className="text-[10px] font-mono">{id}</Badge>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={2} className="p-8 text-center text-muted-foreground italic text-xs">
                          No se encontraron resultados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Loan details */}
        {step === 2 && selected && (
          <div className="grid gap-4">
            <div className="bg-primary/5 p-3 rounded-lg border border-primary/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {type === "individual" ? <User className="h-4 w-4 text-primary" /> : <Users className="h-4 w-4 text-primary" />}
                <div>
                  <p className="text-sm font-bold">
                    {type === "individual" ? selected.nombre_completo : selected.nombre_grupo}
                  </p>
                  <p className="text-xs text-muted-foreground">Préstamo personalizado</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-xs">Cambiar</Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Monto Otorgado ($)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={formData.monto_otorgado}
                  onChange={(e) => setFormData({ ...formData, monto_otorgado: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Interés ($)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={formData.interes}
                  onChange={(e) => setFormData({ ...formData, interes: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Fecha de Desembolso</Label>
                <Input
                  type="date"
                  value={formData.fecha_otorgacion}
                  onChange={(e) => setFormData({ ...formData, fecha_otorgacion: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Fecha de Primer Pago</Label>
                <Input
                  type="date"
                  value={formData.fecha_primer_pago}
                  onChange={(e) => setFormData({ ...formData, fecha_primer_pago: e.target.value })}
                />
              </div>
              <div className="grid gap-2 col-span-2">
                <Label>Fecha de Último Pago</Label>
                <Input
                  type="date"
                  value={formData.fecha_ultimo_pago}
                  onChange={(e) => setFormData({ ...formData, fecha_ultimo_pago: e.target.value })}
                />
              </div>
            </div>

            {/* Calculated summary */}
            {monto > 0 && plazos > 0 && (
              <div className="rounded-lg border bg-muted/30 divide-y text-xs">
                <div className="flex justify-between px-3 py-2">
                  <span className="text-muted-foreground">Día de pago</span>
                  <Badge variant="secondary" className="font-semibold">{diaPago || "—"}</Badge>
                </div>
                <div className="flex justify-between px-3 py-2">
                  <span className="text-muted-foreground">Número de pagos</span>
                  <span className="font-semibold">{plazos} semanas</span>
                </div>
                <div className="flex justify-between px-3 py-2">
                  <span className="text-muted-foreground">Pago semanal</span>
                  <span className="font-semibold">${valorFicha.toLocaleString()}</span>
                </div>
                <div className="flex justify-between px-3 py-2">
                  <span className="text-muted-foreground">Interés ({porcentajeInteres}%)</span>
                  <span className="font-semibold">${interes.toLocaleString()}</span>
                </div>
                <div className="flex justify-between px-3 py-2 bg-primary/5">
                  <span className="font-bold">Total a pagar</span>
                  <span className="font-bold text-primary">${total.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between pt-2 border-t">
        <Button variant="ghost" onClick={step === 1 ? onClose : () => setStep(1)} disabled={loading}>
          {step === 1 ? "Cancelar" : <><ChevronLeft className="mr-2 h-4 w-4" /> Anterior</>}
        </Button>
        {step === 2 && (
          <Button onClick={handleSubmit} disabled={loading || !canSubmit}>
            {loading ? "Procesando..." : <><Save className="mr-2 h-4 w-4" /> Crear Préstamo</>}
          </Button>
        )}
      </div>
    </div>
  );
}
