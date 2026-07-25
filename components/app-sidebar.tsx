"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { SefiLogo } from "@/components/sefi-logo";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import type React from "react";
import {
  Users, UserCircle, User, Component, ClipboardList, LayoutList,
  AlertTriangle, UserX, FileText, BarChart3, TrendingUp, Wallet,
  Receipt, Banknote, PiggyBank, CalendarDays, ArrowLeftRight,
} from "lucide-react";

const catalogItems = [
  { title: "Alta Cliente", url: "/dashboard/clientes", icon: Users },
  { title: "Alta Grupo", url: "/dashboard/grupos", icon: Component },
  { title: "Asesores", url: "/dashboard/asesores", icon: UserCircle },
  { title: "Tasas y Plazos", url: "/dashboard/catalogos", icon: ClipboardList },
];

const carteraItems = [
  { title: "Cartera General", url: "/dashboard/cartera-general", icon: LayoutList },
  { title: "Cartera Individual", url: "/dashboard/creditos-individuales", icon: User },
  { title: "Cartera Grupal", url: "/dashboard/creditos-grupales", icon: Component },
  { title: "Cartera en Mora", url: "/dashboard/cartera-mora", icon: AlertTriangle },
  { title: "Clientes Cerrados", url: "/dashboard/cartera-cerrados", icon: UserX },
];

const contabilidadItems = [
  { title: "Inversionistas", url: "/dashboard/inversionistas", icon: TrendingUp },
  { title: "Capital Pasivo", url: "/dashboard/capital", icon: Wallet },
  { title: "Ingresos y Egresos", url: "/dashboard/flujo-caja", icon: ArrowLeftRight },
  { title: "Gastos Operativos", url: "/dashboard/gastos", icon: Receipt },
  { title: "Nómina", url: "/dashboard/nomina", icon: Banknote },
  { title: "Ahorro Personal", url: "/dashboard/ahorros-personal", icon: PiggyBank },
];

const reporteOperativos = [
  { title: "Reporte Diario", url: "/dashboard/reportes/diario", icon: CalendarDays },
  { title: "Reporte Cartera", url: "/dashboard/reportes/cartera", icon: LayoutList },
  { title: "Global Semanal", url: "/dashboard/reportes/semanal", icon: FileText },
];

const reporteAsesor = [
  { title: "Mora por Asesor", url: "/dashboard/reportes/asesor-mora", icon: AlertTriangle },
  { title: "Clientes por Cerrar", url: "/dashboard/reportes/por-cerrar", icon: UserX },
];

const reporteFinancieros = [
  { title: "Inversionistas", url: "/dashboard/reportes/inversionistas", icon: TrendingUp },
  { title: "Comparativas", url: "/dashboard/reportes/comparativas", icon: BarChart3 },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAsesor = user?.role?.nombre === "asesor";

  const reportesAsesor = [
    ...reporteOperativos.filter((item) => item.url !== "/dashboard/reportes/cartera"),
    ...reporteAsesor.filter((item) => item.url === "/dashboard/reportes/por-cerrar"),
  ];

  const groups = [
    ...(!isAsesor ? [{ label: "Catálogos", items: catalogItems }] : []),
    { label: "Carteras", items: carteraItems },
    ...(!isAsesor ? [{ label: "Contabilidad", items: contabilidadItems }] : []),
    {
      label: "Reportes",
      items: isAsesor
        ? reportesAsesor
        : [...reporteOperativos, ...reporteAsesor, ...reporteFinancieros],
    },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex h-16 items-center gap-2 px-2 border-b-2 border-red-600 overflow-hidden group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <SefiLogo />
          <span className="font-bold text-lg truncate group-data-[collapsible=icon]:hidden">AGC SEFI</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathname === item.url || pathname.startsWith(`${item.url}/`);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.title}
                        render={
                          <Link href={item.url}>
                            <item.icon />
                            <span>{item.title}</span>
                          </Link>
                        }
                      />
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
