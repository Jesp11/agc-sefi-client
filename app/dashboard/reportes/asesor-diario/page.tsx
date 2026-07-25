"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PrintTicket } from "@/components/print-ticket";
import { Input } from "@/components/ui/input";

export default function ReporteAsesorDiarioPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAsesor = user?.role?.nombre === "asesor";
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (isAsesor) {
      router.replace("/dashboard/reportes/diario");
    }
  }, [isAsesor, router]);

  useEffect(() => {
    if (isAsesor) return;
    apiFetch(`/reportes/asesor/diario?fecha=${fecha}`).then(async (res) => { if (res.ok) setData(await res.json()); });
  }, [fecha, isAsesor]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Detalle Diario por Asesor</h1>
        <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-40" />
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
