"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { creditoSearchFields } from "@/lib/table-utils";

export default function ReporteCarteraPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAsesor = user?.role?.nombre === "asesor";
  const [tipo, setTipo] = useState("general");
  const [data, setData] = useState<any>(null);
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
    setPage(1);
    apiFetch(`/reportes/cartera?tipo=${tipo}`).then(async (res) => {
      if (res.ok) setData(await res.json());
      setLoading(false);
    });
  }, [tipo, isAsesor, setPage]);

  const creditos = data?.creditos || [];
  const filtered = filterBySearch(creditos, search, (c: any) => [
    ...creditoSearchFields(c),
    c.estado,
    c.mora?.saldo_actual,
    c.saldo_pendiente,
  ]);
  const paginated = paginateItems(filtered, page);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Reporte de Cartera</h1>
        <select className="border rounded px-3 py-2 text-sm" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="general">General</option>
          <option value="individual">Individual</option>
          <option value="grupal">Grupal</option>
          <option value="mora">En Mora</option>
          <option value="cerrados">Cerrados</option>
        </select>
      </div>
      <TableSearch placeholder="Buscar créditos..." value={search} onChange={handleSearch} />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Folio</TableHead><TableHead>Tipo</TableHead><TableHead>Estado</TableHead><TableHead>Monto</TableHead><TableHead>Saldo</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">{search ? "No se encontraron créditos." : "Sin créditos."}</TableCell></TableRow>
            ) : paginated.map((c: any) => (
              <TableRow key={c.num_prog}>
                <TableCell>#{c.num_prog}</TableCell>
                <TableCell>{c.tipo_credito}</TableCell>
                <TableCell>{c.estado}</TableCell>
                <TableCell>${Number(c.monto_otorgado).toLocaleString()}</TableCell>
                <TableCell>${Number(c.mora?.saldo_actual ?? c.saldo_pendiente ?? 0).toLocaleString()}</TableCell>
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
