"use client";

import { fmtFecha } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SefiLogo } from "@/components/sefi-logo";
import { Printer } from "lucide-react";

interface PrintTicketProps {
  title: string;
  fecha: string;
  items: { label: string; value: string }[];
  totals?: { label: string; value: string }[];
  /** Si true, muestra el ticket en pantalla (no solo al imprimir). */
  visible?: boolean;
  ticketId?: string;
}

export function PrintTicket({
  title,
  fecha,
  items,
  totals,
  visible = false,
  ticketId = "print-ticket",
}: PrintTicketProps) {
  const handlePrint = () => {
    requestAnimationFrame(() => window.print());
  };

  return (
    <div>
      <Button type="button" variant="outline" size="sm" className="print:hidden" onClick={handlePrint}>
        <Printer className="mr-2 h-4 w-4" />
        Imprimir ticket
      </Button>
      <div
        id={ticketId}
        className={
          visible
            ? "mt-4 w-[5.7cm] rounded-lg border bg-white p-1 text-foreground"
            : "hidden w-[5.7cm] print:block"
        }
      >
        <div className="w-full mx-auto font-mono text-[8px] leading-tight">
          <div className="flex justify-center mb-1">
            <SefiLogo className="w-8 h-8" />
          </div>
          <h2 className="text-center font-bold text-[10px] mb-0.5">{title}</h2>
          <p className="text-center text-[7px] mb-2">{fmtFecha(fecha)}</p>
          <div className="border-t border-b border-dashed py-1 space-y-0.5">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between gap-2">
                <span className="shrink-0">{item.label}</span>
                <span className="text-right break-all">{item.value}</span>
              </div>
            ))}
          </div>
          {totals && totals.length > 0 && (
            <div className="mt-1 space-y-0.5 font-bold text-[9px]">
              {totals.map((t, i) => (
                <div key={i} className="flex justify-between gap-2">
                  <span>{t.label}</span>
                  <span>{t.value}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-center text-[7px] mt-2">AGC Servcios Financieros — Gracias por su pago</p>
        </div>
      </div>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-ticket,
          #print-ticket *,
          #pago-print-ticket,
          #pago-print-ticket * {
            visibility: visible !important;
          }
          #print-ticket,
          #pago-print-ticket {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 5.7cm !important;
            display: block !important;
            background: white !important;
            padding: 0.2cm !important;
            border: none !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>
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
    { label: "Pago", value: ticket.num_pago && ticket.total_pagos ? `${ticket.num_pago}/${ticket.total_pagos}` : "—" },
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
