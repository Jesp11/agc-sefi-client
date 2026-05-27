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
  ChevronRight,
  ChevronLeft,
  Search,
  Users,
  Calculator,
  AlertCircle,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomGroupCreditFormProps {
  onSuccess: () => void;
  onClose: () => void;
}

export function CustomGroupCreditForm({ onSuccess, onClose }: CustomGroupCreditFormProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const [groups, setGroups] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [catalogo, setCatalogo] = useState<any>(null);
  const [simResult, setSimResult] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState<any>(null);

  const [formData, setFormData] = useState({
    monto_total_grupo: 30000,
    origen: "nuevo",
    fecha_otorgacion: new Date().toISOString().split('T')[0],
    fecha_primer_pago: "",
    cantidad_referidos: 0,
  });

  const getDiaPago = (dateStr: string): string => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split('-').map(Number);
    return ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"][new Date(y, m - 1, d).getDay()];
  };

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await apiFetch("/grupos?per_page=100");
        const data = await res.json();
        if (res.ok) setGroups(data.data || data);
      } catch {
        toast.error("Error al cargar grupos");
      }
    };
    const fetchCatalogo = async () => {
      try {
        const res = await apiFetch("/simular/catalogo/grupal");
        const data = await res.json();
        if (res.ok) setCatalogo(data);
      } catch {}
    };
    fetchGroups();
    fetchCatalogo();
  }, []);

  const filteredGroups = groups.filter((g) =>
    g.nombre_grupo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectGroup = (group: any) => {
    setSelectedGroup(group);
    const integrantes = group.clientes?.length || 0;
    const minMonto = catalogo?.montos_minimos?.[formData.origen] || 30000;
    setFormData((prev) => ({
      ...prev,
      monto_total_grupo: Math.max(minMonto, 3000 * integrantes),
    }));
    setStep(2);
  };

  const handleSimulate = async () => {
    if (!selectedGroup) return;
    if (!formData.fecha_otorgacion) { toast.error("Indica la fecha de desembolso"); return; }
    if (!formData.fecha_primer_pago) { toast.error("Indica la fecha de primer pago"); return; }
    setSimulating(true);
    setSimResult(null);
    setSelectedOption(null);
    try {
      const ciclo = (selectedGroup.creditos?.length || 0) + 1;
      const res = await apiFetch("/simular/grupal", {
        method: "POST",
        body: JSON.stringify({
          ciclo,
          monto_total_grupo: formData.monto_total_grupo,
          cantidad_integrantes: selectedGroup.clientes?.length || 0,
          origen: formData.origen,
          cantidad_referidos: formData.cantidad_referidos,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSimResult(data);
        if (data.opciones_amortizacion?.length > 0) setSelectedOption(data.opciones_amortizacion[0]);
        setStep(3);
      } else {
        toast.error(data.message || "Error en simulación");
      }
    } catch {
      toast.error("Error al conectar con el motor de cálculo");
    } finally {
      setSimulating(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedOption || !selectedGroup) return;
    setLoading(true);
    try {
      const res = await apiFetch("/creditos", {
        method: "POST",
        body: JSON.stringify({
          id_grupo: selectedGroup.id,
          fecha_otorgacion: formData.fecha_otorgacion,
          fecha_primer_pago: formData.fecha_primer_pago,
          monto_otorgado: formData.monto_total_grupo,
          interes: selectedOption.interes_total,
          total: selectedOption.total_a_pagar_grupo,
          plazos: selectedOption.plazo_semanas,
          valor_ficha: selectedOption.pago_semanal_grupo,
          dias_pago: getDiaPago(formData.fecha_primer_pago),
        }),
      });
      if (res.ok) {
        toast.success("Crédito grupal creado exitosamente");
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        toast.error(data.message || "Error al crear crédito");
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
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
              step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 3 && <div className={cn("w-8 h-1 bg-muted mx-1", step > s && "bg-primary")} />}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
      {/* Step 1: Seleccionar grupo */}
      {step === 1 && (
        <div className="grid gap-2">
          <div className="flex items-center gap-2 text-base font-bold">
            <Users className="h-4 w-4" /> Seleccionar Grupo
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre..."
              className="pl-9 h-9 text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
            <div className="max-h-[200px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0 z-10">
                  <tr className="border-b">
                    <th className="h-9 px-4 text-left font-medium text-muted-foreground">Grupo</th>
                    <th className="h-9 px-4 text-center font-medium text-muted-foreground">Integrantes</th>
                    <th className="h-9 px-4 text-center font-medium text-muted-foreground">Asesor</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredGroups.length > 0 ? (
                    filteredGroups.map((g) => (
                      <tr
                        key={g.id}
                        onClick={() => handleSelectGroup(g)}
                        className="hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                              {g.nombre_grupo?.charAt(0)}
                            </div>
                            <span className="font-medium">{g.nombre_grupo}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant="secondary" className="text-[10px]">
                            {g.clientes?.length || 0}
                          </Badge>
                        </td>
                        <td className="p-3 text-center text-xs text-muted-foreground">
                          {g.asesor?.nombre_asesor || "—"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-muted-foreground italic">
                        No se encontraron grupos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Configurar */}
      {step === 2 && selectedGroup && (
        <div className="grid gap-4">
          <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calculator className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-bold">{selectedGroup.nombre_grupo}</p>
                <p className="text-xs text-muted-foreground">
                  Ciclo: {(selectedGroup.creditos?.length || 0) + 1} | Integrantes: {selectedGroup.clientes?.length || 0}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-xs">Cambiar</Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Monto Total del Grupo ($)</Label>
              <Input
                type="number"
                value={formData.monto_total_grupo}
                onChange={(e) => setFormData({ ...formData, monto_total_grupo: parseFloat(e.target.value) })}
              />
              {selectedGroup.clientes?.length > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  ≈ ${Math.round(formData.monto_total_grupo / selectedGroup.clientes.length).toLocaleString()} por integrante
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Origen</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.origen}
                onChange={(e) => setFormData({ ...formData, origen: e.target.value })}
              >
                {catalogo?.origenes?.map((o: string) => (
                  <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1).replace("_", " ")}</option>
                )) || <option value="nuevo">Nuevo</option>}
              </select>
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
          </div>

          {formData.fecha_primer_pago && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
              <span>Día de pago:</span>
              <Badge variant="secondary" className="font-semibold">{getDiaPago(formData.fecha_primer_pago)}</Badge>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Opciones */}
      {step === 3 && simResult && (
        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">Opciones Disponibles</p>
            <Badge className="bg-primary/10 text-primary border-primary/20 font-bold">
              Tasa: {simResult.tasa_elegible || "N/A"}
            </Badge>
          </div>
          <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
            <div className="max-h-[180px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0 z-10">
                  <tr className="border-b text-[10px] uppercase tracking-wider">
                    <th className="h-9 px-3 text-left font-medium text-muted-foreground">Pago Semanal</th>
                    <th className="h-9 px-3 text-center font-medium text-muted-foreground">Plazo</th>
                    <th className="h-9 px-3 text-center font-medium text-muted-foreground">% Int.</th>
                    <th className="h-9 px-3 text-right font-medium text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {simResult.opciones_amortizacion?.map((op: any, i: number) => (
                    <tr
                      key={i}
                      onClick={() => setSelectedOption(op)}
                      className={cn(
                        "transition-colors cursor-pointer",
                        selectedOption === op ? "bg-primary/10" : "hover:bg-muted/50"
                      )}
                    >
                      <td className="p-2 font-bold text-primary">
                        <div className="flex items-center gap-1">
                          {selectedOption === op && <Check className="h-3 w-3" />}
                          ${op.pago_semanal_grupo}
                        </div>
                      </td>
                      <td className="p-2 text-center font-medium">{op.plazo_semanas} sem</td>
                      <td className="p-2 text-center text-muted-foreground">{op.porcentaje_interes}%</td>
                      <td className="p-2 text-right font-bold">${op.total_a_pagar_grupo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {simResult.mensaje && (
            <div className="p-3 bg-amber-50 text-amber-700 text-xs rounded-lg border border-amber-200 flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {simResult.mensaje}
            </div>
          )}
        </div>
      )}

      {simulating && (
        <div className="text-center p-4 animate-pulse text-muted-foreground text-sm">
          Calculando opciones para el grupo...
        </div>
      )}
      </div>

      {/* Footer */}
      <div className="flex justify-between pt-2 border-t">
        <Button variant="ghost" onClick={step === 1 ? onClose : () => setStep(step - 1)} disabled={loading}>
          {step === 1 ? "Cancelar" : <><ChevronLeft className="mr-2 h-4 w-4" /> Anterior</>}
        </Button>
        {step === 3 ? (
          <Button onClick={handleSubmit} disabled={loading || !selectedOption}>
            {loading ? "Procesando..." : <><Save className="mr-2 h-4 w-4" /> Finalizar Crédito</>}
          </Button>
        ) : step === 2 ? (
          <Button onClick={handleSimulate} disabled={simulating}>
            Siguiente <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
