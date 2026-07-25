"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PiggyBank, Wallet, TrendingUp, ArrowLeftRight } from "lucide-react";

const contabilidadLinks = [
  { title: "Ahorro Personal", desc: "Ahorro voluntario del personal (asesores)", url: "/dashboard/ahorros-personal", icon: PiggyBank },
  { title: "Capital Pasivo", desc: "Aportaciones, colocación y gastos", url: "/dashboard/capital", icon: Wallet },
  { title: "Ingresos y Egresos", desc: "Control de caja diario", url: "/dashboard/flujo-caja", icon: ArrowLeftRight },
  { title: "Inversionistas", desc: "Registro de inversionistas", url: "/dashboard/inversionistas", icon: TrendingUp },
];

export default function DashboardIndex() {
  return (
    <div className="space-y-8 p-2">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Bienvenido al Panel de SEFI</h1>
        <p className="text-muted-foreground text-lg">Selecciona un módulo en el menú lateral para comenzar a gestionar los datos.</p>
      </div>

      <div className="max-w-4xl mx-auto">
        <h2 className="text-lg font-semibold mb-4 text-center">Contabilidad</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {contabilidadLinks.map((link) => (
              <Link key={link.url} href={link.url}>
                <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                  <CardHeader className="flex flex-row items-center gap-3 pb-2">
                    <link.icon className="size-5 text-primary" />
                    <CardTitle className="text-base">{link.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{link.desc}</p>
                  </CardContent>
                </Card>
              </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
