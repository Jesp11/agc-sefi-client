"use client";

import { encode as encodeCp850 } from "iconv-lite";
import type { TicketData } from "./printRouter";

// UUIDs comunes para impresoras térmicas chinas BLE.
// La PT-210 suele usar Bluetooth Classic SPP, pero algunos modelos BLE usan estos servicios.
const PRINTER_SERVICE_UUIDS = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000fee7-0000-1000-8000-00805f9b34fb",
];

const WRITE_CHARACTERISTIC_UUIDS = [
  "00002af1-0000-1000-8000-00805f9b34fb",
  "0000ff02-0000-1000-8000-00805f9b34fb",
  "0000ff01-0000-1000-8000-00805f9b34fb",
];

const COMMANDS = {
  init: new Uint8Array([0x1b, 0x40]),
  center: new Uint8Array([0x1b, 0x61, 0x01]),
  left: new Uint8Array([0x1b, 0x61, 0x00]),
  boldOn: new Uint8Array([0x1b, 0x45, 0x01]),
  boldOff: new Uint8Array([0x1b, 0x45, 0x00]),
  doubleOn: new Uint8Array([0x1b, 0x21, 0x30]),
  doubleOff: new Uint8Array([0x1b, 0x21, 0x00]),
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

async function writeInChunks(
  characteristic: BluetoothRemoteGATTCharacteristic,
  data: Uint8Array,
  chunkSize = 512
): Promise<void> {
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    await characteristic.writeValue(chunk);
    if (i + chunkSize < data.length) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
}

async function tryConnectWithUuids(
  server: BluetoothRemoteGATTServer,
  ticketData: TicketData
): Promise<void> {
  let lastError: Error | null = null;

  for (const serviceUuid of PRINTER_SERVICE_UUIDS) {
    try {
      const service = await server.getPrimaryService(serviceUuid);
      for (const charUuid of WRITE_CHARACTERISTIC_UUIDS) {
        try {
          const characteristic = await service.getCharacteristic(charUuid);
          if (!characteristic.properties.write && !characteristic.properties.writeWithoutResponse) {
            continue;
          }
          const ticketBuffer = buildEscPosTicket(ticketData);
          await writeInChunks(characteristic, ticketBuffer);
          return;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
        }
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw (
    lastError ??
    new Error(
      "No se encontró un servicio/característica de escritura compatible. La impresora puede ser Bluetooth Classic (SPP), que no es soportado por Web Bluetooth."
    )
  );
}

export const printViaBluetooth = async (ticketData: TicketData): Promise<void> => {
  if (!navigator.bluetooth) {
    throw new Error("Web Bluetooth no está disponible en este navegador.");
  }

  let device: BluetoothDevice | null = null;

  try {
    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: PRINTER_SERVICE_UUIDS,
    });

    const server = await device.gatt?.connect();
    if (!server) {
      throw new Error("No se pudo conectar al servicio GATT de la impresora.");
    }

    await tryConnectWithUuids(server, ticketData);
    server.disconnect();
  } catch (error) {
    console.error("Error en impresión Bluetooth:", error);
    throw error;
  }
};

/** Función de diagnóstico: conecta a la impresora e imprime en consola los servicios y características. */
export const diagnoseBluetoothPrinter = async (): Promise<void> => {
  if (!navigator.bluetooth) {
    throw new Error("Web Bluetooth no está disponible en este navegador.");
  }

  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: PRINTER_SERVICE_UUIDS,
  });

  const server = await device.gatt?.connect();
  if (!server) throw new Error("No se pudo conectar GATT.");

  const services = await server.getPrimaryServices();
  console.log(`Dispositivo: ${device.name}`);
  console.log(`Servicios encontrados: ${services.length}`);

  for (const service of services) {
    console.log(`  Servicio: ${service.uuid}`);
    const characteristics = await service.getCharacteristics();
    for (const characteristic of characteristics) {
      const props = [];
      if (characteristic.properties.broadcast) props.push("broadcast");
      if (characteristic.properties.read) props.push("read");
      if (characteristic.properties.write) props.push("write");
      if (characteristic.properties.writeWithoutResponse) props.push("writeWithoutResponse");
      if (characteristic.properties.notify) props.push("notify");
      if (characteristic.properties.indicate) props.push("indicate");
      console.log(`    Característica: ${characteristic.uuid} -> ${props.join(", ")}`);
    }
  }

  server.disconnect();
};
