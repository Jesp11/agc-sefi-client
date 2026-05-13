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

export default function AvalesPage() {
  const [avales, setAvales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setAvales([
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Avales</h1>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nuevo Aval
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar avales..." className="max-w-sm" />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Cliente (Titular)</TableHead>
              <TableHead>Nombre Aval</TableHead>
              <TableHead>RFC</TableHead>
              <TableHead>Ingresos Comprobables</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Cargando avales...
                </TableCell>
              </TableRow>
            ) : avales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No hay avales registrados.
                </TableCell>
              </TableRow>
            ) : (
              avales.map((aval: any) => (
                <TableRow key={aval.id}>
                  <TableCell>{aval.id}</TableCell>
                  <TableCell>{aval.cliente}</TableCell>
                  <TableCell className="font-medium">{aval.nombre}</TableCell>
                  <TableCell>{aval.rfc}</TableCell>
                  <TableCell>{aval.ingresos}</TableCell>
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
