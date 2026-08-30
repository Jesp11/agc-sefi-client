"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { isFieldRoleName, isAdminRoleName } from "@/lib/authz";
import { apiFetch } from "@/lib/api";
import {
  Search,
  Users,
  User,
  Component,
  LayoutList,
  AlertTriangle,
  UserX,
  FileText,
  BarChart3,
  TrendingUp,
  Receipt,
  Banknote,
  PiggyBank,
  CalendarDays,
  ArrowLeftRight,
  UserCircle,
  ClipboardList,
  Shield,
  PlusCircle,
  CreditCard,
  Phone,
  Sparkles,
  Command,
  CornerDownLeft,
  X,
  Loader2,
  FolderOpen,
  CheckCircle2,
} from "lucide-react";

interface SearchItem {
  id: string;
  type: "module" | "action" | "cliente" | "credito" | "grupo" | "asesor" | "inversionista";
  title: string;
  subtitle?: string;
  category: string;
  url: string;
  icon: any;
  badge?: string;
  badgeVariant?: "default" | "destructive" | "outline" | "secondary" | "success" | "warning";
  onClick?: () => void;
  keywords?: string[];
  adminOnly?: boolean;
}

const STATIC_NAVIGATION_ITEMS: Omit<SearchItem, "onClick">[] = [
  // Catálogos
  {
    id: "nav-alta-cliente",
    type: "module",
    title: "Alta de Clientes",
    subtitle: "Directorio general, captura y expedientes de clientes",
    category: "Catálogos",
    url: "/dashboard/clientes",
    icon: Users,
    keywords: ["cliente", "prospecto", "alta", "nuevo", "curp", "ine", "padron"],
  },
  {
    id: "nav-alta-grupo",
    type: "module",
    title: "Alta de Grupos",
    subtitle: "Administración y creación de grupos solidarios",
    category: "Catálogos",
    url: "/dashboard/grupos",
    icon: Component,
    keywords: ["grupo", "grupal", "solidario", "mesa", "comunal", "integrantes"],
  },
  {
    id: "nav-empleados",
    type: "module",
    title: "Empleados y Asesores",
    subtitle: "Directorio de personal operativo, asesores y comisiones",
    category: "Catálogos",
    url: "/dashboard/empleados",
    icon: UserCircle,
    keywords: ["empleado", "asesor", "personal", "trabajador", "nomina", "puesto"],
    adminOnly: true,
  },
  {
    id: "nav-catalogos",
    type: "module",
    title: "Tasas y Plazos",
    subtitle: "Configuración de tasas de interés, plazos y comisiones",
    category: "Catálogos",
    url: "/dashboard/catalogos",
    icon: ClipboardList,
    keywords: ["tasas", "plazos", "interes", "porcentajes", "catalogo", "configuracion"],
    adminOnly: true,
  },
  {
    id: "nav-avales",
    type: "module",
    title: "Directorio de Avales",
    subtitle: "Garantías y obligados solidarios de créditos",
    category: "Catálogos",
    url: "/dashboard/avales",
    icon: Shield,
    keywords: ["aval", "garantia", "obligado", "solidario", "contacto"],
  },
  {
    id: "nav-referencias",
    type: "module",
    title: "Referencias Personales",
    subtitle: "Contactos de referencia laboral y personal",
    category: "Catálogos",
    url: "/dashboard/referencias",
    icon: Phone,
    keywords: ["referencia", "contacto", "telefono", "familiar"],
  },

  // Carteras
  {
    id: "nav-cartera-general",
    type: "module",
    title: "Cartera General",
    subtitle: "Vista unificada de toda la cartera de créditos y saldos",
    category: "Carteras",
    url: "/dashboard/cartera-general",
    icon: LayoutList,
    keywords: ["cartera", "general", "todos", "creditos", "prestamos", "activos", "saldos"],
  },
  {
    id: "nav-cartera-individual",
    type: "module",
    title: "Cartera Individual",
    subtitle: "Gestión de créditos individuales y préstamos personales",
    category: "Carteras",
    url: "/dashboard/creditos-individuales",
    icon: User,
    keywords: ["individual", "credito", "prestamo", "personal", "cliente"],
  },
  {
    id: "nav-cartera-grupal",
    type: "module",
    title: "Cartera Grupal",
    subtitle: "Gestión de créditos grupales y solidarios",
    category: "Carteras",
    url: "/dashboard/creditos-grupales",
    icon: Component,
    keywords: ["grupal", "grupo", "solidario", "credito", "comunal"],
  },
  {
    id: "nav-cartera-mora",
    type: "module",
    title: "Cartera en Mora",
    subtitle: "Seguimiento a créditos con pagos vencidos o atrasados",
    category: "Carteras",
    url: "/dashboard/cartera-mora",
    icon: AlertTriangle,
    keywords: ["mora", "moroso", "atrasado", "vencido", "cobranza", "adeudo", "recuperacion"],
  },
  {
    id: "nav-cartera-cerrados",
    type: "module",
    title: "Clientes Cerrados",
    subtitle: "Historial de clientes liquidados, cancelados o concluidos",
    category: "Carteras",
    url: "/dashboard/cartera-cerrados",
    icon: UserX,
    keywords: ["cerrados", "liquidados", "finalizados", "concluidos", "antiguos", "inactivos"],
  },
  {
    id: "nav-cobros-dia",
    type: "module",
    title: "Cobros del Día",
    subtitle: "Ruta de cobranza y pagos programados para el día de hoy",
    category: "Carteras",
    url: "/dashboard/cobros-del-dia",
    icon: CalendarDays,
    keywords: ["cobros", "hoy", "dia", "cobranza", "ruta", "fichas", "abonos"],
  },

  // Contabilidad y Finanzas
  {
    id: "nav-inversionistas",
    type: "module",
    title: "Inversionistas",
    subtitle: "Control de socios capitalistas, rendimientos y aportaciones",
    category: "Contabilidad",
    url: "/dashboard/inversionistas",
    icon: TrendingUp,
    keywords: ["inversionista", "inversion", "rendimiento", "capital", "fondeo", "aportacion"],
    adminOnly: true,
  },
  {
    id: "nav-flujo-caja",
    type: "module",
    title: "Ingresos y Egresos (Flujo de Caja)",
    subtitle: "Entradas y salidas de efectivo, movimientos de cuentas",
    category: "Contabilidad",
    url: "/dashboard/flujo-caja",
    icon: ArrowLeftRight,
    keywords: ["flujo", "caja", "ingresos", "egresos", "dinero", "balance", "movimientos"],
    adminOnly: true,
  },
  {
    id: "nav-gastos",
    type: "module",
    title: "Gastos Operativos",
    subtitle: "Registro de gastos, compras de insumos y mantenimiento",
    category: "Contabilidad",
    url: "/dashboard/gastos",
    icon: Receipt,
    keywords: ["gasto", "operativo", "compra", "factura", "egreso", "costo"],
    adminOnly: true,
  },
  {
    id: "nav-nomina",
    type: "module",
    title: "Nómina",
    subtitle: "Dispersión, sueldos y recibos de pago a empleados",
    category: "Contabilidad",
    url: "/dashboard/nomina",
    icon: Banknote,
    keywords: ["nomina", "sueldo", "salario", "pago", "empleado", "percepciones"],
    adminOnly: true,
  },
  {
    id: "nav-ahorros-personal",
    type: "module",
    title: "Ahorro Personal",
    subtitle: "Fondo de ahorro acumulado del personal y asesores",
    category: "Contabilidad",
    url: "/dashboard/ahorros-personal",
    icon: PiggyBank,
    keywords: ["ahorro", "personal", "fondo", "empleado", "asesor", "retiro"],
    adminOnly: true,
  },
  {
    id: "nav-ahorros-socios",
    type: "module",
    title: "Ahorro Socios",
    subtitle: "Fondos y aportaciones de socios de la financiera",
    category: "Contabilidad",
    url: "/dashboard/ahorros-socios",
    icon: PiggyBank,
    keywords: ["ahorro", "socios", "capital", "fondo", "aportacion"],
    adminOnly: true,
  },
  {
    id: "nav-capital",
    type: "module",
    title: "Capital Social",
    subtitle: "Patrimonio financiero y balance de aportaciones",
    category: "Contabilidad",
    url: "/dashboard/capital",
    icon: Banknote,
    keywords: ["capital", "balance", "patrimonio", "socios", "fondos"],
    adminOnly: true,
  },

  // Reportes
  {
    id: "nav-rep-diario",
    type: "module",
    title: "Reporte Diario de Cobranza",
    subtitle: "Corte diario de caja y recepción de cartera por asesor",
    category: "Reportes",
    url: "/dashboard/reportes/diario",
    icon: CalendarDays,
    keywords: ["reporte", "diario", "corte", "caja", "cobranza", "recepcion"],
  },
  {
    id: "nav-rep-cartera",
    type: "module",
    title: "Reporte de Cartera",
    subtitle: "Informe integral de cartera activa, vencida y colocada",
    category: "Reportes",
    url: "/dashboard/reportes/cartera",
    icon: LayoutList,
    keywords: ["reporte", "cartera", "colocada", "saldo", "recuperacion"],
  },
  {
    id: "nav-rep-semanal",
    type: "module",
    title: "Global Mensual",
    subtitle: "Resumen operativo global y balance de colocación",
    category: "Reportes",
    url: "/dashboard/reportes/semanal",
    icon: FileText,
    keywords: ["reporte", "global", "mensual", "semanal", "balance", "resumen"],
  },
  {
    id: "nav-rep-gestor-mensual",
    type: "module",
    title: "Gestor Mensual",
    subtitle: "Rendimiento mensual y metas del gestor de cobranza",
    category: "Reportes",
    url: "/dashboard/reportes/gestor-mensual",
    icon: CalendarDays,
    keywords: ["gestor", "mensual", "metas", "efectividad", "cobranza"],
  },
  {
    id: "nav-rep-inversionistas-estado",
    type: "module",
    title: "Estado Financiero",
    subtitle: "Balance de situación financiera para inversionistas",
    category: "Reportes",
    url: "/dashboard/reportes/inversionistas-estado",
    icon: TrendingUp,
    keywords: ["estado financiero", "inversionistas", "balance", "ganancias"],
    adminOnly: true,
  },
  {
    id: "nav-rep-cierre-mensual",
    type: "module",
    title: "Cierre Mensual",
    subtitle: "Balance contable consolidado al cierre de mes",
    category: "Reportes",
    url: "/dashboard/reportes/cierre-mensual",
    icon: BarChart3,
    keywords: ["cierre mensual", "contabilidad", "utilidad", "perdida", "mes"],
    adminOnly: true,
  },

  // Acciones y Sistema
  {
    id: "action-nuevo-credito-ind",
    type: "action",
    title: "Otorgar Crédito Individual",
    subtitle: "Ir al formulario de nuevo crédito individual",
    category: "Acciones Rápidas",
    url: "/dashboard/creditos-individuales",
    icon: PlusCircle,
    keywords: ["nuevo", "credito", "individual", "crear", "otorgar", "simular"],
  },
  {
    id: "action-nuevo-credito-grup",
    type: "action",
    title: "Otorgar Crédito Grupal",
    subtitle: "Ir al formulario de nuevo crédito grupal solidario",
    category: "Acciones Rápidas",
    url: "/dashboard/creditos-grupales",
    icon: PlusCircle,
    keywords: ["nuevo", "credito", "grupal", "grupo", "crear", "otorgar"],
  },
  {
    id: "action-alta-cliente",
    type: "action",
    title: "Dar de Alta Cliente",
    subtitle: "Formulario de registro para un nuevo cliente",
    category: "Acciones Rápidas",
    url: "/dashboard/clientes",
    icon: PlusCircle,
    keywords: ["alta", "nuevo", "cliente", "capturar"],
  },
  {
    id: "action-alta-grupo",
    type: "action",
    title: "Crear Nuevo Grupo",
    subtitle: "Formulario de creación de un nuevo grupo",
    category: "Acciones Rápidas",
    url: "/dashboard/grupos",
    icon: PlusCircle,
    keywords: ["alta", "nuevo", "grupo", "crear"],
  },
  {
    id: "sys-perfil",
    type: "module",
    title: "Mi Perfil y Seguridad",
    subtitle: "Ver datos de cuenta y cambiar contraseña",
    category: "Sistema",
    url: "/dashboard/perfil",
    icon: User,
    keywords: ["perfil", "cuenta", "contraseña", "password", "seguridad", "usuario"],
  },
];

