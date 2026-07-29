"use client";

import { encode as encodeCp850 } from "iconv-lite";
import type { TicketData } from "./printRouter";

const COMMANDS = {
  init: new Uint8Array([0x1b, 0x40]),
  center: new Uint8Array([0x1b, 0x61, 0x01]),
  left: new Uint8Array([0x1b, 0x61, 0x00]),
  boldOn: new Uint8Array([0x1b, 0x45, 0x01]),
  boldOff: new Uint8Array([0x1b, 0x45, 0x00]),
  feed: (lines: number) => new Uint8Array([0x1b, 0x64, lines]),
  cut: new Uint8Array([0x1d, 0x56, 0x00]),
  line: new Uint8Array([0x0a]),
};

function textToBytes(text: string): Uint8Array {
  const encoded = encodeCp850(text, "CP850");
  return new Uint8Array(encoded.buffer, encoded.byteOffset, encoded.byteLength);
}

function concatArrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

function buildEscPosTicket(data: TicketData): Uint8Array {
  const parts: Uint8Array[] = [];

  parts.push(COMMANDS.init);
  parts.push(COMMANDS.center);
  parts.push(COMMANDS.boldOn);
  parts.push(textToBytes(data.title));
  parts.push(COMMANDS.boldOff);
  parts.push(COMMANDS.line);
  parts.push(textToBytes(data.fecha));
  parts.push(COMMANDS.line);
  parts.push(COMMANDS.line);

  parts.push(COMMANDS.left);
  for (const item of data.items) {
    const line = `${item.label}: ${item.value}`;
    parts.push(textToBytes(line));
    parts.push(COMMANDS.line);
  }

  if (data.totals && data.totals.length > 0) {
    parts.push(COMMANDS.line);
    parts.push(COMMANDS.boldOn);
    for (const total of data.totals) {
      const line = `${total.label}: ${total.value}`;
      parts.push(textToBytes(line));
      parts.push(COMMANDS.line);
    }
    parts.push(COMMANDS.boldOff);
  }

  parts.push(COMMANDS.line);
  parts.push(COMMANDS.center);
  parts.push(textToBytes("AGC Servicios Financieros"));
  parts.push(COMMANDS.line);
  parts.push(textToBytes("Gracias por su pago"));
  parts.push(COMMANDS.line);
  parts.push(COMMANDS.feed(3));
  parts.push(COMMANDS.cut);

  return concatArrays(...parts);
}

export const isSerialAvailable = (): boolean => {
  if (typeof window === "undefined") return false;
  return "serial" in navigator && "requestPort" in navigator.serial;
};

export const printViaSerial = async (ticketData: TicketData): Promise<void> => {
  if (!isSerialAvailable()) {
    throw new Error("Web Serial no está disponible en este navegador.");
  }

  let port: SerialPort | null = null;

  try {
    port = await navigator.serial.requestPort({});
    await port.open({ baudRate: 9600 });

    const writer = port.writable?.getWriter();
    if (!writer) {
      throw new Error("No se pudo obtener el escritor del puerto serial.");
    }

    const ticketBuffer = buildEscPosTicket(ticketData);

    // Enviar en chunks para evitar saturar el buffer de la impresora
    const chunkSize = 256;
    for (let i = 0; i < ticketBuffer.length; i += chunkSize) {
      const chunk = ticketBuffer.slice(i, i + chunkSize);
      await writer.write(chunk);
      if (i + chunkSize < ticketBuffer.length) {
        await new Promise((resolve) => setTimeout(resolve, 30));
      }
    }

    writer.releaseLock();
    await port.close();
  } catch (error) {
    console.error("Error en impresión Serial/USB:", error);
    throw error;
  }
};
