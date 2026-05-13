"use client";

import { useState, useEffect } from "react";
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
import { PlusCircle, Search } from "lucide-react";

export default function ReferenciasPage() {
  const [referencias, setReferencias] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setReferencias([
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Referencias</h1>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nueva Referencia
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar referencias..." className="max-w-sm" />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Cliente Relacionado</TableHead>
              <TableHead>Nombre Referencia</TableHead>
              <TableHead>Relación</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Cargando referencias...
                </TableCell>
              </TableRow>
            ) : referencias.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No hay referencias registradas.
                </TableCell>
              </TableRow>
            ) : (
              referencias.map((ref: any) => (
                <TableRow key={ref.id}>
                  <TableCell>{ref.id}</TableCell>
                  <TableCell>{ref.cliente}</TableCell>
                  <TableCell className="font-medium">{ref.nombre}</TableCell>
                  <TableCell>{ref.relacion}</TableCell>
                  <TableCell>{ref.telefono}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm">Editar</Button>
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
