"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { 
  CircleDot, 
  PlayCircle, 
  CheckCircle2, 
  Plus, 
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TaskCard, BoardTaskItem, BoardTaskStatus } from "./task-card";

interface ColumnDef {
  id: BoardTaskStatus;
  title: string;
  icon: React.ElementType;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  borderTop: string;
}

export const BOARD_COLUMNS: ColumnDef[] = [
  {
    id: "TODO",
    title: "A fazer",
    icon: CircleDot,
    accentColor: "text-amber-400",
    badgeBg: "bg-amber-500/15",
    badgeText: "text-amber-400 border-amber-500/30",
    borderTop: "border-t-amber-500",
  },
  {
    id: "IN_PROGRESS",
    title: "Em andamento",
    icon: PlayCircle,
    accentColor: "text-sky-400",
    badgeBg: "bg-sky-500/15",
    badgeText: "text-sky-400 border-sky-500/30",
    borderTop: "border-t-sky-500",
  },
  {
    id: "DONE",
    title: "Concluído",
    icon: CheckCircle2,
    accentColor: "text-emerald-400",
    badgeBg: "bg-emerald-500/15",
    badgeText: "text-emerald-400 border-emerald-500/30",
    borderTop: "border-t-emerald-500",
  },
];

interface BoardColumnProps {
  column: ColumnDef;
  tasks: BoardTaskItem[];
  currentUserId?: string;
  isReadOnly?: boolean;
  canCreateTask?: boolean;
  onAddTask?: (status: BoardTaskStatus) => void;
  onSelectTask: (task: BoardTaskItem) => void;
}

export function BoardColumn({
  column,
  tasks,
  currentUserId,
  isReadOnly = false,
  canCreateTask = false,
  onAddTask,
  onSelectTask,
}: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: "Column",
      status: column.id,
    },
  });

  const Icon = column.icon;

  return (
    <div
      className={cn(
        "flex flex-col flex-1 min-w-[280px] max-w-full rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md",
        "border-t-4 transition-colors duration-200 overflow-hidden shadow-sm",
        column.borderTop,
        isOver && "ring-2 ring-primary/40 bg-card/70"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40 bg-muted/20">
        <div className="flex items-center gap-2.5">
          <Icon className={cn("w-4 h-4", column.accentColor)} />
          <h3 className="font-semibold text-sm text-foreground tracking-tight">
            {column.title}
          </h3>
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-xs font-semibold border",
              column.badgeBg,
              column.badgeText
            )}
          >
            {tasks.length}
          </span>
        </div>

        {canCreateTask && onAddTask && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground rounded-lg"
            title={`Adicionar tarefa em ${column.title}`}
            onClick={() => onAddTask(column.id)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Task List (Droppable area) */}
      <div
        ref={setNodeRef}
        className="flex-1 p-3 flex flex-col gap-3 min-h-[350px] overflow-y-auto max-h-[calc(100vh-230px)] scrollbar-thin"
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              currentUserId={currentUserId}
              isReadOnly={isReadOnly}
              onClick={() => onSelectTask(task)}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-border/40 rounded-xl text-center text-muted-foreground/60">
            <Inbox className="w-8 h-8 mb-2 stroke-[1.5] text-muted-foreground/40" />
            <p className="text-xs font-medium">Nenhuma tarefa aqui</p>
            {!isReadOnly && (
              <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                Arraste um card para esta coluna
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
