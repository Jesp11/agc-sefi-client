import { desglosarFecha, generarCalendarioTarjetaCobro, imprimirDocumentoHtml, resolverTasaCredito } from "@/lib/document-templates";

export interface TarjetaCobroGrupalIntegrante {
  nombre: string;
  telefono: string;
  responsable?: boolean;
}

export interface TarjetaCobroGrupalParams {
  empresa: string;
  subtitulo: string;
  titulo: string;
  grupo: string;
  idGrupo: string;
  cicloActual: number | string;
  cicloAnterior: number | string;
  fechaInicio: string;
  fechaTermino: string;
  tasaAplicada: string;
  plazoSemanas: number;
  creditoTotal: number;
  pagoGrupalSemanal: number;
  asesor: string;
  multaHorario: number | string;
  multaDia: number | string;
  horaLimitePago: string;
  integrantes: TarjetaCobroGrupalIntegrante[];
  pagos: Array<{
    fecha: string;
    semanaTexto?: string;
    monto: number;
    multa?: string;
    ahorro?: string;
    integrante?: string;
    total?: string;
  }>;
}

function calcFechaTermino(fechaPrimerPago?: string | null, plazos?: number): string {
  if (!fechaPrimerPago || !plazos) return "—";
  const [y, m, d] = String(fechaPrimerPago).split("-").map(Number);
  if (!y || !m || !d) return "—";
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + (plazos - 1) * 7);
  return desglosarFecha(date.toISOString().split("T")[0]).texto;
}

export function buildTarjetaCobroGrupalParams(credito: any): TarjetaCobroGrupalParams {
  const tablaAmort = Array.isArray(credito?.tabla_amortizacion)
    ? credito.tabla_amortizacion[0]
    : credito?.tabla_amortizacion ?? {};
  const integrantesExcel = Array.isArray(tablaAmort?.integrantes) ? tablaAmort.integrantes : [];
  const integrantesGrupo = Array.isArray(credito?.grupo?.clientes) ? credito.grupo.clientes : [];
  const integrantesBase = integrantesGrupo.length > 0
    ? integrantesGrupo.map((item: any, index: number) => ({
        nombre: String(item?.nombre_completo ?? item?.nombre ?? "—").toUpperCase(),
        telefono: item?.telefono || "—",
        responsable: index === 0,
      }))
    : integrantesExcel.map((item: any, index: number) => ({
        nombre: String(item?.nombre ?? "—").toUpperCase(),
        telefono: item?.telefono || "—",
        responsable: index === 0,
      }));

  const plazos = Number(credito?.plazos ?? 0) || 16;
  const valorFicha = Number(credito?.valor_ficha ?? 0);
  const calendario = generarCalendarioTarjetaCobro(credito?.fecha_primer_pago, plazos, valorFicha);

  return {
    empresa: "A G C",
    subtitulo: "SERVICIOS FINANCIEROS",
    titulo: "TARJETA DE PAGOS GRUPALES",
    grupo: String(credito?.grupo?.nombre_grupo ?? "GRUPO NO ESPECIFICADO").toUpperCase(),
    idGrupo: credito?.grupo?.id_grupo || credito?.grupo?.codigo || credito?.id_grupo || "—",
    cicloActual: Number(credito?.ciclo ?? 1) || 1,
    cicloAnterior: Math.max(0, (Number(credito?.ciclo ?? 1) || 1) - 1),
    fechaInicio: desglosarFecha(credito?.fecha_otorgacion || credito?.fecha_primer_pago).texto,
    fechaTermino: calcFechaTermino(credito?.fecha_primer_pago, plazos),
    tasaAplicada: resolverTasaCredito(credito, "grupal"),
    plazoSemanas: plazos,
    creditoTotal: Number(credito?.credito_total_grupal ?? credito?.total ?? 0),
    pagoGrupalSemanal: valorFicha,
    asesor: String(credito?.asesor?.nombre_asesor ?? "—").toUpperCase(),
    multaHorario: 75,
    multaDia: 100,
    horaLimitePago: "14:00",
    integrantes: integrantesBase,
    pagos: calendario.map((item) => ({
      fecha: item.fecha,
      semanaTexto: item.semanaTexto,
      monto: Number(item.monto ?? 0),
      multa: "",
      ahorro: "",
      integrante: "",
      total: "",
    })),
  };
}

