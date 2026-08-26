"use client";

import React, { useState } from "react";
import { FileSpreadsheet, Upload, Download, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { ImportParticipantsModal } from "@/components/biometria/ImportParticipantsModal";

export default function BiometriaImportacaoPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6 text-primary" />
          Central de Importação em Lote
        </h1>
        <p className="text-xs text-muted-foreground">
          Importação massiva de participantes e atualização de cadastros via planilhas CSV e Excel (XLSX).
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4 shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <FileSpreadsheet className="h-8 w-8" />
        </div>

        <div className="max-w-md mx-auto space-y-1">
          <h2 className="text-base font-bold text-foreground">Importar Arquivo de Participantes</h2>
          <p className="text-xs text-muted-foreground">
            Você pode importar listas com 50+, 100+ ou 500+ registros. O processamento é realizado de forma controlada e sem bloquear o sistema.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors shadow-md"
        >
          <Upload className="h-4 w-4" />
          Selecionar Planilha para Importar
        </button>
      </div>

      <ImportParticipantsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
