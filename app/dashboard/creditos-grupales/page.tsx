"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { isFieldRoleName } from "@/lib/authz";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, PlusCircle } from "lucide-react";
import { CustomLoanForm } from "@/components/custom-loan-form";
import { CarteraAcciones } from "@/components/cartera-acciones";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { creditoSearchFields, creditoTotal, fetchAllPages, onlyCarteraActiva } from "@/lib/table-utils";

export default function CreditosGrupalesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAsesor = isFieldRoleName(user?.role?.nombre);
  const [creditos, setCreditos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { search, handleSearch, page, setPage } = useTableControls();
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  const fetchCreditos = async () => {
    setLoading(true);
    try {
      const rows = await fetchAllPages("/cartera/activa?tipo=grupal");
      setCreditos(onlyCarteraActiva(rows));
    } catch {
      toast.error("Error al cargar créditos grupales");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditos();
  }, []);

  const filtered = filterBySearch(creditos, search, creditoSearchFields);
  const paginated = paginateItems(filtered, page);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground/90">Préstamo Grupal</h1>
        <p className="text-muted-foreground">Créditos grupales activos. Los que están en mora aparecen solo en Cartera en Mora.</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <TableSearch
          placeholder="Buscar por grupo o folio..."
          value={search}
          onChange={handleSearch}
          className="flex-1 max-w-md"
        />
        {!isAsesor && (
          <Button size="sm" className="h-10 px-4" onClick={() => setIsCustomModalOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Crear Préstamo
          </Button>
        )}
      </div>

      {!isAsesor && (
        <Dialog open={isCustomModalOpen} onOpenChange={setIsCustomModalOpen}>
          <DialogContent className="sm:max-w-[600px] h-[560px] flex flex-col">
            <DialogHeader>
              <DialogTitle>Crear Préstamo Grupal</DialogTitle>
            </DialogHeader>
            <CustomLoanForm
              type="grupal"
              onSuccess={() => { fetchCreditos(); setIsCustomModalOpen(false); }}
              onClose={() => setIsCustomModalOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[80px]">Folio</TableHead>
              <TableHead>Nombre Grupo</TableHead>
              <TableHead className="text-center">Ciclo</TableHead>
              <TableHead>Día Pago</TableHead>
              <TableHead>Asesor</TableHead>
              <TableHead className="text-center">Plazos</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Interés</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    <p className="text-sm text-muted-foreground">Cargando créditos...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                  {search ? "No se encontraron créditos con ese criterio." : "No hay créditos grupales activos."}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((c: any) => (
                <TableRow key={c.num_prog} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono text-xs font-semibold text-primary/80">#{c.num_prog}</TableCell>
                  <TableCell className="font-medium whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary/70" />
                      {c.grupo?.nombre_grupo ?? "—"}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-bold">{c.ciclo}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{c.dias_pago ?? "—"}</TableCell>
                  <TableCell className="text-xs">{c.asesor?.nombre_asesor ?? "—"}</TableCell>
                  <TableCell className="text-center text-xs">{c.plazos} sem</TableCell>
                  <TableCell className="text-xs font-semibold">${c.monto_otorgado}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">${c.interes}</TableCell>
                  <TableCell className="text-xs font-bold text-primary">${creditoTotal(c).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <CarteraAcciones credito={c} onSuccess={fetchCreditos} />
                      <Button
                        size="sm"
                        className="h-8 text-xs font-medium"
                        onClick={() => router.push(`/dashboard/creditos/${c.num_prog}`)}
                      >
                        Ver Préstamo
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!loading && (
        <TablePagination
          page={page}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          label="créditos"
        />
      )}
    </div>
  );
}
