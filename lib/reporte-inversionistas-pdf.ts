import { imprimirDocumentoHtml } from "@/lib/document-templates";

export interface GenerarReporteInversionistasPdfOptions {
  data: any;
  fechaInicio: string;
  fechaFin: string;
  todosLosMovimientos?: any[];
}

const fmtMoney = (val: unknown) =>
  `$${Number(val ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function exportarEstadoFinancieroInversionistasPdf({
  data,
  fechaInicio,
  fechaFin,
  todosLosMovimientos = [],
}: GenerarReporteInversionistasPdfOptions): void {
  const fechaEmision = new Date().toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const hora = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  const inversionistas = data?.inversionistas ?? [];
  const resumen = data?.resumen ?? {};

  const totalCapital = Number(resumen.saldo_capital ?? 0);
  const totalRendPeriodo = Number(resumen.rendimientos_periodo ?? 0);
  const totalRendHistorico = Number(resumen.rendimientos_historicos ?? 0);
  const totalCompromiso = Number(resumen.compromiso_mensual_total ?? 0);
  const tasaPonderada = Number(resumen.tasa_ponderada_mensual ?? 0);
  const fuentesCount = Number(resumen.fuentes ?? inversionistas.length);

  // 1. Filas de la Cédula Analítica de Inversionistas
  const filasInversionistasHtml = inversionistas.map((inv: any, idx: number) => `
    <tr>
      <td class="col-center text-muted">${idx + 1}</td>
      <td class="font-semibold text-foreground">${inv.nombre}</td>
      <td class="text-muted" style="font-size: 7pt;">${inv.tipo_entidad || "Persona Fisica"}${inv.origen_fondeo ? ` (${inv.origen_fondeo})` : ""}</td>
      <td class="col-money font-bold primary-color">${fmtMoney(inv.saldo_capital)}</td>
      <td class="col-center"><span class="badge badge-rate">${Number(inv.tasa_mensual ?? 0)}%</span></td>
      <td class="col-money font-semibold">${fmtMoney(inv.compromiso_mensual)}</td>
      <td style="font-size: 7pt;">${inv.dia_pago || "—"}</td>
      <td class="col-money font-bold amber-color">${fmtMoney(inv.rendimientos_periodo)}</td>
      <td class="col-money text-muted">${fmtMoney(inv.rendimientos_historicos)}</td>
    </tr>
  `).join("");

  // 2. Filas del Cronograma Ordenado por Día
  const inversionistasOrdenados = [...inversionistas].sort((a, b) => {
    const getDayNum = (str: string) => {
      const m = (str || "").match(/\d+/);
      return m ? parseInt(m[0], 10) : 99;
    };
    return getDayNum(a.dia_pago) - getDayNum(b.dia_pago);
  });

  const filasCalendarioHtml = inversionistasOrdenados.map((inv: any) => `
    <tr>
      <td class="font-bold primary-color" style="font-size: 7.5pt;">
        📅 ${inv.dia_pago || "Sin fecha fija"}
      </td>
      <td class="font-semibold">${inv.nombre}</td>
      <td class="col-money font-mono">${fmtMoney(inv.saldo_capital)}</td>
      <td class="col-center font-mono">${Number(inv.tasa_mensual ?? 0)}%</td>
      <td class="col-money font-extrabold amber-color font-mono">${fmtMoney(inv.compromiso_mensual)}</td>
    </tr>
  `).join("");

  // 3. Filas de Movimientos
  const movimientosLimitados = (todosLosMovimientos || []).slice(0, 50);
  const filasMovimientosHtml = movimientosLimitados.map((mov: any) => {
    const isRendimiento = mov.tipo === "Rendimiento";
    const isRetiro = mov.tipo === "Retiro";
    const badgeClass = isRendimiento ? "badge-rend" : isRetiro ? "badge-retiro" : "badge-aport";
    const colorClass = isRendimiento ? "amber-color" : isRetiro ? "rose-color" : "emerald-color";

    return `
      <tr>
        <td class="col-center font-mono" style="font-size: 7pt;">${mov.fecha || "—"}</td>
        <td class="font-semibold" style="font-size: 7.2pt;">${mov.inversionista_nombre}</td>
        <td class="col-center"><span class="badge ${badgeClass}">${mov.tipo}</span></td>
        <td style="font-size: 7pt;">${mov.descripcion || "—"}</td>
        <td class="col-money font-bold ${colorClass}">${isRetiro ? `-${fmtMoney(mov.monto)}` : fmtMoney(mov.monto)}</td>
      </tr>
    `;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Estado Financiero de Inversionistas — AGC SEFI</title>
  <style>
    @page {
      size: letter portrait;
      margin: 1.2cm 1.2cm 1.4cm 1.2cm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 7.8pt;
      line-height: 1.35;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }

    .report-container {
      width: 100%;
      max-width: 100%;
    }

    /* Header SEFI Deep Teal */
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2.5px solid #0f4a3d;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-logo {
      height: 44px;
      width: auto;
      object-fit: contain;
    }

    .company-title {
      font-size: 13pt;
      font-weight: 800;
      color: #0f4a3d;
      letter-spacing: -0.2px;
      margin: 0;
      line-height: 1.1;
    }

    .company-sub {
      font-size: 7pt;
      font-weight: 600;
      color: #475569;
      margin: 2px 0 0 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .report-title-badge {
      display: inline-block;
      background: #0f4a3d;
      color: #ffffff;
      font-size: 7pt;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 3px;
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .header-right {
      text-align: right;
      font-size: 7pt;
      color: #334155;
      line-height: 1.4;
      background: #f8fafc;
      padding: 6px 10px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }

    /* KPI Summary Cards */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }

    .kpi-card {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 6px 8px;
      border-left: 3px solid #0f4a3d;
    }

    .kpi-card.amber-border {
      border-left-color: #b45309;
    }

    .kpi-card.blue-border {
      border-left-color: #1d4ed8;
    }

    .kpi-card.emerald-border {
      border-left-color: #047857;
    }

    .kpi-label {
      font-size: 6.5pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .kpi-value {
      font-size: 10.5pt;
      font-weight: 800;
      margin-top: 2px;
      color: #0f172a;
    }

    .kpi-value.primary-color { color: #0f4a3d; }
    .kpi-value.amber-color { color: #b45309; }
    .kpi-value.blue-color { color: #1d4ed8; }

    .kpi-sub {
      font-size: 6pt;
      color: #64748b;
      margin-top: 1px;
    }

    /* Section Headings */
    .section-title {
      font-size: 8.5pt;
      font-weight: 800;
      color: #0f4a3d;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin: 12px 0 5px 0;
      display: flex;
      align-items: center;
      gap: 6px;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 3px;
    }

    /* Data Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.2pt;
      margin-bottom: 10px;
    }

    thead th {
      background: #0f4a3d !important;
      color: #ffffff !important;
      font-size: 6.8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      padding: 5px 6px;
      border: 1px solid #0f4a3d;
      text-align: left;
    }

    tbody td {
      padding: 4px 6px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
    }

    tbody tr:nth-child(even) td {
      background-color: #f8fafc;
    }

    tfoot td {
      background: #e6f7f2 !important;
      color: #0f4a3d;
      font-size: 7.5pt;
      font-weight: 800;
      padding: 5px 6px;
      border: 1.5px solid #0f4a3d;
    }

    .col-money {
      text-align: right;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .col-center { text-align: center; }
    .font-semibold { font-weight: 600; }
    .font-bold { font-weight: 700; }
    .font-extrabold { font-weight: 800; }
    .primary-color { color: #0f4a3d; }
    .amber-color { color: #b45309; }
    .rose-color { color: #e11d48; }
    .emerald-color { color: #047857; }
    .text-muted { color: #64748b; }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 6.2pt;
      font-weight: 700;
      text-transform: uppercase;
    }

    .badge-rate { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
    .badge-rend { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .badge-aport { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .badge-retiro { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

    /* Signatures */
    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 24px;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }

    .signature-box {
      text-align: center;
      padding-top: 30px;
      border-top: 1px solid #94a3b8;
    }

    .signature-title {
      font-size: 7.5pt;
      font-weight: 700;
      color: #0f4a3d;
      text-transform: uppercase;
    }

    .signature-sub {
      font-size: 6.5pt;
      color: #64748b;
      margin-top: 2px;
    }

    /* Footer */
    .report-footer {
      margin-top: 12px;
      padding-top: 6px;
      border-top: 1px solid #e2e8f0;
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
          <p class="company-sub">SISTEMA INTEGRAL DE CONTROL Y GESTIÓN FINANCIERA</p>
          <div class="report-title-badge">ESTADO FINANCIERO DE INVERSIONISTAS Y FUENTES DE FONDEO</div>
        </div>
      </div>
      <div class="header-right">
        <div><strong>Rango evaluado:</strong> ${fechaInicio} al ${fechaFin}</div>
        <div><strong>Fecha de emisión:</strong> ${fechaEmision} (${hora})</div>
        <div><strong>Fuentes activas:</strong> ${fuentesCount} inversionistas</div>
      </div>
    </header>

    <!-- Resumen Ejecutivo KPIs -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Capital Total Fondeado</div>
        <div class="kpi-value primary-color">${fmtMoney(totalCapital)}</div>
        <div class="kpi-sub">${fuentesCount} fuentes activas</div>
      </div>
      <div class="kpi-card amber-border">
        <div class="kpi-label">Rendimientos en Periodo</div>
        <div class="kpi-value amber-color">${fmtMoney(totalRendPeriodo)}</div>
        <div class="kpi-sub">Liquidado en rango de fechas</div>
      </div>
      <div class="kpi-card blue-border">
        <div class="kpi-label">Compromiso Mensual Fijo</div>
        <div class="kpi-value blue-color">${fmtMoney(totalCompromiso)}</div>
        <div class="kpi-sub">${tasaPonderada}% mensual ponderado</div>
      </div>
      <div class="kpi-card emerald-border">
        <div class="kpi-label">Rendimientos Históricos</div>
        <div class="kpi-value">${fmtMoney(totalRendHistorico)}</div>
        <div class="kpi-sub">Acumulado total histórico</div>
      </div>
    </div>

    <!-- Sección 1: Cédula Analítica de Inversionistas -->
    <div class="section-title">1. Desglose Analítico por Fuente de Inversión</div>
    <table>
      <thead>
        <tr>
          <th style="width: 4%;" class="col-center">#</th>
          <th style="width: 25%;">Inversionista / Fuente</th>
          <th style="width: 14%;">Tipo / Origen</th>
          <th style="width: 12%;" class="col-money">Capital Fondeado</th>
          <th style="width: 7%;" class="col-center">Tasa %</th>
          <th style="width: 11%;" class="col-money">Compromiso/Mes</th>
          <th style="width: 13%;">Día de Pago</th>
          <th style="width: 12%;" class="col-money">Rend. Periodo</th>
          <th style="width: 12%;" class="col-money">Rend. Histórico</th>
        </tr>
      </thead>
      <tbody>
        ${filasInversionistasHtml}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3">TOTALES GENERALES (${inversionistas.length} FUENTES)</td>
          <td class="col-money">${fmtMoney(totalCapital)}</td>
          <td class="col-center">${tasaPonderada}% pond.</td>
          <td class="col-money">${fmtMoney(totalCompromiso)}</td>
          <td>—</td>
          <td class="col-money amber-color">${fmtMoney(totalRendPeriodo)}</td>
          <td class="col-money">${fmtMoney(totalRendHistorico)}</td>
        </tr>
      </tfoot>
    </table>

    <!-- Sección 2: Calendario y Cronograma de Pagos -->
    <div class="section-title">2. Cronograma Mensual Recurrente de Desembolsos</div>
    <table>
      <thead>
        <tr>
          <th style="width: 22%;">Día Programado</th>
          <th style="width: 38%;">Inversionista / Beneficiario</th>
          <th style="width: 15%;" class="col-money">Capital Base</th>
          <th style="width: 10%;" class="col-center">Tasa Nominal</th>
          <th style="width: 15%;" class="col-money">Monto Mensual</th>
        </tr>
      </thead>
      <tbody>
        ${filasCalendarioHtml}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2">TOTAL DESEMBOLSO MENSUAL PROGRAMADO</td>
          <td class="col-money">${fmtMoney(totalCapital)}</td>
          <td class="col-center">${tasaPonderada}% pond.</td>
          <td class="col-money amber-color">${fmtMoney(totalCompromiso)} / mes</td>
        </tr>
      </tfoot>
    </table>

    ${movimientosLimitados.length > 0 ? `
    <!-- Sección 3: Historial de Movimientos -->
    <div class="section-title">3. Detalle de Movimientos en el Periodo (Últimos ${movimientosLimitados.length})</div>
    <table>
      <thead>
        <tr>
          <th style="width: 12%;" class="col-center">Fecha</th>
          <th style="width: 26%;">Inversionista</th>
          <th style="width: 12%;" class="col-center">Tipo</th>
          <th style="width: 35%;">Concepto / Motivo</th>
          <th style="width: 15%;" class="col-money">Monto ($)</th>
        </tr>
      </thead>
      <tbody>
        ${filasMovimientosHtml}
      </tbody>
    </table>
    ` : ""}

    <!-- Firmas -->
    <div class="signatures-grid">
      <div class="signature-box">
        <div class="signature-title">Dirección General</div>
        <div class="signature-sub">AGC SERVICIOS FINANCIEROS</div>
      </div>
      <div class="signature-box">
        <div class="signature-title">Administración y Control Contable</div>
        <div class="signature-sub">ÁREA DE TESORERÍA Y FINANZAS</div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="report-footer">
      <div>Documento contable confidencial generado por AGC SEFI.</div>
      <div>Página emitida el ${fechaEmision} a las ${hora}</div>
    </footer>
  </div>
</body>
</html>`;

  imprimirDocumentoHtml(html);
}
