"use client";

import React, { useState } from "react";
import { Printer, Building2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCodeDisplay } from "@/components/scanner/qr-code-display";

interface BoxForLabel {
  id: string;
  code: string;
  name: string;
  doorName: string;
  description?: string | null;
}

interface LabelPrinterModalProps {
  isOpen: boolean;
  onClose: () => void;
  boxes: BoxForLabel[];
  selectedBoxCode?: string;
}

export function LabelPrinterModal({
  isOpen,
  onClose,
  boxes,
  selectedBoxCode,
}: LabelPrinterModalProps) {
  const [filterCode, setFilterCode] = useState<string>(selectedBoxCode || "ALL");

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  const displayedBoxes =
    filterCode === "ALL"
      ? boxes
      : boxes.filter((b) => b.code === filterCode);

  const handlePrint = () => {
    const printElement = document.getElementById("boxes-printable-container");
    if (!printElement) {
      window.print();
      return;
    }

    const printWindow = window.open("", "_blank", "width=850,height=1100");
    if (!printWindow) {
      window.print();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Etiquetas QR Code - UniFAP Caixas</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }
            body {
              background: #ffffff !important;
              color: #000000 !important;
              padding: 10px;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .labels-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 12px;
            }
            .label-card {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 14px;
              border: 2px solid #0f172a;
              border-radius: 12px;
              background: #ffffff;
              color: #000000;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .label-info {
              display: flex;
              flex-direction: column;
              gap: 3px;
              max-width: 62%;
            }
            .label-brand {
              display: flex;
              align-items: center;
              gap: 4px;
              font-size: 8.5px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #1e3a8a;
              margin-bottom: 2px;
            }
            .label-code {
              font-size: 20px;
              font-weight: 900;
              font-family: monospace;
              color: #0f172a;
              letter-spacing: 0.5px;
              line-height: 1.1;
            }
            .label-title {
              font-size: 13px;
              font-weight: 700;
              color: #1e293b;
            }
            .label-subtitle {
              font-size: 10.5px;
              font-weight: 600;
              color: #64748b;
            }
            .label-desc {
              font-size: 9px;
              color: #94a3b8;
              margin-top: 2px;
            }
            .label-qr {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              background: #ffffff;
              padding: 4px;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
            }
            .label-footer {
              font-size: 8px;
              color: #94a3b8;
              font-style: italic;
              margin-top: 4px;
            }
            img { max-width: 100%; display: block; }
            svg { display: block; }
          </style>
        </head>
        <body>
          <div class="labels-grid">
            ${printElement.innerHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                setTimeout(function() { window.close(); }, 600);
              }, 250);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[96vw] max-w-4xl max-h-[90vh] flex flex-col p-4 sm:p-6 rounded-3xl bg-card border-border shadow-2xl overflow-hidden">
        <DialogHeader className="no-print shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <Printer className="w-5 h-5 shrink-0" />
              <DialogTitle className="text-lg font-bold text-foreground">
                Impressão de Etiquetas com QR Code
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Gere etiquetas padronizadas para colar nas portas e caixas físicas do armário da UniFAP.
          </DialogDescription>
        </DialogHeader>

        {/* Filtro e Botão de Imprimir (Oculto na impressão) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-muted/40 border border-border/80 no-print my-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-xs font-semibold text-foreground shrink-0">
              Filtrar Caixa:
            </span>
            <select
              value={filterCode}
              onChange={(e) => setFilterCode(e.target.value)}
              className="w-full sm:max-w-xs px-3 py-1.5 text-xs bg-background border border-input rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary outline-none truncate"
            >
              <option value="ALL">Todas as Caixas ({boxes.length})</option>
              {boxes.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.code} - {b.name} ({b.doorName})
                </option>
              ))}
            </select>
          </div>

          <Button onClick={handlePrint} size="sm" className="w-full sm:w-auto shrink-0 gap-2 rounded-xl bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/25">
            <Printer className="w-4 h-4 shrink-0" />
            <span>Imprimir {displayedBoxes.length} Etiqueta(s)</span>
          </Button>
        </div>

        {/* Container de Etiquetas Isolado para Impressão */}
        <div className="overflow-y-auto overflow-x-hidden pr-1 flex-1">
          <div id="boxes-printable-container" className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 my-2">
            {displayedBoxes.map((box) => {
              const qrUrl = `${baseUrl}/caixas/${box.code}`;

              return (
                <div
                  key={box.code}
                  className="label-card min-w-0 flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border-2 border-slate-900 bg-white text-slate-950 shadow-sm"
                >
                  <div className="label-info min-w-0 flex-1 space-y-1 pr-2">
                    <div className="label-brand flex items-center gap-1.5 text-[9px] font-black tracking-wider text-blue-900 uppercase truncate">
                      <Building2 className="w-3 h-3 text-blue-900 shrink-0" />
                      <span className="truncate">UNIFAP • SUPORTE TI & MULTIMÍDIA</span>
                    </div>

                    <div className="label-code text-xl font-black font-mono tracking-tight text-slate-950 truncate">
                      {box.code}
                    </div>

                    <div className="label-title text-xs font-bold text-slate-800 line-clamp-1" title={box.name}>
                      {box.name}
                    </div>

                    <div className="label-subtitle text-[10px] font-semibold text-slate-600 truncate">
                      {box.doorName}
                    </div>

                    {box.description && (
                      <div className="label-desc text-[9px] text-slate-500 line-clamp-1">
                        {box.description}
                      </div>
                    )}

                    <div className="label-footer text-[8px] text-slate-400 italic pt-1 truncate">
                      Escaneie para consultar/baixar
                    </div>
                  </div>

                  <div className="label-qr shrink-0 p-1.5 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <QrCodeDisplay value={qrUrl} size={80} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
