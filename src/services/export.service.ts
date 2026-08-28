import Papa from "papaparse";
import ExcelJS from "exceljs";

export class ExportService {
  /**
   * Generates CSV string from array of objects
   */
  public static toCsv(data: any[]): string {
    return Papa.unparse(data);
  }

  /**
   * Generates XLSX Buffer from array of objects using ExcelJS
   */
  public static async toXlsx(data: any[], sheetName = "Dados"): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    if (data.length > 0) {
      const keys = Object.keys(data[0]);
      worksheet.columns = keys.map((key) => ({
        header: key,
        key: key,
        width: Math.max(key.length + 5, 14),
      }));

      data.forEach((item) => {
        worksheet.addRow(item);
      });

      // Estilizar linha de cabeçalho
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF002B49" },
      };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
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
        <div class="header" style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2.5px solid #002B49; padding-bottom: 14px; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <img src="/brand/logo-unifap.png" alt="UniFAP" style="height: 44px; width: auto; object-fit: contain;" />
            <div style="text-align: left;">
              <div style="font-size: 16px; font-weight: 800; color: #002B49; letter-spacing: -0.3px;">CENTRO UNIVERSITÁRIO PARAÍSO • UNIFAP</div>
              <div style="font-size: 13px; font-weight: 600; color: #334155; margin-top: 2px;">Relatório Oficial de Ganhadores de Sorteios</div>
              <div class="sub" style="color: #64748b; font-size: 11px; margin-top: 2px;">Evento: <strong>${eventName}</strong> ${eventDate ? `• Data: ${eventDate}` : ""}</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="display: inline-block; padding: 4px 10px; border-radius: 6px; background: #002B49; color: white; font-size: 10px; font-weight: bold; text-transform: uppercase;">
              Ata Oficial
            </div>
            <div class="sub" style="margin-top: 4px; font-size: 10px; color: #64748b;">Emitido em: ${new Date().toLocaleString("pt-BR")}</div>
          </div>
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

