"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  Search, 
  User, 
  Calculator, 
  AlertCircle,
  Save,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface CustomCreditFormProps {
  onSuccess: () => void;
  onClose: () => void;
}

export function CustomCreditForm({ onSuccess, onClose }: CustomCreditFormProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  
  // Data States
  const [clients, setClients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [catalogo, setCatalogo] = useState<any>(null);
  const [simResult, setSimResult] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState<any>(null);

  const [formData, setFormData] = useState({
    monto_solicitado: 3000,
    origen: "nuevo",
    fecha_otorgacion: new Date().toISOString().split('T')[0],
    fecha_primer_pago: "",
  });

  const getDiaPago = (dateStr: string): string => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split('-').map(Number);
    return ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"][new Date(y, m - 1, d).getDay()];
  };

  // Fetch clients on mount
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await apiFetch("/clientes?per_page=100");
        const data = await res.json();
        if (res.ok) setClients(data.data || data);
      } catch (error) {
        toast.error("Error al cargar clientes");
      }
    };
    fetchClients();

    const fetchCatalogo = async () => {
      try {
        const res = await apiFetch("/simular/catalogo/individual");
        const data = await res.json();
        if (res.ok) setCatalogo(data);
      } catch (error) {}
    };
    fetchCatalogo();
  }, []);

  const filteredClients = clients.filter(c => 
    c.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.curp?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id_cliente?.toString().includes(searchTerm)
  );

  const handleSelectClient = (client: any) => {
    setSelectedClient(client);
    // Pre-fill some data if needed
    setStep(2);
  };

  const handleSimulate = async () => {
    if (!selectedClient) return;
    if (!formData.fecha_otorgacion) { toast.error("Indica la fecha de desembolso"); return; }
    if (!formData.fecha_primer_pago) { toast.error("Indica la fecha de primer pago"); return; }
    
    setSimulating(true);
    setSimResult(null);
    setSelectedOption(null);
    
    try {
      const ciclo = (selectedClient.creditos?.length || 0) + 1;
      const res = await apiFetch("/simular/individual", {
        method: "POST",
        body: JSON.stringify({
          ciclo: ciclo,
          monto_solicitado: formData.monto_solicitado,
          buen_historial: true, // Default to true for personalized
          cantidad_referidos: selectedClient.referencias?.length || 0,
          origen: formData.origen
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSimResult(data);
        if (data.opciones_amortizacion?.length > 0) {
          setSelectedOption(data.opciones_amortizacion[0]);
        }
        setStep(3);
      } else {
        toast.error(data.message || "Error en simulación");
      }
    } catch (error) {
      toast.error("Error al conectar con el motor de cálculo");
    } finally {
      setSimulating(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedOption || !selectedClient) return;

    setLoading(true);
    try {
      const res = await apiFetch("/creditos", {
        method: "POST",
        body: JSON.stringify({
          id_cliente: selectedClient.id_cliente,
          fecha_otorgacion: formData.fecha_otorgacion,
          fecha_primer_pago: formData.fecha_primer_pago,
          monto_otorgado: formData.monto_solicitado,
          interes: selectedOption.interes_total,
          total: selectedOption.total_a_pagar,
          plazos: selectedOption.plazo_semanas,
          valor_ficha: selectedOption.pago_semanal,
          dias_pago: getDiaPago(formData.fecha_primer_pago),
        }),
      });
      
      if (res.ok) {
        toast.success("Crédito creado exitosamente");
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        toast.error(data.message || "Error al crear crédito");
      }
    } catch (error) {
      toast.error("Error al procesar la solicitud");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0 gap-4">
      {/* Stepper Header */}
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
        {/* Step 1: Client Selection */}
        {step === 1 && (
          <div className="grid gap-2">
            <div className="flex items-center gap-2 text-base font-bold">
              <User className="h-4 w-4" /> Seleccionar Cliente
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nombre, CURP o ID..." 
                className="pl-9 h-9 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
              <div className="max-h-[160px] overflow-y-auto overflow-x-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0 z-10">
                    <tr className="border-b transition-colors">
                      <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Cliente</th>
                      <th className="h-10 px-4 text-center align-middle font-medium text-muted-foreground">ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredClients.length > 0 ? (
                      filteredClients.map((c) => (
                        <tr 
                          key={c.id_cliente} 
                          onClick={() => handleSelectClient(c)}
                          className="hover:bg-muted/50 transition-colors cursor-pointer group"
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                {c.nombre_completo.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium leading-none mb-1">{c.nombre_completo}</p>
                                <p className="text-xs text-muted-foreground">{c.curp || "S/CURP"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {c.id_cliente}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="p-8 text-center text-muted-foreground italic">
                          No se encontraron clientes.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Configuration */}
        {step === 2 && selectedClient && (
          <div className="grid gap-4">
            <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calculator className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-bold">{selectedClient.nombre_completo}</p>
                  <p className="text-xs text-muted-foreground">Ciclo: {(selectedClient.creditos?.length || 0) + 1}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-xs">Cambiar</Button>
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
                <Label>Origen</Label>
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
                <Label>Fecha de Desembolso</Label>
                <Input
                  type="date"
                  value={formData.fecha_otorgacion}
                  onChange={(e) => setFormData({...formData, fecha_otorgacion: e.target.value})}
                />
              </div>

              <div className="grid gap-2">
                <Label>Fecha de Primer Pago</Label>
                <Input
                  type="date"
                  value={formData.fecha_primer_pago}
                  onChange={(e) => setFormData({...formData, fecha_primer_pago: e.target.value})}
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

        {/* Step 3: Amortization Selection */}
        {step === 3 && simResult && (
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-lg font-bold">
                <Clock className="h-5 w-5" /> Opciones Disponibles
              </div>
              <Badge className="bg-primary/10 text-primary border-primary/20 font-bold">
                Tasa: {simResult.tasa_elegible || "N/A"}
              </Badge>
            </div>

            <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
              <div className="max-h-[160px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0 z-10">
                    <tr className="border-b transition-colors text-[10px] uppercase tracking-wider">
                      <th className="h-9 px-3 text-left align-middle font-medium text-muted-foreground">Pago Semanal</th>
                      <th className="h-9 px-3 text-center align-middle font-medium text-muted-foreground">Plazo</th>
                      <th className="h-9 px-3 text-center align-middle font-medium text-muted-foreground">Interés</th>
                      <th className="h-9 px-3 text-center align-middle font-medium text-muted-foreground">% Int.</th>
                      <th className="h-9 px-3 text-right align-middle font-medium text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {simResult.opciones_amortizacion?.map((op: any, i: number) => (
                      <tr 
                        key={i} 
                        onClick={() => setSelectedOption(op)}
                        className={cn(
                          "transition-colors cursor-pointer text-xs",
                          selectedOption === op ? "bg-primary/10" : "hover:bg-muted/50"
                        )}
                      >
                        <td className="p-2 font-bold text-primary">
                          <div className="flex items-center gap-1">
                            {selectedOption === op && <Check className="h-3 w-3" />}
                            ${op.pago_semanal}
                          </div>
                        </td>
                        <td className="p-2 text-center font-medium">{op.plazo_semanas} sem</td>
                        <td className="p-2 text-center text-muted-foreground font-semibold">${op.interes_total || (op.total_a_pagar - formData.monto_solicitado)}</td>
                        <td className="p-2 text-center text-muted-foreground">{op.porcentaje_interes}%</td>
                        <td className="p-2 text-right font-bold">${op.total_a_pagar}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {simResult.mensaje && (
              <div className="p-3 bg-amber-50 text-amber-700 text-xs rounded-lg border border-amber-200 flex gap-2 animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {simResult.mensaje}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="flex justify-between pt-2 border-t">
        <Button variant="ghost" onClick={step === 1 ? onClose : () => setStep(step - 1)} disabled={loading}>
          {step === 1 ? "Cancelar" : <><ChevronLeft className="mr-2 h-4 w-4" /> Anterior</>}
        </Button>
        
        {step === 3 ? (
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !selectedOption}
          >
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
