"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Download, PencilLine, Plus, Printer, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api";
import { AnnualGroupedBalanceChart, type AnnualBalanceOrigin } from "@/components/annual-grouped-balance-chart";
import { exportWorkbook, printReportHtml } from "@/lib/report-export";
import { toast } from "sonner";

type VisualRow = {
  nombre?: string;
  asesor?: string;
  porcentaje?: number;
  monto?: number;
  saldo_capital?: number;
  valor_bruto?: number;
  valor_neto?: number;
  adeudo_asignado?: number;
  clientes_mes_anterior?: number;
  clientes_mes_actual?: number;
  clientes_individuales_activos?: number;
  clientes_totales?: number;
};

type VisualData = {
  titulo?: string;
  valores_acciones?: Record<string, number | null>;
  adeudos_cartera?: Record<string, number | null>;
  operacion?: Record<string, number | null | string[]>;
  captura_manual?: {
    mes?: string;
    aumento_cartera?: number | null;
    pase_a_cartera_mora?: number | null;
    actualizado_en?: string | null;
  };
  accionistas?: {
    porcentajes?: VisualRow[];
    valores?: VisualRow[];
  };
  inversionistas?: {
    registros?: VisualRow[];
    total?: number;
  };
  adeudos_por_accionista?: VisualRow[];
  cartera_individual?: {
    clientes_activos?: number;
  };
  cartera_grupal?: {
    grupos_activos?: number;
    clientes_activos?: number;
  };
  total_clientes?: number;
  distribucion_carteras?: {
    mes_anterior_label?: string;
    mes_actual_label?: string;
    registros?: VisualRow[];
    total_mes_anterior?: number;
    total_mes_actual?: number;
    total_individuales?: number;
    total_clientes?: number;
  };
  cierre_mora?: Record<string, number | null>;
};

type ReportResponse = {
  mes: string;
  corte?: string;
  visual?: VisualData;
  balance_general_cartera?: Array<{
    mes: string;
    valor_bruto: number | null;
    valor_neto: number | null;
    origen: AnnualBalanceOrigin;
  }>;
  balance_mora_anual?: Array<{
    mes: string;
    mora_activa: number | null;
    mora_muerta: number | null;
    origen: AnnualBalanceOrigin;
  }>;
  flujo?: {
    total_ingresos?: number;
    total_egresos?: number;
    distribucion_categorias?: {
      egresos?: Record<string, number>;
    };
  };
  cierre_confirmado?: boolean;
};

