"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  UserPlus, 
  Shield, 
  ShieldCheck,
  Key, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Search
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { UserFormModal } from "@/components/users/user-form-modal";
import { UserPasswordModal } from "@/components/users/user-password-modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { toast } from "sonner";

export default function UsuariosPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Modais
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<any | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [userForPassword, setUserForPassword] = useState<any | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any | null>(null);

  const isAnyModalOpen = isFormModalOpen || isPasswordModalOpen || isDeleteModalOpen;

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/v1/users");
      const json = await res.json();
      if (json.success) {
        setUsers(json.data);
      }
    } catch (e) {
      console.error("Erro ao carregar usuários:", e);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Sincronização automática em segundo plano a cada 15s
  useAutoRefresh(fetchUsers, {
    intervalMs: 15000,
    enabled: !isAnyModalOpen,
  });

  const handleOpenCreate = () => {
    setUserToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (user: any) => {
    setUserToEdit(user);
    setIsFormModalOpen(true);
  };

  const handleOpenPassword = (user: any) => {
    setUserForPassword(user);
    setIsPasswordModalOpen(true);
  };

  const handleOpenDelete = (user: any) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const executeDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      const res = await fetch(`/api/v1/users/${userToDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (json.success) {
        toast.success(json.message || "Acesso de usuário atualizado com sucesso!");
        fetchUsers();
      } else {
        toast.error(json.error || "Erro ao remover usuário.");
      }
    } catch (e) {
      toast.error("Erro na comunicação com o servidor.");
    }
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const gestorCount = users.filter((u) => u.role === "GESTOR").length;
  const operadorCount = users.filter((u) => u.role === "OPERADOR").length;

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300 pb-12">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-primary/15 via-blue-600/10 to-transparent border border-primary/20 backdrop-blur-md shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Governança & Segurança • UniFAP
            </span>
            <Badge variant="admin" className="text-xs">
              FASE 12 Ativa
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Gestão de Usuários & Acessos
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
            Gerenciamento de credenciais, controle de acesso baseado em papéis (RBAC) e auditoria de ações da equipe de TI.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleOpenCreate}
            size="sm"
            className="rounded-xl text-xs h-9 bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20 gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Novo Usuário</span>
          </Button>
        </div>
      </div>

      {/* 4 Cards de Métricas de Usuários */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="rounded-2xl border-border/80 p-4">
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Total de Membros</span>
          <p className="text-2xl font-extrabold text-foreground mt-0.5">{totalUsers}</p>
          <span className="text-[10px] text-muted-foreground">Equipe de TI UniFAP</span>
        </Card>

        <Card className="rounded-2xl border-border/80 p-4 bg-rose-500/5 border-rose-500/20">
          <span className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400">Administradores</span>
          <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">{adminCount}</p>
          <span className="text-[10px] text-muted-foreground">Acesso irrestrito ao sistema</span>
        </Card>

        <Card className="rounded-2xl border-border/80 p-4 bg-blue-500/5 border-blue-500/20">
          <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400">Gestores de TI</span>
          <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">{gestorCount}</p>
          <span className="text-[10px] text-muted-foreground">Gestão de caixas e relatórios</span>
        </Card>

        <Card className="rounded-2xl border-border/80 p-4 bg-emerald-500/5 border-emerald-500/20">
          <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Operadores Ativos</span>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{operadorCount}</p>
          <span className="text-[10px] text-muted-foreground">Circulação e empréstimos diários</span>
        </Card>
      </div>

      {/* Tabela de Usuários */}
      <Card className="rounded-3xl border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="p-5 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
          <div>
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <span>Colaboradores Cadastrados ({filteredUsers.length})</span>
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Usuários autorizados a operar o sistema de patrimônio e armário físico
            </CardDescription>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, e-mail..."
              className="pl-9 h-9 rounded-xl text-xs bg-background shadow-xs"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-bold w-[220px]">Colaborador</TableHead>
                <TableHead className="text-xs font-bold">Perfil (RBAC)</TableHead>
                <TableHead className="text-xs font-bold">Status</TableHead>
                <TableHead className="text-xs font-bold text-center">Empréstimos</TableHead>
                <TableHead className="text-xs font-bold text-center">Movimentações</TableHead>
                <TableHead className="text-xs font-bold text-center">Chamados OS</TableHead>
                <TableHead className="text-xs font-bold text-right pr-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/20">
                  
                  {/* Nome e E-mail com Avatar */}
                  <TableCell className="text-xs py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-500 font-black text-sm text-white shadow-xs overflow-hidden ring-1 ring-primary/20">
                        <span>{user.name ? user.name.charAt(0).toUpperCase() : "U"}</span>
                        {user.avatarUrl && (
                          <img
                            src={user.avatarUrl}
                            alt={user.name}
                            className="absolute inset-0 h-full w-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                            }}
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <strong className="text-foreground text-xs block truncate">{user.name}</strong>
                        <span className="text-[11px] text-muted-foreground font-mono truncate block">{user.email}</span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Role */}
                  <TableCell className="text-xs">
                    {user.role === "ACADEMIC_SUPPORT" ? (
                      <Badge variant="academic" className="text-[10px] font-bold">
                        ACADÊMICO
                      </Badge>
                    ) : user.role === "EVENTOS" ? (
                      <Badge variant="eventos" className="text-[10px] font-bold">
                        EVENTOS
                      </Badge>
                    ) : user.role === "ADMIN" ? (
                      <Badge variant="admin" className="text-[10px] font-bold">
                        ADMIN
                      </Badge>
                    ) : user.role === "GESTOR" ? (
                      <Badge variant="gestor" className="text-[10px] font-bold">
                        GESTOR
                      </Badge>
                    ) : user.role === "OPERADOR" ? (
                      <Badge variant="operador" className="text-[10px] font-bold">
                        OPERADOR
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-bold">
                        CONSULTA
                      </Badge>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell className="text-xs">
                    {user.active ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                        <XCircle className="w-3.5 h-3.5" />
                        Inativo
                      </span>
                    )}
                  </TableCell>

                  {/* Empréstimos */}
                  <TableCell className="text-xs text-center font-mono font-bold">
                    {user._count?.loansCreated || 0}
                  </TableCell>

                  {/* Movimentações */}
                  <TableCell className="text-xs text-center font-mono font-bold">
                    {user._count?.movements || 0}
                  </TableCell>

                  {/* OS */}
                  <TableCell className="text-xs text-center font-mono font-bold">
                    {user._count?.maintenances || 0}
                  </TableCell>

                  {/* Ações */}
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenPassword(user)}
                        className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-amber-500 cursor-pointer"
                        title="Redefinir Senha"
                      >
                        <Key className="w-3.5 h-3.5" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(user)}
                        className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-primary cursor-pointer"
                        title="Editar Usuário"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDelete(user)}
                        className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-rose-500 cursor-pointer"
                        title="Desativar / Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>

                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Matriz Visual de Permissões RBAC */}
      <Card className="rounded-3xl border-border/80 shadow-sm">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Matriz de Perfis & Controle de Acesso (RBAC)
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Definição de competências e permissões para cada nível de autorização no sistema
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            
            {/* ADMIN */}
            <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="admin" className="font-bold text-[10px]">ADMIN</Badge>
                <span className="text-[10px] text-muted-foreground font-mono">Nível 4</span>
              </div>
              <h4 className="text-xs font-bold text-foreground">Administrador do Sistema</h4>
              <ul className="text-[11px] text-muted-foreground space-y-1">
                <li>✓ Gestão de usuários e senhas</li>
                <li>✓ Configuração de portas e caixas</li>
                <li>✓ Geração de chaves de API e webhooks</li>
                <li>✓ Acesso a todos os relatórios e logs</li>
              </ul>
            </div>

            {/* GESTOR */}
            <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="gestor" className="font-bold text-[10px]">GESTOR</Badge>
                <span className="text-[10px] text-muted-foreground font-mono">Nível 3</span>
              </div>
              <h4 className="text-xs font-bold text-foreground">Gestor / Supervisor de TI</h4>
              <ul className="text-[11px] text-muted-foreground space-y-1">
                <li>✓ Cadastro de novos itens no catálogo</li>
                <li>✓ Homologação de inventário físico</li>
                <li>✓ Emissão de relatórios gerenciais</li>
                <li>✓ Aprovação de custos de manutenção</li>
              </ul>
            </div>

            {/* OPERADOR */}
            <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="operador" className="font-bold text-[10px]">OPERADOR</Badge>
                <span className="text-[10px] text-muted-foreground font-mono">Nível 2</span>
              </div>
              <h4 className="text-xs font-bold text-foreground">Técnico Operador de Suporte</h4>
              <ul className="text-[11px] text-muted-foreground space-y-1">
                <li>✓ Empréstimos e devoluções</li>
                <li>✓ Leitura via Scanner QR Code</li>
                <li>✓ Movimentação de estoque (entradas/baixas)</li>
                <li>✓ Abertura e conclusão de OS técnica</li>
              </ul>
            </div>

            {/* EVENTOS */}
            <div className="p-4 rounded-2xl border border-purple-500/30 bg-purple-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="eventos" className="font-bold text-[10px]">EVENTOS</Badge>
                <span className="text-[10px] text-muted-foreground font-mono">Nível 1.8</span>
              </div>
              <h4 className="text-xs font-bold text-foreground">Operador de Eventos</h4>
              <ul className="text-[11px] text-muted-foreground space-y-1">
                <li>✓ Gestão de eventos e participantes</li>
                <li>✓ Presença facial e check-in manual</li>
                <li>✓ Cadastro de prêmios e sorteios</li>
                <li>✓ Operação de telão e relatórios</li>
                <li>✗ Bloqueado para estoque e TI</li>
              </ul>
            </div>

            {/* ACADEMIC_SUPPORT */}
            <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="academic" className="font-bold text-[10px]">ACADÊMICO</Badge>
                <span className="text-[10px] text-muted-foreground font-mono">Nível 1.5</span>
              </div>
              <h4 className="text-xs font-bold text-foreground">Apoio Acadêmico / Secretaria</h4>
              <ul className="text-[11px] text-muted-foreground space-y-1">
                <li>✓ Criação de solicitações na agenda</li>
                <li>✓ Edição das suas próprias solicitações</li>
                <li>✓ Consulta de salas e equipamentos</li>
                <li>✗ Bloqueado para estoque e manutenção</li>
              </ul>
            </div>

            {/* CONSULTA */}
            <div className="p-4 rounded-2xl border border-border bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-bold text-[10px]">CONSULTA</Badge>
                <span className="text-[10px] text-muted-foreground font-mono">Nível 1</span>
              </div>
              <h4 className="text-xs font-bold text-foreground">Apenas Consulta</h4>
              <ul className="text-[11px] text-muted-foreground space-y-1">
                <li>✓ Visualização do armário físico</li>
                <li>✓ Consulta de saldo de materiais</li>
                <li>✓ Busca de patrimônios e status</li>
                <li>✗ Sem permissão para baixas ou edições</li>
              </ul>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Modais */}
      <UserFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        userToEdit={userToEdit}
        onSuccess={fetchUsers}
      />

      <UserPasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        user={userForPassword}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={executeDeleteUser}
        title="Desativar ou Excluir Usuário"
        description="Tem certeza que deseja remover ou revogar o acesso deste colaborador no sistema? Ele perderá imediatamente a permissão de login."
        itemName={userToDelete ? `${userToDelete.name} (${userToDelete.email})` : undefined}
        confirmText="Sim, Desativar"
        cancelText="Cancelar"
        variant="danger"
      />

    </div>
  );
}
