"use client";

import React from "react";
import { Handshake, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

export default function EmprestimosPage() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Empréstimos & Devoluções
            </h1>
            <Badge variant="loaned" className="text-xs">
              Controle de Prazos
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Registro de empréstimo de equipamentos para professores e setores com controle de retorno e triagem de avarias.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-1.5 rounded-xl">
            <Plus className="w-4 h-4" />
            <span>Novo Empréstimo</span>
          </Button>
        </div>
      </div>

      <EmptyState
        icon={Handshake}
        title="Módulo de Empréstimos - FASE 6"
        description="Na Fase 6 teremos o fluxo completo de checkout, prazos, alerta de atraso e retorno com opção de marcar equipamento danificado para manutenção."
        actionLabel="Voltar ao Dashboard"
        onAction={() => window.location.href = "/dashboard"}
      />
    </div>
  );
}
