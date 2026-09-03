export interface NominaEmployeeData {
  empleado_id: string;
  nombre: string;
  fecha_nacimiento?: string;
  rfc?: string;
  curp?: string;
  nss?: string;
  banco?: string;
  cuenta_bancaria?: string;
  pago_base: number;
  despensa: number;
  apoyo_transporte: number;
  ahorro: number;
  bruto: number;
  neto: number;
}

export interface NominaPeriodData {
  fecha_inicio: string;
  fecha_fin: string;
  referencia: string;
  firma_director_administrativo: string;
  firma_director_operativo: string;
  empleados: NominaEmployeeData[];
}

export function generarNominaHtml(data: NominaPeriodData): string {
  const escapeHtml = (value?: string) => (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
  const formatAmount = (value: number) => value > 0 ? value.toFixed(2) : "";
  const grupos = data.empleados.reduce<NominaEmployeeData[][]>((pages, empleado, index) => {
    const pageIndex = Math.floor(index / 4);
    (pages[pageIndex] ??= []).push(empleado);
    return pages;
  }, []);
  const periodDate = escapeHtml(data.fecha_fin);
  const reference = escapeHtml(data.referencia);

  const employeeReceipt = (emp: NominaEmployeeData) => `
    <section class="employee-receipt">
      <div class="employee-details">
        <div><strong>NOMBRE:</strong> ${escapeHtml(emp.nombre)}</div>
        <div><strong>FECHA NAC:</strong> ${escapeHtml(emp.fecha_nacimiento)}</div>
        <div><strong>RFC:</strong> ${escapeHtml(emp.rfc)}</div>
        <div><strong>CURP:</strong> ${escapeHtml(emp.curp)}</div>
        <div><strong>NSS:</strong> ${escapeHtml(emp.nss)}</div>
        <div><strong>CTA. ${escapeHtml(emp.banco || "BANCO")}:</strong> ${escapeHtml(emp.cuenta_bancaria)}</div>
        <div class="reference"><strong>REFERENCIA:</strong> ${reference}</div>
        <div><strong>FECHA:</strong> ${periodDate}</div>
      </div>
      <div class="amounts-grid">
        <div class="perceptions">
          <div><span>PAGO BASE</span><b>${formatAmount(emp.pago_base)}</b></div>
          <div><span>DESPENSA</span><b>${formatAmount(emp.despensa)}</b></div>
          <div><span>APOYO TRANSP.</span><b>${formatAmount(emp.apoyo_transporte)}</b></div>
          <div class="total"><span>BRUTO</span><b>${emp.bruto.toFixed(2)}</b></div>
        </div>
        <div class="deductions">
          <div><span>AHORRO PER.</span><b>${formatAmount(emp.ahorro)}</b></div>
          <div class="received"><span>RECIBÍ</span></div>
          <div class="total"><span>NETO:</span><b>${emp.neto.toFixed(2)}</b></div>
        </div>
      </div>
    </section>`;

  const total = data.empleados.reduce((sum, employee) => sum + employee.neto, 0);
  const summaryContent = `
    <h2>PAGO TOTAL DE NÓMINA DEL PERSONAL</h2>
    <p class="grand-total">$${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
    <div class="signatures-container">
      <div class="sig-block">
        <div class="sig-line"></div>
        DIRECTOR ADMINISTRATIVO<br>
        ${escapeHtml(data.firma_director_administrativo) || "NOMBRE"}
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        DIRECTOR OPERATIVO<br>
        ${escapeHtml(data.firma_director_operativo) || "NOMBRE"}
      </div>
    </div>`;
  const lastGroup = grupos[grupos.length - 1];
  const embedSummary = Boolean(lastGroup && lastGroup.length <= 2);
  const payrollPages = grupos.map((empleados, pageIndex) => `
    <section class="nomina-page ${embedSummary && pageIndex === grupos.length - 1 ? "with-summary" : ""}">
      <img src="/logo.png" class="page-watermark" alt="" />
      <header class="page-header">
        <div class="agc">A G C</div>
        <div class="company">SERVICIOS FINANCIEROS</div>
        <div class="title">NÓMINA DEL PERSONAL DE ASOCIADOS DE LA COMPAÑÍA</div>
      </header>
      <div class="receipts">${empleados.map(employeeReceipt).join("")}</div>
      ${embedSummary && pageIndex === grupos.length - 1 ? `<div class="inline-summary">${summaryContent}</div>` : ""}
    </section>`).join("");
  const totalsPage = embedSummary ? "" : `
    <section class="totals-page">
      <img src="/logo.png" class="page-watermark" alt="" />
      ${summaryContent}
    </section>`;

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Nómina</title>
      <style>
        @page { size: letter landscape; margin: 4mm; }
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; color: #000; margin: 0; }
        .nomina-page, .totals-page {
          position: relative;
          min-height: 203mm;
          overflow: hidden;
          border: 2px solid #000;
          page-break-after: always;
          break-after: page;
          background: #fff;
        }
        .page-watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 42%;
          max-height: 72%;
          object-fit: contain;
          opacity: .12;
          transform: translate(-50%, -50%);
          z-index: 0;
          pointer-events: none;
        }
        .page-header, .receipts, .totals-page > *:not(.page-watermark) { position: relative; z-index: 1; }
        .page-header { padding: 2mm 3mm 3mm; border-bottom: 3px solid #000; }
        .agc, .company { text-align: center; font-family: Georgia, serif; font-weight: 900; line-height: .9; }
        .agc { font-size: 18pt; }
        .company { font-size: 19pt; }
        .title { margin-top: 4mm; font-size: 10pt; font-weight: 800; }
        .receipts { display: grid; grid-template-rows: repeat(4, 1fr); min-height: 165mm; }
        .employee-receipt { min-height: 40mm; padding: 1.2mm 2mm; border-bottom: 3px solid #000; }
        .employee-details { display: grid; grid-template-columns: 25% 15% 25% 35%; gap: 1mm 0; min-height: 14mm; font-size: 8pt; }
        .employee-details > div { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .employee-details .reference { grid-column: 3; }
        .amounts-grid { display: grid; grid-template-columns: 45% 55%; min-height: 23mm; border-top: 1px solid #000; }
        .perceptions, .deductions { padding: 1mm 0; font-size: 8pt; }
        .perceptions { border-right: 2px dashed #000; padding-right: 4mm; }
        .deductions { padding-left: 4mm; }
        .perceptions > div, .deductions > div { display: flex; justify-content: space-between; min-height: 4mm; }
        .received { margin-top: 8mm; border-top: 1px solid #000; justify-content: flex-end !important; padding-top: 1mm; }
        .total { margin-top: 3mm; font-weight: 800; }
        .totals-page { padding: 50mm 20mm 0; text-align: center; }
        .totals-page h2 { font-size: 14pt; margin: 0; }
        .grand-total { font-size: 18pt; font-weight: 800; margin: 8mm 0; }
        .signatures-container { display: flex; justify-content: space-between; margin: 65mm 15mm 0; }
        .sig-block { width: 250px; text-align: center; font-weight: 700; font-size: 9pt; }
        .sig-line { border-bottom: 1px solid black; margin-bottom: 3mm; height: 10mm; }
        .with-summary { min-height: 0; }
        .with-summary .receipts { display: block; min-height: 0; }
        .with-summary .employee-receipt { min-height: 40mm; }
        .inline-summary { position: relative; z-index: 1; padding: 8mm 20mm 10mm; text-align: center; }
        .inline-summary h2 { font-size: 12pt; margin: 0; }
        .inline-summary .grand-total { margin: 4mm 0; font-size: 15pt; }
        .inline-summary .signatures-container { margin-top: 16mm; }
      </style>
    </head>
    <body>
      ${payrollPages}
      ${totalsPage}
    </body>
    </html>
  `;
}
