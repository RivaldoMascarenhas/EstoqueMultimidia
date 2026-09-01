"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { 
  Printer, 
  FileCheck2,
  Loader2 
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/utils";
import QRCode from "qrcode";

interface LoanReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: any | null;
}

export function LoanReceiptModal({
  isOpen,
  onClose,
  loan,
}: LoanReceiptModalProps) {
  const { data: session } = useSession();
  const [activeLoan, setActiveLoan] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  useEffect(() => {
    if (!isOpen || !loan) {
      setActiveLoan(null);
      setQrCodeDataUrl("");
      return;
    }

    const generateQr = (loanId: string) => {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const validationUrl = `${origin}/validar/${loanId}`;

      QRCode.toDataURL(validationUrl, {
        width: 140,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch(() => setQrCodeDataUrl(""));
    };

    // Caso 1: Objeto completo com relações
    if (typeof loan === "object" && loan.asset) {
      setActiveLoan(loan);
      if (loan.id) generateQr(loan.id);
      return;
    }

    // Caso 2: Apenas ID ou objeto parcial
    const loanId = typeof loan === "string" ? loan : loan?.id;
    if (loanId) {
      setIsLoading(true);
      generateQr(loanId);
      fetch(`/api/v1/loans/${loanId}`)
        .then((res) => res.json())
        .then((json) => {
          if (json?.success && json?.data) {
            setActiveLoan(json.data);
          } else if (typeof loan === "object") {
            setActiveLoan(loan);
          }
        })
        .catch(() => {
          if (typeof loan === "object") setActiveLoan(loan);
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, loan]);

  if (!isOpen) return null;

  const currentLoan = activeLoan || (typeof loan === "object" ? loan : null);
  const loanId = currentLoan?.id || (typeof loan === "string" ? loan : "");
  const protocolNumber = loanId ? `LOAN-${String(loanId).slice(-8).toUpperCase()}` : "LOAN-PROCESSANDO";
  const isReturned = currentLoan?.status === "RETURNED" || currentLoan?.status === "RETURNED_DAMAGED";
  const operatorName = session?.user?.name || currentLoan?.createdByUser?.name || "Suporte de TI - UniFAP";

  const handlePrint = () => {
    const printElement = document.getElementById("termo-unifap-sheet");
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
          <title>Termo de Cautela - ${protocolNumber}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm 15mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }
            body {
              background: #ffffff;
              color: #111827;
              font-size: 11px;
              line-height: 1.4;
              padding: 10px;
            }
            .print-area {
              background: #ffffff;
              color: #111827;
              padding: 24px;
              border: 1px solid #d1d5db;
              border-radius: 12px;
            }
            .border-b-2 { border-bottom: 2px solid #1f2937; }
            .border-t-2 { border-top: 2px solid #d1d5db; }
            .border { border: 1px solid #e5e7eb; }
            .border-b { border-bottom: 1px solid #e5e7eb; }
            .border-neutral-800 { border-color: #1f2937; }
            .border-neutral-300 { border-color: #d1d5db; }
            .border-neutral-200 { border-color: #e5e7eb; }
            .bg-neutral-50 { background-color: #f9fafb; }
            .bg-neutral-100 { background-color: #f3f4f6; }
            .bg-emerald-100 { background-color: #d1fae5; }
            .bg-amber-100 { background-color: #fef3c7; }
            .text-emerald-800 { color: #065f46; }
            .text-amber-800 { color: #92400e; }
            .text-neutral-900 { color: #111827; }
            .text-neutral-800 { color: #1f2937; }
            .text-neutral-700 { color: #374151; }
            .text-neutral-600 { color: #4b5563; }
            .text-neutral-500 { color: #6b7280; }
            .p-1 { padding: 4px; }
            .p-1\\.5 { padding: 6px; }
            .p-2 { padding: 8px; }
            .p-2\\.5 { padding: 10px; }
            .p-3 { padding: 12px; }
            .p-4 { padding: 16px; }
            .p-6 { padding: 24px; }
            .p-8 { padding: 32px; }
            .px-2 { padding-left: 8px; padding-right: 8px; }
            .px-2\\.5 { padding-left: 10px; padding-right: 10px; }
            .py-0\\.5 { padding-top: 2px; padding-bottom: 2px; }
            .py-1 { padding-top: 4px; padding-bottom: 4px; }
            .pb-0\\.5 { padding-bottom: 2px; }
            .pb-1 { padding-bottom: 4px; }
            .pb-4 { padding-bottom: 16px; }
            .pt-1 { padding-top: 4px; }
            .pt-4 { padding-top: 16px; }
            .my-2\\.5 { margin-top: 10px; margin-bottom: 10px; }
            .my-3 { margin-top: 12px; margin-bottom: 12px; }
            .mt-0\\.5 { margin-top: 2px; }
            .mt-2 { margin-top: 8px; }
            .mt-6 { margin-top: 24px; }
            .mb-1 { margin-bottom: 4px; }
            .mb-4 { margin-bottom: 16px; }
            .rounded { border-radius: 4px; }
            .rounded-2xl { border-radius: 12px; }
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .font-black { font-weight: 900; }
            .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
            .uppercase { text-transform: uppercase; }
            .tracking-wider { letter-spacing: 0.05em; }
            .tracking-wide { letter-spacing: 0.025em; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .flex { display: flex; }
            .flex-col { flex-direction: column; }
            .items-center { align-items: center; }
            .items-end { align-items: flex-end; }
            .justify-between { justify-content: space-between; }
            .justify-center { justify-content: center; }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
            .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
            .gap-1 { gap: 4px; }
            .gap-2 { gap: 8px; }
            .gap-4 { gap: 16px; }
            .gap-x-4 { column-gap: 16px; }
            .gap-y-1 { row-gap: 4px; }
            .col-span-2 { grid-column: span 2 / span 2; }
            .col-span-3 { grid-column: span 3 / span 3; }
            .space-y-0\\.5 > * + * { margin-top: 2px; }
            .space-y-1 > * + * { margin-top: 4px; }
            .leading-tight { line-height: 1.25; }
            .list-decimal { list-style-type: decimal; }
            .list-inside { list-style-position: inside; }
            .w-16 { width: 64px; }
            .h-16 { height: 64px; }
            .w-5 { width: 20px; }
            .h-5 { height: 20px; }
            .block { display: block }
            table { width: 100%; border-collapse: collapse; }
            td { vertical-align: top; }
            img { max-width: 100%; display: block; }
            .logo-unifap { height: 38px !important; width: auto !important; max-height: 40px !important; object-fit: contain !important; flex-shrink: 0 !important; }
            .h-9 { height: 36px !important; }
            .h-10 { height: 40px !important; }
            .w-auto { width: auto !important; }
            .shrink-0 { flex-shrink: 0 !important; }
            .whitespace-nowrap { white-space: nowrap !important; }
            svg { display: none; }
            @media print {
              body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; padding: 0 !important; }
              .print-area { border: none !important; box-shadow: none !important; padding: 0 !important; }
              .logo-unifap { height: 38px !important; width: auto !important; max-height: 40px !important; }
            }
          </style>
        </head>
        <body>
          <div class="print-area">
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-3xl print:p-0 print:m-0 print:border-none print:shadow-none bg-card">
        {/* Barra superior de ações (oculta na impressão) */}
        <div className="flex items-center justify-between pb-3 border-b border-border print:hidden pr-8">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">
              Termo Oficial de Cautela & Responsabilidade
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              disabled={isLoading || !currentLoan}
              size="sm"
              className="gap-1.5 rounded-xl bg-primary text-primary-foreground shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Termo (A4)</span>
            </Button>
          </div>
        </div>

        {isLoading && !currentLoan ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span>Carregando detalhes do termo de responsabilidade...</span>
          </div>
        ) : (
          /* FOLHA DO DOCUMENTO IMPRESSO (A4 FORMAT) */
          <div 
            id="termo-unifap-sheet"
            className="print-area bg-white text-neutral-900 p-6 sm:p-8 rounded-2xl border border-neutral-300 shadow-sm print:border-none print:shadow-none print:p-4 text-xs font-sans"
          >
            {/* Cabeçalho Institucional */}
            <div className="flex items-center justify-between border-b-2 border-neutral-800 pb-4 mb-4 gap-4">
              <div className="flex items-center gap-3">
                <img
                  src="/brand/logo-unifap.png"
                  alt="UniFAP"
                  className="logo-unifap h-9 w-auto object-contain shrink-0"
                  style={{ height: "36px", width: "auto", maxHeight: "38px" }}
                />
                <div className="space-y-0.5 border-l border-neutral-300 pl-3">
                  <div className="font-black text-xs sm:text-sm uppercase tracking-wider text-neutral-900">
                    CENTRO UNIVERSITÁRIO PARAÍSO • UNIFAP
                  </div>
                  <p className="text-[11px] font-semibold text-neutral-700">
                    Setor de Suporte de TI & Multimídia
                  </p>
                  <p className="text-[10px] text-neutral-600">
                    Juazeiro do Norte - Ceará • Sistema de Gestão de Estoque & Patrimônio
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0 min-w-[120px]">
                <div className="px-2.5 py-1 bg-neutral-100 border border-neutral-300 rounded font-mono font-bold text-xs text-neutral-900">
                  {protocolNumber}
                </div>
                <span className="text-[9px] text-neutral-500 block mt-0.5 whitespace-nowrap">
                  Emitido: {currentLoan?.loanDate ? formatDate(currentLoan.loanDate) : formatDate(new Date())}
                </span>
              </div>
            </div>

            {/* Título do Termo */}
            <div className="text-center my-3">
              <h1 className="text-sm sm:text-base font-black uppercase tracking-wide text-neutral-900">
                {isReturned
                  ? "COMPROVANTE DE DEVOLUÇÃO E ENCERRAMENTO DE CAUTELA"
                  : "TERMO DE CAUTELA E RESPONSABILIDADE POR EQUIPAMENTO INSTITUCIONAL"}
              </h1>
              <p className="text-[10px] text-neutral-600">
                Controle Patrimonial e Rastreabilidade Institucional de Ativos • UniFAP
              </p>
            </div>

            {/* Status Badge */}
            <div className="my-2.5 flex items-center justify-between p-2 rounded bg-neutral-50 border border-neutral-200">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[11px] text-neutral-800">Situação do Empréstimo:</span>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                  isReturned 
                    ? "bg-emerald-100 text-emerald-800" 
                    : "bg-amber-100 text-amber-800"
                }`}>
                  {isReturned 
                    ? (currentLoan?.status === "RETURNED_DAMAGED" ? "DEVOLVIDO COM AVARIA" : "DEVOLVIDO REGULARMENTE")
                    : "EM ANDAMENTO / ATIVO"}
                </span>
              </div>
              <div className="text-[10px] text-neutral-600">
                Operador Responsável: <b>{operatorName}</b>
              </div>
            </div>

            {/* Bloco 1: Identificação do Solicitante / Responsável */}
            <div className="my-3 space-y-1">
              <h3 className="font-bold text-[11px] uppercase tracking-wider text-neutral-800 border-b border-neutral-300 pb-0.5">
                1. Identificação do Solicitante / Depositário
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-neutral-800 pt-1">
                <div>
                  <span className="font-semibold text-neutral-600">Nome Completo:</span>{" "}
                  <b>{currentLoan?.borrowerName || "Não informado"}</b>
                </div>
                <div>
                  <span className="font-semibold text-neutral-600">Departamento/Curso:</span>{" "}
                  {currentLoan?.borrowerDepartment || "Não informado"}
                </div>
                <div>
                  <span className="font-semibold text-neutral-600">WhatsApp / Telefone:</span>{" "}
                  {currentLoan?.borrowerPhone || "Não informado"}
                </div>
                <div>
                  <span className="font-semibold text-neutral-600">E-mail:</span>{" "}
                  {currentLoan?.borrowerEmail || "Não informado"}
                </div>
                <div className="col-span-2">
                  <span className="font-semibold text-neutral-600">Local de Uso / Destino:</span>{" "}
                  <b>{currentLoan?.destination || "Não informado"}</b>
                </div>
              </div>
            </div>

            {/* Bloco 2: Especificação do Equipamento */}
            <div className="my-3 space-y-1">
              <h3 className="font-bold text-[11px] uppercase tracking-wider text-neutral-800 border-b border-neutral-300 pb-0.5">
                2. Especificação do Equipamento & Acessórios
              </h3>
              <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-[11px] text-neutral-800 pt-1">
                <div>
                  <span className="font-semibold text-neutral-600">Nº Patrimônio:</span>{" "}
                  <b className="font-mono text-xs">#{currentLoan?.asset?.assetTag || "N/A"}</b>
                </div>
                <div>
                  <span className="font-semibold text-neutral-600">Modelo:</span>{" "}
                  {currentLoan?.asset?.model || currentLoan?.asset?.item?.model || "-"}
                </div>
                <div>
                  <span className="font-semibold text-neutral-600">Nº de Série:</span>{" "}
                  <span className="font-mono">{currentLoan?.asset?.serialNumber || "N/A"}</span>
                </div>
                <div className="col-span-3">
                  <span className="font-semibold text-neutral-600">Descrição do Item:</span>{" "}
                  <b>{currentLoan?.asset?.item?.name || "Equipamento Institucional"}</b>
                </div>
                {currentLoan?.notes && (
                  <div className="col-span-3 bg-neutral-50 p-1.5 rounded border border-neutral-200 text-[10px]">
                    <span className="font-semibold text-neutral-700">Acessórios / Observações de Saída:</span>{" "}
                    {currentLoan.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Bloco 3: Prazos e Movimentações */}
            <div className="my-3 space-y-1">
              <h3 className="font-bold text-[11px] uppercase tracking-wider text-neutral-800 border-b border-neutral-300 pb-0.5">
                3. Controle de Prazos e Devolução
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-neutral-800 pt-1">
                <div className="p-2 rounded bg-neutral-50 border border-neutral-200">
                  <span className="text-[10px] text-neutral-500 block">Data de Retirada (Saída)</span>
                  <span className="font-bold">{currentLoan?.loanDate ? formatDateTime(currentLoan.loanDate) : "-"}</span>
                </div>
                <div className="p-2 rounded bg-neutral-50 border border-neutral-200">
                  <span className="text-[10px] text-neutral-500 block">Prazo Previsto de Devolução</span>
                  <span className="font-bold text-neutral-900">{currentLoan?.expectedReturnDate ? formatDateTime(currentLoan.expectedReturnDate) : "-"}</span>
                </div>
                <div className="p-2 rounded bg-neutral-50 border border-neutral-200 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-neutral-500 block">Devolução Efetiva</span>
                  <span className={`font-bold ${isReturned ? "text-emerald-700" : "text-amber-700"}`}>
                    {isReturned && currentLoan?.actualReturnDate ? formatDateTime(currentLoan.actualReturnDate) : "Pendente"}
                  </span>
                </div>
              </div>
            </div>

            {/* Bloco 4: Cláusula de Compromisso */}
            <div className="my-3 p-3 rounded bg-neutral-50 border border-neutral-200 text-[10px] text-neutral-700 space-y-1">
              <div className="font-bold text-neutral-900 uppercase">Cláusula de Compromisso e Fiel Depositário:</div>
              <p className="leading-tight text-justify">
                Declaro ter recebido o equipamento patrimonial discriminado acima em perfeito estado de funcionamento e conservação. Comprometo-me a zelar pela sua integridade física, utilizá-lo estritamente para fins acadêmicos e institucionais, e devolvê-lo impreterivelmente até o prazo estipulado. Em caso de extravio, perda ou avaria decorrente de negligência ou uso indevido, assumo a responsabilidade pela sua reposição ou ressarcimento do valor correspondente conforme as normas institucionais do UniFAP.
              </p>
            </div>

            {/* Bloco 5: Assinaturas e Autenticação QR Code */}
            <div className="mt-6 pt-4 border-t-2 border-neutral-300">
              <div className="grid grid-cols-3 gap-4 items-end">
                {/* QR Code de Autenticação Digital */}
                <div className="flex flex-col items-center justify-center p-2 rounded bg-neutral-50 border border-neutral-200 text-center">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="QR Code de Validação"
                      className="w-16 h-16 object-contain"
                      style={{ width: "64px", height: "64px" }}
                    />
                  ) : (
                    <div className="w-16 h-16 bg-neutral-200 rounded flex items-center justify-center text-[9px] text-neutral-500">
                      QR Code
                    </div>
                  )}
                  <span className="text-[9px] font-bold text-neutral-800 mt-1 uppercase">
                    Autenticidade Digital
                  </span>
                  <span className="text-[8px] text-neutral-500 font-mono">
                    {protocolNumber}
                  </span>
                </div>

                {/* Assinatura do Depositário */}
                <div className="text-center">
                  <div className="border-b border-neutral-800 pb-1 mb-1 min-h-[36px] flex items-end justify-center">
                    <span className="text-[10px] text-neutral-400 italic print:hidden">[ Assinatura do Depositário ]</span>
                  </div>
                  <div className="font-bold text-[10px] text-neutral-900 uppercase truncate">
                    {currentLoan?.borrowerName || "Depositário"}
                  </div>
                  <div className="text-[9px] text-neutral-500">
                    Solicitante / Depositário
                  </div>
                </div>

                {/* Assinatura do Operador */}
                <div className="text-center">
                  <div className="border-b border-neutral-800 pb-1 mb-1 min-h-[36px] flex items-end justify-center">
                    <span className="text-[10px] text-neutral-400 italic print:hidden">[ Visto do Operador ]</span>
                  </div>
                  <div className="font-bold text-[10px] text-neutral-900 uppercase truncate">
                    {operatorName}
                  </div>
                  <div className="text-[9px] text-neutral-500">
                    Suporte TI & Multimídia • UniFAP
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
