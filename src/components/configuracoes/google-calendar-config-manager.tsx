"use client";

import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Key, 
  ExternalLink, 
  Copy, 
  Check, 
  ShieldCheck, 
  Zap, 
  Sparkles,
  Info,
  Server,
  LogIn,
  LogOut,
  Globe,
  ChevronDown,
  Download
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function GoogleCalendarConfigManager() {
  const [statusData, setStatusData] = useState<any>(null);
  const [availableCalendars, setAvailableCalendars] = useState<any[]>([]);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);
  const [isChangingCalendar, setIsChangingCalendar] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [copiedRedirectUri, setCopiedRedirectUri] = useState(false);

  const redirectUri = typeof window !== "undefined" 
    ? `${window.location.origin}/api/v1/integrations/google-calendar/callback`
    : "http://localhost:3000/api/v1/integrations/google-calendar/callback";

  const fetchStatus = async (runTest = false) => {
    try {
      if (runTest) setIsTesting(true);
      else setIsLoading(true);

      const res = await fetch(`/api/v1/integrations/google-calendar/status${runTest ? "?test=true" : ""}`);
      const json = await res.json();
      if (json.success) {
        setStatusData(json.data);
        if (json.data?.oauth?.isConnected) {
          fetchCalendars();
        }
        if (runTest && json.data.testResult) {
          if (json.data.testResult.success) {
            toast.success(json.data.testResult.message);
          } else {
            toast.error(json.data.testResult.error || "Falha no teste de conexão com o Google Calendar.");
          }
        }
      } else {
        toast.error(json.error || "Erro ao consultar status da integração.");
      }
    } catch {
      toast.error("Erro na comunicação com o servidor.");
    } finally {
      setIsLoading(false);
      setIsTesting(false);
    }
  };

  const fetchCalendars = async () => {
    try {
      setIsLoadingCalendars(true);
      const res = await fetch("/api/v1/integrations/google-calendar/calendars");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAvailableCalendars(json.data);
      }
    } catch {
      console.warn("Falha ao carregar lista de calendários.");
    } finally {
      setIsLoadingCalendars(false);
    }
  };

  const handleSelectCalendar = async (calId: string) => {
    const selected = availableCalendars.find((c) => c.id === calId);
    if (!selected) return;

    try {
      setIsChangingCalendar(true);
      const res = await fetch("/api/v1/integrations/google-calendar/calendars", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarId: selected.id,
          calendarName: selected.name,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        fetchStatus();
      } else {
        toast.error(json.error || "Erro ao alterar calendário ativo.");
      }
    } catch {
      toast.error("Erro de conexão ao salvar calendário.");
    } finally {
      setIsChangingCalendar(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleCopyUri = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopiedRedirectUri(true);
    toast.success("URI de Redirecionamento copiada!");
    setTimeout(() => setCopiedRedirectUri(false), 2500);
  };

  const handleConnectGoogleOAuth = () => {
    window.location.href = "/api/v1/integrations/google-calendar/auth";
  };

  const handleDisconnect = async () => {
    if (!confirm("Deseja realmente desconectar a conta Google deste sistema?")) return;
    try {
      setIsDisconnecting(true);
      const res = await fetch("/api/v1/integrations/google-calendar/disconnect", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        fetchStatus();
      } else {
        toast.error(json.error || "Erro ao desconectar.");
      }
    } catch {
      toast.error("Erro na comunicação com o servidor.");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleSyncAll = async () => {
    try {
      setIsSyncingAll(true);
      const res = await fetch("/api/v1/integrations/google-calendar/sync-all", {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        fetchStatus();
      } else {
        toast.error(json.error || "Erro ao sincronizar solicitações.");
      }
    } catch {
      toast.error("Erro ao sincronizar com Google Calendar.");
    } finally {
      setIsSyncingAll(false);
    }
  };

  const [isPullingEvents, setIsPullingEvents] = useState(false);

  const handlePullEvents = async () => {
    try {
      setIsPullingEvents(true);
      const res = await fetch("/api/v1/integrations/google-calendar/pull-events?days=60", {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        fetchStatus();
      } else {
        toast.error(json.error || "Erro ao puxar agendamentos do Google.");
      }
    } catch {
      toast.error("Erro na comunicação ao puxar eventos.");
    } finally {
      setIsPullingEvents(false);
    }
  };

  const isConfigured = statusData?.isConfigured;
  const activeMode = statusData?.activeMode || "MOCK";
  const oauth = statusData?.oauth || { isConnected: false };
  const stats = statusData?.stats || { synced: 0, pending: 0, error: 0 };
  const testResult = statusData?.testResult;

  return (
    <div className="space-y-6">
      
      {/* 1. Status Geral da Conexão */}
      <Card className="rounded-3xl border border-border/80 shadow-xs overflow-hidden">
        <CardHeader className="bg-muted/20 border-b border-border/60 pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <span>Google Calendar</span>
                  {oauth.isConnected ? (
                    <Badge variant="available" className="text-[10px] font-bold bg-emerald-500 text-white">
                      🟢 Conectado via OAuth ({oauth.accountEmail})
                    </Badge>
                  ) : activeMode === "SERVICE_ACCOUNT" ? (
                    <Badge variant="available" className="text-[10px] font-bold">
                      🟢 Service Account Ativa
                    </Badge>
                  ) : (
                    <Badge variant="normal" className="text-[10px] font-bold">
                      🟡 Modo Simulação Local
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Sincronização bidirecional dos atendimentos operacionais e aulas para o calendário institucional.
                </CardDescription>
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchStatus(true)}
                disabled={isTesting}
                className="rounded-xl text-xs h-8 gap-1.5 cursor-pointer"
              >
                {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-500" />}
                <span>Testar Conexão em Tempo Real</span>
              </Button>

              <Button
                size="sm"
                onClick={handlePullEvents}
                disabled={isPullingEvents || !oauth.isConnected}
                className="rounded-xl text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                title="Puxa todos os eventos existentes na agenda do Google para a Agenda do Sistema"
              >
                {isPullingEvents ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span>Puxar do Google Calendar</span>
              </Button>

              <Button
                size="sm"
                onClick={handleSyncAll}
                disabled={isSyncingAll || (stats.pending === 0 && stats.error === 0)}
                className="rounded-xl text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer"
              >
                {isSyncingAll ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>Sincronizar Pendentes ({stats.pending + stats.error})</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          
          {/* Métricas de Sincronização */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
              <div className="flex items-center justify-between text-emerald-900 dark:text-emerald-300">
                <span className="text-xs font-bold">Sincronizados com Sucesso</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-emerald-950 dark:text-emerald-200">{stats.synced}</p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">Eventos ativos no Google Calendar</p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
              <div className="flex items-center justify-between text-amber-900 dark:text-amber-300">
                <span className="text-xs font-bold">Pendentes de Envio</span>
                <RefreshCw className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-black text-amber-950 dark:text-amber-200">{stats.pending}</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400">Aguardando fila de processamento</p>
            </div>

            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-1">
              <div className="flex items-center justify-between text-rose-900 dark:text-rose-300">
                <span className="text-xs font-bold">Erros de Sincronização</span>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-2xl font-black text-rose-950 dark:text-rose-200">{stats.error}</p>
              <p className="text-[11px] text-rose-700 dark:text-rose-400">Requerem reprocessamento manual</p>
            </div>
          </div>

          {/* Resultado do Teste ao Vivo (se executado) */}
          {testResult && (
            <div className={`p-4 rounded-2xl border text-xs space-y-2 animate-in fade-in-50 duration-200 ${
              testResult.success 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200" 
                : "bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-200"
            }`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-rose-500" />}
                <span>{testResult.success ? "Diagnóstico: Conexão Bem-Sucedida!" : "Diagnóstico: Falha na Conexão"}</span>
              </div>
              <p className="text-xs">{testResult.message || testResult.error}</p>
              {testResult.latencyMs && (
                <span className="inline-block font-mono text-[10px] bg-card/60 px-2 py-0.5 rounded-lg border border-border/50">
                  Latência da API: {testResult.latencyMs}ms
                </span>
              )}
            </div>
          )}

          {/* 2. Login Direto com a Conta Google (OAuth2) */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-blue-500/10 via-primary/5 to-card border border-blue-500/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-500" />
                  <span>Conexão Direta com a Conta Institucional Google (OAuth 2.0)</span>
                </h4>
                <p className="text-xs text-muted-foreground">
                  Autentica diretamente com a conta proprietária do calendário (ex: <code className="text-foreground font-semibold">apoio.multimidia@fapce.edu.br</code>), garantindo 100% de permissões de escrita sem restrições de domínio.
                </p>
              </div>

              {oauth.isConnected ? (
                <div className="flex items-center gap-2">
                  <Badge variant="available" className="text-xs px-3 py-1 bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold border-emerald-500/40">
                    Conectado: {oauth.accountEmail}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                    className="text-xs h-8 text-rose-500 hover:text-rose-600 rounded-xl"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1" />
                    <span>Desconectar</span>
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={handleConnectGoogleOAuth}
                  className="rounded-xl text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 shadow-md shadow-blue-600/25 shrink-0 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Conectar com o Google</span>
                </Button>
              )}
            </div>

            {/* Seletor de Calendário Ativo */}
            {oauth.isConnected && (
              <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-xs font-bold text-foreground">Selecione a Agenda Ativa para Sincronização:</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={oauth.calendarId || ""}
                      onChange={(e) => handleSelectCalendar(e.target.value)}
                      disabled={isChangingCalendar || isLoadingCalendars}
                      className="px-3 py-1.5 rounded-xl border border-border/80 bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-w-[240px]"
                    >
                      {availableCalendars.length > 0 ? (
                        availableCalendars.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.primary ? "(Principal)" : ""}
                          </option>
                        ))
                      ) : (
                        <option value={oauth.calendarId || ""}>
                          {oauth.calendarName || "Carregando agendas..."}
                        </option>
                      )}
                    </select>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchCalendars}
                      disabled={isLoadingCalendars}
                      className="h-8 px-2.5 rounded-xl text-xs"
                      title="Recarregar lista de agendas"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCalendars ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                  <span>ID Google Calendar: <code className="font-mono text-[10px] text-primary">{oauth.calendarId}</code></span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ Permissão de Escrita Ativa</span>
                </div>
              </div>
            )}
          </div>

          {/* 3. Como Criar o ID de Cliente OAuth no Google Cloud */}
          <div className="space-y-4 pt-2 border-t border-border/60">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Configuração do OAuth no Google Cloud Console
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              
              {/* Passo 1 */}
              <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-xs">
                  1
                </div>
                <h5 className="font-bold text-foreground">Criar ID do Cliente OAuth</h5>
                <p className="text-muted-foreground text-[11px]">
                  No [Google Cloud Console](https://console.cloud.google.com/), vá em <strong>Credenciais ➔ + Criar Credenciais ➔ ID do cliente OAuth</strong>.
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Tipo de aplicativo: <strong>Aplicativo da Web</strong>.
                </p>
              </div>

              {/* Passo 2 */}
              <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-xs">
                  2
                </div>
                <h5 className="font-bold text-foreground">Cole a URI de Redirecionamento</h5>
                <p className="text-muted-foreground text-[11px]">
                  Em <strong>URIs de redirecionamento autorizados</strong>, adicione esta URL exata:
                </p>
                <div className="flex items-center justify-between p-2 rounded-xl bg-muted/60 border border-border/60 font-mono text-[10px] break-all">
                  <span className="truncate">{redirectUri}</span>
                  <button
                    type="button"
                    onClick={handleCopyUri}
                    className="ml-1 p-1 hover:text-primary cursor-pointer shrink-0"
                    title="Copiar URI de Redirecionamento"
                  >
                    {copiedRedirectUri ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Passo 3 */}
              <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-xs">
                  3
                </div>
                <h5 className="font-bold text-foreground">Cole no .env e Conecte</h5>
                <p className="text-muted-foreground text-[11px]">
                  Copie o <strong>ID do cliente</strong> e a <strong>Chave secreta do cliente</strong> gerados e cole no arquivo <code className="font-mono text-primary">.env</code>. Em seguida, clique no botão azul <strong>"Conectar com o Google"</strong> acima!
                </p>
              </div>

            </div>
          </div>

        </CardContent>
      </Card>

    </div>
  );
}
