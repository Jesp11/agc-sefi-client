"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { User, Users } from "lucide-react";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { creditoSearchFields, fetchAllPages } from "@/lib/table-utils";

function CerradosTable({ tipo }: { tipo: "individual" | "grupal" }) {
  const router = useRouter();
  const { user } = useAuth();
  const isAsesor = user?.role?.nombre === "asesor";
  const { search, handleSearch, page, setPage } = useTableControls();
  const [creditos, setCreditos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reactivando, setReactivando] = useState<number | null>(null);

  const fetchCerrados = async () => {
    setLoading(true);
    try {
      const rows = await fetchAllPages(`/cartera/cerrados?tipo=${tipo}`);
      setCreditos(rows);
    } catch {
      setCreditos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCerrados();
  }, [tipo]);

  const handleReactivar = async (numProg: number) => {
    setReactivando(numProg);
    const res = await apiFetch(`/creditos/${numProg}/reactivar-cartera`, { method: "POST" });
    if (res.ok) {
      toast.success("Crédito reactivado en cartera activa");
      fetchCerrados();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.message || "Error al reactivar");
    }
    setReactivando(null);
  };

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
              <TableHead>Ciclo</TableHead>
              <TableHead>Asesor</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">{search ? "No se encontraron resultados." : "Sin créditos cerrados."}</TableCell></TableRow>
            ) : paginated.map((c) => (
              <TableRow key={c.num_prog}>
                <TableCell className="font-mono text-xs">#{c.num_prog}</TableCell>
                <TableCell>{tipo === "individual" ? c.cliente?.nombre_completo : c.grupo?.nombre_grupo}</TableCell>
                <TableCell><Badge variant="outline">{c.ciclo}</Badge></TableCell>
                <TableCell className="text-xs">{c.asesor?.nombre_asesor}</TableCell>
                <TableCell><Badge variant="secondary">{c.estado}</Badge></TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/creditos/${c.num_prog}`)}>Ver</Button>
                  {!isAsesor && (
                    <Button size="sm" disabled={reactivando === c.num_prog} onClick={() => handleReactivar(c.num_prog)}>
                      {reactivando === c.num_prog ? "..." : "Reactivar"}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {!loading && (
        <TablePagination page={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} label="créditos" />
      )}
    </div>
  );
}

export default function CarteraCerradosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Clientes Cerrados sin Renovación</h1>
        <p className="text-muted-foreground">Préstamos cerrados — individuales y grupales.</p>
      </div>
      <Tabs defaultValue="individual">
        <TabsList>
          <TabsTrigger value="individual"><User className="h-4 w-4 mr-2" />Individual</TabsTrigger>
          <TabsTrigger value="grupal"><Users className="h-4 w-4 mr-2" />Grupal</TabsTrigger>
        </TabsList>
        <TabsContent value="individual"><CerradosTable tipo="individual" /></TabsContent>
        <TabsContent value="grupal"><CerradosTable tipo="grupal" /></TabsContent>
      </Tabs>
    </div>
  );
}
