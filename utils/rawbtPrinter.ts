"use client";

import type { TicketData } from "./printRouter";

const sanitizeForRawbt = (text: string): string => {
  return text
    .replace(/—/g, "-")
    .replace(/–/g, "-")
    .replace(/[^\x00-\x7F]/g, (char) => {
      const map: Record<string, string> = {
        á: "a", é: "e", í: "i", ó: "o", ú: "u",
        Á: "A", É: "E", Í: "I", Ó: "O", Ú: "U",
        ñ: "n", Ñ: "N",
        ü: "u", Ü: "U",
        "¿": "?", "¡": "!",
      };
      return map[char] || "?";
    });
};

const toBase64 = (str: string): string => {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch {
    return btoa(str);
  }
};

function buildRawbtText(data: TicketData): string {
  const lines: string[] = [];

  lines.push("AGC Servicios Financieros");
  lines.push("------------------------");
  lines.push(sanitizeForRawbt(data.title));
  lines.push(data.fecha);
  lines.push("------------------------");

  for (const item of data.items) {
    const label = sanitizeForRawbt(item.label);
    const value = sanitizeForRawbt(item.value);
    lines.push(`${label}: ${value}`);
    lines.push(""); // espacio entre filas para mejor legibilidad
  }

  if (data.totals && data.totals.length > 0) {
    lines.push("------------------------");
    for (const total of data.totals) {
      const label = sanitizeForRawbt(total.label);
      const value = sanitizeForRawbt(total.value);
      lines.push(`${label}: ${value}`);
    }
  }

  lines.push("");
  lines.push("Gracias por su pago");
  lines.push("");
  lines.push("");
  lines.push("");
  lines.push("\x1D\x56\x00"); // ESC/POS partial cut (si RawBT lo soporta)

  return lines.join("\n");
}

export const isRawBTAvailable = (): boolean => {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /android/.test(ua);
};

let rawbtPending = false;

export const printViaRawBT = (ticketData: TicketData): void => {
  if (typeof window === "undefined") return;
  if (rawbtPending) {
    console.warn("RawBT: intent bloqueado por reenvío duplicado");
    return;
  }
  rawbtPending = true;

  const text = buildRawbtText(ticketData);
  const base64Data = toBase64(text);

  const intentUrl = `intent:base64,${base64Data}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;

  window.location.href = intentUrl;

  // RawBT tarda varios segundos en abrirse y procesar el ticket. Un segundo
  // toque del botón (volviendo del intent o tocando doble) generaría una
  // impresión duplicada, así que bloqueamos reenvíos por 10 segundos.
  setTimeout(() => {
    rawbtPending = false;
  }, 10000);
};
