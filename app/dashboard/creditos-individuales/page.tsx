"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, PlusCircle, Wrench } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CustomCreditForm } from "@/components/custom-credit-form";
import { CustomLoanForm } from "@/components/custom-loan-form";
import { fmtFecha } from "@/lib/utils";

export default function CreditosIndividualesPage() {
  const router = useRouter();
  const [creditos, setCreditos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  const fetchCreditos = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/creditos?per_page=100"); 
      const data = await res.json();
      if (res.ok) {
        const individualOnly = (data.data || data).filter((c: any) => c.tipo_credito === 'Individual');
        setCreditos(individualOnly);
      }
    } catch (error) {
      toast.error("Error al cargar créditos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditos();
  }, []);

  const filtered = creditos.filter((c: any) => 
    c.cliente?.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.num_prog?.toString().includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground/90">Créditos Individuales</h1>
        <p className="text-muted-foreground">Gestión de créditos activos sin asociación grupal.</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Buscar por cliente o folio..."
            className="bg-background border-muted-foreground/20 focus-visible:ring-primary/30 h-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsModalOpen(true)} size="sm" className="h-10 px-4">
            <PlusCircle className="mr-2 h-4 w-4" /> Crear Crédito
          </Button>
          <Button onClick={() => setIsCustomModalOpen(true)} size="sm" variant="outline" className="h-10 px-4">
            <Wrench className="mr-2 h-4 w-4" /> Personalizado
          </Button>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] h-[560px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Nuevo Crédito Individual</DialogTitle>
          </DialogHeader>
          <CustomCreditForm
            onSuccess={() => { fetchCreditos(); setIsModalOpen(false); }}
            onClose={() => setIsModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isCustomModalOpen} onOpenChange={setIsCustomModalOpen}>
        <DialogContent className="sm:max-w-[600px] h-[560px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Préstamo Individual Personalizado</DialogTitle>
          </DialogHeader>
          <CustomLoanForm
            type="individual"
            onSuccess={() => { fetchCreditos(); setIsCustomModalOpen(false); }}
            onClose={() => setIsCustomModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[80px]">Folio</TableHead>
              <TableHead>Nombre</TableHead>
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
              <TableRow>
                <TableCell colSpan={11} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-sm text-muted-foreground">Cargando créditos...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="h-32 text-center text-muted-foreground">
                  No se encontraron créditos individuales para mostrar.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c: any) => (
                <TableRow key={c.num_prog} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono text-xs font-semibold text-primary/80">#{c.num_prog}</TableCell>
                  <TableCell className="font-medium whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-primary/70" />
                      {c.cliente?.nombre_completo || "Desconocido"}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-bold">{c.ciclo}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{c.dias_pago || "—"}</TableCell>
                  <TableCell className="text-xs">{c.asesor?.nombre_asesor || "—"}</TableCell>
                  <TableCell className="text-center text-xs">{c.plazos} sem</TableCell>
                  <TableCell className="text-xs font-semibold">${c.monto_otorgado}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">${c.interes}</TableCell>
                  <TableCell className="text-xs font-bold text-primary">${c.total}</TableCell>
                  <TableCell className="text-xs">{fmtFecha(c.fecha_otorgacion)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      className="h-8 text-xs font-medium"
                      onClick={() => router.push(`/dashboard/creditos/${c.num_prog}`)}
                    >
                      Ver Crédito
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
