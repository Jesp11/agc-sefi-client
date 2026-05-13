"use client";

import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Shield, Calendar } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
        <p className="text-muted-foreground">Gestiona tu información personal y preferencias.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-full md:col-span-1">
          <CardHeader>
            <CardTitle>Información de Usuario</CardTitle>
            <CardDescription>Detalles básicos de tu cuenta.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-3xl font-bold border-4 border-background shadow-lg">
                {user?.name?.charAt(0) || "A"}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{user?.name || "Administrador"}</h2>
                <Badge variant="secondary" className="mt-1">
                  Administrador
                </Badge>
              </div>
            </div>
            
            <div className="space-y-4 pt-6">
              <div className="flex items-center gap-3 text-sm p-3 rounded-lg bg-muted/50 border border-border/50">
                <div className="p-2 rounded-md bg-background">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Email</span>
                  <span className="font-medium">{user?.email || "admin@sefi.com"}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3 text-sm p-3 rounded-lg bg-muted/50 border border-border/50">
                <div className="p-2 rounded-md bg-background">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Rol</span>
                  <span className="font-medium">Administrador del Sistema</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3 text-sm p-3 rounded-lg bg-muted/50 border border-border/50">
                <div className="p-2 rounded-md bg-background">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Registro</span>
                  <span className="font-medium">Mayo 2026</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-full md:col-span-2">
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>Tus últimas acciones en el sistema.</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px] flex items-center justify-center border-t border-border/50">
            <div className="flex flex-col items-center gap-4 text-center max-w-xs">
              <div className="p-4 rounded-full bg-muted">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-lg">Sin actividad registrada</p>
                <p className="text-sm text-muted-foreground">Tus acciones recientes aparecerán aquí una vez que comiences a usar el sistema.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
