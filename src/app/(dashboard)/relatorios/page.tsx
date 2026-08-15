"use client";

import React from "react";
import { BarChart3, FileSpreadsheet, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

export default function RelatoriosPage() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Relatórios Gerenciais
            </h1>
            <Badge variant="normal" className="text-xs">
              Exportação
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Relatórios de estoque crítico, movimentações por período, empréstimos em atraso e inventário por porta/caixa.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 rounded-xl">
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Excel / CSV</span>
          </Button>
          <Button size="sm" className="gap-1.5 rounded-xl">
            <FileText className="w-4 h-4" />
            <span>Gerar PDF</span>
          </Button>
        </div>
      </div>

      <EmptyState
        icon={BarChart3}
        title="Módulo de Relatórios e Métricas - FASE 10"
        description="Na Fase 10 teremos filtros dinâmicos multidimensionais por período, categoria, solicitante e exportações automáticas."
        actionLabel="Voltar ao Dashboard"
        onAction={() => window.location.href = "/dashboard"}
      />
    </div>
  );
}
