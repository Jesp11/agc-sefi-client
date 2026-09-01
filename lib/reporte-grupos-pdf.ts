import { imprimirDocumentoHtml } from "@/lib/document-templates";

export interface GenerarReporteGruposPdfOptions {
  grupos: any[];
  search?: string;
}

export function exportarGruposPdf({ grupos, search }: GenerarReporteGruposPdfOptions): void {
  const fecha = new Date().toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const hora = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  const totalGrupos = grupos.length;
  const totalIntegrantes = grupos.reduce((acc, g) => acc + (g.clientes?.length || g.total_integrantes || 0), 0);
  const totalConAsesor = grupos.filter((g) => g.asesor?.nombre_asesor || g.nombre_asesor).length;
  const totalPreferenciales = grupos.filter((g) => g.es_socio_preferencial === true || g.es_socio_preferencial === "Sí").length;

  // Agrupación por Gestor / Asesor
  const asesorGroupsMap = new Map<string, { asesorNombre: string; grupos: any[] }>();

  grupos.forEach((g) => {
    const asesorNombre = (g.asesor?.nombre_asesor || g.nombre_asesor || "SIN GESTOR ASIGNADO").trim().toUpperCase();
    if (!asesorGroupsMap.has(asesorNombre)) {
      asesorGroupsMap.set(asesorNombre, { asesorNombre, grupos: [] });
    }
    asesorGroupsMap.get(asesorNombre)!.grupos.push(g);
  });

  const asesorGroups = Array.from(asesorGroupsMap.values()).sort((a, b) =>
    a.asesorNombre.localeCompare(b.asesorNombre)
  );

  let rowsHtml = "";

  asesorGroups.forEach((ag) => {
    const totalGrupoIntegrantes = ag.grupos.reduce(
      (acc, g) => acc + (g.clientes?.length || g.total_integrantes || 0),
      0
    );

    // Encabezado por Gestor
    rowsHtml += `
      <tr class="advisor-header-row">
        <td colspan="6">
          <div class="advisor-header-content">
            <span class="advisor-name">👤 GESTOR: ${ag.asesorNombre}</span>
            <span class="advisor-stats">
              <strong>${ag.grupos.length}</strong> ${ag.grupos.length === 1 ? "grupo" : "grupos"} &nbsp;|&nbsp;
              <strong>${totalGrupoIntegrantes}</strong> integrantes en total
            </span>
          </div>
        </td>
      </tr>
    `;

    ag.grupos.forEach((g, idx) => {
      const idStr = `#${g.id_grupo || g.id}`;
      const nombreGrupo = g.nombre_grupo || "—";
      const countClientes = g.clientes?.length ?? g.total_integrantes ?? 0;

      let nombresClientes = "—";
      if (Array.isArray(g.clientes) && g.clientes.length > 0) {
        nombresClientes = g.clientes.map((c: any) => c.nombre_completo || c.nombre || "—").join(", ");
      } else if (typeof g.integrantes === "string" && g.integrantes.trim()) {
        nombresClientes = g.integrantes;
      }

      const esPref = g.es_socio_preferencial === true || g.es_socio_preferencial === "Sí";

      let fechaAlta = "—";
      if (g.created_at) {
        try {
          const rawDate = typeof g.created_at === "string" ? g.created_at.split("T")[0] : "";
          if (rawDate) {
            const [y, m, d] = rawDate.split("-");
            fechaAlta = `${d}/${m}/${y}`;
          }
        } catch {
          fechaAlta = String(g.created_at);
        }
      }

      rowsHtml += `
        <tr class="${idx % 2 === 0 ? "row-even" : "row-odd"}">
          <td class="col-center font-mono font-bold text-primary">${idStr}</td>
          <td class="font-bold text-foreground">${nombreGrupo}</td>
          <td class="col-center">
            <span class="badge-count">${countClientes}</span>
          </td>
          <td class="col-integrantes">${nombresClientes}</td>
          <td class="col-center">
            <span class="badge ${esPref ? "badge-pref" : "badge-neutral"}">
              ${esPref ? "Socio Preferencial" : "Estándar"}
            </span>
          </td>
          <td class="col-center text-muted font-mono" style="font-size: 7pt;">${fechaAlta}</td>
        </tr>
      `;
    });
  });

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Catálogo de Grupos — AGC SEFI</title>
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
    /* Header */
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
      margin-bottom: 14px;
    }
    .kpi-card {
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 6px 10px;
      background: #f8fafc;
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
    .kpi-sub {
      font-size: 6.5pt;
      color: #94a3b8;
      margin-top: 2px;
    }

    /* Filter Note */
    .filter-note {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 7pt;
      color: #065f46;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Data Table */
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
      vertical-align: top;
    }
    .row-even { background: #ffffff; }
    .row-odd { background: #f8fafc; }

    .advisor-header-row td {
      background: #e6f7f2 !important;
      padding: 5px 8px;
      border: 1.5px solid #0f4a3d !important;
      border-top: 2px solid #0f4a3d !important;
    }
    .advisor-header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .advisor-name {
      font-size: 7.5pt;
      font-weight: 800;
      color: #0f4a3d;
      letter-spacing: 0.3px;
    }
    .advisor-stats {
      font-size: 7pt;
      color: #0f4a3d;
    }

    .col-center { text-align: center; }
    .text-primary { color: #0f4a3d; }
    .text-muted { color: #64748b; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .font-bold { font-weight: 700; }
    .col-integrantes {
      font-size: 6.8pt;
      color: #334155;
      max-width: 260px;
      line-height: 1.25;
    }

    .badge-count {
      display: inline-block;
      background: #e2e8f0;
      color: #1e293b;
      font-weight: 800;
      padding: 1px 6px;
      border-radius: 9999px;
      font-size: 7pt;
    }
    .badge {
      display: inline-block;
      padding: 1.5px 5px;
      border-radius: 3px;
      font-size: 6.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }
    .badge-pref {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
    }
    .badge-neutral {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #e2e8f0;
    }

    /* Grand Total Row */
    .grand-total-row td {
      background: #0f4a3d !important;
      color: #ffffff !important;
      padding: 6px 8px !important;
      font-size: 7.8pt;
      border: 1.5px solid #0f4a3d !important;
    }

    /* Signatures & Footer */
    .signatures-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 30px;
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    .signature-box {
      text-align: center;
    }
    .signature-line {
      border-top: 1px solid #475569;
      width: 80%;
      margin: 0 auto 6px auto;
    }
    .signature-title {
      font-size: 7pt;
      font-weight: 700;
      color: #0f4a3d;
      text-transform: uppercase;
    }
    .signature-sub {
      font-size: 6.5pt;
      color: #64748b;
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
    <!-- Header -->
    <header class="report-header">
      <div class="header-left">
        <img src="/logo.png" alt="AGC SEFI" class="header-logo" onerror="this.style.display='none'" />
        <div>
          <h1 class="company-title">AGC SERVICIOS FINANCIEROS</h1>
          <p class="company-sub">SISTEMA INTEGRAL DE CONTROL Y GESTIÓN DE CARTERA</p>
          <div class="report-title-badge">CATÁLOGO GENERAL DE GRUPOS</div>
        </div>
      </div>
      <div class="header-right">
        <div><strong>Fecha de emisión:</strong> ${fecha}</div>
        <div><strong>Hora:</strong> ${hora}</div>
        <div><strong>Total de grupos:</strong> ${totalGrupos}</div>
      </div>
    </header>

    <!-- Resumen Ejecutivo -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total de Grupos</div>
        <div class="kpi-value">${totalGrupos}</div>
        <div class="kpi-sub">Registrados en catálogo</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Integrantes</div>
        <div class="kpi-value">${totalIntegrantes}</div>
        <div class="kpi-sub">Clientes vinculados</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Con Gestor Asignado</div>
        <div class="kpi-value">${totalConAsesor}</div>
        <div class="kpi-sub">De ${totalGrupos} grupos</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Socios Preferenciales</div>
        <div class="kpi-value">${totalPreferenciales}</div>
        <div class="kpi-sub">Clasificación especial</div>
      </div>
    </div>

    ${search ? `
      <div class="filter-note">
        <span>🔍 <strong>Filtro de búsqueda activo:</strong> Mostrando grupos que coinciden con "${search}"</span>
      </div>
    ` : ""}

    <!-- Tabla Detallada de Grupos -->
    <table class="report-table">
      <thead>
        <tr>
          <th style="width: 55px; text-align: center;">ID</th>
          <th style="width: 150px;">Nombre del Grupo</th>
          <th style="width: 70px; text-align: center;">Integrantes</th>
          <th>Detalle de Miembros</th>
          <th style="width: 95px; text-align: center;">Clasificación</th>
          <th style="width: 70px; text-align: center;">Alta</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        <tr class="grand-total-row">
          <td colspan="2"><strong>TOTAL CONSOLIDADO</strong></td>
          <td class="col-center"><strong>${totalIntegrantes}</strong></td>
          <td colspan="3"><strong>${totalGrupos} ${totalGrupos === 1 ? "grupo registrado" : "grupos registrados"}</strong></td>
        </tr>
      </tbody>
    </table>

    <!-- Firmas -->
    <div class="signatures-section">
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-title">Coordinación de Crédito Grupal</div>
        <div class="signature-sub">AGC Servicios Financieros</div>
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-title">Dirección de Operaciones</div>
        <div class="signature-sub">Control y Auditoría de Cartera</div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="report-footer">
      <div>Documento de uso interno confidencial — Generado automáticamente por Sistema SEFI</div>
      <div>Página 1 de 1</div>
    </footer>
  </div>
</body>
</html>`;

  imprimirDocumentoHtml(html);
}
