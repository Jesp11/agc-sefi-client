"use client";

import { fmtFecha } from "@/lib/utils";

export interface TicketData {
  title: string;
  fecha: string;
  items: { label: string; value: string }[];
  totals?: { label: string; value: string }[];
  ticketId?: string;
}

export const isPWA = (): boolean => {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
};

export const isBluetoothAvailable = (): boolean => {
  if (typeof window === "undefined") return false;
  return (
    "bluetooth" in window.navigator &&
    "requestDevice" in navigator.bluetooth
  );
};

const buildTicketHtml = (ticket: TicketData): string => {
  const itemsHtml = ticket.items
    .map(
      (item) =>
        `<div class="row"><span>${escapeHtml(item.label)}</span><span class="value">${escapeHtml(item.value)}</span></div>`
    )
    .join("");

  const totalsHtml = ticket.totals
    ? ticket.totals
        .map(
          (t) =>
            `<div class="row totals"><span>${escapeHtml(t.label)}</span><span class="value">${escapeHtml(t.value)}</span></div>`
        )
        .join("")
    : "";

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${escapeHtml(ticket.title)}</title>
    <style>
      @media print {
        @page { margin: 0; size: auto; }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 0.4cm;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          background: white;
          color: black;
        }
        .ticket {
          width: 100%;
          max-width: 100%;
        }
        .logo {
          text-align: center;
          margin-bottom: 0.4cm;
        }
        .logo img {
          width: 2cm !important;
          height: 2cm !important;
          max-width: 2cm !important;
          max-height: 2cm !important;
          object-fit: contain !important;
          display: inline-block !important;
        }
        h1 {
          text-align: center;
          font-size: 20pt;
          margin: 0 0 0.25cm;
        }
        .date {
          text-align: center;
          font-size: 16pt;
          margin-bottom: 0.5cm;
        }
        .divider {
          border-top: 1.5px dashed #ccc;
          margin: 0.4cm 0;
        }
        .row {
          display: flex;
          justify-content: space-between;
          gap: 0.4cm;
          font-size: 17pt;
          margin-bottom: 0.2cm;
          line-height: 1.4;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .row .value {
          text-align: right;
          word-break: break-all;
          flex: 1;
        }
        .totals {
          font-weight: bold;
          font-size: 18pt;
        }
        .items-block,
        .totals-block {
          break-inside: avoid;
          page-break-inside: avoid;
          margin-bottom: 0.4cm;
        }
        .footer {
          text-align: center;
          font-size: 14pt;
          margin-top: 0.5cm;
          margin-bottom: 0.3cm;
          font-weight: bold;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .spacer {
          height: 0.4cm;
        }
      }
    </style>
  </head>
  <body>
    <div class="ticket">
      <div class="logo"><img src="/logo.png" alt="SEFI Logo" style="width:2cm;height:2cm;max-width:2cm;max-height:2cm;object-fit:contain;display:inline-block;" loading="eager"></div>
      <h1>${escapeHtml(ticket.title)}</h1>
      <div class="date">${escapeHtml(fmtFecha(ticket.fecha))}</div>
      <div class="divider"></div>
      <div class="items-block">
        ${itemsHtml}
      </div>
      <div class="divider"></div>
      <div class="totals-block">
        ${totalsHtml}
      </div>
      <div class="divider"></div>
      <div class="footer">AGC Servicios Financieros — Gracias por su pago</div>
      <div class="spacer"></div>
    </div>
  </body>
</html>`;
};

const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

let isPrinting = false;

export const printTicket = (ticket: TicketData): void => {
  if (typeof window === "undefined") return;
  if (isPrinting) return;
  isPrinting = true;

  const html = buildTicketHtml(ticket);
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.bottom = "-1000px";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    if (iframe.parentNode) document.body.removeChild(iframe);
    isPrinting = false;
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  let printed = false;

  const cleanup = () => {
    if (iframe.parentNode) {
      document.body.removeChild(iframe);
    }
    isPrinting = false;
  };

  const doPrint = () => {
    if (printed) return;
    printed = true;
    try {
      win.focus();
      win.print();
    } catch (e) {
      console.error("Error al imprimir ticket:", e);
    }
    // En móviles el diálogo de impresión (PDF) tarda en generarse;
    // dejamos el iframe vivo lo suficiente para que el navegador capture
    // todo el contenido y no solo el logo.
    setTimeout(cleanup, 10000);
  };

  const img = doc.querySelector("img");
  if (img && !img.complete) {
    const once = () => {
      if (printed) return;
      doPrint();
    };
    img.onload = once;
    img.onerror = once;
  } else {
    doPrint();
  }
};

export const printNative = (): void => {
  if (typeof window !== "undefined") {
    requestAnimationFrame(() => window.print());
  }
};
