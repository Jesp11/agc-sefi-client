/**
 * Utilidades para generación de documentos de préstamos individuales:
 * 1. Pagaré
 * 2. Carta de Adeudo
 * 3. Tarjeta de Cobro / Tarjeta de Pagos
 */

export interface DocumentoAdeudoParams {
  noPagare: string;
  monto: number;
  montoLetras?: string;
  lugarExpedicion: string;
  fechaExpedicion: string;
  fechaExpedicionLetras?: string;
  nombreAcreedor: string;
  domicilioPago: string;
  diaVencimiento: string;
  mesVencimiento: string;
  anioVencimiento: string;
  fechaVencimientoLetras?: string;
  serieActual: number | string;
  serieTotal: number | string;
  tasaInteresMoratorio: string;
  claveElector: string;
  tipoComprobante: string;
  nombreCliente: string;
  curp: string;
  direccion: string;
  entreCalles: string;
  colonia: string;
  ciudadEstadoCp: string;
  ciudadOrigen: string;
  telefono: string;
  nombreTestigo: string;
}

export interface TarjetaCobroItem {
  semana: number;
  semanaTexto: string;
  fecha: string;
  monto: number;
}

export interface TarjetaCobroParams {
  empresa: string;
  subtitulo: string;
  titulo: string;
  nombreCliente: string;
  domicilio: string;
  celCliente: string;
  idCliente: string;
  cicloActual: number | string;
  cicloAnterior: number | string;
  fechaInicio: string;
  fechaTermino: string;
  tasa: string;
  montoOtorgado: number;
  plazoSemanas: number;
  valorFicha: number;
  refFamParentesco: string;
  refFamNombre: string;
  refFamCel: string;
  refFamDireccion: string;
  refPerTipo: string;
  refPerNombre: string;
  refPerCel: string;
  refPerDireccion: string;
  nombreAsesor: string;
  multaHorario: number | string;
  multaDia: number | string;
  horaLimitePago: string;
  pagos: TarjetaCobroItem[];
}

const MESES = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
];

function Unidades(num: number): string {
  switch (num) {
    case 1: return "UN";
    case 2: return "DOS";
    case 3: return "TRES";
    case 4: return "CUATRO";
    case 5: return "CINCO";
    case 6: return "SEIS";
    case 7: return "SIETE";
    case 8: return "OCHO";
    case 9: return "NUEVE";
  }
  return "";
}

function DecenasY(strSin: string, numUnidades: number): string {
  if (numUnidades > 0) return strSin + " Y " + Unidades(numUnidades);
  return strSin;
}

function Decenas(num: number): string {
  const decena = Math.floor(num / 10);
  const unidad = num - decena * 10;
  switch (decena) {
    case 1:
      switch (unidad) {
        case 0: return "DIEZ";
        case 1: return "ONCE";
        case 2: return "DOCE";
        case 3: return "TRECE";
        case 4: return "CATORCE";
        case 5: return "QUINCE";
        default: return "DIECI" + Unidades(unidad);
      }
    case 2:
      switch (unidad) {
        case 0: return "VEINTE";
        case 1: return "VEINTIUN";
        case 2: return "VEINTIDOS";
        case 3: return "VEINTITRES";
        case 4: return "VEINTICUATRO";
        case 5: return "VEINTICINCO";
        case 6: return "VEINTISEIS";
        case 7: return "VEINTISIETE";
        case 8: return "VEINTIOCHO";
        case 9: return "VEINTINUEVE";
      }
      break;
    case 3: return DecenasY("TREINTA", unidad);
    case 4: return DecenasY("CUARENTA", unidad);
    case 5: return DecenasY("CINCUENTA", unidad);
    case 6: return DecenasY("SESENTA", unidad);
    case 7: return DecenasY("SETENTA", unidad);
    case 8: return DecenasY("OCHENTA", unidad);
    case 9: return DecenasY("NOVENTA", unidad);
    case 0: return Unidades(unidad);
  }
  return "";
}

function Centenas(num: number): string {
  const centenas = Math.floor(num / 100);
  const decenas = num - centenas * 100;
  switch (centenas) {
    case 1:
      if (decenas > 0) return "CIENTO " + Decenas(decenas);
      return "CIEN";
    case 2: return "DOSCIENTOS " + Decenas(decenas);
    case 3: return "TRESCIENTOS " + Decenas(decenas);
    case 4: return "CUATROCIENTOS " + Decenas(decenas);
    case 5: return "QUINIENTOS " + Decenas(decenas);
    case 6: return "SEISCIENTOS " + Decenas(decenas);
    case 7: return "SETECIENTOS " + Decenas(decenas);
    case 8: return "OCHOCIENTOS " + Decenas(decenas);
    case 9: return "NOVECIENTOS " + Decenas(decenas);
  }
  return Decenas(decenas);
}

