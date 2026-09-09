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
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Edit2, AlertCircle, Info, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { BoardTaskItem, BoardTaskPriority, BoardTaskStatus } from "./task-card";

export interface AssignableUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
}

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: BoardTaskItem | null;
  defaultStatus?: BoardTaskStatus;
  currentUserId?: string;
  currentUserRole?: string;
  onSuccess: (task: BoardTaskItem, isEdit: boolean) => void;
}

export function TaskFormModal({
  isOpen,
  onClose,
  taskToEdit,
  defaultStatus = "TODO",
  currentUserId,
  currentUserRole,
  onSuccess,
}: TaskFormModalProps) {
  const isEditing = Boolean(taskToEdit);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<BoardTaskStatus>(defaultStatus);
  const [priority, setPriority] = useState<BoardTaskPriority>("MEDIUM");
  const [dueDate, setDueDate] = useState<Date>();
  const [assignedToId, setAssignedToId] = useState<string>("");
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Carregar usuários elegíveis ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      loadAssignableUsers();
    }
  }, [isOpen]);

  // Preencher formulário ao abrir para edição ou resetar para criação
  useEffect(() => {
    if (isOpen) {
      if (taskToEdit) {
        setTitle(taskToEdit.title);
        setDescription(taskToEdit.description || "");
        setStatus(taskToEdit.status);
        setPriority(taskToEdit.priority);
        setAssignedToId(taskToEdit.assignedToId || "");
        if (taskToEdit.dueDate) {
          setDueDate(new Date(taskToEdit.dueDate));
        } else {
          setDueDate(undefined);
        }
      } else {
        setTitle("");
        setDescription("");
        setStatus(defaultStatus);
        setPriority("MEDIUM");
        setDueDate(undefined);
        // Na criação, sugere atribuir ao próprio usuário
        setAssignedToId(currentUserId || "");
      }
    }
  }, [isOpen, taskToEdit, defaultStatus, currentUserId]);

  const loadAssignableUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch("/api/v1/board-tasks/users");
      const json = await res.json();
      if (json.success && Array.isArray(json.items)) {
        setAssignableUsers(json.items);
      }
    } catch (err) {
      console.error("Erro ao buscar operadores elegíveis:", err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("O título da tarefa é obrigatório.");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = isEditing
        ? `/api/v1/board-tasks/${taskToEdit!.id}`
        : "/api/v1/board-tasks";
      const method = isEditing ? "PATCH" : "POST";

      const payload: any = {
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        dueDate: dueDate ? dueDate.toISOString() : null,
      };

      if (isEditing) {
        // Regra de auto-reatribuição: se o usuário logado editar, autoReassign é true
        payload.autoReassign = true;
      } else {
        payload.assignedToId = assignedToId || null;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error || "Erro ao salvar tarefa no quadro.");
        return;
      }

      if (!isEditing && assignedToId && assignedToId !== currentUserId) {
        const assignedUser = assignableUsers.find((u) => u.id === assignedToId);
        toast.success(
          `Nova tarefa criada e notificação enviada para ${assignedUser?.name || "o operador"}!`
        );
      } else {
        toast.success(
          isEditing
            ? "Tarefa atualizada e atribuída a você com sucesso!"
            : "Nova tarefa criada no quadro!"
        );
      }

      onSuccess(json.item, isEditing);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro de conexão ao salvar tarefa.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg w-full bg-card/95 backdrop-blur-xl border border-border/80 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              {isEditing ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                {isEditing ? "Editar Tarefa" : "Nova Tarefa"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {isEditing
                  ? "Atualize as informações. A tarefa será atribuída a você."
                  : "Preencha as informações para registrar a tarefa no quadro."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Título */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Título da Tarefa *</span>
              <span className="text-[11px] font-normal text-muted-foreground">
                {title.length}/200
              </span>
            </label>
            <Input
              required
              maxLength={200}
              placeholder="Ex: Verificar datashow sala 204, organizar cabos HDMI..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-background/50"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Descrição detalhada (opcional)
            </label>
            <textarea
              rows={3}
              maxLength={2000}
              placeholder="Adicione observações, instruções ou itens necessários..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>

          {/* Coluna de Status e Prioridade */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Coluna / Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as BoardTaskStatus)}
                className="w-full h-9 rounded-md border border-input bg-background/50 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="TODO">A fazer</option>
                <option value="IN_PROGRESS">Em andamento</option>
                <option value="DONE">Concluído</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Prioridade</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as BoardTaskPriority)}
                className="w-full h-9 rounded-md border border-input bg-background/50 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>
          </div>

          {/* Data de Vencimento e Responsável */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Data / Horário Limite (opcional)
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal bg-background/50 text-xs h-9",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? (
                      format(dueDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                    ) : (
                      <span>Selecione uma data limite</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(date) => {
                      if (date) {
                        // Preserve existing time if any, else default to 23:59
                        if (dueDate) {
                          date.setHours(dueDate.getHours());
                          date.setMinutes(dueDate.getMinutes());
                        } else {
                          date.setHours(23, 59, 0, 0);
                        }
                      }
                      setDueDate(date);
                    }}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                  {dueDate && (
                    <div className="p-3 border-t border-border/50">
                      <label className="text-xs font-medium mb-1 block">Horário Limite</label>
                      <Input 
                        type="time" 
                        value={format(dueDate, "HH:mm")}
                        onChange={(e) => {
                          const [hours, minutes] = e.target.value.split(":");
                          const newDate = new Date(dueDate);
                          newDate.setHours(parseInt(hours, 10));
                          newDate.setMinutes(parseInt(minutes, 10));
                          setDueDate(newDate);
                        }}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            {!isEditing && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Responsável Inicial
                </label>
                <select
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  disabled={isLoadingUsers}
                  className="w-full h-9 rounded-md border border-input bg-background/50 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Sem responsável inicial</option>
                  {assignableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Banner explicativo de auto-reatribuição na edição */}
          {isEditing && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-start gap-2.5 text-xs text-muted-foreground">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                <strong>Regra do Quadro:</strong> Como você está editando esta tarefa, ela será automaticamente vinculada a você como responsável pela execução.
              </span>
            </div>
          )}

          <DialogFooter className="pt-3 border-t border-border/50 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : isEditing ? (
                "Salvar Alterações"
              ) : (
                "Criar Tarefa"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
