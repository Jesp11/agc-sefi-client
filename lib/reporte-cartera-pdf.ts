import { imprimirDocumentoHtml } from "@/lib/document-templates";

export interface GenerarReporteCarteraPdfOptions {
  tipo: string;
  creditos: any[];
  fechaCorte?: string;
  filtros?: Array<{ label: string; valor: string }>;
}

const TIPO_LABELS: Record<string, string> = {
  general: "CARTERA GENERAL (ACTIVA)",
  individual: "CARTERA INDIVIDUAL",
  grupal: "CARTERA GRUPAL",
  mora: "CARTERA EN MORA",
  mora_activa: "CARTERA — MORA ACTIVA",
  mora_muerta: "CARTERA — MORA MUERTA",
  cerrados: "CARTERA — CRÉDITOS CERRADOS",
};

const fmtMoney = (val: unknown) =>
  `$${Number(val ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function exportarCarteraPdf({ tipo, creditos, fechaCorte, filtros }: GenerarReporteCarteraPdfOptions): void {
  const tituloTipo = TIPO_LABELS[tipo] || tipo.toUpperCase();
  const fecha = fechaCorte || new Date().toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const hora = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  const showGroupFields = tipo === "grupal" || tipo === "general" || creditos.some((c) => c.tipo_credito === "Grupal");
  const colSpanTotal = showGroupFields ? 9 : 7;
  const colSpanGrandTotal = showGroupFields ? 9 : 7;

  // Totales globales
  const totalCreditos = creditos.length;
  const totalMontoOtorgado = creditos.reduce((sum, c) => sum + Number(c.monto_otorgado ?? 0), 0);
  const totalSaldo = creditos.reduce(
    (sum, c) => sum + Number(c.saldo_total ?? c.mora?.saldo_actual ?? c.saldo_pendiente ?? 0),
    0
  );
  const totalSaldoInversion = creditos.reduce((sum, c) => sum + Number(c.saldo_inversion ?? 0), 0);

  // Agrupación por Asesor
  const asesorGroupsMap = new Map<string, { asesorNombre: string; asesorCodigo?: string; creditos: any[] }>();

  creditos.forEach((c) => {
    const asesorNombre = (c.asesor?.nombre_asesor || "SIN ASESOR ASIGNADO").trim().toUpperCase();
    const asesorCodigo = c.asesor?.codigo_asesor;
    const key = asesorNombre;

    if (!asesorGroupsMap.has(key)) {
      asesorGroupsMap.set(key, {
        asesorNombre,
        asesorCodigo,
        creditos: [],
      });
    }
    asesorGroupsMap.get(key)!.creditos.push(c);
  });

  const asesorGroups = Array.from(asesorGroupsMap.values()).sort((a, b) =>
    a.asesorNombre.localeCompare(b.asesorNombre)
  );

  // Generación de filas HTML agrupadas
  let tableRowsHtml = "";

  asesorGroups.forEach((group) => {
    const groupCreditos = group.creditos;
    const individuales = groupCreditos.filter((c) => (c.tipo_credito || "").toLowerCase() === "individual");
    const grupales = groupCreditos.filter((c) => (c.tipo_credito || "").toLowerCase() === "grupal");

    const totalAsesorMonto = groupCreditos.reduce((sum, c) => sum + Number(c.monto_otorgado ?? 0), 0);
    const totalAsesorSaldo = groupCreditos.reduce(
      (sum, c) => sum + Number(c.saldo_total ?? c.mora?.saldo_actual ?? c.saldo_pendiente ?? 0),
      0
    );
    const totalAsesorInversion = groupCreditos.reduce((sum, c) => sum + Number(c.saldo_inversion ?? 0), 0);

    // Encabezado de Asesor (SEFI Deep Teal)
    tableRowsHtml += `
      <tr class="advisor-header-row">
        <td colspan="${colSpanTotal}">
          <div class="advisor-header-content">
            <span class="advisor-name">👤 ASESOR: ${group.asesorNombre} ${group.asesorCodigo ? `[${group.asesorCodigo}]` : ""}</span>
            <span class="advisor-stats">
              <strong>${groupCreditos.length}</strong> ${groupCreditos.length === 1 ? "crédito" : "créditos"} &nbsp;|&nbsp; 
              Colocado: <strong>${fmtMoney(totalAsesorMonto)}</strong> &nbsp;|&nbsp; 
              Saldo: <strong>${fmtMoney(totalAsesorSaldo)}</strong>
            </span>
          </div>
        </td>
      </tr>
    `;

    // 1. Subdivisión Individuales
    if (individuales.length > 0) {
      const subMonto = individuales.reduce((s, c) => s + Number(c.monto_otorgado ?? 0), 0);
      const subSaldo = individuales.reduce(
        (s, c) => s + Number(c.saldo_total ?? c.mora?.saldo_actual ?? c.saldo_pendiente ?? 0),
        0
      );
      const subInversion = individuales.reduce((s, c) => s + Number(c.saldo_inversion ?? 0), 0);

      tableRowsHtml += `
        <tr class="subdivision-header-row individual-subdivision">
          <td colspan="${colSpanTotal}">
            <div class="subdivision-header-content">
              <span>▶ CRÉDITOS INDIVIDUALES (${individuales.length})</span>
            </div>
          </td>
        </tr>
      `;

      individuales.forEach((c) => {
        const cliente = c.cliente?.nombre_completo || "SIN NOMBRE";
        const saldoTotal = Number(c.saldo_total ?? c.mora?.saldo_actual ?? c.saldo_pendiente ?? 0);
        const saldoInversion = Number(c.saldo_inversion ?? 0);
        const estadoClass = getEstadoClass(c.estado);

        tableRowsHtml += `
          <tr class="data-row">
            <td class="col-folio">#${c.num_prog}</td>
            <td class="col-cliente"><strong>${cliente}</strong></td>
            <td class="col-estado"><span class="badge ${estadoClass}">${c.estado || "Activo"}</span></td>
            <td class="col-money">${fmtMoney(c.monto_otorgado)}</td>
            ${showGroupFields ? `<td class="col-money text-muted">—</td>` : ""}
            ${showGroupFields ? `<td class="col-money text-muted">—</td>` : ""}
            <td class="col-money font-semibold">${fmtMoney(saldoTotal)}</td>
            <td class="col-money">${fmtMoney(saldoInversion)}</td>
            <td class="col-center font-mono">${c.semanas_restantes ?? 0}</td>
          </tr>
        `;
      });

      // Subtotal Individuales
      tableRowsHtml += `
        <tr class="subtotal-row">
          <td colspan="3" class="text-right"><em>Subtotal Individuales (${individuales.length}):</em></td>
          <td class="col-money font-semibold">${fmtMoney(subMonto)}</td>
          ${showGroupFields ? `<td></td><td></td>` : ""}
          <td class="col-money font-semibold">${fmtMoney(subSaldo)}</td>
          <td class="col-money font-semibold">${fmtMoney(subInversion)}</td>
          <td></td>
        </tr>
      `;
    }

    // 2. Subdivisión Grupales
    if (grupales.length > 0) {
      const subMonto = grupales.reduce((s, c) => s + Number(c.monto_otorgado ?? 0), 0);
      const subSaldo = grupales.reduce(
        (s, c) => s + Number(c.saldo_total ?? c.mora?.saldo_actual ?? c.saldo_pendiente ?? 0),
        0
      );
      const subInversion = grupales.reduce((s, c) => s + Number(c.saldo_inversion ?? 0), 0);
      const subCreditoGrupal = grupales.reduce((s, c) => s + Number(c.credito_total_grupal ?? 0), 0);
      const subSaldoGrupal = grupales.reduce((s, c) => s + Number(c.saldo_grupal ?? 0), 0);

      tableRowsHtml += `
        <tr class="subdivision-header-row group-subdivision">
          <td colspan="${colSpanTotal}">
            <div class="subdivision-header-content">
              <span>▶ CRÉDITOS GRUPALES (${grupales.length})</span>
            </div>
          </td>
        </tr>
      `;

      grupales.forEach((c) => {
        const grupo = c.grupo?.nombre_grupo || c.cliente?.nombre_completo || "GRUPO SIN NOMBRE";
        const saldoTotal = Number(c.saldo_total ?? c.mora?.saldo_actual ?? c.saldo_pendiente ?? 0);
        const saldoInversion = Number(c.saldo_inversion ?? 0);
        const estadoClass = getEstadoClass(c.estado);

        tableRowsHtml += `
          <tr class="data-row">
            <td class="col-folio">#${c.num_prog}</td>
            <td class="col-cliente"><strong>${grupo}</strong></td>
            <td class="col-estado"><span class="badge ${estadoClass}">${c.estado || "Activo"}</span></td>
            <td class="col-money">${fmtMoney(c.monto_otorgado)}</td>
            ${showGroupFields ? `<td class="col-money">${fmtMoney(c.credito_total_grupal)}</td>` : ""}
            ${showGroupFields ? `<td class="col-money">${fmtMoney(c.saldo_grupal)}</td>` : ""}
            <td class="col-money font-semibold">${fmtMoney(saldoTotal)}</td>
            <td class="col-money">${fmtMoney(saldoInversion)}</td>
            <td class="col-center font-mono">${c.semanas_restantes ?? 0}</td>
          </tr>
        `;
      });

      // Subtotal Grupales
      tableRowsHtml += `
        <tr class="subtotal-row">
          <td colspan="3" class="text-right"><em>Subtotal Grupales (${grupales.length}):</em></td>
          <td class="col-money font-semibold">${fmtMoney(subMonto)}</td>
          ${showGroupFields ? `<td class="col-money font-semibold">${fmtMoney(subCreditoGrupal)}</td>` : ""}
          ${showGroupFields ? `<td class="col-money font-semibold">${fmtMoney(subSaldoGrupal)}</td>` : ""}
          <td class="col-money font-semibold">${fmtMoney(subSaldo)}</td>
          <td class="col-money font-semibold">${fmtMoney(subInversion)}</td>
          <td></td>
        </tr>
      `;
    }

    // Total de Asesor
    tableRowsHtml += `
      <tr class="advisor-total-row">
        <td colspan="3" class="text-right"><strong>TOTAL ASESOR — ${group.asesorNombre}:</strong></td>
        <td class="col-money font-bold">${fmtMoney(totalAsesorMonto)}</td>
        ${showGroupFields ? `<td></td><td></td>` : ""}
        <td class="col-money font-bold">${fmtMoney(totalAsesorSaldo)}</td>
        <td class="col-money font-bold">${fmtMoney(totalAsesorInversion)}</td>
        <td></td>
      </tr>
      <tr class="spacer-row"><td colspan="${colSpanTotal}"></td></tr>
    `;
  });

  // Fila Gran Total General
  const grandTotalRowHtml = `
    <tr class="grand-total-row">
      <td colspan="3" class="text-right">
        <strong>GRAN TOTAL DE CARTERA (${totalCreditos} CRÉDITOS):</strong>
      </td>
      <td class="col-money font-bold text-lg">${fmtMoney(totalMontoOtorgado)}</td>
      ${showGroupFields ? `<td></td><td></td>` : ""}
      <td class="col-money font-bold text-lg">${fmtMoney(totalSaldo)}</td>
      <td class="col-money font-bold text-lg">${fmtMoney(totalSaldoInversion)}</td>
      <td class="col-center font-bold font-mono">-</td>
    </tr>
  `;

  // Ensamblar Documento HTML completo con los Colores y Estilos de la UI SEFI
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Reporte de Cartera — ${tituloTipo}</title>
  <style>
    @page {
      size: letter landscape;
      margin: 8mm 8mm 8mm 8mm;
    }
    *, *:before, *:after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow-x: hidden !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 7.5pt;
      line-height: 1.25;
      position: relative;
    }

    /* Marca de agua / Logo de fondo corporativo */
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 440px;
      height: 440px;
      background: url('/logo.png') no-repeat center center;
      background-size: contain;
      opacity: 0.04;
      pointer-events: none;
      z-index: 0;
    }

    .report-container {
      width: 100% !important;
      max-width: 100% !important;
      position: relative;
      z-index: 1;
      margin: 0;
      padding: 0;
    }

    /* Header del Reporte — Paleta SEFI Deep Teal */
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0f4a3d;
      padding-bottom: 6px;
      margin-bottom: 10px;
      width: 100%;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .header-logo {
      width: 42px;
      height: 42px;
      object-fit: contain;
    }
    .company-title {
      font-size: 12pt;
      font-weight: 800;
      letter-spacing: 0.4px;
      color: #0f4a3d;
      margin: 0;
      line-height: 1.1;
    }
    .company-sub {
      font-size: 7pt;
      font-weight: 600;
      color: #135d4c;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin: 2px 0 0 0;
    }
    .report-title-badge {
      display: inline-block;
      margin-top: 3px;
      padding: 2.5px 7px;
      background: #0f4a3d;
      color: #ffffff;
      font-size: 8pt;
      font-weight: 700;
      border-radius: 3px;
      letter-spacing: 0.4px;
    }
    .header-right {
      text-align: right;
      font-size: 7.5pt;
      color: #334155;
      line-height: 1.35;
    }
    .header-right strong {
      color: #0f4a3d;
    }

    /* Active Filters Bar */
    .active-filters-container {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
      margin-bottom: 10px;
      padding: 4px 8px;
      background: #f0fdf9;
      border: 1px solid #ccede5;
      border-radius: 4px;
      border-left: 3.5px solid #0f4a3d;
      width: 100%;
    }
    .active-filters-label {
      font-size: 6.8pt;
      font-weight: 700;
      color: #0f4a3d;
      text-transform: uppercase;
      margin-right: 4px;
    }
    .active-filter-pill {
      display: inline-flex;
      align-items: center;
      font-size: 6.8pt;
      background: #ffffff;
      border: 1px solid #ccede5;
      border-radius: 3px;
      padding: 1px 5px;
      color: #0f172a;
    }
    .active-filter-pill strong {
      color: #0f4a3d;
      margin-right: 2.5px;
    }

    /* KPIs / Resumen superior con acento SEFI */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 6px;
      margin-bottom: 12px;
      width: 100%;
    }
    .kpi-card {
      background: #f0fdf9;
      border: 1px solid #ccede5;
      border-radius: 5px;
      padding: 5px 8px;
    }
    .kpi-label {
      font-size: 6.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #135d4c;
    }
    .kpi-value {
      font-size: 10pt;
      font-weight: 800;
      color: #0f4a3d;
      margin-top: 1.5px;
    }
    .kpi-value.primary { color: #0f4a3d; }
    .kpi-value.emerald { color: #059669; }

    /* Tabla */
    table {
      width: 100% !important;
      max-width: 100% !important;
      table-layout: fixed;
      border-collapse: collapse;
      font-size: 7.2pt;
      margin: 0;
      padding: 0;
    }
    thead tr th {
      background: #0f4a3d;
      color: #ffffff;
      font-weight: 700;
      text-align: left;
      padding: 5px 6px;
      font-size: 6.8pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border: 1px solid #0f4a3d;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    thead tr th.text-right { text-align: right; }
    thead tr th.text-center { text-align: center; }

    /* Advisor Header Row — SEFI Deep Teal */
    .advisor-header-row td {
      background: #0b382e !important;
      color: #ffffff !important;
      padding: 5px 8px !important;
      border: 1px solid #0b382e !important;
      font-weight: 800;
      font-size: 8pt;
      break-after: avoid;
      page-break-after: avoid;
    }
    .advisor-header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .advisor-name {
      letter-spacing: 0.4px;
    }
    .advisor-stats {
      font-size: 7.2pt;
      font-weight: 500;
      opacity: 0.95;
    }
    .advisor-stats strong {
      color: #6ee7b7;
    }

    /* Subdivision Rows */
    .subdivision-header-row td {
      background: #f0fdf9 !important;
      color: #0f4a3d !important;
      padding: 3.5px 8px !important;
      font-weight: 700;
      font-size: 7.2pt;
      border: 1px solid #ccede5;
      border-left: 3.5px solid #0f4a3d;
      letter-spacing: 0.3px;
      break-after: avoid;
      page-break-after: avoid;
    }
    .subdivision-header-row.group-subdivision td {
      background: #ecfdf5 !important;
      color: #064e3b !important;
      border-left-color: #059669;
    }

    /* Data Rows */
    .data-row td {
      padding: 3.5px 5px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
      background: #ffffff;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .data-row:nth-child(even) td {
      background: #f8fafc;
    }
    .col-folio {
      font-family: monospace;
      font-weight: 700;
      color: #0f4a3d;
    }
    .col-cliente {
      font-size: 7.2pt;
    }
    .col-estado { text-align: center; }
    .col-money {
      text-align: right;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .col-center { text-align: center; }
    .text-muted { color: #94a3b8; }
    .font-semibold { font-weight: 600; }
    .font-bold { font-weight: 700; }
    .text-right { text-align: right; }
    .text-lg { font-size: 8.2pt; }

    /* Badges acordes al sistema */
    .badge {
      display: inline-block;
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 6.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }
    .badge-active { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .badge-mora { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    .badge-closed { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }

    /* Subtotal & Total Rows */
    .subtotal-row td {
      background: #f8fafc !important;
      font-size: 7pt;
      color: #475569;
      padding: 3.5px 5px;
      border: 1px solid #cbd5e1;
    }
    .advisor-total-row td {
      background: #e6f7f2 !important;
      color: #0f4a3d;
      font-size: 7.5pt;
      padding: 4px 6px;
      border: 1px solid #a7f3d0;
      border-top: 1.5px solid #0f4a3d;
    }
    .spacer-row td {
      height: 6px;
      background: transparent !important;
      border: none !important;
    }

    /* Grand Total Row — SEFI Dark Teal & Emerald Highlight */
    .grand-total-row td {
      background: #0b382e !important;
      color: #ffffff !important;
      padding: 6px 8px !important;
      font-size: 8pt;
      border: 2px solid #0b382e !important;
      margin-top: 10px;
    }
    .grand-total-row td .col-money {
      color: #34d399 !important;
    }

    /* Footer */
    .report-footer {
      margin-top: 12px;
      padding-top: 6px;
      border-top: 1px solid #ccede5;
      display: flex;
      justify-content: space-between;
      font-size: 6.5pt;
      color: #475569;
      width: 100%;
    }
  </style>
</head>
<body>
  <div class="watermark"></div>

  <div class="report-container">
    <!-- Header -->
    <header class="report-header">
      <div class="header-left">
        <img src="/logo.png" alt="AGC SEFI" class="header-logo" onerror="this.style.display='none'" />
        <div>
          <h1 class="company-title">AGC SERVICIOS FINANCIEROS</h1>
          <p class="company-sub">SISTEMA INTEGRAL DE CONTROL Y GESTIÓN DE CARTERA</p>
          <div class="report-title-badge">${tituloTipo}</div>
        </div>
      </div>
      <div class="header-right">
        <div><strong>Fecha de corte:</strong> ${fecha}</div>
        <div><strong>Hora:</strong> ${hora}</div>
        <div><strong>Total de créditos:</strong> ${totalCreditos}</div>
      </div>
    </header>

    ${filtros && filtros.length > 0 ? `
    <!-- Filtros aplicados -->
    <div class="active-filters-container">
      <span class="active-filters-label">Filtros aplicados:</span>
      ${filtros.map((f) => `<span class="active-filter-pill"><strong>${f.label}:</strong> ${f.valor}</span>`).join("")}
    </div>
    ` : ""}

    <!-- Resumen KPIs -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total Créditos</div>
        <div class="kpi-value">${totalCreditos}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Asesores con Cartera</div>
        <div class="kpi-value">${asesorGroups.length}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Monto Colocado</div>
        <div class="kpi-value emerald">${fmtMoney(totalMontoOtorgado)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Saldo Total Cartera</div>
        <div class="kpi-value primary">${fmtMoney(totalSaldo)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Saldo Inversión</div>
        <div class="kpi-value">${fmtMoney(totalSaldoInversion)}</div>
      </div>
    </div>

    <!-- Tabla Detallada Agrupada -->
    <table>
      <thead>
        ${showGroupFields ? `
        <tr>
          <th style="width: 5%;">Folio</th>
          <th style="width: 25%;">Cliente / Grupo</th>
          <th style="width: 9%;" class="text-center">Estado</th>
          <th class="text-right" style="width: 11%;">Monto Otorgado</th>
          <th class="text-right" style="width: 11%;">Crédito Grupal</th>
          <th class="text-right" style="width: 11%;">Saldo Grupal</th>
          <th class="text-right" style="width: 11%;">Saldo Total</th>
          <th class="text-right" style="width: 11%;">Saldo Inversión</th>
          <th class="text-center" style="width: 6%;">Sem. Rest.</th>
        </tr>
        ` : `
        <tr>
          <th style="width: 6%;">Folio</th>
          <th style="width: 34%;">Cliente / Grupo</th>
          <th style="width: 10%;" class="text-center">Estado</th>
          <th class="text-right" style="width: 14%;">Monto Otorgado</th>
          <th class="text-right" style="width: 15%;">Saldo Total</th>
          <th class="text-right" style="width: 14%;">Saldo Inversión</th>
          <th class="text-center" style="width: 7%;">Sem. Rest.</th>
        </tr>
        `}
      </thead>
      <tbody>
        ${tableRowsHtml.length > 0 ? tableRowsHtml : `<tr><td colspan="${colSpanGrandTotal}" style="text-align: center; padding: 20px; color: #64748b;">No hay créditos registrados para este filtro.</td></tr>`}
        ${tableRowsHtml.length > 0 ? grandTotalRowHtml : ""}
      </tbody>
    </table>

    <!-- Footer -->
    <footer class="report-footer">
      <div>Documento confidencial generado por AGC SEFI. Uso exclusivo administrativo.</div>
      <div>Página generada el ${fecha} a las ${hora}</div>
    </footer>
  </div>
</body>
</html>`;

  imprimirDocumentoHtml(html);
}

function getEstadoClass(estado: string): string {
  const e = (estado || "").toLowerCase();
  if (e.includes("mora")) return "badge-mora";
  if (e.includes("activo") || e.includes("vigente")) return "badge-active";
  if (e.includes("cerrado") || e.includes("finalizado")) return "badge-closed";
  return "badge-active";
}
