import { desglosarFecha, imprimirDocumentoHtml, numeroALetras } from "@/lib/document-templates";

export interface DocumentoEntregante {
  nombre: string;
  participacion: string;
}

export interface ReciboInversionistaParams {
  folio: string;
  monto: number;
  lugarExpedicion: string;
  fechaExpedicion: string;
  beneficiario: string;
  periodoInicio: string;
  periodoFin: string;
  entregantes: DocumentoEntregante[];
}

export interface ContratoInversionistaParams {
  folio: string;
  monto: number;
  acreedor: string;
  lugarExpedicion: string;
  fechaExpedicion: string;
  fechaPagoDia: string;
  fechaPagoMes: string;
  fechaPagoAnio: string;
  tasaMensual: string;
  inicioRendimiento: string;
  vigenciaMeses: string;
  responsables: DocumentoEntregante[];
}

function money(value: number): string {
  return Number(value).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fechaDocumento(value: string) {
  if (value) return desglosarFecha(value);
  return { dia: "__", mes: "____________", anio: "____", texto: "____________", formatoCorto: "____________" };
}

function participantsToLines(items: DocumentoEntregante[]): string {
  const lines = items.map((item) => {
    const participacion = item.participacion.trim() || "RESPONSABLE";
    const nombre = item.nombre.trim().toUpperCase() || "____________________________";
    return `${participacion} ${nombre}`;
  });

  return lines.join(", ") || "____________________________";
}

export function buildReciboInversionistaParams(inversionista: any): ReciboInversionistaParams {
  const today = new Date().toISOString().split("T")[0];
  const current = desglosarFecha(today);
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const periodEnd = nextMonth.toISOString().split("T")[0];
  const ultimoMovimiento = Array.isArray(inversionista?.aportaciones) && inversionista.aportaciones.length > 0
    ? inversionista.aportaciones[inversionista.aportaciones.length - 1]
    : null;

  return {
    folio: `REC-${String(inversionista?.id ?? "1").padStart(3, "0")}/${current.anio}`,
    monto: Number(ultimoMovimiento?.monto ?? inversionista?.monto_acumulado ?? 0) || 0,
    lugarExpedicion: "TAMPICO, TAMPS.",
    fechaExpedicion: today,
    beneficiario: String(inversionista?.nombre ?? "BENEFICIARIO").toUpperCase(),
    periodoInicio: today,
    periodoFin: periodEnd,
    entregantes: [
      { nombre: "FREDY PONCE SANCHEZ", participacion: "ENTREGUE: DEUDA COMPARTIDA 50%" },
      { nombre: "JOSSUE GIBRAN SOBREVILLA DIAZ", participacion: "ENTREGUE: DEUDA COMPARTIDA 50%" },
    ],
  };
}

export function buildContratoInversionistaParams(inversionista: any): ContratoInversionistaParams {
  const today = new Date().toISOString().split("T")[0];
  const current = desglosarFecha(today);
  const ultimoMovimiento = Array.isArray(inversionista?.aportaciones) && inversionista.aportaciones.length > 0
    ? inversionista.aportaciones[inversionista.aportaciones.length - 1]
    : null;

  return {
    folio: `${String(inversionista?.id ?? "1").padStart(3, "0")}/${current.anio}`,
    monto: Number(ultimoMovimiento?.monto ?? inversionista?.monto_acumulado ?? 0) || 0,
    acreedor: String(inversionista?.nombre ?? "ACREEDOR").toUpperCase(),
    lugarExpedicion: "TAMPICO, TAMPS.",
    fechaExpedicion: today,
    fechaPagoDia: current.dia,
    fechaPagoMes: current.mes,
    fechaPagoAnio: current.anio,
    tasaMensual: "4%",
    inicioRendimiento: today,
    vigenciaMeses: "6",
    responsables: [
      { nombre: "FREDY PONCE SANCHEZ", participacion: "ACEPTO DEUDA COMPARTIDA 50%" },
      { nombre: "JOSSUE GIBRAN SOBREVILLA DIAZ", participacion: "ACEPTO DEUDA COMPARTIDA 50%" },
    ],
  };
}

export function generarReciboInversionistaMarkdown(p: ReciboInversionistaParams): string {
  const fecha = fechaDocumento(p.fechaExpedicion);
  return `# R E C I B O

**RECIBO ${p.folio}** &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **BUENO POR:** $${money(p.monto)}

**EN ${p.lugarExpedicion}, A ${fecha.texto}.**

RECIBI, por conducto de ${participantsToLines(p.entregantes)}, la cantidad de **$${money(p.monto)} (${numeroALetras(p.monto)})**, como rendimientos del préstamo otorgado sin fines de lucro, en esta misma fecha, correspondientes al periodo del **${fechaDocumento(p.periodoInicio).texto}** al **${fechaDocumento(p.periodoFin).texto}**.

Lo que hago constar para los efectos legales a que dé lugar el presente recibo.

<div align="center">

**R E C I B I : &nbsp; ESTOY CONFORME**  
&nbsp;  
____________________________________________________  
**${p.beneficiario}**  
**FIRMA**

</div>

---

| ${p.entregantes[0]?.participacion || "ENTREGUE"} | ${p.entregantes[1]?.participacion || "ENTREGUE"} |
| :---: | :---: |
| &nbsp;<br>________________________________________<br>**${p.entregantes[0]?.nombre.toUpperCase() || ""}**<br>**FIRMA** | &nbsp;<br>________________________________________<br>**${p.entregantes[1]?.nombre.toUpperCase() || ""}**<br>**FIRMA** |
`;
}

export function generarContratoInversionistaMarkdown(p: ContratoInversionistaParams): string {
  const fecha = fechaDocumento(p.fechaExpedicion);
  return `# P A G A R É

**NO. ${p.folio}** &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **BUENO POR:** $${money(p.monto)}

**EN ${p.lugarExpedicion}, A ${fecha.texto}.**

DEBO Y PAGARE INCONDICIONALMENTE, POR ESTE PAGARE A LA ORDEN DE **${p.acreedor}**, LA CANTIDAD DE **$${money(p.monto)} (${numeroALetras(p.monto)})**, en el domicilio habitual de pago de AGC Servicios Financieros, el día **${p.fechaPagoDia}** del mes de **${p.fechaPagoMes}** del año **${p.fechaPagoAnio}**.

VALOR RECIBIDO A ENTERA SATISFACCIÓN. ESTE PAGARÉ FORMA PARTE DE UNA SERIE NUMERADA DE 1 DE 1 Y ESTÁ SUJETO A LAS CONDICIONES DE QUE, AL NO PAGARSE A SU VENCIMIENTO, CAUSARÁ INTERESES MORATORIOS AL TIPO DEL **${p.tasaMensual} MENSUAL**.

NOTA: El importe de la causa de intereses será saldado los días **${p.fechaPagoDia}** de cada mes mediante recibo firmado por la interesada. El presente contrato tendrá vigencia inicial de **${p.vigenciaMeses} meses** a partir de **${fechaDocumento(p.inicioRendimiento).texto}**.

---

| ${p.responsables[0]?.participacion || "RESPONSABLE"} | ${p.responsables[1]?.participacion || "RESPONSABLE"} |
| :---: | :---: |
| &nbsp;<br>________________________________________<br>**${p.responsables[0]?.nombre.toUpperCase() || ""}**<br>**FIRMA** | &nbsp;<br>________________________________________<br>**${p.responsables[1]?.nombre.toUpperCase() || ""}**<br>**FIRMA** |
`;
}

export function generarReciboInversionistaHtml(p: ReciboInversionistaParams): string {
  const fecha = fechaDocumento(p.fechaExpedicion);
  const watermark = "/logo.png";
  const lines = p.entregantes.map((item) => `
    <div class="signature-box">
      <div class="signature-title">${item.participacion}</div>
      <div class="signature-line">${item.nombre.toUpperCase()}</div>
      <div class="signature-subtitle">FIRMA</div>
    </div>
  `).join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Recibo ${p.folio}</title>
  <style>
    @page {
      size: letter portrait;
      margin: 2.2cm 2.2cm 2cm 2.2cm;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: "Times New Roman", Times, Georgia, serif;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 0;
      font-size: 11.5pt;
      line-height: 1.65;
    }
    .page {
      position: relative;
      min-height: 100%;
    }
    .watermark {
      position: absolute;
      inset: 18% 10%;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.10;
      pointer-events: none;
      z-index: 0;
    }
    .watermark img {
      width: 70%;
      height: auto;
    }
    .container {
      width: 100%;
      max-width: 100%;
      position: relative;
      z-index: 1;
    }
    .header-title {
      text-align: center;
      font-size: 18pt;
      font-weight: bold;
      letter-spacing: 5px;
      margin-bottom: 22px;
      text-transform: uppercase;
    }
    .meta-top {
      display: flex;
      justify-content: space-between;
      border-bottom: 1.5px solid #000;
      padding-bottom: 8px;
      margin-bottom: 20px;
      font-weight: bold;
      font-size: 11.5pt;
    }
    .location-date {
      font-weight: bold;
      margin-bottom: 18px;
      text-transform: uppercase;
    }
    .body-paragraph {
      text-align: justify;
      text-indent: 1.5em;
      margin-bottom: 16px;
      line-height: 1.7;
    }
    .body-plain {
      text-align: justify;
      margin-bottom: 18px;
      line-height: 1.7;
    }
    .accept-title {
      text-align: center;
      font-weight: bold;
      letter-spacing: 2px;
      margin: 32px 0 20px 0;
      font-size: 11pt;
    }
    .beneficiary-box {
      width: 60%;
      margin: 0 auto 30px auto;
      text-align: center;
    }
    .signatures-grid {
      display: flex;
      justify-content: space-between;
      gap: 30px;
      margin-top: 30px;
    }
    .signature-box {
      width: 46%;
      text-align: center;
    }
    .signature-title {
      font-weight: bold;
      font-size: 10pt;
      letter-spacing: 1px;
      margin-bottom: 40px;
    }
    .signature-line {
      border-top: 1.5px solid #000;
      padding-top: 6px;
      font-weight: bold;
      font-size: 10.5pt;
    }
    .signature-subtitle {
      font-size: 9pt;
      letter-spacing: 1.5px;
      color: #333;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="watermark"><img src="${watermark}" alt=""></div>
    <div class="container">
      <div class="header-title">R E C I B O</div>
      
      <div class="meta-top">
        <div>RECIBO ${p.folio}</div>
        <div>BUENO POR: $${money(p.monto)}</div>
      </div>

      <div class="location-date">
        EN ${p.lugarExpedicion}, A ${fecha.texto}.
      </div>

      <div class="body-paragraph">
        RECIBÍ, por conducto de ${participantsToLines(p.entregantes)}, la cantidad de <strong>$${money(p.monto)} (${numeroALetras(p.monto)})</strong>, como rendimientos del préstamo otorgado sin fines de lucro, en esta misma fecha, correspondientes al periodo del <strong>${fechaDocumento(p.periodoInicio).texto}</strong> al <strong>${fechaDocumento(p.periodoFin).texto}</strong>.
      </div>

      <div class="body-plain">
        Lo que hago constar para los efectos legales a que dé lugar el presente recibo.
      </div>

      <div class="accept-title">R E C I B Í : &nbsp; ESTOY CONFORME</div>

      <div class="beneficiary-box">
        <div class="signature-line">${p.beneficiario}</div>
        <div class="signature-subtitle">FIRMA</div>
      </div>

      <div class="signatures-grid">
        ${lines}
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function generarContratoInversionistaHtml(p: ContratoInversionistaParams): string {
  const fecha = fechaDocumento(p.fechaExpedicion);
  const watermark = "/logo.png";
  const responsables = p.responsables.map((item) => `
    <div class="signature-box">
      <div class="signature-title">${item.participacion}</div>
      <div class="signature-line">${item.nombre.toUpperCase()}</div>
      <div class="signature-subtitle">FIRMA</div>
    </div>
  `).join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Pagaré ${p.folio}</title>
  <style>
    @page {
      size: letter portrait;
      margin: 2.2cm 2.2cm 2cm 2.2cm;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: "Times New Roman", Times, Georgia, serif;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 0;
      font-size: 11.5pt;
      line-height: 1.65;
    }
    .page {
      position: relative;
      min-height: 100%;
    }
    .watermark {
      position: absolute;
      inset: 18% 10%;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.10;
      pointer-events: none;
      z-index: 0;
    }
    .watermark img {
      width: 70%;
      height: auto;
    }
    .container {
      width: 100%;
      max-width: 100%;
      position: relative;
      z-index: 1;
    }
    .header-title {
      text-align: center;
      font-size: 18pt;
      font-weight: bold;
      letter-spacing: 6px;
      margin-bottom: 22px;
      text-transform: uppercase;
    }
    .meta-top {
      display: flex;
      justify-content: space-between;
      border-bottom: 1.5px solid #000;
      padding-bottom: 8px;
      margin-bottom: 20px;
      font-weight: bold;
      font-size: 11.5pt;
    }
    .location-date {
      font-weight: bold;
      margin-bottom: 18px;
      text-transform: uppercase;
    }
    .body-paragraph {
      text-align: justify;
      text-indent: 1.5em;
      margin-bottom: 16px;
      line-height: 1.7;
    }
    .body-plain {
      text-align: justify;
      margin-bottom: 16px;
      line-height: 1.7;
    }
    .signatures-grid {
      display: flex;
      justify-content: space-between;
      gap: 30px;
      margin-top: 36px;
    }
    .signature-box {
      width: 46%;
      text-align: center;
    }
    .signature-title {
      font-weight: bold;
      font-size: 10pt;
      letter-spacing: 1px;
      margin-bottom: 44px;
    }
    .signature-line {
      border-top: 1.5px solid #000;
      padding-top: 6px;
      font-weight: bold;
      font-size: 10.5pt;
    }
    .signature-subtitle {
      font-size: 9pt;
      letter-spacing: 1.5px;
      color: #333;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="watermark"><img src="${watermark}" alt=""></div>
    <div class="container">
      <div class="header-title">P A G A R É</div>
      
      <div class="meta-top">
        <div>NO. ${p.folio}</div>
        <div>BUENO POR: $${money(p.monto)}</div>
      </div>

      <div class="location-date">
        EN ${p.lugarExpedicion}, A ${fecha.texto}.
      </div>

      <div class="body-paragraph">
        DEBO Y PAGARÉ INCONDICIONALMENTE, POR ESTE PAGARÉ A LA ORDEN DE <strong>${p.acreedor}</strong>, LA CANTIDAD DE <strong>$${money(p.monto)} (${numeroALetras(p.monto)})</strong>, en el domicilio habitual de pago de AGC Servicios Financieros, el día <strong>${p.fechaPagoDia}</strong> del mes de <strong>${p.fechaPagoMes}</strong> del año <strong>${p.fechaPagoAnio}</strong>.
      </div>

      <div class="body-plain">
        VALOR RECIBIDO A ENTERA SATISFACCIÓN. ESTE PAGARÉ FORMA PARTE DE UNA SERIE NUMERADA DE 1 DE 1 Y ESTÁ SUJETO A LAS CONDICIONES DE QUE, AL NO PAGARSE A SU VENCIMIENTO, CAUSARÁ INTERESES MORATORIOS AL TIPO DEL <strong>${p.tasaMensual} MENSUAL</strong>.
      </div>

      <div class="body-plain">
        NOTA: El importe de la causa de intereses será saldado los días <strong>${p.fechaPagoDia}</strong> de cada mes mediante recibo firmado por la interesada. El presente contrato tendrá vigencia inicial de <strong>${p.vigenciaMeses} meses</strong> a partir de <strong>${fechaDocumento(p.inicioRendimiento).texto}</strong>.
      </div>

      <div class="signatures-grid">
        ${responsables}
      </div>
    </div>
  </div>
</body>
</html>`;
}

export { imprimirDocumentoHtml };
