"use client";

import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Shield, User, LogOut, ChevronsUpDown } from "lucide-react";

export function HeaderUserMenu() {
  const { user, logout } = useAuth();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <button className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-white hover:bg-white/10 transition-colors">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-white/15">
            <Shield className="size-4 text-white" />
          </div>
          <div className="text-left text-sm leading-tight hidden md:block">
            <p className="font-semibold truncate max-w-36">{user?.name || "Administrador"}</p>
            <p className="text-xs text-white/60 truncate max-w-36">{user?.email || "admin@sefi.com"}</p>
          </div>
          <ChevronsUpDown className="size-4 text-white/70" />
        </button>
      } />
      <DropdownMenuContent className="min-w-56 rounded-lg" side="bottom" align="end" sideOffset={8}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-2 py-2 text-sm">
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
  );
}
