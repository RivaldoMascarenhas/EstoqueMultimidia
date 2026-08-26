"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

interface ImportParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId?: string | null;
  eventName?: string | null;
  onSuccess?: () => void;
}

export function ImportParticipantsModal({
  isOpen,
  onClose,
  eventId,
  eventName,
  onSuccess,
}: ImportParticipantsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    totalRows: number;
    createdPersons: number;
    updatedPersons: number;
    enrolledInEvent: number;
    errors: any[];
  } | null>(null);

  const handleDownloadTemplate = () => {
    const csvContent =
      "Nome,Matricula,CPF,Email,Telefone,Categoria,Observacoes\n" +
      "João da Silva,20261001,12345678901,joao.silva@fapce.edu.br,88999990001,Aluno,Turma A\n" +
      "Maria Oliveira,20261002,98765432100,maria.oliveira@fapce.edu.br,88999990002,Professor,Coordenador\n" +
      "Carlos Santos,20261003,11122233344,carlos.santos@fapce.edu.br,88999990003,Tecnico,Multimidia";

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo_importacao_pessoas.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      const ext = selected.name.split(".").pop()?.toLowerCase();
      if (ext !== "csv" && ext !== "xlsx" && ext !== "xls") {
        toast.error("Formato inválido. Selecione um arquivo CSV ou XLSX.");
        return;
      }
      setFile(selected);
      setResult(null);
    }
  };

  const handleProcessImport = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("filename", file.name);
      if (eventId) formData.append("eventId", eventId);

      const res = await fetch("/api/v1/biometrics/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Falha na importação.");
      }

      setResult(data);
      toast.success(
        `Importação concluída! ${data.createdPersons} criados, ${data.updatedPersons} atualizados.`
      );
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar planilha.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl bg-card border-border p-0 overflow-hidden">
        <DialogHeader className="p-5 border-b border-border/80 bg-muted/20">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importação em Lote de Participantes
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {eventName ? (
              <span>
                Importando e vinculando ao evento: <strong>{eventName}</strong>
              </span>
            ) : (
              <span>Importando participantes para a base central de pessoas.</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 space-y-4">
          {!result ? (
            <>
              {/* Dropzone */}
              <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 bg-muted/10 p-6 text-center hover:bg-muted/20 transition-colors">
                <Upload className="h-9 w-9 text-muted-foreground mb-2" />
                <p className="text-xs font-semibold text-foreground">
                  {file ? file.name : "Clique para selecionar ou arraste o arquivo CSV / XLSX"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Suporta arquivos .CSV e .XLSX com colunas: Nome, Matrícula, CPF, Email, Telefone, Categoria.
                </p>

                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>

              {/* Template Download Button */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                >
                  <Download className="h-3.5 w-3.5" />
                  Baixar planilha modelo (.CSV)
                </button>

                {file && (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                    <FileText className="h-3 w-3" />
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                )}
              </div>
            </>
          ) : (
            /* Results Summary */
            <div className="space-y-4">
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    Importação Finalizada com Sucesso!
                  </p>
                  <p className="text-[11px] text-emerald-600/90 dark:text-emerald-400/90">
                    {result.totalRows} registros analisados na planilha.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-card border border-border p-3">
                  <p className="text-[10px] text-muted-foreground">Novas Pessoas</p>
                  <p className="text-lg font-bold text-emerald-600">{result.createdPersons}</p>
                </div>
                <div className="rounded-lg bg-card border border-border p-3">
                  <p className="text-[10px] text-muted-foreground">Atualizadas</p>
                  <p className="text-lg font-bold text-blue-600">{result.updatedPersons}</p>
                </div>
                <div className="rounded-lg bg-card border border-border p-3">
                  <p className="text-[10px] text-muted-foreground">Inscritas no Evento</p>
                  <p className="text-lg font-bold text-primary">{result.enrolledInEvent}</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 space-y-1">
                  <p className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    {result.errors.length} avisos / linhas ignoradas
                  </p>
                  <div className="max-h-24 overflow-y-auto text-[11px] text-muted-foreground space-y-0.5 font-mono">
                    {result.errors.map((e, idx) => (
                      <p key={idx}>
                        Linha {e.row}: {e.error}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-border/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent rounded-xl transition-colors"
            >
              {result ? "Concluir" : "Cancelar"}
            </button>

            {!result ? (
              <button
                type="button"
                onClick={handleProcessImport}
                disabled={!file || isProcessing}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md transition-colors disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Importar Arquivo
              </button>
            ) : (
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 text-xs font-bold text-primary hover:bg-primary/10 rounded-xl transition-colors"
              >
                Importar Outro Arquivo
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
