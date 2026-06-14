"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { fmtFecha } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusCircle, Upload } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { toast } from "sonner";


export default function AsesoresPage() {
  const router = useRouter();
  const [asesores, setAsesores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [nombreAsesor, setNombreAsesor] = useState("");
  const [curp, setCurp] = useState("");
  const [telefono, setTelefono] = useState("");
  const [ineFile, setIneFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAsesores = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/asesores");
      const data = await res.json();
      if (res.ok) {
        setAsesores(data.data || data);
      }
    } catch {
      toast.error("Error al cargar asesores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAsesores();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreAsesor.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    if (curp.trim().length !== 18) {
      toast.error("La CURP debe tener exactamente 18 caracteres");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      const formData = new FormData();
      formData.append("nombre_asesor", nombreAsesor);
      formData.append("curp", curp.toUpperCase());
      if (telefono.trim()) formData.append("telefono", telefono.trim());
      if (ineFile) formData.append("ine", ineFile);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/asesores`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (res.ok) {
        toast.success("Asesor creado exitosamente");
        setNombreAsesor("");
        setCurp("");
        setTelefono("");
        setIneFile(null);
        setIsOpen(false);
        fetchAsesores();
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || "Error al crear asesor");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground/90">Asesores</h1>
        <p className="text-muted-foreground">Gestión de asesores de préstamo registrados en el sistema.</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Buscar asesores..."
            className="bg-background border-muted-foreground/20 focus-visible:ring-primary/30 h-10"
          />
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger
            render={
              <Button size="sm" className="h-10 px-4">
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Asesor
              </Button>
            }
          />
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Crear Asesor</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="nombre" className="text-sm font-medium">Nombre Completo</label>
                <Input
                  id="nombre"
                  placeholder="Ej. Carlos López"
                  value={nombreAsesor}
                  onChange={(e) => setNombreAsesor(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="curp" className="text-sm font-medium">CURP</label>
                <Input
                  id="curp"
                  placeholder="18 caracteres"
                  value={curp}
                  onChange={(e) => setCurp(e.target.value.toUpperCase())}
                  maxLength={18}
                  disabled={isSubmitting}
                  className="font-mono uppercase"
                />
                <p className="text-xs text-muted-foreground">
                  {curp.length}/18 — El cumpleaños se extrae automáticamente.
                </p>
              </div>
              <div className="grid gap-2">
                <label htmlFor="telefono" className="text-sm font-medium">Teléfono <span className="text-muted-foreground font-normal">(opcional)</span></label>
                <Input
                  id="telefono"
                  type="tel"
                  placeholder="Ej. 5512345678"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  maxLength={20}
                  disabled={isSubmitting}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="ine" className="text-sm font-medium">INE <span className="text-muted-foreground font-normal">(opcional — JPG, PNG o PDF, máx. 5 MB)</span></label>
                <label
                  htmlFor="ine"
                  className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 cursor-pointer transition-colors ${isSubmitting ? "opacity-50 pointer-events-none" : "hover:border-primary/60 hover:bg-muted/30"} ${ineFile ? "border-primary/40 bg-primary/5" : "border-muted-foreground/30"}`}
                >
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground text-center">
                    {ineFile ? ineFile.name : "Haz clic o arrastra el archivo aquí"}
                  </span>
                  <input
                    id="ine"
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    className="hidden"
                    disabled={isSubmitting}
                    onChange={(e) => setIneFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Asesor</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>CURP</TableHead>
              <TableHead>Dado de alta</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow key="loading">
                <TableCell colSpan={5} className="h-24 text-center">
                  Cargando asesores...
                </TableCell>
              </TableRow>
            ) : asesores.length === 0 ? (
              <TableRow key="empty">
                <TableCell colSpan={5} className="h-24 text-center">
                  No hay asesores registrados.
                </TableCell>
              </TableRow>
            ) : (
              asesores.map((asesor: any) => (
                <TableRow key={asesor.id}>
                  <TableCell className="font-mono text-xs">{asesor.id_asesor ?? asesor.id}</TableCell>
                  <TableCell className="font-medium">{asesor.nombre_asesor}</TableCell>
                  <TableCell className="font-mono text-xs">{asesor.curp ?? "—"}</TableCell>
                  <TableCell className="text-sm">{asesor.created_at ? fmtFecha(asesor.created_at.split("T")[0]) : "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/dashboard/asesores/${asesor.id}`)}
                    >
                      Ver perfil
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