function Miles(num: number): string {
  const divisor = 1000;
  const cientos = Math.floor(num / divisor);
  const resto = num - cientos * divisor;
  let strMiles = "";
  if (cientos === 1) {
    strMiles = "MIL";
  } else if (cientos > 1) {
    strMiles = Centenas(cientos) + " MIL";
  }
  const strCentenas = Centenas(resto);
  if (strMiles === "") return strCentenas;
  return (strMiles + " " + strCentenas).trim();
}

function Millones(num: number): string {
  const divisor = 1000000;
  const cientos = Math.floor(num / divisor);
  const resto = num - cientos * divisor;
  let strMillones = "";
  if (cientos === 1) {
    strMillones = "UN MILLON";
  } else if (cientos > 1) {
    strMillones = Centenas(cientos) + " MILLONES";
  }
  const strMiles = Miles(resto);
  if (strMillones === "") return strMiles;
  return (strMillones + " " + strMiles).trim();
}

/**
 * Convierte un número decimal a su representación formal en letras (pesos mexicanos).
 * Ejemplo: 4000 -> "CUATRO MIL PESOS 00/100 M.N."
 */
export function numeroALetras(num: number): string {
  if (num == null || isNaN(num)) return "CERO PESOS 00/100 M.N.";
  const enteros = Math.floor(Math.abs(num));
  const centavos = Math.round((Math.abs(num) - enteros) * 100);
  const centavosStr = centavos.toString().padStart(2, "0");
  if (enteros === 0) return "CERO PESOS " + centavosStr + "/100 M.N.";
  if (enteros === 1) return "UN PESO " + centavosStr + "/100 M.N.";
  return (Millones(enteros) + " PESOS " + centavosStr + "/100 M.N.").replace(/\s+/g, " ").trim();
}

/**
 * Desglosa una fecha ISO (YYYY-MM-DD) en día, mes en texto y año.
 */
export function desglosarFecha(dateStr?: string | null): { dia: string; mes: string; anio: string; texto: string; formatoCorto: string } {
  if (!dateStr) {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, "0");
    const m = MESES[now.getMonth()];
    const mNum = String(now.getMonth() + 1).padStart(2, "0");
    const y = String(now.getFullYear());
    return { dia: d, mes: m, anio: y, texto: `${d} DE ${m} DE ${y}`, formatoCorto: `${d}/${mNum}/${y}` };
  }
  const clean = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr.trim();
  const parts = clean.split("-");
  if (parts.length === 3) {
    const y = parts[0];
    const mIndex = Math.max(0, Math.min(11, parseInt(parts[1], 10) - 1));
    const mNum = parts[1].padStart(2, "0");
    const d = parts[2].padStart(2, "0");
    const m = MESES[mIndex];
    return { dia: d, mes: m, anio: y, texto: `${d} DE ${m} DE ${y}`, formatoCorto: `${d}/${mNum}/${y}` };
  }
  return { dia: "____", mes: "____________", anio: "________", texto: dateStr.toUpperCase(), formatoCorto: dateStr };
}

/**
 * Extrae y normaliza los parámetros para generar los documentos Pagaré / Carta de Adeudo.
 */
