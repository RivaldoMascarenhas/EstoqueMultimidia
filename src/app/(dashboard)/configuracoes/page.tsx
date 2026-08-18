"use client";

import React, { useState, useEffect } from "react";
import { 
  Settings, 
  Key, 
  Archive, 
  Package, 
  Plus, 
  Layers, 
  ShieldCheck, 
  Server, 
  CheckCircle2,
  Trash2,
  Lock,
  Copy,
  Send,
  Sparkles,
  Bot,
  Zap,
  Globe,
  Terminal,
  Code2,
  Edit,
  CalendarDays,
  Calendar
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { BoxFormModal } from "@/components/cabinet/box-form-modal";
import { DoorFormModal } from "@/components/cabinet/door-form-modal";
import { CategoryFormModal } from "@/components/categories/category-form-modal";
import { ApiKeysManager } from "@/components/configuracoes/api-keys-manager";
import { ShiftConfigManager } from "@/components/configuracoes/shift-config-manager";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { toast } from "sonner";

export default function ConfiguracoesPage() {
  const [doors, setDoors] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isBoxModalOpen, setIsBoxModalOpen] = useState(false);
  const [isDoorModalOpen, setIsDoorModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<any | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<any | null>(null);
  const [isDeleteCategoryModalOpen, setIsDeleteCategoryModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Playground de Teste de API
  const [testToken, setTestToken] = useState("");
  const [testQuery, setTestQuery] = useState("HDMI");
  const [testResult, setTestResult] = useState<any | null>(null);
  const [isTestingQuery, setIsTestingQuery] = useState(false);

  // Simulador de Webhook n8n
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvent, setWebhookEvent] = useState("LOAN_OVERDUE_ALERT");
  const [isSendingWebhook, setIsSendingWebhook] = useState(false);
  const [webhookResponse, setWebhookResponse] = useState<any | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [doorsRes, catRes] = await Promise.all([
        fetch("/api/v1/doors"),
        fetch("/api/v1/categories"),
      ]);

      const doorsJson = await doorsRes.json();
      const catJson = await catRes.json();

      if (doorsJson.success) setDoors(doorsJson.data);
      if (catJson.success) setCategories(catJson.data);
      setIsLoading(false);
    } catch (err: any) {
      toast.error("Erro ao carregar configurações.");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreateCategory = () => {
    setCategoryToEdit(null);
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: any) => {
    setCategoryToEdit(cat);
    setIsCategoryModalOpen(true);
  };

  const handleDeleteCategory = (cat: any) => {
    setCategoryToDelete(cat);
    setIsDeleteCategoryModalOpen(true);
  };

  const executeDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      const res = await fetch(`/api/v1/categories/${categoryToDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Categoria excluída com sucesso!");
        fetchData();
      } else {
        toast.error(json.error || "Erro ao excluir categoria.");
      }
    } catch (err) {
      toast.error("Erro na comunicação com o servidor.");
    }
  };

  const handleTestQuery = async () => {
    if (!testToken.trim()) {
      toast.error("Informe um Token de Autenticação / Chave de API para executar o teste.");
      return;
    }

    try {
      setIsTestingQuery(true);
      const res = await fetch(`/api/v1/external/query?q=${encodeURIComponent(testQuery)}`, {
        headers: {
          Authorization: `Bearer ${testToken.trim()}`,
        },
      });
      const json = await res.json();
      setTestResult(json);
      if (json.success) {
        toast.success("Consulta executada com sucesso!");
      } else {
        toast.error(json.error || "Erro na consulta.");
      }
    } catch (e) {
      toast.error("Erro de conexão com o endpoint.");
    } finally {
      setIsTestingQuery(false);
    }
  };

  const handleSendWebhookTest = async () => {
    if (!webhookUrl.trim()) {
      toast.error("Insira a URL do Webhook do n8n para testar o disparo.");
      return;
    }

    if (!testToken.trim()) {
      toast.error("Informe um Token de Autenticação / Chave de API para autenticar o disparo.");
      return;
    }

    try {
      setIsSendingWebhook(true);
      const res = await fetch("/api/v1/external/webhooks/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${testToken.trim()}`,
        },
        body: JSON.stringify({
          targetWebhookUrl: webhookUrl.trim(),
          eventType: webhookEvent,
        }),
      });

      const json = await res.json();
      setWebhookResponse(json);

      if (json.success) {
        toast.success("Evento de teste enviado com sucesso para o Webhook!");
      } else {
        toast.error(json.error || "Falha ao enviar para o webhook.");
      }
    } catch (e: any) {
      toast.error("Erro de requisição ao testar webhook.");
    } finally {
      setIsSendingWebhook(false);
    }
  };

  const doorOptions = doors.map((d) => ({
    id: d.id,
    code: d.code,
    name: d.name,
  }));

  const allBoxes = doors.flatMap((d) =>
    d.boxes.map((b: any) => ({
      ...b,
      doorName: d.name,
    }))
  );

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Settings className="w-6 h-6 text-primary" />
              <span>Configurações do Sistema</span>
            </h1>
            <Badge variant="admin" className="text-xs">
              ADMINISTRATIVO
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gerenciamento da estrutura física do armário (Portas e Caixas), Categorias e Integrações de API / n8n / WhatsApp.
          </p>
        </div>
      </div>

      <Tabs defaultValue="armario" className="w-full">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 max-w-xl h-auto p-1 gap-1">
          <TabsTrigger value="armario" className="text-xs font-semibold gap-1.5 py-2">
            <Archive className="w-3.5 h-3.5" />
            <span>Portas & Caixas</span>
          </TabsTrigger>
          <TabsTrigger value="categorias" className="text-xs font-semibold gap-1.5 py-2">
            <Layers className="w-3.5 h-3.5" />
            <span>Categorias</span>
          </TabsTrigger>
          <TabsTrigger value="turnos" className="text-xs font-semibold gap-1.5 py-2">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Horários de Turno</span>
          </TabsTrigger>
          <TabsTrigger value="api" className="text-xs font-semibold gap-1.5 py-2">
            <Key className="w-3.5 h-3.5" />
            <span>Chaves & n8n</span>
          </TabsTrigger>
        </TabsList>

        {/* ABA: Portas e Caixas */}
        <TabsContent value="armario" className="space-y-6 pt-4">
          {/* Seção de Portas */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  Portas do Armário Central ({doors.length})
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Portas físicas que abrigam as caixas organizadoras
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setIsDoorModalOpen(true)}
                className="gap-1.5 rounded-xl h-8 text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Porta</span>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Caixas Vinculadas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doors.map((door) => (
                    <TableRow key={door.id}>
                      <TableCell className="font-mono font-bold text-xs text-primary">
                        {door.code}
                      </TableCell>
                      <TableCell className="font-semibold text-xs text-foreground">
                        {door.name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {door.description || "-"}
                      </TableCell>
                      <TableCell className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                        {door.boxes?.length || 0} caixas
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Seção de Caixas */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  Caixas Organizadoras ({allBoxes.length})
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Caixas identificadas por QR Code para guardar patrimônios e insumos
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setIsBoxModalOpen(true)}
                className="gap-1.5 rounded-xl h-8 text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Caixa</span>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[90px]">Código</TableHead>
                    <TableHead>Nome da Caixa</TableHead>
                    <TableHead>Porta</TableHead>
                    <TableHead>Descrição / Finalidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allBoxes.map((box) => (
                    <TableRow key={box.id}>
                      <TableCell className="font-mono font-bold text-xs text-primary">
                        {box.code}
                      </TableCell>
                      <TableCell className="font-semibold text-xs text-foreground">
                        {box.name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {box.doorName}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {box.description || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA: Categorias */}
        <TabsContent value="categorias" className="space-y-4 pt-4">
          <Card className="shadow-xs rounded-2xl sm:rounded-3xl border-border/80">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
              <div>
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <span>Categorias do Catálogo ({categories.length})</span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Segmentação dos materiais, insumos e equipamentos de TI
                </CardDescription>
              </div>

              <Button
                onClick={handleOpenCreateCategory}
                size="sm"
                className="h-9 px-3.5 gap-1.5 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 text-white font-semibold text-xs shadow-md shadow-primary/20 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Categoria</span>
              </Button>
            </CardHeader>
            <CardContent className="p-0 sm:p-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="text-xs font-bold py-3 px-4">Nome</TableHead>
                      <TableHead className="text-xs font-bold py-3 px-4">Slug</TableHead>
                      <TableHead className="text-xs font-bold py-3 px-4">Descrição</TableHead>
                      <TableHead className="text-xs font-bold py-3 px-4">Itens Vinculados</TableHead>
                      <TableHead className="text-xs font-bold py-3 px-4 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                          Nenhuma categoria cadastrada. Clique em "Nova Categoria" para começar.
                        </TableCell>
                      </TableRow>
                    ) : (
                      categories.map((c) => (
                        <TableRow key={c.id} className="hover:bg-muted/20">
                          <TableCell className="font-bold text-xs text-foreground py-3 px-4">
                            {c.name}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground py-3 px-4">
                            {c.slug}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground py-3 px-4 max-w-xs truncate">
                            {c.description || "-"}
                          </TableCell>
                          <TableCell className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 py-3 px-4">
                            {c._count?.items || 0} itens
                          </TableCell>
                          <TableCell className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEditCategory(c)}
                                className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                                title="Editar categoria"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteCategory(c)}
                                className="h-8 w-8 p-0 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                                title="Excluir categoria"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA: Chaves de API & n8n / WhatsApp */}
        <TabsContent value="api" className="space-y-6 pt-4">
          
          {/* Gerenciador de Chaves de API */}
          <ApiKeysManager />

          {/* Card 2: Documentação de Rotas da API */}
          <Card className="shadow-sm rounded-3xl border-border/80">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">
                    Endpoints REST Disponíveis para Automações
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Rotas criadas para integração com n8n, Typebot e agentes de Inteligência Artificial
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                
                {/* Rota 1: Query */}
                <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="default" className="bg-emerald-600 text-white font-mono text-[10px]">
                      GET
                    </Badge>
                    <span className="font-mono text-primary font-bold">/api/v1/external/query</span>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    Consulta em tempo real de materiais, patrimônios e caixas. Retorna texto pronto para WhatsApp com formatação (*negrito*, emojis).
                  </p>
                  <div className="bg-background p-2 rounded-xl border border-border font-mono text-[10px] text-muted-foreground">
                    Ex: /api/v1/external/query?q=HDMI
                  </div>
                </div>

                {/* Rota 2: Loans */}
                <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="default" className="bg-blue-600 text-white font-mono text-[10px]">
                      POST
                    </Badge>
                    <span className="font-mono text-primary font-bold">/api/v1/external/loans</span>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    Criação automatizada de empréstimo a partir do fluxo do WhatsApp / n8n com geração de protocolo oficial.
                  </p>
                  <div className="bg-background p-2 rounded-xl border border-border font-mono text-[10px] text-muted-foreground">
                    Body: &#123; assetTag, borrowerName, destination &#125;
                  </div>
                </div>

                {/* Rota 3: Returns */}
                <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="default" className="bg-blue-600 text-white font-mono text-[10px]">
                      POST
                    </Badge>
                    <span className="font-mono text-primary font-bold">/api/v1/external/returns</span>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    Baixa de devolução rápida com conferência de avarias e reatribuição à caixa do armário.
                  </p>
                  <div className="bg-background p-2 rounded-xl border border-border font-mono text-[10px] text-muted-foreground">
                    Body: &#123; assetTag | protocol, condition, isDamaged &#125;
                  </div>
                </div>

                {/* Rota 4: Maintenance */}
                <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="default" className="bg-amber-600 text-white font-mono text-[10px]">
                      POST
                    </Badge>
                    <span className="font-mono text-primary font-bold">/api/v1/external/maintenance</span>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    Abertura de chamado técnico de manutenção / OS automática a partir de relatos no WhatsApp.
                  </p>
                  <div className="bg-background p-2 rounded-xl border border-border font-mono text-[10px] text-muted-foreground">
                    Body: &#123; assetTag, issueDescription &#125;
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>

          {/* Card 3: Playground de Consulta para WhatsApp */}
          <Card className="shadow-sm rounded-3xl border-border/80">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">
                    Playground: Simulador de Consulta para o WhatsApp
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Teste a resposta do endpoint <code className="font-mono text-primary">/api/v1/external/query</code> utilizando uma chave de API
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Chave de API / Token de Autenticação:</label>
                  <Input
                    type="password"
                    value={testToken}
                    onChange={(e) => setTestToken(e.target.value)}
                    placeholder="Cole sua chave (unifap_live_... ou chave mestre)"
                    className="h-10 rounded-xl text-xs bg-background font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Termo de Busca:</label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={testQuery}
                      onChange={(e) => setTestQuery(e.target.value)}
                      placeholder="Buscar termo (ex: HDMI, Projetor, C001, #123458)..."
                      className="h-10 rounded-xl text-xs bg-background"
                    />
                    <Button
                      onClick={handleTestQuery}
                      disabled={isTestingQuery}
                      className="rounded-xl text-xs font-semibold gap-1.5 h-10 px-5 shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isTestingQuery ? "Consultando..." : "Testar"}</span>
                    </Button>
                  </div>
                </div>
              </div>

              {testResult && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {/* Pré-visualização WhatsApp */}
                  <div className="p-4 rounded-2xl bg-emerald-950/10 border border-emerald-500/30 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                      Mensagem formatada para o WhatsApp:
                    </span>
                    <pre className="text-xs font-sans whitespace-pre-wrap text-foreground bg-card/60 p-3 rounded-xl border border-border">
                      {testResult.whatsappMessage}
                    </pre>
                  </div>

                  {/* Resposta JSON Pura */}
                  <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Payload JSON Retornado:
                    </span>
                    <pre className="text-[10px] font-mono whitespace-pre-wrap text-muted-foreground bg-background p-3 rounded-xl border border-border max-h-48 overflow-y-auto">
                      {JSON.stringify(testResult, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 4: Simulador de Disparo de Webhook para o n8n */}
          <Card className="shadow-sm rounded-3xl border-border/80">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">
                    Disparador de Webhook de Teste (n8n)
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Envie um evento de teste para o endpoint de Webhook do seu n8n para validar o fluxo
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-foreground mb-1 block">
                    URL do Webhook (n8n / Typebot):
                  </label>
                  <Input
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://n8n.seuservidor.com/webhook/unifap-alerts"
                    className="h-10 rounded-xl text-xs bg-background font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">
                    Tipo de Evento:
                  </label>
                  <select
                    value={webhookEvent}
                    onChange={(e) => setWebhookEvent(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    <option value="LOAN_OVERDUE_ALERT">Empréstimo Atrasado (Alerta)</option>
                    <option value="CRITICAL_STOCK_ALERT">Estoque Crítico / Zerado</option>
                    <option value="MAINTENANCE_CREATED">Nova OS Técnica Aberta</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSendWebhookTest}
                  disabled={isSendingWebhook}
                  className="rounded-xl text-xs font-semibold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingWebhook ? "Disparando..." : "Disparar Evento de Teste"}</span>
                </Button>
              </div>

              {webhookResponse && (
                <div className="p-3 rounded-2xl bg-muted/40 border border-border text-xs space-y-1">
                  <span className="font-bold text-foreground">Resultado do Disparo:</span>
                  <pre className="text-[10px] font-mono text-muted-foreground bg-background p-2 rounded-xl border border-border overflow-x-auto">
                    {JSON.stringify(webhookResponse, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA: Configuração de Turnos */}
        <TabsContent value="turnos" className="space-y-6 pt-4">
          <ShiftConfigManager />
        </TabsContent>
      </Tabs>

      {/* Modais */}
      <BoxFormModal
        isOpen={isBoxModalOpen}
        onClose={() => setIsBoxModalOpen(false)}
        doors={doorOptions}
        onSuccess={fetchData}
      />

      <DoorFormModal
        isOpen={isDoorModalOpen}
        onClose={() => setIsDoorModalOpen(false)}
        onSuccess={fetchData}
      />

      <CategoryFormModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categoryToEdit={categoryToEdit}
        onSuccess={fetchData}
      />

      <ConfirmModal
        isOpen={isDeleteCategoryModalOpen}
        onClose={() => setIsDeleteCategoryModalOpen(false)}
        onConfirm={executeDeleteCategory}
        title="Excluir Categoria"
        description="Tem certeza que deseja excluir esta categoria? Os itens do catálogo precisarão ser reclassificados."
        itemName={categoryToDelete?.name}
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
}
