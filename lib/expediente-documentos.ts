export const EXPEDIENTE_DOCUMENTOS = [
  { tipo: "SolicitudPrestamo", label: "Solicitud de préstamo" },
  { tipo: "Foto", label: "Foto" },
  { tipo: "INE", label: "INE (frontal)" },
  { tipo: "INEReverso", label: "INE (reverso)" },
  { tipo: "ComprobanteDomicilio", label: "Comprobante de domicilio" },
] as const;

export type ExpedienteTipo = (typeof EXPEDIENTE_DOCUMENTOS)[number]["tipo"];

export const EXPEDIENTE_CREDITO_DOCUMENTOS = [
  { tipo: "PagareFirmado", label: "Pagaré Firmado", icon: "FileText", descripcion: "Título de crédito firmado por el deudor" },
  { tipo: "CartaAdeudoFirmada", label: "Carta de Adeudo Firmada", icon: "FileSignature", descripcion: "Reconocimiento formal de adeudo firmado" },
  { tipo: "TarjetaCobroFirmada", label: "Tarjeta de Pagos Firmada", icon: "CreditCard", descripcion: "Control de pagos y amortización semanal" },
  { tipo: "ContratoFirmado", label: "Contrato / Solicitud Firmada", icon: "FileCheck", descripcion: "Contrato de crédito o documentación anexa" },
  { tipo: "ComprobanteDevolucion", label: "Comprobante de Cancelación / Devolución", icon: "Receipt", descripcion: "Evidencia de pagaré cancelado al liquidar" },
] as const;

export type ExpedienteCreditoTipo = (typeof EXPEDIENTE_CREDITO_DOCUMENTOS)[number]["tipo"] | "Otro";

export const EXPEDIENTE_ACCEPT = "image/*,.pdf";
