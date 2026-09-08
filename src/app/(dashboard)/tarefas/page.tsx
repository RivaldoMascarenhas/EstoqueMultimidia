"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import { 
  Kanban, 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  Sparkles, 
  AlertCircle,
  Clock,
  UserCheck,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

import { 
  BoardColumn, 
  BOARD_COLUMNS 
} from "@/components/tasks/board-columns";
import { 
  TaskCard, 
  BoardTaskItem, 
  BoardTaskStatus, 
  BoardTaskPriority 
} from "@/components/tasks/task-card";
import { TaskFormModal } from "@/components/tasks/task-form-modal";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";

export default function TarefasPage() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const currentUserRole = session?.user?.role || "OPERADOR";

  const isReadOnly = currentUserRole === "CONSULTA";
  const canCreateTask = ["ADMIN", "GESTOR"].includes(currentUserRole);

  // Estados principais de dados
  const [tasks, setTasks] = useState<BoardTaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filtros de visualização
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("ALL");

  // Drag & Drop
  const [activeTask, setActiveTask] = useState<BoardTaskItem | null>(null);

  // Modais
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<BoardTaskItem | null>(null);
  const [defaultStatusForNew, setDefaultStatusForNew] = useState<BoardTaskStatus>("TODO");
  const [selectedTask, setSelectedTask] = useState<BoardTaskItem | null>(null);

  // Configuração de sensores do dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6, // 6px antes de iniciar o drag para não interceptar cliques simples
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Buscar tarefas da API
  const fetchTasks = useCallback(async (showLoader = false) => {
    if (showLoader) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await fetch("/api/v1/board-tasks");
      const json = await res.json();
      if (json.success && Array.isArray(json.items)) {
        setTasks(json.items);
      }
    } catch (err) {
      console.error("Erro ao carregar tarefas do quadro:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    fetchTasks(true);
  }, [fetchTasks]);

  // Sincronização automática em background (pausa quando há modal aberto ou arrastando)
  useAutoRefresh(
    () => fetchTasks(false),
    {
      intervalMs: 12000,
      enabled: !isFormModalOpen && !selectedTask && !activeTask,
      refreshOnFocus: true,
    }
  );

  // Tarefas filtradas
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Busca textual
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(query);
        const matchDesc = task.description?.toLowerCase().includes(query) ?? false;
        if (!matchTitle && !matchDesc) return false;
      }

      // Filtro de prioridade
      if (priorityFilter !== "ALL" && task.priority !== priorityFilter) {
        return false;
      }

      // Filtro de responsável
      if (assigneeFilter === "MINE") {
        if (!currentUserId || task.assignedToId !== currentUserId) return false;
      } else if (assigneeFilter === "UNASSIGNED") {
        if (task.assignedToId) return false;
      }

      return true;
    });
  }, [tasks, searchTerm, priorityFilter, assigneeFilter, currentUserId]);

  // Agrupamento por status
  const tasksByColumn = useMemo(() => {
    const map: Record<BoardTaskStatus, BoardTaskItem[]> = {
      TODO: [],
      IN_PROGRESS: [],
      DONE: [],
    };

    filteredTasks.forEach((task) => {
      if (map[task.status]) {
        map[task.status].push(task);
      }
    });

    return map;
  }, [filteredTasks]);

  // Manipuladores de Drag & Drop
  const handleDragStart = (event: DragStartEvent) => {
    if (isReadOnly) return;
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (isReadOnly) return;
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeTaskItem = tasks.find((t) => t.id === activeId);
    if (!activeTaskItem) return;

    // Descobrir coluna de destino
    let targetStatus: BoardTaskStatus | null = null;
    if (["TODO", "IN_PROGRESS", "DONE"].includes(overId)) {
      targetStatus = overId as BoardTaskStatus;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) {
        targetStatus = overTask.status;
      }
    }

    if (!targetStatus || activeTaskItem.status === targetStatus) return;

    // Atualização otimista visual durante o arrasto entre colunas
    setTasks((prevTasks) => {
      const activeIndex = prevTasks.findIndex((t) => t.id === activeId);
      if (activeIndex === -1) return prevTasks;

      const updated = [...prevTasks];
      updated[activeIndex] = {
        ...updated[activeIndex],
        status: targetStatus!,
      };
      return updated;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const currentActive = activeTask;
    setActiveTask(null);

    if (isReadOnly || !over || !currentActive) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Determinar destino final
    let targetStatus: BoardTaskStatus = currentActive.status;
    if (["TODO", "IN_PROGRESS", "DONE"].includes(overId)) {
      targetStatus = overId as BoardTaskStatus;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) {
        targetStatus = overTask.status;
      }
    }

    const hasStatusChanged = targetStatus !== currentActive.status;

    // Se a posição ou status mudou
    if (hasStatusChanged) {
      // Atualização otimista com reatribuição ao usuário logado
      const previousTasks = [...tasks];
      const targetColumnDef = BOARD_COLUMNS.find((c) => c.id === targetStatus);

      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === activeId) {
            return {
              ...t,
              status: targetStatus,
              assignedToId: currentUserId || t.assignedToId,
              assignedTo: session?.user
                ? {
                    id: session.user.id,
                    name: session.user.name || "Você",
                    email: session.user.email || "",
                  }
                : t.assignedTo,
            };
          }
          return t;
        })
      );

      try {
        const res = await fetch(`/api/v1/board-tasks/${activeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: targetStatus,
            autoReassign: true, // Regra central: qualquer movimentação reatribui
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Erro ao mover tarefa no servidor");
        }

        // Atualizar com os dados retornados pelo servidor
        setTasks((prev) =>
          prev.map((t) => (t.id === activeId ? json.item : t))
        );

        toast.success(
          `Tarefa movida para "${targetColumnDef?.title || targetStatus}" e atribuída a você!`
        );
      } catch (err: any) {
        toast.error(err.message || "Erro ao persistir movimentação.");
        // Reverter para estado anterior
        setTasks(previousTasks);
      }
    } else {
      // Reordenação na mesma coluna se over for outra tarefa
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask && activeId !== overId) {
        setTasks((prev) => {
          const oldIndex = prev.findIndex((t) => t.id === activeId);
          const newIndex = prev.findIndex((t) => t.id === overId);
          return arrayMove(prev, oldIndex, newIndex);
        });
      }
    }
  };

  // Manipuladores de modais
  const handleOpenCreateModal = (status: BoardTaskStatus = "TODO") => {
    setDefaultStatusForNew(status);
    setTaskToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (task: BoardTaskItem) => {
    setTaskToEdit(task);
    setIsFormModalOpen(true);
  };

  const handleSelectTask = (task: BoardTaskItem) => {
    setSelectedTask(task);
  };

  const handleTaskSaved = (savedTask: BoardTaskItem, isEdit: boolean) => {
    setTasks((prev) => {
      if (isEdit) {
        return prev.map((t) => (t.id === savedTask.id ? savedTask : t));
      }
      return [savedTask, ...prev];
    });

    if (selectedTask?.id === savedTask.id) {
      setSelectedTask(savedTask);
    }
  };

  const handleTaskDeleted = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (selectedTask?.id === taskId) {
      setSelectedTask(null);
    }
  };

  const handleTaskUpdatedFromDetail = (updatedTask: BoardTaskItem) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    );
    setSelectedTask(updatedTask);
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-[1600px] mx-auto w-full">
      {/* Header com título, métricas e botão de criar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
              <Kanban className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Quadro de Tarefas
                </h1>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted/60 text-muted-foreground border border-border/40">
                  <RefreshCw
                    className={`w-3 h-3 ${isRefreshing ? "animate-spin text-primary" : ""}`}
                  />
                  {isRefreshing ? "Sincronizando..." : "Sincronizado"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Gestão operacional de demandas, com auto-reatribuição a quem executa.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {canCreateTask && (
            <Button
              onClick={() => handleOpenCreateModal("TODO")}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
            >
              <Plus className="w-4 h-4" />
              Nova Tarefa
            </Button>
          )}
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md">
        {/* Campo de Busca */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 bg-background/50 text-xs border-border/60"
          />
        </div>

        {/* Dropdowns de Filtro */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro de Prioridade */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-9 rounded-md border border-border/60 bg-background/50 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground"
          >
            <option value="ALL">Todas as prioridades</option>
            <option value="URGENT">Urgente</option>
            <option value="HIGH">Alta</option>
            <option value="MEDIUM">Média</option>
            <option value="LOW">Baixa</option>
          </select>

          {/* Filtro de Responsável */}
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="h-9 rounded-md border border-border/60 bg-background/50 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground"
          >
            <option value="ALL">Todos os responsáveis</option>
            <option value="MINE">Minhas tarefas</option>
            <option value="UNASSIGNED">Sem responsável</option>
          </select>

          {/* Botão limpar filtros */}
          {(searchTerm || priorityFilter !== "ALL" || assigneeFilter !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setPriorityFilter("ALL");
                setAssigneeFilter("ALL");
              }}
              className="h-9 text-xs text-muted-foreground hover:text-foreground"
            >
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Regra de Auto-reatribuição - Card de orientação sutil */}
      {!isReadOnly && (
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl border border-primary/20 bg-primary/5 text-xs text-muted-foreground">
          <UserCheck className="w-4 h-4 text-primary shrink-0" />
          <span>
            <strong>Regra de Operação:</strong> Ao mover ou editar qualquer tarefa do quadro, ela será automaticamente assumida e atribuída a você como responsável ativo.
          </span>
        </div>
      )}

      {/* Quadro Kanban (Colunas & Drag and Drop) */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((col) => (
            <div
              key={col}
              className="flex flex-col rounded-2xl border border-border/40 bg-card/30 p-4 space-y-4 min-h-[450px]"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border/30">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-6 rounded-full" />
              </div>
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {BOARD_COLUMNS.map((col) => (
              <BoardColumn
                key={col.id}
                column={col}
                tasks={tasksByColumn[col.id]}
                currentUserId={currentUserId}
                isReadOnly={isReadOnly}
                canCreateTask={canCreateTask}
                onAddTask={handleOpenCreateModal}
                onSelectTask={handleSelectTask}
              />
            ))}
          </div>

          {/* Overlay visual enquanto o card é arrastado */}
          <DragOverlay>
            {activeTask ? (
              <TaskCard
                task={activeTask}
                currentUserId={currentUserId}
                isReadOnly={isReadOnly}
                isOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Modal de Criação / Edição */}
      <TaskFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setTaskToEdit(null);
        }}
        taskToEdit={taskToEdit}
        defaultStatus={defaultStatusForNew}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        onSuccess={handleTaskSaved}
      />

      {/* Modal de Detalhes e Histórico da Tarefa */}
      <TaskDetailModal
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        onEdit={(task) => {
          setSelectedTask(null);
          handleOpenEditModal(task);
        }}
        onDelete={handleTaskDeleted}
        onTaskUpdated={handleTaskUpdatedFromDetail}
      />
    </div>
  );
}
