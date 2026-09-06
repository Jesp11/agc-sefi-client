"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { Calculator, Save, AlertCircle, Check, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface GroupCreditFormProps {
  group: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function GroupCreditForm({ group, onSuccess, onCancel }: GroupCreditFormProps) {
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [catalogo, setCatalogo] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    id_grupo: group.id,
    monto_total_grupo: 30000,
    ciclo: (group.creditos?.length || 0) + 1,
    cantidad_integrantes: group.clientes?.length || 0,
    origen: "nuevo",
    dias_pago: "Lunes",
    cantidad_referidos: 0
  });

  const [simResult, setSimResult] = useState<any>(null);
  const [distribucion, setDistribucion] = useState(() =>
    (group.clientes || []).map((cliente: any) => ({
      id_cliente: cliente.id_cliente,
      nombre: cliente.nombre_completo,
      capital: "",
    }))
  );

  const capitalDistribuido = distribucion.reduce((total: number, item: any) => total + (Number(item.capital) || 0), 0);
  const distribucionCompleta = distribucion.length === formData.cantidad_integrantes
    && distribucion.every((item: any) => Number(item.capital) > 0)
    && Math.round(capitalDistribuido * 100) === Math.round(Number(formData.monto_total_grupo || 0) * 100);

  // Carga inicial del catálogo y simulación recomendada
  useEffect(() => {
    const init = async () => {
      setSimulating(true);
      try {
        // 1. Cargar catálogo
        const catRes = await apiFetch("/simular/catalogo/grupal");
        const catData = await catRes.json();
        let currentMonto = 30000;
        
        if (catRes.ok) {
          setCatalogo(catData);
          // Si es ciclo 1, el monto mínimo suele ser 3000 * integrantes
          const minMonto = catData.montos_minimos?.[formData.origen] || 30000;
          currentMonto = Math.max(minMonto, 3000 * formData.cantidad_integrantes);
          setFormData(prev => ({ ...prev, monto_total_grupo: currentMonto }));
        }

        // 2. Realizar simulación inicial recomendada
        const simRes = await apiFetch("/simular/grupal", {
          method: "POST",
          body: JSON.stringify({
            ciclo: formData.ciclo,
            monto_total_grupo: currentMonto,
            cantidad_integrantes: formData.cantidad_integrantes,
            origen: formData.origen,
            cantidad_referidos: formData.cantidad_referidos
          }),
        });
        const simData = await simRes.json();
        if (simRes.ok) {
          setSimResult(simData);
          const first = simData.opciones_amortizacion?.[0] ?? simData.opciones?.[0];
          if (first) {
            const monto = currentMonto;
            const pagoBase = Number(first.pago_semanal_grupo ?? first.pago_semanal) || 0;
            const plazos = Number(first.plazo_semanas) || 1;
            const factor = monto > 0 ? pagoBase / (monto / 1000) : 0;
            const pago_semanal_grupo = parseFloat((factor * (monto / 1000)).toFixed(2));
            const total_a_pagar_grupo = parseFloat((pago_semanal_grupo * plazos).toFixed(2));
            const interes_total = parseFloat((total_a_pagar_grupo - monto).toFixed(2));
            setSelectedOption({
              ...first,
              factor,
              plazoCatalogo: plazos,
              _pagoBase: pagoBase,
              plazo_semanas: plazos,
              pago_semanal_grupo,
              total_a_pagar_grupo,
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
  }, [group.id]);

  const handleSimulate = async () => {
    if (formData.monto_total_grupo <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return;
    }

    setSimulating(true);
    setSimResult(null);
    setSelectedOption(null);
    try {
      const res = await apiFetch("/simular/grupal", {
        method: "POST",
        body: JSON.stringify({
          ciclo: formData.ciclo,
          monto_total_grupo: formData.monto_total_grupo,
          cantidad_integrantes: formData.cantidad_integrantes,
          origen: formData.origen,
          cantidad_referidos: formData.cantidad_referidos
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
    const monto = Number(formData.monto_total_grupo) || 0;
    const pagoBase = Number(op.pago_semanal_grupo ?? op.pago_semanal ?? op._pagoBase) || 0;
    const plazoBase = Number(op.plazoCatalogo ?? op.plazo_semanas) || 1;
    const factor = Number(op.factor) || (monto > 0 ? pagoBase / (monto / 1000) : 0);
    const pago_semanal_grupo = parseFloat((factor * (monto / 1000)).toFixed(2));
    const total_a_pagar_grupo = parseFloat((pago_semanal_grupo * plazos).toFixed(2));
    const interes_total = parseFloat((total_a_pagar_grupo - monto).toFixed(2));
    const porcentaje_interes = monto > 0 ? parseFloat(((interes_total / monto) * 100).toFixed(2)) : 0;
    return {
      ...op,
      factor,
      plazoCatalogo: plazoBase,
      _pagoBase: pagoBase,
      plazo_semanas: plazos,
      pago_semanal_grupo,
      total_a_pagar_grupo,
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
    if (!distribucionCompleta) {
      toast.error("Asigna un capital mayor a cero a cada integrante y haz que la suma coincida con el monto grupal.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch("/creditos", {
        method: "POST",
        body: JSON.stringify({
          id_grupo: formData.id_grupo,
          fecha_otorgacion: new Date().toISOString().split('T')[0],
          monto_otorgado: formData.monto_total_grupo,
          interes: selectedOption.interes_total,
          total: selectedOption.total_a_pagar_grupo,
          plazos: selectedOption.plazo_semanas,
          valor_ficha: selectedOption.pago_semanal_grupo,
          dias_pago: formData.dias_pago,
          tasa_asignada: simResult.tasa_elegible,
          porcentaje_interes: selectedOption.porcentaje_interes,
          distribucion_integrantes: distribucion.map((item: any) => ({
            id_cliente: item.id_cliente,
            capital: Number(item.capital),
          })),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Préstamo grupal otorgado exitosamente");
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
      <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold">Solicitud Grupal: {group.nombre_grupo}</p>
            <p className="text-xs text-muted-foreground">Ciclo: {formData.ciclo} | Integrantes: {formData.cantidad_integrantes}</p>
          </div>
        </div>
        {simResult && (
          <div className="text-right">
            <Badge className="font-bold uppercase tracking-wider text-[10px]">
              Tasa: {simResult.tasa_elegible || "N/A"}
            </Badge>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label className="text-xs font-bold uppercase text-muted-foreground">Monto Total del Grupo ($)</Label>
          <Input 
            type="number" 
            value={formData.monto_total_grupo} 
            onChange={(e) => setFormData({...formData, monto_total_grupo: parseFloat(e.target.value)})}
            className="font-bold"
          />
          <p className="text-[10px] text-muted-foreground">Equivale a approx. ${Math.round(formData.monto_total_grupo / formData.cantidad_integrantes)} por integrante.</p>
        </div>
        <div className="grid gap-2">
          <Label className="text-xs font-bold uppercase text-muted-foreground">Origen del Grupo</Label>
          <select 
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            value={formData.origen}
            onChange={(e) => setFormData({...formData, origen: e.target.value})}
          >
            {catalogo?.origenes?.map((o: string) => (
              <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1).replace('_', ' ')}</option>
            )) || <option value="nuevo">Nuevo</option>}
          </select>
        </div>
        <div className="grid gap-2">
          <Label className="text-xs font-bold uppercase text-muted-foreground">Día de Pago Sugerido</Label>
          <select 
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
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
          <Button variant="secondary" className="w-full h-10 font-bold" onClick={handleSimulate} disabled={simulating}>
            <Calculator className="mr-2 h-4 w-4" />
            Recalcular Opciones
          </Button>
        </div>
      </div>

      {simulating && (
        <div className="flex flex-col items-center justify-center p-8 gap-3 border rounded-xl bg-muted/20 animate-pulse">
          <Calculator className="h-8 w-8 text-primary/40" />
          <p className="text-xs font-medium text-muted-foreground tracking-tight">Analizando capacidad de pago del grupo...</p>
        </div>
      )}

      {simResult && simResult.opciones_amortizacion && (
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Opciones de Amortización</p>
          <div className="grid gap-2">
            {simResult.opciones_amortizacion.map((op: any, i: number) => {
              const isSelected = selectedOption?.plazoCatalogo === op.plazo_semanas
                && Number(selectedOption?._pagoBase ?? selectedOption?.pago_semanal_grupo) === Number(op.pago_semanal_grupo);
              return (
              <button 
                key={i}
                type="button"
                onClick={() => handleSelectOption(op)}
                className={cn(
                  "p-4 border rounded-xl grid grid-cols-4 gap-4 text-center items-center transition-all duration-200",
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm shadow-primary/20" 
                    : "bg-background hover:border-muted-foreground/30 hover:bg-muted/10 border-muted"
                )}
              >
                <div className="text-left">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">PAGO SEMANAL</p>
                  <p className="text-lg font-black text-foreground">${op.pago_semanal_grupo}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">PLAZO</p>
                  <p className="text-sm font-bold text-foreground">{op.plazo_semanas} sem</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">TOTAL</p>
                  <p className="text-sm font-bold text-foreground">${op.total_a_pagar_grupo}</p>
                </div>
                <div className="flex justify-end">
                  {isSelected ? (
                    <div className="bg-primary text-primary-foreground p-1 rounded-full">
                      <Check className="h-4 w-4" />
                    </div>
                  ) : (
                    <Badge variant="outline" className="text-[10px] font-bold border-primary/20 text-primary">
                      {op.porcentaje_interes}% INT.
                    </Badge>
                  )}
                </div>
              </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedOption && (
        <div className="grid grid-cols-2 gap-3 rounded-xl border p-4">
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
          <div className="text-right text-xs space-y-1 self-end">
            <p className="text-muted-foreground">Pago semanal <span className="font-semibold text-foreground">${Number(selectedOption.pago_semanal_grupo).toLocaleString()}</span></p>
            <p className="text-muted-foreground">Total <span className="font-semibold text-foreground">${Number(selectedOption.total_a_pagar_grupo).toLocaleString()}</span></p>
          </div>
        </div>
      )}

      <div className="rounded-xl border p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold">Distribución por integrante</p>
            <p className="text-xs text-muted-foreground">Esta distribución se usará para los documentos individuales; no crea créditos ni pagos separados.</p>
          </div>
          <Badge variant={distribucionCompleta ? "default" : "outline"} className={distribucionCompleta ? "bg-emerald-600" : ""}>
            ${capitalDistribuido.toLocaleString("es-MX", { minimumFractionDigits: 2 })} / ${Number(formData.monto_total_grupo || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </Badge>
        </div>
        {distribucion.length === 0 ? (
          <p className="text-sm text-destructive">El grupo no tiene integrantes. Agrega integrantes antes de otorgar el crédito.</p>
        ) : (
          <div className="grid gap-2">
            {distribucion.map((item: any, index: number) => (
              <div key={item.id_cliente} className="grid grid-cols-[1fr_9rem] gap-3 items-center">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.nombre}</p>
                  <p className="text-[10px] font-mono text-muted-foreground">{item.id_cliente}</p>
                </div>
                <Input
                  aria-label={`Capital de ${item.nombre}`}
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Capital"
                  value={item.capital}
                  onChange={(e) => setDistribucion((actual: any[]) => actual.map((fila, pos) => pos === index ? { ...fila, capital: e.target.value } : fila))}
                />
              </div>
            ))}
          </div>
        )}
        {!distribucionCompleta && (
          <p className="text-xs text-amber-700">Faltan ${Math.max(0, Number(formData.monto_total_grupo || 0) - capitalDistribuido).toLocaleString("es-MX", { minimumFractionDigits: 2 })} por asignar, o la suma debe corregirse.</p>
        )}
      </div>

      {simResult && simResult.mensaje && (
        <div className="p-4 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200 flex gap-3 shadow-sm">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="space-y-1">
            <p className="font-bold">Nota del Sistema</p>
            <p className="leading-relaxed">{simResult.mensaje}</p>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={onCancel} disabled={loading}>Cancelar</Button>
        <Button 
          onClick={handleSubmit} 
          disabled={loading || !selectedOption || !distribucionCompleta}
          className="px-8 font-bold"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></span>
              Procesando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Otorgar Préstamo Grupal
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