  /**
   * Generates printable institutional HTML report for Event Participants and Attendance
   */
  public static generateParticipantsReportHtml(params: {
    eventName: string;
    eventDate?: string | null;
    eventTime?: string | null;
    eventLocation?: string | null;
    filterLabel?: string;
    participants: Array<{
      ticketNumber?: number | null;
      name: string;
      registration?: string | null;
      category?: string | null;
      isPresent: boolean;
      capturedAt?: string | null;
    }>;
  }): string {
    const { eventName, eventDate, eventTime, eventLocation, filterLabel, participants } = params;

    const totalCount = participants.length;
    const presentCount = participants.filter((p) => p.isPresent).length;
    const absentCount = totalCount - presentCount;
    const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

    const rowsHtml = participants
      .map((p, i) => {
        const ticketFormatted = p.ticketNumber
          ? String(p.ticketNumber).padStart(3, "0")
          : String(i + 1).padStart(3, "0");

        let timeFormatted = "—";
        if (p.capturedAt) {
          try {
            timeFormatted = new Date(p.capturedAt).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            });
          } catch {}
        }

        return `
        <tr style="border-bottom: 1px solid #cbd5e1; background: ${i % 2 === 0 ? "#ffffff" : "#f8fafc"}; page-break-inside: avoid;">
          <td style="padding: 6px 8px; text-align: center; font-family: monospace; font-weight: 700; color: #475569; border-right: 1px solid #cbd5e1;">${ticketFormatted}</td>
          <td style="padding: 6px 10px; font-weight: 600; color: #0f172a; border-right: 1px solid #cbd5e1;">${p.name}</td>
          <td style="padding: 6px 8px; font-family: monospace; color: #475569; border-right: 1px solid #cbd5e1;">${p.registration || "—"}</td>
          <td style="padding: 6px 8px; color: #475569; border-right: 1px solid #cbd5e1;">${p.category || "Participante"}</td>
          <td style="padding: 6px 8px; text-align: center; border-right: 1px solid #cbd5e1;">
            <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; ${
              p.isPresent ? "color: #15803d; background: #dcfce7;" : "color: #64748b; background: #f1f5f9;"
            }">
              ${p.isPresent ? "PRESENTE" : "AUSENTE"}
            </span>
          </td>
          <td style="padding: 6px 8px; font-family: monospace; font-size: 11px; text-align: center; color: #475569; border-right: 1px solid #cbd5e1;">${timeFormatted}</td>
          <td style="padding: 6px 8px; width: 140px;">
            <div style="border-bottom: 1px dashed #94a3b8; height: 16px; width: 100%;"></div>
          </td>
        </tr>`;
      })
      .join("");

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Lista Oficial de Presença — ${eventName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 10mm 15mm 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 11px;
      line-height: 1.3;
      padding: 16px;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2.5px solid #002B49;
      padding-bottom: 12px;
      margin-bottom: 12px;
    }
    .header-title {
      font-size: 18px;
      font-weight: 800;
      color: #002B49;
      letter-spacing: -0.5px;
    }
    .header-sub {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr;
      gap: 8px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 12px;
      font-size: 11px;
    }
    .summary-col span {
      display: block;
      font-size: 9px;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 1px;
    }
    .summary-col strong {
      color: #0f172a;
      font-size: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #cbd5e1;
      font-size: 11px;
    }
    thead {
      display: table-header-group;
    }
    tr {
      page-break-inside: avoid;
    }
    th {
      background: #002B49 !important;
      color: #ffffff !important;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      padding: 7px 8px;
      text-align: left;
      border: 1px solid #002B49;
    }
    .footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 10px;
      color: #64748b;
      page-break-inside: avoid;
    }
    .footer-sig {
      width: 240px;
      text-align: center;
    }
    .footer-line {
      border-bottom: 1px solid #0f172a;
      margin-bottom: 4px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div style="display: flex; align-items: center; gap: 14px;">
      <img src="/brand/logo-unifap.png" alt="UniFAP" style="height: 44px; width: auto; object-fit: contain;" />
      <div style="text-align: left;">
        <div class="header-title">CENTRO UNIVERSITÁRIO PARAÍSO • UNIFAP</div>
        <div class="header-sub">Sistema Integrado de Gestão de Eventos, Presenças e Sorteios</div>
      </div>
    </div>
    <div style="text-align: right;">
      <div style="display: inline-block; padding: 4px 10px; border-radius: 6px; background: #002B49; color: white; font-size: 10px; font-weight: bold; text-transform: uppercase;">
        ${filterLabel || "Lista Oficial de Frequência"}
      </div>
      <div class="header-sub" style="margin-top: 4px;">Emitido em: ${new Date().toLocaleString("pt-BR")}</div>
    </div>
  </div>

  <div class="summary-grid">
    <div class="summary-col">
      <span>Evento</span>
      <strong>${eventName}</strong>
    </div>
    <div class="summary-col">
      <span>Data / Horário</span>
      <strong>${eventDate || "—"}${eventTime ? ` às ${eventTime}` : ""}</strong>
    </div>
    <div class="summary-col">
      <span>Local</span>
      <strong>${eventLocation || "Auditório"}</strong>
    </div>
    <div class="summary-col">
      <span>Total de Presenças</span>
      <strong>${presentCount} / ${totalCount} (${percentage}%)</strong>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 40px; text-align: center;">Nº</th>
        <th>Nome do Participante</th>
        <th style="width: 100px;">Matrícula</th>
        <th style="width: 100px;">Categoria</th>
        <th style="width: 80px; text-align: center;">Presença</th>
        <th style="width: 70px; text-align: center;">Horário</th>
        <th style="width: 140px; text-align: center;">Assinatura</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="7" style="padding: 24px; text-align: center; color: #94a3b8;">Nenhum participante encontrado.</td></tr>'}
    </tbody>
  </table>

  <div class="footer">
    <div>
      <p style="font-weight: 700; color: #0f172a;">UniFAP • Suporte de TI & Multimídia</p>
      <p>Documento oficial gerado eletronicamente com validação biométrica e controle de frequência.</p>
    </div>
    <div class="footer-sig">
      <div class="footer-line"></div>
      <p style="font-weight: 700; text-transform: uppercase; color: #0f172a;">Assinatura do Coordenador / Responsável</p>
    </div>
  </div>
</body>
</html>`;
  }
}
