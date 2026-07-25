"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReporteComparativasPage() {
  const [form, setForm] = useState({
    periodo1_inicio: "", periodo1_fin: "",
    periodo2_inicio: "", periodo2_fin: "",
  });
  const [data, setData] = useState<any>(null);

  const consultar = async () => {
    const params = new URLSearchParams(form);
    const res = await apiFetch(`/reportes/comparativas?${params}`);
    if (res.ok) setData(await res.json());
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Comparativas</h1>
      <Card>
        <CardContent className="pt-6 grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="font-semibold">Periodo 1</h3>
            <div><Label>Inicio</Label><Input type="date" value={form.periodo1_inicio} onChange={(e) => setForm({ ...form, periodo1_inicio: e.target.value })} /></div>
            <div><Label>Fin</Label><Input type="date" value={form.periodo1_fin} onChange={(e) => setForm({ ...form, periodo1_fin: e.target.value })} /></div>
          </div>
          <div className="space-y-3">
            <h3 className="font-semibold">Periodo 2</h3>
            <div><Label>Inicio</Label><Input type="date" value={form.periodo2_inicio} onChange={(e) => setForm({ ...form, periodo2_inicio: e.target.value })} /></div>
            <div><Label>Fin</Label><Input type="date" value={form.periodo2_fin} onChange={(e) => setForm({ ...form, periodo2_fin: e.target.value })} /></div>
          </div>
          <Button onClick={consultar} className="md:col-span-2">Comparar</Button>
        </CardContent>
      </Card>
      {data && (
        <div className="grid md:grid-cols-2 gap-6">
          {["periodo1", "periodo2"].map((key) => (
            <Card key={key}>
              <CardHeader><CardTitle>{data[key].inicio} — {data[key].fin}</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Abonos</span><span className="font-bold">${Number(data[key].abonos).toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Colocación</span><span className="font-bold">${Number(data[key].colocacion).toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Créditos nuevos</span><span className="font-bold">{data[key].creditos_nuevos}</span></div>
                <div className="flex justify-between"><span>En mora</span><span className="font-bold">{data[key].mora}</span></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
