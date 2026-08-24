"use client";

import { useState } from "react";
import { apiFetch, apiUpload } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FolderArchive,
  Upload,
  FileText,
  FileCheck,
  Eye,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Receipt,
  FileSignature,
  Printer,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  EXPEDIENTE_CREDITO_DOCUMENTOS,
  EXPEDIENTE_ACCEPT,
  type ExpedienteCreditoTipo,
} from "@/lib/expediente-documentos";
import { fmtFecha } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const STORAGE_BASE = API_BASE.replace("/api", "") + "/storage";

interface ExpedienteCreditoCardProps {
  credito: any;
  onUpdated: () => void;
  onOpenGenerator?: (tipo: "pagare" | "carta_adeudo" | "tarjeta_cobro") => void;
}

export function ExpedienteCreditoCard({
  credito,
  onUpdated,
  onOpenGenerator,
}: ExpedienteCreditoCardProps) {
  const [editingUbicacion, setEditingUbicacion] = useState(false);
  const [ubicacionInput, setUbicacionInput] = useState(credito?.ubicacion_expediente || "");
  const [notasInput, setNotasInput] = useState(credito?.notas_expediente || "");
  const [savingUbicacion, setSavingUbicacion] = useState(false);

  const [uploadingTipo, setUploadingTipo] = useState<ExpedienteCreditoTipo | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const documentos: any[] = credito?.documentos || [];

  const handleSaveUbicacion = async () => {
    setSavingUbicacion(true);
    try {
      const res = await apiFetch(`/creditos/${credito.num_prog}/expediente-fisico`, {
        method: "PUT",
        body: JSON.stringify({
          ubicacion_expediente: ubicacionInput,
          notas_expediente: notasInput,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(data.message || "Ubicación física actualizada");
        setEditingUbicacion(false);
        onUpdated();
      } else {
        toast.error(data.message || "No se pudo actualizar la ubicación");
      }
    } catch {
      toast.error("Error de conexión al servidor");
    } finally {
      setSavingUbicacion(false);
    }
  };

  const handleUploadDocumento = async (tipo: ExpedienteCreditoTipo, file: File) => {
    if (!file) return;
    setUploadingTipo(tipo);
    const formData = new FormData();
    formData.append("tipo", tipo);
    formData.append("archivo", file);

    try {
      const res = await apiUpload(`/creditos/${credito.num_prog}/documentos`, formData);
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Documento firmado guardado en el expediente");
        onUpdated();
      } else {
        toast.error(data.message || "Error al subir documento");
      }
    } catch {
      toast.error("Error de red al subir archivo");
    } finally {
      setUploadingTipo(null);
    }
  };

  const handleDeleteDocumento = async (id: number) => {
    if (!confirm("¿Deseas eliminar este documento firmado del expediente?")) return;
    setDeletingId(id);
    try {
      const res = await apiFetch(`/creditos/${credito.num_prog}/documentos/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Documento eliminado del expediente");
        onUpdated();
      } else {
        toast.error("No se pudo eliminar el documento");
      }
    } catch {
      toast.error("Error al conectar con el servidor");
    } finally {
      setDeletingId(null);
    }
  };

  const renderIcon = (tipo: string) => {
    switch (tipo) {
      case "PagareFirmado":
        return <FileText className="h-5 w-5 text-primary" />;
      case "CartaAdeudoFirmada":
        return <FileSignature className="h-5 w-5 text-amber-600" />;
      case "TarjetaCobroFirmada":
        return <CreditCard className="h-5 w-5 text-emerald-600" />;
      case "ContratoFirmado":
        return <FileCheck className="h-5 w-5 text-blue-600" />;
      default:
        return <Receipt className="h-5 w-5 text-zinc-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Physical File Location Box */}
      <Card className="border-primary/20 bg-primary/5 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderArchive className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-bold">Ubicación del Archivo Físico</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 font-medium"
              onClick={() => {
                setUbicacionInput(credito?.ubicacion_expediente || "");
                setNotasInput(credito?.notas_expediente || "");
                setEditingUbicacion(true);
              }}
            >
              <Edit3 className="h-3.5 w-3.5" />
              {credito?.ubicacion_expediente ? "Modificar Ubicación" : "Asignar Ubicación"}
            </Button>
          </div>
          <CardDescription className="text-xs">
            Referencia física del fólder, archivero o gaveta donde se resguarda el pagaré y documentos originales de este ciclo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-background/80 p-4 rounded-xl border">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Fólder / Archivero / Gaveta</p>
              <p className="font-bold text-base mt-0.5 text-foreground flex items-center gap-2">
                {credito?.ubicacion_expediente ? (
                  <>
                    <span className="font-mono text-primary font-bold">{credito.ubicacion_expediente}</span>
                    <Badge variant="outline" className="text-[10px] font-normal text-emerald-700 bg-emerald-50 border-emerald-200">
                      Asignado
                    </Badge>
                  </>
                ) : (
                  <span className="text-muted-foreground italic text-xs">Sin ubicación física asignada</span>
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Notas de Resguardo</p>
              <p className="text-xs mt-0.5 text-foreground">
                {credito?.notas_expediente || <span className="text-muted-foreground italic">Sin notas adicionales</span>}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Digital Signed Documents Grid */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-bold">Expediente Digital del Préstamo (Documentos Firmados)</CardTitle>
            </div>
            <Badge variant="secondary" className="text-xs font-mono">
              {documentos.length} archivo(s) respaldado(s)
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Respaldo digital de los pagarés, cartas de adeudo y tarjetas con firmas autógrafas correspondientes a este préstamo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {EXPEDIENTE_CREDITO_DOCUMENTOS.map((docDef) => {
              const docSubido = documentos.find((d) => d.tipo === docDef.tipo);
              const isUploading = uploadingTipo === docDef.tipo;
              const isDeleting = deletingId === docSubido?.id;
              const inputId = `upload-cred-doc-${docDef.tipo}-${credito.num_prog}`;

              const mapeoPlantilla: Record<string, "pagare" | "carta_adeudo" | "tarjeta_cobro"> = {
                PagareFirmado: "pagare",
                CartaAdeudoFirmada: "carta_adeudo",
                TarjetaCobroFirmada: "tarjeta_cobro",
              };

              const tipoPlantilla = mapeoPlantilla[docDef.tipo];

              return (
                <div
                  key={docDef.tipo}
                  className={`p-4 rounded-xl border transition-all ${
                    docSubido
                      ? "bg-card border-emerald-200 dark:border-emerald-950/60 shadow-xs"
                      : "bg-muted/20 border-dashed"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-background border shadow-2xs">
                        {renderIcon(docDef.tipo)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">{docDef.label}</h4>
                        <p className="text-[11px] text-muted-foreground">{docDef.descripcion}</p>
                      </div>
                    </div>

                    <Badge
                      variant={docSubido ? "default" : "outline"}
                      className={`text-[10px] ${
                        docSubido
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                          : "text-amber-700 bg-amber-50 border-amber-200"
                      }`}
                    >
                      {docSubido ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Firmado
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Pendiente
                        </span>
                      )}
                    </Badge>
                  </div>

                  {docSubido ? (
                    <div className="mt-3 pt-3 border-t text-xs space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="truncate max-w-[180px] font-mono">{docSubido.nombre_archivo}</span>
                        <span>{fmtFecha(docSubido.created_at)}</span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs flex-1 gap-1"
                          onClick={() => window.open(`${STORAGE_BASE}/${docSubido.ruta}`, "_blank")}
                        >
                          <Eye className="h-3.5 w-3.5" /> Ver Respaldo
                        </Button>

                        <label
                          htmlFor={`${inputId}-replace`}
                          className="h-8 px-2.5 rounded-md border text-xs inline-flex items-center justify-center cursor-pointer hover:bg-muted transition-colors"
                        >
                          {isUploading ? "..." : "Reemplazar"}
                          <input
                            id={`${inputId}-replace`}
                            type="file"
                            accept={EXPEDIENTE_ACCEPT}
                            className="hidden"
                            disabled={isUploading}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadDocumento(docDef.tipo, file);
                              e.target.value = "";
                            }}
                          />
                        </label>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          disabled={isDeleting}
                          onClick={() => handleDeleteDocumento(docSubido.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 pt-3 border-t flex items-center gap-2">
                      <label
                        htmlFor={inputId}
                        className="h-8 px-3 rounded-md bg-primary text-primary-foreground font-semibold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer hover:bg-primary/90 transition-colors flex-1"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        {isUploading ? "Subiendo..." : "Subir Escaneo / Foto"}
                        <input
                          id={inputId}
                          type="file"
                          accept={EXPEDIENTE_ACCEPT}
                          className="hidden"
                          disabled={isUploading}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadDocumento(docDef.tipo, file);
                            e.target.value = "";
                          }}
                        />
                      </label>

                      {tipoPlantilla && onOpenGenerator && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1"
                          onClick={() => onOpenGenerator(tipoPlantilla)}
                        >
                          <Printer className="h-3 w-3" /> Imprimir
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Edit Ubicacion Modal */}
      <Dialog open={editingUbicacion} onOpenChange={setEditingUbicacion}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FolderArchive className="h-5 w-5 text-primary" />
              Asignar Ubicación Física del Expediente
            </DialogTitle>
            <DialogDescription className="text-xs">
              Indica la referencia del archivero, gaveta o legajo donde se archiva físicamente el pagaré de este crédito (#{credito.num_prog}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="ubicacion" className="text-xs font-semibold">
                Ubicación Física (Archivero / Fólder / Gaveta)
              </Label>
              <Input
                id="ubicacion"
                value={ubicacionInput}
                onChange={(e) => setUbicacionInput(e.target.value)}
                placeholder="Ej. Archivero 2, Cajón B, Fólder #045"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notas" className="text-xs font-semibold">
                Notas de Resguardo / Control
              </Label>
              <Input
                id="notas"
                value={notasInput}
                onChange={(e) => setNotasInput(e.target.value)}
                placeholder="Ej. Original resguardado en bóveda / Entregado al jurídico"
                className="h-9 text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditingUbicacion(false)}
              disabled={savingUbicacion}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveUbicacion}
              disabled={savingUbicacion}
            >
              {savingUbicacion ? "Guardando..." : "Guardar Ubicación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
