"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { creditoSearchFields } from "@/lib/table-utils";

export default function ReporteAsesorMoraPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAsesor = user?.role?.nombre === "asesor";
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { search, handleSearch, page, setPage } = useTableControls();

  useEffect(() => {
    if (isAsesor) {
      router.replace("/dashboard/reportes/diario");
    }
  }, [isAsesor, router]);

  useEffect(() => {
    if (isAsesor) return;
    setLoading(true);
    apiFetch("/reportes/asesor/mora").then(async (res) => {
      if (res.ok) setItems(await res.json());
      setLoading(false);
    });
  }, [isAsesor]);

  const filtered = filterBySearch(items, search, (c) => [
    ...creditoSearchFields(c),
    c.mora?.dias_mora,
    c.mora?.total_adeudo,
  ]);
  const paginated = paginateItems(filtered, page);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Mora por Asesor</h1>
      <TableSearch placeholder="Buscar..." value={search} onChange={handleSearch} />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Folio</TableHead><TableHead>Cliente/Grupo</TableHead><TableHead>Días Mora</TableHead><TableHead>Total Adeudo</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">{search ? "No se encontraron resultados." : "Sin créditos en mora."}</TableCell></TableRow>
            ) : paginated.map((c) => (
              <TableRow key={c.num_prog}>
                <TableCell>#{c.num_prog}</TableCell>
                <TableCell>{c.cliente?.nombre_completo || c.grupo?.nombre_grupo}</TableCell>
                <TableCell><Badge variant="destructive">{c.mora?.dias_mora ?? 0} días</Badge></TableCell>
                <TableCell>${Number(c.mora?.total_adeudo ?? 0).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      {!loading && (
        <TablePagination page={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} label="créditos" />
      )}
    </div>
  );
}
