"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { fmtFecha } from "@/lib/utils";
import { ArrowDownCircle, ArrowUpCircle, Plus } from "lucide-react";
import { TablePagination, TableSearch } from "@/components/table-controls";
import { PAGE_SIZE, filterBySearch, paginateItems, useTableControls } from "@/hooks/use-paginated-list";
import { historialMovSearchFields, socioSearchFields } from "@/lib/table-utils";

type Movimiento = { id: number; tipo: string; monto: number; fecha: string; notas?: string };
type Socio = { id: number; nombre: string; codigo: string; saldo: number; movimientos: Movimiento[] };

type Resumen = {
  anio: number;
  meses: string[];
  socios: Array<{ id: number; nombre: string; codigo: string; saldo: number; meses: Record<string, number>; total_anio: number }>;
  totales_mes: Record<string, number>;
  total_general: number;
  total_saldo: number;
};

const emptyMovForm = () => ({
  monto: "",
  fecha: new Date().toISOString().split("T")[0],
  notas: "",
});

export default function AhorrosSociosPage() {
  const [data, setData] = useState<{ total_saldo: number; socios: Socio[] } | null>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [socioForm, setSocioForm] = useState({ nombre: "", codigo: "" });
  const [movForm, setMovForm] = useState(emptyMovForm());
  const [selectedSocio, setSelectedSocio] = useState<Socio | null>(null);
  const [movTipo, setMovTipo] = useState<"ingreso" | "retiro">("ingreso");
  const [movOpen, setMovOpen] = useState(false);
  const [socioOpen, setSocioOpen] = useState(false);
  const sociosControls = useTableControls();
  const historialControls = useTableControls();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const [listRes, resumenRes] = await Promise.all([
      apiFetch("/ahorros-socios"),
      apiFetch(`/ahorros-socios/resumen?anio=${anio}`),
    ]);
    if (listRes.ok && resumenRes.ok) {
      setData(await listRes.json());
      setResumen(await resumenRes.json());
    } else {
      const err = await listRes.json().catch(() => ({}));
      setLoadError(err.message || "No se pudo cargar. Ejecuta: php artisan migrate");
    }
    setLoading(false);
  }, [anio]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateSocio = async () => {
    const res = await apiFetch("/socios", { method: "POST", body: JSON.stringify(socioForm) });
    if (res.ok) {
      toast.success("Socio registrado");
      setSocioForm({ nombre: "", codigo: "" });
      setSocioOpen(false);
      fetchData();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || "Error al registrar socio");
    }
  };

  const openMovimiento = (socio: Socio, tipo: "ingreso" | "retiro") => {
    setSelectedSocio(socio);
    setMovTipo(tipo);
    setMovForm(emptyMovForm());
    setMovOpen(true);
  };

  const handleMovimiento = async () => {
    if (!selectedSocio) return;
    const res = await apiFetch(`/ahorros-socios/${selectedSocio.id}/${movTipo}`, {
      method: "POST",
      body: JSON.stringify({ ...movForm, monto: parseFloat(movForm.monto) }),
    });
    if (res.ok) {
      toast.success(movTipo === "ingreso" ? "Ingreso registrado" : "Retiro registrado");
      setMovOpen(false);
      fetchData();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || "Error al registrar movimiento");
    }
  };

  if (loading) return <div className="p-8">Cargando...</div>;

  if (loadError || !data || !resumen) {
    return (
      <div className="p-8 space-y-4">
        <h1 className="text-3xl font-bold">Ahorro de Socios</h1>
        <Card><CardContent className="pt-6 text-muted-foreground">{loadError || "Error al cargar."}</CardContent></Card>
      </div>
    );
  }

  const fmt = (n: number) => (n === 0 ? "—" : `$${Number(n).toLocaleString()}`);
  const sociosFiltered = filterBySearch(data.socios, sociosControls.search, socioSearchFields);
  const sociosPaginated = paginateItems(sociosFiltered, sociosControls.page);
  const historialAll = data.socios
    .flatMap((s) => s.movimientos.map((m) => ({ ...m, socioNombre: s.nombre })))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const historialFiltered = filterBySearch(historialAll, historialControls.search, historialMovSearchFields);
  const historialPaginated = paginateItems(historialFiltered, historialControls.page);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Ahorro de Socios</h1>
          <p className="text-muted-foreground text-sm mt-1">Ahorro de socios de la financiera — catálogo independiente</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="anio">Año</Label>
            <Input id="anio" type="number" className="w-24" value={anio} onChange={(e) => setAnio(parseInt(e.target.value) || new Date().getFullYear())} />
          </div>
          <Dialog open={socioOpen} onOpenChange={setSocioOpen}>
            <DialogTrigger render={<Button><Plus className="size-4 mr-1" />Nuevo Socio</Button>} />
            <DialogContent>
              <DialogHeader><DialogTitle>Alta de Socio</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div><Label>Nombre</Label><Input value={socioForm.nombre} onChange={(e) => setSocioForm({ ...socioForm, nombre: e.target.value })} /></div>
                <div><Label>Código (ID)</Label><Input placeholder="Ej. SOC-001" value={socioForm.codigo} onChange={(e) => setSocioForm({ ...socioForm, codigo: e.target.value })} /></div>
                <Button onClick={handleCreateSocio}>Guardar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Total en Fondos de Ahorro</CardTitle></CardHeader>
        <CardContent className="text-3xl font-bold text-primary">${Number(data.total_saldo).toLocaleString()}</CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Resumen {anio}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Socio</TableHead>
                <TableHead>ID</TableHead>
                {resumen.meses.map((m) => (
                  <TableHead key={m} className="text-right text-xs">{m}/{String(anio).slice(2)}</TableHead>
                ))}
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resumen.socios.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium whitespace-nowrap">{s.nombre}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{s.codigo}</TableCell>
                  {resumen.meses.map((m) => (
                    <TableCell key={m} className="text-right text-sm">{fmt(s.meses[m])}</TableCell>
                  ))}
                  <TableCell className="text-right font-semibold">{fmt(s.total_anio)}</TableCell>
                  <TableCell className="text-right font-semibold">${Number(s.saldo).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={2}>TOTALES</TableCell>
                {resumen.meses.map((m) => (
                  <TableCell key={m} className="text-right text-sm">{fmt(resumen.totales_mes[m])}</TableCell>
                ))}
                <TableCell className="text-right">{fmt(resumen.total_general)}</TableCell>
                <TableCell className="text-right">${Number(resumen.total_saldo).toLocaleString()}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Movimientos por Socio</CardTitle></CardHeader>
        <CardContent className="p-0 space-y-4">
          <div className="px-6 pt-4">
            <TableSearch placeholder="Buscar socios..." value={sociosControls.search} onChange={sociosControls.handleSearch} />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Socio</TableHead>
                <TableHead>ID</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sociosFiltered.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">{sociosControls.search ? "No se encontraron socios." : "No hay socios. Usa Nuevo Socio para registrar."}</TableCell></TableRow>
              ) : sociosPaginated.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">{s.codigo}</TableCell>
                  <TableCell className="text-right font-semibold">${Number(s.saldo).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openMovimiento(s, "ingreso")}>
                        <ArrowDownCircle className="size-4 mr-1 text-green-600" />Ingresar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openMovimiento(s, "retiro")}>
                        <ArrowUpCircle className="size-4 mr-1 text-red-600" />Retirar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="px-6 pb-4">
            <TablePagination page={sociosControls.page} totalItems={sociosFiltered.length} pageSize={PAGE_SIZE} onPageChange={sociosControls.setPage} label="socios" />
          </div>
        </CardContent>
      </Card>

      {historialAll.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Historial Reciente</CardTitle></CardHeader>
          <CardContent className="p-0 space-y-4">
            <div className="px-6 pt-4">
              <TableSearch placeholder="Buscar en historial..." value={historialControls.search} onChange={historialControls.handleSearch} />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Socio</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historialPaginated.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{fmtFecha(m.fecha)}</TableCell>
                    <TableCell>{m.socioNombre}</TableCell>
                    <TableCell><span className={m.tipo === "Ingreso" ? "text-green-600" : "text-red-600"}>{m.tipo}</span></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{m.notas || "—"}</TableCell>
                    <TableCell className="text-right font-semibold">${Number(m.monto).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="px-6 pb-4">
              <TablePagination page={historialControls.page} totalItems={historialFiltered.length} pageSize={PAGE_SIZE} onPageChange={historialControls.setPage} label="movimientos" />
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={movOpen} onOpenChange={setMovOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{movTipo === "ingreso" ? "Registrar Ingreso" : "Registrar Retiro"} — {selectedSocio?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div><Label>Monto</Label><Input type="number" min="0.01" step="0.01" value={movForm.monto} onChange={(e) => setMovForm({ ...movForm, monto: e.target.value })} /></div>
            <div><Label>Fecha</Label><Input type="date" value={movForm.fecha} onChange={(e) => setMovForm({ ...movForm, fecha: e.target.value })} /></div>
            <div><Label>Notas</Label><Input value={movForm.notas} onChange={(e) => setMovForm({ ...movForm, notas: e.target.value })} /></div>
            {selectedSocio && movTipo === "retiro" && (
              <p className="text-sm text-muted-foreground">Saldo disponible: ${Number(selectedSocio.saldo).toLocaleString()}</p>
            )}
            <Button onClick={handleMovimiento}>Confirmar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
