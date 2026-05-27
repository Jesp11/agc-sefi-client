"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const GREEN = "oklch(0.40 0.07 168)";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        await login(data.access_token);
        toast.success("Bienvenido");
      } else {
        toast.error(data.error || "Credenciales inválidas");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <div className="flex w-full max-w-5xl min-h-[580px] overflow-hidden rounded-2xl border bg-card shadow-sm">

        {/* Formulario */}
        <div className="flex w-full flex-col justify-center px-12 py-10 lg:w-1/2">
          <div className="mb-1 h-1 w-8 rounded-full" style={{ backgroundColor: GREEN }} />
          <h1 className="mt-4 text-2xl font-bold text-foreground">Sistema Financiero AGC</h1>
          <p className="mt-1 mb-8 text-sm text-muted-foreground">
            Ingresa tus credenciales para acceder
          </p>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@sefi.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              className="w-full mt-2 text-white"
              type="submit"
              disabled={loading}
              style={{ backgroundColor: GREEN }}
            >
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
          </form>
        </div>

        {/* Imagen */}
        <div
          className="hidden lg:flex lg:w-1/2 items-center justify-center"
          style={{ backgroundColor: GREEN }}
        >
          <Image
            src="/logo.png"
            alt="SEFI"
            width={520}
            height={520}
            className="brightness-0 invert"
          />
        </div>

      </div>
    </div>
  );
}
