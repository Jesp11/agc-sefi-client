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
import { avalSearchFields, fetchAllPages } from "@/lib/table-utils";

export default function AvalesPage() {
  const [avales, setAvales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { search, handleSearch, page, setPage } = useTableControls();

  useEffect(() => {
    const fetchAvales = async () => {
      setLoading(true);
      try {
        const rows = await fetchAllPages("/avales");
        setAvales(rows);
      } catch {
        toast.error("Error al cargar avales");
      } finally {
        setLoading(false);
      }
    };
    fetchAvales();
  }, []);

  const filtered = filterBySearch(avales, search, avalSearchFields);
  const paginated = paginateItems(filtered, page);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Avales</h1>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nuevo Aval
        </Button>
      </div>

      <TableSearch placeholder="Buscar avales..." value={search} onChange={handleSearch} className="max-w-sm" />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Cliente (Titular)</TableHead>
              <TableHead>Nombre Aval</TableHead>
              <TableHead>RFC</TableHead>
              <TableHead>Ingresos Comprobables</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Cargando avales...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {search ? "No se encontraron avales con ese criterio." : "No hay avales registrados."}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((aval: any) => (
                <TableRow key={aval.id}>
                  <TableCell>{aval.id}</TableCell>
                  <TableCell>{aval.cliente?.nombre_completo ?? aval.id_cliente}</TableCell>
                  <TableCell className="font-medium">{aval.nombre}</TableCell>
                  <TableCell>{aval.rfc ?? "—"}</TableCell>
                  <TableCell>{aval.ingresos ?? aval.ocupacion_laboral ?? "—"}</TableCell>
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
          label="avales"
        />
      )}
    </div>
  );
}
