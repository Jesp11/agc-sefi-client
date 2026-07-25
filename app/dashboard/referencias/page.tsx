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
import { PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { fetchAllPages, referenciaSearchFields } from "@/lib/table-utils";

export default function ReferenciasPage() {
  const [referencias, setReferencias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { search, handleSearch, page, setPage } = useTableControls();

  useEffect(() => {
    const fetchReferencias = async () => {
      setLoading(true);
      try {
        const rows = await fetchAllPages("/referencias");
        setReferencias(rows);
      } catch {
        toast.error("Error al cargar referencias");
      } finally {
        setLoading(false);
      }
    };
    fetchReferencias();
  }, []);

  const filtered = filterBySearch(referencias, search, referenciaSearchFields);
  const paginated = paginateItems(filtered, page);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Referencias</h1>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nueva Referencia
        </Button>
      </div>

      <TableSearch placeholder="Buscar referencias..." value={search} onChange={handleSearch} className="max-w-sm" />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Cliente Relacionado</TableHead>
              <TableHead>Nombre Referencia</TableHead>
              <TableHead>Relación</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Cargando referencias...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {search ? "No se encontraron referencias con ese criterio." : "No hay referencias registradas."}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((ref: any) => (
                <TableRow key={ref.id}>
                  <TableCell>{ref.id}</TableCell>
                  <TableCell>{ref.cliente?.nombre_completo ?? ref.id_cliente}</TableCell>
                  <TableCell className="font-medium">{ref.nombre}</TableCell>
                  <TableCell>{ref.parentesco ?? ref.tipo_referencia ?? "—"}</TableCell>
                  <TableCell>{ref.telefono ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm">Editar</Button>
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
          label="referencias"
        />
      )}
    </div>
  );
}
