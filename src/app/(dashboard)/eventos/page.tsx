"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Calendar,
  Plus,
  Search,
  MapPin,
  Clock,
  Users,
  Gift,
  Trophy,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { EventFormModal } from "@/components/events/EventFormModal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { canDeleteEventByRoleAndTime } from "@/lib/event-time";
import { toast } from "sonner";

export default function EventosPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role || "OPERADOR";
  const isReadOnly = userRole === "CONSULTA";

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEvents, setTotalEvents] = useState(0);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  // Custom Delete Confirmation Modal State
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

  const fetchEvents = async (isInitial: boolean | unknown = false) => {
    if (isInitial === true) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("query", search);
      if (statusFilter !== "all") params.append("status", statusFilter);
      params.append("page", String(page));
      params.append("limit", "12");

      const res = await fetch(`/api/v1/events?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setEvents(data.items);
        setTotalPages(data.totalPages);
        setTotalEvents(data.total);
      }
    } catch {
      if (isInitial === true) toast.error("Erro ao carregar eventos.");
    } finally {
      if (isInitial === true) setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents(true);
  }, [page, statusFilter]);

  // Sincronização automática em segundo plano (a cada 10s e ao focar na janela)
  useAutoRefresh(() => fetchEvents(false), {
    intervalMs: 10000,
    enabled: !isFormOpen,
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEvents();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Agendado
          </span>
        );
      case "OPEN":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Aberto • Ao Vivo
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center rounded-full bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-bold text-sky-600 dark:text-sky-400 border border-sky-500/20">
            Em Andamento
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground border border-border">
            Finalizado
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-bold text-rose-600 border border-rose-500/20">
            Cancelado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Rascunho
          </span>
        );
    }
  };

  const handleDeleteEvent = (e: React.MouseEvent, evt: any) => {
    e.preventDefault();
    e.stopPropagation();

    const check = canDeleteEventByRoleAndTime(userRole, evt);
    if (!check.allowed) {
      toast.error(
        check.reason ||
          "Operadores só podem excluir eventos com mais de 30 minutos de antecedência do início. Solicite a um Administrador."
      );
      return;
    }

    setConfirmModalState({
      isOpen: true,
      title: "Excluir Evento",
      description: `Tem certeza que deseja excluir permanentemente o evento "${evt.name}"? Todos os prêmios, presenças e sorteios serão apagados do sistema.`,
      itemName: `📅 ${evt.name}`,
      confirmText: "Sim, Excluir",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/v1/events/${evt.id}`, {
            method: "DELETE",
          });
          const data = await res.json();
          if (data.success) {
            toast.success("Evento excluído com sucesso!");
            fetchEvents(false);
          } else {
            toast.error(data.error || "Erro ao excluir evento.");
          }
        } catch {
          toast.error("Erro na comunicação com o servidor.");
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <Trophy className="h-6 w-6 text-primary" />
            Central de Eventos & Sorteios
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Gestão de auditórios, chamada biométrica inteligente e roleta oficial sincronizada.
          </p>
          {isReadOnly && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-bold text-sky-600 dark:text-sky-400 border border-sky-500/20 mt-2">
              Modo Consulta
            </span>
          )}
        </div>

        {!isReadOnly && (
          <button
            onClick={() => {
              setSelectedEvent(null);
              setIsFormOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Novo Evento
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar evento por nome, descrição ou local..."
              className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </form>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            >
              <option value="all">Todos os Status</option>
              <option value="PUBLISHED">Agendados</option>
              <option value="OPEN">Abertos (Ao Vivo)</option>
              <option value="IN_PROGRESS">Em Andamento</option>
              <option value="DRAFT">Rascunhos</option>
              <option value="COMPLETED">Finalizados</option>
              <option value="CANCELLED">Cancelados</option>
            </select>

            <button
              onClick={fetchEvents}
              className="p-2 rounded-xl border border-border hover:bg-accent text-muted-foreground transition-colors"
              title="Recarregar"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="py-16 text-center text-muted-foreground">
          <RefreshCw className="h-7 w-7 animate-spin mx-auto mb-2 opacity-50" />
          Carregando eventos...
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground space-y-3">
          <Calendar className="h-10 w-10 mx-auto opacity-30" />
          <p className="text-sm font-bold text-foreground">Nenhum evento encontrado</p>
          <p className="text-xs">Clique no botão "Novo Evento" acima para cadastrar seu primeiro evento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/eventos/${event.id}`}
              className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm hover:border-primary/50 hover:shadow-md transition-all relative overflow-hidden"
            >
              {/* Header color accent */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: event.primaryColor || "#002B49" }}
              />

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(event.status)}
                    {event.date && (
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {new Date(event.date).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>

                  {(userRole === "ADMIN" || userRole === "GESTOR" || userRole === "OPERADOR") && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteEvent(e, event)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                      title={
                        userRole === "ADMIN"
                          ? "Excluir Evento (Permissão de Admin)"
                          : "Excluir Evento (Disponível até 30 min antes)"
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {event.name}
                  </h3>
                  {event.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {event.description}
                    </p>
                  )}
                </div>

                {event.location && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </div>
                )}
              </div>

              {/* Metrics Footer */}
              <div className="mt-5 pt-4 border-t border-border/70 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 font-semibold text-foreground" title="Inscritos">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    {event.participantsCount}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400" title="Presentes">
                    <Sparkles className="h-3.5 w-3.5" />
                    {event.presencesCount}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400" title="Prêmios">
                    <Gift className="h-3.5 w-3.5" />
                    {event.prizesCount}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-bold text-primary group-hover:translate-x-0.5 transition-transform">
                  Acessar Hub
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border border-border rounded-xl bg-card text-xs">
          <span className="text-muted-foreground">
            Total de <strong>{totalEvents}</strong> eventos (Página {page} de {totalPages})
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

      <EventFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        event={selectedEvent}
        onSuccess={fetchEvents}
      />

      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        title={confirmModalState.title}
        description={confirmModalState.description}
        itemName={confirmModalState.itemName}
        confirmText={confirmModalState.confirmText}
        variant={confirmModalState.variant}
        onConfirm={confirmModalState.onConfirm}
        onClose={() => setConfirmModalState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
