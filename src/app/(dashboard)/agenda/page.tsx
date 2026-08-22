"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  RefreshCw, 
  LayoutGrid, 
  List, 
  History,
  Maximize2,
  Minimize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShiftCard } from "@/components/agenda/shift-card";
import { CalendarGridView } from "@/components/agenda/calendar-grid-view";
import { RequestDetailModal } from "@/components/agenda/request-detail-modal";
import { formatDate, formatDateInput } from "@/lib/utils";
import { toast } from "sonner";

export default function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return formatDateInput(new Date());
  });

  const [viewMode, setViewMode] = useState<"SHIFT_LIST" | "CALENDAR_GRID">("CALENDAR_GRID");
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<"ALL" | "MORNING" | "AFTERNOON" | "NIGHT">("ALL");
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [agendaData, setAgendaData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal de Detalhes e Preparo
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const fetchAgendaData = async (dateStr: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/v1/requests/by-shift?date=${dateStr}`);
      const data = await res.json();
      if (data.success) {
        setAgendaData(data.data);
      } else {
        toast.error(data.error || "Erro ao carregar dados da agenda.");
      }
    } catch (err) {
      console.error("Erro ao buscar agenda:", err);
      toast.error("Falha na conexão ao carregar a agenda.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgendaData(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  const handlePrevDay = () => {
    const [year, month, day] = selectedDate.split("-").map(Number);
    const prevDate = new Date(year, month - 1, day - 1);
    setSelectedDate(formatDateInput(prevDate));
  };

  const handleNextDay = () => {
    const [year, month, day] = selectedDate.split("-").map(Number);
    const nextDate = new Date(year, month - 1, day + 1);
    setSelectedDate(formatDateInput(nextDate));
  };

  const handleToday = () => {
    setSelectedDate(formatDateInput(new Date()));
  };

  const handleOpenDetails = (requestId: string) => {
    setSelectedRequestId(requestId);
    setDetailModalOpen(true);
  };

  const isCurrentDay = selectedDate === formatDateInput(new Date());
  const currentShift = agendaData?.currentShift || "MORNING";
  const shifts = agendaData?.shifts || {
    MORNING: { config: {}, stats: {}, requests: [] },
    AFTERNOON: { config: {}, stats: {}, requests: [] },
    NIGHT: { config: {}, stats: {}, requests: [] },
  };

  return (
    <div className={`animate-in fade-in-50 duration-300 ${
      isFullscreen 
        ? "fixed inset-0 z-50 bg-background/95 backdrop-blur-2xl p-4 sm:p-6 overflow-y-auto w-screen h-screen space-y-4" 
        : "space-y-6"
    }`}>
      
      {/* 1. Header & Navigation Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-6 rounded-3xl bg-card border border-border/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] sm:text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" />
              Operação de Atendimentos & Aulas
            </span>
            {agendaData?.totalDayPendingReview > 0 && (
              <Badge variant="low" className="text-[10px]">
                {agendaData.totalDayPendingReview} pendentes de revisão
              </Badge>
            )}
            {isFullscreen && (
              <Badge variant="default" className="text-[10px] bg-primary animate-pulse">
                Modo Monitor / Painel Fullscreen (Pressione Esc para sair)
              </Badge>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <span>Agenda Operacional por Turnos</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Acompanhamento em tempo real dos preparos e entregas de multimídia organizados em Manhã, Tarde e Noite.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {agendaData?.totalDayPendingReview > 0 && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-xl text-xs h-9 border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
            >
              <Link href="/agenda/revisao-legado">
                <History className="w-4 h-4 mr-1.5" />
                <span>Revisar Legados ({agendaData.totalDayPendingReview})</span>
              </Link>
            </Button>
          )}

          <Button
            asChild
            size="sm"
            className="rounded-xl text-xs h-9 bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20 gap-1.5 cursor-pointer"
          >
            <Link href="/agenda/nova-solicitacao">
              <Plus className="w-4 h-4 shrink-0" />
              <span>Nova Solicitação</span>
            </Link>
          </Button>

          {/* Botão de Tela Cheia */}
          <Button
            variant={isFullscreen ? "default" : "outline"}
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`rounded-xl text-xs h-9 gap-1.5 ${
              isFullscreen ? "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/25" : "text-muted-foreground hover:text-foreground"
            }`}
            title={isFullscreen ? "Sair da Tela Cheia (Esc)" : "Expandir em Tela Cheia (TV / Monitor)"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAgendaData(selectedDate)}
            className="rounded-xl text-xs h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
            title="Atualizar agenda"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 2. Barra de Controle de Data, Filtro de Turno e Modo de Visualização */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-2xl bg-card border border-border/80 shadow-xs">
        
        {/* Navegador de Data */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevDay}
            className="h-8 w-8 p-0 rounded-xl shrink-0"
            title="Dia anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <Button
            variant={isCurrentDay ? "default" : "outline"}
            size="sm"
            onClick={handleToday}
            className="h-8 text-xs font-bold px-3 rounded-xl shrink-0"
          >
            Hoje
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextDay}
            className="h-8 w-8 p-0 rounded-xl shrink-0"
            title="Próximo dia"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          {/* Date Picker Nativo */}
          <div className="relative flex items-center ml-1 sm:ml-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-8 text-xs font-semibold rounded-xl border border-border bg-background px-2 text-foreground focus:ring-1 focus:ring-primary cursor-pointer max-w-[130px] sm:max-w-none"
            />
          </div>

          <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
            {formatDate(selectedDate)}
          </span>
        </div>

        {/* Filtro de Turnos & Toggle de Modo (Lista / Grade) */}
        <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-start">
          {/* Seletor de Turnos */}
          <div className="flex items-center rounded-xl bg-muted/60 p-1 border border-border/60 text-xs overflow-x-auto max-w-full">
            <button
              onClick={() => setSelectedShiftFilter("ALL")}
              className={`px-2 py-1 rounded-lg font-medium transition-all text-xs shrink-0 ${
                selectedShiftFilter === "ALL"
                  ? "bg-card text-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setSelectedShiftFilter("MORNING")}
              className={`px-2 py-1 rounded-lg font-medium transition-all flex items-center gap-1 text-xs shrink-0 ${
                selectedShiftFilter === "MORNING"
                  ? "bg-card text-amber-600 dark:text-amber-400 font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>🌅</span> Manhã
            </button>
            <button
              onClick={() => setSelectedShiftFilter("AFTERNOON")}
              className={`px-2 py-1 rounded-lg font-medium transition-all flex items-center gap-1 text-xs shrink-0 ${
                selectedShiftFilter === "AFTERNOON"
                  ? "bg-card text-orange-600 dark:text-orange-400 font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>☀️</span> Tarde
            </button>
            <button
              onClick={() => setSelectedShiftFilter("NIGHT")}
              className={`px-2 py-1 rounded-lg font-medium transition-all flex items-center gap-1 text-xs shrink-0 ${
                selectedShiftFilter === "NIGHT"
                  ? "bg-card text-indigo-600 dark:text-indigo-400 font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>🌙</span> Noite
            </button>
          </div>

          {/* Toggle de Visualização (Lista por Turno vs Grade Google Calendar) */}
          <div className="flex items-center rounded-xl bg-muted/60 p-1 border border-border/60 text-xs shrink-0">
            <button
              onClick={() => setViewMode("SHIFT_LIST")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                viewMode === "SHIFT_LIST"
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Modo Operacional: Blocos por Turno"
            >
              <List className="w-3.5 h-3.5" />
              <span>Por Turno</span>
            </button>
            <button
              onClick={() => setViewMode("CALENDAR_GRID")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                viewMode === "CALENDAR_GRID"
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Modo Grade: Linha do Tempo Google Calendar"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grade Horária</span>
            </button>
          </div>
        </div>

      </div>

      {/* 3. Conteúdo Principal (Modo Lista de Turnos ou Modo Grade) */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`agenda-skel-${i}`} className="p-6 rounded-3xl bg-card border border-border/80 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-8 h-8 rounded-xl" />
                  <Skeleton className="w-24 h-5 rounded-md" />
                </div>
                <Skeleton className="w-16 h-5 rounded-full" />
              </div>
              <div className="space-y-3">
                <Skeleton className="w-full h-20 rounded-2xl" />
                <Skeleton className="w-full h-20 rounded-2xl" />
                <Skeleton className="w-full h-20 rounded-2xl" />
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === "CALENDAR_GRID" ? (
        /* Modo 2: Grade Única Focada no Turno com Anti-Sobreposição */
        <CalendarGridView
          shiftsData={shifts}
          selectedShift={selectedShiftFilter === "ALL" ? ((currentShift as "MORNING" | "AFTERNOON" | "NIGHT") || "MORNING") : selectedShiftFilter}
          onSelectShift={(shift) => setSelectedShiftFilter(shift)}
          onOpenDetails={handleOpenDetails}
        />
      ) : (
        /* Modo 1: Blocos Operacionais por Turno (Manhã / Tarde / Noite) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(selectedShiftFilter === "ALL" || selectedShiftFilter === "MORNING") && (
            <ShiftCard
              shiftData={shifts.MORNING}
              isCurrentShift={isCurrentDay && currentShift === "MORNING"}
              onOpenDetails={handleOpenDetails}
            />
          )}

          {(selectedShiftFilter === "ALL" || selectedShiftFilter === "AFTERNOON") && (
            <ShiftCard
              shiftData={shifts.AFTERNOON}
              isCurrentShift={isCurrentDay && currentShift === "AFTERNOON"}
              onOpenDetails={handleOpenDetails}
            />
          )}

          {(selectedShiftFilter === "ALL" || selectedShiftFilter === "NIGHT") && (
            <ShiftCard
              shiftData={shifts.NIGHT}
              isCurrentShift={isCurrentDay && currentShift === "NIGHT"}
              onOpenDetails={handleOpenDetails}
            />
          )}
        </div>
      )}

      {/* Modal de Detalhes, Checklist de Preparo e Reserva de Patrimônio */}
      <RequestDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedRequestId(null);
        }}
        requestId={selectedRequestId}
        onUpdated={() => fetchAgendaData(selectedDate)}
      />

    </div>
  );
}
