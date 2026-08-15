"use client";

import React from "react";
import { History, Download, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

export default function MovimentacoesPage() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Movimentações & Histórico
            </h1>
            <Badge variant="normal" className="text-xs">
              Audit Log Ativo
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Histórico completo e inalterável de todas as entradas, saídas, transferências, empréstimos e manutenções.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 rounded-xl">
            <Download className="w-4 h-4 text-primary" />
            <span>Exportar CSV</span>
          </Button>
        </div>
      </div>

      <EmptyState
        icon={History}
        title="Histórico de Movimentações"
        description="Todas as alterações de saldo físico e transferências do armário alimentam automaticamente esta trilha inalterável."
        actionLabel="Voltar ao Dashboard"
        onAction={() => window.location.href = "/dashboard"}
      />
    </div>
  );
}
