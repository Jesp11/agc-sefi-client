"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { fmtFecha } from "@/lib/utils";
import { inversionistaSearchFields, movimientoSearchFields } from "@/lib/table-utils";
import { Download, Printer } from "lucide-react";
import { exportWorkbook, printReportHtml } from "@/lib/report-export";

const fmt = (value: unknown) =>
  `$${Number(value ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function EstadoFinancieroInversionistasPage() {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 8)}01`;
  const [fechaInicio, setFechaInicio] = useState(monthStart);
  const [fechaFin, setFechaFin] = useState(today);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { search, handleSearch, page, setPage } = useTableControls();

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("fecha_inicio", fechaInicio);
      params.set("fecha_fin", fechaFin);
      const res = await apiFetch(`/reportes/inversionistas/estado-financiero?${params.toString()}`);
      if (!active) return;
      if (res.ok) {
        const payload = await res.json();
        setData(payload);
        setSelectedId((current) => current ?? payload.inversionistas?.[0]?.id ?? null);
      }
      setLoading(false);
    };

    loadData();

    return () => {
      active = false;
    };
  }, [fechaInicio, fechaFin]);

  const inversionistas = data?.inversionistas ?? [];
  const filtered = filterBySearch(inversionistas, search, (item: any) => [
    ...inversionistaSearchFields(item),
    item.saldo_capital,
    item.aportaciones_periodo,
    item.retiros_periodo,
    item.rendimientos_periodo,
  ]);
  const paginated = paginateItems(filtered, page);

  const selected = useMemo(
    () => inversionistas.find((item: any) => item.id === selectedId) ?? paginated[0] ?? null,
    [inversionistas, paginated, selectedId],
  );
  const movimientos = selected?.movimientos ?? [];
  const movimientosFiltrados = filterBySearch(movimientos, search, movimientoSearchFields);
  const [isExporting, setIsExporting] = useState(false);
  const printSections: Array<{ title: string; rows: Array<[string, string]> }> = [
    {
      title: "Resumen",
      rows: [
        ["Fuentes", String(data?.resumen?.fuentes ?? 0)],
        ["Capital vigente", fmt(data?.resumen?.saldo_capital)],
        ["Aportaciones periodo", fmt(data?.resumen?.aportaciones_periodo)],
        ["Retiros periodo", fmt(data?.resumen?.retiros_periodo)],
        ["Rendimientos periodo", fmt(data?.resumen?.rendimientos_periodo)],
      ],
    },
  ];

  if (selected) {
    printSections.push({
      title: `Fuente seleccionada: ${selected.nombre}`,
      rows: [
        ["Tipo", selected.tipo_entidad || "Persona Fisica"],
        ["Origen", selected.origen_fondeo || "—"],
        ["Capital", fmt(selected.saldo_capital)],
        ["Aportaciones", fmt(selected.aportaciones_periodo)],
        ["Retiros", fmt(selected.retiros_periodo)],
        ["Rendimientos", fmt(selected.rendimientos_periodo)],
      ],
    });
  }

  const handleExport = () => {
    setIsExporting(true);
    try {
      exportWorkbook([
        {
          name: "Resumen",
          rows: inversionistas.map((item: any) => ({
            Fuente: item.nombre,
            Tipo: item.tipo_entidad,
            Origen: item.origen_fondeo || "",
            "Capital vigente": Number(item.saldo_capital ?? 0),
            "Aportaciones periodo": Number(item.aportaciones_periodo ?? 0),
            "Retiros periodo": Number(item.retiros_periodo ?? 0),
            "Rendimientos periodo": Number(item.rendimientos_periodo ?? 0),
          })),
        },
        {
          name: "Movimientos",
          rows: inversionistas.flatMap((item: any) =>
            (item.movimientos ?? []).map((mov: any) => ({
              Fuente: item.nombre,
              Fecha: mov.fecha,
              Tipo: mov.tipo,
              Descripcion: mov.descripcion || "",
              Monto: Number(mov.monto ?? 0),
            }))
          ),
        },
      ], `estado_financiero_inversionistas_${fechaInicio}_${fechaFin}.xlsx`);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    printReportHtml(`Estado Financiero de Fondeo ${fechaInicio} a ${fechaFin}`, printSections);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Estado Financiero de Fondeo</h1>
          <p className="text-muted-foreground">Detalle por fuente de capital con aportaciones, retiros y rendimientos por fecha.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={loading || isExporting}>
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "Exportando..." : "Exportar"}
          </Button>
          <Button variant="outline" onClick={handlePrint} disabled={loading}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div><Label>Inicio</Label><Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} /></div>
        <div><Label>Fin</Label><Input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} /></div>
        <div className="flex items-end"><TableSearch placeholder="Buscar fuente..." value={search} onChange={handleSearch} /></div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Fuentes</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{data?.resumen?.fuentes ?? 0}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Capital vigente</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{fmt(data?.resumen?.saldo_capital)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Aportaciones periodo</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-green-600">{fmt(data?.resumen?.aportaciones_periodo)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Rendimientos periodo</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-amber-600">{fmt(data?.resumen?.rendimientos_periodo)}</CardContent></Card>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fuente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead className="text-right">Capital</TableHead>
              <TableHead className="text-right">Aportaciones</TableHead>
              <TableHead className="text-right">Retiros</TableHead>
              <TableHead className="text-right">Rendimientos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">{search ? "No se encontraron fuentes." : "Sin movimientos en el periodo."}</TableCell></TableRow>
            ) : paginated.map((item: any) => (
              <TableRow
                key={item.id}
                className={item.id === selected?.id ? "bg-muted/40" : ""}
                onClick={() => setSelectedId(item.id)}
              >
                <TableCell className="font-medium">{item.nombre}</TableCell>
                <TableCell>{item.tipo_entidad || "Persona Fisica"}</TableCell>
                <TableCell>{item.origen_fondeo || "—"}</TableCell>
                <TableCell className="text-right font-semibold">{fmt(item.saldo_capital)}</TableCell>
                <TableCell className="text-right">{fmt(item.aportaciones_periodo)}</TableCell>
                <TableCell className="text-right">{fmt(item.retiros_periodo)}</TableCell>
                <TableCell className="text-right">{fmt(item.rendimientos_periodo)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      {!loading && <TablePagination page={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} label="fuentes" />}

      <Card>
        <CardHeader>
          <CardTitle>{selected ? `Movimientos de ${selected.nombre}` : "Movimientos"}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimientosFiltrados.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No hay movimientos para la fuente seleccionada en este periodo.</TableCell></TableRow>
              ) : movimientosFiltrados.map((mov: any, index: number) => (
                <TableRow key={`${mov.fecha}-${mov.tipo}-${index}`}>
                  <TableCell>{fmtFecha(mov.fecha)}</TableCell>
                  <TableCell>{mov.tipo}</TableCell>
                  <TableCell>{mov.descripcion || "—"}</TableCell>
                  <TableCell className="text-right font-semibold">{fmt(mov.monto)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
