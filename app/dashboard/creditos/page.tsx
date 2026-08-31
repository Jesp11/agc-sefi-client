"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusCircle, User, Users, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { fmtFecha } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CustomCreditForm } from "@/components/custom-credit-form";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { creditoSearchFields, fetchAllPages } from "@/lib/table-utils";

export default function CreditosPage() {
  const router = useRouter();
  const [creditos, setCreditos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { search: searchTerm, handleSearch, page, setPage } = useTableControls();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchCreditos = async () => {
    setLoading(true);
    try {
      const rows = await fetchAllPages("/creditos");
      setCreditos(rows);
    } catch {
      toast.error("Error al cargar créditos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditos();
  }, []);

  const filtered = filterBySearch(Array.isArray(creditos) ? creditos : [], searchTerm, creditoSearchFields);
  const paginated = paginateItems(filtered, page);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground/90">Créditos Generales</h1>
        <p className="text-muted-foreground">Listado completo de todos los créditos individuales y grupales.</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <TableSearch
          placeholder="Buscar por cliente, grupo o folio..."
          value={searchTerm}
          onChange={handleSearch}
          className="flex-1 max-w-md"
        />
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setIsModalOpen(true)} 
            variant="outline"
            size="sm" 
            className="h-10 px-4 border-primary/30 text-primary hover:bg-primary/5 transition-all"
          >
            <Sparkles className="mr-2 h-4 w-4" /> Préstamo Personalizado
          </Button>
          <Button onClick={() => router.push("/dashboard/clientes")} size="sm" className="h-10 px-4 shadow-lg shadow-primary/20">
            <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Préstamo
          </Button>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Nuevo Préstamo Personalizado</DialogTitle>
          </DialogHeader>
          <CustomCreditForm 
            onSuccess={() => {
              fetchCreditos();
              setIsModalOpen(false);
            }} 
            onClose={() => setIsModalOpen(false)} 
          />
        </DialogContent>
      </Dialog>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[100px]">Folio</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Cliente / Grupo</TableHead>
              <TableHead className="text-center">Ciclo</TableHead>
              <TableHead>Gestor Cobranza</TableHead>
              <TableHead className="text-center">Plazos</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-sm text-muted-foreground">Cargando créditos...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                  No se encontraron créditos para mostrar.
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((c: any) => (
                <TableRow key={c.num_prog} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono text-xs font-semibold text-primary/80">
                    #{c.num_prog}
                  </TableCell>
                  <TableCell className="text-xs">
                    {fmtFecha(c.fecha_otorgacion)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.tipo_credito === 'Individual' ? 'outline' : 'secondary'} className="text-[10px]">
                      {c.tipo_credito}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {c.tipo_credito === 'Individual' ? (
                        <>
                          <User className="h-4 w-4 text-blue-500/70" />
                          <span>{c.cliente?.nombre_completo || "S/N"}</span>
                        </>
                      ) : (
                        <>
                          <Users className="h-4 w-4 text-purple-500/70" />
                          <span>{c.grupo?.nombre_grupo || "S/N"}</span>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-bold">
                      {c.ciclo}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {c.asesor?.nombre_asesor || "Sin asignar"}
                  </TableCell>
                  <TableCell className="text-center text-xs">
                    {c.plazos} sem
                  </TableCell>
                  <TableCell className="font-semibold text-xs">
                    ${c.monto_otorgado}
                  </TableCell>
                  <TableCell className="font-bold text-primary text-xs">
                    ${c.total}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="h-8 text-xs font-medium transition-colors"
                        onClick={() => router.push(`/dashboard/creditos/${c.num_prog}`)}
                      >
                        Ver Préstamo
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-xs font-medium"
                        onClick={() => {
                          if (c.tipo_credito === 'Individual') {
                            router.push(`/dashboard/clientes/${c.id_cliente}`);
                          } else {
                            router.push(`/dashboard/grupos/${c.id_grupo}`);
                          }
                        }}
                      >
                        {c.tipo_credito === 'Individual' ? 'Ver Perfil' : 'Ver Grupo'}
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
