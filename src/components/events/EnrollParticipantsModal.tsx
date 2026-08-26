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

  // Tab 3: CSV Import State
  const [file, setFile] = useState<File | null>(null);
  const [importingCsv, setImportingCsv] = useState(false);
  const [csvResult, setCsvResult] = useState<any | null>(null);

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

  const handleProcessCsv = async () => {
    if (!file) return;
    setImportingCsv(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("filename", file.name);
      formData.append("eventId", eventId);

      const res = await fetch("/api/v1/biometrics/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Falha na importação.");
      }

      setCsvResult(data);
      toast.success(
        `Importação concluída! ${data.enrolledInEvent} participantes inscritos no evento.`
      );
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar planilha.");
    } finally {
      setImportingCsv(false);
    }
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

        {/* TAB 3: CSV IMPORT */}
        {activeTab === "csv" && (
          <div className="p-5 space-y-4">
            {!csvResult ? (
              <>
                <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 bg-muted/10 p-6 text-center hover:bg-muted/20 transition-colors">
                  <Upload className="h-9 w-9 text-muted-foreground mb-2" />
                  <p className="text-xs font-semibold text-foreground">
                    {file ? file.name : "Clique para selecionar ou arraste o arquivo CSV / XLSX"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Colunas aceitas: Nome, Matrícula, CPF, Email, Telefone, Categoria.
                  </p>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
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
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      Importação Finalizada!
                    </p>
                    <p className="text-[11px] text-emerald-600/90 dark:text-emerald-400/90">
                      {csvResult.enrolledInEvent} participantes inscritos neste evento.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-border/80">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent rounded-xl"
              >
                {csvResult ? "Concluir" : "Cancelar"}
              </button>

              {!csvResult ? (
                <button
                  type="button"
                  disabled={!file || importingCsv}
                  onClick={handleProcessCsv}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {importingCsv ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  <span>Importar e Inscrever</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setCsvResult(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-primary hover:bg-primary/10 rounded-xl"
                >
                  Importar Outro
                </button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
