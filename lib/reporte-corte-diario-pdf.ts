import { imprimirDocumentoHtml } from "@/lib/document-templates";

type CorteDiario = {
  fecha?: string;
  total_programado_dia?: number | string;
  total_abonos?: number | string;
  total_recibido?: number | string;
  total_pendiente?: number | string;
  por_asesor?: any[];
  pagos?: any[];
};

const money = (value: unknown) =>
  `$${Number(value ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const escapeHtml = (value: unknown) => String(value ?? "—")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const cliente = (item: any) => item?.credito?.cliente?.nombre_completo
  ?? item?.credito?.grupo?.nombre_grupo
  ?? item?.cliente?.nombre_completo
  ?? item?.grupo?.nombre_grupo
  ?? "Cliente sin nombre";

function tablePagos(pagos: any[], emptyMessage: string): string {
  if (pagos.length === 0) {
    return `<p class="empty">${escapeHtml(emptyMessage)}</p>`;
  }

  return `<table>
    <thead><tr><th>Folio</th><th>Cliente / Grupo</th><th>Hora</th><th>Método</th><th class="money">Abono</th></tr></thead>
    <tbody>${pagos.map((pago) => `<tr>
      <td class="mono">#${escapeHtml(pago.credito?.num_prog ?? pago.num_prog)}</td>
      <td>${escapeHtml(cliente(pago))}</td>
      <td>${escapeHtml(pago.hora ? String(pago.hora).slice(0, 5) : "—")}</td>
      <td>${escapeHtml(pago.metodo_pago || "Efectivo")}</td>
      <td class="money strong">${money(pago.monto)}</td>
    </tr>`).join("")}</tbody>
  </table>`;
}

function tablePendientes(cobros: any[]): string {
  if (cobros.length === 0) {
    return '<p class="empty">Toda la ruta programada tiene abonos registrados.</p>';
  }

  return `<table>
    <thead><tr><th>Folio</th><th>Cliente / Grupo</th><th>Día de pago</th><th class="money">A cobrar</th></tr></thead>
    <tbody>${cobros.map((cobro) => `<tr>
      <td class="mono">#${escapeHtml(cobro.num_prog)}</td>
      <td>${escapeHtml(cliente(cobro))}</td>
      <td>${escapeHtml(cobro.dias_pago || "—")}</td>
      <td class="money strong">${money(cobro.monto_a_cobrar)}</td>
    </tr>`).join("")}</tbody>
  </table>`;
}

function section(title: string, tone: string, amount: number, content: string): string {
  return `<section class="section">
    <div class="section-title ${tone}"><span>${escapeHtml(title)}</span><strong>${money(amount)}</strong></div>
    ${content}
  </section>`;
}

/** Genera el corte diario en un documento imprimible/guardable como PDF. */
export function exportarCorteDiarioPdf(data: CorteDiario): void {
  const asesores = data.por_asesor ?? [];
  const pagos = data.pagos ?? [];
  const fecha = data.fecha || new Date().toLocaleDateString("en-CA");
  const fechaLegible = new Date(`${fecha}T12:00:00`).toLocaleDateString("es-MX", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const generado = new Date().toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
  // El iframe de impresión usa about:blank; por ello el logo debe apuntar al
  // origen completo de la aplicación, no a una ruta relativa del iframe.
  const logoUrl = typeof window === "undefined"
    ? "/logo.png"
    : `${window.location.origin}/logo.png`;

  const asesoresHtml = asesores.map((asesor, index) => {
    const idAsesor = Number(asesor.id_asesor);
    const pagosAsesor = pagos.filter((pago) => Number(pago.credito?.id_asesor) === idAsesor);
    const ruta = (asesor.clientes_programados ?? []).filter((cobro: any) => cobro.categoria === "del_dia");
    const atrasados = (asesor.clientes_programados ?? []).filter((cobro: any) => cobro.categoria === "atrasado");
    const mora = asesor.creditos_mora ?? [];
    const foliosRuta = new Set(ruta.map((cobro: any) => String(cobro.num_prog)));
    const foliosAtrasados = new Set(atrasados.map((cobro: any) => String(cobro.num_prog)));
    const foliosMora = new Set(mora.map((credito: any) => String(credito.num_prog)));

    const abonosRuta = pagosAsesor.filter((pago) => foliosRuta.has(String(pago.credito?.num_prog ?? pago.num_prog)));
    const foliosRutaCobrados = new Set(abonosRuta.map((pago) => String(pago.credito?.num_prog ?? pago.num_prog)));
    const rutaPendiente = ruta.filter((cobro: any) => !foliosRutaCobrados.has(String(cobro.num_prog)));
    const abonosAtrasados = pagosAsesor.filter((pago) => foliosAtrasados.has(String(pago.credito?.num_prog ?? pago.num_prog)));
    const abonosMora = pagosAsesor.filter((pago) => foliosMora.has(String(pago.credito?.num_prog ?? pago.num_prog)));
    const total = (items: any[]) => items.reduce((sum, item) => sum + Number(item.monto ?? 0), 0);
    const totalPendiente = rutaPendiente.reduce((sum: number, item: any) => sum + Number(item.monto_a_cobrar ?? 0), 0);

    return `<article class="asesor ${index > 0 ? "page-break" : ""}">
      <div class="asesor-watermark"><img src="${escapeHtml(logoUrl)}" alt="" /></div>
      <div class="asesor-content">
      <header class="asesor-header">
        <div><h2>${escapeHtml(asesor.nombre_asesor || "Sin asesor")}</h2><p>${asesor.codigo_asesor ? `Código: ${escapeHtml(asesor.codigo_asesor)}` : "Gestor de cobranza"}</p></div>
        <div class="asesor-kpis"><span>Cobrado App <strong>${money(asesor.total_cobrado)}</strong></span><span>Recibido Caja <strong>${asesor.recibido ? money(asesor.monto_recibido) : "Pendiente"}</strong></span></div>
      </header>
      ${section(`Abonos de ruta programada (${abonosRuta.length})`, "green", total(abonosRuta), tablePagos(abonosRuta, "Sin abonos registrados en la ruta programada."))}
      ${section(`Ruta programada pendiente (${rutaPendiente.length})`, "blue", totalPendiente, tablePendientes(rutaPendiente))}
      ${section(`Abonos de pagos atrasados (${abonosAtrasados.length})`, "amber", total(abonosAtrasados), tablePagos(abonosAtrasados, "No se recibieron abonos de pagos atrasados."))}
      ${section(`Abonos de mora (${abonosMora.length})`, "red", total(abonosMora), tablePagos(abonosMora, "No se recibieron abonos de créditos en mora."))}
      </div>
    </article>`;
  }).join("");

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8" />
  <title>Corte diario ${escapeHtml(fecha)}</title><style>
    @page { size: letter landscape; margin: 10mm; }
    * { box-sizing: border-box; } body { font-family: Arial, Helvetica, sans-serif; color: #172033; font-size: 8pt; margin: 0; background: transparent; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .watermark { position: fixed; inset: 0; display:flex; align-items:center; justify-content:center; opacity:.17; pointer-events:none; z-index:0; } .watermark img { width:430px; height:auto; object-fit:contain; } main { position: relative; z-index: 1; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #0f4a3d; padding-bottom:7px; margin-bottom:10px; } h1 { margin:0; color:#0f4a3d; font-size:17pt; } .subtitle { margin:3px 0 0; color:#475569; font-weight:600; } .meta { text-align:right; color:#334155; line-height:1.5; font-weight:600; }
    .summary { display:grid; grid-template-columns:repeat(4, 1fr); gap:7px; margin-bottom:12px; } .summary div { border:1px solid rgba(148, 163, 184, .72); border-radius:4px; padding:6px 8px; background:rgba(248, 250, 252, .28); } .summary span { display:block; color:#475569; font-size:7pt; text-transform:uppercase; } .summary strong { display:block; margin-top:2px; color:#0f4a3d; font-size:11pt; }
    .asesor { position:relative; isolation:isolate; min-height:185mm; break-inside:avoid; margin-top:12px; } .page-break { break-before:page; } .asesor-watermark { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; opacity:.16; pointer-events:none; z-index:0; } .asesor-watermark img { width:430px; height:auto; object-fit:contain; } .asesor-content { position:relative; z-index:1; } .asesor-header { display:flex; justify-content:space-between; align-items:center; background:rgba(15, 74, 61, .91); color:white; padding:7px 9px; border-radius:4px; } .asesor-header h2 { font-size:11pt; margin:0; } .asesor-header p { margin:2px 0 0; opacity:.9; } .asesor-kpis { display:flex; gap:18px; text-align:right; } .asesor-kpis span { font-size:7pt; } .asesor-kpis strong { display:block; font-size:9pt; }
    .section { margin-top:8px; break-inside:avoid; } .section-title { display:flex; justify-content:space-between; padding:4px 6px; color:white; font-size:8pt; font-weight:700; } .green { background:rgba(21, 128, 61, .9); } .blue { background:rgba(37, 99, 235, .9); } .amber { background:rgba(180, 83, 9, .9); } .red { background:rgba(185, 28, 28, .9); }
    table { width:100%; border-collapse:collapse; background:transparent; } th { background:rgba(226, 232, 240, .22); color:#1e293b; font-size:7pt; text-transform:uppercase; text-align:left; } th, td { border:1px solid rgba(148, 163, 184, .68); padding:3px 5px; background:transparent; } .money { text-align:right; } .strong { font-weight:700; } .mono { font-family:ui-monospace, SFMono-Regular, Menlo, monospace; } .empty { margin:0; padding:6px; border:1px solid rgba(148, 163, 184, .68); background:transparent; color:#475569; font-style:italic; }
    footer { margin-top:12px; padding-top:5px; border-top:1px solid #cbd5e1; color:#64748b; font-size:6.8pt; display:flex; justify-content:space-between; }
  </style></head><body><div class="watermark"><img src="${escapeHtml(logoUrl)}" alt="" /></div><main>
    <header class="header"><div><h1>CORTE DIARIO DE COBRANZA</h1><p class="subtitle">Fecha de corte: <strong>${escapeHtml(fechaLegible)}</strong></p></div><div class="meta">AGC SERVICIOS FINANCIEROS<br/>Generado: ${escapeHtml(generado)}</div></header>
    <section class="summary"><div><span>Ruta programada</span><strong>${money(data.total_programado_dia)}</strong></div><div><span>Cobrado App</span><strong>${money(data.total_abonos)}</strong></div><div><span>Recibido Caja</span><strong>${money(data.total_recibido)}</strong></div><div><span>Pendiente por entregar</span><strong>${money(data.total_pendiente)}</strong></div></section>
    ${asesoresHtml || '<p class="empty">No hay gestores con información para este corte.</p>'}
    <footer><span>Documento confidencial — uso administrativo.</span><span>${escapeHtml(fecha)}</span></footer>
  </main></body></html>`;

  imprimirDocumentoHtml(html);
}