export function buildDocumentoAdeudoParams(
  credito: any,
  opciones?: {
    usarSaldoPendiente?: boolean;
    nombreAcreedor?: string;
    domicilioPago?: string;
    nombreTestigo?: string;
    tipoComprobante?: string;
    tasaMoratoria?: string;
    lugarExpedicion?: string;
  }
): DocumentoAdeudoParams {
  const cliente = credito?.cliente || {};
  const mora = credito?.mora || {};
  const fechaOtorgacion = desglosarFecha(credito?.fecha_otorgacion);

  // Cálculo de fecha de vencimiento (último pago)
  const calcFechaVencimiento = () => {
    if (!credito?.fecha_primer_pago || !credito?.plazos) return desglosarFecha(null);
    const [y, m, d] = String(credito.fecha_primer_pago).split("-").map(Number);
    if (!y || !m || !d) return desglosarFecha(null);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + (Number(credito.plazos) - 1) * 7);
    const iso = date.toISOString().split("T")[0];
    return desglosarFecha(iso);
  };

  const fechaVenc = calcFechaVencimiento();

  const saldoActual = Number(mora.saldo_actual ?? credito?.saldo_pendiente ?? credito?.total ?? 0);
  const montoTotal = Number(credito?.total ?? credito?.monto_otorgado ?? 0);
  const montoSeleccionado = opciones?.usarSaldoPendiente ? (saldoActual > 0 ? saldoActual : montoTotal) : (montoTotal > 0 ? montoTotal : saldoActual);

  const numProgPadded = String(credito?.num_prog || "001").padStart(3, "0");
  const anioOtorgacion = fechaOtorgacion.anio || new Date().getFullYear().toString();
  const noPagare = `${numProgPadded}/${anioOtorgacion}`;

  // Testigo por defecto: aval registrado o asesor
  const avalRegistrado = cliente?.avales && cliente.avales.length > 0 ? cliente.avales[0].nombre : null;
  const testigoDefault = opciones?.nombreTestigo || avalRegistrado || credito?.asesor?.nombre_asesor || "_____________________________";

  return {
    noPagare: noPagare,
    monto: montoSeleccionado,
    montoLetras: numeroALetras(montoSeleccionado),
    lugarExpedicion: (opciones?.lugarExpedicion || "TAMPICO, TAMPS.").toUpperCase(),
    fechaExpedicion: credito?.fecha_otorgacion || new Date().toISOString().split("T")[0],
    fechaExpedicionLetras: fechaOtorgacion.texto,
    nombreAcreedor: (opciones?.nombreAcreedor || "AGC SERVICIOS FINANCIEROS").toUpperCase(),
    domicilioPago: (opciones?.domicilioPago || "SEXTA PRIVADA NUM. 514, ZONA CENTRO DE LA CIUDAD DE TAMPICO, ESTADO DE TAMAULIPAS").toUpperCase(),
    diaVencimiento: fechaVenc.dia,
    mesVencimiento: fechaVenc.mes,
    anioVencimiento: fechaVenc.anio,
    fechaVencimientoLetras: fechaVenc.texto,
    serieActual: "1",
    serieTotal: "1",
    tasaInteresMoratorio: opciones?.tasaMoratoria || "20%",
    claveElector: (cliente?.clave_elector || "NO ESPECIFICADA").toUpperCase(),
    tipoComprobante: (opciones?.tipoComprobante || "COMAPA").toUpperCase(),
    nombreCliente: (cliente?.nombre_completo || "CLIENTE SIN NOMBRE").toUpperCase(),
    curp: (cliente?.curp || "NO ESPECIFICADA").toUpperCase(),
    direccion: (cliente?.direccion || "DOMICILIO CONOCIDO").toUpperCase(),
    entreCalles: (cliente?.entre_calles || "").toUpperCase(),
    colonia: "COLONIA REGISTRADA",
    ciudadEstadoCp: "TAMPICO, TAMPS.",
    ciudadOrigen: "TAMPICO, TAMAULIPAS",
    telefono: cliente?.telefono || "—",
    nombreTestigo: testigoDefault.toUpperCase(),
  };
}

/**
 * Genera el documento Pagaré en formato Markdown.
 */
export function generarPagareMarkdown(p: DocumentoAdeudoParams): string {
  const montoFormat = Number(p.monto).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const montoLetras = p.montoLetras || numeroALetras(p.monto);

  return `# P A G A R E

**NO.**   ${p.noPagare} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **BUENO POR:** $ ${montoFormat}

**EN ${p.lugarExpedicion}, A ${p.fechaExpedicionLetras}.**

…..DEBO Y PAGARE INCONDICIONALMENTE, POR ESTE PAGARE A LA ORDEN DE **${p.nombreAcreedor}**, LA CANTIDAD DE **$ ${montoFormat} (${montoLetras})**, EN EL DOMICILIO **${p.domicilioPago}**, EL DIA **${p.diaVencimiento}** DEL MES DE **${p.mesVencimiento}** DEL AÑO **${p.anioVencimiento}**, LA CANTIDAD DE **$ ${montoFormat} (${montoLetras})**.

VALOR RECIBIDO A ENTERA SATISFACCIÓN. ESTE PAGARE FORMA PARTE DE UNA SERIE NUMERADA DE ${p.serieActual} DE ${p.serieTotal} Y ESTA SUJETO A LAS CONDICIONES DE QUE, AL NO PAGARSE A SU VENCIMIENTO DE ESTE DOCUMENTO HASTA EL TIEMPO DE SU LIQUIDACIÓN, CAUSARA INTERESES MORATORIOS AL TIPO DEL ${p.tasaInteresMoratorio} MENSUAL, PAGADERO EN ESTA CIUDAD JUSTAMENTE CON EL PRINCIPIO.

SE RECIBE COMO IDENTIFICACION OFICIAL COPIA DE SU IDENTIFICACION INE CON CLAVE ELECTOR **${p.claveElector}**, COMPROBANTE DE DOMICILIO DE **${p.tipoComprobante}** QUE RATIFICA EL DOMICILIO PARTICULAR DE LA PARTE ADEUDORA.

---

### DATOS DEL DEUDOR: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; A C E P T O :

**NOMBRE:** ${p.nombreCliente}  
**CURP:** ${p.curp}  
**DIRECCIÓN:** ${p.direccion}${p.entreCalles ? ` (ENTRE ${p.entreCalles})` : ""}  
**CIUDAD / ESTADO:** ${p.ciudadEstadoCp}  
**TELEFONO:** ${p.telefono}  

&nbsp;  
&nbsp;  

____________________________________________________  
**${p.nombreCliente}**  
**FIRMA**
`;
}

