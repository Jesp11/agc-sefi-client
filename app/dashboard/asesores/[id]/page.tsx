"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, User, Calendar, CreditCard, IdCard } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

function formatFecha(fecha: string) {
  if (!fecha) return "—";
  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  const [y, m, d] = fecha.split("-");
  return `${parseInt(d, 10)} de ${meses[parseInt(m, 10) - 1]} de ${y}`;
}

export default function AsesorDetallePage() {
  const { id } = useParams();
  const router = useRouter();
  const [asesor, setAsesor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAsesor = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/asesores/${id}`);
        const data = await res.json();
        if (res.ok) {
          setAsesor(data);
        } else {
          toast.error("No se encontró el asesor");
          router.push("/dashboard/asesores");
        }
      } catch {
        toast.error("Error al cargar detalles");
      } finally {
        setLoading(false);
      }
    };

    fetchAsesor();
  }, [id, router]);

  if (loading) return <div className="p-8 text-center">Cargando perfil del asesor...</div>;
  if (!asesor) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{asesor.nombre_asesor}</h1>
          <p className="text-muted-foreground font-mono text-sm">{asesor.id_asesor ?? `#${asesor.id}`}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Información Personal */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              Información Personal
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground font-medium">ID Asesor</span>
              <span className="font-mono font-bold text-primary">{asesor.id_asesor ?? `#${asesor.id}`}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground font-medium">CURP</span>
              <span className="flex items-center gap-2">
                <IdCard className="h-3 w-3 shrink-0" />
                <span className="font-mono">{asesor.curp ?? "—"}</span>
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground font-medium">Cumpleaños</span>
              <span className="flex items-center gap-2">
                <Calendar className="h-3 w-3 shrink-0" />
                {asesor.cumpleanos ? formatFecha(asesor.cumpleanos) : "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Clientes Asignados */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5 text-primary" />
              Créditos Asignados
              <Badge variant="secondary" className="ml-auto">
                {asesor.creditos?.length ?? 0}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Crédito</TableHead>
                  <TableHead>Ciclo</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {asesor.creditos && asesor.creditos.length > 0 ? (
                  asesor.creditos.map((c: any, i: number) => (
                    <TableRow key={c.id_credito ?? c.id ?? i}>
                      <TableCell className="font-mono text-xs">{c.id_credito ?? c.id}</TableCell>
                      <TableCell>{c.ciclo}</TableCell>
                      <TableCell>${c.monto_otorgado}</TableCell>
                      <TableCell>${c.total}</TableCell>
                      <TableCell>
                        <Badge variant={c.estado === "activo" ? "default" : "secondary"}>
                          {c.estado ?? "—"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Sin créditos asignados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
