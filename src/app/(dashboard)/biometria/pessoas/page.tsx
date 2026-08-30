"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Users,
  Search,
  Plus,
  Camera,
  Gauge,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  RefreshCw,
  Sparkles,
  Filter,
} from "lucide-react";
import { PersonFormModal } from "@/components/biometria/PersonFormModal";
import { BiometricEnrollModal } from "@/components/biometria/BiometricEnrollModal";
import { TestBiometricModal } from "@/components/biometria/TestBiometricModal";
import { ImportParticipantsModal } from "@/components/biometria/ImportParticipantsModal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { toast } from "sonner";

function PessoasContent() {
  const { data: session } = useSession();
  const userRole = session?.user?.role || "OPERADOR";
  const isReadOnly = userRole === "CONSULTA";

  const searchParams = useSearchParams();
  const initialSearch = searchParams?.get("search") || searchParams?.get("query") || "";

  const [persons, setPersons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [hasFaceFilter, setHasFaceFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [isTestOpen, setIsTestOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);

  const isAnyModalOpen = isFormOpen || isEnrollOpen || isTestOpen || isImportOpen;

  // Custom Delete Confirm State
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    itemName?: string;
    confirmText?: string;
    variant?: "danger" | "warning";
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  const fetchPersons = async (isInitial: boolean | unknown = false) => {
    if (isInitial === true) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("query", searchQuery);
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      if (hasFaceFilter === "true") params.append("hasFace", "true");
      if (hasFaceFilter === "false") params.append("hasFace", "false");
      params.append("page", String(page));
      params.append("limit", "15");

      const res = await fetch(`/api/v1/biometrics/persons?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setPersons(data.items);
        setTotalPages(data.totalPages);
        setTotalItems(data.total);
      }
    } catch {
      if (isInitial === true) toast.error("Erro ao carregar lista de participantes.");
    } finally {
      if (isInitial === true) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersons(true);
  }, [page, hasFaceFilter, categoryFilter]);

  // Sincronização automática em segundo plano a cada 10s
  useAutoRefresh(() => fetchPersons(false), {
    intervalMs: 10000,
    enabled: !isAnyModalOpen && !confirmModalState.isOpen,
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPersons(true);
  };

  const handleDeletePerson = (person: any) => {
    setConfirmModalState({
      isOpen: true,
      title: "Desativar Cadastro",
      description: `Deseja realmente desativar o cadastro de "${person.name}"? A pessoa não aparecerá mais em novas inscrições de eventos até ser reativada.`,
      itemName: `👤 ${person.name} (${person.category || "Participante"})`,
      confirmText: "Desativar Cadastro",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/v1/biometrics/persons/${person.id}`, {
            method: "DELETE",
          });
          const data = await res.json();
          if (data.success) {
            toast.success("Participante desativado.");
            fetchPersons();
          } else {
            toast.error(data.error || "Erro ao desativar.");
          }
        } catch {
          toast.error("Erro na requisição.");
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Pessoas & Cadastro Biométrico
            </h1>
            {isReadOnly && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-bold text-sky-600 dark:text-sky-400 border border-sky-500/20">
                Modo Consulta
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Base central unificada de participantes, alunos, professores e dados biométricos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isReadOnly && (
            <button
              onClick={() => setIsImportOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-foreground bg-card border border-border hover:bg-accent rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Importar Lote
            </button>
          )}

          <button
            onClick={() => {
              setSelectedPerson(null);
              setIsTestOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-foreground bg-card border border-border hover:bg-accent rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            <Gauge className="h-4 w-4 text-sky-500" />
            Testar Biometria
          </button>

          {!isReadOnly && (
            <button
              onClick={() => {
                setSelectedPerson(null);
                setIsFormOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Nova Pessoa
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, matrícula, CPF ou e-mail..."
              className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </form>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={hasFaceFilter}
              onChange={(e) => {
                setHasFaceFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            >
              <option value="all">Todas as Biometrias</option>
              <option value="true">Com Face Cadastrada</option>
              <option value="false">Sem Face Cadastrada</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            >
              <option value="all">Todas as Categorias</option>
              <option value="Aluno">Aluno</option>
              <option value="Professor">Professor</option>
              <option value="Colaborador Administrativo">Colaborador Administrativo</option>
              <option value="Técnico Administrativo">Técnico Administrativo</option>
              <option value="Geral">Geral</option>
              <option value="Convidado">Convidado</option>
              <option value="Externo">Externo</option>
            </select>

            <button
              onClick={fetchPersons}
              className="p-2 rounded-xl border border-border hover:bg-accent text-muted-foreground transition-colors"
              title="Recarregar dados"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Persons Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-semibold">
                <th className="py-3 px-4">Participante</th>
                <th className="py-3 px-4">Matrícula</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4 text-center">Status Facial</th>
                <th className="py-3 px-4 text-center">Eventos</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 opacity-50" />
                    Carregando participantes...
                  </td>
                </tr>
              ) : persons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    Nenhum participante encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                persons.map((person) => (
                  <tr key={person.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">
                      <div>
                        <p className="font-bold">{person.name}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-muted-foreground">
                      <div>
                        <p className="font-semibold text-foreground">{person.registration || "—"}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border/60">
                        {person.category || "Geral"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {person.hasFaceEnrolled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3" />
                          Cadastrada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-500/10 text-slate-500 border border-slate-500/20">
                          <XCircle className="h-3 w-3" />
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center text-muted-foreground font-mono">
                      {person.participationsCount || 0}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!isReadOnly && (
                          <button
                            onClick={() => {
                              setSelectedPerson(person);
                              setIsEnrollOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                            title={person.hasFaceEnrolled ? "Atualizar biometria" : "Cadastrar biometria"}
                          >
                            <Camera className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedPerson(person);
                            setIsTestOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-colors cursor-pointer"
                          title="Testar biometria 1:1"
                        >
                          <Gauge className="h-4 w-4" />
                        </button>
                        {!isReadOnly && (
                          <button
                            onClick={() => {
                              setSelectedPerson(person);
                              setIsFormOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent transition-colors cursor-pointer"
                            title="Editar cadastro"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                        {!isReadOnly && (
                          <button
                            onClick={() => handleDeletePerson(person)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                            title="Desativar pessoa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/80 bg-muted/10 text-xs">
            <span className="text-muted-foreground">
              Total de <strong>{totalItems}</strong> participantes (Página {page} de {totalPages})
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 rounded-lg border border-border bg-card text-foreground disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 rounded-lg border border-border bg-card text-foreground disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <PersonFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        person={selectedPerson}
        onSuccess={fetchPersons}
      />

      <BiometricEnrollModal
        isOpen={isEnrollOpen}
        onClose={() => setIsEnrollOpen(false)}
        person={selectedPerson}
        onSuccess={fetchPersons}
      />

      <TestBiometricModal
        isOpen={isTestOpen}
        onClose={() => setIsTestOpen(false)}
        targetPerson={selectedPerson}
      />

      <ImportParticipantsModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={fetchPersons}
      />

      {/* Custom Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModalState.onConfirm}
        title={confirmModalState.title}
        description={confirmModalState.description}
        itemName={confirmModalState.itemName}
        confirmText={confirmModalState.confirmText}
        variant={confirmModalState.variant}
      />
    </div>
  );
}

export default function PessoasPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12 text-xs text-muted-foreground">
          Carregando participantes...
        </div>
      }
    >
      <PessoasContent />
    </Suspense>
  );
}