/**
 * Genera la Carta de Adeudo en formato Markdown.
 */
export function generarCartaAdeudoMarkdown(p: DocumentoAdeudoParams): string {
  const montoFormat = Number(p.monto).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const montoLetras = p.montoLetras || numeroALetras(p.monto);

  return `# C A R T A &nbsp;&nbsp; A D E U D O

**A QUIEN CORRESPONDA:**

…..EL (LA) QUE SUSCRIBE **${p.nombreCliente}**, ORIGINARIO (A) DE CIUDAD DE **${p.ciudadOrigen}**, CON DOMICILIO PARTICULAR EN **${p.direccion}**${p.entreCalles ? `, ENTRE ${p.entreCalles}` : ""}, RECONOZCO EL ADEUDO CONTRAIDO CON EL SR. (A) **${p.nombreAcreedor}**, AMPARADO EN EL PAGARE **${p.serieActual} DE ${p.serieTotal}** DE FECHA **${p.fechaExpedicionLetras}**, POR LA CANTIDAD DE **$ ${montoFormat} (${montoLetras})**, BAJO LAS CONDICIONES QUE INDICA REFERIDO PAGARE.

PRESTAMO QUE FUE OTORGADO Y RECIBIDO A LA VEZ SIN FINES DE LUCRO, Y COMO APOYO PERSONAL EN FORMA DE CONFIANZA AMISTOSA.

POR LO CUAL PROPORCIONE POR VOLUNTAD PROPIA COMO IDENTIFICACION OFICIAL COPIA DE IDENTIFICACION OFICIAL INE CON CLAVE ELECTOR **${p.claveElector}**, Y COMPROBANTE DE DOMICILIO DE **${p.tipoComprobante}** QUE RATIFICA MI DOMICILIO PARTICULAR.

SIN MAS POR EL MOMENTO, LO QUE HAGO DE SU CONOCIMIENTO PARA LOS EFECTOS LEGALES A LOS QUE DE LUGAR LA PRESENTE.

**EN ${p.lugarExpedicion}, A ${p.fechaExpedicionLetras}.**

&nbsp;

**ATENTAMENTE**

&nbsp;  
&nbsp;  

____________________________________________________  
**${p.nombreCliente}**  
**FIRMA**

&nbsp;  
&nbsp;  

**TESTIGO**  
&nbsp;  
&nbsp;  
____________________________________________________  
**${p.nombreTestigo}**  
**FIRMA**
`;
}

/**
 * Genera el calendario de pagos semanal para la Tarjeta de Cobro.
 */
export function generarCalendarioTarjetaCobro(
  fechaPrimerPago: string | null | undefined,
  plazos: number,
  valorFicha: number
): TarjetaCobroItem[] {
  if (!fechaPrimerPago || !plazos) return [];
  const [y, m, d] = String(fechaPrimerPago).split("-").map(Number);
  if (!y || !m || !d) return [];

  return Array.from({ length: plazos }, (_, i) => {
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + i * 7);
    const iso = date.toISOString().split("T")[0];
    const { formatoCorto } = desglosarFecha(iso);
    const numSem = String(i + 1).padStart(2, "0");
    return {
      semana: i + 1,
      semanaTexto: `${numSem} SEMANAS`,
      fecha: formatoCorto,
      monto: Number(valorFicha) || 0,
    };
  });
}

/**
 * Extrae y normaliza los parámetros de la Tarjeta de Cobro a partir del crédito y cliente.
 */
