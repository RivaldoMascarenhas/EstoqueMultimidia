"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { 
  Printer, 
  Wrench, 
  Building2, 
  FileText, 
  X, 
  Clock,
  Tag,
  DollarSign
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import QRCode from "qrcode";

interface MaintenanceOsModalProps {
  isOpen: boolean;
  onClose: () => void;
  maintenance: any | null;
}

export function MaintenanceOsModal({
  isOpen,
  onClose,
  maintenance,
}: MaintenanceOsModalProps) {
  const { data: session } = useSession();
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  const orderNum = maintenance?.orderNumber || (maintenance?.id ? `#OS-${maintenance.id.slice(0, 8)}` : "");

  useEffect(() => {
    if (isOpen && maintenance) {
      const payload = JSON.stringify({
        unifap: "TI-MULTIMIDIA",
        doc: "ORDEM-DE-SERVICO",
        osNumber: orderNum,
        assetTag: maintenance.asset?.assetTag,
        item: maintenance.asset?.item?.name,
        date: maintenance.entryDate,
        status: maintenance.status,
      });

      QRCode.toDataURL(payload, {
        width: 140,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch(() => setQrCodeDataUrl(""));
    }
  }, [isOpen, maintenance, orderNum]);

  if (!loanOrMaintenanceCheck(maintenance)) return null;

  const isCompleted = maintenance.status === "COMPLETED";
  const technicianName = maintenance.completedByUser?.name || maintenance.createdByUser?.name || session?.user?.name || "Técnico de Suporte TI";

  function loanOrMaintenanceCheck(m: any) {
    return !!m;
  }

  const handlePrint = () => {
    const printElement = document.getElementById("os-unifap-sheet");
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
          <title>Ordem de Serviço - ${orderNum}</title>
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
            .border-amber-500 { border-color: #f59e0b; }
            .border-l-4 { border-left-width: 4px; }
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
            .pb-1 { padding-bottom: 4px; }
            .pb-3 { padding-bottom: 12px; }
            .pb-4 { padding-bottom: 16px; }
            .pt-1 { padding-top: 4px; }
            .pt-4 { padding-top: 16px; }
            .pt-6 { padding-top: 24px; }
            .my-2\\.5 { margin-top: 10px; margin-bottom: 10px; }
            .my-3 { margin-top: 12px; margin-bottom: 12px; }
            .mt-0\\.5 { margin-top: 2px; }
            .mt-1 { margin-top: 4px; }
            .mt-2 { margin-top: 8px; }
            .mt-6 { margin-top: 24px; }
            .mb-1 { margin-bottom: 4px; }
            .mb-2 { margin-bottom: 8px; }
            .mb-4 { margin-bottom: 16px; }
            .rounded { border-radius: 4px; }
            .rounded-lg { border-radius: 8px; }
            .rounded-2xl { border-radius: 12px; }
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .font-medium { font-weight: 500; }
            .font-black { font-weight: 900; }
            .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
            .uppercase { text-transform: uppercase; }
            .tracking-wider { letter-spacing: 0.05em; }
            .tracking-wide { letter-spacing: 0.025em; }
            .tracking-tight { letter-spacing: -0.025em; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .flex { display: flex; }
            .flex-col { flex-direction: column; }
            .items-center { align-items: center; }
            .items-start { align-items: flex-start; }
            .items-end { align-items: flex-end; }
            .justify-between { justify-content: space-between; }
            .justify-center { justify-content: center; }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
            .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
            .grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
            .gap-1 { gap: 4px; }
            .gap-2 { gap: 8px; }
            .gap-3 { gap: 12px; }
            .gap-4 { gap: 16px; }
            .col-span-2 { grid-column: span 2 / span 2; }
            .col-span-3 { grid-column: span 3 / span 3; }
            .space-y-0\\.5 > * + * { margin-top: 2px; }
            .space-y-1 > * + * { margin-top: 4px; }
            .space-y-2 > * + * { margin-top: 8px; }
            .space-y-4 > * + * { margin-top: 16px; }
            .leading-tight { line-height: 1.25; }
            .leading-relaxed { line-height: 1.625; }
            .w-16 { width: 64px; }
            .h-16 { height: 64px; }
            .w-5 { width: 20px; }
            .h-5 { height: 20px; }
            .w-full { width: 100%; }
            .block { display: block; }
            .text-xs { font-size: 12px; }
            .text-sm { font-size: 14px; }
            .text-base { font-size: 16px; }
            .text-\\[10px\\] { font-size: 10px; }
            .text-\\[11px\\] { font-size: 11px; }
            .text-\\[9px\\] { font-size: 9px; }
            .text-\\[8px\\] { font-size: 8px; }
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

  const getPriorityLabel = (p?: string) => {
    switch (p) {
      case "CRITICAL": return "Crítica";
      case "HIGH": return "Alta";
      case "LOW": return "Baixa";
      default: return "Média";
    }
  };

  const getTypeLabel = (t?: string) => {
    switch (t) {
      case "EXTERNAL": return "Assistência Técnica Externa";
      case "PREVENTIVE": return "Manutenção Preventiva";
      case "INTERNAL": return "Ajuste Interno / Firmware";
      default: return "Corretiva Interna";
    }
  };

  const getStatusLabel = (s: string) => {
    switch (s) {
      case "COMPLETED": return "CONCLUÍDO / LIBERADO";
      case "CANCELLED": return "CANCELADO";
      case "IN_PROGRESS": return "EM ANDAMENTO";
      default: return "PENDENTE";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-3xl print:p-0 print:m-0 print:border-none print:shadow-none bg-card">
        
        {/* Barra superior de ações */}
        <div className="flex items-center justify-between pb-3 border-b border-border print:hidden pr-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Ordem de Serviço Institucional UniFAP
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Documento oficial de manutenção, laudo técnico e histórico
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              size="sm"
              className="gap-1.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-sm text-xs h-8"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir OS (A4)</span>
            </Button>
          </div>
        </div>

        {/* FOLHA DO DOCUMENTO IMPRESSO (A4 FORMAT) */}
        <div 
          id="os-unifap-sheet"
          className="print-area bg-white text-neutral-900 p-6 sm:p-8 rounded-2xl border border-neutral-300 shadow-sm print:border-none print:shadow-none print:p-4 text-xs font-sans space-y-4"
        >
          {/* Cabeçalho Institucional */}
          <div className="border-b-2 border-neutral-800 pb-3 flex items-center justify-between gap-4">
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
                <p className="text-[10px] text-neutral-500">
                  Juazeiro do Norte - CE • Sistema Oficial de Manutenção e Laudos Técnicos
                </p>
              </div>
            </div>

            <div className="text-right shrink-0 min-w-[120px]">
              <div className="px-2.5 py-1 bg-neutral-100 border border-neutral-300 rounded font-mono font-bold text-xs text-neutral-900">
                {orderNum}
              </div>
              <span className="text-[9px] text-neutral-500 block mt-0.5 whitespace-nowrap">
                Emitido: {formatDate(maintenance.entryDate)}
              </span>
            </div>
          </div>

          {/* Banner Status & QR Code */}
          <div className="grid grid-cols-4 gap-3 items-center bg-neutral-50 p-3 rounded-lg border border-neutral-200">
            <div className="col-span-3 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-neutral-500">Status:</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  isCompleted ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                }`}>
                  {getStatusLabel(maintenance.status)}
                </span>
                <span className="text-[10px] text-neutral-600 font-semibold">• Prioridade: {getPriorityLabel(maintenance.priority)}</span>
              </div>
              <p className="text-[11px] text-neutral-800 font-medium">
                <strong>Tipo:</strong> {getTypeLabel(maintenance.maintenanceType)}
                {maintenance.serviceProvider && ` • Prestador: ${maintenance.serviceProvider}`}
              </p>
            </div>

            <div className="flex flex-col items-center justify-center">
              {qrCodeDataUrl ? (
                <img src={qrCodeDataUrl} alt="QR Code OS" className="h-16 w-16 border border-neutral-300 p-0.5 bg-white rounded" />
              ) : (
                <div className="h-16 w-16 bg-neutral-200 rounded flex items-center justify-center text-[9px] text-neutral-500">QR Code</div>
              )}
              <span className="text-[8px] font-mono text-neutral-500 mt-0.5">Autenticidade OS</span>
            </div>
          </div>

          {/* 1. IDENTIFICAÇÃO DO EQUIPAMENTO */}
          <div>
            <div className="bg-neutral-100 border-l-4 border-amber-500 px-2.5 py-1 font-bold text-[10px] uppercase text-neutral-800 tracking-wider mb-2">
              1. Identificação do Equipamento Patrimonial
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 border border-neutral-200 rounded-lg p-3 bg-white">
              <div>
                <span className="block text-[9px] uppercase font-bold text-neutral-500">Nº de Patrimônio</span>
                <span className="font-bold text-neutral-900 font-mono text-xs">#{maintenance.asset?.assetTag}</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase font-bold text-neutral-500">Item / Equipamento</span>
                <span className="font-medium text-neutral-900">{maintenance.asset?.item?.name}</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase font-bold text-neutral-500">Modelo</span>
                <span className="font-medium text-neutral-900">{maintenance.asset?.model || maintenance.asset?.item?.model || "Padrão"}</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase font-bold text-neutral-500">Nº de Série</span>
                <span className="font-mono text-neutral-900">{maintenance.asset?.serialNumber || "Não informado"}</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase font-bold text-neutral-500">Categoria</span>
                <span className="text-neutral-900">{maintenance.asset?.item?.category?.name || "Multimídia"}</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase font-bold text-neutral-500">Localização Anterior</span>
                <span className="text-neutral-900">
                  {maintenance.asset?.currentBox ? `${maintenance.asset.currentBox.door?.name || "Porta"} / ${maintenance.asset.currentBox.name}` : "Laboratório TI"}
                </span>
              </div>
            </div>
          </div>

          {/* 2. DEFEITO RECLAMADO & DIAGNÓSTICO */}
          <div>
            <div className="bg-neutral-100 border-l-4 border-amber-500 px-2.5 py-1 font-bold text-[10px] uppercase text-neutral-800 tracking-wider mb-2">
              2. Defeito Reclamado & Diagnóstico Inicial
            </div>

            <div className="border border-neutral-200 rounded-lg p-3 bg-neutral-50/70 space-y-2">
              <div>
                <span className="block text-[9px] uppercase font-bold text-neutral-500">Defeito Relatado na Entrada:</span>
                <p className="text-neutral-900 font-medium leading-relaxed">{maintenance.issueDescription}</p>
              </div>
              {maintenance.diagnosis && (
                <div>
                  <span className="block text-[9px] uppercase font-bold text-neutral-500">Diagnóstico Preliminar Técnico:</span>
                  <p className="text-neutral-800 leading-relaxed">{maintenance.diagnosis}</p>
                </div>
              )}
            </div>
          </div>

          {/* 3. LAUDO TÉCNICO & SERVIÇOS EXECUTADOS */}
          <div>
            <div className="bg-neutral-100 border-l-4 border-amber-500 px-2.5 py-1 font-bold text-[10px] uppercase text-neutral-800 tracking-wider mb-2">
              3. Laudo Técnico, Peças & Conclusão
            </div>

            <div className="border border-neutral-200 rounded-lg p-3 bg-neutral-50/70 space-y-2">
              <div>
                <span className="block text-[9px] uppercase font-bold text-neutral-500">Solução Técnica Aplicada / Laudo de Saída:</span>
                <p className="text-neutral-900 font-medium leading-relaxed">
                  {maintenance.solution || "Manutenção em andamento / aguardando conclusão técnica na bancada."}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-neutral-200">
                <div>
                  <span className="block text-[9px] uppercase font-bold text-neutral-500">Peças Substituídas</span>
                  <span className="text-neutral-900 font-medium">{maintenance.replacedParts || "Nenhuma / Ajuste técnico"}</span>
                </div>

                {maintenance.lampHours !== null && maintenance.lampHours !== undefined && (
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-neutral-500">Horímetro da Lâmpada</span>
                    <span className="text-neutral-900 font-bold">{maintenance.lampHours} horas</span>
                  </div>
                )}

                <div>
                  <span className="block text-[9px] uppercase font-bold text-neutral-500">Custo Total dos Reparos</span>
                  <span className="text-neutral-950 font-bold text-xs">
                    {maintenance.cost ? formatCurrency(Number(maintenance.cost)) : "Sem custo / Reparo interno"}
                  </span>
                </div>
              </div>

              {maintenance.technicalNotes && (
                <div className="pt-2 text-[11px] text-neutral-600 border-t border-neutral-200">
                  <span className="font-semibold text-neutral-700">Observações adicionais:</span> {maintenance.technicalNotes}
                </div>
              )}
            </div>
          </div>

          {/* ASSINATURAS FORMAIS */}
          <div className="pt-6">
            <table className="w-full text-center">
              <tbody>
                <tr>
                  <td className="w-1/2 px-4 align-top">
                    <div className="border-t border-neutral-600 pt-1.5">
                      <p className="font-bold text-[11px] text-neutral-900">{technicianName}</p>
                      <p className="text-[9px] text-neutral-500">Técnico / Responsável pelo Atendimento</p>
                      <p className="text-[8px] text-neutral-400">UniFAP - Setor de TI</p>
                    </div>
                  </td>
                  <td className="w-1/2 px-4 align-top">
                    <div className="border-t border-neutral-600 pt-1.5">
                      <p className="font-bold text-[11px] text-neutral-900">
                        {maintenance.serviceProvider || "Coordenação de TI & Multimídia"}
                      </p>
                      <p className="text-[9px] text-neutral-500">Validação Técnica / Prestador</p>
                      <p className="text-[8px] text-neutral-400">Centro Universitário Paraíso</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Rodapé Institucional */}
          <div className="border-t border-dashed border-neutral-300 pt-3 text-center text-[8px] text-neutral-500 space-y-0.5">
            <p>Documento emitido eletronicamente pelo Sistema de Gestão de Estoque & Patrimônio UniFAP.</p>
            <p>Registro imutável com auditoria criptográfica e rastreabilidade patrimonial interna.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
