"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  User,
  Users,
  AlertTriangle,
  CalendarDays,
  DollarSign,
  TrendingUp,
  UserX,
  Layers,
} from "lucide-react";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { apiFetch } from "@/lib/api";
import { creditoSearchFields } from "@/lib/table-utils";
import { CarteraAcciones } from "@/components/cartera-acciones";

interface MoraTableProps {
  endpoint: "/cartera/mora-activa" | "/cartera/mora-muerta";
  tipoFiltro?: "todos" | "individual" | "grupal";
  badgeLabel: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

function MoraTable({ endpoint, tipoFiltro = "todos", badgeLabel, badgeVariant = "outline" }: MoraTableProps) {
  const router = useRouter();
  const { search, handleSearch, page, setPage } = useTableControls();
  const [creditos, setCreditos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMora = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(endpoint);
      if (!res.ok) throw new Error("Error");
      const data = await res.json();
      let list = data.creditos ?? [];

      if (tipoFiltro === "individual") {
        list = list.filter((c: any) => (c.tipo_credito || "").toLowerCase() !== "grupal");
      } else if (tipoFiltro === "grupal") {
        list = list.filter((c: any) => (c.tipo_credito || "").toLowerCase() === "grupal");
      }

      setCreditos(list);
    } catch {
      setCreditos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMora();
  }, [endpoint, tipoFiltro]);

  const filtered = filterBySearch(creditos, search, creditoSearchFields);
  const paginated = paginateItems(filtered, page);

  // KPIs de Cartera en Mora
  const totalRecuperacionSemanal = useMemo(() => {
    return filtered.reduce((sum, c) => {
      const ficha = Number(c.valor_ficha ?? (c.plazos ? Number(c.total) / Number(c.plazos) : 0));
      return sum + (isNaN(ficha) ? 0 : ficha);
    }, 0);
  }, [filtered]);

  const totalSaldo = useMemo(() => {
    return filtered.reduce((sum, c) => {
      const saldo = Number(c.mora?.total_adeudo ?? c.mora?.saldo_actual ?? c.saldo_pendiente ?? c.total ?? 0);
      return sum + (isNaN(saldo) ? 0 : saldo);
    }, 0);
  }, [filtered]);

  const totalSaldoInvertido = useMemo(() => {
    return filtered.reduce((sum, c) => {
      const saldo = Number(c.mora?.saldo_actual ?? c.saldo_pendiente ?? c.total ?? 0);
      const interes = Number(c.interes ?? 0);
      const invertido = Number(c.saldo_inversion ?? c.mora?.saldo_inversion ?? (saldo - interes));
      return sum + (isNaN(invertido) ? 0 : invertido);
    }, 0);
  }, [filtered]);

  const totalMontoColocado = useMemo(() => {
    return filtered.reduce((sum, c) => sum + Number(c.monto_otorgado ?? 0), 0);
  }, [filtered]);

