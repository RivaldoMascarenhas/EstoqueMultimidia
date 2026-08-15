"use client";

import React from "react";
import { Users, UserPlus, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

export default function UsuariosPage() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Gestão de Usuários & Acessos
            </h1>
            <Badge variant="admin" className="text-xs">
              ADMIN / GESTOR
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gerenciamento de membros da equipe de TI (Rivaldo, Rodrigo, Thomas, Pedro), criação de novos usuários e controle RBAC.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-1.5 rounded-xl">
            <UserPlus className="w-4 h-4" />
            <span>Novo Usuário</span>
          </Button>
        </div>
      </div>

      <EmptyState
        icon={Users}
        title="Gestão de Usuários e Permissões"
        description="Controle os níveis de acesso (ADMIN, GESTOR, OPERADOR, CONSULTA) de forma segura diretamente no backend."
        actionLabel="Voltar ao Dashboard"
        onAction={() => window.location.href = "/dashboard"}
      />
    </div>
  );
}