const fmtMoney = (value: unknown) =>
  `$ ${Number(value ?? 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtPercent = (value: unknown) =>
  `${Number(value ?? 0).toLocaleString("es-MX", {
    maximumFractionDigits: 0,
  })}%`;

const valueOrDash = (
  value: unknown,
  formatter: (input: unknown) => string = fmtMoney,
) => (value === null || value === undefined || value === "" ? "-" : formatter(value));

function MetricCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card size="sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function DataListCard({
  title,
  description,
  rows,
}: {
  title: string;
  description?: string;
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row, index) => (
          <div
            key={`${title}-${row.label}-${index}`}
            className="flex items-start justify-between gap-4 border-b pb-3 last:border-b-0 last:pb-0"
          >
            <span className="text-sm text-muted-foreground">{row.label}</span>
            <span className="text-right font-medium">{row.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

type CarteraCierreChartItem = {
  label: string;
  value: number;
  color: string;
};

const CHART_COLORS = ["#2563eb", "#7c3aed", "#db2777", "#ea580c", "#0f766e", "#4f46e5"];

function CarteraCierreBarChart({
  title,
  items,
}: {
  title: string;
  items: CarteraCierreChartItem[];
}) {
  const maxValue = Math.max(0, ...items.map((item) => item.value));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>Comparativo de importes al cierre del periodo seleccionado.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-2">
          {items.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Sin datos para el periodo seleccionado.</p>
          ) : (
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: `repeat(${items.length}, minmax(6rem, 1fr))` }}
            >
              {items.map((item) => (
                <div key={item.label} className="flex min-w-0 flex-col items-center gap-2 text-center">
                  <div className="flex h-44 w-full items-end justify-center border-b border-border" aria-hidden="true">
                    <div
                      className="w-full max-w-20 rounded-t-sm"
                      style={{
                        height: `${maxValue > 0 ? (Math.max(0, item.value) / maxValue) * 100 : 0}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-xs font-semibold tabular-nums sm:text-sm">{fmtMoney(item.value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TableCard({
  title,
  description,
  headers,
  rows,
  action,
  footerRow,
}: {
  title: string;
  description?: string;
  headers: string[];
  rows: Array<Array<string | number>>;
  action?: ReactNode;
  footerRow?: Array<string | number>;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((header, index) => (
                <TableHead key={`${title}-header-${index}`}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              <>
                {rows.map((row, rowIndex) => (
                  <TableRow key={`${title}-row-${rowIndex}`}>
                    {row.map((cell, cellIndex) => (
                      <TableCell
                        key={`${title}-cell-${rowIndex}-${cellIndex}`}
                        className={cellIndex === 0 ? "font-medium" : "text-right"}
                      >
                        {cell}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {footerRow ? (
                  <TableRow>
                    {footerRow.map((cell, cellIndex) => (
                      <TableCell
                        key={`${title}-footer-${cellIndex}`}
                        className={`font-semibold ${cellIndex === 0 ? "" : "text-right"}`}
                      >
                        {cell}
                      </TableCell>
                    ))}
                  </TableRow>
                ) : null}
              </>
            ) : (
              <TableRow>
                <TableCell colSpan={headers.length} className="h-20 text-center text-muted-foreground">
                  Sin datos.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function FullWidthBanner({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-2 py-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}

export default function ReporteCierreMensualPage() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [mes, setMes] = useState(currentMonth);
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [isSavingShareholders, setIsSavingShareholders] = useState(false);
  const [isConfirmingCierre, setIsConfirmingCierre] = useState(false);
  const [manualForm, setManualForm] = useState({
    aumento_cartera: "",
    pase_a_cartera_mora: "",
  });
  const [shareholdersForm, setShareholdersForm] = useState<Array<{ nombre: string; porcentaje: string }>>([]);

  useEffect(() => {
    let cancelled = false;

    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      const res = await apiFetch(`/reportes/cierre-mensual?mes=${mes}`);
      if (!cancelled && res.ok) {
        const payload = await res.json();
        setData(payload);
        setManualForm({
          aumento_cartera: payload.visual?.captura_manual?.aumento_cartera?.toString() ?? "",
          pase_a_cartera_mora: payload.visual?.captura_manual?.pase_a_cartera_mora?.toString() ?? "",
        });
      }
      if (!cancelled) {
        setLoading(false);
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [mes]);

  if (loading && !data) return <div className="p-8">Cargando...</div>;
  if (!data) return <div className="p-8">No se pudo cargar el cierre mensual.</div>;

  const visual = data.visual ?? {};
  const valores = visual.valores_acciones ?? {};
  const adeudos = visual.adeudos_cartera ?? {};
  const operacion = visual.operacion ?? {};
  const capturaManual = visual.captura_manual;
  const accionistas = visual.accionistas?.valores ?? [];
  const porcentajes = visual.accionistas?.porcentajes ?? [];
  const inversionistas = visual.inversionistas?.registros ?? [];
  const adeudosAccionistas = visual.adeudos_por_accionista ?? [];
  const distribucion = visual.distribucion_carteras?.registros ?? [];
  const cierreMora = visual.cierre_mora ?? {};
  const balanceCartera = data.balance_general_cartera ?? [];
  const balanceMora = data.balance_mora_anual ?? [];
  const categoriasEgresos = Object.entries(data.flujo?.distribucion_categorias?.egresos ?? {});

  const distAnteriorLabel = visual.distribucion_carteras?.mes_anterior_label ?? "Mes anterior";
  const distActualLabel = visual.distribucion_carteras?.mes_actual_label ?? "Mes actual";
  const [anioCierre, numeroMesCierre] = mes.split("-");
  const mesCierre = new Intl.DateTimeFormat("es-MX", { month: "long" })
    .format(new Date(Number(anioCierre), Number(numeroMesCierre) - 1, 1))
    .toUpperCase();
  const tituloCarteraCierre = `CARTERA CIERRE DE ${mesCierre} DE ${anioCierre}.`;

  const handleExport = () => {
    setIsExporting(true);
    try {
      exportWorkbook(
        [
          {
            name: "Cierre visual",
            rows: [
              {
                Mes: data.mes,
                Corte: data.corte ?? "",
                "Cartera individual": Number(valores.cartera_individual ?? 0),
                "Cartera grupal": Number(valores.cartera_grupal ?? 0),
                "Capital pasivo": Number(valores.capital_pasivo ?? 0),
                "Valor bruto": Number(valores.valor_bruto_cartera ?? 0),
                "Adeudo inversionistas": Number(adeudos.inversionistas ?? 0),
                "Adeudo mercado pago": Number(adeudos.mercado_pago ?? 0),
                "Valor neto": Number(valores.valor_neto_cartera ?? 0),
                Liquidaciones: Number(operacion.liquidaciones ?? 0),
                "Mora activa": Number(cierreMora.mora_activa ?? 0),
                "Mora muerta": Number(cierreMora.mora_muerta ?? 0),
              },
            ],
          },
          {
            name: "Accionistas",
            rows: accionistas.map((row) => ({
              Nombre: row.nombre,
              Porcentaje: Number(row.porcentaje ?? 0),
              "Valor bruto": Number(row.valor_bruto ?? 0),
              "Valor neto": Number(row.valor_neto ?? 0),
              Adeudo: Number(row.adeudo_asignado ?? 0),
            })),
          },
          {
            name: "Inversionistas",
            rows: inversionistas.map((row) => ({
              Nombre: row.nombre,
              Capital: Number(row.saldo_capital ?? 0),
            })),
          },
          {
            name: "Distribución de carteras",
            rows: distribucion.map((row) => ({
              Responsable: row.asesor ?? row.nombre ?? "",
              [distAnteriorLabel]: Number(row.clientes_mes_anterior ?? row.clientes_individuales_activos ?? 0),
              [distActualLabel]: Number(row.clientes_mes_actual ?? row.clientes_totales ?? 0),
            })),
          },
        ],
        `cierre_mensual_${mes}.xlsx`,
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    printReportHtml(visual.titulo || `Cierre Mensual ${mes}`, [
      {
        title: "Valores de Acciones",
        rows: [
          ["Cartera individual", fmtMoney(valores.cartera_individual)],
          ["Cartera grupal", fmtMoney(valores.cartera_grupal)],
          ["Capital pasivo", fmtMoney(valores.capital_pasivo)],
          ["Valor bruto de cartera", fmtMoney(valores.valor_bruto_cartera)],
          ["Valor neto de cartera", fmtMoney(valores.valor_neto_cartera)],
        ],
      },
      {
        title: "Adeudos de Cartera",
        rows: [
          ["Inversionistas", fmtMoney(adeudos.inversionistas)],
          ["Mercado Pago", fmtMoney(adeudos.mercado_pago)],
          ["Total", fmtMoney(adeudos.total)],
        ],
      },
      {
        title: "Distribución de Carteras",
        rows: [
          ...distribucion.map(
            (row): [string, string] => [
              row.asesor ?? row.nombre ?? "",
              `${distAnteriorLabel}: ${row.clientes_mes_anterior ?? row.clientes_individuales_activos ?? 0} | ${distActualLabel}: ${row.clientes_mes_actual ?? row.clientes_totales ?? 0}`,
            ],
          ),
          [
            "Total",
            `${distAnteriorLabel}: ${visual.distribucion_carteras?.total_mes_anterior ?? visual.distribucion_carteras?.total_individuales ?? 0} | ${distActualLabel}: ${visual.distribucion_carteras?.total_mes_actual ?? visual.distribucion_carteras?.total_clientes ?? 0}`,
          ],
        ],
      },
      {
        title: "Cierre de Mora",
        rows: [
          ["Mora activa", fmtMoney(cierreMora.mora_activa)],
          ["Mora muerta", fmtMoney(cierreMora.mora_muerta)],
          ["Total", fmtMoney(cierreMora.total)],
        ],
      },
    ]);
  };

  const handleSaveManual = async () => {
    setIsSavingManual(true);
    try {
      const payload = {
        mes,
        aumento_cartera: manualForm.aumento_cartera === "" ? null : Number(manualForm.aumento_cartera),
        pase_a_cartera_mora:
          manualForm.pase_a_cartera_mora === "" ? null : Number(manualForm.pase_a_cartera_mora),
      };

      const res = await apiFetch("/reportes/cierre-mensual/manual", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("No se pudo guardar la captura manual.");
      }

      toast.success("Indicadores operativos guardados.");
      setLoading(true);
      const reload = await apiFetch(`/reportes/cierre-mensual?mes=${mes}`);
      if (reload.ok) {
        const payload = await reload.json();
        setData(payload);
        setManualForm({
          aumento_cartera: payload.visual?.captura_manual?.aumento_cartera?.toString() ?? "",
          pase_a_cartera_mora: payload.visual?.captura_manual?.pase_a_cartera_mora?.toString() ?? "",
        });
      }
      setLoading(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la captura manual.");
      setLoading(false);
    } finally {
      setIsSavingManual(false);
    }
  };

  const handleConfirmarCierre = async () => {
    if (!window.confirm(`¿Confirmar el cierre de ${mes}? Esta acción lo dejará inmutable.`)) return;
    setIsConfirmingCierre(true);
    try {
      const res = await apiFetch("/reportes/cierre-mensual/confirmar", {
        method: "POST",
        body: JSON.stringify({ mes }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.message || "No se pudo confirmar el cierre.");
      toast.success("Cierre mensual confirmado e inmutable.");
      const reload = await apiFetch(`/reportes/cierre-mensual?mes=${mes}`);
      if (reload.ok) setData(await reload.json());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo confirmar el cierre.");
    } finally {
      setIsConfirmingCierre(false);
    }
  };

  const openShareholdersEditor = () => {
    setShareholdersForm(
      porcentajes.map((row) => ({
        nombre: row.nombre ?? "",
        porcentaje: row.porcentaje !== null && row.porcentaje !== undefined ? String(row.porcentaje) : "",
      })),
    );
  };

  const handleShareholderChange = (index: number, key: "nombre" | "porcentaje", value: string) => {
    setShareholdersForm((prev) =>
      prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)),
    );
  };

  const handleAddShareholder = () => {
    setShareholdersForm((prev) => [...prev, { nombre: "", porcentaje: "" }]);
  };

  const handleRemoveShareholder = (index: number) => {
    setShareholdersForm((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const totalShareholders = shareholdersForm.reduce((sum, row) => sum + Number(row.porcentaje || 0), 0);

  const handleSaveShareholders = async () => {
    setIsSavingShareholders(true);
    try {
      const payload = {
        accionistas: shareholdersForm
          .map((row) => ({
            nombre: row.nombre.trim(),
            porcentaje: row.porcentaje === "" ? 0 : Number(row.porcentaje),
          }))
          .filter((row) => row.nombre !== ""),
      };

      const res = await apiFetch("/reportes/cierre-mensual/accionistas", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const responsePayload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(responsePayload?.message || "No se pudieron guardar las participaciones.");
      }

      toast.success("Participaciones de accionistas guardadas.");
      setLoading(true);
      const reload = await apiFetch(`/reportes/cierre-mensual?mes=${mes}`);
      if (reload.ok) {
        const payload = await reload.json();
        setData(payload);
        setManualForm({
          aumento_cartera: payload.visual?.captura_manual?.aumento_cartera?.toString() ?? "",
          pase_a_cartera_mora: payload.visual?.captura_manual?.pase_a_cartera_mora?.toString() ?? "",
        });
        setShareholdersForm(
          (payload.visual?.accionistas?.porcentajes ?? []).map((row: VisualRow) => ({
            nombre: row.nombre ?? "",
            porcentaje: row.porcentaje !== null && row.porcentaje !== undefined ? String(row.porcentaje) : "",
          })),
        );
      }
      setLoading(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron guardar las participaciones.");
      setLoading(false);
    } finally {
      setIsSavingShareholders(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Cierre Mensual</h1>
          <p className="text-muted-foreground">
            {visual.titulo || "Concentrado mensual de cartera, adeudos y capital."}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Corte: {data.corte ?? data.mes}</p>
        </div>
        <div className="flex w-full max-w-xl items-end gap-2">
          <div className="flex-1">
            <Label>Mes de corte</Label>
            <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
          </div>
          <Button variant="outline" onClick={handleExport} disabled={isExporting || loading}>
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "Exportando..." : "Exportar"}
          </Button>
          <Button variant="outline" onClick={handlePrint} disabled={loading}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          <Button onClick={handleConfirmarCierre} disabled={data.cierre_confirmado || isConfirmingCierre || loading}>
            {data.cierre_confirmado ? "Cierre confirmado" : isConfirmingCierre ? "Confirmando..." : "Confirmar cierre"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="resumen">
        <TabsList aria-label="Secciones del cierre mensual">
          <TabsTrigger value="resumen">Resumen de cierre</TabsTrigger>
          <TabsTrigger value="graficas">Gráficas</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="space-y-6 pt-2">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Valor bruto de cartera"
          value={fmtMoney(valores.valor_bruto_cartera)}
          hint={`Individual ${fmtMoney(valores.cartera_individual)} + Grupal ${fmtMoney(valores.cartera_grupal)}`}
        />
        <MetricCard
          title="Valor neto de cartera"
          value={fmtMoney(valores.valor_neto_cartera)}
          hint={`Adeudos totales ${fmtMoney(adeudos.total)}`}
        />
        <MetricCard
          title="Cierre de mora"
          value={fmtMoney(cierreMora.total)}
          hint={`Activa ${fmtMoney(cierreMora.mora_activa)} / Muerta ${fmtMoney(cierreMora.mora_muerta)}`}
        />
        <MetricCard
          title="Clientes activos"
          value={String(visual.total_clientes ?? 0)}
          hint={`${visual.cartera_grupal?.grupos_activos ?? 0} grupos activos`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DataListCard
          title="Valores de acciones"
          rows={[
            { label: "Cartera individual", value: fmtMoney(valores.cartera_individual) },
            { label: "Cartera grupal", value: fmtMoney(valores.cartera_grupal) },
            { label: "Capital pasivo", value: fmtMoney(valores.capital_pasivo) },
            { label: "Valor bruto de cartera", value: fmtMoney(valores.valor_bruto_cartera) },
          ]}
        />
        <DataListCard
          title="Adeudos de cartera"
          rows={[
            { label: "Inversionistas", value: fmtMoney(adeudos.inversionistas) },
            { label: "Mercado Pago", value: fmtMoney(adeudos.mercado_pago) },
            { label: "Total", value: fmtMoney(adeudos.total) },
          ]}
        />
      </div>

      <FullWidthBanner
        title="Valor neto de cartera"
        value={fmtMoney(valores.valor_neto_cartera)}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
            <div className="space-y-1">
              <CardTitle>Indicadores operativos</CardTitle>
              <CardDescription>
                Ajusta manualmente solo los valores que aún no tienen trazabilidad automática.
              </CardDescription>
            </div>
            <Dialog>
              <DialogTrigger
                render={
                  <Button variant="ghost" size="icon-sm" aria-label="Editar indicadores operativos manuales" />
                }
              >
                <PencilLine className="h-4 w-4" />
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Captura manual de indicadores operativos</DialogTitle>
                  <DialogDescription>
                    Productividad mensual se calcula automáticamente como aumento de cartera + liquidaciones.
                  </DialogDescription>
                  {capturaManual?.actualizado_en ? (
                    <p className="text-xs text-muted-foreground">
                      Última actualización: {capturaManual.actualizado_en}
                    </p>
                  ) : null}
                </DialogHeader>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="aumento_cartera">Aumento de cartera</Label>
                    <Input
                      id="aumento_cartera"
                      type="number"
                      step="0.01"
                      value={manualForm.aumento_cartera}
                      onChange={(e) => setManualForm((prev) => ({ ...prev, aumento_cartera: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pase_a_cartera_mora">Pase a cartera de mora</Label>
                    <Input
                      id="pase_a_cartera_mora"
                      type="number"
                      step="0.01"
                      value={manualForm.pase_a_cartera_mora}
                      onChange={(e) => setManualForm((prev) => ({ ...prev, pase_a_cartera_mora: e.target.value }))}
                    />
                  </div>
                  <div className="sm:col-span-2 flex justify-end">
                    <Button onClick={handleSaveManual} disabled={isSavingManual || loading} className="w-full sm:w-auto">
                      {isSavingManual ? "Guardando..." : "Guardar indicadores"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Aumento de cartera", value: valueOrDash(operacion.aumento_cartera) },
              { label: "Pase a cartera de mora", value: valueOrDash(operacion.pase_a_cartera_mora) },
            ].map((row, index) => (
              <div
                key={`operacion-manual-${row.label}-${index}`}
                className="flex items-start justify-between gap-4 border-b pb-3 last:border-b-0 last:pb-0"
              >
                <span className="text-sm text-muted-foreground">{row.label}</span>
                <span className="text-right font-medium">{row.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <DataListCard
          title="Operación mensual"
          rows={[
            { label: "Liquidaciones", value: valueOrDash(operacion.liquidaciones) },
          ]}
        />
      </div>

      <FullWidthBanner
        title="Productividad mensual"
        value={fmtMoney(operacion.productividad_mensual)}
        hint={`Aumento de cartera + Liquidaciones`}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <TableCard
          title="Porcentaje de accionistas"
          headers={["Responsable", "Participación"]}
          action={
            <Dialog>
              <DialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Editar participaciones de accionistas"
                    onClick={openShareholdersEditor}
                  />
                }
              >
                <PencilLine className="h-4 w-4" />
              </DialogTrigger>
              <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Participaciones de accionistas</DialogTitle>
                  <DialogDescription>
                    Configura los porcentajes usados en el cierre mensual. La suma debe ser 100%.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                    Total actual: {fmtPercent(totalShareholders)}
                  </div>
                  <div className="space-y-3">
                    {shareholdersForm.map((row, index) => (
                      <div key={`shareholder-${index}`} className="grid gap-3 md:grid-cols-[1.6fr_0.8fr_auto]">
                        <div className="space-y-2">
                          <Label htmlFor={`accionista_nombre_${index}`}>Nombre</Label>
                          <Input
                            id={`accionista_nombre_${index}`}
                            value={row.nombre}
                            onChange={(e) => handleShareholderChange(index, "nombre", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`accionista_porcentaje_${index}`}>Porcentaje</Label>
                          <Input
                            id={`accionista_porcentaje_${index}`}
                            type="number"
                            step="0.01"
                            value={row.porcentaje}
                            onChange={(e) => handleShareholderChange(index, "porcentaje", e.target.value)}
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            onClick={() => handleRemoveShareholder(index)}
                            aria-label={`Eliminar accionista ${row.nombre || index + 1}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                    <Button type="button" variant="outline" onClick={handleAddShareholder}>
                      <Plus className="mr-2 h-4 w-4" />
                      Añadir accionista
                    </Button>
                    <Button type="button" onClick={handleSaveShareholders} disabled={isSavingShareholders || loading}>
                      {isSavingShareholders ? "Guardando..." : "Guardar participaciones"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          }
          rows={porcentajes.map((row) => [row.nombre ?? "", fmtPercent(row.porcentaje)])}
          footerRow={["Total", fmtPercent(porcentajes.reduce((sum, row) => sum + Number(row.porcentaje ?? 0), 0))]}
        />
        <TableCard
          title="Valor bruto y neto por accionista"
          headers={["Responsable", "Valor bruto", "Valor neto"]}
          rows={accionistas.map((row) => [
            row.nombre ?? "",
            fmtMoney(row.valor_bruto),
            fmtMoney(row.valor_neto),
          ])}
          footerRow={[
            "Total",
            fmtMoney(accionistas.reduce((sum, row) => sum + Number(row.valor_bruto ?? 0), 0)),
            fmtMoney(accionistas.reduce((sum, row) => sum + Number(row.valor_neto ?? 0), 0)),
          ]}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <TableCard
          title="Inversionistas"
          description={`Total acumulado ${fmtMoney(visual.inversionistas?.total ?? 0)}`}
          headers={["Nombre", "Capital"]}
          rows={inversionistas.map((row) => [row.nombre ?? "", fmtMoney(row.saldo_capital)])}
          footerRow={[
            "Total",
            fmtMoney(inversionistas.reduce((sum, row) => sum + Number(row.saldo_capital ?? 0), 0)),
          ]}
        />
        <TableCard
          title="Adeudos por inversionistas y Mercado de Pago"
          description={`Total ${fmtMoney(adeudos.total)}`}
          headers={["Responsable", "Adeudo asignado"]}
          rows={adeudosAccionistas.map((row) => [row.nombre ?? "", fmtMoney(row.monto)])}
          footerRow={[
            "Total",
            fmtMoney(adeudosAccionistas.reduce((sum, row) => sum + Number(row.monto ?? 0), 0)),
          ]}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DataListCard
          title="Cartera individual"
          rows={[
            {
              label: "Clientes activos",
              value: String(visual.cartera_individual?.clientes_activos ?? 0),
            },
          ]}
        />
        <DataListCard
          title="Cartera grupal"
          rows={[
            {
              label: `${visual.cartera_grupal?.grupos_activos ?? 0} grupos activos`,
              value: String(visual.cartera_grupal?.clientes_activos ?? 0),
            },
          ]}
        />
      </div>

      <FullWidthBanner
        title="Total de clientes"
        value={String(visual.total_clientes ?? 0)}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <TableCard
          title="Distribución de carteras"
          description="Comparativo de clientes activos por responsable respecto al mes anterior."
          headers={["Responsable", distAnteriorLabel, distActualLabel]}
          rows={[
            ...distribucion.map((row) => [
              row.asesor ?? row.nombre ?? "",
              row.clientes_mes_anterior ?? row.clientes_individuales_activos ?? 0,
              row.clientes_mes_actual ?? row.clientes_totales ?? 0,
            ]),
            [
              "Total",
              visual.distribucion_carteras?.total_mes_anterior ?? visual.distribucion_carteras?.total_individuales ?? 0,
              visual.distribucion_carteras?.total_mes_actual ?? visual.distribucion_carteras?.total_clientes ?? 0,
            ],
          ]}
        />
        <DataListCard
          title={`Cierre de mora ${data.mes.replace("-", "/")}`}
          rows={[
            { label: "Mora activa", value: fmtMoney(cierreMora.mora_activa) },
            { label: "Mora muerta", value: fmtMoney(cierreMora.mora_muerta) },
            { label: "Total", value: fmtMoney(cierreMora.total) },
          ]}
        />
      </div>
        </TabsContent>

        <TabsContent value="graficas" className="space-y-6 pt-2">
          <div className="grid gap-6 xl:grid-cols-2">
            <CarteraCierreBarChart
              title={tituloCarteraCierre}
              items={[
                { label: "Mora", value: Number(cierreMora.total ?? 0), color: "#f43f5e" },
                { label: "Adeudo", value: Number(adeudos.total ?? 0), color: "#f59e0b" },
                { label: "Valor neto", value: Number(valores.valor_neto_cartera ?? 0), color: "#2563eb" },
              ]}
            />
            <CarteraCierreBarChart
              title="MORA ACTIVA Y MUERTA"
              items={[
                { label: "Mora activa", value: Number(cierreMora.mora_activa ?? 0), color: "#f59e0b" },
                { label: "Mora muerta", value: Number(cierreMora.mora_muerta ?? 0), color: "#ef4444" },
              ]}
            />
          </div>
          <AnnualGroupedBalanceChart
            year={Number(anioCierre)}
            title="Balance de cartera en el año"
            description="Comparación mensual del valor neto y bruto de la cartera."
            series={[
              { label: "Neto", color: "#2563eb", values: balanceCartera.map((row) => row.valor_neto) },
              { label: "Bruto", color: "#dc2626", values: balanceCartera.map((row) => row.valor_bruto) },
            ]}
            origins={balanceCartera.map((row) => row.origen)}
          />
          <AnnualGroupedBalanceChart
            year={Number(anioCierre)}
            title="Balance de mora activa y mora muerta del año"
            description="Comparación mensual de mora activa y mora muerta."
            series={[
              { label: "Mora activa", color: "#2563eb", values: balanceMora.map((row) => row.mora_activa) },
              { label: "Mora muerta", color: "#dc2626", values: balanceMora.map((row) => row.mora_muerta) },
            ]}
            origins={balanceMora.map((row) => row.origen)}
          />
          <div className="grid gap-6">
            <CarteraCierreBarChart
              title="GASTOS OPERATIVOS"
              items={categoriasEgresos.map(([label, value], index) => ({
                label,
                value: Number(value ?? 0),
                color: CHART_COLORS[index % CHART_COLORS.length],
              }))}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
