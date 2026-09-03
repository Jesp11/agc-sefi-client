"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { PlusCircle, Save, Trash2 } from "lucide-react";
import { generarNominaHtml, NominaEmployeeData } from "@/lib/nomina-template";
import { imprimirDocumentoHtml } from "@/lib/document-templates";
import { fetchAllPages } from "@/lib/table-utils";

type EmpleadoCatalogo = {
  id: number | string;
  nombre_asesor: string;
  cumpleanos?: string | null;
  curp?: string | null;
  rfc?: string | null;
  nss?: string | null;
  banco?: string | null;
  cuenta_bancaria?: string | null;
  sueldo_base?: number | string | null;
  despensa?: number | string | null;
  apoyo_transporte?: number | string | null;
  activo?: boolean;
};

type CampoImporteNomina = "pago_base" | "despensa" | "apoyo_transporte" | "ahorro";

export default function NominaBuilderPage() {
  const [empleadosCatalog, setEmpleadosCatalog] = useState<EmpleadoCatalogo[]>([]);
  const [loading, setLoading] = useState(true);

  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [referencia, setReferencia] = useState("");
  const [firmaDirAdmin, setFirmaDirAdmin] = useState("");
  const [firmaDirOperativo, setFirmaDirOperativo] = useState("");

  const [selectedEmpleados, setSelectedEmpleados] = useState<NominaEmployeeData[]>([]);
  const [empleadoToAdd, setEmpleadoToAdd] = useState<string>("");

  useEffect(() => {
    async function load() {
      try {
        const asesores = await fetchAllPages("/asesores") as EmpleadoCatalogo[];
        setEmpleadosCatalog(asesores.filter((asesor) => asesor.activo !== false));

      } catch {
        toast.error("Error al cargar el catálogo de empleados");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleAddEmpleado = () => {
    if (!empleadoToAdd) return;
    if (selectedEmpleados.some(e => e.empleado_id === empleadoToAdd)) {
      toast.error("El empleado ya está en la nómina");
      return;
    }

    const emp = empleadosCatalog.find(e => e.id.toString() === empleadoToAdd);
    if (!emp) return;

    const pb = Number(emp.sueldo_base) || 0;
    const desp = Number(emp.despensa) || 0;
    const at = Number(emp.apoyo_transporte) || 0;

    const newEmp: NominaEmployeeData & { empleado_id: string } = {
      empleado_id: emp.id.toString(),
      nombre: emp.nombre_asesor,
      fecha_nacimiento: emp.cumpleanos ?? undefined,
      rfc: emp.rfc ?? undefined,
      curp: emp.curp ?? undefined,
      nss: emp.nss ?? undefined,
      banco: emp.banco ?? undefined,
      cuenta_bancaria: emp.cuenta_bancaria ?? undefined,
      pago_base: pb,
      despensa: desp,
      apoyo_transporte: at,
      ahorro: 0,
      bruto: pb + desp + at,
      neto: pb + desp + at
    };

    setSelectedEmpleados([...selectedEmpleados, newEmp]);
    setEmpleadoToAdd("");
  };

  const updateEmpField = (id: string, field: CampoImporteNomina, val: string) => {
    setSelectedEmpleados(prev => prev.map(emp => {
      if (emp.empleado_id !== id) return emp;
      const parsed = Number(val) || 0;
      const updated = { ...emp, [field]: parsed };
      updated.bruto = updated.pago_base + updated.despensa + updated.apoyo_transporte;
      updated.neto = updated.bruto - updated.ahorro;
      return updated;
    }));
  };

  const removeEmp = (id: string) => {
    setSelectedEmpleados(prev => prev.filter(e => e.empleado_id !== id));
  };

  const totalNeto = selectedEmpleados.reduce((acc, curr) => acc + curr.neto, 0);

  const handleSaveAndPrint = async () => {
    if (selectedEmpleados.length === 0) {
      toast.error("Agrega al menos un empleado");
      return;
    }
    if (!fechaInicio || !fechaFin) {
      toast.error("Las fechas son requeridas");
      return;
    }

    try {
      const payload = {
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        referencia,
        firma_director_administrativo: firmaDirAdmin,
        firma_director_operativo: firmaDirOperativo,
        empleados: selectedEmpleados.map((e) => ({
          asesor_id: Number(e.empleado_id),
          pago_base: e.pago_base,
          despensa: e.despensa,
          apoyo_transporte: e.apoyo_transporte,
          ahorro: e.ahorro,
        }))
      };

      const res = await apiFetch("/nomina", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.message || "Error al guardar la nómina");
        return;
      }

      toast.success("Nómina guardada exitosamente");

      // Generate HTML and Print
      const html = generarNominaHtml({
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        referencia,
        firma_director_administrativo: firmaDirAdmin,
        firma_director_operativo: firmaDirOperativo,
        empleados: selectedEmpleados
      });
      imprimirDocumentoHtml(html);

    } catch {
      toast.error("Error de conexión");
    }
  };

  if (loading) return <div className="p-8 text-center">Cargando...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Constructor de Nómina</h1>
        <Button onClick={handleSaveAndPrint} className="gap-2" size="lg">
          <Save className="h-4 w-4" /> Guardar y Exportar PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <Card className="md:col-span-12">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Datos del Periodo</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Fecha Inicio</label>
              <Input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Fecha Fin</label>
              <Input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Referencia (ej. 51/25)</label>
              <Input value={referencia} onChange={e => setReferencia(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Firma Dir. Administrativo</label>
              <Input value={firmaDirAdmin} onChange={e => setFirmaDirAdmin(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Firma Dir. Operativo</label>
              <Input value={firmaDirOperativo} onChange={e => setFirmaDirOperativo(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-12">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Empleados en Nómina</CardTitle>
            <div className="flex items-center gap-2">
              <select
                className="flex h-10 w-[250px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={empleadoToAdd}
                onChange={(e) => setEmpleadoToAdd(e.target.value)}
              >
                <option value="">Seleccionar empleado...</option>
                {empleadosCatalog.map(e => <option key={e.id} value={e.id.toString()}>{e.nombre_asesor}</option>)}
              </select>
              <Button onClick={handleAddEmpleado} variant="secondary"><PlusCircle className="h-4 w-4 mr-1"/> Agregar</Button>
            </div>
          </CardHeader>
          <CardContent>
            {selectedEmpleados.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground border border-dashed rounded-xl">
                Ningún empleado agregado al periodo.
              </div>
            ) : (
              <div className="space-y-6">
                {selectedEmpleados.map((emp) => (
                  <div key={emp.empleado_id} className="p-4 border rounded-xl bg-card shadow-sm relative">
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive" onClick={() => removeEmp(emp.empleado_id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <h3 className="font-bold text-lg mb-4">{emp.nombre}</h3>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Pago Base</label>
                        <Input type="number" min="0" value={emp.pago_base} onChange={e => updateEmpField(emp.empleado_id, 'pago_base', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Despensa</label>
                        <Input type="number" min="0" value={emp.despensa} onChange={e => updateEmpField(emp.empleado_id, 'despensa', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Apoyo Transporte</label>
                        <Input type="number" min="0" value={emp.apoyo_transporte} onChange={e => updateEmpField(emp.empleado_id, 'apoyo_transporte', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-destructive">Ahorro (-)</label>
                        <Input type="number" min="0" value={emp.ahorro} onChange={e => updateEmpField(emp.empleado_id, 'ahorro', e.target.value)} className="border-primary" />
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t flex justify-end gap-6 text-sm">
                      <div><span className="text-muted-foreground">Bruto:</span> <span className="font-bold">${emp.bruto.toFixed(2)}</span></div>
                      <div><span className="text-muted-foreground">Deducciones:</span> <span className="font-bold text-destructive">-${emp.ahorro.toFixed(2)}</span></div>
                      <div className="text-lg"><span className="text-muted-foreground">Neto:</span> <span className="font-black text-primary">${emp.neto.toFixed(2)}</span></div>
                    </div>
                  </div>
                ))}

                <div className="flex justify-between items-center p-4 bg-primary/10 rounded-xl border border-primary/20">
                  <div className="font-bold text-lg">Total Dispersión Nómina</div>
                  <div className="text-2xl font-black text-primary">${totalNeto.toLocaleString('es-MX', {minimumFractionDigits: 2})}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
