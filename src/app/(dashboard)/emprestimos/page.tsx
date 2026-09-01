"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { 
  Handshake, 
  Plus, 
  Search, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  MessageSquare, 
  Printer, 
  CalendarClock, 
  PackageCheck, 
  MoreHorizontal, 
  RefreshCw, 
  User, 
  Monitor, 
  MapPin, 
  Building2, 
  Phone, 
  ShieldAlert
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoanFormModal } from "@/components/loans/loan-form-modal";
import { LoanReturnModal } from "@/components/loans/loan-return-modal";
import { LoanRenewModal } from "@/components/loans/loan-renew-modal";
import { LoanReceiptModal } from "@/components/loans/loan-receipt-modal";
import { LoanWhatsAppModal } from "@/components/loans/loan-whatsapp-modal";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { formatDate, formatDateTime } from "@/lib/utils";

function EmprestimosContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = session?.user?.role || "OPERADOR";
  const isReadOnly = userRole === "CONSULTA";

  const searchParams = useSearchParams();
  const initialAssetId = searchParams.get("assetId") || undefined;
  const initialSearch = searchParams.get("search") || "";

  const [loans, setLoans] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({
    totalLoans: 0,
    activeLoans: 0,
    onTimeActiveLoans: 0,
    overdueLoans: 0,
    returnedLoans: 0,
    returnedDamagedLoans: 0,
    monthLoans: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [statusTab, setStatusTab] = useState<"ALL" | "ACTIVE" | "OVERDUE" | "RETURNED" | "RETURNED_DAMAGED">("ACTIVE");

  // Modais
  const [isFormOpen, setIsFormOpen] = useState(!!initialAssetId);
  const [preSelectedAssetId, setPreSelectedAssetId] = useState<string | undefined>(initialAssetId);
  const [selectedLoanForReturn, setSelectedLoanForReturn] = useState<any | null>(null);
  const [selectedLoanForRenew, setSelectedLoanForRenew] = useState<any | null>(null);
  const [selectedLoanForReceipt, setSelectedLoanForReceipt] = useState<any | null>(null);
  const [selectedLoanForWhatsApp, setSelectedLoanForWhatsApp] = useState<any | null>(null);

  const isAnyModalOpen = isFormOpen || !!selectedLoanForReturn || !!selectedLoanForRenew || !!selectedLoanForReceipt || !!selectedLoanForWhatsApp;

  const fetchData = async (isInitial: boolean | unknown = false) => {
    try {
      if (isInitial === true) setIsLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (statusTab !== "ALL") params.append("status", statusTab);

      const [loansRes, metricsRes] = await Promise.all([
        fetch(`/api/v1/loans?${params.toString()}`),
        fetch(`/api/v1/loans/metrics`),
      ]);

      const loansJson = await loansRes.json();
      const metricsJson = await metricsRes.json();

      if (loansJson && loansJson.success && Array.isArray(loansJson.data)) {
        setLoans(loansJson.data);
      } else {
        setLoans([]);
      }

      if (metricsJson && metricsJson.success && metricsJson.data) {
        setMetrics(metricsJson.data);
      }
    } catch (err) {
      setLoans([]);
    } finally {
      if (isInitial === true) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, [statusTab]);

  // Sincronização automática em segundo plano a cada 10s
  useAutoRefresh(() => fetchData(false), {
    intervalMs: 10000,
    enabled: !isAnyModalOpen,
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const getStatusBadge = (loan: any) => {
    if (loan.status === "RETURNED") {
      return (
        <Badge variant="available" dot className="text-[10px]">
          Devolvido
        </Badge>
      );
    }
    if (loan.status === "RETURNED_DAMAGED") {
      return (
        <Badge variant="damaged" dot className="text-[10px]">
          Devolvido c/ Avaria
        </Badge>
      );
    }
    if (loan.isOverdue) {
      return (
        <Badge variant="damaged" dot className="text-[10px] animate-pulse">
          Atrasado
        </Badge>
      );
    }
    return (
      <Badge variant="loaned" dot className="text-[10px]">
        Em Andamento
      </Badge>
    );
  };

  const getDueTimeText = (loan: any) => {
    if (loan.status === "RETURNED" || loan.status === "RETURNED_DAMAGED") {
      return `Devolvido em ${formatDate(loan.actualReturnDate)}`;
    }

    if (loan.isOverdue) {
      const absHours = Math.abs(loan.diffHours || 0);
      const absDays = Math.abs(loan.diffDays || 0);
      if (absDays >= 1) {
        return `Atrasado há ${absDays} ${absDays === 1 ? "dia" : "dias"}`;
      }
      return `Atrasado há ${absHours} ${absHours === 1 ? "hora" : "horas"}`;
    }

    const hours = loan.diffHours || 0;
    const days = loan.diffDays || 0;
    if (days >= 1) {
      return `Vence em ${days} ${days === 1 ? "dia" : "dias"}`;
    }
    if (hours > 0) {
      return `Vence em ${hours} ${hours === 1 ? "hora" : "horas"}`;
    }
    return "Vence hoje em breve";
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header com Ações Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Handshake className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
              <span>Empréstimos</span>
            </h1>
            <Badge variant="loaned" className="text-[11px] font-semibold px-2 py-0.5">
              {metrics.activeLoans} Ativos
            </Badge>
            {isReadOnly && (
              <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30">
                Modo Consulta
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Controle de retiradas, devoluções, prazos e Termo de Responsabilidade.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {!isReadOnly && (
            <Button
              onClick={() => setIsFormOpen(true)}
              size="sm"
              className="flex-1 sm:flex-none gap-1.5 rounded-xl h-10 sm:h-9 text-xs font-semibold bg-gradient-to-r from-primary-600 to-indigo-600 text-white shadow-md shadow-primary/20 justify-center"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Empréstimo</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="rounded-xl h-10 sm:h-9 text-xs px-3"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline ml-1">Atualizar</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: Empréstimos Ativos */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Empréstimos Ativos
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Handshake className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {metrics.activeLoans}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-emerald-600 font-semibold">{metrics.onTimeActiveLoans}</span> dentro do prazo previsto
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Em Atraso */}
        <Card className={`transition-all hover:shadow-md ${metrics.overdueLoans > 0 ? "border-rose-500/40 bg-rose-500/5" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              {metrics.overdueLoans > 0 && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
              <span>Em Atraso (Vencidos)</span>
            </CardTitle>
            <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${
              metrics.overdueLoans > 0 
                ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 animate-pulse" 
                : "bg-muted text-muted-foreground"
            }`}>
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.overdueLoans > 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>
              {metrics.overdueLoans}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {metrics.overdueLoans > 0 ? "Requer cobrança via WhatsApp ou contato" : "Nenhum equipamento atrasado"}
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Devolvidos no Mês */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Devoluções Concluídas
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {metrics.returnedLoans}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {metrics.monthLoans} empréstimos realizados neste mês
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Devolvidos com Avaria */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Avarias na Devolução
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {metrics.returnedDamagedLoans}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Itens retidos para manutenção técnica
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Abas e Filtros de Busca */}
      <div className="space-y-4">
        {/* Abas de Navegação */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant={statusTab === "ACTIVE" ? "default" : "ghost"}
              size="sm"
              onClick={() => setStatusTab("ACTIVE")}
              className="rounded-xl text-xs h-8 gap-1.5"
            >
              <span>Ativos</span>
              <Badge variant={statusTab === "ACTIVE" ? "outline" : "loaned"} className="text-[10px] px-1.5 py-0">
                {metrics.activeLoans}
              </Badge>
            </Button>

            <Button
              variant={statusTab === "OVERDUE" ? "default" : "ghost"}
              size="sm"
              onClick={() => setStatusTab("OVERDUE")}
              className={`rounded-xl text-xs h-8 gap-1.5 ${
                statusTab === "OVERDUE" ? "bg-rose-600 text-white" : "text-rose-600 dark:text-rose-400"
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Atrasados</span>
              {metrics.overdueLoans > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                  {metrics.overdueLoans}
                </span>
              )}
            </Button>

            <Button
              variant={statusTab === "ALL" ? "default" : "ghost"}
              size="sm"
              onClick={() => setStatusTab("ALL")}
              className="rounded-xl text-xs h-8"
            >
              Todos ({metrics.totalLoans})
            </Button>

            <Button
              variant={statusTab === "RETURNED" ? "default" : "ghost"}
              size="sm"
              onClick={() => setStatusTab("RETURNED")}
              className="rounded-xl text-xs h-8"
            >
              Devolvidos ({metrics.returnedLoans})
            </Button>

            <Button
              variant={statusTab === "RETURNED_DAMAGED" ? "default" : "ghost"}
              size="sm"
              onClick={() => setStatusTab("RETURNED_DAMAGED")}
              className="rounded-xl text-xs h-8"
            >
              Com Avaria ({metrics.returnedDamagedLoans})
            </Button>
          </div>

          {/* Barra de Pesquisa */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar solicitante, patrimônio, sala..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>
            <Button type="submit" size="sm" variant="secondary" className="rounded-xl h-9 text-xs">
              Buscar
            </Button>
          </form>
        </div>

        {/* Tabela de Empréstimos */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs font-bold uppercase py-3.5 pl-6">Protocolo & Equipamento</TableHead>
                <TableHead className="text-xs font-bold uppercase py-3.5 px-4">Solicitante & Contato</TableHead>
                <TableHead className="text-xs font-bold uppercase py-3.5 px-4">Destino / Sala</TableHead>
                <TableHead className="text-xs font-bold uppercase py-3.5 px-4">Datas & Prazo</TableHead>
                <TableHead className="text-xs font-bold uppercase py-3.5 px-4">Situação</TableHead>
                <TableHead className="text-xs font-bold uppercase py-3.5 px-4 text-center w-[170px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={`skeleton-loan-${index}`} className="animate-pulse">
                    <TableCell className="py-4 pl-6">
                      <div className="space-y-2">
                        <Skeleton className="h-3.5 w-24 rounded-md" />
                        <Skeleton className="h-4 w-44 rounded-md" />
                        <Skeleton className="h-3 w-28 rounded-md" />
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-4">
                      <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-32 rounded-md" />
                        <Skeleton className="h-3 w-24 rounded-md" />
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-4">
                      <Skeleton className="h-4 w-28 rounded-md" />
                    </TableCell>
                    <TableCell className="py-4 px-4">
                      <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-32 rounded-md" />
                        <Skeleton className="h-3 w-24 rounded-md" />
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-4">
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </TableCell>
                    <TableCell className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Skeleton className="h-8 w-8 rounded-xl" />
                        <Skeleton className="h-8 w-8 rounded-xl" />
                        <Skeleton className="h-8 w-8 rounded-xl" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : loans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                      <Handshake className="w-8 h-8 text-muted-foreground/50" />
                      <p className="font-semibold text-foreground">Nenhum empréstimo encontrado</p>
                      <p className="text-[11px]">Não há registros correspondentes aos filtros selecionados.</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setStatusTab("ALL");
                          setSearchTerm("");
                        }}
                        className="mt-2 rounded-xl text-xs"
                      >
                        Limpar Filtros
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                loans.map((loan) => {
                  const protocolNumber = `LOAN-${loan.id.slice(-8).toUpperCase()}`;
                  const isActive = loan.status === "ACTIVE";

                  return (
                    <TableRow key={loan.id} className="hover:bg-muted/30 transition-colors">
                      {/* Equipamento */}
                      <TableCell className="py-3.5 pl-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-bold text-muted-foreground">
                              {protocolNumber}
                            </span>
                            <Badge variant="outline" className="font-mono text-[10px]">
                              #{loan.asset?.assetTag}
                            </Badge>
                          </div>
                          <p className="font-bold text-xs text-foreground flex items-center gap-1">
                            <Monitor className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="truncate max-w-[200px]">{loan.asset?.item?.name}</span>
                          </p>
                          {loan.asset?.model && (
                            <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                              Mod: {loan.asset.model}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Solicitante */}
                      <TableCell className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-xs text-foreground flex items-center gap-1">
                            <User className="w-3 h-3 text-muted-foreground" />
                            <span>{loan.borrowerName}</span>
                          </p>
                          {loan.borrowerDepartment && (
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-muted-foreground/70" />
                              <span>{loan.borrowerDepartment}</span>
                            </p>
                          )}
                          {loan.borrowerPhone && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3 text-emerald-500" />
                              <span>{loan.borrowerPhone}</span>
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Destino */}
                      <TableCell className="py-3.5 px-4">
                        <div className="flex items-center gap-1 text-xs text-foreground">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="font-medium">{loan.destination}</span>
                        </div>
                        {loan.notes && (
                          <p className="text-[10px] text-muted-foreground truncate max-w-[150px] mt-0.5" title={loan.notes}>
                            {loan.notes}
                          </p>
                        )}
                      </TableCell>

                      {/* Datas & Prazo */}
                      <TableCell className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="text-[11px] text-muted-foreground">
                            <span>Saída: </span>
                            <span className="text-foreground font-medium">{formatDate(loan.loanDate)}</span>
                          </div>
                          <div className="text-[11px]">
                            <span className="text-muted-foreground">Retorno: </span>
                            <span className={`font-bold ${loan.isOverdue ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>
                              {formatDateTime(loan.expectedReturnDate)}
                            </span>
                          </div>
                          <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            loan.isOverdue
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                              : isActive
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {getDueTimeText(loan)}
                          </span>
                        </div>
                      </TableCell>

                      {/* Situação */}
                      <TableCell className="py-3.5 px-4">
                        {getStatusBadge(loan)}
                      </TableCell>

                      {/* Ações */}
                      <TableCell className="py-3.5 px-4 text-center w-[170px]">
                        <div className="flex items-center justify-center gap-1.5">
                          {!isReadOnly && isActive && (
                            <Button
                              onClick={() => setSelectedLoanForReturn(loan)}
                              size="sm"
                              className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                            >
                              <PackageCheck className="w-3.5 h-3.5" />
                              <span>Devolver</span>
                            </Button>
                          )}

                          {isReadOnly ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedLoanForReceipt(loan)}
                              className="h-8 px-2.5 rounded-xl text-xs gap-1 text-primary hover:text-primary shadow-xs"
                              title="Visualizar Termo de Cautela"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Termo</span>
                            </Button>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl hover:bg-muted">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1.5">
                                {isActive && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => setSelectedLoanForReturn(loan)}
                                      className="gap-2 text-xs rounded-xl cursor-pointer text-emerald-600 dark:text-emerald-400 font-medium"
                                    >
                                      <PackageCheck className="w-4 h-4" />
                                      <span>Devolver Equipamento</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={() => setSelectedLoanForRenew(loan)}
                                      className="gap-2 text-xs rounded-xl cursor-pointer text-amber-600 dark:text-amber-400"
                                    >
                                      <CalendarClock className="w-4 h-4" />
                                      <span>Prorrogar Prazo</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator />
                                  </>
                                )}

                                <DropdownMenuItem
                                  onClick={() => setSelectedLoanForReceipt(loan)}
                                  className="gap-2 text-xs rounded-xl cursor-pointer"
                                >
                                  <Printer className="w-4 h-4 text-primary" />
                                  <span>Termo de Cautela (A4)</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => setSelectedLoanForWhatsApp(loan)}
                                  className="gap-2 text-xs rounded-xl cursor-pointer text-emerald-600 dark:text-emerald-400"
                                >
                                  <MessageSquare className="w-4 h-4" />
                                  <span>Cobrança / WhatsApp</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Modais do Fluxo de Empréstimos */}
      <LoanFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setPreSelectedAssetId(undefined);
          if (initialAssetId) {
            router.replace("/emprestimos", { scroll: false });
          }
        }}
        preSelectedAssetId={preSelectedAssetId}
        onSuccess={async (createdLoan) => {
          fetchData();
          if (initialAssetId) {
            router.replace("/emprestimos", { scroll: false });
          }
          if (createdLoan) {
            setSelectedLoanForReceipt(createdLoan);
          }
        }}
      />

      <LoanReturnModal
        isOpen={!!selectedLoanForReturn}
        onClose={() => setSelectedLoanForReturn(null)}
        loan={selectedLoanForReturn}
        onSuccess={() => {
          fetchData();
        }}
      />

      <LoanRenewModal
        isOpen={!!selectedLoanForRenew}
        onClose={() => setSelectedLoanForRenew(null)}
        loan={selectedLoanForRenew}
        onSuccess={() => {
          fetchData();
        }}
      />

      <LoanReceiptModal
        isOpen={!!selectedLoanForReceipt}
        onClose={() => setSelectedLoanForReceipt(null)}
        loan={selectedLoanForReceipt}
      />

      <LoanWhatsAppModal
        isOpen={!!selectedLoanForWhatsApp}
        onClose={() => setSelectedLoanForWhatsApp(null)}
        loan={selectedLoanForWhatsApp}
      />
    </div>
  );
}

export default function EmprestimosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 w-full items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground text-xs">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span>Carregando módulo de empréstimos...</span>
          </div>
        </div>
      }
    >
      <EmprestimosContent />
    </Suspense>
  );
}
