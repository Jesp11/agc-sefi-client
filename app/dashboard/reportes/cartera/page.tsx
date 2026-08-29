"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { isFieldRoleName } from "@/lib/authz";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { creditoSearchFields } from "@/lib/table-utils";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { exportWorkbook, printReportHtml } from "@/lib/report-export";

export default function ReporteCarteraPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAsesor = isFieldRoleName(user?.role?.nombre);
  const [tipo, setTipo] = useState("general");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
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
    c.saldo_total,
    c.saldo_inversion,
    c.semanas_restantes,
    c.credito_total_grupal,
    c.saldo_grupal,
    c.ahorro_total_grupal,
    ...(c.pagos_programados ?? []),
    ...(c.ahorro_programado ?? []),
  ]);
  const paginated = paginateItems(filtered, page);
  const showGroupFields = tipo === "grupal";

  const handleExport = () => {
    setIsExporting(true);
    try {
      const rows = filtered.map((c: any) => ({
        "Folio": c.num_prog,
        "Tipo": c.tipo_credito,
        "Estado": c.estado,
        "Cliente": c.cliente?.nombre_completo ?? "",
        "Grupo": c.grupo?.nombre_grupo ?? "",
        "Asesor": c.asesor?.nombre_asesor ?? "",
        "Monto otorgado": Number(c.monto_otorgado ?? 0),
        "Interes": Number(c.interes ?? 0),
        ...(showGroupFields ? {
          "Credito total grupal": Number(c.credito_total_grupal ?? 0),
          "Saldo grupal": Number(c.saldo_grupal ?? 0),
          "Ahorro total grupal": Number(c.ahorro_total_grupal ?? 0),
        } : {}),
        "Saldo total": Number(c.saldo_total ?? c.mora?.saldo_actual ?? c.saldo_pendiente ?? 0),
        "Saldo inversion": Number(c.saldo_inversion ?? 0),
        "Semanas restantes": Number(c.semanas_restantes ?? 0),
        ...Object.fromEntries(
          Array.from({ length: 16 }, (_, i) => [`P-${i + 1}`, Number(c.pagos_programados?.[i] ?? 0) || ""])
        ),
        ...Object.fromEntries(
          showGroupFields
            ? Array.from({ length: 16 }, (_, i) => [`Ahorro P${i + 1}`, Number(c.ahorro_programado?.[i] ?? 0) || ""])
            : []
        ),
      }));

      exportWorkbook([
        { name: "Cartera", rows },
      ], `reporte_cartera_${tipo}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success("Reporte exportado");
    } catch {
      toast.error("No se pudo exportar el reporte");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintSummary = () => {
    printReportHtml("Reporte de Cartera", [
      {
        title: `Filtro ${tipo}`,
        rows: [
          ["Fecha", new Date().toLocaleDateString("es-MX")],
          ["Créditos filtrados", String(filtered.length)],
          ["Monto colocado", `$${filtered.reduce((sum: number, c: any) => sum + Number(c.monto_otorgado ?? 0), 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`],
          ["Saldo total", `$${filtered.reduce((sum: number, c: any) => sum + Number(c.saldo_total ?? c.mora?.saldo_actual ?? c.saldo_pendiente ?? 0), 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`],
        ],
      },
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Reporte de Cartera</h1>
        <div className="flex items-center gap-2">
          <select className="border rounded px-3 py-2 text-sm" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="general">General</option>
            <option value="individual">Individual</option>
            <option value="grupal">Grupal</option>
            <option value="mora">En Mora</option>
            <option value="mora_activa">Mora activa</option>
            <option value="mora_muerta">Mora muerta</option>
            <option value="cerrados">Cerrados</option>
          </select>
          <Button variant="outline" onClick={handleExport} disabled={isExporting || loading}>
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "Exportando..." : "Exportar"}
          </Button>
          <Button variant="outline" onClick={handlePrintSummary} disabled={loading}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir resumen
          </Button>
        </div>
      </div>
        <TableSearch placeholder="Buscar créditos..." value={search} onChange={handleSearch} />
      <Card className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Folio</TableHead><TableHead>Tipo</TableHead><TableHead>Estado</TableHead><TableHead>Monto</TableHead>{showGroupFields && <TableHead>Crédito Total</TableHead>}{showGroupFields && <TableHead>Saldo Grupal</TableHead>}<TableHead>Saldo Total</TableHead><TableHead>Saldo Inversión</TableHead>{showGroupFields && <TableHead>Ahorro Total</TableHead>}<TableHead>Semanas Restantes</TableHead>{Array.from({ length: 16 }, (_, i) => <TableHead key={i}>{`P-${i + 1}`}</TableHead>)}{showGroupFields && Array.from({ length: 16 }, (_, i) => <TableHead key={`a-${i}`}>{`A P${i + 1}`}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={showGroupFields ? 42 : 23} className="h-24 text-center text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={showGroupFields ? 42 : 23} className="h-24 text-center text-muted-foreground">{search ? "No se encontraron créditos." : "Sin créditos."}</TableCell></TableRow>
            ) : paginated.map((c: any) => (
              <TableRow key={c.num_prog}>
                <TableCell>#{c.num_prog}</TableCell>
                <TableCell>{c.tipo_credito}</TableCell>
                <TableCell>{c.estado}</TableCell>
                <TableCell>${Number(c.monto_otorgado).toLocaleString()}</TableCell>
                {showGroupFields && <TableCell>${Number(c.credito_total_grupal ?? 0).toLocaleString()}</TableCell>}
                {showGroupFields && <TableCell>${Number(c.saldo_grupal ?? 0).toLocaleString()}</TableCell>}
                <TableCell>${Number(c.saldo_total ?? c.mora?.saldo_actual ?? c.saldo_pendiente ?? 0).toLocaleString()}</TableCell>
                <TableCell>${Number(c.saldo_inversion ?? 0).toLocaleString()}</TableCell>
                {showGroupFields && <TableCell>${Number(c.ahorro_total_grupal ?? 0).toLocaleString()}</TableCell>}
                <TableCell>{c.semanas_restantes ?? 0}</TableCell>
                {Array.from({ length: 16 }, (_, i) => (
                  <TableCell key={i}>{
                    Number(c.pagos_programados?.[i] ?? 0) > 0
                      ? `$${Number(c.pagos_programados[i]).toLocaleString()}`
                      : "—"
                  }</TableCell>
                ))}
                {showGroupFields && Array.from({ length: 16 }, (_, i) => (
                  <TableCell key={`a-cell-${i}`}>
                    {Number(c.ahorro_programado?.[i] ?? 0) > 0
                      ? `$${Number(c.ahorro_programado[i]).toLocaleString()}`
                      : "—"}
                  </TableCell>
                ))}
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
