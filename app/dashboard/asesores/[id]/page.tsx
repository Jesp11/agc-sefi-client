"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
  Trash2, Wallet, Percent, Car, TrendingUp, Building2,
  KeyRound,
  Copy,
  Download,
  Loader2,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { creditoSearchFields } from "@/lib/table-utils";
import { fmtFecha, extractBirthdateFromCurp, fmtTelefono } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

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
  const [creditoEstadoFilter, setCreditoEstadoFilter] = useState<"todos" | "activo" | "mora" | "finalizado">("todos");

  // edit dialogs (separados para personal y nómina)
  const [showEditPersonalDialog, setShowEditPersonalDialog] = useState(false);
  const [savingEditPersonal, setSavingEditPersonal] = useState(false);
  const [showEditNominaDialog, setShowEditNominaDialog] = useState(false);
  const [savingEditNomina, setSavingEditNomina] = useState(false);

  const [editNombre, setEditNombre] = useState("");
  const [editCurp, setEditCurp] = useState("");
  const [editTelefono, setEditTelefono] = useState("");
  const [editRolLaboral, setEditRolLaboral] = useState("Gestor de Cobranza");

  const [editSueldoBase, setEditSueldoBase] = useState<string>("");
  const [editDespensa, setEditDespensa] = useState<string>("");
  const [editApoyoTransporte, setEditApoyoTransporte] = useState<string>("");
  const [editRfc, setEditRfc] = useState("");
  const [editNss, setEditNss] = useState("");
  const [editBanco, setEditBanco] = useState("");
  const [editCuentaBancaria, setEditCuentaBancaria] = useState("");

  const [accesoEmail, setAccesoEmail] = useState("");
  const [accesoPassword, setAccesoPassword] = useState("");
  const [accesoSaving, setAccesoSaving] = useState(false);
  const [showAccesoModal, setShowAccesoModal] = useState(false);
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

  // ine preview modal
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"image" | "pdf">("image");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewFilename, setPreviewFilename] = useState("");

  const handleVerIne = async (slot: 1 | 2, label: string) => {
    setPreviewTitle(`INE (${label}) — ${asesor?.nombre_asesor || ""}`);
    setPreviewFilename(`INE_${label}_${asesor?.nombre_asesor || id}.jpg`);
    setPreviewLoading(true);
    setPreviewOpen(true);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    try {
      const res = await apiFetch(`/asesores/${id}/ine/${slot}`, {
        headers: { Accept: "*/*" },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || "No se pudo cargar el archivo");
        setPreviewOpen(false);
        return;
      }

      const contentType = res.headers.get("content-type") || "";
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      setPreviewUrl(objectUrl);
      if (contentType.toLowerCase().includes("pdf")) {
        setPreviewType("pdf");
      } else {
        setPreviewType("image");
      }
    } catch {
      toast.error("Error al obtener el documento del servidor");
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = (open: boolean) => {
    setPreviewOpen(open);
    if (!open && previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

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
        toast.error("No se encontró el empleado");
        router.push("/dashboard/empleados");
      }
    } catch {
      toast.error("Error al cargar detalles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAsesor(); }, [id]);

  const handleOpenEditPersonal = () => {
    if (!asesor) return;
    setEditNombre(asesor.nombre_asesor ?? "");
    setEditCurp(asesor.curp ?? "");
    setEditTelefono(asesor.telefono ?? "");
    setEditRolLaboral(asesor.rol_laboral ?? "Gestor de Cobranza");
    setShowEditPersonalDialog(true);
  };

  const handleSaveEditPersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNombre.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    if (editCurp.trim().length !== 18) {
      toast.error("La CURP debe tener exactamente 18 caracteres");
      return;
    }

    setSavingEditPersonal(true);
    try {
      const res = await apiFetch(`/asesores/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          nombre_asesor: editNombre.trim(),
          curp: editCurp.trim().toUpperCase(),
          telefono: editTelefono.trim() || null,
          rol_laboral: editRolLaboral,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Información personal actualizada exitosamente");
        const updated = data.data ?? {};
        setAsesor((prev: any) => ({
          ...prev,
          ...updated,
          nombre_asesor: updated.nombre_asesor ?? editNombre.trim(),
          curp: updated.curp ?? editCurp.trim().toUpperCase(),
          telefono: updated.telefono ?? editTelefono.trim(),
          rol_laboral: updated.rol_laboral ?? editRolLaboral,
        }));
        setTelValue(editTelefono.trim());
        setShowEditPersonalDialog(false);
      } else {
        const errorMsg =
          data.errors?.curp?.[0] ||
          data.errors?.nombre_asesor?.[0] ||
          data.message ||
          "Error al actualizar información personal";
        toast.error(errorMsg);
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSavingEditPersonal(false);
    }
  };

  const handleOpenEditNomina = () => {
    if (!asesor) return;
    setEditSueldoBase(asesor.sueldo_base != null && Number(asesor.sueldo_base) > 0 ? String(asesor.sueldo_base) : "");
    setEditDespensa(asesor.despensa != null && Number(asesor.despensa) > 0 ? String(asesor.despensa) : "");
    setEditApoyoTransporte(asesor.apoyo_transporte != null && Number(asesor.apoyo_transporte) > 0 ? String(asesor.apoyo_transporte) : "");
    setEditRfc(asesor.rfc ?? "");
    setEditNss(asesor.nss ?? "");
    setEditBanco(asesor.banco ?? "");
    setEditCuentaBancaria(asesor.cuenta_bancaria ?? "");
    setShowEditNominaDialog(true);
  };

  const handleSaveEditNomina = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEditNomina(true);
    const sBase = editSueldoBase === "" ? 0 : parseFloat(editSueldoBase) || 0;
    const sDesp = editDespensa === "" ? 0 : parseFloat(editDespensa) || 0;
    const sTrans = editApoyoTransporte === "" ? 0 : parseFloat(editApoyoTransporte) || 0;

    try {
      const res = await apiFetch(`/asesores/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          rfc: editRfc.trim().toUpperCase() || null,
          nss: editNss.trim() || null,
          banco: editBanco.trim() || null,
          cuenta_bancaria: editCuentaBancaria.trim() || null,
          sueldo_base: sBase,
          despensa: sDesp,
          apoyo_transporte: sTrans,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Datos de nómina actualizados exitosamente");
        const updated = data.data ?? {};
        setAsesor((prev: any) => ({
          ...prev,
          ...updated,
          rfc: updated.rfc ?? (editRfc.trim().toUpperCase() || null),
          nss: updated.nss ?? (editNss.trim() || null),
          banco: updated.banco ?? (editBanco.trim() || null),
          cuenta_bancaria: updated.cuenta_bancaria ?? (editCuentaBancaria.trim() || null),
          sueldo_base: updated.sueldo_base ?? sBase,
          despensa: updated.despensa ?? sDesp,
          apoyo_transporte: updated.apoyo_transporte ?? sTrans,
        }));
        setShowEditNominaDialog(false);
      } else {
        const errorMsg =
          data.errors?.rfc?.[0] ||
          data.errors?.nss?.[0] ||
          data.message ||
          "Error al actualizar datos de nómina";
        toast.error(errorMsg);
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSavingEditNomina(false);
    }
  };

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

  if (loading) return <div className="p-8 text-center">Cargando perfil del empleado...</div>;
  if (!asesor) return null;

  const getEstadoRank = (estado?: string): number => {
    if (!estado) return 99;
    const lower = estado.toLowerCase().trim();
    if (lower === "activo") return 1;
    if (lower === "enmora" || lower === "mora" || lower === "en mora") return 2;
    if (lower === "cerrado" || lower === "finalizado" || lower === "liquidado" || lower === "inactivo") return 3;
    return 4;
  };

  const normalizeEstado = (estado?: string): "activo" | "mora" | "finalizado" | "otro" => {
    if (!estado) return "otro";
    const lower = estado.toLowerCase().trim();
    if (lower === "activo") return "activo";
    if (lower === "enmora" || lower === "mora" || lower === "en mora") return "mora";
    if (lower === "cerrado" || lower === "finalizado" || lower === "liquidado" || lower === "inactivo") return "finalizado";
    return "otro";
  };

  const rawCreditos: any[] = asesor.creditos || [];
  const totalCreditosCount = rawCreditos.length;
  const activosCreditosCount = rawCreditos.filter((c) => normalizeEstado(c.estado) === "activo").length;
  const moraCreditosCount = rawCreditos.filter((c) => normalizeEstado(c.estado) === "mora").length;
  const finalizadosCreditosCount = rawCreditos.filter((c) => normalizeEstado(c.estado) === "finalizado").length;

  const creditosByEstado = rawCreditos.filter((c) => {
    if (creditoEstadoFilter === "todos") return true;
    return normalizeEstado(c.estado) === creditoEstadoFilter;
  });

  // Ordenar: 1) Activos, 2) Mora, 3) Finalizados / Cerrados
  const sortedCreditos = [...creditosByEstado].sort((a, b) => {
    const rankA = getEstadoRank(a.estado);
    const rankB = getEstadoRank(b.estado);
    if (rankA !== rankB) return rankA - rankB;
    return Number(b.num_prog || b.id || 0) - Number(a.num_prog || a.id || 0);
  });

  const creditosFiltered = filterBySearch(sortedCreditos, creditosControls.search, (c: any) => [
    ...creditoSearchFields(c),
    c.id,
    c.monto_otorgado,
    c.total,
    c.estado,
  ]);
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
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <p className="text-muted-foreground font-mono">{asesor.id_asesor ?? `#${asesor.id}`}</p>
            <Badge variant="outline">{asesor.rol_laboral ?? "Gestor de Cobranza"}</Badge>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleOpenEditPersonal}>
            <Pencil className="h-4 w-4 mr-1.5" />
            Editar Datos
          </Button>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setShowAccesoModal(true)}>
              <KeyRound className="h-4 w-4 mr-1.5" />
              {tieneAcceso ? "Gestionar Acceso" : "Crear Acceso"}
            </Button>
          )}
          {tieneAcceso ? (
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Con acceso</Badge>
          ) : (
            <Badge variant="secondary">Sin acceso</Badge>
          )}
        </div>
      </div>

      {/* Modal para crear o modificar acceso al sistema */}
      {isAdmin && (
        <Dialog open={showAccesoModal} onOpenChange={setShowAccesoModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                {tieneAcceso ? "Modificar Acceso al Sistema" : "Crear Acceso al Sistema"}
              </DialogTitle>
              <DialogDescription>
                {tieneAcceso
                  ? "Modifica el correo de acceso o genera una nueva contraseña temporal."
                  : "Crea credenciales de inicio de sesión para este empleado."}
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={async (e) => {
                if (tieneAcceso) {
                  e.preventDefault();
                  await handleResetPassword();
                } else {
                  await handleCrearAcceso(e);
                }
                setShowAccesoModal(false);
              }}
              className="grid gap-4 py-2"
            >
              <div className="grid gap-2">
                <label htmlFor="modal-acceso-email" className="text-sm font-medium">Correo electrónico</label>
                <Input
                  id="modal-acceso-email"
                  type="email"
                  placeholder="empleado@ejemplo.com"
                  value={accesoEmail}
                  onChange={(e) => setAccesoEmail(e.target.value)}
                  disabled={accesoSaving}
                  required
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="modal-acceso-password" className="text-sm font-medium">
                  Contraseña temporal{" "}
                  <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <Input
                  id="modal-acceso-password"
                  type="text"
                  placeholder="Se genera automáticamente si se deja vacío"
                  value={accesoPassword}
                  onChange={(e) => setAccesoPassword(e.target.value)}
                  disabled={accesoSaving}
                  minLength={6}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowAccesoModal(false)} disabled={accesoSaving}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={accesoSaving}>
                  {accesoSaving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                  {tieneAcceso ? "Guardar y Restablecer" : "Crear Acceso"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contraseña temporal</DialogTitle>
            <DialogDescription>
              Guárdala ahora: no se volverá a mostrar. Entrégala al empleado para que inicie sesión.
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

      {/* Modal para editar Información Personal */}
      <Dialog open={showEditPersonalDialog} onOpenChange={setShowEditPersonalDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Información Personal</DialogTitle>
            <DialogDescription>
              Modifica los datos generales y el rol operativo del empleado.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEditPersonal} className="grid gap-4 py-2">
            <div className="grid gap-2">
              <label htmlFor="edit-nombre" className="text-sm font-medium">Nombre Completo</label>
              <Input
                id="edit-nombre"
                placeholder="Ej. Carlos López"
                value={editNombre}
                onChange={(e) => setEditNombre(e.target.value)}
                disabled={savingEditPersonal}
                required
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="edit-curp" className="text-sm font-medium">CURP</label>
              <Input
                id="edit-curp"
                placeholder="18 caracteres"
                value={editCurp}
                onChange={(e) => setEditCurp(e.target.value.toUpperCase())}
                maxLength={18}
                disabled={savingEditPersonal}
                className="font-mono uppercase"
                required
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{editCurp.length}/18 caracteres</span>
                {extractBirthdateFromCurp(editCurp) && (
                  <span className="text-primary font-medium">
                    Fecha de nacimiento: {fmtFecha(extractBirthdateFromCurp(editCurp))}
                  </span>
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <label htmlFor="edit-telefono" className="text-sm font-medium">
                Teléfono <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <Input
                id="edit-telefono"
                type="tel"
                placeholder="Ej. 5512345678"
                value={editTelefono}
                onChange={(e) => setEditTelefono(e.target.value)}
                maxLength={20}
                disabled={savingEditPersonal}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="edit-rol-laboral" className="text-sm font-medium">Rol</label>
              <select
                id="edit-rol-laboral"
                value={editRolLaboral}
                onChange={(e) => setEditRolLaboral(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                disabled={savingEditPersonal}
              >
                <option value="Gestor de Cobranza">Gestor de Cobranza (GC)</option>
                <option value="Asesor Financiero">Asesor Financiero (AF)</option>
                <option value="Administrador">Administrador (AD)</option>
                <option value="Gerencia">Gerencia (GE)</option>
                <option value="Contabilidad">Contabilidad (CO)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t mt-2">
              <Button type="button" variant="outline" onClick={() => setShowEditPersonalDialog(false)} disabled={savingEditPersonal}>
                Cancelar
              </Button>
              <Button type="submit" disabled={savingEditPersonal}>
                {savingEditPersonal ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal para editar Datos de Nómina y Fiscales */}
      <Dialog open={showEditNominaDialog} onOpenChange={setShowEditNominaDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Datos de Nómina y Fiscales</DialogTitle>
            <DialogDescription>
              Configura los datos fiscales, bancarios y las percepciones fijas de nómina.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEditNomina} className="grid gap-4 py-2">
            <div>
              <h4 className="text-sm font-semibold text-primary mb-3">Datos Fiscales y Bancarios</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label htmlFor="edit-rfc" className="text-xs font-medium">RFC</label>
                  <Input
                    id="edit-rfc"
                    placeholder="RFC (13 caracteres)"
                    value={editRfc}
                    onChange={e => setEditRfc(e.target.value.toUpperCase())}
                    maxLength={13}
                    className="font-mono uppercase"
                    disabled={savingEditNomina}
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="edit-nss" className="text-xs font-medium">NSS (Seguro Social)</label>
                  <Input
                    id="edit-nss"
                    placeholder="Número de Seguro Social"
                    value={editNss}
                    onChange={e => setEditNss(e.target.value)}
                    maxLength={20}
                    className="font-mono"
                    disabled={savingEditNomina}
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="edit-banco" className="text-xs font-medium">Banco</label>
                  <Input
                    id="edit-banco"
                    placeholder="Ej. BBVA, BANORTE"
                    value={editBanco}
                    onChange={e => setEditBanco(e.target.value)}
                    disabled={savingEditNomina}
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="edit-cuenta-bancaria" className="text-xs font-medium">Cuenta Banco / CLABE</label>
                  <Input
                    id="edit-cuenta-bancaria"
                    placeholder="Cuenta o CLABE"
                    value={editCuentaBancaria}
                    onChange={e => setEditCuentaBancaria(e.target.value)}
                    className="font-mono"
                    disabled={savingEditNomina}
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-3 mt-1">
              <h4 className="text-sm font-semibold text-primary mb-3">Percepciones de Nómina</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-2">
                  <label className="text-xs font-medium">Sueldo Base ($)</label>
                  <Input type="number" min="0" step="0.01" value={editSueldoBase} onChange={e => setEditSueldoBase(e.target.value)} disabled={savingEditNomina} />
                </div>
                <div className="grid gap-2">
                  <label className="text-xs font-medium">Despensa ($)</label>
                  <Input type="number" min="0" step="0.01" value={editDespensa} onChange={e => setEditDespensa(e.target.value)} disabled={savingEditNomina} />
                </div>
                <div className="grid gap-2">
                  <label className="text-xs font-medium">Transporte ($)</label>
                  <Input type="number" min="0" step="0.01" value={editApoyoTransporte} onChange={e => setEditApoyoTransporte(e.target.value)} disabled={savingEditNomina} />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t mt-2">
              <Button type="button" variant="outline" onClick={() => setShowEditNominaDialog(false)} disabled={savingEditNomina}>
                Cancelar
              </Button>
              <Button type="submit" disabled={savingEditNomina}>
                {savingEditNomina ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal visor de INE */}
      <Dialog open={previewOpen} onOpenChange={handleClosePreview}>
        <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <DialogTitle className="text-lg font-semibold">{previewTitle}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Documento de identificación oficial
              </DialogDescription>
            </div>
            {previewUrl && (
              <div className="flex items-center gap-2">
                <a
                  href={previewUrl}
                  download={previewFilename}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border rounded-md px-3 py-1.5 transition-colors bg-background shadow-xs hover:bg-accent"
                >
                  <Download className="h-3.5 w-3.5" />
                  Descargar
                </a>
              </div>
            )}
          </DialogHeader>

          <div className="flex-1 flex items-center justify-center min-h-[300px] max-h-[72vh] overflow-auto rounded-lg border bg-muted/20 p-2">
            {previewLoading ? (
              <div className="flex flex-col items-center gap-2 text-muted-foreground text-sm py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span>Cargando documento...</span>
              </div>
            ) : previewUrl ? (
              previewType === "pdf" ? (
                <iframe
                  src={previewUrl}
                  title={previewTitle}
                  className="w-full h-[68vh] rounded-md border-0"
                />
              ) : (
                <img
                  src={previewUrl}
                  alt={previewTitle}
                  className="max-h-[68vh] w-auto max-w-full object-contain rounded-md shadow-xs"
                />
              )
            ) : (
              <p className="text-sm text-muted-foreground py-12">No se pudo mostrar el archivo.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Información Personal */}
        <Card className="md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              Información Personal
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={handleOpenEditPersonal}>
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Editar
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground font-medium">Nombre Completo</span>
              <span className="font-medium text-foreground">{asesor.nombre_asesor}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground font-medium">Clave</span>
              <span className="font-mono font-bold text-primary">{asesor.id_asesor ?? `#${asesor.id}`}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground font-medium">Rol</span>
              <span>{asesor.rol_laboral ?? "Gestor de Cobranza"}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground font-medium">CURP</span>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <IdCard className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="font-mono">{asesor.curp ?? "—"}</span>
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={handleOpenEditPersonal}
                  title="Editar Información"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            </div>



            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground font-medium">Fecha de Nacimiento / Cumpleaños</span>
              <span className="flex items-center gap-2">
                <Calendar className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span>{asesor.cumpleanos ? fmtFecha(asesor.cumpleanos) : "—"}</span>
                <span className="text-[11px] text-muted-foreground">(de la CURP)</span>
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
                  <span>{asesor.telefono ? fmtTelefono(asesor.telefono) : <span className="text-muted-foreground italic">Sin registro</span>}</span>
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
                        <button
                          type="button"
                          onClick={() => handleVerIne(slot, label)}
                          className="text-xs text-primary underline underline-offset-2 hover:opacity-80 truncate flex-1 text-left cursor-pointer"
                        >
                          Ver {label.toLowerCase()}
                        </button>
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

        {/* Pestañas: Préstamos Asignados y Datos Nómina */}
        <div className="md:col-span-2">
          <Tabs defaultValue="prestamos" className="space-y-4">
            <TabsList className="grid grid-cols-2 w-full max-w-md h-10">
              <TabsTrigger value="prestamos" className="text-xs sm:text-sm font-medium">
                <CreditCard className="h-4 w-4 mr-2 text-primary" />
                Préstamos Asignados
                <Badge variant="secondary" className="ml-2 font-semibold">
                  {totalCreditosCount}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="nomina" className="text-xs sm:text-sm font-medium">
                <Wallet className="h-4 w-4 mr-2 text-emerald-600" />
                Datos Nómina
              </TabsTrigger>
            </TabsList>

            <TabsContent value="prestamos" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <CreditCard className="h-5 w-5 text-primary" />
                      Préstamos Asignados
                    </CardTitle>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Total:</span>
                      <Badge variant="secondary" className="font-semibold">
                        {totalCreditosCount}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Status Filters */}
                  <div className="flex flex-wrap items-center gap-1.5 border-b pb-3 text-xs">
                    <span className="text-muted-foreground mr-1 font-medium hidden sm:inline">Filtrar:</span>
                    {[
                      { id: "todos", label: "Todos", count: totalCreditosCount, badgeColor: "bg-gray-100 text-gray-700" },
                      { id: "activo", label: "Activos", count: activosCreditosCount, badgeColor: "bg-emerald-100 text-emerald-800" },
                      { id: "mora", label: "En Mora", count: moraCreditosCount, badgeColor: "bg-rose-100 text-rose-800" },
                      { id: "finalizado", label: "Finalizados / Cerrados", count: finalizadosCreditosCount, badgeColor: "bg-gray-100 text-gray-700" },
                    ].map((f) => {
                      const isActive = creditoEstadoFilter === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            setCreditoEstadoFilter(f.id as any);
                            creditosControls.setPage(1);
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                            isActive
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <span>{f.label}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                              isActive ? "bg-white/20 text-white" : f.badgeColor
                            }`}
                          >
                            {f.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <TableSearch placeholder="Buscar por titular, folio o monto..." value={creditosControls.search} onChange={creditosControls.handleSearch} />

                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Folio</TableHead>
                          <TableHead>Titular / Acreditado</TableHead>
                          <TableHead>Tipo / Ciclo</TableHead>
                          <TableHead>Monto</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acción</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {creditosFiltered.length > 0 ? (
                          creditosPaginated.map((c: any, i: number) => {
                            const normEstado = normalizeEstado(c.estado);
                            const titular =
                              c.cliente?.nombre_completo ||
                              c.grupo?.nombre_grupo ||
                              (c.id_cliente ? `Cliente #${c.id_cliente}` : c.id_grupo ? `Grupo #${c.id_grupo}` : "—");
                            const tipo = c.tipo_credito || (c.id_grupo ? "Grupal" : "Individual");
                            const folio = c.num_prog || c.id_credito || c.id;

                            return (
                              <TableRow key={folio ?? i} className="hover:bg-muted/40 transition-colors">
                                <TableCell className="font-mono text-xs font-semibold text-primary">
                                  <Link href={`/dashboard/creditos/${folio}`} className="underline underline-offset-2 hover:opacity-80">
                                    #{folio}
                                  </Link>
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium text-foreground truncate max-w-[180px]" title={titular}>
                                    {titular}
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  <div>{tipo}</div>
                                  <div className="text-[11px]">Ciclo {c.ciclo ?? 1}</div>
                                </TableCell>
                                <TableCell className="font-medium">
                                  ${Number(c.monto_otorgado || 0).toLocaleString("es-MX")}
                                </TableCell>
                                <TableCell>
                                  ${Number(c.total || 0).toLocaleString("es-MX")}
                                </TableCell>
                                <TableCell>
                                  {normEstado === "activo" && (
                                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
                                      Activo
                                    </Badge>
                                  )}
                                  {normEstado === "mora" && (
                                    <Badge className="bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-100 flex items-center gap-1 w-fit">
                                      <AlertTriangle className="size-3" />
                                      En Mora
                                    </Badge>
                                  )}
                                  {normEstado === "finalizado" && (
                                    <Badge variant="secondary">
                                      {c.estado || "Liquidado"}
                                    </Badge>
                                  )}
                                  {normEstado === "otro" && (
                                    <Badge variant="outline">
                                      {c.estado ?? "—"}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Link
                                    href={`/dashboard/creditos/${folio}`}
                                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline hover:opacity-80"
                                  >
                                    <ExternalLink className="size-3.5" />
                                    Ver
                                  </Link>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              {creditosControls.search
                                ? `No se encontraron préstamos para "${creditosControls.search}".`
                                : "No hay préstamos asignados en esta categoría."}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {creditosFiltered.length > 0 && (
                    <TablePagination page={creditosControls.page} totalItems={creditosFiltered.length} pageSize={PAGE_SIZE} onPageChange={creditosControls.setPage} label="préstamos" />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="nomina" className="space-y-4">
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3 border-b border-primary/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2 text-primary">
                        <Wallet className="h-5 w-5" />
                        Datos de Nómina
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Percepciones salariales y configuración fiscal/bancaria del empleado.
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={handleOpenEditNomina}>
                      <Pencil className="h-3 w-3" /> Editar Nómina
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {/* Percepciones Fijas */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Percepciones Fijas
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1 bg-background p-3.5 rounded-lg border shadow-xs">
                        <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 uppercase tracking-wider">
                          <Wallet className="h-3.5 w-3.5 text-emerald-600"/> Sueldo Base
                        </span>
                        <p className="text-2xl font-bold text-emerald-600">
                          ${Number(asesor.sueldo_base || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="space-y-1 bg-background p-3.5 rounded-lg border shadow-xs">
                        <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 uppercase tracking-wider">
                          <Percent className="h-3.5 w-3.5 text-blue-600"/> Despensa
                        </span>
                        <p className="text-2xl font-bold text-foreground">
                          ${Number(asesor.despensa || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="space-y-1 bg-background p-3.5 rounded-lg border shadow-xs">
                        <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 uppercase tracking-wider">
                          <Car className="h-3.5 w-3.5 text-amber-600"/> Transporte
                        </span>
                        <p className="text-2xl font-bold text-foreground">
                          ${Number(asesor.apoyo_transporte || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Datos Bancarios y Fiscales */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Datos Fiscales y Bancarios
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1 bg-background p-3.5 rounded-lg border shadow-xs">
                        <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 uppercase tracking-wider">
                          <FileText className="h-3.5 w-3.5 text-primary"/> RFC
                        </span>
                        <p className="text-base font-mono font-medium text-foreground">
                          {asesor.rfc || <span className="text-muted-foreground italic text-sm">Sin registro</span>}
                        </p>
                      </div>
                      <div className="space-y-1 bg-background p-3.5 rounded-lg border shadow-xs">
                        <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 uppercase tracking-wider">
                          <IdCard className="h-3.5 w-3.5 text-primary"/> NSS (Seguridad Social)
                        </span>
                        <p className="text-base font-mono font-medium text-foreground">
                          {asesor.nss || <span className="text-muted-foreground italic text-sm">Sin registro</span>}
                        </p>
                      </div>
                      <div className="space-y-1 bg-background p-3.5 rounded-lg border shadow-xs">
                        <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 uppercase tracking-wider">
                          <Building2 className="h-3.5 w-3.5 text-primary"/> Banco
                        </span>
                        <p className="text-base font-medium text-foreground">
                          {asesor.banco || <span className="text-muted-foreground italic text-sm">Sin registro</span>}
                        </p>
                      </div>
                      <div className="space-y-1 bg-background p-3.5 rounded-lg border shadow-xs">
                        <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 uppercase tracking-wider">
                          <CreditCard className="h-3.5 w-3.5 text-primary"/> Cuenta Banco / CLABE
                        </span>
                        <p className="text-base font-mono font-medium text-foreground">
                          {asesor.cuenta_bancaria || <span className="text-muted-foreground italic text-sm">Sin registro</span>}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Resumen Total */}
                  <div className="bg-background p-4 rounded-lg border shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                        Total Percepciones Fijas Mensuales
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Sueldo base + despensa + apoyo transporte
                      </p>
                    </div>
                    <p className="text-2xl font-black text-emerald-600">
                      ${(Number(asesor.sueldo_base || 0) + Number(asesor.despensa || 0) + Number(asesor.apoyo_transporte || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