export function GlobalSearchDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isMac, setIsMac] = useState(false);

  const [dbResults, setDbResults] = useState<{
    clientes: any[];
    creditos: any[];
    grupos: any[];
    asesores: any[];
    inversionistas: any[];
  }>({
    clientes: [],
    creditos: [],
    grupos: [],
    asesores: [],
    inversionistas: [],
  });
  const [isSearchingDb, setIsSearchingDb] = useState(false);

  const router = useRouter();
  const { user } = useAuth();
  const isAsesor = isFieldRoleName(user?.role?.nombre);
  const isAdmin = isAdminRoleName(user?.role?.nombre);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Detect OS for shortcut display
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isApple = /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent || navigator.platform);
      setIsMac(isApple);
    }
  }, []);

  // Global shortcut listener: Ctrl + Space (or Cmd + Space) & Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Trigger with Ctrl + Space, Cmd + Space, or Ctrl/Cmd + K
      const isSpace = e.code === "Space" || e.key === " " || e.keyCode === 32;
      const isK = e.key.toLowerCase() === "k";

      if ((e.ctrlKey || e.metaKey) && (isSpace || isK)) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      setSelectedIndex(0);
    } else {
      setQuery("");
      setDbResults({
        clientes: [],
        creditos: [],
        grupos: [],
        asesores: [],
        inversionistas: [],
      });
    }
  }, [isOpen]);

  // Live database search with debounce
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setDbResults({
        clientes: [],
        creditos: [],
        grupos: [],
        asesores: [],
        inversionistas: [],
      });
      setIsSearchingDb(false);
      return;
    }

    setIsSearchingDb(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch(`/busqueda-global?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          setDbResults({
            clientes: data.clientes || [],
            creditos: data.creditos || [],
            grupos: data.grupos || [],
            asesores: data.asesores || [],
            inversionistas: data.inversionistas || [],
          });
        }
      } catch (err) {
        console.error("Error en búsqueda global:", err);
      } finally {
        setIsSearchingDb(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Filter static items by role & search query
  const staticItems = useMemo(() => {
    let list = STATIC_NAVIGATION_ITEMS;
    if (isAsesor) {
      list = list.filter((item) => !item.adminOnly);
    }

    const q = query.toLowerCase().trim();
    if (!q) return list;

    const terms = q.split(/\s+/).filter(Boolean);

    return list.filter((item) => {
      const matchText = `${item.title} ${item.subtitle || ""} ${item.category} ${(item.keywords || []).join(" ")}`.toLowerCase();
      return terms.every((term) => matchText.includes(term));
    });
  }, [query, isAsesor]);

  // Transform dynamic DB results into SearchItem list
  const dynamicItems = useMemo(() => {
    const items: SearchItem[] = [];

    // Clientes
    dbResults.clientes.forEach((c) => {
      items.push({
        id: `cliente-${c.id_cliente}`,
        type: "cliente",
        title: c.nombre_completo,
        subtitle: `CURP: ${c.curp || "S/D"} • Tel: ${c.telefono || "S/D"}${c.asesor ? ` • Asesor: ${c.asesor}` : ""}`,
        category: "Clientes",
        url: `/dashboard/clientes/${c.id_cliente}`,
        icon: User,
        badge: c.estatus || "Cliente",
        badgeVariant: c.estatus === "Activo" ? "success" : c.estatus === "Cerrado" ? "destructive" : "secondary",
      });
    });

    // Créditos
    dbResults.creditos.forEach((cr) => {
      const targetName = cr.nombre_cliente || cr.nombre_grupo || "Sin titular";
      const totalFmt = Number(cr.monto_otorgado || cr.total || 0).toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN",
      });
      items.push({
        id: `credito-${cr.num_prog}`,
        type: "credito",
        title: `Crédito #${cr.num_prog} — ${targetName}`,
        subtitle: `Monto: ${totalFmt} • Tipo: ${cr.tipo_credito || "Crédito"} • Ciclo: ${cr.ciclo || 1}`,
        category: "Créditos",
        url: `/dashboard/creditos/${cr.num_prog}`,
        icon: CreditCard,
        badge: cr.estado || "Activo",
        badgeVariant: cr.estado === "EnMora" ? "destructive" : cr.estado === "Activo" ? "success" : "outline",
      });
    });

    // Grupos
    dbResults.grupos.forEach((g) => {
      items.push({
        id: `grupo-${g.id}`,
        type: "grupo",
        title: `Grupo: ${g.nombre_grupo}`,
        subtitle: `${g.total_clientes ?? 0} integrante(s) registrados`,
        category: "Grupos",
        url: `/dashboard/grupos/${g.id}`,
        icon: Component,
        badge: "Grupo",
        badgeVariant: "secondary",
      });
    });

    // Asesores
    dbResults.asesores.forEach((a) => {
      items.push({
        id: `asesor-${a.id_asesor}`,
        type: "asesor",
        title: `Asesor: ${a.nombre_asesor}`,
        subtitle: `Rol: ${a.rol_laboral || "Asesor"} • Tel: ${a.telefono || "S/D"}`,
        category: "Personal y Asesores",
        url: `/dashboard/asesores/${a.id_asesor}`,
        icon: UserCircle,
        badge: "Personal",
        badgeVariant: "outline",
      });
    });

    // Inversionistas
    dbResults.inversionistas.forEach((inv) => {
      items.push({
        id: `inv-${inv.id}`,
        type: "inversionista",
        title: `Inversionista: ${inv.nombre}`,
        subtitle: `Contacto: ${inv.contacto || "S/D"} • Tel: ${inv.telefono || "S/D"}`,
        category: "Inversionistas",
        url: `/dashboard/inversionistas`,
        icon: TrendingUp,
        badge: inv.activo ? "Activo" : "Inactivo",
        badgeVariant: inv.activo ? "success" : "secondary",
      });
    });

    return items;
  }, [dbResults]);

  // Combined and filtered items
  const allFilteredItems = useMemo(() => {
    let combined: SearchItem[] = [];

    if (query.trim().length >= 2) {
      // Prioritize live entities when searching specifics, followed by navigation
      combined = [...dynamicItems, ...staticItems];
    } else {
      combined = [...staticItems];
    }

    if (selectedFilter === "all") return combined;
    if (selectedFilter === "clientes") return combined.filter((i) => i.type === "cliente");
    if (selectedFilter === "creditos") return combined.filter((i) => i.type === "credito");
    if (selectedFilter === "grupos") return combined.filter((i) => i.type === "grupo");
    if (selectedFilter === "modulos") return combined.filter((i) => i.type === "module");
    if (selectedFilter === "reportes") return combined.filter((i) => i.category === "Reportes");
    if (selectedFilter === "acciones") return combined.filter((i) => i.type === "action");

    return combined;
  }, [staticItems, dynamicItems, query, selectedFilter]);

  // Reset selected index if list length changes
  useEffect(() => {
    if (selectedIndex >= allFilteredItems.length) {
      setSelectedIndex(Math.max(0, allFilteredItems.length - 1));
    }
  }, [allFilteredItems, selectedIndex]);

  // Scroll active item into view
  useEffect(() => {
    const el = itemRefs.current.get(selectedIndex);
    if (el) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  // Navigate / execute action
  const handleSelectItem = useCallback((item: SearchItem) => {
    setIsOpen(false);
    if (item.onClick) {
      item.onClick();
    } else if (item.url) {
      router.push(item.url);
    }
  }, [router]);

  // Keyboard navigation inside dialog
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < allFilteredItems.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : allFilteredItems.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (allFilteredItems[selectedIndex]) {
        handleSelectItem(allFilteredItems[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  // Group items by category for nice visual sections
  const groupedItems = useMemo(() => {
    const groups: { [key: string]: { item: SearchItem; globalIndex: number }[] } = {};
    allFilteredItems.forEach((item, index) => {
      const cat = item.category || "Otros";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push({ item, globalIndex: index });
    });
    return groups;
  }, [allFilteredItems]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-xs p-4 pt-16 sm:pt-24 animate-in fade-in duration-150"
      onClick={() => setIsOpen(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-200/80 flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header & Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 bg-gray-50/50">
          <Search className="size-5 text-red-600 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Buscar clientes, créditos, módulos, reportes..."
            className="flex-1 bg-transparent text-base text-gray-900 placeholder:text-gray-400 outline-none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />
          {isSearchingDb && (
            <Loader2 className="size-4 animate-spin text-red-600 shrink-0" />
          )}
          {query && (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors"
              title="Limpiar búsqueda"
            >
              <X className="size-4" />
            </button>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs font-mono font-medium text-gray-500 bg-gray-200/70 rounded border border-gray-300/80"
          >
            ESC
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-gray-50/80 border-b border-gray-100 overflow-x-auto no-scrollbar text-xs">
          {[
            { id: "all", label: "Todo" },
            { id: "clientes", label: "Clientes", count: dbResults.clientes.length },
            { id: "creditos", label: "Créditos", count: dbResults.creditos.length },
            { id: "grupos", label: "Grupos", count: dbResults.grupos.length },
            { id: "modulos", label: "Módulos" },
            { id: "reportes", label: "Reportes" },
            { id: "acciones", label: "Acciones" },
          ].map((pill) => {
            const isActive = selectedFilter === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => {
                  setSelectedFilter(pill.id);
                  setSelectedIndex(0);
                }}
                className={`px-2.5 py-1 rounded-full font-medium transition-all shrink-0 ${
                  isActive
                    ? "bg-red-600 text-white shadow-xs"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {pill.label}
                {pill.count !== undefined && pill.count > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive ? "bg-white/25 text-white" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {pill.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 divide-y divide-gray-100/60"
        >
          {allFilteredItems.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <FolderOpen className="size-10 text-gray-300 mx-auto mb-3 stroke-[1.5]" />
              <p className="text-sm font-semibold text-gray-700">
                No se encontraron resultados para &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Intenta buscar por nombre de cliente, CURP, folio de crédito, grupo o el nombre de un módulo del sistema.
              </p>
            </div>
          ) : (
            Object.entries(groupedItems).map(([category, items]) => (
              <div key={category} className="py-1.5 first:pt-0 last:pb-0">
                <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gray-600 flex items-center justify-between">
                  <span>{category}</span>
                  <span className="text-[10px] font-normal text-gray-600">
                    {items.length} {items.length === 1 ? "resultado" : "resultados"}
                  </span>
                </div>
                <div className="mt-1 space-y-0.5">
                  {items.map(({ item, globalIndex }) => {
                    const isSelected = selectedIndex === globalIndex;
                    const IconComponent = item.icon || Sparkles;

                    return (
                      <div
                        key={item.id}
                        ref={(el) => {
                          if (el) itemRefs.current.set(globalIndex, el);
                          else itemRefs.current.delete(globalIndex);
                        }}
                        onClick={() => handleSelectItem(item)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={`group flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                          isSelected
                            ? "bg-red-50 text-red-950 ring-1 ring-red-300"
                            : "hover:bg-gray-50 text-gray-800"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className={`flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                              isSelected
                                ? "bg-red-600 text-white shadow-xs"
                                : "bg-gray-100 text-gray-600 group-hover:bg-red-100 group-hover:text-red-700"
                            }`}
                          >
                            <IconComponent className="size-4.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold truncate">
                                {item.title}
                              </p>
                              {item.badge && (
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    item.badgeVariant === "success"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : item.badgeVariant === "destructive"
                                      ? "bg-rose-100 text-rose-800"
                                      : "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            {item.subtitle && (
                              <p className="text-xs text-gray-500 truncate mt-0.5">
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action hint / enter icon */}
                        <div className="flex items-center gap-1 text-gray-400 shrink-0">
                          {isSelected ? (
                            <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                              Abrir
                              <CornerDownLeft className="size-3.5" />
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
                              Ir
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono text-[10px] shadow-2xs">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono text-[10px] shadow-2xs">↓</kbd>
              Navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono text-[10px] shadow-2xs">↵</kbd>
              Seleccionar
            </span>
            <span className="hidden sm:inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono text-[10px] shadow-2xs">ESC</kbd>
              Cerrar
            </span>
          </div>

          <div className="flex items-center gap-1 text-gray-400">
            <span>Acceso rápido:</span>
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono text-[10px] text-gray-600 font-medium shadow-2xs">
              {isMac ? "⌘ + Espacio" : "Ctrl + Espacio"}
            </kbd>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Trigger button for Header & Topbars */
export function SearchTriggerButton({ className = "" }: { className?: string }) {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isApple = /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent || navigator.platform);
      setIsMac(isApple);
    }
  }, []);

  const openSearch = () => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: " ",
        code: "Space",
        ctrlKey: true,
        metaKey: true,
        bubbles: true,
      })
    );
  };

  return (
    <button
      onClick={openSearch}
      className={`group relative flex items-center justify-between gap-3 px-3 py-1.5 text-xs text-white/80 bg-white/10 hover:bg-white/15 hover:text-white border border-white/10 rounded-lg transition-all shadow-xs ${className}`}
      title="Buscar (Ctrl + Espacio)"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Search className="size-3.5 text-white/70 group-hover:text-white transition-colors shrink-0" />
        <span className="truncate hidden sm:inline">Buscar clientes, créditos, módulos...</span>
        <span className="truncate sm:hidden">Buscar...</span>
      </div>
      <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-white/70 bg-black/20 group-hover:bg-black/30 group-hover:text-white rounded border border-white/10 transition-colors">
        {isMac ? "⌘ Espacio" : "Ctrl Espacio"}
      </kbd>
    </button>
  );
}
