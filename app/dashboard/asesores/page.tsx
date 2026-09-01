"use client";

import { useState, useEffect, useRef } from "react";
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
import { fmtFecha, extractBirthdateFromCurp, fmtTelefono, cleanTelefono } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlusCircle, Upload, Download, FileSpreadsheet, ChevronDown, FileDown, Pencil } from "lucide-react";
import * as XLSX from "xlsx";

import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { asesorSearchFields, fetchAllPages } from "@/lib/table-utils";

export default function AsesoresPage() {
  const router = useRouter();
  const [asesores, setAsesores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { search, handleSearch, page, setPage } = useTableControls();
  const [isOpen, setIsOpen] = useState(false);
  const [nombreAsesor, setNombreAsesor] = useState("");
  const [curp, setCurp] = useState("");
  const [telefono, setTelefono] = useState("");
  const [rolLaboral, setRolLaboral] = useState("Gestor de Cobranza");
  const [ineFile, setIneFile] = useState<File | null>(null);
  const [ineFile2, setIneFile2] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit modal state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAsesorId, setEditingAsesorId] = useState<number | string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editCurp, setEditCurp] = useState("");
  const [editTelefono, setEditTelefono] = useState("");
  const [editRolLaboral, setEditRolLaboral] = useState("Gestor de Cobranza");
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [rolFiltro, setRolFiltro] = useState("todos");
  const importInputRef = useRef<HTMLInputElement>(null);

  const fetchAsesores = async () => {
    setLoading(true);
    try {
      const rows = await fetchAllPages("/asesores");
      setAsesores(rows);
    } catch {
      toast.error("Error al cargar empleados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAsesores();
  }, []);

  const filteredBase = Array.isArray(asesores)
    ? asesores.filter((asesor) => rolFiltro === "todos" || (asesor.rol_laboral ?? "Gestor de Cobranza") === rolFiltro)
    : [];
  const filtered = filterBySearch(filteredBase, search, asesorSearchFields);
  const paginated = paginateItems(filtered, page);

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
      formData.append("rol_laboral", rolLaboral);
      if (ineFile) formData.append("ine", ineFile);
      if (ineFile2) formData.append("ine_2", ineFile2);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/asesores`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (res.ok) {
        toast.success("Empleado creado exitosamente");
        setNombreAsesor("");
        setCurp("");
        setTelefono("");
        setRolLaboral("Gestor de Cobranza");
        setIneFile(null);
        setIneFile2(null);
        setIsOpen(false);
        fetchAsesores();
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || "Error al crear empleado");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (asesor: any) => {
    setEditingAsesorId(asesor.id);
    setEditNombre(asesor.nombre_asesor ?? "");
    setEditCurp(asesor.curp ?? "");
    setEditTelefono(asesor.telefono ?? "");
    setEditRolLaboral(asesor.rol_laboral ?? "Gestor de Cobranza");
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNombre.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    if (editCurp.trim().length !== 18) {
      toast.error("La CURP debe tener exactamente 18 caracteres");
      return;
    }

    setIsEditSubmitting(true);
    try {
      const res = await apiFetch(`/asesores/${editingAsesorId}`, {
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
        toast.success(data.message || "Empleado actualizado exitosamente");
        setIsEditDialogOpen(false);
        fetchAsesores();
      } else {
        const errorMsg =
          data.errors?.curp?.[0] ||
          data.errors?.nombre_asesor?.[0] ||
          data.message ||
          "Error al actualizar empleado";
        toast.error(errorMsg);
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleExportTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Nombre", "CURP", "Teléfono", "Rol", "Correo", "Contraseña Temporal"],
      ["Ej. Carlos López", "LOCC850101HDFRRL09", "5512345678", "Gestor de Cobranza", "carlos.lopez@sefi.com", "Temporal123#"],
    ]);
    ws["!cols"] = [{ wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 22 }, { wch: 28 }, { wch: 22 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla Empleados");
    XLSX.writeFile(wb, "plantilla_empleados.xlsx");
    toast.success("Plantilla descargada (incluye acceso y contraseña)");
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await apiFetch("/asesores/export");
      const json = await res.json();
      if (!res.ok) {
        toast.error("Error al exportar empleados");
        return;
      }

      const rows = (json.data || []).map((a: any) => ({
        "Clave": a.id_asesor ?? "",
        "Nombre": a.nombre_asesor ?? "",
        "CURP": a.curp ?? "",
        "Teléfono": a.telefono ?? "",
        "Rol": a.rol_laboral ?? "Gestor de Cobranza",
        "Correo": a.user?.email ?? "",
        "Tiene acceso": a.user?.email ? "Sí" : "No",
        "Cumpleaños": a.cumpleanos ? fmtFecha(a.cumpleanos) : "",
        "Fecha de alta": a.created_at ? fmtFecha(a.created_at.split("T")[0]) : "",
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Empleados");
      XLSX.writeFile(wb, `empleados_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`${rows.length} empleado(s) exportado(s)`);
    } catch {
      toast.error("Error al exportar empleados");
    } finally {
      setIsExporting(false);
    }
  };

  const normalizeHeader = (header: string) =>
    header
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const mapImportRow = (row: Record<string, unknown>) => {
    const mapped: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      const h = normalizeHeader(key);
      const val = String(value ?? "").trim();
      if (!val) continue;
      if (h === "nombre" || h === "nombre_asesor" || h === "nombre completo" || h === "empleado") {
        mapped.nombre_asesor = val;
      } else if (h === "curp") {
        mapped.curp = val.toUpperCase();
      } else if (h === "telefono" || h === "tel" || h === "celular") {
        mapped.telefono = cleanTelefono(val) || val;
      } else if (h === "rol" || h === "puesto" || h === "cargo" || h === "rol_laboral") {
        mapped.rol_laboral = val;
      } else if (h === "correo" || h === "email" || h === "correo electronico" || h === "correo_electronico") {
        mapped.email = val.toLowerCase();
      } else if (
        h === "contrasena" ||
        h === "contraseña" ||
        h === "contrasena temporal" ||
        h === "contraseña temporal" ||
        h === "password" ||
        h === "clave" ||
        h === "pass"
      ) {
        mapped.password = val;
      }
    }
    return mapped;
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setIsImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

      const asesores = rawRows
        .map(mapImportRow)
        .filter((row) => row.nombre_asesor || row.curp);

      if (asesores.length === 0) {
        toast.error("El archivo no contiene filas válidas. Use columnas: Nombre, CURP, Teléfono, Correo, Contraseña.");
        return;
      }

      const res = await apiFetch("/asesores/import", {
        method: "POST",
        body: JSON.stringify({ asesores }),
      });
      const data = await res.json();

      if ((data.created ?? 0) > 0 || (data.updated ?? 0) > 0) {
        toast.success(data.message || "Importación completada");
        fetchAsesores();
      }

      if (data.errors?.length) {
        const detalle = data.errors
          .slice(0, 3)
          .map((err: { fila: number; mensajes: string[] }) => `Fila ${err.fila}: ${err.mensajes.join(", ")}`)
          .join(" · ");
        toast.error(`${data.errors.length} fila(s) con error. ${detalle}`);
      } else if (!res.ok && !data.created && !data.updated) {
        toast.error(data.message || "Error al importar empleados");
      }
    } catch {
      toast.error("Error al leer el archivo Excel");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground/90">Empleados</h1>
        <p className="text-muted-foreground">Catálogo operativo del personal con acceso y rol visible.</p>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <TableSearch
          placeholder="Buscar empleados..."
          value={search}
          onChange={handleSearch}
          className="flex-1 max-w-md"
        />
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={rolFiltro}
            onChange={(e) => {
              setRolFiltro(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="todos">Todos los roles</option>
            <option value="Gestor de Cobranza">Gestor de Cobranza (GC)</option>
            <option value="Asesor Financiero">Asesor Financiero (AF)</option>
            <option value="Administrador">Administrador (AD)</option>
            <option value="Gerencia">Gerencia (GE)</option>
            <option value="Contabilidad">Contabilidad (CO)</option>
          </select>
          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleImportFile}
          />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm" className="h-10 px-4" disabled={isImporting || isExporting}>
                  Acciones
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="min-w-52">
              <DropdownMenuItem onClick={handleExportTemplate} disabled={isImporting || isExporting}>
                <FileDown className="mr-2 h-4 w-4" />
                Exportar plantilla
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport} disabled={isImporting || isExporting}>
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? "Exportando..." : "Exportar empleados"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => importInputRef.current?.click()}
                disabled={isImporting || isExporting}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {isImporting ? "Importando..." : "Importar empleados"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger
            render={
              <Button size="sm" className="h-10 px-4">
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Empleado
              </Button>
            }
          />
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Crear Empleado</DialogTitle>
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
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{curp.length}/18 caracteres</span>
                  {extractBirthdateFromCurp(curp) ? (
                    <span className="text-primary font-medium">
                      Cumpleaños: {fmtFecha(extractBirthdateFromCurp(curp))}
                    </span>
                  ) : (
                    <span>El cumpleaños se extrae automáticamente.</span>
                  )}
                </div>
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
                <label htmlFor="rol_laboral" className="text-sm font-medium">Rol</label>
                <select
                  id="rol_laboral"
                  value={rolLaboral}
                  onChange={(e) => setRolLaboral(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="Gestor de Cobranza">Gestor de Cobranza (ID: GC...)</option>
                  <option value="Asesor Financiero">Asesor Financiero (ID: AF...)</option>
                  <option value="Administrador">Administrador (ID: AD...)</option>
                  <option value="Gerencia">Gerencia (ID: GE...)</option>
                  <option value="Contabilidad">Contabilidad (ID: CO...)</option>
                </select>
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">
                  INE <span className="text-muted-foreground font-normal">(opcional — JPG, PNG o PDF, máx. 5 MB)</span>
                </span>
                {(["Frontal", "Reverso"] as const).map((label, idx) => {
                  const isFrontal = idx === 0;
                  const file = isFrontal ? ineFile : ineFile2;
                  const inputId = isFrontal ? "ine" : "ine_2";
                  const setFile = isFrontal ? setIneFile : setIneFile2;
                  return (
                    <div key={label} className="grid gap-1">
                      <label htmlFor={inputId} className="text-xs text-muted-foreground">{label}</label>
                      <label
                        htmlFor={inputId}
                        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-3 cursor-pointer transition-colors ${isSubmitting ? "opacity-50 pointer-events-none" : "hover:border-primary/60 hover:bg-muted/30"} ${file ? "border-primary/40 bg-primary/5" : "border-muted-foreground/30"}`}
                      >
                        <Upload className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground text-center">
                          {file ? file.name : `Cargar ${label.toLowerCase()}`}
                        </span>
                        <input
                          id={inputId}
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          className="hidden"
                          disabled={isSubmitting}
                          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Editar Empleado</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="edit_nombre" className="text-sm font-medium">Nombre Completo</label>
                <Input
                  id="edit_nombre"
                  placeholder="Ej. Carlos López"
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  disabled={isEditSubmitting}
                  required
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="edit_curp" className="text-sm font-medium">CURP</label>
                <Input
                  id="edit_curp"
                  placeholder="18 caracteres"
                  value={editCurp}
                  onChange={(e) => setEditCurp(e.target.value.toUpperCase())}
                  maxLength={18}
                  disabled={isEditSubmitting}
                  className="font-mono uppercase"
                  required
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{editCurp.length}/18 caracteres</span>
                  {extractBirthdateFromCurp(editCurp) && (
                    <span className="text-primary font-medium">
                      Cumpleaños: {fmtFecha(extractBirthdateFromCurp(editCurp))}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid gap-2">
                <label htmlFor="edit_telefono" className="text-sm font-medium">
                  Teléfono <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <Input
                  id="edit_telefono"
                  type="tel"
                  placeholder="Ej. 5512345678"
                  value={editTelefono}
                  onChange={(e) => setEditTelefono(e.target.value)}
                  maxLength={20}
                  disabled={isEditSubmitting}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="edit_rol_laboral" className="text-sm font-medium">Rol</label>
                <select
                  id="edit_rol_laboral"
                  value={editRolLaboral}
                  onChange={(e) => setEditRolLaboral(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="Gestor de Cobranza">Gestor de Cobranza (GC)</option>
                  <option value="Asesor Financiero">Asesor Financiero (AF)</option>
                  <option value="Administrador">Administrador (AD)</option>
                  <option value="Gerencia">Gerencia (GE)</option>
                  <option value="Contabilidad">Contabilidad (CO)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={isEditSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isEditSubmitting}>
                  {isEditSubmitting ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>CURP</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Dado de alta</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow key="loading">
                <TableCell colSpan={7} className="h-24 text-center">
                  Cargando empleados...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow key="empty">
                <TableCell colSpan={7} className="h-24 text-center">
                  {search ? "No se encontraron empleados con ese criterio." : "No hay empleados registrados."}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((asesor: any) => (
                <TableRow key={asesor.id}>
                  <TableCell className="font-mono text-xs">{asesor.id_asesor ?? asesor.id}</TableCell>
                  <TableCell className="font-medium">{asesor.nombre_asesor}</TableCell>
                  <TableCell>{asesor.rol_laboral ?? "Gestor de Cobranza"}</TableCell>
                  <TableCell className="font-mono text-xs">{asesor.curp ?? "—"}</TableCell>
                  <TableCell className="text-xs">{fmtTelefono(asesor.telefono)}</TableCell>
                  <TableCell className="text-sm">{asesor.created_at ? fmtFecha(asesor.created_at.split("T")[0]) : "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(asesor)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/dashboard/empleados/${asesor.id}`)}
                      >
                        Ver perfil
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!loading && (
        <TablePagination
          page={page}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          label="empleados"
        />
      )}
    </div>
  );
}