export function generarTarjetaCobroGrupalMarkdown(p: TarjetaCobroGrupalParams): string {
  const montoCredito = Number(p.creditoTotal).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const montoSemanal = Number(p.pagoGrupalSemanal).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const responsableNombre = p.integrantes.find((i) => i.responsable)?.nombre || p.integrantes[0]?.nombre || "REPRESENTANTE DEL GRUPO";

  const integrantesMd = p.integrantes
    .map((item, index) => `| **${item.responsable || index === 0 ? "RESPONSABLE" : `INTEGRANTE ${index + 1}`}** | ${item.nombre} | ${item.telefono} |`)
    .join("\n");

  const pagosMd = p.pagos
    .map((item) => `| ${item.fecha} | ${item.semanaTexto || "SEMANA"} | $${Number(item.monto).toLocaleString("es-MX", { minimumFractionDigits: 2 })} | | | |`)
    .join("\n");

  return `# ${p.empresa}
## ${p.subtitulo}
### ${p.titulo}

---

| Campo | Valor | Campo | Valor |
| :--- | :--- | :--- | :--- |
| **GRUPO:** | ${p.grupo} | **TASA:** | ${p.tasaAplicada} |
| **ID GRUPO:** | ${p.idGrupo} | **MONTO TOTAL:** | $${montoCredito} |
| **CICLO ACTUAL:** | ${p.cicloActual} | **CICLO ANTERIOR:** | ${p.cicloAnterior} |
| **FECHA INICIO:** | ${p.fechaInicio} | **FECHA TERMINO:** | ${p.fechaTermino} |
| **PLAZO:** | ${p.plazoSemanas} SEMANAS | **PAGO SEMANAL:** | $${montoSemanal} |
| **ASESOR:** | ${p.asesor} | | |

---

### INTEGRANTES DEL GRUPO SOLIDARIO

| Rol | Nombre | Celular |
| :--- | :--- | :--- |
${integrantesMd}

---

### CALENDARIO DE PAGOS

| FECHA | SEMANA | MONTO | MULTA | TOTAL | ASESOR (FIRMA) |
| :---: | :---: | :---: | :---: | :---: | :---: |
${pagosMd}

---

### MULTAS Y CONDICIONES SOLIDARIAS

* **RETARDO EN HORARIO:** $${p.multaHorario} *(El cierre de pago deberá efectuar antes de las ${p.horaLimitePago} horas, a fin de evitar cobro de multas)*
* **RETARDO POR DÍA:** $${p.multaDia}

**ACEPTAMOS PLAZO Y CONDICIONES SOLIDARIAMENTE:**  
&nbsp;  
_________________________________________  
**${responsableNombre}**  
**RESPONSABLE DEL GRUPO**
`;
}

