"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { 
  Package, 
  Monitor, 
  Archive, 
  Handshake, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  Plus, 
  QrCode, 
  ChevronRight,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { formatDateTime, formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const { data: session } = useSession();
  const userName = session?.user?.name || "Rivaldo";
  const userRole = session?.user?.role || "ADMIN";

  const [loanMetrics, setLoanMetrics] = useState<any>({
    activeLoans: 1,
    overdueLoans: 0,
    returnedLoans: 0,
    monthLoans: 1,
  });
  const [assetMetrics, setAssetMetrics] = useState<any>({
    total: 4,
    available: 2,
    loaned: 1,
    maintenance: 1,
    damaged: 0,
  });
  const [activeLoans, setActiveLoans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [loansRes, assetMetricsRes, activeLoansRes] = await Promise.all([
          fetch("/api/v1/loans/metrics"),
          fetch("/api/v1/assets/metrics"),
          fetch("/api/v1/loans?status=ACTIVE"),
        ]);

        const loansData = await loansRes.json();
        const assetMetricsData = await assetMetricsRes.json();
        const activeLoansData = await activeLoansRes.json();

        if (loansData.success) setLoanMetrics(loansData.data);
        if (assetMetricsData.success) setAssetMetrics(assetMetricsData.data);
        if (activeLoansData.success) setActiveLoans(activeLoansData.data);
      } catch (err) {
        console.error("Erro ao carregar dados dinâmicos do dashboard:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const getRoleVariant = (role: string) => {
    switch (role) {
      case "ADMIN": return "admin";
      case "GESTOR": return "gestor";
      case "OPERADOR": return "operador";
      default: return "consulta";
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* Welcome Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-primary-600/15 via-indigo-600/10 to-transparent border border-primary-500/20 backdrop-blur-md">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Suporte de TI & Multimídia • UniFAP
            </span>
            <Badge variant={getRoleVariant(userRole)} className="text-[10px]">
              {userRole}
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Olá, {userName}! 👋
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Bem-vindo ao painel central de controle de estoque, armário físico, equipamentos e empréstimos da UniFAP.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/estoque">
            <Button size="sm" className="gap-1.5 rounded-xl shadow-md shadow-primary/20">
              <Plus className="w-4 h-4" />
              <span>Nova Entrada</span>
            </Button>
          </Link>
          <Link href="/emprestimos">
            <Button size="sm" variant="outline" className="gap-1.5 rounded-xl">
              <Handshake className="w-4 h-4 text-blue-500" />
              <span>Emprestar</span>
            </Button>
          </Link>
          <Link href="/armario">
            <Button size="sm" variant="outline" className="gap-1.5 rounded-xl">
              <QrCode className="w-4 h-4 text-emerald-500" />
              <span>Armário 3D</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Total de Itens em Estoque */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Materiais em Estoque
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Package className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">63</div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-emerald-500 font-semibold font-mono">6</span> itens catalogados em <span className="font-semibold">17</span> caixas
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Equipamentos Patrimoniais */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Equipamentos / Ativos
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
              <Monitor className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{assetMetrics.total}</div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-emerald-500 font-semibold">{assetMetrics.available}</span> disp. • <span className="text-blue-500 font-semibold">{loanMetrics.activeLoans}</span> empr.
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Estrutura do Armário */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Armário Físico
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <Archive className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">3 Portas</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              17 caixas catalogadas com QR Code
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Empréstimos & Atenção */}
        <Card className={`hover:shadow-md transition-shadow ${
          loanMetrics.overdueLoans > 0 
            ? "border-rose-500/40 bg-rose-500/5" 
            : "border-blue-500/30 bg-blue-500/5"
        }`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className={`text-xs font-medium ${
              loanMetrics.overdueLoans > 0 ? "text-rose-700 dark:text-rose-400" : "text-blue-700 dark:text-blue-400"
            }`}>
              Empréstimos Ativos
            </CardTitle>
            <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${
              loanMetrics.overdueLoans > 0 ? "bg-rose-500/10 text-rose-500" : "bg-blue-500/10 text-blue-500"
            }`}>
              <Handshake className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              loanMetrics.overdueLoans > 0 ? "text-rose-600 dark:text-rose-400" : "text-blue-600 dark:text-blue-400"
            }`}>
              {loanMetrics.activeLoans}
            </div>
            <p className="text-[11px] text-muted-foreground font-medium mt-1 flex items-center gap-1">
              {loanMetrics.overdueLoans > 0 ? (
                <span className="text-rose-600 flex items-center gap-1 font-bold">
                  <AlertCircle className="w-3 h-3" />
                  {loanMetrics.overdueLoans} em atraso!
                </span>
              ) : (
                <span className="text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Todos no prazo previsto
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Section: REQUER ATENÇÃO */}
      <Card className="border-rose-500/30 bg-gradient-to-r from-rose-500/5 via-card to-card shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-4 w-4 animate-pulse" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  Atenção Necessária no Setor
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Itens abaixo do estoque mínimo ou empréstimos com prazo crítico
                </CardDescription>
              </div>
            </div>
            <Badge variant="critical" dot>
              {loanMetrics.overdueLoans + 1} Alertas
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {/* Alerta 1: Adaptador USB-C */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Adaptador USB-C para HDMI
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Localização: <span className="font-semibold text-foreground">Porta 2 → Caixa 010</span> • SKU: ADP-USBC-HDMI
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-center">
              <div className="text-right">
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">Restam 2 unid.</span>
                <p className="text-[10px] text-muted-foreground">Mínimo: 5 • Ideal: 12</p>
              </div>
              <Badge variant="critical" className="text-[10px]">Crítico</Badge>
            </div>
          </div>

          {/* Empréstimos Ativos em Destaque */}
          {activeLoans.slice(0, 2).map((loan) => (
            <div
              key={loan.id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border backdrop-blur-sm ${
                loan.isOverdue
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-950 dark:text-rose-200"
                  : "border-amber-500/20 bg-amber-500/5"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`flex h-2.5 w-2.5 rounded-full ${loan.isOverdue ? "bg-rose-500 animate-pulse" : "bg-amber-500"}`} />
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    {loan.asset?.item?.name} (Patrimônio #{loan.asset?.assetTag})
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Responsável: <span className="font-semibold text-foreground">{loan.borrowerName}</span> • Destino: <span className="font-semibold text-foreground">{loan.destination}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 self-end sm:self-center">
                <div className="text-right">
                  <span className={`text-xs font-bold ${loan.isOverdue ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"}`}>
                    {loan.isOverdue ? "Prazo Expirado" : "Em Aberto"}
                  </span>
                  <p className="text-[10px] text-muted-foreground">
                    Devolução: {formatDate(loan.expectedReturnDate)}
                  </p>
                </div>
                <Link href="/emprestimos">
                  <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 rounded-lg gap-1">
                    <span>Gerenciar</span>
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Grid: Movimentações Recentes & Visão Rápida do Armário */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabela de Movimentações Recentes (2 colunas) */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-bold text-foreground">
                Últimas Movimentações Registradas
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Histórico inalterável de entradas, saídas e empréstimos
              </CardDescription>
            </div>
            <Link href="/movimentacoes" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              Ver todas <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Item / Patrimônio</TableHead>
                  <TableHead>Local / Caixa</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Usuário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <Badge variant="available" className="text-[10px] gap-1">
                      <ArrowDownLeft className="w-3 h-3 text-emerald-500" />
                      Entrada
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-xs text-foreground">
                    Cabo HDMI 10 metros
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    Porta 2 / Caixa 017
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    +6
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    Rivaldo
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell>
                    <Badge variant="loaned" className="text-[10px] gap-1">
                      <Handshake className="w-3 h-3 text-blue-500" />
                      Empréstimo
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-xs text-foreground">
                    Projetor Epson X49 (#123457)
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    Sala 203 (Medicina)
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                    1 un
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    Rodrigo
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell>
                    <Badge variant="maintenance" className="text-[10px] gap-1">
                      <RefreshCw className="w-3 h-3 text-purple-500" />
                      Manutenção
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-xs text-foreground">
                    Projetor Epson X49 (#123458)
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    Assistência Técnica
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400">
                    1 un
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    Rivaldo
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Card: Visão Rápida do Armário Físico (1 coluna) */}
        <Card className="shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-foreground">
              Armário de TI UniFAP
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Distribuição física rápida das 3 portas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Porta 1 */}
            <div className="p-3 rounded-xl border border-border/80 bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">PORTA 1</span>
                <span className="text-[10px] text-muted-foreground font-mono">5 caixas</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Cabos 2m/VGA, Rede, Mouses e Teclados
              </p>
            </div>

            {/* Porta 2 */}
            <div className="p-3 rounded-xl border border-primary/30 bg-primary/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary">PORTA 2</span>
                <span className="text-[10px] text-primary font-mono font-semibold">7 caixas</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Cabos 10m/5m, Adaptadores USB-C e Microfones
              </p>
            </div>

            {/* Porta 3 */}
            <div className="p-3 rounded-xl border border-border/80 bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">PORTA 3</span>
                <span className="text-[10px] text-muted-foreground font-mono">5 caixas</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Projetores Epson, Caixas de Som, Extensões e Pilhas
              </p>
            </div>
          </CardContent>
          <div className="p-6 pt-0">
            <Link href="/armario">
              <Button variant="outline" className="w-full text-xs rounded-xl gap-2">
                <Archive className="w-3.5 h-3.5 text-primary" />
                <span>Explorar Armário Completo</span>
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
