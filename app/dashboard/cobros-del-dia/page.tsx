"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Redirige a Reporte Diario (cobros realizados / a realizar según rol). */
export default function CobrosDelDiaRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/reportes/diario");
  }, [router]);

  return (
    <div className="p-8 text-muted-foreground text-sm">
      Redirigiendo a Reporte Diario...
    </div>
  );
}
