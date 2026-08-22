"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  User,
  Calendar,
  CreditCard,
  IdCard,
  Phone,
  FileText,
  Pencil,
  Check,
  X,
  Upload,
  Trash2,
  KeyRound,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { creditoSearchFields } from "@/lib/table-utils";
import { fmtFecha } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const STORAGE_BASE = API_BASE.replace("/api", "") + "/storage";

async function patchAsesor(id: string | string[], formData: FormData) {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  formData.append("_method", "PUT");
  return fetch(`${API_BASE}/asesores/${id}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });
}

export default function AsesorDetallePage() {
  const { id } = useParams();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [asesor, setAsesor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const creditosControls = useTableControls();

  const [accesoEmail, setAccesoEmail] = useState("");
  const [accesoPassword, setAccesoPassword] = useState("");
  const [accesoSaving, setAccesoSaving] = useState(false);
  const [passwordTemporal, setPasswordTemporal] = useState<string | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  // telefono edit
  const [editingTel, setEditingTel] = useState(false);
  const [telValue, setTelValue] = useState("");
  const [savingTel, setSavingTel] = useState(false);

  // ine upload
  const [savingIne, setSavingIne] = useState<1 | 2 | null>(null);
  const ine1Ref = useRef<HTMLInputElement>(null);
  const ine2Ref = useRef<HTMLInputElement>(null);

  const fetchAsesor = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/asesores/${id}`);
      const data = await res.json();
      if (res.ok) {
        setAsesor(data);
        setTelValue(data.telefono ?? "");
        setAccesoEmail(data.user?.email ?? "");
      } else {
        toast.error("No se encontró el asesor");
        router.push("/dashboard/asesores");
      }
    } catch {
      toast.error("Error al cargar detalles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAsesor(); }, [id]);

  const handleSaveTel = async () => {
    setSavingTel(true);
    try {
      const fd = new FormData();
      fd.append("telefono", telValue.trim());
      const res = await patchAsesor(String(id), fd);      
      if (res.ok) {
        const data = await res.json();
        setAsesor((prev: any) => ({ ...prev, telefono: data.data?.telefono ?? telValue.trim() }));
        toast.success("Teléfono actualizado");
        setEditingTel(false);
      } else {
        const err = await res.json();
        toast.error(err.message || "Error al guardar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSavingTel(false);
    }
  };

  const handleIneChange = (slot: 1 | 2) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSavingIne(slot);
    try {
      const fd = new FormData();
      fd.append(slot === 1 ? "ine" : "ine_2", file);
      const res = await patchAsesor(String(id), fd);      
      if (res.ok) {
        const data = await res.json();
        setAsesor((prev: any) => ({
          ...prev,
          ine_path:   slot === 1 ? data.data?.ine_path   : prev.ine_path,
          ine_path_2: slot === 2 ? data.data?.ine_path_2 : prev.ine_path_2,
        }));
        toast.success("Documento cargado correctamente");
        const ref = slot === 1 ? ine1Ref : ine2Ref;
        if (ref.current) ref.current.value = "";
      } else {
        const err = await res.json();
        toast.error(err.message || "Error al subir archivo");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSavingIne(null);
    }
  };

  const handleDeleteIne = (slot: 1 | 2) => async () => {
    setSavingIne(slot);
    try {
      const fd = new FormData();
      fd.append(slot === 1 ? "delete_ine" : "delete_ine_2", "1");
      const res = await patchAsesor(String(id), fd);      
      if (res.ok) {
        setAsesor((prev: any) => ({
          ...prev,
          ine_path:   slot === 1 ? null : prev.ine_path,
          ine_path_2: slot === 2 ? null : prev.ine_path_2,
        }));
        toast.success("Documento eliminado");
      } else {
        const err = await res.json();
        toast.error(err.message || "Error al eliminar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSavingIne(null);
    }
  };

  const handleCrearAcceso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accesoEmail.trim()) {
      toast.error("Indica un correo electrónico");
      return;
    }
    setAccesoSaving(true);
    try {
      const body: Record<string, string> = { email: accesoEmail.trim() };
      if (accesoPassword.trim()) body.password = accesoPassword.trim();
      const res = await apiFetch(`/asesores/${id}/acceso`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || "No se pudo crear el acceso");
        return;
      }
      setAsesor((prev: any) => ({ ...prev, user: data.user }));
      setAccesoPassword("");
      if (data.password_temporal) {
        setPasswordTemporal(data.password_temporal);
        setShowPasswordDialog(true);
      }
      toast.success(data.message || "Acceso creado");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setAccesoSaving(false);
    }
  };

  const handleResetPassword = async () => {
    setAccesoSaving(true);
    try {
      const body: Record<string, unknown> = { regenerar_password: true };
      if (accesoEmail.trim() && accesoEmail.trim() !== asesor.user?.email) {
        body.email = accesoEmail.trim();
      }
      if (accesoPassword.trim()) {
        body.password = accesoPassword.trim();
        body.regenerar_password = false;
      }
      const res = await apiFetch(`/asesores/${id}/acceso`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || "No se pudo actualizar el acceso");
        return;
      }
      setAsesor((prev: any) => ({ ...prev, user: data.user }));
      setAccesoEmail(data.user?.email ?? accesoEmail);
      setAccesoPassword("");
      if (data.password_temporal) {
        setPasswordTemporal(data.password_temporal);
        setShowPasswordDialog(true);
      }
      toast.success(data.message || "Acceso actualizado");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setAccesoSaving(false);
    }
  };

  const copyPassword = async () => {
    if (!passwordTemporal) return;
    try {
      await navigator.clipboard.writeText(passwordTemporal);
      toast.success("Contraseña copiada");
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  if (loading) return <div className="p-8 text-center">Cargando perfil del asesor...</div>;
  if (!asesor) return null;

  const creditosList = asesor.creditos || [];
  const creditosFiltered = filterBySearch(creditosList, creditosControls.search, creditoSearchFields);
  const creditosPaginated = paginateItems(creditosFiltered, creditosControls.page);
  const tieneAcceso = Boolean(asesor.user?.email);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{asesor.nombre_asesor}</h1>
          <p className="text-muted-foreground font-mono text-sm">{asesor.id_asesor ?? `#${asesor.id}`}</p>
        </div>
        {tieneAcceso ? (
          <Badge className="ml-auto bg-emerald-50 text-emerald-700 border-emerald-200">Con acceso</Badge>
        ) : (
          <Badge variant="secondary" className="ml-auto">Sin acceso</Badge>
        )}
      </div>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contraseña temporal</DialogTitle>
            <DialogDescription>
              Guárdala ahora: no se volverá a mostrar. Entrégala al asesor para que inicie sesión.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/40 px-3 py-2 font-mono text-sm break-all">
              {passwordTemporal}
            </div>
            <div className="text-xs text-muted-foreground">
              Correo: <span className="font-medium text-foreground">{asesor.user?.email ?? accesoEmail}</span>
            </div>
            <Button type="button" variant="outline" className="w-full" onClick={copyPassword}>
              <Copy className="mr-2 h-4 w-4" />
              Copiar contraseña
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="h-5 w-5 text-primary" />
              Acceso al sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {tieneAcceso
                ? "Este asesor ya puede iniciar sesión. Puedes cambiar el correo o generar una contraseña temporal nueva."
                : "Crea un correo y una contraseña temporal para que el asesor entre al sistema."}
            </p>
            <form
              onSubmit={tieneAcceso ? (e) => { e.preventDefault(); handleResetPassword(); } : handleCrearAcceso}
              className="grid gap-4 sm:grid-cols-2"
            >
              <div className="grid gap-2">
                <label htmlFor="acceso-email" className="text-sm font-medium">Correo electrónico</label>
                <Input
                  id="acceso-email"
                  type="email"
                  placeholder="asesor@ejemplo.com"
                  value={accesoEmail}
                  onChange={(e) => setAccesoEmail(e.target.value)}
                  disabled={accesoSaving}
                  required
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="acceso-password" className="text-sm font-medium">
                  Contraseña temporal{" "}
                  <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <Input
                  id="acceso-password"
                  type="text"
                  placeholder="Se genera automáticamente si se deja vacío"
                  value={accesoPassword}
                  onChange={(e) => setAccesoPassword(e.target.value)}
                  disabled={accesoSaving}
                  minLength={6}
                />
              </div>
              <div className="sm:col-span-2 flex flex-wrap gap-2">
                {tieneAcceso ? (
                  <>
                    <Button type="submit" disabled={accesoSaving}>
                      {accesoSaving ? "Guardando..." : "Restablecer contraseña temporal"}
                    </Button>
                    {accesoEmail.trim() && accesoEmail.trim() !== asesor.user?.email && (
                      <p className="text-xs text-muted-foreground self-center">
                        También se actualizará el correo.
                      </p>
                    )}
                  </>
                ) : (
                  <Button type="submit" disabled={accesoSaving}>
                    {accesoSaving ? "Creando..." : "Crear acceso"}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Información Personal */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              Información Personal
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground font-medium">ID Asesor</span>
              <span className="font-mono font-bold text-primary">{asesor.id_asesor ?? `#${asesor.id}`}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground font-medium">CURP</span>
              <span className="flex items-center gap-2">
                <IdCard className="h-3 w-3 shrink-0" />
                <span className="font-mono">{asesor.curp ?? "—"}</span>
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground font-medium">Cumpleaños</span>
              <span className="flex items-center gap-2">
                <Calendar className="h-3 w-3 shrink-0" />
                {asesor.cumpleanos ? fmtFecha(asesor.cumpleanos) : "—"}
              </span>
            </div>

            {/* Teléfono — edición inline */}
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground font-medium">Teléfono</span>
              {editingTel ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="tel"
                    value={telValue}
                    onChange={(e) => setTelValue(e.target.value)}
                    maxLength={20}
                    className="h-7 text-sm"
                    autoFocus
                    disabled={savingTel}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveTel();
                      if (e.key === "Escape") { setEditingTel(false); setTelValue(asesor.telefono ?? ""); }
                    }}
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:text-green-700" onClick={handleSaveTel} disabled={savingTel}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => { setEditingTel(false); setTelValue(asesor.telefono ?? ""); }} disabled={savingTel}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span>{asesor.telefono || <span className="text-muted-foreground italic">Sin registro</span>}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground ml-auto" onClick={() => setEditingTel(true)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* INE — Frontal y Reverso */}
            <div className="flex flex-col gap-2">
              <span className="text-muted-foreground font-medium">INE</span>
              {(["Frontal", "Reverso"] as const).map((label, idx) => {
                const slot = (idx + 1) as 1 | 2;
                const path = slot === 1 ? asesor.ine_path : asesor.ine_path_2;
                const ref  = slot === 1 ? ine1Ref : ine2Ref;
                const busy = savingIne === slot;
                return (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    {path ? (
                      <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
                        <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                        <a
                          href={`${STORAGE_BASE}/${path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary underline underline-offset-2 hover:opacity-80 truncate flex-1"
                        >
                          Ver {label.toLowerCase()}
                        </a>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive hover:text-destructive/80 shrink-0"
                          onClick={handleDeleteIne(slot)}
                          disabled={busy || savingIne !== null}
                          title={`Eliminar ${label.toLowerCase()}`}
                        >
                          {busy ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Trash2 className="h-3 w-3" />}
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => ref.current?.click()}
                        disabled={busy || savingIne !== null}
                        className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 p-2.5 text-xs text-muted-foreground hover:border-primary/60 hover:bg-muted/30 hover:text-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none"
                      >
                        {busy ? (
                          <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> Subiendo...</>
                        ) : (
                          <><Upload className="h-3.5 w-3.5" /> Cargar {label.toLowerCase()}</>
                        )}
                      </button>
                    )}
                    <input ref={ref} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={handleIneChange(slot)} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Préstamos Asignados */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5 text-primary" />
              Préstamos Asignados
              <Badge variant="secondary" className="ml-auto">
                {asesor.creditos?.length ?? 0}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <TableSearch placeholder="Buscar préstamos..." value={creditosControls.search} onChange={creditosControls.handleSearch} />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Préstamo</TableHead>
                  <TableHead>Ciclo</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creditosFiltered.length > 0 ? (
                  creditosPaginated.map((c: any, i: number) => (
                    <TableRow key={c.id_credito ?? c.id ?? i}>
                      <TableCell className="font-mono text-xs">{c.id_credito ?? c.id}</TableCell>
                      <TableCell>{c.ciclo}</TableCell>
                      <TableCell>${c.monto_otorgado}</TableCell>
                      <TableCell>${c.total}</TableCell>
                      <TableCell>
                        <Badge variant={c.estado === "activo" ? "default" : "secondary"}>
                          {c.estado ?? "—"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {creditosControls.search ? "No se encontraron préstamos." : "Sin préstamos asignados"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {creditosFiltered.length > 0 && (
              <TablePagination page={creditosControls.page} totalItems={creditosFiltered.length} pageSize={PAGE_SIZE} onPageChange={creditosControls.setPage} label="préstamos" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
