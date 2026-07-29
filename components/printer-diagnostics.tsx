"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { diagnoseBluetoothPrinter } from "@/utils/bluetoothPrinter";
import { toast } from "sonner";
import { Bluetooth } from "lucide-react";

export function PrinterDiagnostics() {
  const [loading, setLoading] = useState(false);

  const runDiagnosis = async () => {
    setLoading(true);
    try {
      await diagnoseBluetoothPrinter();
      toast.success("Diagnóstico completo. Revisa la consola del navegador (F12).");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al diagnosticar";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={runDiagnosis}
      disabled={loading}
    >
      <Bluetooth className="mr-2 h-4 w-4" />
      {loading ? "Escaneando..." : "Diagnosticar impresora"}
    </Button>
  );
}
