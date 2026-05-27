"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { Check, ChevronRight, ChevronLeft, UserPlus, Users, ShieldCheck, UserCheck, Briefcase, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface ClientFormWizardProps {
  onSuccess: () => void;
  onClose: () => void;
}

export function ClientFormWizard({ onSuccess, onClose }: ClientFormWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [asesores, setAsesores] = useState<any[]>([]);

  // Form States
  const [clientData, setClientData] = useState({
    nombre_completo: "",
    curp: "",
    clave_elector: "",
    telefono: "",
    direccion: "",
    entre_calles: "",
    ocupacion: "",
    direccion_trabajo: "",
    telefono_trabajo: "",
    fecha_nacimiento: "",
    id_asesor: "",
  });

  const [referencias, setReferencias] = useState([{ nombre: "", parentesco: "", telefono: "", direccion: "", tipo_referencia: "Familiar", años_amistad: 1 }]);
  const [avales, setAvales] = useState([{ nombre: "", parentesco: "", telefono: "", direccion: "", tiempo_conocer: "", ocupacion_laboral: "", empresa: "" }]);
  const [expandedRef, setExpandedRef] = useState(0);
  const [expandedAval, setExpandedAval] = useState(0);

  useEffect(() => {
    const fetchAsesores = async () => {
      const res = await apiFetch("/asesores");
      const data = await res.json();
      if (res.ok) setAsesores(data.data || data);
    };
    fetchAsesores();
  }, []);

  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => s - 1);

  const handleSubmit = async () => {
    if (!clientData.id_asesor) {
      toast.error("Selecciona un asesor antes de guardar el cliente.");
      return;
    }
    setLoading(true);
    try {
      // 1. Create Client
      const clientRes = await apiFetch("/clientes", {
        method: "POST",
        body: JSON.stringify({
          ...clientData,
          id_asesor: clientData.id_asesor ? parseInt(clientData.id_asesor) : null,
        }),
      });

      if (!clientRes.ok) {
        const errorData = await clientRes.json();
        throw new Error(errorData.message || "Error al crear cliente. Verifique los campos.");
      }
      const clientResult = await clientRes.json();
      const idCliente = clientResult.data.id_cliente;

      // 2. Create References
      for (const ref of referencias) {
        if (ref.nombre && ref.direccion) {
          const refRes = await apiFetch("/referencias", {
            method: "POST",
            body: JSON.stringify({ ...ref, id_cliente: idCliente }),
          });
          if (!refRes.ok) {
             const errorData = await refRes.json();
             throw new Error(`Error en referencia ${ref.nombre}: ${errorData.message}`);
          }
        }
      }

      // 3. Create Avales
      for (const aval of avales) {
        if (aval.nombre && aval.direccion) {
          const avalRes = await apiFetch("/avales", {
            method: "POST",
            body: JSON.stringify({ ...aval, id_cliente: idCliente }),
          });
          if (!avalRes.ok) {
            const errorData = await avalRes.json();
            throw new Error(`Error en aval ${aval.nombre}: ${errorData.message}`);
          }
        }
      }

      toast.success("Cliente creado exitosamente con sus referencias y avales");
      onSuccess();
      onClose();
      router.push(`/dashboard/clientes/${idCliente}`);
    } catch (error: any) {
      toast.error(error.message || "Error en el proceso");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 gap-4 overflow-hidden min-h-0">
      {/* Stepper Header */}
      <div className="flex justify-center items-center mb-4 gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} className="flex items-center">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
              step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 5 && <div className={cn("w-8 h-1 bg-muted mx-1", step > s && "bg-primary")} />}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        {/* Step 1: Client Info */}
        {step === 1 && (
          <div className="grid gap-4">
            <div className="flex items-center gap-2 text-lg font-bold">
              <UserPlus className="h-5 w-5" /> Información Esencial
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Nombre Completo</Label>
                <Input value={clientData.nombre_completo} onChange={(e) => setClientData({...clientData, nombre_completo: e.target.value})} placeholder="Nombre completo" />
              </div>
              <div className="grid gap-2">
                <Label>Teléfono</Label>
                <Input value={clientData.telefono} onChange={(e) => setClientData({...clientData, telefono: e.target.value})} placeholder="555..." />
              </div>
              <div className="grid gap-2">
                <Label>CURP</Label>
                <Input
                  value={clientData.curp}
                  onChange={(e) => {
                    const curp = e.target.value.toUpperCase();
                    const updates: any = { curp };
                    if (curp.length >= 10) {
                      const yy = parseInt(curp.slice(4, 6), 10);
                      const mm = curp.slice(6, 8);
                      const dd = curp.slice(8, 10);
                      const year = yy <= new Date().getFullYear() - 2000 ? 2000 + yy : 1900 + yy;
                      const fecha = `${year}-${mm}-${dd}`;
                      if (!isNaN(Date.parse(fecha))) updates.fecha_nacimiento = fecha;
                    }
                    setClientData({ ...clientData, ...updates });
                  }}
                  placeholder="CURP"
                />
              </div>
              <div className="grid gap-2">
                <Label>Clave de Elector</Label>
                <Input value={clientData.clave_elector} onChange={(e) => setClientData({...clientData, clave_elector: e.target.value})} placeholder="Clave de Elector" />
              </div>
              <div className="grid gap-2 col-span-2">
                <Label>Dirección Particular</Label>
                <Input value={clientData.direccion} onChange={(e) => setClientData({...clientData, direccion: e.target.value})} placeholder="Calle, número, colonia" />
              </div>
              <div className="grid gap-2 col-span-2">
                <Label>Entre Calles</Label>
                <Input value={clientData.entre_calles} onChange={(e) => setClientData({...clientData, entre_calles: e.target.value})} placeholder="Calle A y Calle B" />
              </div>
              <div className="grid gap-2">
                <Label>Fecha de Nacimiento</Label>
                <Input type="date" value={clientData.fecha_nacimiento} onChange={(e) => setClientData({...clientData, fecha_nacimiento: e.target.value})} />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Work Info */}
        {step === 2 && (
          <div className="grid gap-4">
            <div className="flex items-center gap-2 text-lg font-bold">
              <Briefcase className="h-5 w-5" /> Información Laboral
            </div>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Ocupación</Label>
                <Input value={clientData.ocupacion} onChange={(e) => setClientData({...clientData, ocupacion: e.target.value})} placeholder="Ej. Comerciante, Ama de casa" />
              </div>
              <div className="grid gap-2">
                <Label>Dirección de Trabajo</Label>
                <Input value={clientData.direccion_trabajo} onChange={(e) => setClientData({...clientData, direccion_trabajo: e.target.value})} placeholder="Ubicación del negocio o empleo" />
              </div>
              <div className="grid gap-2">
                <Label>Teléfono de Trabajo</Label>
                <Input value={clientData.telefono_trabajo} onChange={(e) => setClientData({...clientData, telefono_trabajo: e.target.value})} placeholder="Teléfono del trabajo" />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: References */}
        {step === 3 && (
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-lg font-bold">
                <Users className="h-5 w-5" /> Referencias
              </div>
              <Button variant="outline" size="sm" onClick={() => {
                const next = referencias.length;
                setReferencias([...referencias, { nombre: "", parentesco: "", telefono: "", direccion: "", tipo_referencia: "Familiar", años_amistad: 1 }]);
                setExpandedRef(next);
              }}>
                + Añadir otra
              </Button>
            </div>
            <div className="overflow-y-auto max-h-80 flex flex-col gap-3 pr-1">
            {referencias.map((ref, i) => (
              expandedRef === i ? (
                <div key={i} className="p-3 border rounded-lg grid grid-cols-2 gap-3 bg-muted/30">
                  <div className="col-span-2 flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-muted-foreground">Referencia {i + 1}</span>
                    {referencias.length > 1 && (
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-destructive hover:text-destructive" onClick={() => {
                        const newRefs = referencias.filter((_, idx) => idx !== i);
                        setReferencias(newRefs);
                        setExpandedRef(Math.max(0, i - 1));
                      }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Nombre</Label>
                    <Input value={ref.nombre} onChange={(e) => {
                      const newRefs = [...referencias];
                      newRefs[i].nombre = e.target.value;
                      setReferencias(newRefs);
                    }} size={1} className="h-8 text-sm" />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Parentesco</Label>
                    <Input value={ref.parentesco} onChange={(e) => {
                      const newRefs = [...referencias];
                      newRefs[i].parentesco = e.target.value;
                      setReferencias(newRefs);
                    }} className="h-8 text-sm" />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Teléfono</Label>
                    <Input value={ref.telefono} onChange={(e) => {
                      const newRefs = [...referencias];
                      newRefs[i].telefono = e.target.value;
                      setReferencias(newRefs);
                    }} className="h-8 text-sm" />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Tipo</Label>
                    <select
                      value={ref.tipo_referencia}
                      onChange={(e) => {
                        const newRefs = [...referencias];
                        newRefs[i].tipo_referencia = e.target.value;
                        setReferencias(newRefs);
                      }}
                      className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="Familiar">Familiar</option>
                      <option value="Amistad">Amistad</option>
                    </select>
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Amistad (años)</Label>
                    <Input type="number" value={ref.años_amistad} onChange={(e) => {
                      const newRefs = [...referencias];
                      newRefs[i].años_amistad = parseInt(e.target.value) || 0;
                      setReferencias(newRefs);
                    }} className="h-8 text-sm" />
                  </div>
                  <div className="grid gap-1 col-span-2">
                    <Label className="text-xs">Dirección</Label>
                    <Input value={ref.direccion} onChange={(e) => {
                      const newRefs = [...referencias];
                      newRefs[i].direccion = e.target.value;
                      setReferencias(newRefs);
                    }} className="h-8 text-sm" />
                  </div>
                </div>
              ) : (
                <div key={i} className="flex items-center justify-between px-3 py-2 border rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                    <span className="text-sm font-medium">{ref.nombre || <span className="text-muted-foreground italic">Sin nombre</span>}</span>
                    {ref.tipo_referencia && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{ref.tipo_referencia}</span>}
                    {ref.parentesco && <span className="text-xs text-muted-foreground">{ref.parentesco}</span>}
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => setExpandedRef(i)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              )
            ))}
            </div>
          </div>
        )}

        {/* Step 4: Avales */}
        {step === 4 && (
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-lg font-bold">
                <ShieldCheck className="h-5 w-5" /> Avales
              </div>
              <Button variant="outline" size="sm" onClick={() => {
                const next = avales.length;
                setAvales([...avales, { nombre: "", parentesco: "", telefono: "", direccion: "", tiempo_conocer: "", ocupacion_laboral: "", empresa: "" }]);
                setExpandedAval(next);
              }}>
                + Añadir otro
              </Button>
            </div>
            <div className="overflow-y-auto max-h-80 flex flex-col gap-3 pr-1">
            {avales.map((aval, i) => (
              expandedAval === i ? (
                <div key={i} className="p-3 border rounded-lg grid grid-cols-2 gap-3 bg-muted/30">
                  <div className="col-span-2 flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-muted-foreground">Aval {i + 1}</span>
                    {avales.length > 1 && (
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-destructive hover:text-destructive" onClick={() => {
                        const newAvales = avales.filter((_, idx) => idx !== i);
                        setAvales(newAvales);
                        setExpandedAval(Math.max(0, i - 1));
                      }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Nombre</Label>
                    <Input value={aval.nombre} onChange={(e) => {
                      const newAvales = [...avales];
                      newAvales[i].nombre = e.target.value;
                      setAvales(newAvales);
                    }} className="h-8 text-sm" />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Teléfono</Label>
                    <Input value={aval.telefono} onChange={(e) => {
                      const newAvales = [...avales];
                      newAvales[i].telefono = e.target.value;
                      setAvales(newAvales);
                    }} className="h-8 text-sm" />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Parentesco</Label>
                    <Input value={aval.parentesco} onChange={(e) => {
                      const newAvales = [...avales];
                      newAvales[i].parentesco = e.target.value;
                      setAvales(newAvales);
                    }} className="h-8 text-sm" />
                  </div>
                  <div className="grid gap-1 col-span-2">
                    <Label className="text-xs">Dirección</Label>
                    <Input value={aval.direccion} onChange={(e) => {
                      const newAvales = [...avales];
                      newAvales[i].direccion = e.target.value;
                      setAvales(newAvales);
                    }} className="h-8 text-sm" />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Tiempo de conocerse</Label>
                    <Input value={aval.tiempo_conocer} onChange={(e) => {
                      const newAvales = [...avales];
                      newAvales[i].tiempo_conocer = e.target.value;
                      setAvales(newAvales);
                    }} placeholder="Ej. 5 años" className="h-8 text-sm" />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Ocupación Laboral</Label>
                    <Input value={aval.ocupacion_laboral} onChange={(e) => {
                      const newAvales = [...avales];
                      newAvales[i].ocupacion_laboral = e.target.value;
                      setAvales(newAvales);
                    }} className="h-8 text-sm" />
                  </div>
                  <div className="grid gap-1 col-span-2">
                    <Label className="text-xs">Empresa / Negocio</Label>
                    <Input value={aval.empresa} onChange={(e) => {
                      const newAvales = [...avales];
                      newAvales[i].empresa = e.target.value;
                      setAvales(newAvales);
                    }} className="h-8 text-sm" />
                  </div>
                </div>
              ) : (
                <div key={i} className="flex items-center justify-between px-3 py-2 border rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                    <span className="text-sm font-medium">{aval.nombre || <span className="text-muted-foreground italic">Sin nombre</span>}</span>
                    {aval.parentesco && <span className="text-xs text-muted-foreground">{aval.parentesco}</span>}
                    {aval.telefono && <span className="text-xs text-muted-foreground">{aval.telefono}</span>}
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => setExpandedAval(i)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              )
            ))}
            </div>
          </div>
        )}

        {/* Step 5: Asesor */}
        {step === 5 && (
          <div className="grid gap-4">
            <div className="flex items-center gap-2 text-lg font-bold">
              <UserCheck className="h-5 w-5" /> Asignar Asesor
            </div>
            <div className="grid gap-2 mt-4">
              <Label>Selecciona un Asesor</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={clientData.id_asesor}
                onChange={(e) => setClientData({...clientData, id_asesor: e.target.value})}
              >
                <option value="">Seleccione un asesor...</option>
                {asesores.map((a, index) => (
                  <option key={a.id || index} value={a.id}>{a.nombre_asesor}</option>
                ))}
              </select>
            </div>
            <div className="mt-8 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <p>Revisa que toda la información sea correcta antes de guardar el cliente final.</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="flex justify-between pt-2 border-t">
        <Button variant="ghost" onClick={step === 1 ? onClose : handleBack} disabled={loading}>
          {step === 1 ? "Cancelar" : <><ChevronLeft className="mr-2 h-4 w-4" /> Anterior</>}
        </Button>
        
        {step < 5 ? (
          <Button onClick={handleNext}>
            Siguiente <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Guardando..." : "Guardar Cliente"}
          </Button>
        )}
      </div>
    </div>
  );
}
