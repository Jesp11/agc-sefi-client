"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { isAdminRoleName } from "@/lib/authz";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, User, Phone, MapPin, Briefcase, ShieldCheck, ClipboardList, CreditCard, Component, Cake, FileUp, Upload, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "../../../../components/ui/badge";
import { fmtFecha } from "@/lib/utils";
import { HistorialUnificadoModal } from "@/components/historial-unificado-modal";
import { apiUpload } from "@/lib/api";
import { EXPEDIENTE_ACCEPT, EXPEDIENTE_DOCUMENTOS, type ExpedienteTipo } from "@/lib/expediente-documentos";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import {
  creditoSearchFields,
  fetchAllPages,
  marcarEstadoCuotas,
  parseTablaAmortizacionCalendario,
} from "@/lib/table-utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const STORAGE_BASE = API_BASE.replace("/api", "") + "/storage";

export default function ClienteDetallePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = isAdminRoleName(user?.role?.nombre);
  const [cliente, setCliente] = useState<any>(null);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingTipo, setUploadingTipo] = useState<ExpedienteTipo | null>(null);
  const [asesores, setAsesores] = useState<any[]>([]);
  const [asesorSeleccionado, setAsesorSeleccionado] = useState("");
  const [guardandoAsesor, setGuardandoAsesor] = useState(false);
  const creditosControls = useTableControls();

  const fetchDocumentos = async () => {
    const res = await apiFetch(`/clientes/${id}/documentos`);
    if (res.ok) setDocumentos(await res.json());
  };

  const fetchCliente = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/clientes/${id}`);
      const data = await res.json();
      if (res.ok) {
        setCliente(data);
        setAsesorSeleccionado(String(data.id_asesor ?? data.asesor?.id ?? ""));
        fetchDocumentos();
      } else {
        toast.error("No se encontró el cliente");
        router.push("/dashboard/clientes");
      }
    } catch (error) {
      toast.error("Error al cargar detalles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCliente();
  }, [id, router]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchAllPages("/asesores")
      .then((rows) => setAsesores(rows.filter((a: any) => a.activo !== false)))
      .catch(() => toast.error("Error al cargar asesores"));
  }, [isAdmin]);

  const handleCambiarAsesor = async () => {
    if (!asesorSeleccionado) {
      toast.error("Selecciona un asesor");
      return;
    }
    if (String(cliente.id_asesor ?? cliente.asesor?.id ?? "") === asesorSeleccionado) {
      toast.message("El cliente ya tiene ese asesor asignado");
      return;
    }

    setGuardandoAsesor(true);
    try {
      const res = await apiFetch(`/clientes/${id}`, {
        method: "PUT",
        body: JSON.stringify({ id_asesor: Number(asesorSeleccionado) }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(data.message || "Asesor actualizado");
        if (data.data) {
          setCliente(data.data);
          setAsesorSeleccionado(String(data.data.id_asesor ?? data.data.asesor?.id ?? ""));
        } else {
          fetchCliente();
        }
      } else {
        toast.error(data.message || "Error al cambiar asesor");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setGuardandoAsesor(false);
    }
  };

  const getDocumentoPorTipo = (tipo: ExpedienteTipo) =>
    documentos.find((d) => d.tipo === tipo);

  const handleUploadDocumento = async (tipo: ExpedienteTipo, file: File) => {
    setUploadingTipo(tipo);
    try {
      const existente = getDocumentoPorTipo(tipo);
      if (existente) {
        const delRes = await apiFetch(`/clientes/${id}/documentos/${existente.id}`, { method: "DELETE" });
        if (!delRes.ok) {
          toast.error("Error al reemplazar documento");
          return;
        }
      }
      const fd = new FormData();
      fd.append("tipo", tipo);
      fd.append("archivo", file);
      const res = await apiUpload(`/clientes/${id}/documentos`, fd);
      if (res.ok) {
        toast.success("Documento cargado correctamente");
        fetchDocumentos();
      } else {
        toast.error("Error al subir documento");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setUploadingTipo(null);
    }
  };

  const handleDeleteDocumento = async (tipo: ExpedienteTipo) => {
    const doc = getDocumentoPorTipo(tipo);
    if (!doc) return;
    setUploadingTipo(tipo);
    try {
      const res = await apiFetch(`/clientes/${id}/documentos/${doc.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Documento eliminado");
        fetchDocumentos();
      } else {
        toast.error("Error al eliminar documento");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setUploadingTipo(null);
    }
  };

  if (loading) return <div className="p-8 text-center">Cargando detalles del cliente...</div>;
  if (!cliente) return null;

  const creditosList = cliente.creditos || [];
  const creditosFiltered = filterBySearch(creditosList, creditosControls.search, creditoSearchFields);
  const creditosPaginated = paginateItems(creditosFiltered, creditosControls.page);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{cliente.nombre_completo}</h1>
            <p className="text-muted-foreground font-mono text-sm">{cliente.id_cliente}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <HistorialUnificadoModal tipo="cliente" id={id as string} />
        </div>
      </div>

      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="domicilio">Domicilio</TabsTrigger>
          <TabsTrigger value="laboral">Laboral</TabsTrigger>
          <TabsTrigger value="creditos">Créditos</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="avales">Avales</TabsTrigger>
          <TabsTrigger value="referencias">Referencias</TabsTrigger>
          <TabsTrigger value="asesor">Asesor</TabsTrigger>
        </TabsList>

        {/* Personal */}
        <TabsContent value="personal" className="mt-4">
          <Card>
            <CardContent className="pt-6 grid grid-cols-2 gap-6 text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium">Grupo</span>
                {cliente.grupos && cliente.grupos.length > 0 ? (
                  <span className="font-bold text-primary flex items-center gap-1">
                    <Component className="h-3 w-3" /> {cliente.grupos[0].nombre_grupo}
                  </span>
                ) : (
                  <Badge variant="outline" className="w-fit">Individual</Badge>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium">Teléfono</span>
                <span className="flex items-center gap-2"><Phone className="h-3 w-3" /> {cliente.telefono}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium">CURP</span>
                <span className="font-mono">{cliente.curp}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium">Clave de Elector</span>
                <span className="font-mono">{cliente.clave_elector}</span>
              </div>
              {cliente.fecha_nacimiento && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground font-medium">Fecha de Nacimiento</span>
                  <span className="flex items-center gap-2">
                    <Cake className="h-3 w-3" />
                    {fmtFecha(cliente.fecha_nacimiento)}
                  </span>
                </div>
              )}
              {cliente.created_at && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground font-medium">Cliente desde</span>
                  <span>{fmtFecha(cliente.created_at.split("T")[0])}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Domicilio */}
        <TabsContent value="domicilio" className="mt-4">
          <Card>
            <CardContent className="pt-6 grid grid-cols-1 gap-6 text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium">Dirección</span>
                <span className="flex items-center gap-2"><MapPin className="h-3 w-3" /> {cliente.direccion}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium">Entre Calle y Calle</span>
                <span className="flex items-center gap-2"><MapPin className="h-3 w-3" /> {cliente.entre_calles}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Laboral */}
        <TabsContent value="laboral" className="mt-4">
          <Card>
            <CardContent className="pt-6 grid grid-cols-2 gap-6 text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium">Ocupación</span>
                <span className="flex items-center gap-2"><Briefcase className="h-3 w-3" /> {cliente.ocupacion}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium">Teléfono de Trabajo</span>
                <span className="flex items-center gap-2"><Phone className="h-3 w-3" /> {cliente.telefono_trabajo}</span>
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <span className="text-xs text-muted-foreground font-medium">Dirección de Trabajo</span>
                <span className="flex items-center gap-2"><MapPin className="h-3 w-3" /> {cliente.direccion_trabajo}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Préstamos */}
        <TabsContent value="creditos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5" /> Historial de Préstamos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <TableSearch placeholder="Buscar préstamos..." value={creditosControls.search} onChange={creditosControls.handleSearch} />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ciclo</TableHead>
                    <TableHead>Dia Pago</TableHead>
                    <TableHead>Asesor</TableHead>
                    <TableHead>Valor Ficha</TableHead>
                    <TableHead>Plazos</TableHead>
                    <TableHead>Monto Otorgado</TableHead>
                    <TableHead>Interés</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditosFiltered.length > 0 ? (
                    creditosPaginated.map((c: any, index: number) => (
                      <TableRow key={c.id_credito || c.id || index}>
                        <TableCell>{c.ciclo}</TableCell>
                        <TableCell>{c.dias_pago}</TableCell>
                        <TableCell>{c.asesor?.nombre_asesor || "N/A"}</TableCell>
                        <TableCell className="font-bold">${c.valor_ficha}</TableCell>
                        <TableCell>{c.plazos} sem</TableCell>
                        <TableCell>${c.monto_otorgado}</TableCell>
                        <TableCell>${c.interes}</TableCell>
                        <TableCell>${c.total}</TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger render={<Button variant="outline" size="sm">Ver Tabla</Button>} />
                            <DialogContent className="sm:max-w-[600px]">
                              <DialogHeader>
                                <DialogTitle>Tabla de Amortización - Ciclo {c.ciclo}</DialogTitle>
                                <DialogDescription>Monto: ${c.monto_otorgado} | Total a pagar: ${c.total}</DialogDescription>
                              </DialogHeader>
                              <div className="max-h-[400px] overflow-y-auto border rounded-md">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="w-[80px]">Pago #</TableHead>
                                      <TableHead>Fecha Sugerida</TableHead>
                                      <TableHead className="text-right">Monto</TableHead>
                                      <TableHead className="text-right">Saldo Restante</TableHead>
                                      <TableHead className="text-center">Estado</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {(() => {
                                      const calendario = parseTablaAmortizacionCalendario(c.tabla_amortizacion);
                                      if (calendario.length === 0) {
                                        return (
                                          <TableRow key="no-tabla">
                                            <TableCell colSpan={5} className="text-center p-4">No hay tabla disponible</TableCell>
                                          </TableRow>
                                        );
                                      }
                                      const abonado = Math.max(
                                        0,
                                        Number(c.total || 0) - Number(c.saldo_pendiente ?? c.total ?? 0),
                                      );
                                      return marcarEstadoCuotas(calendario, abonado).map((p) => (
                                        <TableRow key={p.pago_numero}>
                                          <TableCell className="font-medium">#{p.pago_numero}</TableCell>
                                          <TableCell className="text-xs">{fmtFecha(p.fecha_sugerida)}</TableCell>
                                          <TableCell className="text-right font-bold">${p.monto_pago}</TableCell>
                                          <TableCell className="text-right text-muted-foreground text-xs">${p.saldo_restante}</TableCell>
                                          <TableCell className="text-center">
                                            <Badge
                                              variant={p.estado_pago === "Pagado" ? "default" : "secondary"}
                                              className={
                                                p.estado_pago === "Pagado"
                                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                                  : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-50"
                                              }
                                            >
                                              {p.estado_pago}
                                            </Badge>
                                          </TableCell>
                                        </TableRow>
                                      ));
                                    })()}
                                  </TableBody>
                                </Table>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow key="empty-creditos">
                      <TableCell colSpan={9} className="text-center">{creditosControls.search ? "No se encontraron préstamos." : "Sin préstamos registrados"}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {creditosFiltered.length > 0 && (
                <TablePagination page={creditosControls.page} totalItems={creditosFiltered.length} pageSize={PAGE_SIZE} onPageChange={creditosControls.setPage} label="préstamos" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documentos KYC */}
        <TabsContent value="documentos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileUp className="h-5 w-5" /> Expediente Digital
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Carga el expediente del cliente. Todos los documentos son opcionales.
              </p>
              {EXPEDIENTE_DOCUMENTOS.map(({ tipo, label }) => {
                const doc = getDocumentoPorTipo(tipo);
                const busy = uploadingTipo === tipo;
                const inputId = `doc-${tipo}`;
                return (
                  <div key={tipo} className="grid gap-1">
                    <label htmlFor={inputId} className="text-sm font-medium">{label}</label>
                    {doc ? (
                      <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <a
                          href={`${STORAGE_BASE}/${doc.ruta}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary underline underline-offset-2 hover:opacity-80 truncate flex-1"
                        >
                          {doc.nombre_archivo}
                        </a>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {doc.created_at ? fmtFecha(doc.created_at.slice(0, 10)) : ""}
                        </span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive/80 shrink-0"
                          onClick={() => handleDeleteDocumento(tipo)}
                          disabled={busy || uploadingTipo !== null}
                          title={`Eliminar ${label.toLowerCase()}`}
                        >
                          {busy ? (
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <label
                        htmlFor={inputId}
                        className={`flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 p-3 text-sm text-muted-foreground transition-colors ${busy || uploadingTipo !== null ? "opacity-50 pointer-events-none" : "cursor-pointer hover:border-primary/60 hover:bg-muted/30 hover:text-foreground"}`}
                      >
                        {busy ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Subiendo...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            Cargar {label.toLowerCase()}
                          </>
                        )}
                        <input
                          id={inputId}
                          type="file"
                          accept={EXPEDIENTE_ACCEPT}
                          className="hidden"
                          disabled={busy || uploadingTipo !== null}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadDocumento(tipo, file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}
                    {doc && (
                      <label
                        htmlFor={`${inputId}-replace`}
                        className={`inline-flex items-center gap-1.5 text-xs text-primary underline underline-offset-2 w-fit ${busy || uploadingTipo !== null ? "opacity-50 pointer-events-none" : "cursor-pointer hover:opacity-80"}`}
                      >
                        Reemplazar archivo
                        <input
                          id={`${inputId}-replace`}
                          type="file"
                          accept={EXPEDIENTE_ACCEPT}
                          className="hidden"
                          disabled={busy || uploadingTipo !== null}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadDocumento(tipo, file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Avales */}
        <TabsContent value="avales" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="h-5 w-5" /> Avales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {cliente.avales && cliente.avales.length > 0 ? (
                  cliente.avales.map((a: any, index: number) => (
                    <div key={a.id_aval || a.id || index} className="border rounded-lg p-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div className="col-span-2 font-semibold text-base">{a.nombre}</div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-muted-foreground">Parentesco</span>
                        <span>{a.parentesco || "—"}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-muted-foreground">Teléfono</span>
                        <span>{a.telefono || "—"}</span>
                      </div>
                      <div className="flex flex-col gap-0.5 col-span-2">
                        <span className="text-xs text-muted-foreground">Dirección</span>
                        <span>{a.direccion || "—"}</span>
                      </div>
                      {(a.ocupacion_laboral || a.empresa || a.tiempo_conocer) && (
                        <>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-muted-foreground">Ocupación Laboral</span>
                            <span>{a.ocupacion_laboral || "—"}</span>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-muted-foreground">Empresa / Negocio</span>
                            <span>{a.empresa || "—"}</span>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-muted-foreground">Tiempo de conocerse</span>
                            <span>{a.tiempo_conocer || "—"}</span>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4 text-sm">Sin avales registrados</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Referencias */}
        <TabsContent value="referencias" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardList className="h-5 w-5" /> Referencias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {cliente.referencias && cliente.referencias.length > 0 ? (
                  cliente.referencias.map((r: any, index: number) => (
                    <div key={r.id_referencia || r.id || index} className="border rounded-lg p-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div className="col-span-2 font-semibold text-base">{r.nombre}</div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-muted-foreground">Parentesco</span>
                        <span>{r.parentesco || "—"}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-muted-foreground">Teléfono</span>
                        <span>{r.telefono || "—"}</span>
                      </div>
                      <div className="flex flex-col gap-0.5 col-span-2">
                        <span className="text-xs text-muted-foreground">Dirección</span>
                        <span>{r.direccion || "—"}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-muted-foreground">Tipo</span>
                        <span>{r.tipo_referencia || "—"}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-muted-foreground">Tiempo de conocerse</span>
                        <span>{r.años_amistad ? `${r.años_amistad} año(s)` : "—"}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4 text-sm">Sin referencias registradas</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Asesor */}
        <TabsContent value="asesor" className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {cliente.asesor ? (
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">{cliente.asesor.nombre_asesor}</p>
                    <p className="text-muted-foreground text-sm">ID: {cliente.asesor.id_asesor ?? cliente.asesor.id}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No tiene asesor asignado.</p>
              )}

              {isAdmin && (
                <div className="grid gap-3 border-t pt-4 max-w-md">
                  <div className="grid gap-2">
                    <Label>Cambiar asesor</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={asesorSeleccionado}
                      onChange={(e) => setAsesorSeleccionado(e.target.value)}
                    >
                      <option value="">Seleccionar asesor...</option>
                      {asesores.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nombre_asesor}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Los créditos activos o en mora del cliente también se reasignarán al nuevo asesor.
                    </p>
                  </div>
                  <Button
                    onClick={handleCambiarAsesor}
                    disabled={guardandoAsesor || !asesorSeleccionado}
                    className="w-fit"
                  >
                    {guardandoAsesor ? "Guardando..." : "Guardar asesor"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
