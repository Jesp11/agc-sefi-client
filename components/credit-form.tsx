"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { Calculator, Save, AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreditFormProps {
  client: any;
  onSuccess: () => void;
}

export function CreditForm({ client, onSuccess }: CreditFormProps) {
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [catalogo, setCatalogo] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    id_cliente: client.id_cliente || client.id,
    id_asesor: client.id_asesor,
    monto_solicitado: 3000,
    ciclo: (client.creditos?.length || 0) + 1,
    buen_historial: true,
    cantidad_referidos: client.referencias?.length || 0,
    origen: "nuevo",
    dias_pago: "Lunes",
  });

  const [simResult, setSimResult] = useState<any>(null);

  // Carga inicial del catálogo y simulación recomendada
  useEffect(() => {
    const init = async () => {
      setSimulating(true);
      try {
        // 1. Cargar catálogo
        const catRes = await apiFetch("/simular/catalogo/individual");
        const catData = await catRes.json();
        let currentMonto = 3000;
        if (catRes.ok) {
          setCatalogo(catData);
          if (catData.monto_minimo) {
            currentMonto = catData.monto_minimo;
            setFormData(prev => ({ ...prev, monto_solicitado: catData.monto_minimo }));
          }
        }

        // 2. Realizar simulación inicial recomendada
        const simRes = await apiFetch("/simular/individual", {
          method: "POST",
          body: JSON.stringify({
            ciclo: formData.ciclo,
            monto_solicitado: currentMonto,
            buen_historial: formData.buen_historial,
            cantidad_referidos: formData.cantidad_referidos,
            origen: formData.origen
          }),
        });
        const simData = await simRes.json();
        if (simRes.ok) {
          setSimResult(simData);
          const first = simData.opciones_amortizacion?.[0] ?? simData.opciones?.[0];
          if (first) {
            const monto = currentMonto;
            const pagoBase = Number(first.pago_semanal) || 0;
            const plazos = Number(first.plazo_semanas) || 1;
            const factor = monto > 0 ? pagoBase / (monto / 1000) : 0;
            const pago_semanal = parseFloat((factor * (monto / 1000)).toFixed(2));
            const total_a_pagar = parseFloat((pago_semanal * plazos).toFixed(2));
            const interes_total = parseFloat((total_a_pagar - monto).toFixed(2));
            setSelectedOption({
              ...first,
              factor,
              plazoCatalogo: plazos,
              _pagoBase: pagoBase,
              plazo_semanas: plazos,
              pago_semanal,
              total_a_pagar,
              interes_total,
              porcentaje_interes: monto > 0 ? parseFloat(((interes_total / monto) * 100).toFixed(2)) : 0,
            });
          }
        }
      } catch (error) {
        toast.error("Error al conectar con el motor de recomendaciones");
      } finally {
        setSimulating(false);
      }
    };
    init();
  }, []);

  const handleSimulate = async () => {
    setSimulating(true);
    setSimResult(null);
    setSelectedOption(null);
    try {
      const res = await apiFetch("/simular/individual", {
        method: "POST",
        body: JSON.stringify({
          ciclo: formData.ciclo,
          monto_solicitado: formData.monto_solicitado,
          buen_historial: formData.buen_historial,
          cantidad_referidos: formData.cantidad_referidos,
          origen: formData.origen
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSimResult(data);
        const first = data.opciones_amortizacion?.[0] ?? data.opciones?.[0];
        if (first) setSelectedOption(applyOptionPlazos(first, Number(first.plazo_semanas) || 1));
        toast.success("Simulación actualizada");
      } else {
        toast.error(data.message || "Error en simulación");
      }
    } catch (error) {
      toast.error("Error al conectar con el motor de cálculo");
    } finally {
      setSimulating(false);
    }
  };

  const applyOptionPlazos = (op: any, plazos: number) => {
    const monto = Number(formData.monto_solicitado) || 0;
    const pagoBase = Number(op.pago_semanal ?? op._pagoBase) || 0;
    const plazoBase = Number(op.plazoCatalogo ?? op.plazo_semanas) || 1;
    const factor = Number(op.factor) || (monto > 0 ? pagoBase / (monto / 1000) : 0);
    const pago_semanal = parseFloat((factor * (monto / 1000)).toFixed(2));
    const total_a_pagar = parseFloat((pago_semanal * plazos).toFixed(2));
    const interes_total = parseFloat((total_a_pagar - monto).toFixed(2));
    const porcentaje_interes = monto > 0 ? parseFloat(((interes_total / monto) * 100).toFixed(2)) : 0;
    return {
      ...op,
      factor,
      plazoCatalogo: plazoBase,
      _pagoBase: pagoBase,
      plazo_semanas: plazos,
      pago_semanal,
      total_a_pagar,
      interes_total,
      porcentaje_interes,
    };
  };

  const handleSelectOption = (op: any) => {
    setSelectedOption(applyOptionPlazos(op, Number(op.plazo_semanas) || 1));
  };

  const handlePlazosChange = (value: string) => {
    if (!selectedOption) return;
    const plazos = parseInt(value, 10) || 0;
    if (plazos < 1) return;
    setSelectedOption(applyOptionPlazos(selectedOption, plazos));
  };

  const handleSubmit = async () => {
    if (!selectedOption) {
      toast.error("Debe seleccionar una opción de préstamo");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch("/creditos", {
        method: "POST",
        body: JSON.stringify({
          id_cliente: formData.id_cliente,
          fecha_otorgacion: new Date().toISOString().split('T')[0],
          monto_otorgado: formData.monto_solicitado,
          interes: selectedOption.interes_total,
          total: selectedOption.total_a_pagar,
          plazos: selectedOption.plazo_semanas,
          valor_ficha: selectedOption.pago_semanal,
          dias_pago: formData.dias_pago
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Préstamo otorgado exitosamente");
        onSuccess();
      } else {
        toast.error(data.message || "Error al crear préstamo");
      }
    } catch (error) {
      toast.error("Error al procesar la solicitud");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calculator className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-bold">Recomendación para {client.nombre_completo}</p>
            <p className="text-xs text-muted-foreground">Ciclo: {formData.ciclo} | Referencias: {formData.cantidad_referidos}</p>
          </div>
        </div>
        {simResult && (
          <div className="text-right">
            <span className="bg-primary text-primary-foreground text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider">
              Tasa: {simResult.tasa_elegible || "N/A"}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Monto a Solicitar ($)</Label>
          <Input 
            type="number" 
            value={formData.monto_solicitado} 
            onChange={(e) => setFormData({...formData, monto_solicitado: parseFloat(e.target.value)})}
          />
        </div>
        <div className="grid gap-2">
          <Label>Origen del Cliente</Label>
          <select 
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={formData.origen}
            onChange={(e) => setFormData({...formData, origen: e.target.value})}
          >
            {catalogo?.origenes?.map((o: string) => (
              <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
            )) || <option value="nuevo">Nuevo</option>}
          </select>
        </div>
        <div className="grid gap-2">
          <Label>Día de Pago</Label>
          <select 
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={formData.dias_pago}
            onChange={(e) => setFormData({...formData, dias_pago: e.target.value})}
          >
            <option value="Lunes">Lunes</option>
            <option value="Martes">Martes</option>
            <option value="Miércoles">Miércoles</option>
            <option value="Jueves">Jueves</option>
            <option value="Viernes">Viernes</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button variant="secondary" className="w-full" onClick={handleSimulate} disabled={simulating}>
            <Calculator className="mr-2 h-4 w-4" />
            Recalcular
          </Button>
        </div>
      </div>

      {simulating && <div className="text-center p-4 animate-pulse text-muted-foreground text-sm">Calculando mejores opciones...</div>}

      {simResult && simResult.opciones_amortizacion && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase">Opciones Sugeridas</p>
          <div className="grid gap-2">
            {simResult.opciones_amortizacion.map((op: any, i: number) => {
              const isSelected = selectedOption?.plazoCatalogo === op.plazo_semanas
                && Number(selectedOption?._pagoBase ?? selectedOption?.pago_semanal) === Number(op.pago_semanal);
              return (
              <button 
                key={i} 
                type="button"
                onClick={() => handleSelectOption(op)}
                className={cn(
                  "p-3 border rounded-lg grid grid-cols-4 gap-2 text-center items-center transition-all",
                  isSelected ? "border-primary bg-primary/10 ring-1 ring-primary" : "bg-muted/30 hover:bg-muted"
                )}
              >
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground">PAGO</p>
                  <p className="text-sm font-bold">${op.pago_semanal}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground">PLAZO</p>
                  <p className="text-sm font-bold">{op.plazo_semanas} sem</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground">TOTAL</p>
                  <p className="text-sm font-bold">${op.total_a_pagar}</p>
                </div>
                <div className="text-xs text-primary font-bold">
                  {isSelected ? <Check className="h-4 w-4 mx-auto" /> : `${op.porcentaje_interes}% INT.`}
                </div>
              </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedOption && (
        <div className="grid gap-3 rounded-lg border p-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Semanas</Label>
              <Input
                type="number"
                min={1}
                max={104}
                value={selectedOption.plazo_semanas}
                onChange={(e) => handlePlazosChange(e.target.value)}
              />
            </div>
            <div className="grid gap-1 justify-end text-right">
              <p className="text-xs text-muted-foreground">Pago semanal</p>
              <p className="font-semibold">${Number(selectedOption.pago_semanal).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total ${Number(selectedOption.total_a_pagar).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {simResult && simResult.mensaje && (
        <div className="p-3 bg-amber-50 text-amber-700 text-xs rounded-md border border-amber-200 flex gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {simResult.mensaje}
        </div>
      )}

      <div className="flex justify-end gap-3 mt-4">
        <Button variant="ghost" onClick={() => onSuccess()} disabled={loading}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={loading || !selectedOption}>
          <Save className="mr-2 h-4 w-4" />
          {loading ? "Otorgando..." : "Otorgar Préstamo Seleccionado"}
        </Button>
      </div>
    </div>
  );
}
