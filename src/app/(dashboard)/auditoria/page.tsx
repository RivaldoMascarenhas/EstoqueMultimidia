"use client";

import React, { useState, useEffect } from "react";
import { 
  History, 
  Search, 
  ShieldCheck, 
  Filter, 
  RefreshCw, 
  User, 
  Calendar, 
  Activity, 
  FileText, 
  AlertCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Clock,
  Shield,
  Layers
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal para inspecionar JSON de detalhes
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchLogs = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (actionFilter !== "ALL") params.append("action", actionFilter);
      if (entityFilter !== "ALL") params.append("entity", entityFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      params.append("page", String(page));
      params.append("limit", "20");

      const res = await fetch(`/api/v1/audit-logs?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setLogs(data.data || []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages);
          setTotalCount(data.pagination.total);
        }
      } else {
        if (isInitial) toast.error(data.error || "Erro ao carregar trilha de auditoria.");
      }
    } catch (err) {
      if (isInitial) toast.error("Falha ao comunicar com o servidor.");
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(true);
  }, [page, actionFilter, entityFilter, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs(true);
  };

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes("LOGIN") || act.includes("AUTH")) {
      return <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">LOGIN / AUTH</Badge>;
    }
    if (act.includes("CREATE") || act.includes("ENTRY") || act.includes("REGISTER")) {
      return <Badge variant="available" className="text-[10px]">CRIAÇÃO</Badge>;
    }
    if (act.includes("UPDATE") || act.includes("TRANSFER") || act.includes("RENEW")) {
      return <Badge variant="maintenance" className="text-[10px]">ALTERAÇÃO</Badge>;
    }
    if (act.includes("DELETE") || act.includes("CANCEL") || act.includes("WRITE_OFF")) {
      return <Badge variant="damaged" className="text-[10px]">EXCLUSÃO / BAIXA</Badge>;
    }
    return <Badge variant="normal" className="text-[10px]">{action}</Badge>;
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
              <History className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
              <span>Trilha de Auditoria & Conformidade</span>
            </h1>
            <Badge variant="normal" className="text-[11px] font-semibold px-2 py-0.5">
              {totalCount} Registros
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Registro cronológico inalterável de logins, criações, movimentações, empréstimos e ações administrativas (LGPD art. 37).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => fetchLogs(true)}
            variant="outline"
            size="sm"
            className="rounded-xl text-xs gap-1.5 h-9"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Cards Rápidos de Visão Geral */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 rounded-2xl border-border/80 shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-primary" /> Total de Eventos
          </span>
          <div className="text-xl font-bold font-mono text-foreground mt-1">{totalCount}</div>
        </Card>

        <Card className="p-4 rounded-2xl border-blue-500/30 bg-blue-500/5 shadow-xs">
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Integridade
          </span>
          <div className="text-sm font-bold text-foreground mt-1">Audit Trail Ativo</div>
        </Card>

        <Card className="p-4 rounded-2xl border-emerald-500/30 bg-emerald-500/5 shadow-xs">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> LGPD Compliance
          </span>
          <div className="text-sm font-bold text-foreground mt-1">100% Rastreável</div>
        </Card>

        <Card className="p-4 rounded-2xl border-purple-500/30 bg-purple-500/5 shadow-xs">
          <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Fuso Horário
          </span>
          <div className="text-sm font-bold text-foreground mt-1">America/Fortaleza</div>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <Card className="p-4 rounded-2xl border-border shadow-xs">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por usuário, ação, entidade, IP ou detalhes..."
              icon={<Search className="w-4 h-4 text-primary" />}
              className="text-xs"
            />
            <Button type="submit" size="sm" variant="outline" className="rounded-xl shrink-0">
              Filtrar
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs bg-background border border-input rounded-xl text-foreground font-medium outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">Todas as Ações</option>
              <option value="LOGIN">Autenticação (Login)</option>
              <option value="CREATE">Criação (Insert)</option>
              <option value="UPDATE">Atualização (Update)</option>
              <option value="DELETE">Exclusão (Delete)</option>
            </select>

            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs bg-background border border-input rounded-xl text-foreground font-medium outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">Todas as Entidades</option>
              <option value="User">Usuários</option>
              <option value="Asset">Patrimônio</option>
              <option value="Item">Itens de Estoque</option>
              <option value="Loan">Empréstimos</option>
              <option value="Maintenance">Manutenções</option>
              <option value="Event">Eventos</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Tabela de Logs */}
      <Card className="rounded-2xl border-border overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-bold">Data / Hora</TableHead>
                <TableHead className="text-xs font-bold">Usuário Responsável</TableHead>
                <TableHead className="text-xs font-bold">Ação</TableHead>
                <TableHead className="text-xs font-bold">Entidade / Alvo</TableHead>
                <TableHead className="text-xs font-bold">Endereço IP</TableHead>
                <TableHead className="text-xs font-bold text-right">Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    Carregando registros de auditoria...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Nenhum registro de auditoria encontrado com os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.user ? (
                        <div>
                          <p className="font-bold text-foreground">{log.user.name}</p>
                          <p className="text-[10px] text-muted-foreground">{log.user.email}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-xs">Sistema / Anônimo</span>
                      )}
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell className="text-xs">
                      <span className="font-semibold text-foreground">{log.entity}</span>
                      {log.entityId && (
                        <span className="block font-mono text-[10px] text-muted-foreground truncate max-w-[150px]">
                          ID: {log.entityId}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {log.ipAddress || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {log.details ? (
                        <Button
                          onClick={() => setSelectedLog(log)}
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 rounded-xl"
                          title="Inspecionar detalhes da alteração"
                        >
                          <Eye className="w-4 h-4 text-primary" />
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>Página {page} de {totalPages} ({totalCount} total)</span>
            <div className="flex items-center gap-1.5">
              <Button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                size="sm"
                variant="outline"
                className="rounded-xl h-8 text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Anterior
              </Button>
              <Button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                size="sm"
                variant="outline"
                className="rounded-xl h-8 text-xs"
              >
                Próxima <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal de Detalhes do Log */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Detalhes do Evento de Auditoria
            </DialogTitle>
            <DialogDescription className="text-xs">
              Dados técnicos capturados no momento da requisição.
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 text-xs pt-2">
              <div className="grid grid-cols-2 gap-2 bg-muted/30 p-3 rounded-2xl border border-border">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Ação</span>
                  <span className="font-semibold text-foreground">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Entidade</span>
                  <span className="font-semibold text-foreground">{selectedLog.entity}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Data / Hora</span>
                  <span className="font-mono text-foreground">{formatDateTime(selectedLog.createdAt)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">IP de Origem</span>
                  <span className="font-mono text-foreground">{selectedLog.ipAddress || "—"}</span>
                </div>
              </div>

              <div>
                <span className="text-muted-foreground block text-xs font-bold mb-1">Payload JSON</span>
                <pre className="p-3.5 rounded-2xl bg-muted/60 border border-border text-[11px] font-mono overflow-x-auto text-foreground">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>

              {selectedLog.userAgent && (
                <div>
                  <span className="text-muted-foreground block text-[10px] font-bold uppercase mb-0.5">User-Agent</span>
                  <p className="text-[11px] font-mono text-muted-foreground break-all bg-muted/20 p-2 rounded-xl border border-border/60">
                    {selectedLog.userAgent}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
