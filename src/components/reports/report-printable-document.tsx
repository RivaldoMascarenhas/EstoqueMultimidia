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

const reportDocumentStyles = `
  @page {
    size: A4 portrait;
    margin: 8mm 12mm;
  }
  .print-area {
    background: #ffffff !important;
    color: #0f172a !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
    font-size: 10px !important;
    line-height: 1.35 !important;
    box-sizing: border-box !important;
  }
  .print-area * {
    box-sizing: border-box !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  
  /* Logo & Cabeçalho */
  .header-bar {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    border-bottom: 2px solid #0f172a !important;
    padding-bottom: 8px !important;
    margin-bottom: 10px !important;
    gap: 16px !important;
  }
  .header-left {
    display: flex !important;
    align-items: center !important;
    gap: 12px !important;
  }
  .logo-unifap {
    height: 38px !important;
    width: auto !important;
    max-height: 40px !important;
    object-fit: contain !important;
    flex-shrink: 0 !important;
  }
  .inst-info {
    border-left: 2px solid #cbd5e1 !important;
    padding-left: 10px !important;
  }
  .inst-name {
    font-weight: 900 !important;
    font-size: 12px !important;
    text-transform: uppercase !important;
    letter-spacing: 0.03em !important;
    color: #0f172a !important;
  }
  .inst-sector {
    font-size: 10px !important;
    font-weight: 700 !important;
    color: #0369a1 !important;
  }
  .inst-sub {
    font-size: 8.5px !important;
    color: #64748b !important;
  }
  .doc-tag {
    text-align: right !important;
    flex-shrink: 0 !important;
    min-width: 130px !important;
  }
  .doc-badge {
    display: inline-block !important;
    background: #f1f5f9 !important;
    border: 1px solid #cbd5e1 !important;
    border-radius: 6px !important;
    padding: 3px 8px !important;
    font-family: monospace !important;
    font-weight: 800 !important;
    font-size: 10px !important;
    color: #0f172a !important;
  }
  .doc-date {
    font-size: 8.5px !important;
    color: #64748b !important;
    margin-top: 2px !important;
  }

  /* Título do Relatório */
  .report-title-banner {
    text-align: center !important;
    padding: 6px 0 8px !important;
    margin-bottom: 10px !important;
    border-bottom: 1px solid #e2e8f0 !important;
  }
  .report-title-banner h1 {
    font-size: 13px !important;
    font-weight: 900 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.04em !important;
    color: #0f172a !important;
  }
  .report-title-banner p {
    font-size: 8.5px !important;
    color: #64748b !important;
    margin-top: 2px !important;
  }

  /* Grid de KPIs */
  .kpi-container {
    display: flex !important;
    gap: 8px !important;
    margin-bottom: 12px !important;
    width: 100% !important;
  }
  .kpi-card {
    flex: 1 !important;
    background: #f8fafc !important;
    border: 1px solid #cbd5e1 !important;
    border-radius: 6px !important;
    padding: 6px 4px !important;
    text-align: center !important;
  }
  .kpi-label {
    font-size: 7.5px !important;
    font-weight: 800 !important;
    text-transform: uppercase !important;
    color: #64748b !important;
    display: block !important;
    margin-bottom: 2px !important;
    letter-spacing: 0.025em !important;
  }
  .kpi-value {
    font-size: 13px !important;
    font-weight: 900 !important;
    color: #0f172a !important;
    display: block !important;
  }
  .kpi-value-green { color: #047857 !important; }
  .kpi-value-red { color: #b91c1c !important; }
  .kpi-value-amber { color: #b45309 !important; }

  /* Cabeçalho da Porta */
  .door-section {
    margin-bottom: 12px !important;
    border: 1px solid #cbd5e1 !important;
    border-radius: 6px !important;
    overflow: hidden !important;
  }
  .door-header {
    background: #0f172a !important;
    color: #ffffff !important;
    padding: 4px 10px !important;
    font-size: 9.5px !important;
    font-weight: 800 !important;
    text-transform: uppercase !important;
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    letter-spacing: 0.04em !important;
  }
  .door-header span:last-child {
    font-size: 8px !important;
    font-weight: 700 !important;
    background: rgba(255,255,255,0.2) !important;
    padding: 2px 6px !important;
    border-radius: 4px !important;
  }

  /* Tabelas Formatadas */
  .report-table {
    width: 100% !important;
    border-collapse: collapse !important;
    font-size: 9px !important;
  }
  .report-table th {
    background: #f1f5f9 !important;
    color: #334155 !important;
    font-size: 8px !important;
    font-weight: 800 !important;
    text-transform: uppercase !important;
    padding: 4px 6px !important;
    border: 1px solid #cbd5e1 !important;
    text-align: left !important;
  }
  .report-table td {
    padding: 4px 6px !important;
    border: 1px solid #e2e8f0 !important;
    vertical-align: top !important;
    color: #1e293b !important;
    line-height: 1.25 !important;
  }
  .report-table tr:nth-child(even) td {
    background-color: #f8fafc !important;
  }

  /* Badges & Tags */
  .tag-pill {
    display: inline-block !important;
    background: #f1f5f9 !important;
    border: 1px solid #cbd5e1 !important;
    border-radius: 4px !important;
    padding: 1px 4px !important;
    font-family: monospace !important;
    font-size: 8px !important;
    margin: 1px 2px 1px 0 !important;
  }
  .tag-green { background: #dcfce7 !important; color: #166534 !important; border-color: #bbf7d0 !important; font-weight: 700 !important; }
  .tag-red { background: #fee2e2 !important; color: #991b1b !important; border-color: #fecaca !important; font-weight: 700 !important; }
  .tag-amber { background: #fef3c7 !important; color: #92400e !important; border-color: #fde68a !important; font-weight: 700 !important; }

  /* Assinaturas */
  .signature-container {
    margin-top: 20px !important;
    display: flex !important;
    justify-content: space-between !important;
    gap: 24px !important;
    padding-top: 10px !important;
  }
  .signature-box {
    flex: 1 !important;
    text-align: center !important;
  }
  .signature-line {
    border-top: 1.5px solid #334155 !important;
    padding-top: 4px !important;
    margin: 0 auto !important;
    width: 85% !important;
  }
  .signature-name {
    font-size: 9.5px !important;
    font-weight: 800 !important;
    color: #0f172a !important;
  }
  .signature-role {
    font-size: 8px !important;
    color: #64748b !important;
  }
  .signature-inst {
    font-size: 7.5px !important;
    color: #94a3b8 !important;
  }

  /* Rodapé */
  .footer-info {
    border-top: 1px dashed #cbd5e1 !important;
    margin-top: 14px !important;
    padding-top: 4px !important;
    text-align: center !important;
    font-size: 7.5px !important;
    color: #94a3b8 !important;
  }

  @media print {
    body { padding: 0 !important; background: #fff !important; }
    .print-area { border: none !important; box-shadow: none !important; padding: 0 !important; }
    .door-section { break-inside: avoid; }
    .signature-container { break-inside: avoid; }
  }
`;

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
            ${reportDocumentStyles}
          </style>
        </head>
        <body style="background: #ffffff; padding: 10px; margin: 0;">
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
        
        {/* Injeção de estilos para o preview na tela e impressão */}
        <style dangerouslySetInnerHTML={{ __html: reportDocumentStyles }} />

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
          className="print-area bg-white text-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0 text-xs font-sans space-y-3"
        >
          {/* Cabeçalho Institucional */}
          <div className="header-bar">
            <div className="header-left">
              <img
                src="/brand/logo-unifap.png"
                alt="UniFAP"
                className="logo-unifap"
                style={{ height: "36px", width: "auto", maxHeight: "38px" }}
              />
              <div className="inst-info">
                <div className="inst-name">
                  CENTRO UNIVERSITÁRIO PARAÍSO • UNIFAP
                </div>
                <p className="inst-sector">
                  Setor de Suporte de TI & Multimídia
                </p>
                <p className="inst-sub">
                  Juazeiro do Norte - CE • Sistema Integrado de Gestão de Estoque & Patrimônio
                </p>
              </div>
            </div>

            <div className="doc-tag">
              <div className="doc-badge">
                RELATÓRIO OFICIAL
              </div>
              <span className="doc-date block">
                Emitido: {formatDate(report.generatedAt)}
              </span>
            </div>
          </div>

          {/* Título do Relatório */}
          <div className="report-title-banner">
            <h1>{report.title}</h1>
            <p>
              Documento gerado eletronicamente para fins de auditoria, controle patrimonial e planejamento.
            </p>
          </div>

          {/* Sumário Executivo de KPIs */}
          <div className="kpi-container">
            {report.reportType === "INVENTORY" && (
              <>
                <div className="kpi-card">
                  <span className="kpi-label">Portas Ativas</span>
                  <strong className="kpi-value">{report.summary.totalDoors}</strong>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Caixas Físicas</span>
                  <strong className="kpi-value">{report.summary.totalBoxes}</strong>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Patrimônios Guardados</span>
                  <strong className="kpi-value">{report.summary.totalAssetsCount}</strong>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Total Unidades Material</span>
                  <strong className="kpi-value">{report.summary.totalMaterialsUnits}</strong>
                </div>
              </>
            )}

            {report.reportType === "CRITICAL_STOCK" && (
              <>
                <div className="kpi-card">
                  <span className="kpi-label">Itens no Catálogo</span>
                  <strong className="kpi-value">{report.summary.totalCatalogItems}</strong>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Estoque Crítico</span>
                  <strong className="kpi-value kpi-value-red">{report.summary.criticalCount}</strong>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Estoque Baixo</span>
                  <strong className="kpi-value kpi-value-amber">{report.summary.lowCount}</strong>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Unidades p/ Reposição</span>
                  <strong className="kpi-value">{report.summary.totalUnitsNeeded}</strong>
                </div>
              </>
            )}

            {report.reportType === "LOANS" && (
              <>
                <div className="kpi-card">
                  <span className="kpi-label">Total Empréstimos</span>
                  <strong className="kpi-value">{report.summary.totalLoans}</strong>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Ativos no Momento</span>
                  <strong className="kpi-value">{report.summary.activeCount}</strong>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Taxa Pontualidade</span>
                  <strong className="kpi-value kpi-value-green">{report.summary.punctualityRate}%</strong>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Devolvidos c/ Avaria</span>
                  <strong className="kpi-value kpi-value-red">{report.summary.returnedDamaged}</strong>
                </div>
              </>
            )}

            {report.reportType === "MAINTENANCE" && (
              <>
                <div className="kpi-card">
                  <span className="kpi-label">Total de Chamados</span>
                  <strong className="kpi-value">{report.summary.totalOrders}</strong>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Concluídos</span>
                  <strong className="kpi-value kpi-value-green">{report.summary.completedCount}</strong>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Lâmpadas Trocadas</span>
                  <strong className="kpi-value">{report.summary.totalLampsReplaced}</strong>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Custo Total</span>
                  <strong className="kpi-value">{formatCurrency(report.summary.totalCost)}</strong>
                </div>
              </>
            )}

            {report.reportType === "MOVEMENTS" && (
              <>
                <div className="kpi-card">
                  <span className="kpi-label">Movimentações</span>
                  <strong className="kpi-value">{report.summary.totalMovements}</strong>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Entradas (Qtd)</span>
                  <strong className="kpi-value kpi-value-green">+{report.summary.totalEntriesQty}</strong>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Saídas / Baixas (Qtd)</span>
                  <strong className="kpi-value kpi-value-red">-{report.summary.totalExitsQty}</strong>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Transferências</span>
                  <strong className="kpi-value">{report.summary.totalTransfersQty}</strong>
                </div>
              </>
            )}
          </div>

          {/* TABELAS DO RELATÓRIO FORMATADAS */}

          {/* 1. Inventário Físico */}
          {report.reportType === "INVENTORY" && (
            <div className="space-y-3">
              {report.data.map((door: any) => (
                <div key={door.id} className="door-section">
                  <div className="door-header">
                    <span>{door.name} ({door.code})</span>
                    <span>{door.boxes.length} Caixas</span>
                  </div>

                  <table className="report-table">
                    <thead>
                      <tr>
                        <th style={{ width: "55px" }}>Caixa</th>
                        <th style={{ width: "160px" }}>Nome & Descrição</th>
                        <th style={{ width: "220px" }}>Patrimônios Guardados</th>
                        <th>Materiais / Insumos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {door.boxes.map((box: any) => (
                        <tr key={box.id}>
                          <td style={{ fontFamily: "monospace", fontWeight: 800 }}>{box.code}</td>
                          <td>
                            <strong style={{ display: "block" }}>{box.name}</strong>
                            <span style={{ fontSize: "8px", color: "#64748b" }}>{box.description || "-"}</span>
                          </td>
                          <td>
                            {box.assets.length === 0 ? (
                              <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: "8.5px" }}>Nenhum patrimônio</span>
                            ) : (
                              box.assets.map((a: any) => (
                                <span key={a.id} className="tag-pill">
                                  #{a.assetTag} ({a.item?.name})
                                </span>
                              ))
                            )}
                          </td>
                          <td>
                            {box.inventories.length === 0 ? (
                              <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: "8.5px" }}>Nenhum material</span>
                            ) : (
                              box.inventories.map((inv: any) => (
                                <div key={inv.id} style={{ fontSize: "8.5px", marginBottom: "2px" }}>
                                  {inv.item?.name}: <strong>{inv.quantity} {inv.item?.unit}</strong>
                                </div>
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
            <div className="door-section">
              <div className="door-header">
                <span>Catálogo Completo & Necessidade de Reposição</span>
                <span>{report.data.allItems.length} Itens</span>
              </div>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Item / Material</th>
                    <th style={{ width: "70px" }}>SKU</th>
                    <th style={{ width: "90px" }}>Categoria</th>
                    <th style={{ width: "65px", textAlign: "right" }}>Saldo Atual</th>
                    <th style={{ width: "50px", textAlign: "right" }}>Mínimo</th>
                    <th style={{ width: "50px", textAlign: "right" }}>Ideal</th>
                    <th style={{ width: "90px", textAlign: "right" }}>Sugestão Compra</th>
                    <th>Localização</th>
                  </tr>
                </thead>
                <tbody>
                  {report.data.allItems.map((item: any) => (
                    <tr key={item.id}>
                      <td><strong>{item.name}</strong></td>
                      <td style={{ fontFamily: "monospace", color: "#475569" }}>{item.sku}</td>
                      <td style={{ color: "#475569" }}>{item.category}</td>
                      <td style={{ textAlign: "right", fontWeight: 800, fontFamily: "monospace" }}>
                        <span className={item.status === "CRITICAL" ? "tag-pill tag-red" : item.status === "LOW" ? "tag-pill tag-amber" : ""}>
                          {item.currentStock} {item.unit}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "monospace", color: "#475569" }}>{item.minStock}</td>
                      <td style={{ textAlign: "right", fontFamily: "monospace", color: "#475569" }}>{item.idealStock}</td>
                      <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 800 }}>
                        {item.suggestedPurchase > 0 ? (
                          <span className="tag-pill tag-green">+{item.suggestedPurchase} {item.unit}</span>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>-</span>
                        )}
                      </td>
                      <td style={{ fontSize: "8px", color: "#475569" }}>{item.boxes || "Sem caixa"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 3. Empréstimos */}
          {report.reportType === "LOANS" && (
            <div className="door-section">
              <div className="door-header">
                <span>Histórico e Cautelas de Empréstimo</span>
                <span>{report.data.length} Registros</span>
              </div>
              <table className="report-table">
                <thead>
                  <tr>
                    <th style={{ width: "80px" }}>Protocolo</th>
                    <th>Solicitante & Contato</th>
                    <th>Equipamento</th>
                    <th style={{ width: "70px" }}>Patrimônio</th>
                    <th style={{ width: "85px" }}>Devolução</th>
                    <th style={{ width: "75px" }}>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {report.data.map((l: any) => (
                    <tr key={l.id}>
                      <td style={{ fontFamily: "monospace", fontWeight: 800 }}>{l.protocol}</td>
                      <td>
                        <strong>{l.borrowerName}</strong>
                        <span style={{ fontSize: "8px", color: "#64748b", display: "block" }}>{l.borrowerContact || "-"}</span>
                      </td>
                      <td>{l.asset?.item?.name || "-"}</td>
                      <td style={{ fontFamily: "monospace" }}>#{l.asset?.assetTag || "-"}</td>
                      <td style={{ fontSize: "8.5px" }}>{formatDate(l.expectedReturnDate)}</td>
                      <td>
                        <span className={`tag-pill ${l.status === "ACTIVE" ? "tag-amber" : l.status === "RETURNED" ? "tag-green" : "tag-red"}`}>
                          {l.status === "ACTIVE" ? "Ativo" : l.status === "RETURNED" ? "Devolvido" : "Atrasado"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 4. Manutenção */}
          {report.reportType === "MAINTENANCE" && (
            <div className="door-section">
              <div className="door-header">
                <span>Ordens de Serviço & Manutenções</span>
                <span>{report.data.length} Chamados</span>
              </div>
              <table className="report-table">
                <thead>
                  <tr>
                    <th style={{ width: "75px" }}>Nº OS</th>
                    <th>Equipamento / Tag</th>
                    <th>Defeito Relatado</th>
                    <th>Prestador</th>
                    <th style={{ width: "75px" }}>Status</th>
                    <th style={{ width: "65px", textAlign: "right" }}>Custo (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {report.data.map((m: any) => (
                    <tr key={m.id}>
                      <td style={{ fontFamily: "monospace", fontWeight: 800 }}>{m.orderNumber || `#${m.id.slice(-6)}`}</td>
                      <td>
                        <strong>{m.asset?.item?.name}</strong>
                        <span style={{ fontFamily: "monospace", fontSize: "8px", color: "#64748b", display: "block" }}>
                          Tag #{m.asset?.assetTag}
                        </span>
                      </td>
                      <td style={{ fontSize: "8.5px" }}>{m.description}</td>
                      <td style={{ fontSize: "8.5px" }}>{m.serviceProvider || "Interno"}</td>
                      <td>
                        <span className={`tag-pill ${m.status === "COMPLETED" ? "tag-green" : "tag-amber"}`}>
                          {m.status === "COMPLETED" ? "Concluído" : "Em Andamento"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 800 }}>
                        {m.cost ? formatCurrency(Number(m.cost)) : "R$ 0,00"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 5. Movimentações */}
          {report.reportType === "MOVEMENTS" && (
            <div className="door-section">
              <div className="door-header">
                <span>Registro de Entradas, Saídas e Transferências</span>
                <span>{report.data.length} Movimentos</span>
              </div>
              <table className="report-table">
                <thead>
                  <tr>
                    <th style={{ width: "85px" }}>Data/Hora</th>
                    <th style={{ width: "65px" }}>Tipo</th>
                    <th>Item / Material</th>
                    <th style={{ width: "65px", textAlign: "right" }}>Qtd</th>
                    <th style={{ width: "100px" }}>Origem ➔ Destino</th>
                    <th style={{ width: "80px" }}>Operador</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {report.data.map((mov: any) => (
                    <tr key={mov.id}>
                      <td style={{ fontFamily: "monospace", fontSize: "8px" }}>{formatDateTime(mov.createdAt)}</td>
                      <td>
                        <span className={`tag-pill ${mov.type === "ENTRY" ? "tag-green" : mov.type === "EXIT" ? "tag-red" : "tag-amber"}`}>
                          {mov.type === "ENTRY" ? "Entrada" : mov.type === "EXIT" ? "Saída" : "Transf."}
                        </span>
                      </td>
                      <td><strong>{mov.item?.name}</strong></td>
                      <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 800 }}>{mov.quantity} {mov.item?.unit}</td>
                      <td style={{ fontFamily: "monospace", fontSize: "8px" }}>
                        {mov.sourceBox?.code ? `${mov.sourceBox.code} ➔ ` : ""}
                        {mov.destBox?.code ? mov.destBox.code : "-"}
                      </td>
                      <td style={{ fontSize: "8.5px" }}>{mov.user?.name || "Sistema"}</td>
                      <td style={{ fontSize: "8px", color: "#64748b" }}>{mov.observation || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ASSINATURAS FORMAIS */}
          <div className="signature-container">
            <div className="signature-box">
              <div className="signature-line">
                <p className="signature-name">{operatorName}</p>
                <p className="signature-role">Responsável pela Emissão do Relatório</p>
                <p className="signature-inst">UniFAP - Setor de TI & Multimídia</p>
              </div>
            </div>
            <div className="signature-box">
              <div className="signature-line">
                <p className="signature-name">Gerência de TI & Operações</p>
                <p className="signature-role">Validação e Homologação</p>
                <p className="signature-inst">Centro Universitário Paraíso • UniFAP</p>
              </div>
            </div>
          </div>

          {/* Rodapé Institucional */}
          <div className="footer-info">
            <p>Documento oficial emitido eletronicamente pelo Sistema Integrado de Gestão de Estoque & Patrimônio UniFAP.</p>
            <p>Registro auditável com integridade de dados e rastreabilidade institucional • Juazeiro do Norte - CE.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
