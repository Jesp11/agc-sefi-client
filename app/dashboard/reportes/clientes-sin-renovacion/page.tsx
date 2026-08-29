"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { creditoSearchFields } from "@/lib/table-utils";
import { Badge } from "@/components/ui/badge";

export default function ClientesSinRenovacionPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { search, handleSearch, page, setPage } = useTableControls();

  useEffect(() => {
    setLoading(true);
    apiFetch("/reportes/clientes-sin-renovacion").then(async (res) => {
      if (res.ok) setItems(await res.json());
      setLoading(false);
    });
  }, []);

  const filtered = filterBySearch(items, search, (item: any) => [...creditoSearchFields(item), item.motivo]);
  const paginated = paginateItems(filtered, page);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Clientes sin Derecho a Renovación</h1>
        <p className="text-muted-foreground">Créditos liquidados con antecedente de mora o cierre sin renovación.</p>
      </div>
      <TableSearch placeholder="Buscar..." value={search} onChange={handleSearch} />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Folio</TableHead><TableHead>Beneficiario</TableHead><TableHead>Gestor</TableHead><TableHead>Motivo</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">{search ? "No se encontraron registros." : "Sin registros."}</TableCell></TableRow>
            ) : paginated.map((item: any) => (
              <TableRow key={item.num_prog}>
                <TableCell>#{item.num_prog}</TableCell>
                <TableCell>{item.cliente?.nombre_completo || item.grupo?.nombre_grupo}</TableCell>
                <TableCell>{item.asesor?.nombre_asesor || "—"}</TableCell>
                <TableCell>{item.motivo}</TableCell>
                <TableCell><Badge variant="outline">{item.estado}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      {!loading && <TablePagination page={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} label="clientes" />}
    </div>
  );
}
