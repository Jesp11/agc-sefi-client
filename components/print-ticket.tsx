"use client";

import { useState } from "react";
import { fmtFecha, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SefiLogo } from "@/components/sefi-logo";
import { Printer } from "lucide-react";
import { PrintMethodPicker } from "@/components/print-method-picker";
import { isPWA, printTicket } from "@/utils/printRouter";

export interface PrintTicketProps {
  title: string;
  fecha: string;
  items: { label: string; value: string }[];
  totals?: { label: string; value: string }[];
  /** Si true, muestra el ticket en pantalla (no solo al imprimir). */
  visible?: boolean;
  ticketId?: string;
  /** Si true, coloca el botón de imprimir al final del contenedor y agrandado. */
  buttonAtBottom?: boolean;
  className?: string;
}

export function PrintTicket({
  title,
  fecha,
  items,
  totals,
  visible = false,
  ticketId = "print-ticket",
  buttonAtBottom = false,
  className,
}: PrintTicketProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const onPrint = () => {
    if (isPrinting) return;
    setIsPrinting(true);

    if (isPWA()) {
      setPickerOpen(true);
    } else {
      printTicket({ title, fecha, items, totals });
    }

    // Liberar el botón después del tiempo que tarda el diálogo de impresión.
    setTimeout(() => setIsPrinting(false), 2500);
  };

  return (
    <div className={cn(buttonAtBottom && "flex flex-col", className)}>
      {!buttonAtBottom && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="print:hidden"
          onClick={onPrint}
          disabled={isPrinting}
        >
          <Printer className="mr-2 h-4 w-4" />
          Imprimir ticket
        </Button>
      )}

      <div
        id={ticketId}
        className={cn(
          visible
            ? "print-ticket mt-4 w-[5.7cm] rounded-lg border bg-white p-3 text-foreground"
            : "print-ticket hidden w-[5.7cm] print:block p-3",
          buttonAtBottom && "max-h-[55vh] overflow-y-auto mt-0"
        )}
      >
        <div className="w-full mx-auto font-mono text-[14px] leading-snug">
          <div className="flex justify-center mb-4">
            <SefiLogo className="w-14 h-14" />
          </div>
          <h2 className="text-center font-bold text-base mb-2">{title}</h2>
          <p className="text-center text-sm mb-4">{fmtFecha(fecha)}</p>
          <div className="border-t border-b border-dashed py-2.5 space-y-2">
            {items.map((item, i) => (
              <div
                key={i}
                className="grid grid-cols-[auto_1fr] gap-3 text-[14px]"
              >
                <span className="shrink-0">{item.label}</span>
                <span className="text-right break-all">{item.value}</span>
              </div>
            ))}
          </div>
          {totals && totals.length > 0 && (
            <div className="mt-4 space-y-2 font-bold text-[15px]">
              {totals.map((t, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[auto_1fr] gap-3"
                >
                  <span>{t.label}</span>
                  <span className="text-right break-all">{t.value}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-center text-sm mt-4 font-bold">
            AGC Servicios Financieros — Gracias por su pago
          </p>
        </div>
      </div>

      {buttonAtBottom && (
        <Button
          type="button"
          variant="default"
          size="lg"
          className="print:hidden w-full h-12 text-base mt-4"
          onClick={onPrint}
          disabled={isPrinting}
        >
          <Printer className="mr-2 h-5 w-5" />
          Imprimir ticket
        </Button>
      )}

      <style jsx global>{`
        @media print {
          @page {
            size: 5.7cm auto;
            margin: 0;
          }
          body * {
            visibility: hidden !important;
          }
          .print-ticket,
          .print-ticket * {
            visibility: visible !important;
          }
          .print-ticket {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 5.7cm !important;
            display: block !important;
            background: white !important;
            padding: 0.3cm !important;
            border: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <PrintMethodPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        ticketData={{ title, fecha, items, totals, ticketId }}
      />
    </div>
  );
}

export type PagoTicketData = {
  num_prog: number | string;
  tipo_credito?: string;
  beneficiario?: string;
  asesor?: string | null;
  fecha: string;
  hora?: string | null;
  metodo_pago?: string;
  abono: number;
  multa?: number;
  total: number;
  notas?: string | null;
  saldo_pendiente?: number;
  num_pago?: number;
  total_pagos?: number;
};

export function buildPagoTicketProps(ticket: PagoTicketData) {
  const money = (n: number) =>
    `$${Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const items = [
    { label: "Folio", value: `#${ticket.num_prog}` },
    {
      label: "Pago",
      value:
        ticket.num_pago && ticket.total_pagos
          ? `${ticket.num_pago}/${ticket.total_pagos}`
          : "—",
    },
    { label: "Cliente/Grupo", value: ticket.beneficiario || "—" },
    { label: "Tipo", value: ticket.tipo_credito || "—" },
    { label: "Asesor", value: ticket.asesor || "—" },
    { label: "Hora", value: ticket.hora || "—" },
    { label: "Método", value: ticket.metodo_pago || "—" },
    { label: "Abono", value: money(ticket.abono) },
  ];

  if (ticket.multa && ticket.multa > 0) {
    items.push({ label: "Multa", value: money(ticket.multa) });
  }

  if (ticket.notas) {
    items.push({ label: "Notas", value: ticket.notas });
  }

  if (ticket.saldo_pendiente != null) {
    items.push({ label: "Saldo pend.", value: money(ticket.saldo_pendiente) });
  }

  return {
    title: "Comprobante de pago",
    fecha: String(ticket.fecha).slice(0, 10),
    items,
    totals: [{ label: "TOTAL", value: money(ticket.total) }],
  };
}
