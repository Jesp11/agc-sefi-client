export const EXPEDIENTE_DOCUMENTOS = [
  { tipo: "SolicitudPrestamo", label: "Solicitud de préstamo" },
  { tipo: "Foto", label: "Foto" },
  { tipo: "INE", label: "INE (frontal)" },
  { tipo: "INEReverso", label: "INE (reverso)" },
  { tipo: "ComprobanteDomicilio", label: "Comprobante de domicilio" },
] as const;

export type ExpedienteTipo = (typeof EXPEDIENTE_DOCUMENTOS)[number]["tipo"];

export const EXPEDIENTE_ACCEPT = "image/*,.pdf";
