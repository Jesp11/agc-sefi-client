"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { User, Users } from "lucide-react";
import { toast } from "sonner";
import { fmtFecha } from "@/lib/utils";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { creditoSearchFields, creditoTotal, fetchAllPages, onlyCarteraActiva } from "@/lib/table-utils";
import { CarteraAcciones } from "@/components/cartera-acciones";

export default function CarteraGeneralPage() {
  const router = useRouter();
  const [creditos, setCreditos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { search, handleSearch, page, setPage } = useTableControls();

  const fetchCreditos = async () => {
    setLoading(true);
    try {
      const rows = await fetchAllPages("/cartera/activa");
      setCreditos(onlyCarteraActiva(rows));
    } catch {
      toast.error("Error al cargar cartera");
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
        <h1 className="text-3xl font-bold tracking-tight text-foreground/90">Cartera General</h1>
        <p className="text-muted-foreground">Préstamos activos (individuales y grupales). La mora se gestiona en Cartera en Mora.</p>
      </div>

      <TableSearch
        placeholder="Buscar por folio, cliente o grupo..."
        value={search}
        onChange={handleSearch}
      />

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[80px]">Folio</TableHead>
              <TableHead>Cliente / Grupo</TableHead>
              <TableHead className="text-center">Tipo</TableHead>
              <TableHead className="text-center">Ciclo</TableHead>
              <TableHead>Día Pago</TableHead>
              <TableHead>Gestor Cobranza</TableHead>
              <TableHead className="text-center">Plazos</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Interés</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Primer Pago</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={12} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    <p className="text-sm text-muted-foreground">Cargando cartera...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="h-32 text-center text-muted-foreground">
                  {search ? "No se encontraron préstamos con ese criterio." : "No hay préstamos registrados."}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((c: any) => {
                const isGrupal = c.tipo_credito === "Grupal";
                const nombre = isGrupal
                  ? (c.grupo?.nombre_grupo ?? "Grupo desconocido")
                  : (c.cliente?.nombre_completo ?? "Cliente desconocido");
                return (
                  <TableRow key={c.num_prog} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs font-semibold text-primary/80">
                      #{c.num_prog}
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {isGrupal
                          ? <Users className="h-4 w-4 text-primary/70" />
                          : <User className="h-4 w-4 text-primary/70" />}
                        {nombre}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={isGrupal ? "default" : "secondary"} className="text-xs">
                        {c.tipo_credito}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-bold text-xs">
                        {c.ciclo ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{c.dias_pago ?? "—"}</TableCell>
                    <TableCell className="text-xs">{c.asesor?.nombre_asesor ?? "—"}</TableCell>
                    <TableCell className="text-center text-xs">{c.plazos} sem</TableCell>
                    <TableCell className="text-xs font-semibold">${c.monto_otorgado}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">${c.interes}</TableCell>
                    <TableCell className="text-xs font-bold text-primary">${creditoTotal(c).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-xs">{c.fecha_primer_pago ? fmtFecha(c.fecha_primer_pago) : "—"}</TableCell>
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
                );
              })
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
          label="préstamos"
        />
      )}
    </div>
  );
}
