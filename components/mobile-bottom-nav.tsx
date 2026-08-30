"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { isFieldRoleName } from "@/lib/authz";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  LayoutList,
  Users,
  ArrowLeftRight,
  User,
  CalendarDays,
  FileText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  primary?: boolean;
}

const adminItems: NavItem[] = [
  { title: "Inicio", url: "/dashboard", icon: LayoutDashboard },
  { title: "Cartera", url: "/dashboard/cartera-general", icon: LayoutList },
  { title: "Clientes", url: "/dashboard/clientes", icon: Users },
  { title: "Flujo", url: "/dashboard/flujo-caja", icon: ArrowLeftRight },
  { title: "Perfil", url: "/dashboard/perfil", icon: User },
];

const asesorItems: NavItem[] = [
  { title: "General", url: "/dashboard/cartera-general", icon: LayoutDashboard },
  { title: "Individual", url: "/dashboard/creditos-individuales", icon: User },
  { title: "Cobros", url: "/dashboard/reportes/diario", icon: CalendarDays, primary: true },
  { title: "Mensual", url: "/dashboard/reportes/gestor-mensual", icon: FileText },
  { title: "Perfil", url: "/dashboard/perfil", icon: User },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAsesor = isFieldRoleName(user?.role?.nombre);
  const items = isAsesor ? asesorItems : adminItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background md:hidden">
      <ul className="flex items-end justify-around px-1 pb-1 pt-1">
        {items.map((item) => {
          const isActive =
            pathname === item.url || pathname.startsWith(`${item.url}/`);
          const primary = item.primary;

          return (
            <li key={item.url} className="flex-1">
              <Link
                href={item.url}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 text-xs transition-colors",
                  primary ? "relative -top-3" : "py-1",
                  isActive
                    ? "text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {primary ? (
                  <span
                    className={cn(
                      "flex size-12 items-center justify-center rounded-full shadow-md",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-primary border-2 border-primary"
                    )}
                  >
                    <item.icon className="size-5" />
                  </span>
                ) : (
                  <item.icon
                    className={cn(
                      "size-5",
                      isActive && "fill-current/10"
                    )}
                  />
                )}
                <span className={cn("truncate max-w-[4.5rem]", primary && "font-semibold")}>
                  {item.title}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
