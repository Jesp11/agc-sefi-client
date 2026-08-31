"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { isFieldRoleName } from "@/lib/authz";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PrintTicket } from "@/components/print-ticket";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchAllPages } from "@/lib/table-utils";

export default function ReporteAsesorDiarioPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAsesor = isFieldRoleName(user?.role?.nombre);
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [asesores, setAsesores] = useState<any[]>([]);
  const [idAsesor, setIdAsesor] = useState("");
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (isAsesor) {
      router.replace("/dashboard/reportes/diario");
    }
  }, [isAsesor, router]);

  useEffect(() => {
    if (isAsesor) return;
    fetchAllPages("/asesores").then(setAsesores).catch(() => setAsesores([]));
  }, [isAsesor]);

  useEffect(() => {
    if (isAsesor) return;
    const params = new URLSearchParams({ fecha });
    if (idAsesor) params.set("id_asesor", idAsesor);
    apiFetch(`/reportes/asesor/diario?${params.toString()}`).then(async (res) => { if (res.ok) setData(await res.json()); });
  }, [fecha, isAsesor, idAsesor]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Detalle Diario por Gestor Cobranza</h1>
        <div className="flex items-end gap-3">
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-40" />
          </div>
          <div>
            <Label>Gestor</Label>
            <select className="flex h-10 w-52 rounded-md border border-input bg-background px-3 text-sm" value={idAsesor} onChange={(e) => setIdAsesor(e.target.value)}>
              <option value="">Todos</option>
              {asesores.map((a) => <option key={a.id} value={a.id}>{a.nombre_asesor}</option>)}
            </select>
          </div>
        </div>
      </div>
      {data && (
        <>
          <PrintTicket
            title="Reporte Diario Asesor"
            fecha={fecha}
            items={[
              { label: "Abonos", value: `$${Number(data.total_abonos).toLocaleString()}` },
              { label: "Multas", value: `$${Number(data.total_multas).toLocaleString()}` },
              { label: "Créditos", value: String(data.creditos_otorgados) },
            ]}
            totals={[{ label: "Préstamos nuevos", value: `$${Number(data.monto_colocado).toLocaleString()}` }]}
          />
          <div className="grid md:grid-cols-3 gap-4">
            <Card><CardHeader><CardTitle className="text-sm">Abonos</CardTitle></CardHeader><CardContent className="text-xl font-bold">${Number(data.total_abonos).toLocaleString()}</CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Multas</CardTitle></CardHeader><CardContent className="text-xl font-bold">${Number(data.total_multas).toLocaleString()}</CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Préstamos nuevos (monto)</CardTitle></CardHeader><CardContent className="text-xl font-bold">${Number(data.monto_colocado).toLocaleString()}</CardContent></Card>
          </div>
        </>
      )}
    </div>
  );
}