export function buildTarjetaCobroParams(credito: any, overrides?: Partial<TarjetaCobroParams>): TarjetaCobroParams {
  const cliente = credito?.cliente || {};
  const referencias = cliente?.referencias || [];
  const refFam = referencias.find((r: any) => r.tipo_referencia === "Familiar") || referencias[0] || {};
  const refPer = referencias.find((r: any) => r.tipo_referencia !== "Familiar" && r.id !== refFam?.id) || referencias[1] || {};

  const plazos = Number(credito?.plazos) || 16;
  const valorFicha = Number(credito?.valor_ficha) || 0;
  const montoOtorgado = Number(credito?.monto_otorgado) || 0;
  const cicloActual = Number(credito?.ciclo) || 1;
  const cicloAnterior = cicloActual > 1 ? cicloActual - 1 : 0;

  const fechaInicioDesc = desglosarFecha(credito?.fecha_otorgacion || credito?.fecha_primer_pago);
  
  // Calcular fecha de término
  let fechaTerminoStr = "—";
  if (credito?.fecha_primer_pago && plazos) {
    const [y, m, d] = String(credito.fecha_primer_pago).split("-").map(Number);
    if (y && m && d) {
      const date = new Date(y, m - 1, d);
      date.setDate(date.getDate() + (plazos - 1) * 7);
      const iso = date.toISOString().split("T")[0];
      fechaTerminoStr = desglosarFecha(iso).texto;
    }
  }

  const pagos = generarCalendarioTarjetaCobro(credito?.fecha_primer_pago, plazos, valorFicha);

  const base: TarjetaCobroParams = {
    empresa: "A G C",
    subtitulo: "SERVICIOS FINANCIEROS",
    titulo: "TARJETA DE PAGOS",
    nombreCliente: (cliente?.nombre_completo || "CLIENTE NO ESPECIFICADO").toUpperCase(),
    domicilio: (cliente?.direccion ? `${cliente.direccion}${cliente.entreCalles ? `, ${cliente.entreCalles}` : ""}, TAMPICO, TAMPS.` : "DOMICILIO REGISTRADO").toUpperCase(),
    celCliente: cliente?.telefono || "—",
    idCliente: cliente?.id_cliente || `CLI-${credito?.num_prog || "001"}`,
    cicloActual: cicloActual,
    cicloAnterior: cicloAnterior,
    fechaInicio: fechaInicioDesc.texto,
    fechaTermino: fechaTerminoStr,
    tasa: credito?.tasa_asignada || `TASA ${(credito?.porcentaje_interes ? Number(credito.porcentaje_interes) * 100 : 20)}%`,
    montoOtorgado: montoOtorgado,
    plazoSemanas: plazos,
    valorFicha: valorFicha,
    refFamParentesco: (refFam?.parentesco || "FAMILIAR").toUpperCase(),
    refFamNombre: (refFam?.nombre || "—").toUpperCase(),
    refFamCel: refFam?.telefono || "—",
    refFamDireccion: (refFam?.direccion || "—").toUpperCase(),
    refPerTipo: (refPer?.parentesco || refPer?.tipo_referencia || "AMISTAD").toUpperCase(),
    refPerNombre: (refPer?.nombre || "—").toUpperCase(),
    refPerCel: refPer?.telefono || "—",
    refPerDireccion: (refPer?.direccion || "—").toUpperCase(),
    nombreAsesor: (credito?.asesor?.nombre_asesor || "—").toUpperCase(),
    multaHorario: 75,
    multaDia: 100,
    horaLimitePago: "15:00",
    pagos: pagos,
  };

  return { ...base, ...overrides };
}

/**
 * Genera la Tarjeta de Cobro en formato Markdown.
 */
export function generarTarjetaCobroMarkdown(p: TarjetaCobroParams): string {
  const montoFormat = Number(p.montoOtorgado).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  const rowsMd = p.pagos.map((item) => {
    return `| ${item.fecha} | ${item.semanaTexto} | $${Number(item.monto).toLocaleString("es-MX", { minimumFractionDigits: 2 })} | | | |`;
  }).join("\n");

  return `# ${p.empresa}
## ${p.subtitulo}
### ${p.titulo}

---

| Campo | Valor | Campo | Valor |
| :--- | :--- | :--- | :--- |
| **CLIENTE:** | ${p.nombreCliente} | **TASA:** | ${p.tasa} |
| **DOMICILIO:** | ${p.domicilio} | | |
| **CEL. CLIENTE:** | ${p.celCliente} | **MONTO OTORGADO:** | $${montoFormat} |
| **ID:** | ${p.idCliente} | **PLAZO:** | ${p.plazoSemanas} SEMANAS |
| **CICLO ACTUAL:** | ${p.cicloActual} | **CICLO ANTERIOR:** | ${p.cicloAnterior} |
| **FECHA INICIO:** | ${p.fechaInicio} | **FECHA TERMINO:** | ${p.fechaTermino} |

---

### REFERENCIAS

| Referencia | Nombre | Celular | Domicilio |
| :--- | :--- | :--- | :--- |
| **REF. FAM. (${p.refFamParentesco})** | ${p.refFamNombre} | ${p.refFamCel} | ${p.refFamDireccion} |
| **REF. (${p.refPerTipo})** | ${p.refPerNombre} | ${p.refPerCel} | ${p.refPerDireccion} |

**ASESOR:** ${p.nombreAsesor}

---

### CALENDARIO DE PAGOS

| FECHA | SEMANA | MONTO | MULTA | TOTAL | ASESOR (FIRMA) |
| :---: | :---: | :---: | :---: | :---: | :---: |
${rowsMd}

---

### MULTAS Y CONDICIONES

* **RETARDO EN HORARIO:** $${p.multaHorario} *(El cierre de pago deberá efectuarse antes de las ${p.horaLimitePago} horas, a fin de evitar cobro de multas)*
* **RETARDO POR DÍA:** $${p.multaDia}

**ACEPTO PLAZO Y CONDICIONES:**  
&nbsp;  
_________________________________________  
**${p.nombreCliente}**  
**FIRMA DEL CLIENTE**

---

#### POLÍTICAS DE RENOVACIÓN
1. **Un retraso:** Pierde derecho de refinanciamiento anticipado y deberá esperar la renovación normal.
2. **Dos retrasos:** Con derecho a renovar al término de ciclo, sin aumento de crédito.
3. **Tres retrasos:** Pierde derecho a renovación, quedando suspendido durante dos ciclos.
`;
}

