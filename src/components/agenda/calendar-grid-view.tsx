"use client";

import React, { useMemo } from "react";
import { 
  Tv, 
  Package, 
  CheckCircle2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RequestItem {
  id: string;
  startTime: string | Date;
  endTime: string | Date;
  room?: { name: string; floor?: string; fixedProjectorModel?: string };
  professorName?: string;
  discipline?: string;
  attendanceType?: string;
  status: string;
  items?: Array<{ id: string; label?: string; item?: { name: string; logisticsType?: string } }>;
  notes?: string;
  needsReview?: boolean;
}

interface ShiftData {
  config: {
    shift: "MORNING" | "AFTERNOON" | "NIGHT";
    label: string;
    emoji: string;
    startTime: string;
    endTime: string;
  };
  stats: {
    total: number;
    preparados: number;
    emAtendimento: number;
    pendentes: number;
    problemas: number;
    finalizados: number;
  };
  requests: RequestItem[];
}

interface CalendarGridViewProps {
  shiftsData: {
    MORNING: ShiftData;
    AFTERNOON: ShiftData;
    NIGHT: ShiftData;
  };
  selectedShift: "MORNING" | "AFTERNOON" | "NIGHT";
  onSelectShift: (shift: "MORNING" | "AFTERNOON" | "NIGHT") => void;
  onOpenDetails: (requestId: string) => void;
}

/**
 * Converte "HH:mm" ou Date em minutos desde as 00:00
 */
function toMinutes(val: string | Date): number {
  if (val instanceof Date) {
    return val.getHours() * 60 + val.getMinutes();
  }
  const [h, m] = String(val).split(":").map(Number);
  return h * 60 + (m || 0);
}

/**
 * Algoritmo Anti-Sobreposição:
 * Agrupa eventos que colidem no tempo e calcula colunas paralelas não sobrepostas (colIndex / totalCols)
 */
function layoutTimelineEvents(
  requests: RequestItem[],
  gridStartMin: number,
  gridEndMin: number
) {
  if (!requests || requests.length === 0) return [];

  const gridTotalMin = Math.max(60, gridEndMin - gridStartMin);

  // 1. Mapear cada evento com limites normalizados
  const mapped = requests.map((req) => {
    const sMin = toMinutes(new Date(req.startTime));
    const eMin = toMinutes(new Date(req.endTime));

    const clampedStart = Math.max(gridStartMin, Math.min(gridEndMin, sMin));
    const clampedEnd = Math.max(clampedStart + 30, Math.min(gridEndMin, Math.max(eMin, sMin + 30)));

    return {
      raw: req,
      startMin: clampedStart,
      endMin: clampedEnd,
      topPercent: ((clampedStart - gridStartMin) / gridTotalMin) * 100,
      heightPercent: Math.max(8, ((clampedEnd - clampedStart) / gridTotalMin) * 100),
      colIndex: 0,
      totalCols: 1,
    };
  });

  // 2. Ordenar por horário de início ascendente e duração descendente
  mapped.sort((a, b) => {
    if (a.startMin !== b.startMin) return a.startMin - b.startMin;
    return (b.endMin - b.startMin) - (a.endMin - a.startMin);
  });

  // 3. Agrupar em clusters de sobreposição
  const clusters: Array<typeof mapped> = [];
  let currentCluster: typeof mapped = [];
  let clusterEnd = -1;

  for (const ev of mapped) {
    if (currentCluster.length === 0) {
      currentCluster.push(ev);
      clusterEnd = ev.endMin;
    } else {
      if (ev.startMin < clusterEnd) {
        // Sobrepõe com o cluster atual
        currentCluster.push(ev);
        clusterEnd = Math.max(clusterEnd, ev.endMin);
      } else {
        // Novo cluster
        clusters.push(currentCluster);
        currentCluster = [ev];
        clusterEnd = ev.endMin;
      }
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // 4. Para cada cluster, alocar colunas paralelas sem sobreposição visual
  for (const cluster of clusters) {
    const columns: Array<typeof mapped> = [];

    for (const ev of cluster) {
      let placed = false;
      for (let c = 0; c < columns.length; c++) {
        const lastInCol = columns[c][columns[c].length - 1];
        if (ev.startMin >= lastInCol.endMin) {
          columns[c].push(ev);
          ev.colIndex = c;
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([ev]);
        ev.colIndex = columns.length - 1;
      }
    }

    const totalCols = columns.length;
    for (const ev of cluster) {
      ev.totalCols = totalCols;
    }
  }

  return mapped;
}

export function CalendarGridView({
  shiftsData,
  selectedShift = "MORNING",
  onSelectShift,
  onOpenDetails,
}: CalendarGridViewProps) {
  // 1. Definição do Escopo do Turno Selecionado
  const currentScope = useMemo(() => {
    switch (selectedShift) {
      case "MORNING": {
        const config = shiftsData.MORNING?.config || { startTime: "07:00", endTime: "12:00", label: "Manhã", emoji: "🌅" };
        const requests = shiftsData.MORNING?.requests || [];
        return {
          key: "MORNING",
          title: "Turno da Manhã",
          emoji: "🌅",
          startStr: config.startTime || "07:00",
          endStr: config.endTime || "12:00",
          startMin: toMinutes(config.startTime || "07:00"),
          endMin: toMinutes(config.endTime || "12:00"),
          hourMarkers: ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00"],
          requests,
          themeBadge: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
          headerBg: "from-amber-500/15 via-card to-card border-amber-500/30",
          minHeight: 520,
        };
      }
      case "AFTERNOON": {
        const config = shiftsData.AFTERNOON?.config || { startTime: "12:00", endTime: "18:00", label: "Tarde", emoji: "☀️" };
        const requests = shiftsData.AFTERNOON?.requests || [];
        return {
          key: "AFTERNOON",
          title: "Turno da Tarde",
          emoji: "☀️",
          startStr: config.startTime || "12:00",
          endStr: config.endTime || "18:00",
          startMin: toMinutes(config.startTime || "12:00"),
          endMin: toMinutes(config.endTime || "18:00"),
          hourMarkers: ["12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"],
          requests,
          themeBadge: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30",
          headerBg: "from-orange-500/15 via-card to-card border-orange-500/30",
          minHeight: 560,
        };
      }
      case "NIGHT": {
        const config = shiftsData.NIGHT?.config || { startTime: "18:00", endTime: "22:30", label: "Noite", emoji: "🌙" };
        const requests = shiftsData.NIGHT?.requests || [];
        return {
          key: "NIGHT",
          title: "Turno da Noite",
          emoji: "🌙",
          startStr: config.startTime || "18:00",
          endStr: config.endTime || "22:30",
          startMin: toMinutes(config.startTime || "18:00"),
          endMin: toMinutes(config.endTime || "22:30"),
          hourMarkers: ["18:00", "19:00", "20:00", "21:00", "22:00", "22:30"],
          requests,
          themeBadge: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
          headerBg: "from-indigo-500/15 via-card to-card border-indigo-500/30",
          minHeight: 520,
        };
      }
    }
  }, [shiftsData, selectedShift]);

  // 2. Contagens para as Abas de Seleção de Turno
  const countMorning = shiftsData.MORNING?.requests?.length || 0;
  const countAfternoon = shiftsData.AFTERNOON?.requests?.length || 0;
  const countNight = shiftsData.NIGHT?.requests?.length || 0;

  // 3. Layout dos Atendimentos com Anti-Sobreposição
  const positionedEvents = useMemo(() => {
    return layoutTimelineEvents(currentScope.requests, currentScope.startMin, currentScope.endMin);
  }, [currentScope]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PREPARADO":
        return "bg-emerald-500/15 border-emerald-500/50 text-emerald-950 dark:text-emerald-200 hover:bg-emerald-500/25";
      case "EM_ATENDIMENTO":
        return "bg-blue-500/15 border-blue-500/50 text-blue-950 dark:text-blue-200 hover:bg-blue-500/25";
      case "EM_PREPARACAO":
        return "bg-amber-500/15 border-amber-500/50 text-amber-950 dark:text-amber-200 hover:bg-amber-500/25";
      case "PROBLEMA":
        return "bg-rose-500/15 border-rose-500/50 text-rose-950 dark:text-rose-200 hover:bg-rose-500/25";
      case "FINALIZADO":
        return "bg-muted/70 border-border/80 text-muted-foreground hover:bg-muted";
      case "CANCELADO":
        return "bg-muted/30 border-dashed border-border text-muted-foreground/60 line-through";
      default:
        return "bg-amber-500/15 border-amber-500/40 text-amber-950 dark:text-amber-200 hover:bg-amber-500/25";
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in-50 duration-300">
      
      {/* 1. Abas de Seleção Rápida de Turno da Grade */}
      <div className="p-1.5 sm:p-2 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center justify-between flex-wrap gap-2">
        <div className="grid grid-cols-3 gap-1.5 w-full sm:flex sm:items-center sm:w-auto flex-1 min-w-0">
          
          {/* Botão Manhã */}
          <button
            onClick={() => onSelectShift("MORNING")}
            className={`w-full sm:w-auto px-2 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-xs transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 cursor-pointer ${
              selectedShift === "MORNING"
                ? "bg-amber-500 text-amber-950 shadow-md shadow-amber-500/20"
                : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <div className="flex items-center justify-center gap-1 min-w-0">
              <span className="text-sm sm:text-base shrink-0">🌅</span>
              <span className="truncate">Manhã</span>
              <Badge 
                variant="outline" 
                className={`text-[10px] px-1 py-0 ml-0.5 ${
                  selectedShift === "MORNING" ? "border-amber-950/30 bg-amber-950/10 text-amber-950 font-black" : "border-border text-muted-foreground"
                }`}
              >
                {countMorning}
              </Badge>
            </div>
            <span className="text-[10px] font-normal opacity-80 hidden md:inline">
              (07:00 - 12:00)
            </span>
          </button>

          {/* Botão Tarde */}
          <button
            onClick={() => onSelectShift("AFTERNOON")}
            className={`w-full sm:w-auto px-2 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-xs transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 cursor-pointer ${
              selectedShift === "AFTERNOON"
                ? "bg-orange-500 text-orange-950 shadow-md shadow-orange-500/20"
                : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <div className="flex items-center justify-center gap-1 min-w-0">
              <span className="text-sm sm:text-base shrink-0">☀️</span>
              <span className="truncate">Tarde</span>
              <Badge 
                variant="outline" 
                className={`text-[10px] px-1 py-0 ml-0.5 ${
                  selectedShift === "AFTERNOON" ? "border-orange-950/30 bg-orange-950/10 text-orange-950 font-black" : "border-border text-muted-foreground"
                }`}
              >
                {countAfternoon}
              </Badge>
            </div>
            <span className="text-[10px] font-normal opacity-80 hidden md:inline">
              (12:00 - 18:00)
            </span>
          </button>

          {/* Botão Noite */}
          <button
            onClick={() => onSelectShift("NIGHT")}
            className={`w-full sm:w-auto px-2 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-xs transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 cursor-pointer ${
              selectedShift === "NIGHT"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <div className="flex items-center justify-center gap-1 min-w-0">
              <span className="text-sm sm:text-base shrink-0">🌙</span>
              <span className="truncate">Noite</span>
              <Badge 
                variant="outline" 
                className={`text-[10px] px-1 py-0 ml-0.5 ${
                  selectedShift === "NIGHT" ? "border-white/30 bg-white/20 text-white font-black" : "border-border text-muted-foreground"
                }`}
              >
                {countNight}
              </Badge>
            </div>
            <span className="text-[10px] font-normal opacity-80 hidden md:inline">
              (18:00 - 22:30)
            </span>
          </button>

        </div>

        <span className="text-[11px] text-muted-foreground px-2 hidden lg:inline">
          Selecione o turno acima para mudar a grade instantaneamente
        </span>
      </div>

      {/* 2. Grade Única do Turno Selecionado */}
      <div className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-xs space-y-2">
        
        {/* Cabeçalho do Turno Ativo */}
        <div className="p-4 border-b border-border/60 bg-muted/20 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{currentScope.emoji}</span>
            <div>
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <span>{currentScope.title}</span>
                <span className="text-xs font-mono font-normal text-muted-foreground">
                  ({currentScope.startStr} às {currentScope.endStr})
                </span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs font-bold ${currentScope.themeBadge}`}>
              {currentScope.requests.length} {currentScope.requests.length === 1 ? "atendimento agendado" : "atendimentos agendados"}
            </Badge>
          </div>
        </div>

        {/* Linha do Tempo Única */}
        <div 
          style={{ minHeight: `${currentScope.minHeight}px` }} 
          className="relative flex p-4 pt-2"
        >
          {/* Eixo Vertical de Horas */}
          <div className="w-14 sm:w-16 shrink-0 flex flex-col justify-between text-[11px] font-mono font-semibold text-muted-foreground pr-2.5 border-r border-border/80 select-none">
            {currentScope.hourMarkers.map((time, idx) => (
              <div key={idx} className="h-16 flex items-start">
                <span>{time}</span>
              </div>
            ))}
          </div>

          {/* Área Central da Grade */}
          <div className="relative flex-1 min-w-0 ml-3">
            
            {/* Linhas Horizontais de Grade */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {currentScope.hourMarkers.map((time, idx) => (
                <div key={idx} className="w-full border-b border-border/30 h-16" />
              ))}
            </div>

            {/* Renderização dos Atendimentos com Anti-Sobreposição */}
            <div className="relative w-full h-full" style={{ minHeight: `${currentScope.minHeight - 40}px` }}>
              {positionedEvents.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-xs text-muted-foreground space-y-1.5">
                  <CheckCircle2 className="w-8 h-8 text-muted-foreground/30 mb-1" />
                  <p className="font-bold text-sm text-foreground">Nenhum atendimento no {currentScope.title}</p>
                  <p className="text-xs text-muted-foreground">Horários livres de preparos e entregas para este turno.</p>
                </div>
              ) : (
                positionedEvents.map((ev) => {
                  const req = ev.raw;
                  const startStr = new Date(req.startTime).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const endStr = new Date(req.endTime).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  // Posicionamento Anti-Sobreposição: divide a largura caso haja colisão
                  const widthPercent = 100 / ev.totalCols;
                  const leftPercent = ev.colIndex * widthPercent;

                  const fixedItems = req.items?.filter((i: any) => i.item?.logisticsType === "FIXED_IN_ROOM") || [];
                  const mobileItems = req.items?.filter((i: any) => i.item?.logisticsType !== "FIXED_IN_ROOM") || [];

                  return (
                    <div
                      key={req.id}
                      onClick={() => onOpenDetails(req.id)}
                      style={{
                        top: `${ev.topPercent}%`,
                        height: `${ev.heightPercent}%`,
                        left: `calc(${leftPercent}% + 4px)`,
                        width: `calc(${widthPercent}% - 8px)`,
                      }}
                      className={`absolute rounded-2xl border p-3 shadow-sm backdrop-blur-sm cursor-pointer transition-all duration-200 hover:z-30 hover:scale-[1.01] hover:shadow-md flex flex-col justify-between overflow-hidden ${getStatusColor(
                        req.status
                      )}`}
                      title={`Sala ${req.room?.name} - ${req.professorName || "Reserva"} (${startStr} às ${endStr})`}
                    >
                      <div className="space-y-1 min-w-0">
                        {/* Linha Superior: Sala + Horário */}
                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                          <span className="font-black text-xs bg-card/90 text-foreground px-2 py-0.5 rounded-lg border border-border/50 shadow-2xs shrink-0">
                            Sala {req.room?.name}
                          </span>
                          <span className="font-mono text-xs font-bold opacity-90 shrink-0">
                            {startStr} - {endStr}
                          </span>
                        </div>

                        {/* Docente / Solicitante */}
                        <p className="text-xs font-bold truncate text-foreground pt-0.5">
                          {req.professorName || "Reserva sem docente"}
                        </p>

                        {/* Disciplina */}
                        {req.discipline && (
                          <p className="text-[11px] text-muted-foreground truncate font-medium">
                            {req.discipline}
                          </p>
                        )}
                      </div>

                      {/* Rodapé do Card: Equipamentos e Indicadores */}
                      <div className="flex items-center gap-2 text-[10px] font-medium pt-1.5 border-t border-border/30 mt-1 flex-wrap">
                        {fixedItems.length > 0 && (
                          <span className="text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-0.5">
                            <Tv className="w-3 h-3" /> Fixo na sala
                          </span>
                        )}
                        {mobileItems.length > 0 && (
                          <span className="text-primary font-bold flex items-center gap-0.5">
                            <Package className="w-3 h-3" /> {mobileItems.length} {mobileItems.length === 1 ? "item móvel" : "itens móveis"}
                          </span>
                        )}
                        {req.needsReview && (
                          <span className="text-amber-600 dark:text-amber-400 font-bold">
                            ⚠️ Revisão Pendente
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
