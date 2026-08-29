"use client";

import React, { useState, useEffect } from "react";
import { 
  FileSpreadsheet, 
  FileText, 
  Printer, 
  ClipboardCheck, 
  Boxes, 
  AlertTriangle, 
  Handshake, 
  Wrench, 
  History, 
  Filter, 
  RefreshCw, 
  Sparkles
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useSession } from "next-auth/react";
import { Role } from "@prisma/client";
import { ReportPrintableDocument } from "@/components/reports/report-printable-document";
import { InventoryAuditModal } from "@/components/reports/inventory-audit-modal";
import { EventReportsView } from "@/components/reports/event-reports-view";
import { formatDateTime, formatDate, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

type ReportType = "INVENTORY" | "CRITICAL_STOCK" | "LOANS" | "MAINTENANCE" | "MOVEMENTS";

export default function RelatoriosPage() {
  const { data: session } = useSession();
  const userRole = (session?.user?.role || Role.OPERADOR) as Role;
  const isEventosRole = userRole === Role.EVENTOS;
  const [activeModuleTab, setActiveModuleTab] = useState<"STOCK" | "EVENTS">(
    isEventosRole ? "EVENTS" : "STOCK"
  );

  useEffect(() => {
    if (isEventosRole) {
      setActiveModuleTab("EVENTS");
    }
  }, [isEventosRole]);

  const [selectedReportType, setSelectedReportType] = useState<ReportType>("INVENTORY");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reportData, setReportData] = useState<any | null>(null);

  // Modais
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  const fetchReport = async () => {
    try {
      const params = new URLSearchParams();
      params.append("type", selectedReportType);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await fetch(`/api/v1/reports?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setReportData(json);
      } else {
        toast.error(json.error || "Erro ao gerar relatório.");
      }
    } catch (err) {
      toast.error("Erro na comunicação com o servidor.");
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedReportType, startDate, endDate]);

  // Exportar para CSV / Excel
  const handleExportCSV = () => {
    if (!reportData || !reportData.data) {
      toast.error("Nenhum dado disponível para exportar.");
      return;
    }

    try {
      let headers: string[] = [];
      let rows: string[] = [];
      const today = new Date().toISOString().slice(0, 10);
      let filename = `relatorio-unifap-${selectedReportType.toLowerCase()}-${today}.csv`;

      if (reportData.reportType === "INVENTORY" && Array.isArray(reportData.data)) {
        headers = ["Porta", "Código Caixa", "Nome Caixa", "Patrimônios Armazenados", "Materiais e Insumos"];
        reportData.data.forEach((door: any) => {
          door.boxes?.forEach((box: any) => {
            const assetsList = box.assets?.map((a: any) => `#${a.assetTag} (${a.item?.name})`).join(" | ");
            const invList = box.inventories?.map((i: any) => `${i.item?.name}: ${i.quantity} ${i.item?.unit}`).join(" | ");
            rows.push([
              `"${door.name}"`,
              `"${box.code}"`,
              `"${box.name}"`,
              `"${assetsList || "Vazia"}"`,
              `"${invList || "Nenhum"}"`
            ].join(";"));
          });
        });
      } else if (reportData.reportType === "CRITICAL_STOCK" && Array.isArray(reportData.data?.allItems)) {
        headers = ["Item / Material", "SKU", "Categoria", "Saldo Atual", "Estoque Mínimo", "Estoque Ideal", "Sugestão de Compra", "Localização Armário"];
        reportData.data.allItems.forEach((item: any) => {
          rows.push([
            `"${item.name}"`,
            `"${item.sku}"`,
            `"${item.category}"`,
            item.currentStock,
            item.minStock,
            item.idealStock,
            item.suggestedPurchase,
            `"${item.boxes || "-"}"`
          ].join(";"));
        });
      } else if (reportData.reportType === "LOANS" && Array.isArray(reportData.data)) {
        headers = ["Protocolo", "Solicitante", "Equipamento", "Patrimônio", "Destino", "Data Retirada", "Data Prevista", "Status"];
        reportData.data.forEach((loan: any) => {
          rows.push([
            `"LOAN-${loan.id.slice(-8).toUpperCase()}"`,
            `"${loan.borrowerName}"`,
            `"${loan.asset?.item?.name}"`,
            `"${loan.asset?.assetTag}"`,
            `"${loan.destination}"`,
            `"${formatDate(loan.loanDate)}"`,
            `"${formatDate(loan.expectedReturnDate)}"`,
            `"${loan.status}"`
          ].join(";"));
        });
      } else if (reportData.reportType === "MAINTENANCE" && Array.isArray(reportData.data)) {
        headers = ["Nº Ordem de Serviço", "Equipamento", "Patrimônio", "Defeito", "Prestador", "Peças Substituídas", "Status", "Custo (R$)"];
        reportData.data.forEach((m: any) => {
          rows.push([
            `"${m.orderNumber || m.id}"`,
            `"${m.asset?.item?.name}"`,
            `"${m.asset?.assetTag}"`,
            `"${m.issueDescription}"`,
            `"${m.serviceProvider || "Interno"}"`,
            `"${m.replacedParts || "-"}"`,
            `"${m.status}"`,
            m.cost ? Number(m.cost).toFixed(2) : "0.00"
          ].join(";"));
        });
      } else if (reportData.reportType === "MOVEMENTS" && Array.isArray(reportData.data)) {
        headers = ["Data/Hora", "Tipo", "Item", "Quantidade", "Origem", "Destino", "Operador", "Justificativa"];
        reportData.data.forEach((mov: any) => {
          rows.push([
            `"${formatDateTime(mov.createdAt)}"`,
            `"${mov.type}"`,
            `"${mov.item?.name}"`,
            mov.quantity,
            `"${mov.sourceBox?.code || "-"}"`,
            `"${mov.destBox?.code || "-"}"`,
            `"${mov.user?.name || "Sistema"}"`,
            `"${mov.observation || "-"}"`
          ].join(";"));
        });
      }

      const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Relatório CSV (Excel) baixado com sucesso!");
    } catch (e) {
      toast.error("Erro ao exportar CSV.");
    }
  };

  const reportOptions = [
    {
      id: "INVENTORY",
      title: "Inventário Físico do Armário",
      description: "Mapeamento completo de portas, caixas, patrimônios e materiais.",
      icon: Boxes,
      badge: "Armário",
      color: "text-blue-500",
    },
    {
      id: "CRITICAL_STOCK",
      title: "Estoque Crítico & Sugestão de Compra",
      description: "Itens zerados ou abaixo do mínimo com cálculo de reposição ideal.",
      icon: AlertTriangle,
      badge: "Compras",
      color: "text-rose-500",
    },
    {
      id: "LOANS",
      title: "Empréstimos, Devoluções & Atrasos",
      description: "Rastreio por solicitante, taxa de pontualidade e avarias.",
      icon: Handshake,
      badge: "Circulação",
      color: "text-purple-500",
    },
    {
      id: "MAINTENANCE",
      title: "Custos & Laudos de Manutenção",
      description: "Gastos acumulados, horímetro de projetores e peças trocadas.",
      icon: Wrench,
      badge: "Técnico",
      color: "text-amber-500",
    },
    {
      id: "MOVEMENTS",
      title: "Extrato de Movimentações",
      description: "Trilha cronológica inalterável de entradas, saídas e transferências.",
      icon: History,
      badge: "Auditoria",
      color: "text-emerald-500",
    },
  ];

  if (isEventosRole || activeModuleTab === "EVENTS") {
    return (
      <div className="space-y-6 animate-in fade-in-50 duration-300 pb-12">
        {!isEventosRole && (
          <div className="flex items-center gap-2 border-b border-border/80 pb-3">
            <button
              type="button"
              onClick={() => setActiveModuleTab("STOCK")}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer"
            >
              📦 Módulo Estoque & Patrimônio
            </button>
            <button
              type="button"
              onClick={() => setActiveModuleTab("EVENTS")}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary shadow-xs transition-colors cursor-pointer"
            >
              🎉 Módulo Eventos Acadêmicos
            </button>
          </div>
        )}
        <EventReportsView />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300 pb-12">
      {!isEventosRole && (
        <div className="flex items-center gap-2 border-b border-border/80 pb-3">
          <button
            type="button"
            onClick={() => setActiveModuleTab("STOCK")}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary shadow-xs transition-colors cursor-pointer"
          >
            📦 Módulo Estoque & Patrimônio
          </button>
          <button
            type="button"
            onClick={() => setActiveModuleTab("EVENTS")}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer"
          >
            🎉 Módulo Eventos Acadêmicos
          </button>
        </div>
      )}
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-primary/15 via-indigo-600/10 to-transparent border border-primary/20 backdrop-blur-md shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Gestão Analítica • UniFAP
            </span>
            <Badge variant="normal" className="text-xs">
              FASE 10 Ativa
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Relatórios & Auditoria de Estoque
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
            Geração de relatórios executivos multidimensionais, inventário físico periódico e exportação oficial em Excel/PDF.
          </p>
        </div>

        {/* Ações Rápidas */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => setIsAuditModalOpen(true)}
            size="sm"
            className="rounded-xl text-xs h-9 bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20 gap-1.5"
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Auditoria de Caixa</span>
          </Button>

          <Button
            onClick={handleExportCSV}
            variant="outline"
            size="sm"
            className="rounded-xl text-xs h-9 gap-1.5 shadow-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel / CSV</span>
          </Button>

          <Button
            onClick={() => setIsPrintModalOpen(true)}
            variant="outline"
            size="sm"
            className="rounded-xl text-xs h-9 gap-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir PDF (A4)</span>
          </Button>
        </div>
      </div>

      {/* 5 Tipos de Relatórios (Cards Selecionáveis) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {reportOptions.map((opt) => {
          const Icon = opt.icon;
          const isSelected = selectedReportType === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setSelectedReportType(opt.id as ReportType)}
              className={`text-left p-4 rounded-3xl border transition-all space-y-2 flex flex-col justify-between ${
                isSelected
                  ? "bg-card border-primary ring-2 ring-primary/30 shadow-md shadow-primary/10"
                  : "bg-card/60 border-border/80 hover:border-border hover:bg-card/90"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-accent ${opt.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <Badge variant={isSelected ? "default" : "outline"} className="text-[9px]">
                  {opt.badge}
                </Badge>
              </div>

              <div>
                <h3 className={`text-xs font-bold ${isSelected ? "text-primary" : "text-foreground"}`}>
                  {opt.title}
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                  {opt.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Barra de Filtros e Busca Temporal */}
      <Card className="rounded-2xl border-border/80">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <Filter className="w-4 h-4 text-primary" />
            <span>Filtro de Período do Relatório:</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 px-3 rounded-xl text-xs bg-background w-36 shadow-xs"
              title="Data inicial"
            />
            <span className="text-xs text-muted-foreground">até</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 px-3 rounded-xl text-xs bg-background w-36 shadow-xs"
              title="Data final"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={fetchReport}
              className="h-9 rounded-xl text-xs gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Aplicar</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pré-visualização Interativa do Relatório Selecionado */}
      {reportData && (
        <Card className="rounded-3xl border-border/80 overflow-hidden shadow-sm">
          <CardHeader className="pb-4 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <span>{reportData.title}</span>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Emitido em: {formatDateTime(reportData.generatedAt)}
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleExportCSV}
                className="h-8 rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Exportar CSV</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setIsPrintModalOpen(true)}
                className="h-8 rounded-xl text-xs bg-primary text-primary-foreground font-semibold gap-1.5 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir A4</span>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            
            {/* 1. KPIs do Relatório */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {reportData.reportType === "INVENTORY" && reportData.summary && (
                <>
                  <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 text-center">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Portas Ativas</span>
                    <p className="text-xl font-extrabold text-foreground mt-0.5">{reportData.summary.totalDoors || 0}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 text-center">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Caixas Físicas</span>
                    <p className="text-xl font-extrabold text-foreground mt-0.5">{reportData.summary.totalBoxes || 0}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 text-center">
                    <span className="text-[10px] font-bold uppercase text-primary">Patrimônios Guardados</span>
                    <p className="text-xl font-extrabold text-foreground mt-0.5">{reportData.summary.totalAssetsCount || 0}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 text-center">
                    <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Total Unidades Material</span>
                    <p className="text-xl font-extrabold text-foreground mt-0.5">{reportData.summary.totalMaterialsUnits || 0}</p>
                  </div>
                </>
              )}

              {reportData.reportType === "CRITICAL_STOCK" && reportData.summary && (
                <>
                  <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 text-center">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Itens no Catálogo</span>
                    <p className="text-xl font-extrabold text-foreground mt-0.5">{reportData.summary.totalCatalogItems || 0}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center">
                    <span className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400">Estoque Crítico</span>
                    <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">{reportData.summary.criticalCount || 0}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center">
                    <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">Estoque Baixo</span>
                    <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">{reportData.summary.lowCount || 0}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                    <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Unidades p/ Reposição</span>
                    <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">+{reportData.summary.totalUnitsNeeded || 0}</p>
                  </div>
                </>
              )}

              {reportData.reportType === "LOANS" && reportData.summary && (
                <>
                  <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 text-center">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Total Empréstimos</span>
                    <p className="text-xl font-extrabold text-foreground mt-0.5">{reportData.summary.totalLoans || 0}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 text-center">
                    <span className="text-[10px] font-bold uppercase text-purple-600 dark:text-purple-400">Ativos em Uso</span>
                    <p className="text-xl font-extrabold text-foreground mt-0.5">{reportData.summary.activeCount || 0}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                    <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Taxa Pontualidade</span>
                    <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{reportData.summary.punctualityRate || 0}%</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center">
                    <span className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400">Devoluções c/ Avaria</span>
                    <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">{reportData.summary.returnedDamaged || 0}</p>
                  </div>
                </>
              )}

              {reportData.reportType === "MAINTENANCE" && reportData.summary && (
                <>
                  <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 text-center">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Total Chamados</span>
                    <p className="text-xl font-extrabold text-foreground mt-0.5">{reportData.summary.totalOrders || 0}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                    <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Concluídos</span>
                    <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{reportData.summary.completedCount || 0}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-center">
                    <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400">Lâmpadas Trocadas</span>
                    <p className="text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">{reportData.summary.totalLampsReplaced || 0}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center">
                    <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">Custo Total (R$)</span>
                    <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">{formatCurrency(reportData.summary.totalCost || 0)}</p>
                  </div>
                </>
              )}

              {reportData.reportType === "MOVEMENTS" && reportData.summary && (
                <>
                  <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 text-center">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Movimentações</span>
                    <p className="text-xl font-extrabold text-foreground mt-0.5">{reportData.summary.totalMovements || 0}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                    <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Entradas (Qtd)</span>
                    <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">+{reportData.summary.totalEntriesQty || 0}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center">
                    <span className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400">Saídas / Baixas (Qtd)</span>
                    <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">-{reportData.summary.totalExitsQty || 0}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-center">
                    <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400">Transferências</span>
                    <p className="text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">{reportData.summary.totalTransfersQty || 0}</p>
                  </div>
                </>
              )}
            </div>

            {/* 2. Tabela com Dados do Relatório */}
            <div className="border border-border/80 rounded-2xl">
              <Table className="min-w-[900px]">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    {reportData.reportType === "INVENTORY" && (
                      <>
                        <TableHead className="text-xs font-bold">Porta & Caixa</TableHead>
                        <TableHead className="text-xs font-bold">Identificação</TableHead>
                        <TableHead className="text-xs font-bold">Patrimônios Armazenados</TableHead>
                        <TableHead className="text-xs font-bold">Materiais e Insumos</TableHead>
                      </>
                    )}
                    {reportData.reportType === "CRITICAL_STOCK" && (
                      <>
                        <TableHead className="text-xs font-bold">Item / Material</TableHead>
                        <TableHead className="text-xs font-bold">SKU</TableHead>
                        <TableHead className="text-xs font-bold">Categoria</TableHead>
                        <TableHead className="text-xs font-bold text-right">Saldo</TableHead>
                        <TableHead className="text-xs font-bold text-right">Mínimo</TableHead>
                        <TableHead className="text-xs font-bold text-right">Ideal</TableHead>
                        <TableHead className="text-xs font-bold text-right">Sugestão Compra</TableHead>
                      </>
                    )}
                    {reportData.reportType === "LOANS" && (
                      <>
                        <TableHead className="text-xs font-bold">Protocolo</TableHead>
                        <TableHead className="text-xs font-bold">Solicitante</TableHead>
                        <TableHead className="text-xs font-bold">Equipamento</TableHead>
                        <TableHead className="text-xs font-bold">Patrimônio</TableHead>
                        <TableHead className="text-xs font-bold">Devolução Prevista</TableHead>
                        <TableHead className="text-xs font-bold">Status</TableHead>
                      </>
                    )}
                    {reportData.reportType === "MAINTENANCE" && (
                      <>
                        <TableHead className="text-xs font-bold">Nº OS</TableHead>
                        <TableHead className="text-xs font-bold">Equipamento</TableHead>
                        <TableHead className="text-xs font-bold">Defeito</TableHead>
                        <TableHead className="text-xs font-bold">Prestador</TableHead>
                        <TableHead className="text-xs font-bold">Status</TableHead>
                        <TableHead className="text-xs font-bold text-right">Custo (R$)</TableHead>
                      </>
                    )}
                    {reportData.reportType === "MOVEMENTS" && (
                      <>
                        <TableHead className="text-xs font-bold">Data/Hora</TableHead>
                        <TableHead className="text-xs font-bold">Tipo</TableHead>
                        <TableHead className="text-xs font-bold">Item</TableHead>
                        <TableHead className="text-xs font-bold text-right">Quantidade</TableHead>
                        <TableHead className="text-xs font-bold">Origem ➔ Destino</TableHead>
                        <TableHead className="text-xs font-bold">Operador</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.reportType === "INVENTORY" && Array.isArray(reportData.data) && reportData.data.map((door: any) =>
                    door.boxes?.map((box: any) => (
                      <TableRow key={box.id} className="hover:bg-muted/20">
                        <TableCell className="font-mono text-xs font-bold text-primary">
                          {door.name} / {box.code}
                        </TableCell>
                        <TableCell className="text-xs font-semibold">
                          {box.name}
                        </TableCell>
                        <TableCell className="text-xs">
                          {box.assets?.length === 0 ? (
                            <span className="text-muted-foreground italic text-[11px]">Nenhum patrimônio</span>
                          ) : (
                            box.assets?.map((a: any) => (
                              <span key={a.id} className="inline-block bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono text-[10px] mr-1 mb-1">
                                #{a.assetTag}
                              </span>
                            ))
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {box.inventories?.length === 0 ? (
                            <span className="text-muted-foreground italic text-[11px]">Nenhum material</span>
                          ) : (
                            box.inventories?.map((inv: any) => (
                              <span key={inv.id} className="block text-[11px] text-muted-foreground">
                                {inv.item?.name}: <strong className="text-foreground font-mono">{inv.quantity} {inv.item?.unit}</strong>
                              </span>
                            ))
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}

                  {reportData.reportType === "CRITICAL_STOCK" && Array.isArray(reportData.data?.allItems) && reportData.data.allItems.map((item: any) => (
                    <TableRow key={item.id} className="hover:bg-muted/20">
                      <TableCell className="text-xs font-bold">{item.name}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{item.sku}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{item.category}</TableCell>
                      <TableCell className={`text-xs font-bold font-mono text-right ${item.status === "CRITICAL" ? "text-rose-500" : item.status === "LOW" ? "text-amber-500" : ""}`}>
                        {item.currentStock} {item.unit}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-right text-muted-foreground">{item.minStock}</TableCell>
                      <TableCell className="text-xs font-mono text-right text-muted-foreground">{item.idealStock}</TableCell>
                      <TableCell className="text-xs font-mono font-bold text-right text-emerald-600 dark:text-emerald-400">
                        +{item.suggestedPurchase} {item.unit}
                      </TableCell>
                    </TableRow>
                  ))}

                  {reportData.reportType === "LOANS" && Array.isArray(reportData.data) && reportData.data.map((loan: any) => (
                    <TableRow key={loan.id} className="hover:bg-muted/20">
                      <TableCell className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">LOAN-{loan.id.slice(-8).toUpperCase()}</TableCell>
                      <TableCell className="text-xs font-semibold">{loan.borrowerName}</TableCell>
                      <TableCell className="text-xs">{loan.asset?.item?.name}</TableCell>
                      <TableCell className="text-xs font-mono">#{loan.asset?.assetTag}</TableCell>
                      <TableCell className="text-xs font-medium">{formatDate(loan.expectedReturnDate)}</TableCell>
                      <TableCell className="text-xs"><Badge variant={loan.status === "ACTIVE" ? "loaned" : "available"} className="text-[9px]">{loan.status}</Badge></TableCell>
                    </TableRow>
                  ))}

                  {reportData.reportType === "MAINTENANCE" && Array.isArray(reportData.data) && reportData.data.map((m: any) => (
                    <TableRow key={m.id} className="hover:bg-muted/20">
                      <TableCell className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">{m.orderNumber || m.id.slice(0, 8)}</TableCell>
                      <TableCell className="text-xs font-semibold">{m.asset?.item?.name} (#{m.asset?.assetTag})</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{m.issueDescription}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{m.serviceProvider || "Laboratório"}</TableCell>
                      <TableCell className="text-xs"><Badge variant="maintenance" className="text-[9px]">{m.status}</Badge></TableCell>
                      <TableCell className="text-xs font-mono font-bold text-right">{m.cost ? formatCurrency(Number(m.cost)) : "-"}</TableCell>
                    </TableRow>
                  ))}

                  {reportData.reportType === "MOVEMENTS" && Array.isArray(reportData.data) && reportData.data.map((mov: any) => (
                    <TableRow key={mov.id} className="hover:bg-muted/20">
                      <TableCell className="text-xs font-mono text-muted-foreground">{formatDateTime(mov.createdAt)}</TableCell>
                      <TableCell className="text-xs font-bold">{mov.type}</TableCell>
                      <TableCell className="text-xs font-semibold">{mov.item?.name}</TableCell>
                      <TableCell className="text-xs font-mono font-bold text-right">{mov.quantity} {mov.item?.unit}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{mov.sourceBox?.code || "-"} ➔ {mov.destBox?.code || "-"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{mov.user?.name || "Sistema"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

          </CardContent>
        </Card>
      )}

      {/* Modal de Impressão A4 Oficial */}
      <ReportPrintableDocument
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        report={reportData}
      />

      {/* Modal de Auditoria e Checklist de Caixa */}
      <InventoryAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
      />

    </div>
  );
}
