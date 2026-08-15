"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { 
  Printer, 
  Building2, 
  FileText, 
  X, 
  CheckCircle2, 
  AlertTriangle 
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatDate, formatCurrency } from "@/lib/utils";

interface ReportPrintableDocumentProps {
  isOpen: boolean;
  onClose: () => void;
  report: {
    reportType: string;
    title: string;
    generatedAt: string;
    summary: any;
    data: any;
  } | null;
}

export function ReportPrintableDocument({
  isOpen,
  onClose,
  report,
}: ReportPrintableDocumentProps) {
  const { data: session } = useSession();

  if (!report) return null;

  const operatorName = session?.user?.name || "Coordenação de TI - UniFAP";

  const handlePrint = () => {
    const printElement = document.getElementById("report-unifap-sheet");
    if (!printElement) {
      window.print();
      return;
    }

    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (!printWindow) {
      window.print();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>${report.title} - UniFAP</title>
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
              font-size: 10px;
              line-height: 1.35;
              padding: 10px;
            }
            .print-area {
              background: #ffffff;
              color: #111827;
              padding: 20px;
            }
            .border-b-2 { border-bottom: 2px solid #1f2937; }
            .border-b { border-bottom: 1px solid #d1d5db; }
            .border { border: 1px solid #d1d5db; }
            .border-l-4 { border-left-width: 4px; }
            .border-neutral-800 { border-color: #1f2937; }
            .border-neutral-300 { border-color: #d1d5db; }
            .border-neutral-200 { border-color: #e5e7eb; }
            .bg-neutral-50 { background-color: #f9fafb; }
            .bg-neutral-100 { background-color: #f3f4f6; }
            .text-emerald-700 { color: #047857; }
            .text-amber-700 { color: #b45309; }
            .text-rose-700 { color: #be123c; }
            .text-neutral-900 { color: #111827; }
            .text-neutral-700 { color: #374151; }
            .text-neutral-500 { color: #6b7280; }
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .font-black { font-weight: 900; }
            .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
            .uppercase { text-transform: uppercase; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .flex { display: flex; }
            .items-center { align-items: center; }
            .justify-between { justify-content: space-between; }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
            .grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
            .gap-2 { gap: 8px; }
            .gap-3 { gap: 12px; }
            .p-2 { padding: 8px; }
            .p-3 { padding: 12px; }
            .px-2 { padding-left: 8px; padding-right: 8px; }
            .px-3 { padding-left: 12px; padding-right: 12px; }
            .py-1 { padding-top: 4px; padding-bottom: 4px; }
            .py-2 { padding-top: 8px; padding-bottom: 8px; }
            .pb-2 { padding-bottom: 8px; }
            .pb-3 { padding-bottom: 12px; }
            .pt-6 { padding-top: 24px; }
            .my-2 { margin-top: 8px; margin-bottom: 8px; }
            .mb-2 { margin-bottom: 8px; }
            .rounded { border-radius: 4px; }
            .rounded-lg { border-radius: 8px; }
            .rounded-2xl { border-radius: 12px; }
            .w-full { width: 100%; }
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
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-3xl print:p-0 print:m-0 print:border-none print:shadow-none bg-card">
        
        {/* Barra superior de ações */}
        <div className="flex items-center justify-between pb-3 border-b border-border print:hidden pr-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Relatório Oficial do Sistema • UniFAP
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Documento de auditoria e prestação de contas do setor de TI & Multimídia
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
              <span>Imprimir Relatório (A4)</span>
            </Button>
          </div>
        </div>

        {/* FOLHA DO DOCUMENTO IMPRESSO (A4 FORMAT) */}
        <div 
          id="report-unifap-sheet"
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
                  Juazeiro do Norte - CE • Sistema Integrado de Gestão de Estoque & Patrimônio
                </p>
              </div>
            </div>

            <div className="text-right shrink-0 min-w-[130px]">
              <div className="px-2.5 py-1 bg-neutral-100 border border-neutral-300 rounded font-mono font-bold text-xs text-neutral-900">
                RELATÓRIO OFICIAL
              </div>
              <span className="text-[9px] text-neutral-500 block mt-0.5 whitespace-nowrap">
                Emitido: {formatDate(report.generatedAt)}
              </span>
            </div>
          </div>

          {/* Título do Relatório */}
          <div className="text-center py-2 border-b border-neutral-200">
            <h1 className="text-sm sm:text-base font-black uppercase tracking-wide text-neutral-900">
              {report.title}
            </h1>
            <p className="text-[10px] text-neutral-500 mt-0.5">
              Documento gerado eletronicamente para fins de auditoria, controle patrimonial e planejamento.
            </p>
          </div>

          {/* Sumário Executivo de KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-neutral-50 p-3 rounded-lg border border-neutral-200 text-center">
            {report.reportType === "INVENTORY" && (
              <>
                <div>
                  <span className="text-[9px] uppercase font-bold text-neutral-500">Portas Ativas</span>
                  <p className="text-sm font-extrabold text-neutral-900">{report.summary.totalDoors}</p>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-neutral-500">Caixas Físicas</span>
                  <p className="text-sm font-extrabold text-neutral-900">{report.summary.totalBoxes}</p>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-neutral-500">Patrimônios Guardados</span>
                  <p className="text-sm font-extrabold text-neutral-900">{report.summary.totalAssetsCount}</p>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-neutral-500">Total Unidades Material</span>
                  <p className="text-sm font-extrabold text-neutral-900">{report.summary.totalMaterialsUnits}</p>
                </div>
              </>
            )}

            {report.reportType === "CRITICAL_STOCK" && (
              <>
                <div>
                  <span className="text-[9px] uppercase font-bold text-neutral-500">Itens no Catálogo</span>
                  <p className="text-sm font-extrabold text-neutral-900">{report.summary.totalCatalogItems}</p>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-rose-700">Estoque Crítico</span>
                  <p className="text-sm font-extrabold text-rose-700">{report.summary.criticalCount}</p>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-amber-700">Estoque Baixo</span>
                  <p className="text-sm font-extrabold text-amber-700">{report.summary.lowCount}</p>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-neutral-500">Unidades p/ Reposição</span>
                  <p className="text-sm font-extrabold text-neutral-900">{report.summary.totalUnitsNeeded}</p>
                </div>
              </>
            )}

            {report.reportType === "LOANS" && (
              <>
                <div>
                  <span className="text-[9px] uppercase font-bold text-neutral-500">Total Empréstimos</span>
                  <p className="text-sm font-extrabold text-neutral-900">{report.summary.totalLoans}</p>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-neutral-500">Ativos no Momento</span>
                  <p className="text-sm font-extrabold text-neutral-900">{report.summary.activeCount}</p>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-emerald-700">Taxa Pontualidade</span>
                  <p className="text-sm font-extrabold text-emerald-700">{report.summary.punctualityRate}%</p>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-rose-700">Devolvidos c/ Avaria</span>
                  <p className="text-sm font-extrabold text-rose-700">{report.summary.returnedDamaged}</p>
                </div>
              </>
            )}

            {report.reportType === "MAINTENANCE" && (
              <>
                <div>
                  <span className="text-[9px] uppercase font-bold text-neutral-500">Total de Chamados</span>
                  <p className="text-sm font-extrabold text-neutral-900">{report.summary.totalOrders}</p>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-emerald-700">Concluídos</span>
                  <p className="text-sm font-extrabold text-emerald-700">{report.summary.completedCount}</p>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-neutral-500">Lâmpadas Trocadas</span>
                  <p className="text-sm font-extrabold text-neutral-900">{report.summary.totalLampsReplaced}</p>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-neutral-500">Custo Total (R$)</span>
                  <p className="text-sm font-extrabold text-neutral-900">{formatCurrency(report.summary.totalCost)}</p>
                </div>
              </>
            )}

            {report.reportType === "MOVEMENTS" && (
              <>
                <div>
                  <span className="text-[9px] uppercase font-bold text-neutral-500">Movimentações</span>
                  <p className="text-sm font-extrabold text-neutral-900">{report.summary.totalMovements}</p>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-emerald-700">Entradas (Qtd)</span>
                  <p className="text-sm font-extrabold text-emerald-700">+{report.summary.totalEntriesQty}</p>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-rose-700">Saídas / Baixas (Qtd)</span>
                  <p className="text-sm font-extrabold text-rose-700">-{report.summary.totalExitsQty}</p>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-neutral-500">Transferências</span>
                  <p className="text-sm font-extrabold text-neutral-900">{report.summary.totalTransfersQty}</p>
                </div>
              </>
            )}
          </div>

          {/* TABELAS DO RELATÓRIO COM BORDAS E LARGURAS FIXAS */}

          {/* 1. Inventário Físico */}
          {report.reportType === "INVENTORY" && (
            <div className="space-y-4">
              {report.data.map((door: any) => (
                <div key={door.id} className="space-y-1.5">
                  <div className="bg-neutral-100 px-3 py-1.5 font-bold text-[10px] uppercase text-neutral-900 border-l-4 border-neutral-800 flex items-center justify-between rounded-r">
                    <span>{door.name} ({door.code})</span>
                    <span className="text-[9px] text-neutral-500 font-mono">{door.boxes.length} Caixas</span>
                  </div>

                  <table className="w-full border-collapse border border-neutral-300 text-xs">
                    <thead>
                      <tr className="bg-neutral-100">
                        <th className="border border-neutral-300 px-2 py-1.5 text-left font-bold text-[9.5px] uppercase text-neutral-700 w-[65px]">Caixa</th>
                        <th className="border border-neutral-300 px-2 py-1.5 text-left font-bold text-[9.5px] uppercase text-neutral-700 w-[170px]">Nome & Descrição</th>
                        <th className="border border-neutral-300 px-2 py-1.5 text-left font-bold text-[9.5px] uppercase text-neutral-700 w-[220px]">Patrimônios Guardados</th>
                        <th className="border border-neutral-300 px-2 py-1.5 text-left font-bold text-[9.5px] uppercase text-neutral-700 min-w-[180px]">Materiais / Insumos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {door.boxes.map((box: any, idx: number) => (
                        <tr key={box.id} className={idx % 2 === 1 ? "bg-neutral-50/70" : "bg-white"}>
                          <td className="border border-neutral-300 px-2 py-1.5 font-mono font-bold text-neutral-900">{box.code}</td>
                          <td className="border border-neutral-300 px-2 py-1.5">
                            <strong className="text-neutral-900 block">{box.name}</strong>
                            <p className="text-[9px] text-neutral-500">{box.description || "-"}</p>
                          </td>
                          <td className="border border-neutral-300 px-2 py-1.5">
                            {box.assets.length === 0 ? (
                              <span className="text-neutral-400 italic text-[9px]">Nenhum patrimônio</span>
                            ) : (
                              box.assets.map((a: any) => (
                                <span key={a.id} className="inline-block bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded font-mono text-[9px] mr-1 mb-1">
                                  #{a.assetTag} ({a.item?.name})
                                </span>
                              ))
                            )}
                          </td>
                          <td className="border border-neutral-300 px-2 py-1.5">
                            {box.inventories.length === 0 ? (
                              <span className="text-neutral-400 italic text-[9px]">Nenhum material</span>
                            ) : (
                              box.inventories.map((inv: any) => (
                                <span key={inv.id} className="block text-[9.5px] text-neutral-800">
                                  {inv.item?.name}: <strong>{inv.quantity} {inv.item?.unit}</strong>
                                </span>
                              ))
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {/* 2. Estoque Crítico */}
          {report.reportType === "CRITICAL_STOCK" && (
            <table className="w-full border-collapse border border-neutral-300 text-xs">
              <thead>
                <tr className="bg-neutral-100">
                  <th className="border border-neutral-300 px-2 py-1.5 text-left font-bold text-[9.5px] uppercase text-neutral-700">Item / Material</th>
                  <th className="border border-neutral-300 px-2 py-1.5 text-left font-bold text-[9.5px] uppercase text-neutral-700 w-[80px]">SKU</th>
                  <th className="border border-neutral-300 px-2 py-1.5 text-left font-bold text-[9.5px] uppercase text-neutral-700 w-[100px]">Categoria</th>
                  <th className="border border-neutral-300 px-2 py-1.5 text-right font-bold text-[9.5px] uppercase text-neutral-700 w-[75px]">Saldo Atual</th>
                  <th className="border border-neutral-300 px-2 py-1.5 text-right font-bold text-[9.5px] uppercase text-neutral-700 w-[60px]">Mínimo</th>
                  <th className="border border-neutral-300 px-2 py-1.5 text-right font-bold text-[9.5px] uppercase text-neutral-700 w-[60px]">Ideal</th>
                  <th className="border border-neutral-300 px-2 py-1.5 text-right font-bold text-[9.5px] uppercase text-neutral-700 w-[100px]">Sugestão Compra</th>
                  <th className="border border-neutral-300 px-2 py-1.5 text-left font-bold text-[9.5px] uppercase text-neutral-700">Localização</th>
                </tr>
              </thead>
              <tbody>
                {report.data.allItems.map((item: any, idx: number) => (
                  <tr key={item.id} className={idx % 2 === 1 ? "bg-neutral-50/70" : "bg-white"}>
                    <td className="border border-neutral-300 px-2 py-1.5 font-bold text-neutral-900">{item.name}</td>
                    <td className="border border-neutral-300 px-2 py-1.5 font-mono text-neutral-600">{item.sku}</td>
                    <td className="border border-neutral-300 px-2 py-1.5 text-neutral-600">{item.category}</td>
                    <td className={`border border-neutral-300 px-2 py-1.5 text-right font-bold font-mono ${item.status === "CRITICAL" ? "text-rose-700" : item.status === "LOW" ? "text-amber-700" : ""}`}>
                      {item.currentStock} {item.unit}
                    </td>
                    <td className="border border-neutral-300 px-2 py-1.5 text-right font-mono text-neutral-600">{item.minStock}</td>
                    <td className="border border-neutral-300 px-2 py-1.5 text-right font-mono text-neutral-600">{item.idealStock}</td>
                    <td className="border border-neutral-300 px-2 py-1.5 text-right font-mono font-bold text-emerald-700">
                      +{item.suggestedPurchase} {item.unit}
                    </td>
                    <td className="border border-neutral-300 px-2 py-1.5 text-[9px] text-neutral-600">{item.boxes || "Sem caixa"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 3. Empréstimos */}
          {report.reportType === "LOANS" && (
            <table className="w-full border-collapse border border-neutral-300 text-xs">
              <thead>
                <tr className="bg-neutral-100">
                  <th className="border border-neutral-300 px-2 py-1.5 text-left font-bold text-[9.5px] uppercase text-neutral-700 w-[110px]">Protocolo</th>
                  <th className="border border-neutral-300 px-2 py-1.5 text-left font-bold text-[9.5px] uppercase text-neutral-700">Solicitante</th>
                  <th className="border border-neutral-300 px-2 py-1.5 text-left font-bold text-[9.5px] uppercase text-neutral-700">Equipamento</th>
                  <th className="border border-neutral-300 px-2 py-1.5 text-left font-bold text-[9.5px] uppercase text-neutral-700 w-[80px]">Patrimônio</th>
                  <th className="border border-neutral-300 px-2 py-1.5 text-left font-bold text-[9.5px] uppercase text-neutral-700 w-[80px]">Retirada</th>
                  <th className="border border-neutral-300 px-2 py-1.5 text-left font-bold text-[9.5px] uppercase text-neutral-700 w-[80px]">Prevista</th>
                  <th className="border border-neutral-300 px-2 py-1.5 text-left font-bold text-[9.5px] uppercase text-neutral-700 w-[80px]">Status</th>
                </tr>
              </thead>
              <tbody>
                {report.data.map((loan: any, idx: number) => (
                  <tr key={loan.id} className={idx % 2 === 1 ? "bg-neutral-50/70" : "bg-white"}>
                    <td className="border border-neutral-300 px-2 py-1.5 font-mono font-bold text-neutral-900">LOAN-{loan.id.slice(-8).toUpperCase()}</td>
                    <td className="border border-neutral-300 px-2 py-1.5">
                      <strong className="text-neutral-900 block">{loan.borrowerName}</strong>
                      <p className="text-[9px] text-neutral-500">{loan.destination}</p>
                    </td>
                    <td className="border border-neutral-300 px-2 py-1.5 text-neutral-900">{loan.asset?.item?.name}</td>
                    <td className="border border-neutral-300 px-2 py-1.5 font-mono font-bold text-neutral-900">#{loan.asset?.assetTag}</td>
                    <td className="border border-neutral-300 px-2 py-1.5 text-neutral-600">{formatDate(loan.loanDate)}</td>
                    <td className="border border-neutral-300 px-2 py-1.5 text-neutral-600">{formatDate(loan.expectedReturnDate)}</td>
                    <td className="border border-neutral-300 px-2 py-1.5 font-bold text-[9.5px]">{loan.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 4. Manutenção */}
          {report.reportType === "MAINTENANCE" && (
            <table className="w-full border-collapse border border-neutral-300 text-xs">
              <thead>
                <tr className="bg-neutral-100">
                  <th className="border border-neutral-300 px-2 py-1.5 text-left font-bold text-[9.5px] uppercase text-neutral-700 w-[100px]">Nº OS</th>
                  <th className="border border-neutral-300 px-2 py-1.5 text-left font-bold text-[9.5px] uppercase text-neutral-700">Equipamento</th>
                  <th className="border border-neutral-300 px-2 py-1.5 text-left font-bold text-[9.5px] uppercase text-neutral-700 w-[80px]">Patrimônio</th>
                  <th className="border border-neutral-300 px-2 py-1.5 text-left font-bold text-[9.5px] uppercase text-neutral-700">Defeito / Laudo</th>
                  <th className="border border-neutral-300 px-2 py-1.5 text-left font-bold text-[9.5px] uppercase text-neutral-700 w-[120px]">Prestador</th>
                  <th className="border border-neutral-300 px-2 py-1.5 text-left font-bold text-[9.5px] uppercase text-neutral-700 w-[110px]">Peças Trocadas</th>
                  <th className="border border-neutral-300 px-2 py-1.5 text-left font-bold text-[9.5px] uppercase text-neutral-700 w-[80px]">Status</th>
                  <th className="border border-neutral-300 px-2 py-1.5 text-right font-bold text-[9.5px] uppercase text-neutral-700 w-[80px]">Custo (R$)</th>
                </tr>
              </thead>
              <tbody>
                {report.data.map((m: any, idx: number) => (
                  <tr key={m.id} className={idx % 2 === 1 ? "bg-neutral-50/70" : "bg-white"}>
                    <td className="border border-neutral-300 px-2 py-1.5 font-mono font-bold text-neutral-900">{m.orderNumber || `#OS-${m.id.slice(0, 8)}`}</td>
                    <td className="border border-neutral-300 px-2 py-1.5 font-medium text-neutral-900">{m.asset?.item?.name}</td>
                    <td className="border border-neutral-300 px-2 py-1.5 font-mono font-bold text-neutral-900">#{m.asset?.assetTag}</td>
                    <td className="border border-neutral-300 px-2 py-1.5">
                      <p className="font-medium text-neutral-900">{m.issueDescription}</p>
                      {m.solution && <p className="text-[9px] text-neutral-500">Laudo: {m.solution}</p>}
                    </td>
                    <td className="border border-neutral-300 px-2 py-1.5 text-neutral-700">{m.serviceProvider || "Laboratório UniFAP"}</td>
                    <td className="border border-neutral-300 px-2 py-1.5 text-[9px] text-neutral-700">{m.replacedParts || "-"}</td>
                    <td className="border border-neutral-300 px-2 py-1.5 font-bold text-[9.5px]">{m.status}</td>
                    <td className="border border-neutral-300 px-2 py-1.5 text-right font-mono font-bold text-neutral-900">
                      {m.cost ? formatCurrency(Number(m.cost)) : "R$ 0,00"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 5. Movimentações */}
          {report.reportType === "MOVEMENTS" && (
            <table className="w-full border-collapse border border-neutral-300 text-xs">
              <thead>
                <tr className="bg-neutral-100">
                  <th className="border border-neutral-300 px-2 py-1.5 text-left font-bold text-[9.5px] uppercase text-neutral-700 w-[110px]">Data/Hora</th>
                  <th className="border border-neutral-300 px-2 py-1.5 text-left font-bold text-[9.5px] uppercase text-neutral-700 w-[90px]">Tipo</th>
                  <th className="border border-neutral-300 px-2 py-1.5 text-left font-bold text-[9.5px] uppercase text-neutral-700">Item / Material</th>
                  <th className="border border-neutral-300 px-2 py-1.5 text-right font-bold text-[9.5px] uppercase text-neutral-700 w-[70px]">Qtd</th>
                  <th className="border border-neutral-300 px-2 py-1.5 text-left font-bold text-[9.5px] uppercase text-neutral-700 w-[100px]">Origem ➔ Destino</th>
                  <th className="border border-neutral-300 px-2 py-1.5 text-left font-bold text-[9.5px] uppercase text-neutral-700 w-[100px]">Operador</th>
                  <th className="border border-neutral-300 px-2 py-1.5 text-left font-bold text-[9.5px] uppercase text-neutral-700">Justificativa</th>
                </tr>
              </thead>
              <tbody>
                {report.data.map((mov: any, idx: number) => (
                  <tr key={mov.id} className={idx % 2 === 1 ? "bg-neutral-50/70" : "bg-white"}>
                    <td className="border border-neutral-300 px-2 py-1.5 font-mono text-neutral-600">{formatDateTime(mov.createdAt)}</td>
                    <td className="border border-neutral-300 px-2 py-1.5 font-bold text-[9.5px]">{mov.type}</td>
                    <td className="border border-neutral-300 px-2 py-1.5 font-medium text-neutral-900">{mov.item?.name}</td>
                    <td className="border border-neutral-300 px-2 py-1.5 text-right font-mono font-bold text-neutral-900">{mov.quantity} {mov.item?.unit}</td>
                    <td className="border border-neutral-300 px-2 py-1.5 text-[9px] font-mono text-neutral-600">
                      {mov.sourceBox?.code ? `${mov.sourceBox.code} ➔ ` : ""}
                      {mov.destBox?.code ? mov.destBox.code : "-"}
                    </td>
                    <td className="border border-neutral-300 px-2 py-1.5 text-neutral-700">{mov.user?.name || "Sistema"}</td>
                    <td className="border border-neutral-300 px-2 py-1.5 text-[9px] text-neutral-600">{mov.observation || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* ASSINATURAS FORMAIS */}
          <div className="pt-8">
            <table className="w-full text-center border-none">
              <tbody>
                <tr className="bg-transparent">
                  <td className="w-1/2 px-6 align-top border-none bg-transparent">
                    <div className="border-t border-neutral-600 pt-1.5">
                      <p className="font-bold text-[11px] text-neutral-900">{operatorName}</p>
                      <p className="text-[9px] text-neutral-500">Responsável pela Emissão do Relatório</p>
                      <p className="text-[8px] text-neutral-400">UniFAP - Setor de TI</p>
                    </div>
                  </td>
                  <td className="w-1/2 px-6 align-top border-none bg-transparent">
                    <div className="border-t border-neutral-600 pt-1.5">
                      <p className="font-bold text-[11px] text-neutral-900">Gerência de TI & Operações</p>
                      <p className="text-[9px] text-neutral-500">Validação e Homologação</p>
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
            <p>Registro auditável com integridade de dados e rastreabilidade institucional.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
