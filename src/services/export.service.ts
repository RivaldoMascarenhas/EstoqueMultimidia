import Papa from "papaparse";
import * as XLSX from "xlsx";

export class ExportService {
  /**
   * Generates CSV string from array of objects
   */
  public static toCsv(data: any[]): string {
    return Papa.unparse(data);
  }

  /**
   * Generates XLSX Buffer from array of objects
   */
  public static toXlsx(data: any[], sheetName = "Dados"): Buffer {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  }

  /**
   * Generates printable HTML report for Event Winners
   */
  public static generateWinnersReportHtml(params: {
    eventName: string;
    eventDate?: string | null;
    winners: Array<{
      prizeName: string;
      winnerName: string;
      registration?: string | null;
      drawnNumber?: number | null;
      delivered: boolean;
      deliveredAt?: string | null;
      drawDate: string;
    }>;
  }): string {
    const { eventName, eventDate, winners } = params;

    const rowsHtml = winners
      .map(
        (w, i) => `
        <tr style="border-bottom: 1px solid #e2e8f0; background: ${i % 2 === 0 ? "#ffffff" : "#f8fafc"};">
          <td style="padding: 10px 12px; font-weight: 600;">#${i + 1}</td>
          <td style="padding: 10px 12px; font-weight: 600; color: #1e3a8a;">${w.prizeName}</td>
          <td style="padding: 10px 12px;">${w.winnerName}</td>
          <td style="padding: 10px 12px; font-family: monospace;">${w.registration || "—"}</td>
          <td style="padding: 10px 12px;">${w.drawnNumber ? `#${w.drawnNumber}` : "—"}</td>
          <td style="padding: 10px 12px; text-align: center;">
            <span style="display: inline-block; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold; background: ${
              w.delivered ? "#dcfce7; color: #166534;" : "#fef3c7; color: #92400e;"
            }">
              ${w.delivered ? "ENTREGUE" : "PENDENTE"}
            </span>
          </td>
          <td style="padding: 10px 12px; font-size: 12px; color: #64748b;">${new Date(w.drawDate).toLocaleString("pt-BR")}</td>
        </tr>`
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Relatório de Vencedores — ${eventName}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; padding: 24px; }
          .header { text-align: center; border-bottom: 2px solid #002B49; padding-bottom: 16px; margin-bottom: 24px; }
          .logo-text { font-size: 20px; font-weight: bold; color: #002B49; }
          .sub { color: #64748b; font-size: 13px; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { background: #002B49; color: white; padding: 10px 12px; text-align: left; font-size: 12px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-text">UNIFAP — CENTRO UNIVERSITÁRIO PARAÍSO</div>
          <div style="font-size: 16px; font-weight: 600; margin-top: 8px;">Relatório Oficial de Ganhadores de Sorteios</div>
          <div class="sub">Evento: <strong>${eventName}</strong> ${eventDate ? `• Data: ${eventDate}` : ""}</div>
          <div class="sub">Emitido em: ${new Date().toLocaleString("pt-BR")}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Ordem</th>
              <th>Prêmio</th>
              <th>Ganhador</th>
              <th>Matrícula</th>
              <th>Bilhete</th>
              <th style="text-align: center;">Status Entrega</th>
              <th>Data do Sorteio</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
      </html>
    `;
  }
}
