"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { 
  Package, 
  Monitor, 
  Handshake, 
  AlertTriangle, 
  RefreshCw, 
  ChevronRight,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Wrench,
  TrendingUp,
  Activity,
  Boxes,
  MessageSquare,
  Calendar,
  Camera
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { LoanWhatsAppModal } from "@/components/loans/loan-whatsapp-modal";
import { AcademicSupportDashboard } from "@/components/dashboard/academic-support-dashboard";
import { EventsDedicatedDashboard } from "@/components/dashboard/events-dedicated-dashboard";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { formatDateTime, formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const { data: session } = useSession();
  const userName = session?.user?.name || "Rivaldo";
  const userRole = session?.user?.role || "ADMIN";

  const [summary, setSummary] = useState<any>(null);
  const [activeLoans, setActiveLoans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal de Cobrança / Notificação via WhatsApp
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [selectedLoanForWhatsApp, setSelectedLoanForWhatsApp] = useState<any | null>(null);

  const handleOpenWhatsAppModal = (loan: any) => {
    setSelectedLoanForWhatsApp(loan);
    setWhatsappModalOpen(true);
  };

  const fetchDashboardData = async (isInitial: boolean | unknown = false) => {
    try {
      if (isInitial === true) setIsLoading(true);
      const [summaryRes, activeLoansRes] = await Promise.all([
        fetch("/api/v1/dashboard/summary"),
        fetch("/api/v1/loans?status=ACTIVE"),
      ]);

      const summaryData = await summaryRes.json();
      const activeLoansData = await activeLoansRes.json();

      if (summaryData.success) setSummary(summaryData.data);
      if (activeLoansData.success) setActiveLoans(activeLoansData.data);
    } catch (err) {
      console.error("Erro ao carregar dados do dashboard:", err);
    } finally {
      if (isInitial === true) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userRole !== "ACADEMIC_SUPPORT" && userRole !== "EVENTOS") {
      fetchDashboardData(true);
    }
  }, [userRole]);

  // Sincronização automática em segundo plano a cada 12s
  useAutoRefresh(() => fetchDashboardData(false), {
    intervalMs: 12000,
    enabled: !whatsappModalOpen && userRole !== "ACADEMIC_SUPPORT" && userRole !== "EVENTOS",
  });

  // Se o perfil for Apoio Acadêmico, renderiza o painel focado e simplificado para o solicitante
  if (userRole === "ACADEMIC_SUPPORT") {
    return <AcademicSupportDashboard userName={userName} userRole={userRole} />;
  }

  // Se o perfil for Eventos, renderiza o painel focado na operação de eventos e sorteios
  if (userRole === "EVENTOS") {
    return <EventsDedicatedDashboard userName={userName} userRole={userRole} />;
  }

  const getRoleVariant = (role: string) => {
    switch (role) {
      case "ADMIN": return "admin";
      case "GESTOR": return "gestor";
      case "OPERADOR": return "operador";
      default: return "consulta";
    }
  };

  const stock = summary?.stock || { totalCatalogItems: 0, totalUnits: 0, criticalCount: 0, lowCount: 0, normalCount: 0 };
  const assets = summary?.assets || { total: 0, available: 0, loaned: 0, maintenance: 0, damaged: 0, availabilityRate: 100 };
  const loans = summary?.loans || { activeCount: 0, overdueCount: 0, monthLoansCount: 0 };
  const maintenance = summary?.maintenance || { openCount: 0, avgDays: "0", criticalCount: 0 };
  const alerts = summary?.alerts || { overdueLoans: [], criticalStock: [], criticalMaintenance: [], totalAlerts: 0 };
  const timeline = summary?.timeline || [];

  return (
    <div className="space-y-8 pb-28 sm:pb-16 animate-in fade-in-50 duration-300">
      
      {/* 1. Header & Welcome Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 p-5 sm:p-6 lg:p-7 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-primary/15 via-indigo-600/10 to-transparent border border-primary/20 backdrop-blur-md shadow-xs">
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              Painel Operacional • TI UniFAP
            </span>
            <Badge variant={getRoleVariant(userRole)} className="text-xs font-semibold px-2">
              {userRole === "CONSULTA" ? "CONSULTA / AUDITORIA" : userRole}
            </Badge>
            {userRole === "CONSULTA" && (
              <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30">
                Somente Leitura
              </Badge>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Olá, {userName.split(" ")[0]}!
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
            {userRole === "CONSULTA"
              ? "Painel de consulta e auditoria em tempo real do armário físico, materiais, patrimônios, empréstimos e chamados técnicos."
              : "Visão unificada em tempo real do armário físico, materiais de estoque, patrimônios, empréstimos e chamados técnicos."}
          </p>
        </div>

        {/* Quick Action Shortcuts */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-primary/20">
          <Button
            asChild
            size="sm"
            className="rounded-xl text-xs sm:text-xs h-11 sm:h-9 bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 gap-1.5 justify-center active:scale-95 transition-all"
          >
            <Link href="/scanner">
              <Camera className="w-4 h-4 shrink-0" />
              <span className="truncate">Scanner QR</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl text-xs sm:text-xs h-11 sm:h-9 gap-1.5 shadow-xs justify-center bg-card hover:bg-accent font-semibold active:scale-95 transition-all"
          >
            <Link href="/agenda">
              <Calendar className="w-4 h-4 text-primary shrink-0" />
              <span className="truncate">Agenda Turnos</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl text-xs sm:text-xs h-11 sm:h-9 gap-1.5 shadow-xs justify-center bg-card hover:bg-accent font-semibold active:scale-95 transition-all"
          >
            <Link href="/emprestimos">
              <Handshake className="w-4 h-4 text-purple-500 shrink-0" />
              <span className="truncate">Empréstimos</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl text-xs sm:text-xs h-11 sm:h-9 gap-1.5 shadow-xs justify-center bg-card hover:bg-accent font-semibold active:scale-95 transition-all"
          >
            <Link href="/manutencao">
              <Wrench className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="truncate">{userRole === "CONSULTA" ? "Manutenções" : "Abrir OS"}</span>
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            className="rounded-xl text-xs h-11 sm:h-9 gap-1.5 sm:w-9 sm:p-0 text-muted-foreground hover:text-foreground justify-center bg-card hover:bg-accent active:scale-95 transition-all col-span-2 sm:col-span-1"
            title="Atualizar dados"
          >
            <RefreshCw className="w-4 h-4 shrink-0" />
            <span className="sm:hidden text-xs">Atualizar</span>
          </Button>
        </div>
      </div>

      {/* 2. Bloco ATENÇÃO AGORA (O Que Resolver Hoje?) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold text-xs">
              ⚡
            </div>
            <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground">
              Atenção Agora • Ações Prioritárias
            </h2>
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            Responda às demandas imediatas do setor
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          
          {/* Card Ação 1: Empréstimos em Atraso */}
          <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
            loans.overdueCount > 0 
              ? "bg-rose-500/10 border-rose-500/30 hover:border-rose-500/50 shadow-xs" 
              : "bg-card border-border/80 text-muted-foreground"
          }`}>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Empréstimos
                </span>
                <Badge variant={loans.overdueCount > 0 ? "destructive" : "outline"} className="text-xs font-bold px-2 py-0.5">
                  {loans.overdueCount} em atraso
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                {loans.overdueCount > 0 
                  ? "Itens que já ultrapassaram o horário limite de devolução."
                  : "Todos os empréstimos ativos estão dentro do prazo estipulado."}
              </p>
            </div>
            <div className="pt-3">
              <Button
                asChild
                size="sm"
                variant={loans.overdueCount > 0 ? "default" : "outline"}
                className={`w-full h-8 text-xs font-bold rounded-xl justify-between ${
                  loans.overdueCount > 0 ? "bg-rose-600 hover:bg-rose-700 text-white" : ""
                }`}
              >
                <Link href="/emprestimos">
                  <span>
                    {userRole === "CONSULTA"
                      ? "Consultar Empréstimos"
                      : loans.overdueCount > 0
                      ? "Resolver Devoluções"
                      : "Ver Empréstimos"}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Card Ação 2: Estoque Crítico */}
          <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
            stock.criticalCount > 0 
              ? "bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50 shadow-xs" 
              : "bg-card border-border/80 text-muted-foreground"
          }`}>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" />
                  Estoque Crítico
                </span>
                <Badge variant={stock.criticalCount > 0 ? "low" : "outline"} className="text-xs font-bold px-2 py-0.5">
                  {stock.criticalCount} itens zerados
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                {stock.criticalCount > 0
                  ? "Insumos com saldo abaixo da quantidade mínima necessária."
                  : "Níveis de estoque normais no armário físico."}
              </p>
            </div>
            <div className="pt-3">
              <Button
                asChild
                size="sm"
                variant={stock.criticalCount > 0 ? "default" : "outline"}
                className={`w-full h-8 text-xs font-bold rounded-xl justify-between ${
                  stock.criticalCount > 0 ? "bg-amber-600 hover:bg-amber-700 text-white" : ""
                }`}
              >
                <Link href="/estoque">
                  <span>
                    {userRole === "CONSULTA"
                      ? "Consultar Catálogo"
                      : stock.criticalCount > 0
                      ? "Repor Estoque"
                      : "Ver Catálogo"}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Card Ação 3: Manutenções Abertas */}
          <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
            maintenance.openCount > 0 
              ? "bg-indigo-500/10 border-indigo-500/30 hover:border-indigo-500/50 shadow-xs" 
              : "bg-card border-border/80 text-muted-foreground"
          }`}>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5" />
                  Chamados OS
                </span>
                <Badge variant={maintenance.openCount > 0 ? "maintenance" : "outline"} className="text-xs font-bold px-2 py-0.5">
                  {maintenance.openCount} em reparo
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                {maintenance.openCount > 0
                  ? `Média de ${maintenance.avgDays} dias na bancada de diagnóstico técnico.`
                  : "Nenhum equipamento em assistência técnica."}
              </p>
            </div>
            <div className="pt-3">
              <Button
                asChild
                size="sm"
                variant="outline"
                className="w-full h-8 text-xs font-bold rounded-xl justify-between hover:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30"
              >
                <Link href="/manutencao">
                  <span>Acompanhar OS</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Card Ação 4: Operações Próximas */}
          <div className="p-4 rounded-2xl border bg-primary/10 border-primary/30 hover:border-primary/50 shadow-xs flex flex-col justify-between transition-all">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Grade de Turno
                </span>
                <Badge variant="default" className="text-xs font-bold px-2 py-0.5">
                  {summary?.todayOperations?.totalDayCount || 0} hoje
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                Preparos, entregas e recolhimentos programados para as salas de aula.
              </p>
            </div>
            <div className="pt-3">
              <Button
                asChild
                size="sm"
                className="w-full h-8 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 justify-between"
              >
                <Link href="/agenda">
                  <span>Abrir Agenda</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          </div>

        </div>
      </div>

      {/* 3. Top KPI Cards (4 Módulos Principais) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Patrimônio & Ativos */}
        <Card className="rounded-2xl border-border/80 bg-gradient-to-br from-primary/10 via-card to-card shadow-xs hover:border-primary/40 transition-all">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Monitor className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  Patrimônio
                </span>
              </div>
              <p className="text-3xl font-extrabold text-foreground">
                {assets.total} <span className="text-xs font-normal text-muted-foreground">ativos</span>
              </p>
              <div className="flex items-center gap-2 text-[11px] pt-1">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {assets.available} disponíveis
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-primary font-bold">
                  {assets.availabilityRate}% livres
                </span>
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Estoque & Insumos */}
        <Card className="rounded-2xl border-border/80 bg-gradient-to-br from-emerald-500/10 via-card to-card shadow-xs hover:border-emerald-500/40 transition-all">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Estoque Físico
                </span>
              </div>
              <p className="text-3xl font-extrabold text-foreground">
                {stock.totalUnits} <span className="text-xs font-normal text-muted-foreground">unidades</span>
              </p>
              <div className="flex items-center gap-2 text-[11px] pt-1">
                <span className="text-muted-foreground">
                  {stock.totalCatalogItems} itens no catálogo
                </span>
                {stock.criticalCount > 0 && (
                  <span className="text-rose-500 font-bold">
                    • {stock.criticalCount} críticos
                  </span>
                )}
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Boxes className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Empréstimos */}
        <Card className="rounded-2xl border-border/80 bg-gradient-to-br from-purple-500/10 via-card to-card shadow-xs hover:border-purple-500/40 transition-all">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Handshake className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                  Empréstimos
                </span>
              </div>
              <p className="text-3xl font-extrabold text-foreground">
                {loans.activeCount} <span className="text-xs font-normal text-muted-foreground">em uso</span>
              </p>
              <div className="flex items-center gap-2 text-[11px] pt-1">
                {loans.overdueCount > 0 ? (
                  <span className="text-rose-500 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {loans.overdueCount} em atraso
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    100% pontuais
                  </span>
                )}
                <span className="text-muted-foreground">• {loans.monthLoansCount} no mês</span>
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
              <Handshake className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Manutenção & Chamados */}
        <Card className="rounded-2xl border-border/80 bg-gradient-to-br from-amber-500/10 via-card to-card shadow-xs hover:border-amber-500/40 transition-all">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Manutenção
                </span>
              </div>
              <p className="text-3xl font-extrabold text-foreground">
                {maintenance.openCount} <span className="text-xs font-normal text-muted-foreground">chamados</span>
              </p>
              <div className="flex items-center gap-2 text-[11px] pt-1">
                <span className="text-muted-foreground">
                  Média: {maintenance.avgDays}d na bancada
                </span>
                {maintenance.criticalCount > 0 && (
                  <span className="text-rose-500 font-bold">
                    • {maintenance.criticalCount} críticos
                  </span>
                )}
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Activity className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Central de Alertas Críticos (Se houver atrasos ou estoques zerados) */}
      {alerts.totalAlerts > 0 && (
        <Card className="rounded-3xl border-rose-500/30 bg-rose-500/5 shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b border-rose-500/15 bg-rose-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <CardTitle className="text-sm font-bold text-rose-700 dark:text-rose-400">
                  Central de Alertas & Ações Prioritárias ({alerts.totalAlerts})
                </CardTitle>
              </div>
              <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                Itens que necessitam de atenção operacional
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              
              {/* Alertas de Empréstimo Atrasado */}
              {alerts.overdueLoans.map((loan: any) => (
                <div key={loan.id} className="p-3.5 rounded-2xl bg-card border border-rose-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="destructive" className="text-[10px]">
                      Atrasado ({loan.diffHours}h)
                    </Badge>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      #{loan.assetTag}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-xs text-foreground">{loan.borrowerName}</p>
                    <p className="text-[11px] text-muted-foreground">{loan.itemName} • Destino: {loan.destination}</p>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-muted-foreground">
                      Previsto: {formatDate(loan.expectedReturnDate)}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenWhatsAppModal(loan)}
                      className="h-7 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-500/15 px-2.5 rounded-lg gap-1.5 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Cobrar</span>
                    </Button>
                  </div>
                </div>
              ))}

              {/* Alertas de Estoque Crítico */}
              {alerts.criticalStock.map((item: any) => (
                <div key={item.id} className="p-3.5 rounded-2xl bg-card border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="low" className="text-[10px]">
                      Estoque Crítico
                    </Badge>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      SKU: {item.sku}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-xs text-foreground">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground">Saldo Atual: <strong className="text-rose-500">{item.current}</strong> (Mín: {item.min})</p>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-muted-foreground">{item.category}</span>
                    <Button asChild size="sm" variant="ghost" className="h-7 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 px-2 rounded-lg">
                      <Link href={`/estoque?search=${item.sku}`}>
                        <span>Repor</span>
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}

              {/* Alertas de OS Crítica */}
              {alerts.criticalMaintenance.map((m: any) => (
                <div key={m.id} className="p-3.5 rounded-2xl bg-card border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="maintenance" className="text-[10px]">
                      {m.daysInMaintenance}d em Reparo
                    </Badge>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {m.orderNumber}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-xs text-foreground">{m.itemName} (#{m.assetTag})</p>
                    <p className="text-[11px] text-muted-foreground truncate">{m.issueDescription}</p>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-muted-foreground">{m.serviceProvider || "Laboratório"}</span>
                    <Button asChild size="sm" variant="ghost" className="h-7 text-xs text-primary px-2 rounded-lg">
                      <Link href={`/manutencao?search=${m.orderNumber}`}>
                        <span>Ver OS</span>
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}

            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. Operações de Multimídia por Turno (O que temos que fazer hoje?) */}
      {summary?.todayOperations && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="space-y-0.5">
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Operações de Multimídia Hoje</span>
                <Badge variant="outline" className="text-xs font-mono">
                  {summary.todayOperations.totalDayCount} agendamentos
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground">
                Acompanhamento em tempo real dos preparos e entregas por turno na UniFAP
              </p>
            </div>

            <Button asChild size="sm" variant="outline" className="rounded-xl text-xs h-8 gap-1.5 shadow-xs">
              <Link href="/agenda">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>Abrir Grade da Agenda</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>

          {/* Cards dos 3 Turnos: Manhã, Tarde, Noite */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(["MORNING", "AFTERNOON", "NIGHT"] as const).map((shiftKey) => {
              const shiftData = summary.todayOperations.shifts?.[shiftKey];
              if (!shiftData) return null;

              const isCurrent = summary.todayOperations.currentShift === shiftKey;
              const stats = shiftData.stats;
              const config = shiftData.config;

              return (
                <Card
                  key={shiftKey}
                  className={`rounded-3xl border transition-all ${
                    isCurrent
                      ? "border-primary/50 bg-gradient-to-b from-primary/10 via-card to-card shadow-md shadow-primary/5 ring-1 ring-primary/30"
                      : "border-border/80 bg-card hover:border-primary/30 shadow-xs"
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{config.emoji}</span>
                        <div>
                          <CardTitle className="text-sm font-bold text-foreground">
                            {config.label}
                          </CardTitle>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {config.startTime} às {config.endTime}
                          </span>
                        </div>
                      </div>

                      {isCurrent && (
                        <Badge variant="default" className="text-[9px] font-bold px-2 py-0.5">
                          Turno Atual
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="p-2 rounded-xl bg-muted/40 border border-border/50">
                        <span className="text-[10px] text-muted-foreground block">Total</span>
                        <span className="text-base font-extrabold text-foreground">{stats.total}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-semibold">Preparados</span>
                        <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-300">{stats.preparados}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-semibold">Pendentes</span>
                        <span className="text-base font-extrabold text-amber-700 dark:text-amber-300">{stats.pendentes}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                        <span className="text-[10px] text-purple-600 dark:text-purple-400 block font-semibold">Em Aula</span>
                        <span className="text-base font-extrabold text-purple-700 dark:text-purple-300">{stats.emAtendimento}</span>
                      </div>
                    </div>

                    <Button asChild size="sm" variant="ghost" className="w-full h-7 text-xs text-primary justify-between px-2 rounded-xl hover:bg-primary/10">
                      <Link href={`/agenda?shift=${shiftKey}`}>
                        <span>Ver solicitações da {config.label.toLowerCase()}</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Grid Médio: Gráficos de Distribuição & Empréstimos Ativos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Coluna Esquerda: Status do Patrimônio & Saúde do Estoque */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Distribuição Patrimonial */}
          <Card className="rounded-3xl border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span>Distribuição Patrimonial</span>
                <span className="text-xs font-mono text-muted-foreground">{assets.total} ativos</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Status físico de todos os equipamentos tombados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Barra Progressiva Segmentada com Acessibilidade (A11y) */}
              <div 
                role="progressbar"
                aria-label="Distribuição de status dos patrimônios"
                aria-valuemin={0}
                aria-valuemax={assets.total}
                aria-valuenow={assets.available}
                aria-valuetext={`${assets.available} disponíveis de ${assets.total} total`}
                className="h-3 w-full rounded-full bg-accent overflow-hidden flex"
              >
                <div 
                  style={{ width: `${assets.total > 0 ? (assets.available / assets.total) * 100 : 0}%` }} 
                  className="bg-emerald-500 h-full transition-all duration-500" 
                  title={`Disponíveis: ${assets.available}`}
                />
                <div 
                  style={{ width: `${assets.total > 0 ? (assets.loaned / assets.total) * 100 : 0}%` }} 
                  className="bg-purple-500 h-full transition-all duration-500" 
                  title={`Emprestados: ${assets.loaned}`}
                />
                <div 
                  style={{ width: `${assets.total > 0 ? (assets.maintenance / assets.total) * 100 : 0}%` }} 
                  className="bg-amber-500 h-full transition-all duration-500" 
                  title={`Em Manutenção: ${assets.maintenance}`}
                />
                <div 
                  style={{ width: `${assets.total > 0 ? (assets.damaged / assets.total) * 100 : 0}%` }} 
                  className="bg-rose-500 h-full transition-all duration-500" 
                  title={`Danificados: ${assets.damaged}`}
                />
              </div>

              {/* Legendas Detalhadas */}
              <div className="space-y-2 text-xs pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-muted-foreground">Disponíveis no Armário</span>
                  </div>
                  <span className="font-bold text-foreground">{assets.available}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    <span className="text-muted-foreground">Emprestados / Em Uso</span>
                  </div>
                  <span className="font-bold text-foreground">{assets.loaned}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-muted-foreground">Em Manutenção Técnica</span>
                  </div>
                  <span className="font-bold text-foreground">{assets.maintenance}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="text-muted-foreground">Danificados / Avaria</span>
                  </div>
                  <span className="font-bold text-foreground">{assets.damaged}</span>
                </div>
              </div>

              <Button asChild variant="outline" size="sm" className="w-full rounded-xl text-xs mt-2">
                <Link href="/patrimonio">
                  <span>Gerenciar Patrimônio</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Saúde do Estoque */}
          <Card className="rounded-3xl border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span>Níveis de Estoque</span>
                <span className="text-xs font-mono text-muted-foreground">{stock.totalCatalogItems} itens</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Normal</span>
                  <p className="text-lg font-bold text-foreground mt-0.5">{stock.normalCount}</p>
                </div>
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">Baixo</span>
                  <p className="text-lg font-bold text-foreground mt-0.5">{stock.lowCount}</p>
                </div>
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                  <span className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400">Crítico</span>
                  <p className="text-lg font-bold text-foreground mt-0.5">{stock.criticalCount}</p>
                </div>
              </div>

              <Button asChild variant="outline" size="sm" className="w-full rounded-xl text-xs mt-1">
                <Link href="/estoque">
                  <span>Ver Catálogo de Insumos</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>

        </div>

        {/* Coluna Direita: Empréstimos Ativos & Próximas Devoluções */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="rounded-3xl border-border/80 shadow-xs overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Handshake className="w-4 h-4 text-purple-500" />
                    <span>Empréstimos Ativos no Momento</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Equipamentos atualmente em poder de solicitantes externos e professores
                  </CardDescription>
                </div>
                <Button asChild size="sm" variant="outline" className="rounded-xl text-xs h-8">
                  <Link href="/emprestimos">
                    <span>Ver Todos</span>
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-[11px] font-bold uppercase text-muted-foreground py-3 px-4">Solicitante</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase text-muted-foreground py-3 px-4">Equipamento</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase text-muted-foreground py-3 px-4">Devolução Prevista</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase text-muted-foreground py-3 px-4 text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i} className="animate-pulse">
                        <TableCell className="p-4"><div className="h-4 w-32 bg-muted rounded" /></TableCell>
                        <TableCell className="p-4"><div className="h-4 w-40 bg-muted rounded" /></TableCell>
                        <TableCell className="p-4"><div className="h-4 w-24 bg-muted rounded" /></TableCell>
                        <TableCell className="p-4 text-right"><div className="h-6 w-16 bg-muted rounded ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : activeLoans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-36 text-center text-xs text-muted-foreground">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                        <p className="font-semibold text-foreground">Todos os equipamentos estão no armário</p>
                        <p className="text-[11px]">Nenhum empréstimo ativo no momento.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    activeLoans.slice(0, 5).map((loan) => {
                      const isOverdue = new Date(loan.expectedReturnDate) < new Date();
                      return (
                        <TableRow key={loan.id} className="hover:bg-muted/20 transition-colors">
                          
                          {/* Solicitante */}
                          <TableCell className="py-3 px-4">
                            <p className="font-bold text-xs text-foreground">{loan.borrowerName}</p>
                            <p className="text-[10px] text-muted-foreground">{loan.destination}</p>
                          </TableCell>

                          {/* Equipamento */}
                          <TableCell className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[11px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                #{loan.asset?.assetTag}
                              </span>
                              <span className="text-xs font-medium text-foreground">
                                {loan.asset?.item?.name}
                              </span>
                            </div>
                          </TableCell>

                          {/* Previsão */}
                          <TableCell className="py-3 px-4">
                            <div className="space-y-0.5">
                              <span className={`text-xs font-semibold ${isOverdue ? "text-rose-500 font-bold" : "text-foreground"}`}>
                                {formatDateTime(loan.expectedReturnDate)}
                              </span>
                              {isOverdue && (
                                <Badge variant="destructive" className="text-[9px] block w-max">
                                  Atrasado
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          {/* Ação */}
                          <TableCell className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {userRole !== "CONSULTA" && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenWhatsAppModal(loan)}
                                  className="h-7 px-2 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-lg gap-1"
                                  title="Notificar / Cobrar no WhatsApp"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span className="hidden xl:inline">WhatsApp</span>
                                </Button>
                              )}
                              <Button asChild size="sm" variant="ghost" className="h-7 text-xs text-primary hover:bg-primary/10 rounded-lg">
                                <Link href="/emprestimos">
                                  <span>{userRole === "CONSULTA" ? "Ver Detalhes" : "Devolver"}</span>
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* 5. Timeline de Atividades Recentes em Tempo Real */}
          <Card className="rounded-3xl border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <span>Feed de Atividades Recentes</span>
                </CardTitle>
                <span className="text-xs text-muted-foreground font-mono">Trilha de Auditoria</span>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                {timeline.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhuma atividade recente registrada.</p>
                ) : (
                  timeline.map((event: any) => (
                    <div key={event.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-accent/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-foreground shrink-0">
                          {event.type === "LOAN" ? (
                            <Handshake className="w-4 h-4 text-purple-500" />
                          ) : event.type === "MAINTENANCE" ? (
                            <Wrench className="w-4 h-4 text-amber-500" />
                          ) : (
                            <Boxes className="w-4 h-4 text-emerald-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">{event.title}</p>
                          <p className="text-[11px] text-muted-foreground">{event.description} • por <strong className="text-foreground">{event.actor}</strong></p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={event.badgeVariant as any} className="text-[9px]">
                          {event.badge}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">
                          {formatDateTime(event.date)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Modal de Cobrança / Notificação WhatsApp */}
      <LoanWhatsAppModal
        isOpen={whatsappModalOpen}
        onClose={() => {
          setWhatsappModalOpen(false);
          setSelectedLoanForWhatsApp(null);
        }}
        loan={selectedLoanForWhatsApp}
      />

    </div>
  );
}
