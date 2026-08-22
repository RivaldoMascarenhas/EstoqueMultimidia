"use client";

import React, { useState, useEffect } from "react";
import { 
  History, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowRightLeft, 
  SlidersHorizontal, 
  RefreshCw, 
  Package, 
  User, 
  FileSpreadsheet, 
  ChevronDown, 
  RotateCcw
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

export default function MovimentacoesPage() {
  const [movements, setMovements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const isFilterActive = searchTerm.trim() !== "" || typeFilter !== "ALL" || startDate !== "" || endDate !== "";

  const fetchMovements = async (overrideSearch?: string, overrideType?: string, overrideStart?: string, overrideEnd?: string) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      
      const sTerm = overrideSearch !== undefined ? overrideSearch : searchTerm;
      const tFilter = overrideType !== undefined ? overrideType : typeFilter;
      const sDate = overrideStart !== undefined ? overrideStart : startDate;
      const eDate = overrideEnd !== undefined ? overrideEnd : endDate;

      if (sTerm.trim()) params.append("search", sTerm.trim());
      if (tFilter !== "ALL") params.append("type", tFilter);
      if (sDate) params.append("startDate", sDate);
      if (eDate) params.append("endDate", eDate);

      const res = await fetch(`/api/v1/movements?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setMovements(json.data);
      } else {
        toast.error(json.error || "Erro ao carregar histórico.");
      }
    } catch (err) {
      toast.error("Erro na comunicação com o servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [typeFilter, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMovements();
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setTypeFilter("ALL");
    setStartDate("");
    setEndDate("");
    fetchMovements("", "ALL", "", "");
  };

  // Exportar para CSV formatado com UTF-8 BOM
  const handleExportCSV = () => {
    if (movements.length === 0) {
      toast.error("Não há movimentações para exportar.");
      return;
    }

    try {
      const headers = [
        "Data/Hora",
        "Tipo de Movimentação",
        "Item / Material",
        "SKU / Código",
        "Quantidade",
        "Saldo Anterior",
        "Saldo Posterior",
        "Caixa Origem",
        "Caixa Destino",
        "Operador / Usuário",
        "Justificativa / Observação"
      ];

      const getTypeName = (type: string) => {
        switch (type) {
          case "ENTRY": return "Entrada";
          case "EXIT": return "Saída / Baixa";
          case "TRANSFER": return "Transferência";
          case "ADJUSTMENT": return "Ajuste de Inventário";
          case "LOAN": return "Empréstimo";
          case "RETURN": return "Devolução";
          case "MAINTENANCE_IN": return "Envio para Manutenção";
          case "MAINTENANCE_OUT": return "Retorno de Manutenção";
          case "ASSET_REGISTER": return "Cadastro de Patrimônio";
          case "WRITE_OFF": return "Baixa Definitiva";
          default: return type;
        }
      };

      const rows = movements.map((m) => {
        const source = m.sourceBox 
          ? `${m.sourceBox.door?.name || "Porta"} / ${m.sourceBox.name} (${m.sourceBox.code})`
          : "-";
        const dest = m.destBox 
          ? `${m.destBox.door?.name || "Porta"} / ${m.destBox.name} (${m.destBox.code})`
          : "-";

        return [
          `"${formatDateTime(m.createdAt)}"`,
          `"${getTypeName(m.type)}"`,
          `"${m.item?.name?.replace(/"/g, '""') || "-"}"`,
          `"${m.item?.sku || "-"}"`,
          m.quantity,
          m.balanceBefore,
          m.balanceAfter,
          `"${source}"`,
          `"${dest}"`,
          `"${m.user?.name || "Sistema"}"`,
          `"${m.observation?.replace(/"/g, '""') || "-"}"`
        ].join(";");
      });

      // UTF-8 BOM (\uFEFF) para abrir com acentuação correta no Excel brasileiro
      const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const today = new Date().toISOString().slice(0, 10);
      link.setAttribute("href", url);
      link.setAttribute("download", `movimentacoes-estoque-unifap-${today}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Relatório CSV gerado e baixado com sucesso!");
    } catch (err) {
      toast.error("Erro ao gerar arquivo CSV.");
    }
  };

  // Métricas
  const countEntry = movements.filter((m) => m.type === "ENTRY").length;
  const countExit = movements.filter((m) => m.type === "EXIT" || m.type === "WRITE_OFF").length;
  const countTransfer = movements.filter((m) => m.type === "TRANSFER").length;

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "ENTRY":
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/30 whitespace-nowrap">
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
            Entrada
          </span>
        );
      case "EXIT":
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-400 font-bold border border-rose-500/30 whitespace-nowrap">
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />
            Saída
          </span>
        );
      case "TRANSFER":
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-400 font-bold border border-blue-500/30 whitespace-nowrap">
            <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500" />
            Transferência
          </span>
        );
      case "ADJUSTMENT":
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/30 whitespace-nowrap">
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500" />
            Ajuste
          </span>
        );
      case "LOAN":
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-400 font-bold border border-purple-500/30 whitespace-nowrap">
            Empréstimo
          </span>
        );
      case "RETURN":
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-400 font-bold border border-teal-500/30 whitespace-nowrap">
            Devolução
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full bg-accent text-foreground font-semibold border border-border whitespace-nowrap">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <History className="w-6 h-6 text-primary" />
              Movimentações & Histórico
            </h1>
            <Badge variant="normal" className="text-xs">
              Audit Log Ativo
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Histórico completo e inalterável de todas as entradas, saídas, baixas e transferências no armário físico.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchMovements()}
            className="gap-1.5 rounded-xl text-xs h-9"
            title="Atualizar lista"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Atualizar</span>
          </Button>

          <Button
            size="sm"
            onClick={handleExportCSV}
            disabled={movements.length === 0}
            className="gap-1.5 rounded-xl text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md shadow-emerald-600/20"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar CSV (Excel)</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total */}
        <Card className="rounded-2xl border-border/80 bg-gradient-to-br from-primary/10 via-card to-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                Total de Registros
              </span>
              <p className="text-2xl font-extrabold text-foreground">
                {movements.length}
              </p>
              <p className="text-[10px] text-muted-foreground">Trilha de auditoria</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/20 text-primary">
              <History className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Entradas */}
        <Card className="rounded-2xl border-border/80 bg-gradient-to-br from-emerald-500/10 via-card to-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Entradas de Estoque
              </span>
              <p className="text-2xl font-extrabold text-foreground">
                {countEntry}
              </p>
              <p className="text-[10px] text-muted-foreground">Novas cargas / compras</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Saídas / Baixas */}
        <Card className="rounded-2xl border-border/80 bg-gradient-to-br from-rose-500/10 via-card to-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                Saídas / Baixas
              </span>
              <p className="text-2xl font-extrabold text-foreground">
                {countExit}
              </p>
              <p className="text-[10px] text-muted-foreground">Consumo & descarte</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Transferências */}
        <Card className="rounded-2xl border-border/80 bg-gradient-to-br from-blue-500/10 via-card to-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Transferências
              </span>
              <p className="text-2xl font-extrabold text-foreground">
                {countTransfer}
              </p>
              <p className="text-[10px] text-muted-foreground">Entre caixas físicas</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros e Busca */}
      <Card className="rounded-2xl border-border/80">
        <CardContent className="p-4 space-y-3">
          
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border/60">
            {[
              { id: "ALL", label: "Todas as Movimentações" },
              { id: "ENTRY", label: "Entradas", badge: countEntry },
              { id: "EXIT", label: "Saídas", badge: countExit },
              { id: "TRANSFER", label: "Transferências", badge: countTransfer },
              { id: "ADJUSTMENT", label: "Ajustes de Inventário" },
            ].map((tab) => {
              const isSelected = typeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTypeFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
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

          {/* Search, Type e Datas */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-1">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-xl">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por item, SKU, operador, caixa (ex: C001) ou justificativa..."
                  className="pl-10 h-10 rounded-xl text-xs bg-background w-full shadow-xs"
                />
              </div>
              <Button
                type="submit"
                size="sm"
                className="h-10 px-4 rounded-xl text-xs font-semibold bg-primary text-primary-foreground shadow-xs shrink-0"
              >
                Buscar
              </Button>
            </form>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Filtro de Tipo Específico */}
              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-10 pl-3 pr-9 rounded-xl border border-input bg-background text-xs font-medium text-foreground focus:ring-2 focus:ring-primary focus:outline-none shadow-xs appearance-none cursor-pointer"
                >
                  <option value="ALL">Todos os Tipos</option>
                  <option value="ENTRY">Entrada</option>
                  <option value="EXIT">Saída</option>
                  <option value="TRANSFER">Transferência</option>
                  <option value="ADJUSTMENT">Ajuste</option>
                  <option value="LOAN">Empréstimo</option>
                  <option value="RETURN">Devolução</option>
                </select>
                <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Data Inicial */}
              <div className="relative">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10 px-3 rounded-xl text-xs bg-background w-36 shadow-xs font-medium"
                  title="Data inicial"
                />
              </div>

              {/* Data Final */}
              <div className="relative">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-10 px-3 rounded-xl text-xs bg-background w-36 shadow-xs font-medium"
                  title="Data final"
                />
              </div>

              {/* Botão Limpar Filtros */}
              {isFilterActive && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-10 px-3 rounded-xl text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground bg-background hover:bg-muted shadow-xs"
                  title="Limpar todos os filtros"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                  <span>Limpar Filtros</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Movimentações */}
      <div className="rounded-2xl border-border/80 shadow-sm">
        <Table className="min-w-[1050px] w-full">
            <TableHeader className="bg-muted/50 border-b border-border/80">
              <TableRow className="hover:bg-transparent">
                <TableHead className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground w-[170px]">
                  Data & Horário
                </TableHead>
                <TableHead className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground w-[140px]">
                  Tipo
                </TableHead>
                <TableHead className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground min-w-[220px]">
                  Item / Material
                </TableHead>
                <TableHead className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground w-[130px]">
                  Qtd & Saldo
                </TableHead>
                <TableHead className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground w-[220px]">
                  Origem / Destino
                </TableHead>
                <TableHead className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground w-[160px]">
                  Operador
                </TableHead>
                <TableHead className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground min-w-[200px]">
                  Justificativa / Motivo
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i} className="animate-pulse">
                    <TableCell className="p-4"><div className="h-6 w-28 bg-muted rounded" /></TableCell>
                    <TableCell className="p-4"><div className="h-6 w-24 bg-muted rounded" /></TableCell>
                    <TableCell className="p-4"><div className="h-6 w-48 bg-muted rounded" /></TableCell>
                    <TableCell className="p-4"><div className="h-6 w-20 bg-muted rounded" /></TableCell>
                    <TableCell className="p-4"><div className="h-6 w-36 bg-muted rounded" /></TableCell>
                    <TableCell className="p-4"><div className="h-6 w-24 bg-muted rounded" /></TableCell>
                    <TableCell className="p-4"><div className="h-6 w-40 bg-muted rounded" /></TableCell>
                  </TableRow>
                ))
              ) : movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2 py-8">
                      <div className="p-3 rounded-full bg-accent/60 text-muted-foreground">
                        <History className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        Nenhuma movimentação registrada
                      </p>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        As operações de entrada, baixa, transferência e devolução geram trilhas automáticas aqui.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((m) => {
                  const isPositive = m.type === "ENTRY" || m.type === "RETURN";
                  const isNegative = m.type === "EXIT" || m.type === "WRITE_OFF" || m.type === "LOAN";

                  return (
                    <TableRow key={m.id} className="hover:bg-muted/30 transition-colors border-b border-border/60">
                      
                      {/* Data & Horário */}
                      <TableCell className="py-3.5 px-4 font-mono text-xs text-muted-foreground">
                        {formatDateTime(m.createdAt)}
                      </TableCell>

                      {/* Tipo */}
                      <TableCell className="py-3.5 px-4">
                        {getTypeBadge(m.type)}
                      </TableCell>

                      {/* Item / Material */}
                      <TableCell className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-primary shrink-0" />
                            {m.item?.name}
                          </p>
                          <p className="font-mono text-[11px] text-muted-foreground">
                            SKU: {m.item?.sku}
                          </p>
                        </div>
                      </TableCell>

                      {/* Quantidade & Saldo */}
                      <TableCell className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className={`font-mono text-xs font-bold ${
                            isPositive ? "text-emerald-600 dark:text-emerald-400" : isNegative ? "text-rose-600 dark:text-rose-400" : "text-blue-600 dark:text-blue-400"
                          }`}>
                            {isPositive ? `+${m.quantity}` : isNegative ? `-${m.quantity}` : `${m.quantity}`} {m.item?.unit || "UN"}
                          </span>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {m.balanceBefore} ➔ <strong className="text-foreground">{m.balanceAfter}</strong>
                          </p>
                        </div>
                      </TableCell>

                      {/* Origem / Destino */}
                      <TableCell className="py-3.5 px-4 text-xs">
                        <div className="space-y-0.5">
                          {m.sourceBox && (
                            <p className="text-muted-foreground text-[11px] flex items-center gap-1">
                              <span className="text-[10px] uppercase font-bold text-rose-500">De:</span>
                              <span>{m.sourceBox.door?.name || "Porta"} / {m.sourceBox.name} ({m.sourceBox.code})</span>
                            </p>
                          )}
                          {m.destBox && (
                            <p className="text-muted-foreground text-[11px] flex items-center gap-1">
                              <span className="text-[10px] uppercase font-bold text-emerald-500">Para:</span>
                              <span>{m.destBox.door?.name || "Porta"} / {m.destBox.name} ({m.destBox.code})</span>
                            </p>
                          )}
                          {!m.sourceBox && !m.destBox && (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Operador */}
                      <TableCell className="py-3.5 px-4 text-xs">
                        <div className="flex items-center gap-1.5 text-foreground font-medium">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{m.user?.name || "Sistema"}</span>
                        </div>
                      </TableCell>

                      {/* Justificativa / Observação */}
                      <TableCell className="py-3.5 px-4 text-xs text-muted-foreground max-w-xs">
                        <p className="line-clamp-2 leading-relaxed" title={m.observation || "-"}>
                          {m.observation || "-"}
                        </p>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
    </div>
  );
}
