import * as XLSX from "xlsx";
import { imprimirDocumentoHtml } from "@/lib/document-templates";

type SheetDefinition = {
  name: string;
  rows: Record<string, unknown>[];
};

export function exportWorkbook(sheets: SheetDefinition[], filename: string): void {
  const workbook = XLSX.utils.book_new();

  sheets.forEach((sheet) => {
    const rows = sheet.rows.length > 0 ? sheet.rows : [{ SinDatos: "Sin registros" }];
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
  });

  XLSX.writeFile(workbook, filename);
}

export function printReportHtml(title: string, sections: Array<{ title: string; rows: Array<[string, string]> }>): void {
  const sectionsHtml = sections.map((section) => `
    <section class="section">
      <h2>${section.title}</h2>
      <table>
        <tbody>
          ${section.rows.map(([label, value]) => `
            <tr>
              <th>${label}</th>
              <td>${value}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </section>
  `).join("");

  imprimirDocumentoHtml(`<!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
    <style>
      @page { size: letter portrait; margin: 1.6cm; }
      body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; font-size: 11pt; }
      h1 { margin: 0 0 18px; font-size: 22px; }
      h2 { margin: 0 0 8px; font-size: 15px; }
      .section { margin-bottom: 18px; break-inside: avoid; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #d4d4d8; padding: 8px 10px; text-align: left; vertical-align: top; }
      th { width: 38%; background: #f4f4f5; }
    </style>
  </head>
  <body>
    <h1>${title}</h1>
    ${sectionsHtml}
  </body>
  </html>`);
}
