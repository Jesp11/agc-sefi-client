"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { Save, Users } from "lucide-react";

interface CreateGroupFormProps {
  onSuccess: () => void;
  onClose: () => void;
}

export function CreateGroupForm({ onSuccess, onClose }: CreateGroupFormProps) {
  const [loading, setLoading] = useState(false);
  const [asesores, setAsesores] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    nombre_grupo: "",
    id_asesor: "",
  });

  useEffect(() => {
    const fetchAsesores = async () => {
      try {
        const res = await apiFetch("/asesores");
        const data = await res.json();
        if (res.ok) setAsesores(data.data || data);
      } catch {
        toast.error("Error al cargar asesores");
      }
    };
    fetchAsesores();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre_grupo.trim()) {
      toast.error("El nombre del grupo es obligatorio");
      return;
    }
    if (!formData.id_asesor) {
      toast.error("Debe seleccionar un asesor");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch("/grupos", {
        method: "POST",
        body: JSON.stringify({
          nombre_grupo: formData.nombre_grupo.trim(),
          id_asesor: parseInt(formData.id_asesor),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Grupo "${formData.nombre_grupo}" creado exitosamente`);
        onSuccess();
      } else {
        const firstError = Object.values(data)[0];
        toast.error(Array.isArray(firstError) ? firstError[0] : data.message || "Error al crear grupo");
      }
    } catch {
      toast.error("Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-2">
      <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-lg">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold">Nuevo Grupo de Crédito</p>
          <p className="text-xs text-muted-foreground">Los clientes se pueden agregar después de crear el grupo.</p>
        </div>
      </div>

      <div className="grid gap-2">
        <Label className="text-xs font-bold uppercase text-muted-foreground">Nombre del Grupo</Label>
        <Input
          placeholder="Ej. Mujeres Emprendedoras"
          value={formData.nombre_grupo}
          onChange={(e) => setFormData({ ...formData, nombre_grupo: e.target.value })}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label className="text-xs font-bold uppercase text-muted-foreground">Asesor Responsable</Label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
          value={formData.id_asesor}
          onChange={(e) => setFormData({ ...formData, id_asesor: e.target.value })}
          required
        >
          <option value="">Seleccionar asesor...</option>
          {asesores.map((a: any) => (
            <option key={a.id} value={a.id}>
              {a.nombre_asesor}
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading} className="px-8 font-bold">
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Creando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Crear Grupo
            </span>
          )}
        </Button>
      </div>
    </form>
  );
}
