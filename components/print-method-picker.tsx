"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bluetooth, Usb, Printer, AlertCircle, Smartphone } from "lucide-react";
import { printViaBluetooth } from "@/utils/bluetoothPrinter";
import { printViaSerial } from "@/utils/serialPrinter";
import { printViaRawBT, isRawBTAvailable } from "@/utils/rawbtPrinter";
import { printTicket, type TicketData } from "@/utils/printRouter";
import { toast } from "sonner";

interface PrintMethodPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketData: TicketData;
}

export function PrintMethodPicker({
  open,
  onOpenChange,
  ticketData,
}: PrintMethodPickerProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleBluetooth = async () => {
    setLoading("bluetooth");
    try {
      await printViaBluetooth(ticketData);
      toast.success("Ticket enviado por Bluetooth");
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error Bluetooth";
      toast.error(message);
    } finally {
      setLoading(null);
    }
  };

  const handleSerial = async () => {
    setLoading("serial");
    try {
      await printViaSerial(ticketData);
      toast.success("Ticket enviado por USB/Serial");
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error USB/Serial";
      // No mostrar error si el usuario canceló el diálogo de selección de puerto
      if (message.includes("No port selected") || message.includes("cancelled")) {
        toast.info("Selección de puerto cancelada");
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(null);
    }
  };

  const handleNative = () => {
    setLoading("native");
    printTicket(ticketData);
    onOpenChange(false);
    setTimeout(() => setLoading(null), 2500);
  };

  const handleRawBT = () => {
    if (!isRawBTAvailable()) {
      toast.error("RawBT solo está disponible en Android");
      return;
    }
    setLoading("rawbt");
    toast.info("Enviando ticket a RawBT...");
    printViaRawBT(ticketData);
    onOpenChange(false);
    // RawBT tarda en abrir/procesar; mantenemos el botón bloqueado 10 s.
    setTimeout(() => setLoading(null), 10000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Seleccionar impresora</DialogTitle>
          <DialogDescription>
            Elige cómo quieres imprimir el ticket. Para la Goojprt PT-210, la
            opción más estable es RawBT con la app de Android.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 pt-2">
          <Button
            variant="outline"
            className="justify-start h-auto py-3"
            onClick={handleBluetooth}
            disabled={loading !== null}
          >
            <Bluetooth className="mr-3 h-5 w-5 text-primary" />
            <div className="text-left">
              <p className="font-medium">Bluetooth (BLE)</p>
              <p className="text-xs text-muted-foreground">
                Solo para impresoras con Bluetooth Low Energy
              </p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="justify-start h-auto py-3"
            onClick={handleSerial}
            disabled={loading !== null}
          >
            <Usb className="mr-3 h-5 w-5 text-primary" />
            <div className="text-left">
              <p className="font-medium">USB / Serial</p>
              <p className="text-xs text-muted-foreground">
                Conectar la impresora por cable USB-OTG
              </p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="justify-start h-auto py-3"
            onClick={handleRawBT}
            disabled={loading !== null}
          >
            <Smartphone className="mr-3 h-5 w-5 text-primary" />
            <div className="text-left">
              <p className="font-medium">RawBT (Android Bridge)</p>
              <p className="text-xs text-muted-foreground">
                Requiere app RawBT e impresora emparejada por Bluetooth Classic
              </p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="justify-start h-auto py-3"
            onClick={handleNative}
            disabled={loading !== null}
          >
            <Printer className="mr-3 h-5 w-5 text-primary" />
            <div className="text-left">
              <p className="font-medium">Impresión nativa del sistema</p>
              <p className="text-xs text-muted-foreground">
                Usar el diálogo de impresión del celular o laptop
              </p>
            </div>
          </Button>
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-amber-900 text-xs dark:bg-amber-950 dark:text-amber-100">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            La Goojprt PT-210 usa Bluetooth Classic, que no es compatible con
            Web Bluetooth. La opción recomendada es RawBT: instala la app, empareja
            la impresora y selecciona este botón.
          </p>
        </div>

        {loading && (
          <p className="text-center text-sm text-muted-foreground">
            Enviando vía{" "}
            {loading === "bluetooth" ? "Bluetooth..." : "USB/Serial..."}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
