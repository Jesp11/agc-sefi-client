"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { fmtFecha } from "@/lib/utils";

const PAGE_SIZE = 5;

export default function CarteraCerradosPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const creditos: any[] = []; // TODO: fetch from API filtered by estatus cerrado sin renovación

  const filtered = creditos.filter((c: any) => {
    const term = search.toLowerCase();
    return (
      c.num_prog?.toString().includes(term) ||
      c.cliente?.nombre_completo?.toLowerCase().includes(term) ||
      c.grupo?.nombre_grupo?.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground/90">Clientes Cerrados sin Renovación</h1>
        <p className="text-muted-foreground">Préstamos liquidados que no generaron un nuevo ciclo.</p>
      </div>

      <div className="max-w-md">
        <Input
          placeholder="Buscar por folio, cliente o grupo..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="bg-background border-muted-foreground/20 focus-visible:ring-primary/30 h-10"
        />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[80px]">Folio</TableHead>
              <TableHead>Cliente / Grupo</TableHead>
              <TableHead className="text-center">Tipo</TableHead>
              <TableHead className="text-center">Ciclo</TableHead>
              <TableHead>Asesor</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Último Pago</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                  {search ? "No se encontraron resultados." : "Sin datos disponibles — funcionalidad próximamente."}
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
                    <TableCell className="font-mono text-xs font-semibold text-primary/80">#{c.num_prog}</TableCell>
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
                      <Badge variant="outline" className="font-bold text-xs">{c.ciclo ?? "—"}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{c.asesor?.nombre_asesor ?? "—"}</TableCell>
                    <TableCell className="text-xs font-semibold">${c.monto_otorgado}</TableCell>
                    <TableCell className="text-xs font-bold text-primary">${c.total}</TableCell>
                    <TableCell className="text-xs">
                      {c.fecha_ultimo_pago ? fmtFecha(c.fecha_ultimo_pago) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" className="h-8 text-xs font-medium">
                        Ver Préstamo
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} préstamos
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
