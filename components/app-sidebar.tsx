"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  SidebarFooter
} from "@/components/ui/sidebar";
import { useAuth } from "@/context/auth-context";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup,
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Users, 
  UserCircle, 
  CreditCard, 
  ClipboardList, 
  Component, 
  User, 
  LogOut, 
  ChevronsUpDown,
  Settings,
  Shield
} from "lucide-react";

// Menu items
const items = [
  {
    title: "Clientes",
    url: "/dashboard/clientes",
    icon: Users,
  },
  {
    title: "Asesores",
    url: "/dashboard/asesores",
    icon: UserCircle,
  },
  {
    title: "Créditos",
    url: "/dashboard/creditos",
    icon: CreditCard,
  },
  {
    title: "Créditos Indiv.",
    url: "/dashboard/creditos-individuales",
    icon: User,
  },
  {
    title: "Créditos Grupales",
    url: "/dashboard/grupos",
    icon: Component,
  },
  {
    title: "Tasas y Plazos",
    url: "/dashboard/catalogos",
    icon: ClipboardList,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex h-14 items-center px-4 font-bold text-lg border-b">
          SEFI Panel
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Módulos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
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
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Shield className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user?.name || "Administrador"}</span>
                    <span className="truncate text-xs text-muted-foreground">{user?.email || "admin@sefi.com"}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              } />
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <Shield className="size-4" />
                      </div>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">{user?.name || "Administrador"}</span>
                        <span className="truncate text-xs text-muted-foreground">{user?.email || "admin@sefi.com"}</span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={
                  <Link href="/dashboard/perfil">
                    <User className="mr-2 size-4" />
                    Perfil
                  </Link>
                } />

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()} className="text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 size-4" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