  return (
    <div className="space-y-5">
      {/* Tarjetas KPI de Cartera en Mora */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="p-4 border shadow-sm bg-card hover:border-emerald-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Recuperación Semanal
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <CalendarDays className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-2">
            ${totalRecuperacionSemanal.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Suma valor fichas semanales</p>
        </Card>

        <Card className="p-4 border shadow-sm bg-card hover:border-rose-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Saldo Total en Mora
            </span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-700">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-700 mt-2">
            ${totalSaldo.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Total adeudo pendiente de cobro</p>
        </Card>

        <Card className="p-4 border shadow-sm bg-card hover:border-teal-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Saldo Invertido
            </span>
            <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-foreground mt-2">
            ${totalSaldoInvertido.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Capital activo restante en mora</p>
        </Card>

        <Card className="p-4 border shadow-sm bg-card hover:border-amber-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Créditos en Mora
            </span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-foreground mt-2">
            {filtered.length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Colocado: ${totalMontoColocado.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </Card>
      </div>

      {/* Barra de Búsqueda */}
      <TableSearch
        placeholder="Buscar por folio, cliente, grupo o gestor..."
        value={search}
        onChange={handleSearch}
      />

      {/* Tabla de Cartera en Mora */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[75px]">Folio</TableHead>
              <TableHead>Cliente / Grupo</TableHead>
              <TableHead className="text-center">Tipo</TableHead>
              <TableHead className="text-center">Ciclo</TableHead>
              <TableHead>Gestor</TableHead>
              <TableHead className="text-center">Días Mora</TableHead>
              <TableHead className="text-right">Ficha Sem.</TableHead>
              <TableHead className="text-right">Total Adeudo</TableHead>
              <TableHead className="text-right">Saldo Invertido</TableHead>
              <TableHead className="text-center">Clasificación</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    <p className="text-sm">Cargando créditos en mora...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="h-32 text-center text-muted-foreground">
                  {search ? "No se encontraron resultados para ese criterio." : "Sin créditos en esta clasificación."}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((c: any) => {
                const ficha = Number(c.valor_ficha ?? (c.plazos ? Number(c.total) / Number(c.plazos) : 0));
                const adeudo = Number(c.mora?.total_adeudo ?? c.mora?.saldo_actual ?? c.saldo_pendiente ?? c.total ?? 0);
                const invertido = Number(c.saldo_inversion ?? c.mora?.saldo_inversion ?? ((Number(c.mora?.saldo_actual ?? c.saldo_pendiente ?? c.total ?? 0)) - Number(c.interes ?? 0)));
                const isGrupal = (c.tipo_credito || "").toLowerCase() === "grupal";

                return (
                  <TableRow key={c.num_prog} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs font-semibold text-primary/80">#{c.num_prog}</TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {isGrupal ? (
                          <Users className="h-4 w-4 text-purple-600" />
                        ) : (
                          <User className="h-4 w-4 text-blue-600" />
                        )}
                        {c.cliente?.nombre_completo || c.grupo?.nombre_grupo || "S/N"}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={isGrupal ? "secondary" : "outline"} className="text-xs">
                        {isGrupal ? "Grupal" : "Individual"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-bold">{c.ciclo}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{c.asesor?.nombre_asesor || "—"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="destructive" className="font-mono text-xs">
                        {c.dias_mora ?? c.mora?.dias_mora ?? 0} días
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium">
                      ${ficha.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-xs font-bold text-rose-700">
                      ${adeudo.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-xs font-semibold text-foreground">
                      ${invertido.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={badgeVariant} className="text-[11px] whitespace-nowrap">
                        {badgeLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <CarteraAcciones credito={c} onSuccess={fetchMora} />
                        <Button
                          size="sm"
                          className="h-8 text-xs font-medium"
                          onClick={() => router.push(`/dashboard/creditos/${c.num_prog}`)}
                        >
                          Ver
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
        <h1 className="text-3xl font-bold tracking-tight text-foreground/90">Cartera en Mora</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Control de cartera vencida clasificada en mora activa y mora muerta (individual y grupal).
        </p>
      </div>

      <Tabs defaultValue="activa" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-xl h-10">
          <TabsTrigger value="activa" className="text-xs sm:text-sm font-medium">
            <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
            Mora Activa
          </TabsTrigger>
          <TabsTrigger value="muerta-individual" className="text-xs sm:text-sm font-medium">
            <UserX className="h-4 w-4 mr-2 text-rose-500" />
            Mora Muerta Individual
          </TabsTrigger>
          <TabsTrigger value="muerta-grupal" className="text-xs sm:text-sm font-medium">
            <Users className="h-4 w-4 mr-2 text-purple-500" />
            Mora Muerta Grupal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activa">
          <MoraTable
            endpoint="/cartera/mora-activa"
            tipoFiltro="todos"
            badgeLabel="Mora Activa"
            badgeVariant="secondary"
          />
        </TabsContent>

        <TabsContent value="muerta-individual">
          <MoraTable
            endpoint="/cartera/mora-muerta"
            tipoFiltro="individual"
            badgeLabel="Mora Muerta Ind."
            badgeVariant="destructive"
          />
        </TabsContent>

        <TabsContent value="muerta-grupal">
          <MoraTable
            endpoint="/cartera/mora-muerta"
            tipoFiltro="grupal"
            badgeLabel="Mora Muerta Grp."
            badgeVariant="destructive"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
