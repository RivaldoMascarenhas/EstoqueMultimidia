"use client";

import React, { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  User as UserIcon, 
  UserCheck,
  Edit2, 
  Trash2, 
  History as HistoryIcon,
  CheckCircle2,
  PlayCircle,
  CircleDot,
  Loader2,
  AlertCircle,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatDateTime } from "@/lib/utils";
import { BoardTaskItem, BoardTaskPriority, BoardTaskStatus } from "./task-card";

interface HistoryRecord {
  id: string;
  taskId: string;
  userId: string;
  user: { id: string; name: string; email: string };
  action: string;
  fromStatus: BoardTaskStatus | null;
  toStatus: BoardTaskStatus | null;
  details: string | null;
  createdAt: string;
}

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: BoardTaskItem | null;
  currentUserId?: string;
  currentUserRole?: string;
  onEdit: (task: BoardTaskItem) => void;
  onDelete: (taskId: string) => void;
  onTaskUpdated: (task: BoardTaskItem) => void;
}

const priorityConfig: Record<
  BoardTaskPriority,
  { label: string; bg: string; text: string; border: string }
> = {
  URGENT: { label: "Urgente", bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30" },
  HIGH: { label: "Alta", bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  MEDIUM: { label: "Média", bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/30" },
  LOW: { label: "Baixa", bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/30" },
};

const statusConfig: Record<
  BoardTaskStatus,
  { label: string; icon: React.ElementType; color: string }
> = {
  TODO: { label: "A fazer", icon: CircleDot, color: "text-amber-400" },
  IN_PROGRESS: { label: "Em andamento", icon: PlayCircle, color: "text-sky-400" },
  DONE: { label: "Concluído", icon: CheckCircle2, color: "text-emerald-400" },
};

export function TaskDetailModal({
  isOpen,
  onClose,
  task,
  currentUserId,
  currentUserRole,
  onEdit,
  onDelete,
  onTaskUpdated,
}: TaskDetailModalProps) {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const canEdit = currentUserRole && ["ADMIN", "GESTOR", "OPERADOR"].includes(currentUserRole);
  const canDelete = currentUserRole && ["ADMIN", "GESTOR"].includes(currentUserRole);

  const taskId = task?.id;

  const loadHistory = React.useCallback(async (id: string) => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/v1/board-tasks/${id}/history`);
      const json = await res.json();
      if (json.success && Array.isArray(json.items)) {
        setHistory(json.items);
      }
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && taskId) {
      loadHistory(taskId);
      setShowConfirmDelete(false);
    }
  }, [isOpen, taskId, loadHistory]);

  if (!task) return null;

  const priority = priorityConfig[task.priority] || priorityConfig.MEDIUM;
  const currentStatus = statusConfig[task.status] || statusConfig.TODO;
  const isAssignedToMe = currentUserId && task.assignedToId === currentUserId;

  const isOverdue = (() => {
    if (!task.dueDate || task.status === "DONE") return false;
    return new Date(task.dueDate).getTime() < new Date().getTime();
  })();

  const handleQuickStatusChange = async (targetStatus: BoardTaskStatus) => {
    if (targetStatus === task.status || isUpdatingStatus) return;

    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/v1/board-tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          autoReassign: true, // Reatribui ao usuário logado
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Erro ao mover tarefa.");
        return;
      }

      toast.success(`Tarefa movida para "${statusConfig[targetStatus].label}" e atribuída a você!`);
      onTaskUpdated(json.item);
      loadHistory(task.id);
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleClaimTask = async () => {
    if (isAssignedToMe || isUpdatingStatus) return;

    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/v1/board-tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoReassign: true,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Erro ao assumir tarefa.");
        return;
      }

      toast.success("Você assumiu a responsabilidade por esta tarefa!");
      onTaskUpdated(json.item);
      loadHistory(task.id);
    } catch (err: any) {
      toast.error(err.message || "Erro ao assumir tarefa.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/v1/board-tasks/${task.id}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Erro ao excluir tarefa.");
        return;
      }

      toast.success("Tarefa excluída com sucesso.");
      onDelete(task.id);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir tarefa.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] flex flex-col bg-card/95 backdrop-blur-xl border border-border/80 shadow-2xl p-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border/50 bg-muted/20">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                    priority.bg,
                    priority.text,
                    priority.border
                  )}
                >
                  {priority.label}
                </span>

                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-muted/50 border-border/50",
                    currentStatus.color
                  )}
                >
                  <currentStatus.icon className="w-3.5 h-3.5" />
                  {currentStatus.label}
                </span>

                {isOverdue && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-rose-500/30 bg-rose-500/10 text-rose-400">
                    <AlertCircle className="w-3 h-3" />
                    Vencida
                  </span>
                )}
              </div>

              <DialogTitle className="text-xl font-bold leading-tight text-foreground">
                {task.title}
              </DialogTitle>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scrollbar-thin">
          {/* Quick Actions Toolbar (Mover status / Reatribuir) */}
          {canEdit && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-border/60 bg-muted/30">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground mr-1">
                  Mover para:
                </span>
                {(["TODO", "IN_PROGRESS", "DONE"] as BoardTaskStatus[]).map((st) => {
                  const cfg = statusConfig[st];
                  const isActive = task.status === st;
                  return (
                    <Button
                      key={st}
                      type="button"
                      size="sm"
                      variant={isActive ? "secondary" : "outline"}
                      disabled={isActive || isUpdatingStatus}
                      onClick={() => handleQuickStatusChange(st)}
                      className={cn(
                        "h-7 text-xs px-2.5 gap-1.5",
                        isActive && "font-bold ring-1 ring-border"
                      )}
                    >
                      <cfg.icon className={cn("w-3.5 h-3.5", cfg.color)} />
                      {cfg.label}
                    </Button>
                  );
                })}
              </div>

              {!isAssignedToMe && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isUpdatingStatus}
                  onClick={handleClaimTask}
                  className="h-7 text-xs px-2.5 gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Assumir Tarefa
                </Button>
              )}
            </div>
          )}

          {/* Description Section */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Descrição
            </h4>
            <div className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap rounded-xl border border-border/40 bg-background/40 p-3.5">
              {task.description || (
                <span className="text-muted-foreground/60 italic text-xs">
                  Sem descrição informada.
                </span>
              )}
            </div>
          </div>

          {/* Metadata Cards: Prazo, Responsável, Criador */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Responsável */}
            <div className="p-3 rounded-xl border border-border/50 bg-background/50 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5" />
                Responsável
              </span>
              <div className="mt-2 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                  {task.assignedTo ? task.assignedTo.name.charAt(0).toUpperCase() : "?"}
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold truncate text-foreground">
                    {isAssignedToMe ? "Você" : task.assignedTo?.name || "Não atribuído"}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {task.assignedTo?.email || "Disponível para atendimento"}
                  </p>
                </div>
              </div>
            </div>

            {/* Prazo */}
            <div className="p-3 rounded-xl border border-border/50 bg-background/50 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Data Limite
              </span>
              <div className="mt-2">
                <p
                  className={cn(
                    "text-xs font-semibold",
                    isOverdue ? "text-rose-400" : "text-foreground"
                  )}
                >
                  {task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Sem prazo definido"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {isOverdue ? "Prazo expirado!" : "Previsão de conclusão"}
                </p>
              </div>
            </div>

            {/* Criado por */}
            <div className="p-3 rounded-xl border border-border/50 bg-background/50 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Criador
              </span>
              <div className="mt-2 truncate">
                <p className="text-xs font-semibold truncate text-foreground">
                  {task.createdBy?.name || "Sistema"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(task.createdAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* History Timeline */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <HistoryIcon className="w-3.5 h-3.5" />
              Histórico de Movimentações & Responsabilidade
            </h4>

            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-xs">Carregando histórico...</span>
              </div>
            ) : history.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-border/50 text-center text-xs text-muted-foreground">
                Nenhum histórico registrado até o momento.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
                {history.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-2.5 rounded-lg border border-border/40 bg-muted/20 text-xs flex items-start justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        <span>{rec.user?.name || "Usuário"}</span>
                        {rec.action === "STATUS_CHANGE" && rec.fromStatus && rec.toStatus && (
                          <span className="text-muted-foreground font-normal flex items-center gap-1">
                            moveu <ArrowRight className="w-3 h-3 inline" />{" "}
                            <span className="font-medium text-foreground">
                              {statusConfig[rec.toStatus]?.label || rec.toStatus}
                            </span>
                          </span>
                        )}
                        {rec.action === "REASSIGNED" && (
                          <span className="text-primary font-medium">
                            assumiu a tarefa
                          </span>
                        )}
                        {rec.action === "CREATED" && (
                          <span className="text-emerald-400 font-medium">
                            criou a tarefa
                          </span>
                        )}
                        {rec.action === "UPDATED" && (
                          <span className="text-muted-foreground font-normal">
                            atualizou dados
                          </span>
                        )}
                      </div>
                      {rec.details && (
                        <p className="text-[11px] text-muted-foreground">
                          {rec.details}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap">
                      {new Date(rec.createdAt).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border/50 bg-muted/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {canDelete && !showConfirmDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowConfirmDelete(true)}
                className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir
              </Button>
            )}

            {showConfirmDelete && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-400 font-medium">Confirmar exclusão?</span>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={isDeleting}
                  onClick={handleDelete}
                  className="h-7 text-xs px-2"
                >
                  {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Sim, excluir"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isDeleting}
                  onClick={() => setShowConfirmDelete(false)}
                  className="h-7 text-xs px-2"
                >
                  Cancelar
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onEdit(task);
                }}
                className="gap-1.5 text-xs"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Editar Tarefa
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