export function generarTarjetaCobroGrupalHtml(p: TarjetaCobroGrupalParams): string {
  const montoCredito = Number(p.creditoTotal).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const montoSemanal = Number(p.pagoGrupalSemanal).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const watermark = "/logo.png";
  const responsableNombre = p.integrantes.find((i) => i.responsable)?.nombre || p.integrantes[0]?.nombre || "REPRESENTANTE DEL GRUPO";

  const integrantesHtml = p.integrantes
    .map((item, index) => `
      <tr>
        <td class="font-bold bg-gray" style="width: 25%;">${item.responsable || index === 0 ? "RESPONSABLE" : `INTEGRANTE ${index + 1}`}:</td>
        <td style="width: 45%;">${item.nombre}</td>
        <td class="font-bold bg-gray text-center" style="width: 12%;">CELULAR:</td>
        <td style="width: 18%;">${item.telefono}</td>
      </tr>
    `)
    .join("");

  const rowsHtml = p.pagos
    .map((item, index) => `
      <tr>
        <td class="text-center font-mono">${item.fecha}</td>
        <td class="text-center font-bold">${item.semanaTexto || `SEMANA ${index + 1}`}</td>
        <td class="text-right font-bold">$${Number(item.monto).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
        <td class="text-center font-mono">${item.multa || ""}</td>
        <td class="text-right font-bold">${item.total ? `$${item.total}` : ""}</td>
        <td class="text-center"></td>
      </tr>
    `)
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Tarjeta de Pagos Grupales - ${p.grupo}</title>
  <style>
    @page {
      size: letter portrait;
      margin: 1.2cm 1.4cm 1.2cm 1.4cm;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 0;
      font-size: 8.5pt;
      line-height: 1.25;
    }
    .page {
      position: relative;
      min-height: 100%;
      page-break-after: always;
    }
    .page:last-child {
      page-break-after: auto;
    }
    .watermark {
      position: absolute;
      inset: 18% 10%;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.12;
      pointer-events: none;
      z-index: 0;
    }
    .watermark img {
      width: 72%;
      height: auto;
    }
    .container {
      width: 100%;
      max-width: 100%;
      position: relative;
      z-index: 1;
    }
    .header-box {
      text-align: center;
      margin-bottom: 8px;
    }
    .header-title-main {
      font-size: 15pt;
      font-weight: 900;
      letter-spacing: 4px;
      margin: 0;
    }
    .header-subtitle {
      font-size: 10pt;
      font-weight: bold;
      letter-spacing: 2px;
      margin: 1px 0;
    }
    .header-doc-type {
      font-size: 9.5pt;
      font-weight: bold;
      letter-spacing: 1.5px;
      background: #e2e8f0;
      padding: 3px 0;
      border: 1px solid #000;
      margin-top: 4px;
      text-transform: uppercase;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
    }
    th, td {
      border: 1px solid #000;
      padding: 2.5px 4px;
      font-size: 8pt;
    }
    .meta-table td {
      padding: 2.5px 5px;
      font-size: 7.5pt;
    }
    .schedule-table th {
      background: #e2e8f0;
      font-weight: bold;
      text-align: center;
      font-size: 8pt;
      padding: 3px;
    }
    .schedule-table td {
      height: 18px;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: bold; }
    .font-mono { font-family: ui-monospace, monospace; font-size: 7.5pt; }
    .bg-gray { background: #f1f5f9; }
    .rules-box {
      border: 1px solid #000;
      padding: 5px 8px;
      margin-top: 5px;
      font-size: 7.5pt;
      background: transparent;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="watermark"><img src="${watermark}" alt=""></div>
    <div class="container">
      <div class="header-box">
        <div class="header-title-main">${p.empresa}</div>
        <div class="header-subtitle">${p.subtitulo}</div>
        <div class="header-doc-type">${p.titulo}</div>
      </div>

      <!-- Group & Loan Summary Table -->
      <table class="meta-table">
        <tr>
          <td class="font-bold bg-gray" style="width: 18%;">GRUPO:</td>
          <td class="font-bold" style="width: 47%;">${p.grupo}</td>
          <td class="font-bold bg-gray" style="width: 15%;">TASA:</td>
          <td class="font-bold" style="width: 20%;">${p.tasaAplicada}</td>
        </tr>
        <tr>
          <td class="font-bold bg-gray">ID GRUPO:</td>
          <td class="font-mono">${p.idGrupo}</td>
          <td class="font-bold bg-gray">MONTO TOTAL:</td>
          <td class="font-bold">$${montoCredito}</td>
        </tr>
        <tr>
          <td class="font-bold bg-gray">CICLO ACTUAL:</td>
          <td>${p.cicloActual}</td>
          <td class="font-bold bg-gray">CICLO ANT.:</td>
          <td>${p.cicloAnterior}</td>
        </tr>
        <tr>
          <td class="font-bold bg-gray">FECHA INICIO:</td>
          <td>${p.fechaInicio}</td>
          <td class="font-bold bg-gray">TERMINO:</td>
          <td>${p.fechaTermino}</td>
        </tr>
        <tr>
          <td class="font-bold bg-gray">PLAZO:</td>
          <td class="font-bold">${p.plazoSemanas} SEMANAS</td>
          <td class="font-bold bg-gray">PAGO SEMANAL:</td>
          <td class="font-bold">$${montoSemanal}</td>
        </tr>
        <tr>
          <td class="font-bold bg-gray">ASESOR:</td>
          <td colspan="3" class="font-bold">${p.asesor}</td>
        </tr>
      </table>

      <!-- Integrantes Table -->
      <table class="meta-table">
        <thead>
          <tr>
            <th colspan="4" class="font-bold text-center" style="background: #e2e8f0; font-size: 8pt; padding: 3px;">
              INTEGRANTES DEL GRUPO SOLIDARIO
            </th>
          </tr>
        </thead>
        <tbody>
          ${integrantesHtml}
        </tbody>
      </table>

      <!-- Weekly Schedule Table -->
      <table class="schedule-table">
        <thead>
          <tr>
            <th style="width: 18%;">FECHA</th>
            <th style="width: 22%;">SEMANA</th>
            <th style="width: 18%;">MONTO</th>
            <th style="width: 14%;">MULTA</th>
            <th style="width: 14%;">TOTAL</th>
            <th style="width: 14%;">ASESOR</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <!-- Multas and Acceptance Box -->
      <table class="meta-table" style="margin-bottom: 4px;">
        <tr>
          <td class="font-bold bg-gray" style="width: 26%;">RETARDO EN HORARIO:</td>
          <td class="font-bold text-center" style="width: 14%;">$${p.multaHorario}.00</td>
          <td rowspan="2" class="text-center" style="width: 60%; vertical-align: bottom;">
            <div style="font-size: 7.5pt; font-weight: bold; margin-bottom: 22px;">ACEPTAMOS PLAZO Y CONDICIONES SOLIDARIAMENTE</div>
            <div style="border-top: 1px solid #000; width: 85%; margin: 0 auto; padding-top: 2px; font-weight: bold; font-size: 7pt;">
              ${responsableNombre} (RESPONSABLE DEL GRUPO)
            </div>
          </td>
        </tr>
        <tr>
          <td class="font-bold bg-gray">RETARDO POR DIA:</td>
          <td class="font-bold text-center">$${p.multaDia}.00</td>
        </tr>
      </table>

      <!-- Rules footer -->
      <div class="rules-box">
        <div class="font-bold" style="text-align: center; color: #991b1b; margin-bottom: 3px;">
          EL CIERRE DE PAGO DEBERÁ EFECTUARSE ANTES DE LAS ${p.horaLimitePago} HORAS, A FIN DE EVITAR COBRO DE MULTAS.
        </div>
        <div style="font-size: 7pt; line-height: 1.35;">
          <div><strong>1.- UN RETRASO:</strong> Pierde derecho de refinanciamiento anticipado y deberá esperar la renovación normal.</div>
          <div><strong>2.- DOS RETRASOS:</strong> Con derecho a renovar al término de ciclo, sin aumento de crédito.</div>
          <div><strong>3.- TRES RETRASOS:</strong> Pierde derecho a renovación, quedando suspendido durante dos ciclos.</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export { imprimirDocumentoHtml };
