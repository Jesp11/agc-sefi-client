"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Download, FileSpreadsheet, LoaderCircle, Upload } from "lucide-react";
import { toast } from "sonner";

const columns = [
  "folio_credito_anterior",
  "folio_credito_nuevo",
  "saldo_absorbido",
  "monto_neto",
  "fecha_efectiva",
  "intereses_arrastrados",
  "notas",
] as const;

type ImportRow = Record<string, string | number | null> & { row_number: number };
type PreviewRow = {
  row_number: number;
  valid: boolean;
  errors: string[];
  warnings: string[];
  data: ImportRow;
  credito_anterior?: { num_prog: number; estado: string; tipo_credito: string } | null;
  credito_nuevo?: { num_prog: number; estado: string; tipo_credito: string } | null;
};
type Preview = {
  rows: PreviewRow[];
  missing_columns: string[];
  summary: { total: number; valid: number; invalid: number; warnings: number };
};

const normalizeHeader = (value: unknown) => String(value ?? "").replace(/^\uFEFF/, "").trim().toLowerCase();
const money = (value: unknown) => `$${Number(value || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

export function ImportarRenovacionesHistoricasDialog() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [reading, setReading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [payload, setPayload] = useState<{ columns: string[]; rows: ImportRow[] } | null>(null);

  const reset = () => {
    setPreview(null);
    setPayload(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) reset();
  };

  const downloadTemplate = () => {
    const sheet = XLSX.utils.aoa_to_sheet([[...columns]]);
    sheet["!cols"] = [
      { wch: 24 }, { wch: 22 }, { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 22 }, { wch: 42 },
    ];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Renovaciones");
    XLSX.writeFile(book, "plantilla-renovaciones-historicas.xlsx");
  };

  const readFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setReading(true);
    setPreview(null);
    try {
      const book = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const firstSheet = book.Sheets[book.SheetNames[0]];
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, defval: "", raw: false });
      const headers = (matrix[0] ?? []).map(normalizeHeader);
      const rows = matrix.slice(1)
        .map((source, index) => ({ source, rowNumber: index + 2 }))
        .filter(({ source }) => source.some((value) => String(value ?? "").trim() !== ""))
        .map(({ source, rowNumber }) => {
          const row: ImportRow = { row_number: rowNumber };
          headers.forEach((header, columnIndex) => {
            if (columns.includes(header as (typeof columns)[number])) row[header] = source[columnIndex] as string | number | null;
          });
          return row;
        });

      if (rows.length === 0) {
        toast.error("El archivo no contiene filas para importar");
        return;
      }

      const nextPayload = { columns: headers, rows };
      setPayload(nextPayload);
      const res = await apiFetch("/reportes/renovaciones-historicas/preview", {
        method: "POST",
        body: JSON.stringify(nextPayload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "No se pudo validar el archivo");
      setPreview(body);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo leer el archivo de Excel");
    } finally {
      setReading(false);
    }
  };

  const confirm = async () => {
    if (!payload || !preview || preview.summary.invalid > 0) return;
    setConfirming(true);
    try {
      const res = await apiFetch("/reportes/renovaciones-historicas/confirm", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (body.rows && body.summary) setPreview(body);
        throw new Error(body.message || "No se pudo confirmar la importación");
      }
      toast.success(body.message || "Renovaciones históricas importadas");
      setOpen(false);
      reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo confirmar la importación");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" className="gap-2"><FileSpreadsheet className="size-4" />Importar históricas</Button>} />
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Importar renovaciones históricas</DialogTitle>
          <DialogDescription>
            Enlaza créditos ya existentes. No crea créditos, pagos, movimientos de caja ni indicadores operativos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={downloadTemplate} className="gap-2"><Download className="size-4" />Descargar plantilla</Button>
          <Button type="button" onClick={() => inputRef.current?.click()} disabled={reading} className="gap-2">
            {reading ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {reading ? "Validando..." : "Cargar Excel"}
          </Button>
          <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={readFile} />
        </div>

        {preview && (
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline">{preview.summary.total} fila(s)</Badge>
              <Badge className="bg-emerald-600">{preview.summary.valid} válida(s)</Badge>
              {preview.summary.invalid > 0 && <Badge variant="destructive">{preview.summary.invalid} con error</Badge>}
              {preview.summary.warnings > 0 && <Badge variant="outline" className="border-amber-400 text-amber-700">{preview.summary.warnings} advertencia(s)</Badge>}
            </div>
            {preview.missing_columns.length > 0 && <p className="text-sm text-destructive">Faltan columnas obligatorias: {preview.missing_columns.join(", ")}.</p>}
            <div className="max-h-[46vh] overflow-auto rounded-md border">
              <table className="w-full min-w-[880px] text-sm">
                <thead className="sticky top-0 bg-muted text-left"><tr><th className="p-2">Fila</th><th className="p-2">Anterior</th><th className="p-2">Nuevo</th><th className="p-2 text-right">Absorbido</th><th className="p-2 text-right">Neto</th><th className="p-2">Resultado</th></tr></thead>
                <tbody>{preview.rows.map((row) => <tr key={row.row_number} className="border-t align-top">
                  <td className="p-2 font-mono">{row.row_number}</td>
                  <td className="p-2">#{row.data.folio_credito_anterior ?? "—"}<span className="block text-xs text-muted-foreground">{row.credito_anterior?.estado ?? ""}</span></td>
                  <td className="p-2">#{row.data.folio_credito_nuevo ?? "—"}<span className="block text-xs text-muted-foreground">{row.credito_nuevo?.estado ?? ""}</span></td>
                  <td className="p-2 text-right">{money(row.data.saldo_absorbido)}</td>
                  <td className="p-2 text-right">{money(row.data.monto_neto)}</td>
                  <td className="p-2"><Badge variant={row.valid ? "outline" : "destructive"}>{row.valid ? "Válida" : "Corregir"}</Badge>
                    {[...row.errors, ...row.warnings].map((message, i) => <p key={`${message}-${i}`} className={`mt-1 text-xs ${i < row.errors.length ? "text-destructive" : "text-amber-700"}`}>{message}</p>)}
                  </td>
                </tr>)}</tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">La fecha efectiva vacía se toma de la fecha de otorgación del crédito nuevo. Las advertencias no bloquean una relación indicada por folios.</p>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={reset} disabled={confirming}>Limpiar</Button><Button onClick={confirm} disabled={confirming || preview.summary.invalid > 0}>{confirming && <LoaderCircle className="mr-2 size-4 animate-spin" />}Confirmar importación</Button></div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