/**
 * Genera el HTML formateado e imprimible de la Tarjeta de Cobro (Hoja tamaño Carta).
 */
export function generarTarjetaCobroHtml(p: TarjetaCobroParams): string {
  const montoFormat = Number(p.montoOtorgado).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const rowsHtml = p.pagos.map((item) => {
    return `<tr>
      <td class="text-center font-mono">${item.fecha}</td>
      <td class="text-center font-bold">${item.semanaTexto}</td>
      <td class="text-right font-bold">$${Number(item.monto).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
      <td></td>
      <td></td>
      <td></td>
    </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Tarjeta de Pagos - ${p.nombreCliente}</title>
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
    .container {
      width: 100%;
      max-width: 100%;
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
      background: #fff;
    }
    .signatures-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 4px;
      border-top: 1px solid #000;
      padding-top: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-box">
      <div class="header-title-main">${p.empresa}</div>
      <div class="header-subtitle">${p.subtitulo}</div>
      <div class="header-doc-type">${p.titulo}</div>
    </div>

    <!-- Client and Loan Summary Table -->
    <table class="meta-table">
      <tr>
        <td class="font-bold bg-gray" style="width: 15%;">CLIENTE:</td>
        <td class="font-bold" style="width: 50%;">${p.nombreCliente}</td>
        <td class="font-bold bg-gray" style="width: 12%;">TASA:</td>
        <td class="font-bold" style="width: 23%;">${p.tasa}</td>
      </tr>
      <tr>
        <td class="font-bold bg-gray">DOMICILIO:</td>
        <td colspan="3">${p.domicilio}</td>
      </tr>
      <tr>
        <td class="font-bold bg-gray">CEL. CLIENTE:</td>
        <td>${p.celCliente}</td>
        <td class="font-bold bg-gray">MONTO:</td>
        <td class="font-bold">$${montoFormat}</td>
      </tr>
      <tr>
        <td class="font-bold bg-gray">ID:</td>
        <td class="font-mono">${p.idCliente}</td>
        <td class="font-bold bg-gray">PLAZO:</td>
        <td class="font-bold">${p.plazoSemanas} SEMANAS</td>
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
    </table>

    <!-- References Table -->
    <table class="meta-table">
      <tr>
        <td class="font-bold bg-gray" style="width: 25%;">REF. FAM. (${p.refFamParentesco})</td>
        <td style="width: 45%;">${p.refFamNombre}</td>
        <td class="font-bold bg-gray" style="width: 10%;">CEL.</td>
        <td style="width: 20%;">${p.refFamCel}</td>
      </tr>
      <tr>
        <td colspan="4" style="font-size: 7pt; color: #333;">${p.refFamDireccion}</td>
      </tr>
      <tr>
        <td class="font-bold bg-gray">REF. (${p.refPerTipo})</td>
        <td>${p.refPerNombre}</td>
        <td class="font-bold bg-gray">CEL.</td>
        <td>${p.refPerCel}</td>
      </tr>
      <tr>
        <td colspan="4" style="font-size: 7pt; color: #333;">${p.refPerDireccion}</td>
      </tr>
      <tr>
        <td class="font-bold bg-gray">ASESOR:</td>
        <td colspan="3" class="font-bold">${p.nombreAsesor}</td>
      </tr>
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
          <div style="font-size: 7.5pt; font-weight: bold; margin-bottom: 22px;">ACEPTO PLAZO Y CONDICIONES</div>
          <div style="border-top: 1px solid #000; width: 85%; margin: 0 auto; padding-top: 2px; font-weight: bold; font-size: 7pt;">
            ${p.nombreCliente} (FIRMA)
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
</body>
</html>`;
}

/**
 * Genera el HTML formateado e imprimible (formato Carta/Letter con alta resolución) para el Pagaré.
 */
export function generarPagareHtml(p: DocumentoAdeudoParams): string {
  const montoFormat = Number(p.monto).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const montoLetras = p.montoLetras || numeroALetras(p.monto);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Pagaré - Folio ${p.noPagare}</title>
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
      line-height: 1.55;
    }
    .container {
      width: 100%;
      max-width: 100%;
    }
    .header-title {
      text-align: center;
      font-size: 18pt;
      font-weight: bold;
      letter-spacing: 6px;
      margin-bottom: 24px;
      text-transform: uppercase;
    }
    .top-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: bold;
      font-size: 11.5pt;
      margin-bottom: 16px;
      border-bottom: 1.5px solid #000;
      padding-bottom: 8px;
    }
    .location-date {
      font-weight: bold;
      margin-bottom: 20px;
      text-transform: uppercase;
      font-size: 11.5pt;
    }
    .body-paragraph {
      text-align: justify;
      margin-bottom: 16px;
      text-indent: 1.5em;
      line-height: 1.6;
    }
    .body-paragraph-plain {
      text-align: justify;
      margin-bottom: 16px;
      line-height: 1.6;
    }
    .section-divider {
      border-top: 1px dashed #444;
      margin: 24px 0 18px 0;
    }
    .debtor-section {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
    }
    .debtor-info {
      width: 52%;
      font-size: 10.5pt;
      line-height: 1.5;
    }
    .debtor-info-title {
      font-weight: bold;
      letter-spacing: 1px;
      margin-bottom: 10px;
      font-size: 11.5pt;
    }
    .accept-section {
      width: 44%;
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .accept-title {
      font-weight: bold;
      letter-spacing: 4px;
      font-size: 12pt;
      margin-bottom: 40px;
    }
    .signature-line {
      border-top: 1.5px solid #000;
      margin-top: 45px;
      padding-top: 6px;
      font-weight: bold;
      font-size: 10.5pt;
      text-align: center;
    }
    .signature-subtitle {
      font-size: 9.5pt;
      letter-spacing: 2px;
      color: #333;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-title">P A G A R E</div>
    
    <div class="top-meta">
      <div>NO. ${p.noPagare}</div>
      <div>BUENO POR: $ ${montoFormat}</div>
    </div>

    <div class="location-date">
      EN ${p.lugarExpedicion}, A ${p.fechaExpedicionLetras}.
    </div>

    <div class="body-paragraph">
      …..DEBO Y PAGARE INCONDICIONALMENTE, POR ESTE PAGARE A LA ORDEN DE <strong>${p.nombreAcreedor}</strong>, LA CANTIDAD DE <strong>$ ${montoFormat} (${montoLetras})</strong>, EN EL DOMICILIO <strong>${p.domicilioPago}</strong>, EL DIA <strong>${p.diaVencimiento}</strong> DEL MES DE <strong>${p.mesVencimiento}</strong> DEL AÑO <strong>${p.anioVencimiento}</strong>, LA CANTIDAD DE <strong>$ ${montoFormat} (${montoLetras})</strong>.
    </div>

    <div class="body-paragraph-plain">
      VALOR RECIBIDO A ENTERA SATISFACCIÓN. ESTE PAGARE FORMA PARTE DE UNA SERIE NUMERADA DE ${p.serieActual} DE ${p.serieTotal} Y ESTA SUJETO A LAS CONDICIONES DE QUE, AL NO PAGARSE A SU VENCIMIENTO DE ESTE DOCUMENTO HASTA EL TIEMPO DE SU LIQUIDACIÓN, CAUSARA INTERESES MORATORIOS AL TIPO DEL <strong>${p.tasaInteresMoratorio} MENSUAL</strong>, PAGADERO EN ESTA CIUDAD JUSTAMENTE CON EL PRINCIPIO.
    </div>

    <div class="body-paragraph-plain">
      SE RECIBE COMO IDENTIFICACION OFICIAL COPIA DE SU IDENTIFICACION INE CON CLAVE ELECTOR <strong>${p.claveElector}</strong>, COMPROBANTE DE DOMICILIO DE <strong>${p.tipoComprobante}</strong> QUE RATIFICA EL DOMICILIO PARTICULAR DE LA PARTE ADEUDORA.
    </div>

    <div class="section-divider"></div>

    <div class="debtor-section">
      <div class="debtor-info">
        <div class="debtor-info-title">DATOS DEL DEUDOR:</div>
        <div><strong>NOMBRE:</strong> ${p.nombreCliente}</div>
        <div><strong>CURP:</strong> ${p.curp}</div>
        <div><strong>DIRECCIÓN:</strong> ${p.direccion}</div>
        ${p.entreCalles ? `<div><strong>ENTRE CALLES:</strong> ${p.entreCalles}</div>` : ""}
        <div><strong>CIUDAD / ESTADO:</strong> ${p.ciudadEstadoCp}</div>
        <div><strong>TELÉFONO:</strong> ${p.telefono}</div>
      </div>

      <div class="accept-section">
        <div class="accept-title">A C E P T O :</div>
        <div>
          <div class="signature-line">${p.nombreCliente}</div>
          <div class="signature-subtitle">FIRMA DEL DEUDOR</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Genera el HTML formateado e imprimible (formato Carta/Letter con alta resolución) para la Carta de Adeudo.
 */
export function generarCartaAdeudoHtml(p: DocumentoAdeudoParams): string {
  const montoFormat = Number(p.monto).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const montoLetras = p.montoLetras || numeroALetras(p.monto);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Carta de Adeudo - ${p.nombreCliente}</title>
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
      line-height: 1.6;
    }
    .container {
      width: 100%;
      max-width: 100%;
    }
    .header-title {
      text-align: center;
      font-size: 17pt;
      font-weight: bold;
      letter-spacing: 5px;
      margin-bottom: 26px;
      text-transform: uppercase;
    }
    .recipient {
      font-weight: bold;
      letter-spacing: 1px;
      margin-bottom: 20px;
      font-size: 12pt;
    }
    .body-paragraph {
      text-align: justify;
      margin-bottom: 18px;
      text-indent: 1.5em;
      line-height: 1.65;
    }
    .body-paragraph-plain {
      text-align: justify;
      margin-bottom: 18px;
      line-height: 1.65;
    }
    .closing-location {
      font-weight: bold;
      margin-top: 24px;
      margin-bottom: 20px;
      text-transform: uppercase;
    }
    .attentively {
      text-align: center;
      font-weight: bold;
      letter-spacing: 3px;
      margin-bottom: 35px;
    }
    .signatures-grid {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
      gap: 30px;
    }
    .signature-box {
      width: 46%;
      text-align: center;
    }
    .signature-title {
      font-weight: bold;
      font-size: 11pt;
      letter-spacing: 2px;
      margin-bottom: 45px;
    }
    .signature-line {
      border-top: 1.5px solid #000;
      padding-top: 6px;
      font-weight: bold;
      font-size: 10.5pt;
    }
    .signature-subtitle {
      font-size: 9.5pt;
      letter-spacing: 2px;
      color: #333;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-title">C A R T A &nbsp;&nbsp; A D E U D O</div>

    <div class="recipient">A QUIEN CORRESPONDA:</div>

    <div class="body-paragraph">
      …..EL (LA) QUE SUSCRIBE <strong>${p.nombreCliente}</strong>, ORIGINARIO (A) DE CIUDAD DE <strong>${p.ciudadOrigen}</strong>, CON DOMICILIO PARTICULAR EN <strong>${p.direccion}</strong>${p.entreCalles ? `, ENTRE ${p.entreCalles}` : ""}, RECONOZCO EL ADEUDO CONTRAIDO CON EL SR. (A) <strong>${p.nombreAcreedor}</strong>, AMPARADO EN EL PAGARE <strong>${p.serieActual} DE ${p.serieTotal}</strong> DE FECHA <strong>${p.fechaExpedicionLetras}</strong>, POR LA CANTIDAD DE <strong>$ ${montoFormat} (${montoLetras})</strong>, BAJO LAS CONDICIONES QUE INDICA REFERIDO PAGARE.
    </div>

    <div class="body-paragraph-plain">
      PRESTAMO QUE FUE OTORGADO Y RECIBIDO A LA VEZ SIN FINES DE LUCRO, Y COMO APOYO PERSONAL EN FORMA DE CONFIANZA AMISTOSA.
    </div>

    <div class="body-paragraph-plain">
      POR LO CUAL PROPORCIONE POR VOLUNTAD PROPIA COMO IDENTIFICACION OFICIAL COPIA DE IDENTIFICACION OFICIAL INE CON CLAVE ELECTOR <strong>${p.claveElector}</strong>, Y COMPROBANTE DE DOMICILIO DE <strong>${p.tipoComprobante}</strong> QUE RATIFICA MI DOMICILIO PARTICULAR.
    </div>

    <div class="body-paragraph-plain">
      SIN MAS POR EL MOMENTO, LO QUE HAGO DE SU CONOCIMIENTO PARA LOS EFECTOS LEGALES A LOS QUE DE LUGAR LA PRESENTE.
    </div>

    <div class="closing-location">
      EN ${p.lugarExpedicion}, A ${p.fechaExpedicionLetras}.
    </div>

    <div class="attentively">ATENTAMENTE</div>

    <div class="signatures-grid">
      <div class="signature-box">
        <div class="signature-title">EL DEUDOR</div>
        <div class="signature-line">${p.nombreCliente}</div>
        <div class="signature-subtitle">FIRMA</div>
      </div>

      <div class="signature-box">
        <div class="signature-title">TESTIGO</div>
        <div class="signature-line">${p.nombreTestigo}</div>
        <div class="signature-subtitle">FIRMA</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Imprime o descarga como PDF el documento HTML mediante el motor de impresión nativo del navegador.
 */
export function imprimirDocumentoHtml(html: string): void {
  if (typeof window === "undefined") return;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.bottom = "-2000px";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    if (iframe.parentNode) document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  let printed = false;
  const cleanup = () => {
    if (iframe.parentNode) {
      document.body.removeChild(iframe);
    }
  };

  const doPrint = () => {
    if (printed) return;
    printed = true;
    try {
      win.focus();
      win.print();
    } catch (e) {
      console.error("Error al imprimir documento:", e);
    }
    setTimeout(cleanup, 8000);
  };

  setTimeout(doPrint, 300);
}
