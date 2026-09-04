"use client";

import React, { useState } from "react";
import { 
  ShieldCheck, 
  Lock, 
  UserCheck, 
  Users, 
  Key, 
  ShieldAlert, 
  Check, 
  X, 
  Info,
  Layers,
  Sparkles,
  SlidersHorizontal,
  CalendarDays,
  Package,
  Monitor,
  Camera,
  Trophy,
  History,
  FileCheck
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface PermissionRow {
  module: string;
  action: string;
  roles: {
    ADMIN: boolean;
    GESTOR: boolean;
    OPERADOR: boolean;
    ACADEMIC_SUPPORT: boolean;
    EVENTOS: boolean;
    CONSULTA: boolean;
  };
}

const PERMISSIONS_DATA: PermissionRow[] = [
  // Dashboard & Geral
  { module: "Dashboard", action: "Visualizar Painel de Controle", roles: { ADMIN: true, GESTOR: true, OPERADOR: true, ACADEMIC_SUPPORT: true, EVENTOS: true, CONSULTA: true } },
  { module: "Scanner QR", action: "Leitura e Identificação de Itens", roles: { ADMIN: true, GESTOR: true, OPERADOR: true, ACADEMIC_SUPPORT: false, EVENTOS: false, CONSULTA: true } },
  
  // Agenda e Turnos
  { module: "Agenda de Turnos", action: "Visualizar Solicitações de Aulas", roles: { ADMIN: true, GESTOR: true, OPERADOR: true, ACADEMIC_SUPPORT: true, EVENTOS: false, CONSULTA: true } },
  { module: "Agenda de Turnos", action: "Criar / Editar Solicitação de Equipamento", roles: { ADMIN: true, GESTOR: true, OPERADOR: true, ACADEMIC_SUPPORT: true, EVENTOS: false, CONSULTA: false } },
  { module: "Agenda de Turnos", action: "Alocar Patrimônio / Concluir Tarefas", roles: { ADMIN: true, GESTOR: true, OPERADOR: true, ACADEMIC_SUPPORT: false, EVENTOS: false, CONSULTA: false } },

  // Estoque & Armário
  { module: "Estoque", action: "Visualizar Catálogo e Saldo", roles: { ADMIN: true, GESTOR: true, OPERADOR: true, ACADEMIC_SUPPORT: false, EVENTOS: false, CONSULTA: true } },
  { module: "Estoque", action: "Registrar Entradas / Saídas / Transferências", roles: { ADMIN: true, GESTOR: true, OPERADOR: true, ACADEMIC_SUPPORT: false, EVENTOS: false, CONSULTA: false } },
  { module: "Armário & Caixas", action: "Visualizar Portas e Gavetas", roles: { ADMIN: true, GESTOR: true, OPERADOR: true, ACADEMIC_SUPPORT: false, EVENTOS: false, CONSULTA: true } },
  { module: "Armário & Caixas", action: "Configurar Estrutura de Portas/Caixas", roles: { ADMIN: true, GESTOR: true, OPERADOR: false, ACADEMIC_SUPPORT: false, EVENTOS: false, CONSULTA: false } },

  // Patrimônio & Circulação
  { module: "Patrimônio", action: "Consultar Equipamentos e Localização", roles: { ADMIN: true, GESTOR: true, OPERADOR: true, ACADEMIC_SUPPORT: false, EVENTOS: false, CONSULTA: true } },
  { module: "Patrimônio", action: "Cadastrar / Editar Equipamento", roles: { ADMIN: true, GESTOR: true, OPERADOR: true, ACADEMIC_SUPPORT: false, EVENTOS: false, CONSULTA: false } },
  { module: "Empréstimos", action: "Emitir Termo de Cautela", roles: { ADMIN: true, GESTOR: true, OPERADOR: true, ACADEMIC_SUPPORT: false, EVENTOS: false, CONSULTA: false } },
  { module: "Empréstimos", action: "Devolver / Renovar / Notificar WhatsApp", roles: { ADMIN: true, GESTOR: true, OPERADOR: true, ACADEMIC_SUPPORT: false, EVENTOS: false, CONSULTA: false } },
  { module: "Manutenção (OS)", action: "Abrir e Encaminhar Ordem de Serviço", roles: { ADMIN: true, GESTOR: true, OPERADOR: true, ACADEMIC_SUPPORT: false, EVENTOS: false, CONSULTA: false } },
  { module: "Manutenção (OS)", action: "Concluir / Cancelar Ordem de Serviço", roles: { ADMIN: true, GESTOR: true, OPERADOR: true, ACADEMIC_SUPPORT: false, EVENTOS: false, CONSULTA: false } },

  // Eventos & Biometria
  { module: "Eventos & Sorteios", action: "Gerenciar Eventos, Prêmios e Inscritos", roles: { ADMIN: true, GESTOR: true, OPERADOR: true, ACADEMIC_SUPPORT: false, EVENTOS: true, CONSULTA: false } },
  { module: "Eventos & Sorteios", action: "Operar Roleta de Sorteios e Telão", roles: { ADMIN: true, GESTOR: true, OPERADOR: true, ACADEMIC_SUPPORT: false, EVENTOS: true, CONSULTA: false } },
  { module: "Biometria Facial", action: "Cadastrar Face / Capturar Embedding", roles: { ADMIN: true, GESTOR: true, OPERADOR: true, ACADEMIC_SUPPORT: false, EVENTOS: true, CONSULTA: false } },
  { module: "Biometria Facial", action: "Acesso ao Laboratório de Testes Vetoriais", roles: { ADMIN: true, GESTOR: true, OPERADOR: false, ACADEMIC_SUPPORT: false, EVENTOS: false, CONSULTA: false } },

  // Gestão & Segurança
  { module: "Relatórios & KPIs", action: "Visualizar e Exportar Relatórios A4/CSV", roles: { ADMIN: true, GESTOR: true, OPERADOR: false, ACADEMIC_SUPPORT: false, EVENTOS: true, CONSULTA: true } },
  { module: "Trilha de Auditoria", action: "Inspecionar Logs do Sistema", roles: { ADMIN: true, GESTOR: true, OPERADOR: false, ACADEMIC_SUPPORT: false, EVENTOS: false, CONSULTA: true } },
  { module: "Gestão de Usuários", action: "Cadastrar / Editar Usuários e Senhas", roles: { ADMIN: true, GESTOR: false, OPERADOR: false, ACADEMIC_SUPPORT: false, EVENTOS: false, CONSULTA: false } },
  { module: "Configurações Globais", action: "Gerenciar Chaves de API e Turnos", roles: { ADMIN: true, GESTOR: false, OPERADOR: false, ACADEMIC_SUPPORT: false, EVENTOS: false, CONSULTA: false } },
];

export default function PermissoesPage() {
  const [selectedRoleTab, setSelectedRoleTab] = useState("MATRIX");

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
              <span>Matriz de Permissões & Perfis (RBAC)</span>
            </h1>
            <Badge variant="outline" className="text-[11px] font-semibold px-2 py-0.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
              6 Perfis Ativos
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Controle de acesso granular baseado em funções (Role-Based Access Control) aplicado em rotas do Next.js e endpoints de API.
          </p>
        </div>
      </div>

      {/* Visão Rápida dos Perfis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        <Card className="p-4 rounded-2xl border-purple-500/30 bg-purple-500/5 shadow-xs">
          <div className="flex items-center justify-between">
            <Badge variant="admin" className="text-[10px]">ADMIN</Badge>
            <span className="text-[10px] text-muted-foreground font-mono">Acesso Total</span>
          </div>
          <h3 className="font-bold text-sm text-foreground mt-2">Administrador Geral</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Gestão irrestrita de estoque, usuários, senhas, chaves de API, auditoria, biometria e configurações.
          </p>
        </Card>

        <Card className="p-4 rounded-2xl border-indigo-500/30 bg-indigo-500/5 shadow-xs">
          <div className="flex items-center justify-between">
            <Badge variant="gestor" className="text-[10px]">GESTOR</Badge>
            <span className="text-[10px] text-muted-foreground font-mono">Supervisão</span>
          </div>
          <h3 className="font-bold text-sm text-foreground mt-2">Gestor de Recursos</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Supervisão de estoque, patrimônio, relatórios gerenciais e manutenções, sem acesso a usuários do sistema.
          </p>
        </Card>

        <Card className="p-4 rounded-2xl border-blue-500/30 bg-blue-500/5 shadow-xs">
          <div className="flex items-center justify-between">
            <Badge variant="operador" className="text-[10px]">OPERADOR</Badge>
            <span className="text-[10px] text-muted-foreground font-mono">Operacional</span>
          </div>
          <h3 className="font-bold text-sm text-foreground mt-2">Operador de TI</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Atendimento presencial, check-in/out no scanner, circulação de empréstimos, abertura de OS e preparo de turnos.
          </p>
        </Card>

        <Card className="p-4 rounded-2xl border-amber-500/30 bg-amber-500/5 shadow-xs">
          <div className="flex items-center justify-between">
            <Badge variant="academic" className="text-[10px]">ACADEMIC_SUPPORT</Badge>
            <span className="text-[10px] text-muted-foreground font-mono">Corpo Docente</span>
          </div>
          <h3 className="font-bold text-sm text-foreground mt-2">Apoio Acadêmico</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Visão simplificada focada em solicitar equipamentos para salas de aula e acompanhar o status dos agendamentos.
          </p>
        </Card>

        <Card className="p-4 rounded-2xl border-rose-500/30 bg-rose-500/5 shadow-xs">
          <div className="flex items-center justify-between">
            <Badge variant="eventos" className="text-[10px]">EVENTOS</Badge>
            <span className="text-[10px] text-muted-foreground font-mono">Eventos & Sorteios</span>
          </div>
          <h3 className="font-bold text-sm text-foreground mt-2">Operador de Eventos</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Interface isolada dedicada ao credenciamento facial, presença em palestras, sorteio de brindes e projeção em telão.
          </p>
        </Card>

        <Card className="p-4 rounded-2xl border-slate-500/30 bg-slate-500/5 shadow-xs">
          <div className="flex items-center justify-between">
            <Badge variant="consulta" className="text-[10px]">CONSULTA</Badge>
            <span className="text-[10px] text-muted-foreground font-mono">Somente Leitura</span>
          </div>
          <h3 className="font-bold text-sm text-foreground mt-2">Auditoria & Consulta</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Acesso para visualização de relatórios, patrimônio e saldo físico. Qualquer tentativa de alteração é travada.
          </p>
        </Card>
      </div>

      {/* Tabela Interativa da Matriz RBAC */}
      <Card className="rounded-2xl border-border overflow-hidden shadow-xs">
        <CardHeader className="p-5 border-b border-border/80 bg-muted/20">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Matriz Detalhada de Funcionalidades por Perfil
          </CardTitle>
          <CardDescription className="text-xs">
            Cada coluna indica a permissão de execução de ações e acesso às telas da plataforma.
          </CardDescription>
        </CardHeader>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-bold w-[160px]">Módulo</TableHead>
                <TableHead className="text-xs font-bold min-w-[220px]">Funcionalidade / Ação</TableHead>
                <TableHead className="text-center text-xs font-bold">ADMIN</TableHead>
                <TableHead className="text-center text-xs font-bold">GESTOR</TableHead>
                <TableHead className="text-center text-xs font-bold">OPERADOR</TableHead>
                <TableHead className="text-center text-xs font-bold">ACADEMIC</TableHead>
                <TableHead className="text-center text-xs font-bold">EVENTOS</TableHead>
                <TableHead className="text-center text-xs font-bold">CONSULTA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PERMISSIONS_DATA.map((row, idx) => (
                <TableRow key={idx} className="hover:bg-muted/30">
                  <TableCell className="text-xs font-bold text-primary whitespace-nowrap">
                    {row.module}
                  </TableCell>
                  <TableCell className="text-xs font-medium text-foreground">
                    {row.action}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.roles.ADMIN ? (
                      <span className="inline-flex p-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="inline-flex p-1 rounded-full bg-rose-500/10 text-rose-500">
                        <X className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.roles.GESTOR ? (
                      <span className="inline-flex p-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="inline-flex p-1 rounded-full bg-rose-500/10 text-rose-500">
                        <X className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.roles.OPERADOR ? (
                      <span className="inline-flex p-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="inline-flex p-1 rounded-full bg-rose-500/10 text-rose-500">
                        <X className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.roles.ACADEMIC_SUPPORT ? (
                      <span className="inline-flex p-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="inline-flex p-1 rounded-full bg-muted text-muted-foreground/50">
                        <X className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.roles.EVENTOS ? (
                      <span className="inline-flex p-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="inline-flex p-1 rounded-full bg-muted text-muted-foreground/50">
                        <X className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.roles.CONSULTA ? (
                      <span className="inline-flex p-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="inline-flex p-1 rounded-full bg-muted text-muted-foreground/50">
                        <X className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
