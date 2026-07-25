"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { History } from "lucide-react";
import { fmtFecha } from "@/lib/utils";

interface HistorialUnificadoModalProps {
  tipo: "cliente" | "grupo";
  id: string | number;
}

export function HistorialUnificadoModal({ tipo, id }: HistorialUnificadoModalProps) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const fetchHistorial = async () => {
      setLoading(true);
      const endpoint = tipo === "cliente" ? `/clientes/${id}/historial` : `/grupos/${id}/historial`;
      const res = await apiFetch(endpoint);
      if (res.ok) setData(await res.json());
      setLoading(false);
    };
    fetchHistorial();
  }, [open, tipo, id]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="outline" size="sm">
          <History className="mr-2 h-4 w-4" /> Historial Completo
        </Button>
      } />
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Historial Unificado</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-muted-foreground text-sm">Cargando...</p>
        ) : data ? (
          <div className="space-y-4">
            {data.estatus && (
              <Badge variant="outline">Estatus: {data.estatus}</Badge>
            )}
            {(data.creditos || []).map((c: any) => (
              <div key={c.num_prog} className="border rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold">Folio #{c.num_prog}</span>
                  <Badge>{c.estado}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Ciclo {c.ciclo} · ${Number(c.monto_otorgado).toLocaleString()} · {c.plazos} sem
                </p>
                {c.mora && (
                  <p className="text-sm">
                    Saldo: ${Number(c.mora.saldo_actual).toLocaleString()}
                    {c.mora.dias_mora > 0 && (
                      <span className="text-destructive ml-2">{c.mora.dias_mora} días mora</span>
                    )}
                  </p>
                )}
              </div>
            ))}
            {(!data.creditos || data.creditos.length === 0) && (
              <p className="text-muted-foreground text-sm">Sin créditos registrados.</p>
            )}
            {data.ciclos?.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Ciclos</h4>
                {data.ciclos.map((c: any) => (
                  <p key={c.id} className="text-xs text-muted-foreground">
                    Ciclo {c.ciclo} — {c.resultado} ({fmtFecha(c.fecha_inicio)})
                  </p>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
