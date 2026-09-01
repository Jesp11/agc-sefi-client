import { imprimirDocumentoHtml } from "@/lib/document-templates";

export interface GenerarReporteCumpleanosPdfOptions {
  mesNombre: string;
  mesNumero: number;
  anio: number;
  clientes: any[];
  kpis: {
    total: number;
    cumplenHoy: number;
    porCumplir: number;
    cumplidos: number;
  };
  filtroAsesor?: string;
  filtroBusqueda?: string;
}

export function exportarCumpleanosPdf({
  mesNombre,
  mesNumero,
  anio,
  clientes,
  kpis,
  filtroAsesor,
  filtroBusqueda,
}: GenerarReporteCumpleanosPdfOptions): void {
  const fecha = new Date().toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const hora = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  const rowsHtml = clientes.map((c, idx) => {
    const telFormatted = c.telefono ? (function(t: string) {
      const d = String(t).replace(/\.0+$/, "").replace(/\D/g, "");
      if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
      return t;
    })(c.telefono) : "—";

    return `
      <tr class="${idx % 2 === 0 ? "row-even" : "row-odd"}">
        <td class="col-center font-bold text-primary" style="font-size: 9pt;">${c.dia}</td>
        <td>
          <div class="font-bold text-foreground">${c.nombre_completo}</div>
          <div class="text-muted" style="font-size: 6.8pt;">ID: ${c.id_cliente} ${c.grupo ? `· Grupo: ${c.grupo}` : ""}</div>
        </td>
        <td class="col-center">
          ${c.edad ? `<strong>${c.edad} años</strong>` : "—"}
        </td>
        <td class="col-center font-mono">
          ${telFormatted}
        </td>
        <td>
          ${c.asesor?.nombre_asesor || "—"}
        </td>
      </tr>
    `;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Reporte de Cumpleaños — ${mesNombre.toUpperCase()} ${anio} — AGC SEFI</title>
  <style>
    @page {
      size: letter portrait;
      margin: 1.2cm 1.4cm 1.4cm 1.4cm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #ffffff;
      color: #0f172a;
      font-size: 8pt;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .report-container {
      width: 100%;
      margin: 0 auto;
    }
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2.5px solid #0f4a3d;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header-logo {
      height: 48px;
      width: auto;
      object-fit: contain;
    }
    .company-title {
      font-size: 13pt;
      font-weight: 800;
      color: #0f4a3d;
      letter-spacing: 0.5px;
      line-height: 1.1;
    }
    .company-sub {
      font-size: 7.5pt;
      color: #64748b;
      letter-spacing: 0.3px;
      margin-top: 2px;
      font-weight: 600;
    }
    .report-title-badge {
      display: inline-block;
      margin-top: 4px;
      background: #0f4a3d;
      color: #ffffff;
      font-size: 7.5pt;
      font-weight: 700;
      letter-spacing: 0.5px;
      padding: 2px 8px;
      border-radius: 3px;
      text-transform: uppercase;
    }
    .header-right {
      text-align: right;
      font-size: 7pt;
      color: #334155;
      line-height: 1.5;
    }
    .header-right strong {
      color: #0f4a3d;
    }

    /* KPI Summary Cards */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .kpi-card {
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 6px 10px;
      background: #f8fafc;
    }
    .kpi-card.highlight {
      background: #fefce8;
      border-color: #fef08a;
    }
    .kpi-label {
      font-size: 6.5pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .kpi-value {
      font-size: 13pt;
      font-weight: 800;
      color: #0f4a3d;
      margin-top: 2px;
      line-height: 1;
    }
    .kpi-card.highlight .kpi-value {
      color: #b45309;
    }
    .kpi-sub {
      font-size: 6.5pt;
      color: #94a3b8;
      margin-top: 2px;
    }

    .filter-note {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 7pt;
      color: #065f46;
      margin-bottom: 12px;
    }

    /* Table */
    .report-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    .report-table thead th {
      background: #0f4a3d;
      color: #ffffff;
      font-size: 7pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      padding: 5px 6px;
      text-align: left;
      border: 1px solid #0f4a3d;
    }
    .report-table tbody td {
      padding: 4.5px 6px;
      font-size: 7.2pt;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    .row-even { background: #ffffff; }
    .row-odd { background: #f8fafc; }

    .col-center { text-align: center; }
    .text-primary { color: #0f4a3d; }
    .text-muted { color: #64748b; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .font-bold { font-weight: 700; }

    .badge {
      display: inline-block;
      padding: 1.5px 5px;
      border-radius: 3px;
      font-size: 6.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.2px;
      white-space: nowrap;
    }
    .badge-today {
      background: #fef08a;
      color: #854d0e;
      border: 1px solid #facc15;
    }
    .badge-upcoming {
      background: #dbeafe;
      color: #1e40af;
      border: 1px solid #bfdbfe;
    }
    .badge-passed {
      background: #f1f5f9;
      color: #64748b;
      border: 1px solid #e2e8f0;
    }
    .badge-neutral {
      background: #f8fafc;
      color: #475569;
      border: 1px solid #cbd5e1;
    }

    .grand-total-row td {
      background: #0f4a3d !important;
      color: #ffffff !important;
      padding: 6px 8px !important;
      font-size: 7.8pt;
      border: 1.5px solid #0f4a3d !important;
    }

    .report-footer {
      margin-top: 10px;
      padding-top: 6px;
      border-top: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      font-size: 6.5pt;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="report-container">
    <header class="report-header">
      <div class="header-left">
        <img src="/logo.png" alt="AGC SEFI" class="header-logo" onerror="this.style.display='none'" />
        <div>
          <h1 class="company-title">AGC SERVICIOS FINANCIEROS</h1>
          <p class="company-sub">SISTEMA INTEGRAL DE CONTROL Y GESTIÓN DE CARTERA</p>
          <div class="report-title-badge">CUMPLEAÑEROS DEL MES — ${mesNombre.toUpperCase()} ${anio}</div>
        </div>
      </div>
      <div class="header-right">
        <div><strong>Fecha de emisión:</strong> ${fecha}</div>
        <div><strong>Hora:</strong> ${hora}</div>
        <div><strong>Total cumpleañeros:</strong> ${kpis.total}</div>
      </div>
    </header>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total en ${mesNombre}</div>
        <div class="kpi-value">${kpis.total}</div>
        <div class="kpi-sub">Clientes registrados</div>
      </div>
      <div class="kpi-card ${kpis.cumplenHoy > 0 ? "highlight" : ""}">
        <div class="kpi-label">Cumplen Hoy</div>
        <div class="kpi-value">${kpis.cumplenHoy}</div>
        <div class="kpi-sub">${kpis.cumplenHoy > 0 ? "¡Felicitar hoy!" : "Sin cumpleaños hoy"}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Por Cumplir</div>
        <div class="kpi-value">${kpis.porCumplir}</div>
        <div class="kpi-sub">Próximos días del mes</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Ya Celebrados</div>
        <div class="kpi-value">${kpis.cumplidos}</div>
        <div class="kpi-sub">Días transcurridos</div>
      </div>
    </div>

    ${filtroAsesor || filtroBusqueda ? `
      <div class="filter-note">
        <strong>Filtros aplicados:</strong>
        ${filtroAsesor ? ` Gestor: <strong>${filtroAsesor}</strong> · ` : ""}
        ${filtroBusqueda ? ` Búsqueda: <strong>"${filtroBusqueda}"</strong>` : ""}
      </div>
    ` : ""}

    <table class="report-table">
      <thead>
        <tr>
          <th style="width: 40px; text-align: center;">Día</th>
          <th>Cliente</th>
          <th style="width: 75px; text-align: center;">Edad</th>
          <th style="width: 110px; text-align: center;">Contacto</th>
          <th style="width: 150px;">Gestor Cobranza</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml.length > 0 ? rowsHtml : `
          <tr>
            <td colspan="5" class="col-center text-muted" style="padding: 20px;">
              No se encontraron clientes que cumplan años en ${mesNombre} con los filtros seleccionados.
            </td>
          </tr>
        `}
        <tr class="grand-total-row">
          <td colspan="2"><strong>TOTAL DEL MES DE ${mesNombre.toUpperCase()}</strong></td>
          <td class="col-center"><strong>${clientes.length}</strong></td>
          <td colspan="2"><strong>${clientes.length === 1 ? "1 cliente cumpleañero" : `${clientes.length} clientes cumpleañeros`}</strong></td>
        </tr>
      </tbody>
    </table>

    <footer class="report-footer">
      <div>Reporte de fidelización y seguimiento a clientes — Generado por Sistema SEFI</div>
      <div>Página 1 de 1</div>
    </footer>
  </div>
</body>
</html>`;

  imprimirDocumentoHtml(html);
}
