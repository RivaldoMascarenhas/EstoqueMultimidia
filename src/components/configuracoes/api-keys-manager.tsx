"use client";

import React, { useState, useEffect } from "react";
import {
  Key,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  ShieldCheck,
  Calendar,
  Lock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  role: string;
  active: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  user?: {
    name: string;
    email: string;
  };
}

export function ApiKeysManager() {
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal de Criação
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [keyRole, setKeyRole] = useState("OPERADOR");
  const [keyExpiresAt, setKeyExpiresAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal de Exibição de Token Gerado (Uma única vez)
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [generatedKeyName, setGeneratedKeyName] = useState("");
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  const fetchKeys = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/v1/api-keys");
      const json = await res.json();
      if (json.success) {
        setApiKeys(json.data);
      } else {
        toast.error(json.error || "Erro ao listar chaves de API.");
      }
    } catch {
      toast.error("Falha ao comunicar com o servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) {
      toast.error("Informe um nome para a chave de API.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/v1/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: keyName.trim(),
          role: keyRole,
          expiresAt: keyExpiresAt || null,
        }),
      });

      const json = await res.json();
      if (json.success && json.data?.token) {
        toast.success("Chave de API criada com sucesso!");
        setGeneratedToken(json.data.token);
        setGeneratedKeyName(json.data.name);
        setIsCreateOpen(false);
        setIsTokenModalOpen(true);
        setKeyName("");
        setKeyRole("OPERADOR");
        setKeyExpiresAt("");
        fetchKeys();
      } else {
        toast.error(json.error || "Erro ao criar chave de API.");
      }
    } catch {
      toast.error("Erro na requisição ao servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteKey = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir permanentemente a chave "${name}"? Todas as integrações vinculadas perderão o acesso.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/api-keys/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Chave de API excluída com sucesso.");
        fetchKeys();
      } else {
        toast.error(json.error || "Erro ao excluir chave de API.");
      }
    } catch {
      toast.error("Erro ao comunicar com o servidor.");
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/v1/api-keys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !currentActive }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        fetchKeys();
      } else {
        toast.error(json.error || "Erro ao atualizar chave de API.");
      }
    } catch {
      toast.error("Erro ao comunicar com o servidor.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setHasCopied(true);
    toast.success("Chave copiada para a área de transferência!");
    setTimeout(() => setHasCopied(false), 3000);
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-xs rounded-2xl sm:rounded-3xl border-border/80">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
          <div>
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" />
              <span>Chaves de API & Tokens de Acesso ({apiKeys.length})</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Gerencie credenciais de alta segurança armazenadas como hash SHA-256 para automações n8n, WhatsApp e integrações.
            </CardDescription>
          </div>

          <Button
            onClick={() => setIsCreateOpen(true)}
            size="sm"
            className="h-9 px-3.5 gap-1.5 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 text-white font-semibold text-xs shadow-md shadow-primary/20 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Nova Chave</span>
          </Button>
        </CardHeader>

        <CardContent className="p-0 sm:p-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-xs font-bold py-3 px-4">Nome da Chave</TableHead>
                  <TableHead className="text-xs font-bold py-3 px-4">Prefixo / Identificador</TableHead>
                  <TableHead className="text-xs font-bold py-3 px-4">Permissão (Role)</TableHead>
                  <TableHead className="text-xs font-bold py-3 px-4">Status</TableHead>
                  <TableHead className="text-xs font-bold py-3 px-4">Último Uso</TableHead>
                  <TableHead className="text-xs font-bold py-3 px-4">Criada em</TableHead>
                  <TableHead className="text-xs font-bold py-3 px-4 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                      Carregando chaves de API...
                    </TableCell>
                  </TableRow>
                ) : apiKeys.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                      Nenhuma chave de API gerada. Clique em "Criar Nova Chave" para autorizar sistemas externos.
                    </TableCell>
                  </TableRow>
                ) : (
                  apiKeys.map((key) => {
                    const isExpired = key.expiresAt && new Date(key.expiresAt) < new Date();
                    return (
                      <TableRow key={key.id} className="hover:bg-muted/20">
                        <TableCell className="font-bold text-xs text-foreground py-3 px-4">
                          {key.name}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground py-3 px-4">
                          <code className="bg-muted/50 px-2 py-0.5 rounded border border-border">
                            {key.keyPrefix}
                          </code>
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <Badge variant="outline" className="text-[10px] font-semibold">
                            {key.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          {isExpired ? (
                            <Badge variant="destructive" className="text-[10px]">
                              Expirada
                            </Badge>
                          ) : key.active ? (
                            <Badge variant="available" dot className="text-[10px]">
                              Ativa
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              Revogada
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground py-3 px-4">
                          {key.lastUsedAt
                            ? new Date(key.lastUsedAt).toLocaleString("pt-BR")
                            : "Nunca utilizada"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground py-3 px-4">
                          {new Date(key.createdAt).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(key.id, key.active)}
                              className="h-8 px-2 text-xs rounded-lg text-muted-foreground hover:text-foreground"
                              title={key.active ? "Revogar/Desativar chave" : "Ativar chave"}
                            >
                              {key.active ? "Revogar" : "Reativar"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteKey(key.id, key.name)}
                              className="h-8 w-8 p-0 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                              title="Excluir chave"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
        </CardContent>
      </Card>

      {/* Modal de Criação */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              <span>Gerar Nova Chave de API</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Esta chave permitirá acesso programático às rotas de integração com permissões configuráveis.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateKey} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Nome Descritivo / Finalidade <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Ex: Integração n8n - WhatsApp Atendimento"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                required
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Perfil de Permissão (Role)
              </label>
              <select
                value={keyRole}
                onChange={(e) => setKeyRole(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="OPERADOR">OPERADOR (Padrão para bots e devoluções)</option>
                <option value="GESTOR">GESTOR (Empréstimos, manutenções e cadastros)</option>
                <option value="ADMIN">ADMIN (Controle total da API)</option>
                <option value="CONSULTA">CONSULTA (Apenas leitura)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Data de Expiração (Opcional)
              </label>
              <Input
                type="date"
                value={keyExpiresAt}
                onChange={(e) => setKeyExpiresAt(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="rounded-xl text-xs font-semibold"
              >
                {isSubmitting ? "Gerando..." : "Gerar Chave"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Exibição Única da Chave Gerada */}
      <Dialog open={isTokenModalOpen} onOpenChange={setIsTokenModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl border-emerald-500/40">
          <DialogHeader>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <DialogTitle className="text-base font-bold">
                Chave de API Gerada com Sucesso!
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              {generatedKeyName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                <strong>Atenção:</strong> Copie e armazene este token em um local seguro agora. Por motivos de segurança, ele <strong>nunca mais será exibido</strong>.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Token Secreto de Autenticação:
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 rounded-xl bg-background border border-input font-mono text-xs text-foreground font-bold select-all break-all">
                  {generatedToken}
                </code>
                <Button
                  size="sm"
                  onClick={() => generatedToken && copyToClipboard(generatedToken)}
                  className="rounded-xl gap-1.5 h-10 px-4 text-xs font-semibold shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{hasCopied ? "Copiado!" : "Copiar"}</span>
                </Button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/40 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Como utilizar nas requisições HTTP:</p>
              <code className="block font-mono text-[11px] text-primary">
                Authorization: Bearer {generatedToken}
              </code>
              <code className="block font-mono text-[11px] text-primary">
                x-api-key: {generatedToken}
              </code>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setIsTokenModalOpen(false)}
              className="rounded-xl text-xs font-semibold w-full"
            >
              Entendi e já copiei minha chave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
