"use client";

import React from "react";
import { Wrench, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

export default function ManutencaoPage() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Manutenção & Reparos
            </h1>
            <Badge variant="maintenance" className="text-xs">
              Ordens de Serviço
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Controle de equipamentos com avarias, envio para assistência, laudos técnicos e custos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-1.5 rounded-xl">
            <Plus className="w-4 h-4" />
            <span>Abrir Chamado</span>
          </Button>
        </div>
      </div>

      <EmptyState
        icon={Wrench}
        title="Módulo de Manutenção - FASE 7"
        description="Na Fase 7 teremos a abertura de OS, bloqueio de empréstimo para itens danificados e retorno com realocação física em caixa do armário."
        actionLabel="Voltar ao Dashboard"
        onAction={() => window.location.href = "/dashboard"}
      />
    </div>
  );
}
