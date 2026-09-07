"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { 
  Calendar, 
  Clock, 
  AlertCircle, 
  GripVertical, 
  User as UserIcon,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type BoardTaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type BoardTaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface BoardTaskItem {
  id: string;
  title: string;
  description: string | null;
  status: BoardTaskStatus;
  priority: BoardTaskPriority;
  dueDate: string | null;
  orderIndex: number;
  createdById: string;
  createdBy: { id: string; name: string; email: string };
  assignedToId: string | null;
  assignedTo: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface TaskCardProps {
  task: BoardTaskItem;
  currentUserId?: string;
  isReadOnly?: boolean;
  onClick?: () => void;
  isOverlay?: boolean;
}

const priorityConfig: Record<
  BoardTaskPriority,
  { label: string; bg: string; text: string; border: string }
> = {
  URGENT: {
    label: "Urgente",
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/30",
  },
  HIGH: {
    label: "Alta",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  MEDIUM: {
    label: "Média",
    bg: "bg-sky-500/10",
    text: "text-sky-400",
    border: "border-sky-500/30",
  },
  LOW: {
    label: "Baixa",
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    border: "border-slate-500/30",
  },
};

export function TaskCard({
  task,
  currentUserId,
  isReadOnly = false,
  onClick,
  isOverlay = false,
}: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: isReadOnly,
    data: {
      type: "Task",
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = priorityConfig[task.priority] || priorityConfig.MEDIUM;

  const isOverdue = React.useMemo(() => {
    if (!task.dueDate || task.status === "DONE") return false;
    const due = new Date(task.dueDate);
    const now = new Date();
    // Comparar apenas data ou horário
    return due.getTime() < now.getTime();
  }, [task.dueDate, task.status]);

  const formattedDueDate = React.useMemo(() => {
    if (!task.dueDate) return null;
    const d = new Date(task.dueDate);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [task.dueDate]);

  const isAssignedToCurrentUser = currentUserId && task.assignedToId === currentUserId;

  const cardContent = (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={isOverlay ? undefined : style}
      onClick={() => {
        if (!isDragging && onClick) {
          onClick();
        }
      }}
      className={cn(
        "group relative flex flex-col rounded-xl border p-4 select-none transition-all duration-200",
        "bg-card/70 backdrop-blur-md hover:bg-card/95 hover:shadow-lg hover:shadow-primary/5",
        isDragging
          ? "opacity-35 ring-2 ring-primary scale-[0.98] cursor-grabbing"
          : "border-border/60 hover:border-primary/40 cursor-pointer",
        isOverlay && "rotate-2 scale-105 shadow-2xl border-primary ring-2 ring-primary/40 bg-card cursor-grabbing z-50",
        task.status === "DONE" && "opacity-85 hover:opacity-100"
      )}
    >
      {/* Top Header: Priority Badge + Drag Handle */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border",
            priority.bg,
            priority.text,
            priority.border
          )}
        >
          {task.priority === "URGENT" && (
            <AlertCircle className="w-3 h-3 text-rose-400" />
          )}
          {priority.label}
        </span>

        <div className="flex items-center gap-1.5">
          {task.status === "DONE" && (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          {!isReadOnly && (
            <button
              type="button"
              {...attributes}
              {...listeners}
              aria-label="Arrastar tarefa"
              className={cn(
                "p-1 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted/50",
                "cursor-grab active:cursor-grabbing transition-colors"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Task Title */}
      <h4 className={cn(
        "font-semibold text-sm leading-snug line-clamp-2 mb-1.5 text-foreground group-hover:text-primary transition-colors",
        task.status === "DONE" && "line-through text-muted-foreground"
      )}>
        {task.title}
      </h4>

      {/* Description Preview (if any) */}
      {task.description && (
        <p className="text-xs text-muted-foreground/90 line-clamp-2 mb-3 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Footer Details: Due Date & Assignee */}
      <div className="mt-auto pt-2.5 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground gap-2">
        {/* Due Date Indicator */}
        {formattedDueDate ? (
          <div
            className={cn(
              "flex items-center gap-1 font-medium",
              isOverdue
                ? "text-rose-400 font-semibold"
                : "text-muted-foreground"
            )}
            title={isOverdue ? "Tarefa atrasada!" : "Data de vencimento"}
          >
            {isOverdue ? (
              <Clock className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            ) : (
              <Calendar className="w-3.5 h-3.5" />
            )}
            <span>{formattedDueDate}</span>
          </div>
        ) : (
          <div className="text-[11px] text-muted-foreground/50">Sem prazo</div>
        )}

        {/* Assignee Avatar / Name */}
        <div
          className={cn(
            "flex items-center gap-1.5 px-2 py-0.5 rounded-full border max-w-[140px] truncate",
            isAssignedToCurrentUser
              ? "bg-primary/10 border-primary/30 text-primary font-medium"
              : "bg-muted/40 border-border/40 text-muted-foreground"
          )}
          title={
            task.assignedTo
              ? `Responsável: ${task.assignedTo.name}`
              : "Sem responsável atribuído"
          }
        >
          <UserIcon className="w-3 h-3 shrink-0" />
          <span className="truncate text-[11px]">
            {isAssignedToCurrentUser
              ? "Você"
              : task.assignedTo?.name
              ? task.assignedTo.name.split(" ")[0]
              : "Livre"}
          </span>
        </div>
      </div>
    </div>
  );

  return cardContent;
}
