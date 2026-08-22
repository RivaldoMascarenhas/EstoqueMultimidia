"use client";

import React, { useState, useEffect } from "react";
import { 
  Wrench, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  Building2, 
  DollarSign, 
  Printer, 
  MessageSquare, 
  Edit3, 
  RefreshCw, 
  Ban
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { MaintenanceFormModal } from "@/components/maintenance/maintenance-form-modal";
import { MaintenanceCompleteModal } from "@/components/maintenance/maintenance-complete-modal";
import { MaintenanceUpdateModal } from "@/components/maintenance/maintenance-update-modal";
import { MaintenanceOsModal } from "@/components/maintenance/maintenance-os-modal";
import { MaintenanceWhatsAppModal } from "@/components/maintenance/maintenance-whatsapp-modal";
import { formatDate, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

export default function ManutencaoPage() {
  const [maintenances, setMaintenances] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({
    activeCount: 0,
    pendingCount: 0,
    inProgressCount: 0,
    externalCount: 0,
    criticalCount: 0,
    projectorCount: 0,
    completedThisMonth: 0,
    totalCost: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Modais
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [isOsOpen, setIsOsOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState<any | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (priorityFilter !== "ALL") params.append("priority", priorityFilter);
      if (typeFilter !== "ALL") params.append("maintenanceType", typeFilter);

      const [listRes, metricsRes] = await Promise.all([
        fetch(`/api/v1/maintenances?${params.toString()}`),
        fetch("/api/v1/maintenances/metrics"),
      ]);

      const listJson = await listRes.json();
      const metricsJson = await metricsRes.json();

      if (listJson.success) setMaintenances(listJson.data);
      if (metricsJson.success) setMetrics(metricsJson.data);

      setIsLoading(false);
    } catch (err: any) {
      toast.error("Erro ao carregar ordens de serviço.");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, priorityFilter, typeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelOrderTarget, setCancelOrderTarget] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const handleOpenCancelModal = (maintenance: any) => {
    setCancelOrderTarget(maintenance);
    setCancelReason("");
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancelOrderTarget) return;
    if (!cancelReason.trim()) {
      toast.error("Por favor, informe a justificativa do cancelamento.");
      return;
    }

    try {
      setIsCancelling(true);
      const res = await fetch(`/api/v1/maintenances/${cancelOrderTarget.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Erro ao cancelar OS.");
      }

      toast.success(`Ordem de Serviço ${cancelOrderTarget.orderNumber || ""} cancelada e equipamento restaurado.`);
      setIsCancelModalOpen(false);
      setCancelOrderTarget(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erro na requisição.");
    } finally {
      setIsCancelling(false);
    }
  };

  const getPriorityBadge = (p?: string) => {
    switch (p) {
      case "CRITICAL":
        return <Badge variant="critical" className="text-[10px] uppercase">Crítica</Badge>;
      case "HIGH":
        return <Badge variant="low" className="text-[10px] uppercase">Alta</Badge>;
      case "LOW":
        return <Badge variant="secondary" className="text-[10px] uppercase">Baixa</Badge>;
      default:
        return <Badge variant="default" className="text-[10px] uppercase">Média</Badge>;
    }
  };

  const getTypeBadge = (t?: string) => {
    switch (t) {
      case "EXTERNAL":
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 font-bold">🏢 Externa / Fornecedor</span>;
      case "PREVENTIVE":
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 font-bold">🛡️ Preventiva</span>;
      case "INTERNAL":
      case "CORRECTIVE":
      default:
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold">🛠️ Manutenção Interna</span>;
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "COMPLETED":
        return <Badge variant="available" className="text-[10px]">Concluído</Badge>;
      case "CANCELLED":
        return <Badge variant="outline" className="text-[10px] text-muted-foreground">Cancelado</Badge>;
      case "PENDING":
        return <Badge variant="low" className="text-[10px]">Pendente</Badge>;
      default:
        return <Badge variant="maintenance" className="text-[10px]">Em Andamento</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      
      {/* Header com Ações Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Wrench className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500 shrink-0" />
              <span>Manutenção & Ordens de Serviço</span>
            </h1>
            <Badge variant="maintenance" className="text-[11px] font-semibold px-2 py-0.5">
              {metrics.activeCount} Em Aberto
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Controle de chamados de bancada interna, assistências externas, laudos e reintegração física ao armário.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            size="sm"
            onClick={() => setIsFormOpen(true)}
            className="flex-1 sm:flex-none gap-1.5 rounded-xl text-xs h-10 sm:h-9 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md shadow-blue-500/20 justify-center cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Abrir Chamado / OS</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="rounded-xl text-xs h-10 sm:h-9 px-3 cursor-pointer"
            title="Atualizar lista"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline ml-1">Atualizar</span>
          </Button>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        
        {/* Card 1: Total em Aberto */}
        <Card className="rounded-2xl border-border/80 bg-gradient-to-br from-blue-500/10 via-card to-card hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Bancada TI & Oficina
              </span>
              <p className="text-2xl font-extrabold text-foreground">
                {metrics.activeCount} <span className="text-xs font-normal text-muted-foreground">chamados</span>
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="text-blue-500 font-bold">{metrics.inProgressCount}</span> na bancada • <span className="text-rose-500 font-bold">{metrics.criticalCount}</span> alta prioridade
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 shadow-sm">
              <Wrench className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Em Assistência Externa */}
        <Card className="rounded-2xl border-border/80 bg-gradient-to-br from-purple-500/10 via-card to-card hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                Assistência Externa
              </span>
              <p className="text-2xl font-extrabold text-foreground">
                {metrics.externalCount} <span className="text-xs font-normal text-muted-foreground">com fornecedores</span>
              </p>
              <p className="text-[10px] text-muted-foreground">
                Epson, Eletrônica & Parceiros
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Concluídas este Mês */}
        <Card className="rounded-2xl border-border/80 bg-gradient-to-br from-emerald-500/10 via-card to-card hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Concluídos no Mês
              </span>
              <p className="text-2xl font-extrabold text-foreground">
                {metrics.completedThisMonth} <span className="text-xs font-normal text-muted-foreground">reintegrados</span>
              </p>
              <p className="text-[10px] text-muted-foreground">
                Disponíveis no armário físico
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-sm">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Custo Total */}
        <Card className="rounded-2xl border-border/80 bg-gradient-to-br from-amber-500/10 via-card to-card hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Custo de Reparos & Peças
              </span>
              <p className="text-2xl font-extrabold text-foreground">
                R$ {metrics.totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Lâmpadas, peças e serviços externos
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shadow-sm">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros e Busca */}
      <Card className="rounded-2xl border-border/80">
        <CardContent className="p-4 space-y-3">
          
          {/* Status & Type Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border/60">
            {[
              { id: "ALL", label: "Todas as OS" },
              { id: "ACTIVE", label: "🛠️ Em Aberto (Bancada/Oficina)", badge: metrics.activeCount },
              { id: "INTERNAL_TAB", label: "🔧 Manutenção Interna" },
              { id: "EXTERNAL", label: "🏢 Assistência Externa", badge: metrics.externalCount },
              { id: "COMPLETED", label: "✅ Concluídas", badge: metrics.completedThisMonth },
              { id: "CANCELLED", label: "Canceladas" },
            ].map((tab) => {
              const isSelected = tab.id === "INTERNAL_TAB"
                ? typeFilter === "INTERNAL" && statusFilter === "ALL"
                : statusFilter === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id === "INTERNAL_TAB") {
                      setTypeFilter("INTERNAL");
                      setStatusFilter("ALL");
                    } else {
                      if (typeFilter === "INTERNAL") setTypeFilter("ALL");
                      setStatusFilter(tab.id);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-sm font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? "bg-white/20 text-white" : "bg-accent text-foreground"
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search and Dropdowns */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-xl">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nº de OS (#OS-2026-0001), patrimônio (#123458), equipamento ou defeito..."
                className="pl-10 h-10 rounded-xl text-xs bg-background w-full shadow-xs"
              />
            </form>

            <div className="flex items-center gap-2 shrink-0">
              {/* Filtro de Prioridade */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="h-10 px-3 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none shadow-xs cursor-pointer"
              >
                <option value="ALL">Todas as Prioridades</option>
                <option value="CRITICAL">🔴 Prioridade Crítica</option>
                <option value="HIGH">🟠 Prioridade Alta</option>
                <option value="MEDIUM">🔵 Prioridade Média</option>
                <option value="LOW">⚪ Prioridade Baixa</option>
              </select>

              {/* Filtro de Tipo */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-10 px-3 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none shadow-xs cursor-pointer"
              >
                <option value="ALL">Todos os Locais / Tipos</option>
                <option value="INTERNAL">🛠️ Manutenção Interna (TI)</option>
                <option value="EXTERNAL">🏢 Assistência Externa</option>
                <option value="PREVENTIVE">🛡️ Preventiva</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Ordens de Serviço */}
      <div className="rounded-2xl border border-border/80 shadow-sm overflow-hidden bg-card">
        <Table className="min-w-[1100px] w-full">
            <TableHeader className="bg-muted/50 border-b border-border/80">
              <TableRow className="hover:bg-transparent">
                <TableHead className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground w-[260px]">
                  OS & Equipamento
                </TableHead>
                <TableHead className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground min-w-[300px]">
                  Defeito Relatado & Diagnóstico
                </TableHead>
                <TableHead className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground w-[210px]">
                  Responsável / Oficina
                </TableHead>
                <TableHead className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground w-[150px]">
                  Prazo & Prioridade
                </TableHead>
                <TableHead className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground w-[140px]">
                  Situação & Custo
                </TableHead>
                <TableHead className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-center w-[230px]">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="animate-pulse">
                    <TableCell className="p-4">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-4 w-44" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </TableCell>
                    <TableCell className="p-4">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-56" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </TableCell>
                    <TableCell className="p-4">
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </TableCell>
                    <TableCell className="p-4">
                      <Skeleton className="h-6 w-24 rounded-full" />
                    </TableCell>
                    <TableCell className="p-4">
                      <Skeleton className="h-6 w-28 rounded-full" />
                    </TableCell>
                    <TableCell className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Skeleton className="h-8 w-8 rounded-xl" />
                        <Skeleton className="h-8 w-8 rounded-xl" />
                        <Skeleton className="h-8 w-8 rounded-xl" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : maintenances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2 py-8">
                      <div className="p-3 rounded-full bg-accent/60 text-muted-foreground">
                        <Wrench className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        Nenhuma ordem de serviço encontrada
                      </p>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        Não há registros com os filtros atuais. Abra um novo chamado técnico para registrar avarias e reparos.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => setIsFormOpen(true)}
                        className="mt-2 rounded-xl text-xs gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Abrir Primeira OS</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                maintenances.map((m) => {
                  const orderNum = m.orderNumber || `#OS-${m.id.slice(0, 8)}`;
                  const isInternalOS = m.maintenanceType === "INTERNAL" || m.maintenanceType === "PREVENTIVE" || (!m.serviceProvider && m.maintenanceType !== "EXTERNAL");

                  return (
                    <TableRow key={m.id} className="hover:bg-muted/30 transition-colors border-b border-border/60">
                      
                      {/* Coluna 1: OS & Equipamento */}
                      <TableCell className="py-4 px-4 align-top">
                        <div className="space-y-1.5 min-w-[220px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => {
                                setSelectedMaintenance(m);
                                setIsOsOpen(true);
                              }}
                              className="font-mono text-xs font-bold text-primary hover:underline bg-primary/10 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                              title="Visualizar OS Oficial"
                            >
                              {orderNum}
                            </button>
                            <span className="font-mono text-[11px] font-semibold text-foreground bg-accent px-1.5 py-0.5 rounded">
                              #{m.asset?.assetTag}
                            </span>
                          </div>

                          <div>
                            <p className="font-bold text-xs text-foreground" title={m.asset?.item?.name}>
                              {m.asset?.item?.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {m.asset?.model ? `${m.asset.model} • ` : ""}Entrada: {formatDate(m.entryDate)}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Coluna 2: Defeito & Diagnóstico */}
                      <TableCell className="py-4 px-4 align-top">
                        <div className="space-y-1.5 min-w-[260px]">
                          <p className="text-xs text-foreground font-medium leading-relaxed" title={m.issueDescription}>
                            {m.issueDescription}
                          </p>

                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            {getTypeBadge(m.maintenanceType)}
                            
                            {m.replacedParts && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium" title={m.replacedParts}>
                                ⚡ {m.replacedParts}
                              </span>
                            )}

                            {m.lampHours !== null && m.lampHours !== undefined && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap">
                                💡 {m.lampHours}h de lâmpada
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Coluna 3: Responsável / Oficina */}
                      <TableCell className="py-4 px-4 align-top">
                        <div className="space-y-1 min-w-[180px]">
                          {isInternalOS ? (
                            <div>
                              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                <span>🛠️ Bancada TI UniFAP</span>
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                Técnico: <strong className="text-foreground font-medium">{m.createdByUser?.name || "Equipe TI"}</strong>
                              </p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-xs font-semibold text-purple-600 dark:text-purple-400" title={m.serviceProvider || "Assistência Externa"}>
                                🏢 {m.serviceProvider || "Assistência Externa"}
                              </p>
                              {m.contactName && (
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  Contato: <strong className="text-foreground font-medium">{m.contactName}</strong>
                                </p>
                              )}
                              {m.contactPhone && (
                                <p className="text-[10px] font-mono text-muted-foreground/80">
                                  {m.contactPhone}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Coluna 4: Prazo & Prioridade */}
                      <TableCell className="py-4 px-4 align-top">
                        <div className="space-y-1.5 min-w-[130px]">
                          <div>
                            {getPriorityBadge(m.priority)}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] whitespace-nowrap">
                            <Clock className={`w-3.5 h-3.5 ${m.daysInMaintenance > 7 ? "text-rose-500" : "text-muted-foreground"}`} />
                            <span className={m.daysInMaintenance > 7 ? "font-bold text-rose-500" : "text-muted-foreground"}>
                              {m.daysInMaintenance} {m.daysInMaintenance === 1 ? "dia" : "dias"} em reparo
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Coluna 5: Situação & Custo */}
                      <TableCell className="py-4 px-4 align-top">
                        <div className="space-y-1.5 min-w-[120px]">
                          <div>
                            {getStatusBadge(m.status)}
                          </div>
                          <p className="font-mono text-xs font-bold text-foreground">
                            {m.cost ? formatCurrency(Number(m.cost)) : <span className="text-muted-foreground font-normal text-[11px]">Sem custo</span>}
                          </p>
                        </div>
                      </TableCell>

                      {/* Coluna 6: Ações */}
                      <TableCell className="py-4 px-4 align-middle text-center w-[230px]">
                        <div className="flex items-center justify-center gap-1.5">
                          
                          {/* Imprimir OS */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedMaintenance(m);
                              setIsOsOpen(true);
                            }}
                            className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground shadow-xs"
                            title="Imprimir Ordem de Serviço"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Button>

                          {/* WhatsApp */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedMaintenance(m);
                              setIsWhatsAppOpen(true);
                            }}
                            className="h-8 w-8 p-0 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 shadow-xs"
                            title="Enviar WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </Button>

                          {/* Editar / Atualizar */}
                          {m.isActive && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedMaintenance(m);
                                setIsUpdateOpen(true);
                              }}
                              className="h-8 w-8 p-0 rounded-lg text-primary hover:bg-primary/10 shadow-xs"
                              title="Editar OS"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </Button>
                          )}

                          {/* Concluir / Laudo */}
                          {m.isActive && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedMaintenance(m);
                                setIsCompleteOpen(true);
                              }}
                              className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-1"
                              title="Finalizar Chamado e Reintegrar"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Concluir</span>
                            </Button>
                          )}

                          {/* Cancelar */}
                          {m.isActive && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenCancelModal(m)}
                              className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                              title="Cancelar OS"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </Button>
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

      {/* Modais Integrados */}
      <MaintenanceFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchData}
      />

      <MaintenanceCompleteModal
        isOpen={isCompleteOpen}
        onClose={() => {
          setIsCompleteOpen(false);
          setSelectedMaintenance(null);
        }}
        onSuccess={fetchData}
        maintenance={selectedMaintenance}
      />

      <MaintenanceUpdateModal
        isOpen={isUpdateOpen}
        onClose={() => {
          setIsUpdateOpen(false);
          setSelectedMaintenance(null);
        }}
        onSuccess={fetchData}
        maintenance={selectedMaintenance}
      />

      <MaintenanceOsModal
        isOpen={isOsOpen}
        onClose={() => {
          setIsOsOpen(false);
          setSelectedMaintenance(null);
        }}
        maintenance={selectedMaintenance}
      />

      <MaintenanceWhatsAppModal
        isOpen={isWhatsAppOpen}
        onClose={() => {
          setIsWhatsAppOpen(false);
          setSelectedMaintenance(null);
        }}
        maintenance={selectedMaintenance}
      />

      {/* 🚫 Modal de Cancelamento de Ordem de Serviço */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="max-w-md p-6 rounded-3xl bg-card border-border/80 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <Ban className="w-4 h-4 text-rose-600" />
              <span>Cancelar Ordem de Serviço {cancelOrderTarget?.orderNumber}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              O chamado será cancelado e o equipamento voltará a ficar disponível para empréstimos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 rounded-2xl bg-muted/40 border border-border space-y-1">
              <p className="font-semibold text-foreground">Equipamento: {cancelOrderTarget?.asset?.item?.name}</p>
              <p className="text-muted-foreground">Patrimônio: #{cancelOrderTarget?.asset?.assetTag}</p>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">Motivo do Cancelamento: *</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex: Diagnóstico descartado, defeito não confirmado, duplicidade de chamado..."
                rows={3}
                className="w-full p-3 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-rose-500 focus:outline-none resize-none"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCancelModalOpen(false)}
              className="rounded-xl text-xs h-9"
            >
              Voltar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isCancelling}
              onClick={handleConfirmCancel}
              className="rounded-xl text-xs font-bold h-9 bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>{isCancelling ? "Cancelando..." : "Confirmar Cancelamento"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
