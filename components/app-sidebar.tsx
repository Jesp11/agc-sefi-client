"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { Users, UserCircle, User, Component, ClipboardList } from "lucide-react";

const groups = [
  {
    label: "Catálogos",
    items: [
      { title: "Clientes", url: "/dashboard/clientes", icon: Users },
      { title: "Asesores", url: "/dashboard/asesores", icon: UserCircle },
      { title: "Tasas y Plazos", url: "/dashboard/catalogos", icon: ClipboardList },
    ],
  },
  {
    label: "Contabilidad",
    items: [
      { title: "Crédito Individual", url: "/dashboard/creditos-individuales", icon: User },
      { title: "Crédito Grupal", url: "/dashboard/grupos", icon: Component },
    ],
  },
  {
    label: "Reportes",
    items: [] as { title: string; url: string; icon: React.ElementType }[],
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex h-16 items-center gap-2 px-2 border-b-2 border-red-600 overflow-hidden group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <SefiLogo />
          <span className="font-bold text-lg truncate group-data-[collapsible=icon]:hidden">
            AGC SEFI
          </span>
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
