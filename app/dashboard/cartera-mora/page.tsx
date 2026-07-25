"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, Users } from "lucide-react";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { creditoSearchFields, fetchAllPages } from "@/lib/table-utils";
import { CarteraAcciones } from "@/components/cartera-acciones";

function MoraTable({ tipo }: { tipo: "individual" | "grupal" }) {
  const router = useRouter();
  const { search, handleSearch, page, setPage } = useTableControls();
  const [creditos, setCreditos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMora = async () => {
    setLoading(true);
    try {
      const rows = await fetchAllPages(`/cartera/mora?tipo=${tipo}`);
      setCreditos(rows);
    } catch {
      setCreditos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMora();
  }, [tipo]);

  const filtered = filterBySearch(creditos, search, creditoSearchFields);
  const paginated = paginateItems(filtered, page);

  return (
    <div className="space-y-4">
      <TableSearch
        placeholder={tipo === "individual" ? "Buscar por folio o cliente..." : "Buscar por folio o grupo..."}
        value={search}
        onChange={handleSearch}
      />
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Folio</TableHead>
              <TableHead>{tipo === "individual" ? "Cliente" : "Grupo"}</TableHead>
              <TableHead className="text-center">Ciclo</TableHead>
              <TableHead>Asesor</TableHead>
              <TableHead className="text-center">Días Mora</TableHead>
              <TableHead>Total Adeudo</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">{search ? "No se encontraron resultados." : "Sin créditos en mora."}</TableCell></TableRow>
            ) : paginated.map((c) => (
              <TableRow key={c.num_prog}>
                <TableCell className="font-mono text-xs">#{c.num_prog}</TableCell>
                <TableCell>{tipo === "individual" ? c.cliente?.nombre_completo : c.grupo?.nombre_grupo}</TableCell>
                <TableCell className="text-center"><Badge variant="outline">{c.ciclo}</Badge></TableCell>
                <TableCell className="text-xs">{c.asesor?.nombre_asesor}</TableCell>
                <TableCell className="text-center"><Badge variant="destructive">{c.dias_mora ?? c.mora?.dias_mora ?? 0} días</Badge></TableCell>
                <TableCell className="text-xs font-bold">${Number(c.mora?.total_adeudo ?? 0).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <CarteraAcciones credito={c} onSuccess={fetchMora} />
                    <Button size="sm" onClick={() => router.push(`/dashboard/creditos/${c.num_prog}`)}>Ver</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
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

export default function CarteraMoraPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cartera en Mora</h1>
        <p className="text-muted-foreground">Préstamos con pagos vencidos.</p>
      </div>
      <Tabs defaultValue="individual">
        <TabsList>
          <TabsTrigger value="individual"><User className="h-4 w-4 mr-2" />Individual</TabsTrigger>
          <TabsTrigger value="grupal"><Users className="h-4 w-4 mr-2" />Grupal</TabsTrigger>
        </TabsList>
        <TabsContent value="individual"><MoraTable tipo="individual" /></TabsContent>
        <TabsContent value="grupal"><MoraTable tipo="grupal" /></TabsContent>
      </Tabs>
    </div>
  );
}
