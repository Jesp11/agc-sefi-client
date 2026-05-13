"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/api";
import { BookOpen, User, Users, Info, DollarSign } from "lucide-react";

export default function CatalogosPage() {
  const [indCat, setIndCat] = useState<any>(null);
  const [grpCat, setGrpCat] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [indRes, grpRes] = await Promise.all([
          apiFetch("/simular/catalogo/individual"),
          apiFetch("/simular/catalogo/grupal")
        ]);
        
        const indData = await indRes.json();
        const grpData = await grpRes.json();

        if (indRes.ok) setIndCat(indData);
        if (grpRes.ok) setGrpCat(grpData);
      } catch (error) {
        console.error("Error fetching catalogs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getRateInfo = (key: string) => {
    const info: any = {
      'TCIN21': { name: 'Tasa Normal', annual: 21 },
      'TCIP18': { name: 'Tasa Preferencial', annual: 18 },
      'TCIPE14': { name: 'Tasa Preferencial Especial', annual: 14 },
      'TCIPV10': { name: 'Tasa VIP', annual: 10 },
      'TCGN10': { name: 'Grupo Normal', annual: 10 },
      'TCGP07': { name: 'Grupo Preferencial', annual: 7 },
      'TCGPE04': { name: 'Grupo Especial', annual: 4 },
      'TCGPEV01': { name: 'Grupo VIP', annual: 1 },
      'TCGEC00': { name: 'Grupo Exclusivo (Cero)', annual: 0 },
    };
    return info[key] || { name: key, annual: 0 };
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Cargando catálogos oficiales...</div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <BookOpen className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasas y Plazos</h1>
          <p className="text-muted-foreground">Configuración de factores y montos del Motor de Crédito.</p>
        </div>
      </div>

      <Tabs defaultValue="individual" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="individual">
            <User className="mr-2 h-4 w-4" /> Individual
          </TabsTrigger>
          <TabsTrigger value="grupal">
            <Users className="mr-2 h-4 w-4" /> Grupal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Orígenes Permitidos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {indCat?.origenes?.map((o: string) => (
                    <span key={o} className="bg-primary/10 text-primary text-[10px] px-2 py-1 rounded-full font-bold uppercase">{o}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Monto Mínimo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${indCat?.monto_minimo?.toLocaleString()}</div>
                <p className="text-[10px] text-muted-foreground">Válido para Ciclo 0</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Tipo de Pago</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Semanal</div>
                <p className="text-[10px] text-muted-foreground">Frecuencia SEFI</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Matriz de Tasas Individuales</CardTitle>
              <CardDescription>Factores de pago semanal por cada $1,000 autorizados.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Identificador</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-center">Tasa Anual</TableHead>
                    <TableHead className="text-right">Factor 12 sem</TableHead>
                    <TableHead className="text-right">Factor 14 sem</TableHead>
                    <TableHead className="text-right">Factor 16 sem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {indCat?.tasas && Object.entries(indCat.tasas).map(([key, val]: [string, any]) => (
                    <TableRow key={key}>
                      <TableCell className="font-mono text-xs font-bold">{key}</TableCell>
                      <TableCell className="text-xs">{getRateInfo(key).name}</TableCell>
                      <TableCell className="text-center font-bold text-primary">{getRateInfo(key).annual}%</TableCell>
                      <TableCell className="text-right">${val[12] || "-"}</TableCell>
                      <TableCell className="text-right">${val[14] || "-"}</TableCell>
                      <TableCell className="text-right">${val[16] || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grupal" className="mt-6 space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Montos Mínimos por Origen</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    {grpCat?.montos_minimos && Object.entries(grpCat.montos_minimos).map(([o, m]: [string, any]) => (
                      <TableRow key={o}>
                        <TableCell className="uppercase text-xs font-bold">{o}</TableCell>
                        <TableCell className="text-right font-bold">${m.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card className="bg-primary/5">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="h-4 w-4" /> Regla de Grupos
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2">
                <p>• Los grupos en Ciclo 0 no pueden exceder el monto mínimo de su origen.</p>
                <p>• El sistema asigna automáticamente la tasa según el ciclo y comportamiento grupal.</p>
                <p>• Todos los integrantes comparten el mismo día de pago y asesor.</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Matriz de Tasas Grupales</CardTitle>
              <CardDescription>Factores preferenciales para grupos de crédito.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Tasa</TableHead>
                    <TableHead>Nivel</TableHead>
                    <TableHead className="text-center">Tasa Anual</TableHead>
                    <TableHead className="text-right">Factor 14 sem</TableHead>
                    <TableHead className="text-right">Factor 16 sem</TableHead>
                    <TableHead className="text-right">Factor 18 sem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grpCat?.tasas && Object.entries(grpCat.tasas).map(([key, val]: [string, any]) => (
                    <TableRow key={key}>
                      <TableCell className="font-mono text-xs font-bold">{key}</TableCell>
                      <TableCell className="text-xs uppercase">{getRateInfo(key).name}</TableCell>
                      <TableCell className="text-center font-bold text-primary">{getRateInfo(key).annual}%</TableCell>
                      <TableCell className="text-right">${val[14] || "-"}</TableCell>
                      <TableCell className="text-right">${val[16] || "-"}</TableCell>
                      <TableCell className="text-right">${val[18] || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
