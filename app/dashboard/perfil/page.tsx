"use client";

import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Mail, Shield, Calendar, IdCard } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

function formatFecha(fecha: string) {
  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  const [y, m, d] = fecha.split("-");
  return `${parseInt(d, 10)} de ${meses[parseInt(m, 10) - 1]} de ${y}`;
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [curpInput, setCurpInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingCurp, setEditingCurp] = useState(false);

  const handleSaveCurp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (curpInput.length !== 18) {
      toast.error("La CURP debe tener exactamente 18 caracteres");
      return;
    }
    setIsSaving(true);
    try {
      const res = await apiFetch("/auth/profile", {
        method: "PUT",
        body: JSON.stringify({ curp: curpInput.toUpperCase() }),
      });
      if (res.ok) {
        toast.success("Perfil actualizado");
        setEditingCurp(false);
        setCurpInput("");
        await refreshUser();
      } else {
        const data = await res.json();
        const msg = data.errors?.curp?.[0] || data.message || "Error al actualizar";
        toast.error(msg);
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setIsSaving(false);
    }
  };

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
                  <IdCard className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">CURP</span>
                  {user?.curp ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-medium truncate">{user.curp}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs shrink-0"
                        onClick={() => { setEditingCurp(true); setCurpInput(user.curp ?? ""); }}
                      >
                        Editar
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs text-muted-foreground justify-start"
                      onClick={() => setEditingCurp(true)}
                    >
                      + Agregar CURP
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm p-3 rounded-lg bg-muted/50 border border-border/50">
                <div className="p-2 rounded-md bg-background">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Cumpleaños</span>
                  <span className="font-medium">
                    {user?.cumpleanos ? formatFecha(user.cumpleanos) : "—"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {editingCurp && (
          <Card className="col-span-full md:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Actualizar CURP</CardTitle>
              <CardDescription>El cumpleaños se extrae automáticamente de tu CURP.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveCurp} className="grid gap-4">
                <div className="grid gap-2">
                  <label htmlFor="curp-input" className="text-sm font-medium">CURP</label>
                  <Input
                    id="curp-input"
                    placeholder="18 caracteres"
                    value={curpInput}
                    onChange={(e) => setCurpInput(e.target.value.toUpperCase())}
                    maxLength={18}
                    className="font-mono uppercase"
                    disabled={isSaving}
                  />
                  <p className="text-xs text-muted-foreground">{curpInput.length}/18</p>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={isSaving}>
                    {isSaving ? "Guardando..." : "Guardar"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isSaving}
                    onClick={() => { setEditingCurp(false); setCurpInput(""); }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

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
