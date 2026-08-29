"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Users,
  FolderTree,
  Upload,
  Search,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Camera,
  Download,
  FileSpreadsheet,
  Check,
  Sparkles,
  ShieldCheck,
  UserCheck,
  Filter,
  Layers,
  Cpu,
  Clock,
  Zap,
  FileArchive,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

interface EnrollParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
  onSuccess?: () => void;
}

export function EnrollParticipantsModal({
  isOpen,
  onClose,
  eventId,
  eventName,
  onSuccess,
}: EnrollParticipantsModalProps) {
  const [activeTab, setActiveTab] = useState<"category" | "search" | "csv">("category");

  // Tab 1: Category State
  const [categories, setCategories] = useState<
    { name: string; total: number; withBiometrics: number }[]
  >([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [requireBiometricsOnly, setRequireBiometricsOnly] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [enrollingCategory, setEnrollingCategory] = useState(false);

  // Tab 2: Individual Search State
  const [peopleList, setPeopleList] = useState<any[]>([]);
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFaceOnly, setFilterFaceOnly] = useState(false);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [enrollingPeople, setEnrollingPeople] = useState(false);

  // Tab 3: CSV / ZIP Import State & Live Feedback
  const [file, setFile] = useState<File | null>(null);
  const [importingCsv, setImportingCsv] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState<"uploading" | "processing" | "completed">("uploading");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeTipIndex, setActiveTipIndex] = useState(0);
  const [csvResult, setCsvResult] = useState<any | null>(null);

  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const tipTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const tips = [
    "Descompactando fotos e indexando metadados...",
    "Localizando participantes por Matrícula e CPF...",
    "Executando rede neural InsightFace para detecção de rostos...",
    "Gerando vetores biométricos de 512 dimensões...",
    "Inscrevendo participantes no evento e gerando bilhetes...",
    "Quase concluído, aplicando checagem de integridade...",
  ];

  // Elapsed time and tips rotation during import
  useEffect(() => {
    if (importingCsv) {
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
        e.returnValue = "A importação ainda está em andamento. Deseja realmente sair?";
      };
      window.addEventListener("beforeunload", handleBeforeUnload);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (tipTimerRef.current) clearInterval(tipTimerRef.current);
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    }
  }, [importingCsv]);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Fetch Categories
  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const res = await fetch("/api/v1/biometrics/categories");
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories || []);
      }
    } catch {
      toast.error("Erro ao carregar categorias.");
    } finally {
      setLoadingCategories(false);
    }
  };

  // Fetch People for search tab
  const fetchPeople = async () => {
    setLoadingPeople(true);
    try {
      const p = new URLSearchParams();
      if (searchQuery) p.append("query", searchQuery);
      if (filterFaceOnly) p.append("hasFace", "true");
      p.append("limit", "100");

      const res = await fetch(`/api/v1/biometrics/persons?${p.toString()}`);
      const data = await res.json();
      if (data.success) {
        setPeopleList(data.items || []);
      }
    } catch {
      toast.error("Erro ao buscar pessoas.");
    } finally {
      setLoadingPeople(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (activeTab === "category") fetchCategories();
      if (activeTab === "search") fetchPeople();
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    if (activeTab === "search") {
      const delay = setTimeout(() => {
        fetchPeople();
      }, 300);
      return () => clearTimeout(delay);
    }
  }, [searchQuery, filterFaceOnly]);

  // Tab 1 Actions
  const toggleCategory = (catName: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catName) ? prev.filter((c) => c !== catName) : [...prev, catName]
    );
  };

  const selectAllCategories = () => {
    if (selectedCategories.length === categories.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(categories.map((c) => c.name));
    }
  };

  const handleEnrollByCategory = async () => {
    if (selectedCategories.length === 0) {
      toast.error("Selecione pelo menos uma categoria.");
      return;
    }

    setEnrollingCategory(true);
    try {
      const res = await fetch(`/api/v1/events/${eventId}/participants/enroll-by-category`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories: selectedCategories,
          requireBiometricsOnly,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao inscrever participantes.");
      }

      if (data.enrolledCount > 0) {
        toast.success(
          `Sucesso! ${data.enrolledCount} pessoas foram inscritas no evento.${
            data.alreadyEnrolledCount > 0
              ? ` (${data.alreadyEnrolledCount} já estavam inscritas)`
              : ""
          }`
        );
      } else {
        toast.info("Todas as pessoas das categorias selecionadas já estavam inscritas neste evento.");
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro na inscrição.");
    } finally {
      setEnrollingCategory(false);
    }
  };

  // Tab 2 Actions
  const togglePersonSelection = (id: string) => {
    setSelectedPersonIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const selectAllVisiblePeople = () => {
    if (selectedPersonIds.length === peopleList.length) {
      setSelectedPersonIds([]);
    } else {
      setSelectedPersonIds(peopleList.map((p) => p.id));
    }
  };

  const handleEnrollSelectedPeople = async () => {
    if (selectedPersonIds.length === 0) {
      toast.error("Selecione pelo menos uma pessoa.");
      return;
    }

    setEnrollingPeople(true);
    try {
      const res = await fetch(`/api/v1/events/${eventId}/participants/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personIds: selectedPersonIds }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao inscrever pessoas selecionadas.");
      }

      toast.success(
        `${data.enrolledCount} participante(s) adicionado(s) com sucesso!${
          data.alreadyEnrolledCount > 0 ? ` (${data.alreadyEnrolledCount} já estavam inscritos)` : ""
        }`
      );

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao inscrever.");
    } finally {
      setEnrollingPeople(false);
    }
  };

  // Tab 3 Actions (CSV Import)
  const handleDownloadTemplate = () => {
    const csvContent =
      "Nome,Matricula,CPF,Email,Telefone,Categoria,Observacoes\n" +
      "João da Silva,20261001,12345678901,joao.silva@fapce.edu.br,88999990001,Aluno,Turma A\n" +
      "Maria Oliveira,20261002,98765432100,maria.oliveira@fapce.edu.br,88999990002,Professor,Coordenador\n" +
      "Carlos Santos,20261003,11122233344,carlos.santos@fapce.edu.br,88999990003,Colaborador Administrativo,TI";

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo_importacao_evento.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleProcessCsv = () => {
    if (!file) return;
    setImportingCsv(true);
    setProcessingStage("uploading");
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("filename", file.name);
    formData.append("eventId", eventId);

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
      setImportingCsv(false);
      setProcessingStage("completed");

      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.success) {
          setCsvResult(data);
          if (data.totalPhotos !== undefined) {
            toast.success(
              `Pacote concluído! ${data.photosEnrolled || 0} biometrias e ${data.enrolledInEvent || 0} participantes inscritos.`
            );
          } else {
            toast.success(
              `Importação concluída! ${data.enrolledInEvent || 0} participantes inscritos no evento.`
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
      setImportingCsv(false);
      setProcessingStage("completed");
      toast.error("Erro de conexão durante o envio do arquivo.");
    };

    xhr.send(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl bg-card border-border p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-5 border-b border-border/80 bg-muted/20">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Adicionar Participantes ao Evento
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Inscreva participantes no evento <strong>{eventName}</strong> por categoria, seleção da base ou importação de planilha.
          </DialogDescription>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-2 pt-3">
            <button
              type="button"
              onClick={() => setActiveTab("category")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "category"
                  ? "bg-primary text-white shadow-xs"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>Por Categoria (Lote)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("search")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "search"
                  ? "bg-primary text-white shadow-xs"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Buscar na Base de Pessoas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("csv")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "csv"
                  ? "bg-primary text-white shadow-xs"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Importar CSV / Excel</span>
            </button>
          </div>
        </DialogHeader>

        {/* TAB 1: POR CATEGORIA */}
        {activeTab === "category" && (
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Selecione as Categorias Desejadas:
              </span>

              <button
                type="button"
                onClick={selectAllCategories}
                className="text-xs text-primary font-semibold hover:underline"
              >
                {selectedCategories.length === categories.length ? "Desmarcar Todas" : "Selecionar Todas"}
              </button>
            </div>

            {loadingCategories ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                Carregando categorias da base...
              </div>
            ) : categories.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Nenhuma categoria encontrada com pessoas cadastradas.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                {categories.map((cat) => {
                  const isSelected = selectedCategories.includes(cat.name);
                  return (
                    <div
                      key={cat.name}
                      onClick={() => toggleCategory(cat.name)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-primary/10 border-primary shadow-xs"
                          : "bg-muted/20 border-border hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-primary border-primary text-white"
                              : "border-muted-foreground/40 bg-card"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        <div>
                          <p className="text-xs font-bold text-foreground">{cat.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {cat.total} pessoa(s) no total • {cat.withBiometrics} com biometria
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted border border-border text-foreground font-mono">
                        {cat.total}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Filter Toggle: Biometrics only */}
            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Camera className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs font-bold text-foreground">Apenas com Biometria Facial</p>
                  <p className="text-[10px] text-muted-foreground">
                    Inscreve somente as pessoas que já possuem foto biométrica cadastrada no sistema.
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={requireBiometricsOnly}
                onChange={(e) => setRequireBiometricsOnly(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-border/80">
              <span className="text-xs text-muted-foreground">
                <strong>{selectedCategories.length}</strong> categoria(s) selecionada(s)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent rounded-xl"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={selectedCategories.length === 0 || enrollingCategory}
                  onClick={handleEnrollByCategory}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {enrollingCategory ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserCheck className="w-4 h-4" />
                  )}
                  <span>Inscrever Pessoas no Evento</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BUSCA INDIVIDUAL */}
        {activeTab === "search" && (
          <div className="p-5 space-y-4">
            {/* Search Bar & Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nome, matrícula ou CPF..."
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <button
                type="button"
                onClick={() => setFilterFaceOnly(!filterFaceOnly)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl border font-semibold transition ${
                  filterFaceOnly
                    ? "bg-primary/10 border-primary text-primary"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Com Biometria</span>
              </button>

              <button
                type="button"
                onClick={selectAllVisiblePeople}
                className="text-xs text-primary font-semibold hover:underline whitespace-nowrap px-2"
              >
                {selectedPersonIds.length === peopleList.length ? "Desmarcar" : "Marcar Todos"}
              </button>
            </div>

            {/* People List */}
            {loadingPeople ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                Buscando pessoas na base...
              </div>
            ) : peopleList.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground">
                Nenhuma pessoa encontrada com os filtros informados.
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {peopleList.map((p) => {
                  const isSelected = selectedPersonIds.includes(p.id);
                  const hasFace = p.hasFaceEnrolled || (p.faceEmbeddings && p.faceEmbeddings.length > 0);

                  return (
                    <div
                      key={p.id}
                      onClick={() => togglePersonSelection(p.id)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? "bg-primary/10 border-primary shadow-xs"
                          : "bg-muted/10 border-border hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isSelected ? "bg-primary border-primary text-white" : "border-muted-foreground/40"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>

                        <div>
                          <p className="text-xs font-bold text-foreground">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {p.registration ? `Mat: ${p.registration}` : ""}
                            {p.category ? ` • ${p.category}` : ""}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          hasFace
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {hasFace ? "Biometria Ativa" : "Sem Biometria"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-border/80">
              <span className="text-xs text-muted-foreground">
                <strong>{selectedPersonIds.length}</strong> pessoa(s) selecionada(s)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent rounded-xl"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={selectedPersonIds.length === 0 || enrollingPeople}
                  onClick={handleEnrollSelectedPeople}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {enrollingPeople ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserCheck className="w-4 h-4" />
                  )}
                  <span>Inscrever Selecionados</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CSV & ZIP IMPORT */}
        {activeTab === "csv" && (
          <div className="p-5 space-y-4">
            {/* ESTADO 1: FORMULÁRIO DE SELEÇÃO */}
            {!importingCsv && !csvResult && (
              <>
                <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/80 bg-muted/10 p-6 text-center hover:bg-muted/20 transition-all">
                  {file?.name.toLowerCase().endsWith(".zip") ? (
                    <FileArchive className="h-10 w-10 text-primary mb-2 animate-bounce" />
                  ) : (
                    <Upload className="h-9 w-9 text-muted-foreground mb-2" />
                  )}
                  <p className="text-xs font-semibold text-foreground">
                    {file ? file.name : "Clique para selecionar ou arraste o arquivo (.CSV, .XLSX ou .ZIP)"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1 max-w-sm">
                    <strong>Planilha:</strong> Nome, Categoria e (Matrícula ou CPF).<br />
                    <strong>Pacote ZIP:</strong> Fotos 3x4 nomeadas por Matrícula ou CPF com inscrição automática neste evento.
                  </p>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls,.zip"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setFile(e.target.files[0]);
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>

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

            {/* ESTADO 2: PROCESSAMENTO EM ANDAMENTO */}
            {importingCsv && (
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
                          : "Processando lote e inscrevendo participantes..."}
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
                        : "IA Biometria & Inscrição no Evento"}
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
                      <span className="text-[10px] font-bold">3. Inscrição</span>
                    </div>
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {processingStage === "uploading" ? "Aguardando" : "Bilhetes & Banco"}
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

            {/* ESTADO 3: RESULTADO APÓS CONCLUSÃO */}
            {!importingCsv && csvResult && (
              <div className="space-y-4 animate-in fade-in-50 duration-300">
                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 flex items-center gap-3">
                  <CheckCircle2 className="h-7 w-7 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      Importação e Inscrição Finalizadas com Sucesso!
                    </p>
                    <p className="text-[11px] text-emerald-600/90 dark:text-emerald-400/90">
                      {csvResult.enrolledInEvent || 0} participantes foram vinculados e inscritos neste evento.
                    </p>
                  </div>
                </div>

                {/* Métricas do Pacote */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  {csvResult.totalPhotos !== undefined && (
                    <>
                      <div className="rounded-xl bg-card border border-border p-3">
                        <p className="text-[10px] text-muted-foreground">Fotos no ZIP</p>
                        <p className="text-base font-bold text-foreground">{csvResult.totalPhotos}</p>
                      </div>
                      <div className="rounded-xl bg-card border border-border p-3">
                        <p className="text-[10px] text-muted-foreground">Biometrias Geradas</p>
                        <p className="text-base font-bold text-emerald-600">{csvResult.photosEnrolled || 0}</p>
                      </div>
                    </>
                  )}
                  <div className="rounded-xl bg-card border border-border p-3">
                    <p className="text-[10px] text-muted-foreground">Inscritos no Evento</p>
                    <p className="text-base font-bold text-primary">{csvResult.enrolledInEvent || 0}</p>
                  </div>
                  <div className="rounded-xl bg-card border border-border p-3">
                    <p className="text-[10px] text-muted-foreground">Novas Pessoas</p>
                    <p className="text-base font-bold text-emerald-600">{csvResult.createdPersons || 0}</p>
                  </div>
                </div>

                {/* Erros / Inconsistências de Planilha */}
                {csvResult.errors && csvResult.errors.length > 0 && (
                  <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 space-y-1">
                    <p className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" />
                      {csvResult.errors.length} avisos na planilha
                    </p>
                    <div className="max-h-24 overflow-y-auto text-[11px] text-muted-foreground space-y-0.5 font-mono">
                      {csvResult.errors.map((e: any, idx: number) => (
                        <p key={idx}>
                          Linha {e.row}: {e.error}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Erros / Inconsistências de Fotos */}
                {csvResult.photoErrors && csvResult.photoErrors.length > 0 && (
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 space-y-1">
                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <Camera className="h-4 w-4" />
                      {csvResult.photoErrors.length} fotos não vinculadas
                    </p>
                    <div className="max-h-24 overflow-y-auto text-[11px] text-muted-foreground space-y-0.5 font-mono">
                      {csvResult.photoErrors.map((e: any, idx: number) => (
                        <p key={idx}>
                          {e.filename}: {e.error}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-border/80">
              <button
                type="button"
                onClick={onClose}
                disabled={importingCsv}
                className="px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent rounded-xl transition-colors disabled:opacity-40"
              >
                {csvResult ? "Concluir" : "Cancelar"}
              </button>

              {!csvResult ? (
                <button
                  type="button"
                  disabled={!file || importingCsv}
                  onClick={handleProcessCsv}
                  className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {importingCsv ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  <span>{importingCsv ? "Processando no Servidor..." : "Importar e Inscrever"}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setCsvResult(null);
                    setUploadProgress(0);
                    setProcessingStage("uploading");
                  }}
                  className="px-4 py-2 text-xs font-bold text-primary hover:bg-primary/10 rounded-xl transition-colors"
                >
                  Importar Outro Pacote
                </button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
