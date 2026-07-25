"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { creditoSearchFields } from "@/lib/table-utils";
import { fmtFecha } from "@/lib/utils";

export default function ReportePorCerrarPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { search, handleSearch, page, setPage } = useTableControls();

  useEffect(() => {
    setLoading(true);
    apiFetch("/reportes/asesor/por-cerrar").then(async (res) => {
      if (res.ok) setItems(await res.json());
      setLoading(false);
    });
  }, []);

  const filtered = filterBySearch(items, search, (c) => [
    ...creditoSearchFields(c),
    c.fecha_ultimo_abono,
    c.monto_ultimo_abono,
    c.dias_restantes,
  ]);
  const paginated = paginateItems(filtered, page);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Clientes por Cerrar</h1>
      <p className="text-muted-foreground">
        Créditos que liquidan con su próximo abono y la fecha programada de ese pago.
      </p>
      <TableSearch placeholder="Buscar..." value={search} onChange={handleSearch} />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Folio</TableHead>
              <TableHead>Beneficiario</TableHead>
              <TableHead className="text-right">Último abono</TableHead>
              <TableHead>Día del abono</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {search ? "No se encontraron resultados." : "No hay clientes por cerrar."}
                </TableCell>
              </TableRow>
            ) : paginated.map((c) => {
              const dias = Number(c.dias_restantes);
              const badgeLabel = dias < 0
                ? `Vencido ${Math.abs(dias)} día${Math.abs(dias) === 1 ? "" : "s"}`
                : dias === 0
                  ? "Hoy"
                  : `En ${dias} día${dias === 1 ? "" : "s"}`;

              return (
                <TableRow key={c.num_prog}>
                  <TableCell>#{c.num_prog}</TableCell>
                  <TableCell>{c.cliente?.nombre_completo || c.grupo?.nombre_grupo}</TableCell>
                  <TableCell className="text-right font-semibold">
                    ${Number(c.monto_ultimo_abono ?? 0).toLocaleString()}
                  </TableCell>
                  <TableCell>{fmtFecha(c.fecha_ultimo_abono)}</TableCell>
                  <TableCell>
                    <Badge variant={dias < 0 ? "destructive" : dias === 0 ? "default" : "secondary"}>
                      {badgeLabel}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
      {!loading && (
        <TablePagination page={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} label="clientes" />
      )}
    </div>
  );
}
