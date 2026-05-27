"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusCircle, Users, CreditCard, Wrench } from "lucide-react";
import { CustomGroupCreditForm } from "@/components/custom-group-credit-form";
import { CustomLoanForm } from "@/components/custom-loan-form";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { fmtFecha } from "@/lib/utils";

export default function GruposPage() {
  const router = useRouter();
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  const fetchGrupos = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/grupos");
      const data = await res.json();
      if (res.ok) {
        setGrupos(data.data || data);
      }
    } catch (error) {
      toast.error("Error al cargar grupos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrupos();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground/90">Grupos</h1>
        <p className="text-muted-foreground">Gestión de grupos y sus créditos correspondientes.</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Buscar grupos..."
            className="bg-background border-muted-foreground/20 focus-visible:ring-primary/30 h-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="h-10 px-4" onClick={() => setIsCreditModalOpen(true)}>
            <CreditCard className="mr-2 h-4 w-4" />
            Crear Crédito
          </Button>
          <Button size="sm" variant="outline" className="h-10 px-4" onClick={() => setIsCustomModalOpen(true)}>
            <Wrench className="mr-2 h-4 w-4" />
            Personalizado
          </Button>
        </div>

        <Dialog open={isCreditModalOpen} onOpenChange={setIsCreditModalOpen}>
          <DialogContent className="sm:max-w-[600px] h-[560px] flex flex-col">
            <DialogHeader>
              <DialogTitle>Nuevo Crédito Grupal</DialogTitle>
            </DialogHeader>
            <CustomGroupCreditForm
              onSuccess={() => { fetchGrupos(); setIsCreditModalOpen(false); }}
              onClose={() => setIsCreditModalOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={isCustomModalOpen} onOpenChange={setIsCustomModalOpen}>
          <DialogContent className="sm:max-w-[600px] h-[560px] flex flex-col">
            <DialogHeader>
              <DialogTitle>Préstamo Grupal Personalizado</DialogTitle>
            </DialogHeader>
            <CustomLoanForm
              type="grupal"
              onSuccess={() => { fetchGrupos(); setIsCustomModalOpen(false); }}
              onClose={() => setIsCustomModalOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>Nombre Grupo</TableHead>
              <TableHead className="text-center">Ciclo</TableHead>
              <TableHead>Día Pago</TableHead>
              <TableHead>Asesor</TableHead>
              <TableHead className="text-center">Plazos</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Interés</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Desembolso</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow key="loading">
                <TableCell colSpan={11} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-sm text-muted-foreground">Cargando grupos...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : grupos.length === 0 ? (
              <TableRow key="empty">
                <TableCell colSpan={11} className="h-32 text-center text-muted-foreground">
                  No hay grupos registrados.
                </TableCell>
              </TableRow>
            ) : (
              grupos.map((grupo: any, index: number) => {
                const lastCredito = grupo.creditos && grupo.creditos.length > 0
                  ? grupo.creditos[grupo.creditos.length - 1]
                  : null;

                return (
                  <TableRow key={grupo.id_grupo || grupo.id || index} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs font-semibold text-primary/80">#{grupo.id_grupo || grupo.id}</TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary/70" />
                        {grupo.nombre_grupo}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-bold">
                        {lastCredito ? lastCredito.ciclo : 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{lastCredito?.dias_pago ?? "—"}</TableCell>
                    <TableCell className="text-xs">{grupo.asesor?.nombre_asesor ?? "—"}</TableCell>
                    <TableCell className="text-center text-xs">{lastCredito ? `${lastCredito.plazos} sem` : "—"}</TableCell>
                    <TableCell className="text-xs font-semibold">{lastCredito ? `$${lastCredito.monto_otorgado}` : "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{lastCredito ? `$${lastCredito.interes}` : "—"}</TableCell>
                    <TableCell className="text-xs font-bold text-primary">{lastCredito ? `$${lastCredito.total}` : "—"}</TableCell>
                    <TableCell className="text-xs">{fmtFecha(lastCredito?.fecha_otorgacion)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        className="h-8 text-xs font-medium"
                        onClick={() => router.push(`/dashboard/grupos/${grupo.id}`)}
                      >
                        Ver Grupo
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
