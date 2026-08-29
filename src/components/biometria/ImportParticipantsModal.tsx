"use client";

import React, { useState, useEffect, useRef } from "react";
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
  FileArchive,
  Camera,
  Cpu,
  Clock,
  Sparkles,
  ShieldCheck,
  Zap,
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState<"uploading" | "processing" | "completed">("uploading");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeTipIndex, setActiveTipIndex] = useState(0);

  const [result, setResult] = useState<{
    totalRows?: number;
    createdPersons?: number;
    updatedPersons?: number;
    enrolledInEvent?: number;
    totalPhotos?: number;
    photosEnrolled?: number;
    photoErrors?: Array<{ filename: string; error: string }>;
    errors?: any[];
  } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const tipTimerRef = useRef<NodeJS.Timeout | null>(null);

  const tips = [
    "Descompactando fotos e indexando metadados...",
    "Localizando participantes por Matrícula e CPF...",
    "Executando rede neural InsightFace para detecção de rostos...",
    "Gerando vetores biométricos de 512 dimensões...",
    "Salvando embeddings faciais no banco vetorial PostgreSQL...",
    "Quase concluído, aplicando checagem de integridade...",
  ];

  // Elapsed time and tips rotation during processing
  useEffect(() => {
    if (isProcessing) {
      setElapsedSeconds(0);
      setActiveTipIndex(0);

      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);

      tipTimerRef.current = setInterval(() => {
        setActiveTipIndex((prev) => (prev + 1) % tips.length);
      }, 4000);

      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = "A importação em lote ainda está em andamento. Deseja realmente sair?";
      };
      window.addEventListener("beforeunload", handleBeforeUnload);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (tipTimerRef.current) clearInterval(tipTimerRef.current);
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    }
  }, [isProcessing]);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

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
      if (ext !== "csv" && ext !== "xlsx" && ext !== "xls" && ext !== "zip") {
        toast.error("Formato inválido. Selecione um arquivo CSV, XLSX ou pacote ZIP.");
        return;
      }
      setFile(selected);
      setResult(null);
      setUploadProgress(0);
    }
  };

  const handleProcessImport = () => {
    if (!file) return;
    setIsProcessing(true);
    setProcessingStage("uploading");
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("filename", file.name);
    if (eventId) formData.append("eventId", eventId);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/v1/biometrics/import");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
        if (percent >= 100) {
          setProcessingStage("processing");
        }
      }
    };

    xhr.onload = () => {
      setIsProcessing(false);
      setProcessingStage("completed");

      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.success) {
          setResult(data);
          if (data.totalPhotos !== undefined) {
            toast.success(
              `Pacote concluído! ${data.photosEnrolled || 0} fotos e biometrias vinculadas.`
            );
          } else {
            toast.success(
              `Importação concluída! ${data.createdPersons || 0} criados, ${data.updatedPersons || 0} atualizados.`
            );
          }
          if (onSuccess) onSuccess();
        } else {
          toast.error(data.error || "Falha ao processar arquivo no servidor.");
        }
      } catch {
        toast.error("Erro inesperado na resposta do servidor.");
      }
    };

    xhr.onerror = () => {
      setIsProcessing(false);
      setProcessingStage("completed");
      toast.error("Erro de conexão durante o envio do arquivo.");
    };

    xhr.send(formData);
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setUploadProgress(0);
    setProcessingStage("uploading");
  };

  const isZip = file?.name.toLowerCase().endsWith(".zip");

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!isProcessing && !open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-xl bg-card border-border p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-5 border-b border-border/80 bg-muted/20">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Central de Importação em Lote
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {eventName ? (
              <span>
                Importando e vinculando ao evento: <strong>{eventName}</strong>
              </span>
            ) : (
              <span>Importação massiva de participantes, fotos 3x4 e processamento biométrico.</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 space-y-4">
          {/* ESTADO 1: FORMULÁRIO DE SELEÇÃO DE ARQUIVO */}
          {!isProcessing && !result && (
            <>
              {/* Dropzone */}
              <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/80 bg-muted/10 p-6 text-center hover:bg-muted/20 transition-all">
                {isZip ? (
                  <FileArchive className="h-10 w-10 text-primary mb-2 animate-bounce" />
                ) : (
                  <Upload className="h-9 w-9 text-muted-foreground mb-2" />
                )}
                <p className="text-xs font-semibold text-foreground">
                  {file ? file.name : "Clique para selecionar ou arraste o arquivo (.CSV, .XLSX ou .ZIP)"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-sm">
                  <strong>Planilha:</strong> Colunas Nome, Categoria, Matrícula/CPF.<br />
                  <strong>Pacote ZIP:</strong> Fotos 3x4 nomeadas por Matrícula (ex: <code className="text-primary font-mono">20261001.jpg</code>) ou CPF (ex: <code className="text-primary font-mono">12345678901.jpg</code>).
                </p>

                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.zip"
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
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                )}
              </div>
            </>
          )}

          {/* ESTADO 2: PROCESSAMENTO EM ANDAMENTO (FEEDBACK E BARRA DE PROGRESSO) */}
          {isProcessing && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 space-y-5 animate-in fade-in-50 duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                    <Cpu className="h-5 w-5 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      {processingStage === "uploading"
                        ? "Enviando arquivo para o servidor..."
                        : "Processando lote e inteligência biométrica..."}
                      <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Por favor, aguarde. Não feche nem recarregue a página.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-muted-foreground bg-background px-3 py-1.5 rounded-lg border border-border">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  {formatTime(elapsedSeconds)}
                </div>
              </div>

              {/* Barra de Progresso */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-foreground">
                  <span>
                    {processingStage === "uploading"
                      ? `Upload: ${uploadProgress}%`
                      : "IA Biometria & Indexação Vetorial"}
                  </span>
                  <span className="text-muted-foreground font-mono">
                    {processingStage === "uploading" ? `${uploadProgress}%` : "Em execução..."}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/60">
                  {processingStage === "uploading" ? (
                    <div
                      className="h-full bg-primary transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  ) : (
                    <div className="h-full bg-gradient-to-r from-primary via-blue-500 to-emerald-500 w-full animate-pulse" />
                  )}
                </div>
              </div>

              {/* Etapas do Pipeline */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-primary/10 text-center">
                <div className="rounded-xl bg-background/80 border border-border p-2.5">
                  <div className="flex items-center justify-center gap-1 text-emerald-600 mb-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold">1. Upload</span>
                  </div>
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {uploadProgress >= 100 ? "Concluído" : `${uploadProgress}%`}
                  </p>
                </div>

                <div className="rounded-xl bg-background/80 border border-border p-2.5">
                  <div className="flex items-center justify-center gap-1 text-primary mb-1">
                    <Zap className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold">2. Análise IA</span>
                  </div>
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {processingStage === "uploading" ? "Aguardando" : "InsightFace 512D"}
                  </p>
                </div>

                <div className="rounded-xl bg-background/80 border border-border p-2.5">
                  <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold">3. Gravação</span>
                  </div>
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {processingStage === "uploading" ? "Aguardando" : "pgvector"}
                  </p>
                </div>
              </div>

              {/* Mensagem rotativa de feedback */}
              <div className="rounded-xl bg-background/60 p-3 border border-border/60 text-center">
                <p className="text-xs text-foreground font-medium transition-all duration-300">
                  💡 {tips[activeTipIndex]}
                </p>
              </div>
            </div>
          )}

          {/* ESTADO 3: RESULTADO APÓS A CONCLUSÃO */}
          {!isProcessing && result && (
            <div className="space-y-4 animate-in fade-in-50 duration-300">
              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 flex items-center gap-3">
                <CheckCircle2 className="h-7 w-7 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    Importação Finalizada com Sucesso!
                  </p>
                  <p className="text-[11px] text-emerald-600/90 dark:text-emerald-400/90">
                    O processamento em lote foi concluído pelo servidor em {formatTime(elapsedSeconds)}.
                  </p>
                </div>
              </div>

              {/* Métricas do Pacote */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                {result.totalPhotos !== undefined && (
                  <>
                    <div className="rounded-xl bg-card border border-border p-3">
                      <p className="text-[10px] text-muted-foreground">Fotos no ZIP</p>
                      <p className="text-base font-bold text-foreground">{result.totalPhotos}</p>
                    </div>
                    <div className="rounded-xl bg-card border border-border p-3">
                      <p className="text-[10px] text-muted-foreground">Biometrias Geradas</p>
                      <p className="text-base font-bold text-emerald-600">{result.photosEnrolled || 0}</p>
                    </div>
                  </>
                )}
                <div className="rounded-xl bg-card border border-border p-3">
                  <p className="text-[10px] text-muted-foreground">Novas Pessoas</p>
                  <p className="text-base font-bold text-emerald-600">{result.createdPersons || 0}</p>
                </div>
                <div className="rounded-xl bg-card border border-border p-3">
                  <p className="text-[10px] text-muted-foreground">Atualizadas</p>
                  <p className="text-base font-bold text-blue-600">{result.updatedPersons || 0}</p>
                </div>
              </div>

              {/* Erros / Inconsistências de Planilha */}
              {result.errors && result.errors.length > 0 && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 space-y-1">
                  <p className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    {result.errors.length} avisos na planilha
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

              {/* Erros / Inconsistências de Fotos */}
              {result.photoErrors && result.photoErrors.length > 0 && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 space-y-1">
                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Camera className="h-4 w-4" />
                    {result.photoErrors.length} fotos não vinculadas
                  </p>
                  <div className="max-h-24 overflow-y-auto text-[11px] text-muted-foreground space-y-0.5 font-mono">
                    {result.photoErrors.map((e, idx) => (
                      <p key={idx}>
                        {e.filename}: {e.error}
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
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent rounded-xl transition-colors disabled:opacity-40"
            >
              {result ? "Concluir" : "Cancelar"}
            </button>

            {!result ? (
              <button
                type="button"
                onClick={handleProcessImport}
                disabled={!file || isProcessing}
                className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md transition-colors disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {isProcessing ? "Processando no Servidor..." : "Importar Arquivo"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 text-xs font-bold text-primary hover:bg-primary/10 rounded-xl transition-colors"
              >
                Importar Outro Pacote
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
