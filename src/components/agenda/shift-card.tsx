"use client";

import React from "react";
import { 
  Clock, 
  MapPin, 
  User, 
  Tv, 
  Package, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles,
  ChevronRight,
  Monitor
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ShiftCardProps {
  shiftData: {
    config: {
      shift: string;
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
      cancelados: number;
      pendingReviewCount: number;
    };
    requests: any[];
  };
  isCurrentShift: boolean;
  onOpenDetails: (requestId: string) => void;
}

export function ShiftCard({
  shiftData,
  isCurrentShift,
  onOpenDetails,
}: ShiftCardProps) {
  const { config, stats, requests } = shiftData;

  const getShiftGradient = (shift: string) => {
    switch (shift) {
      case "MORNING":
        return "from-amber-500/10 via-card to-card border-amber-500/30";
      case "AFTERNOON":
        return "from-orange-500/10 via-card to-card border-orange-500/30";
      case "NIGHT":
        return "from-indigo-600/10 via-card to-card border-indigo-500/30";
      default:
        return "from-primary/10 via-card to-card border-border/80";
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case "PREPARADO":
        return <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-xs" title="Preparado" />;
      case "EM_ATENDIMENTO":
        return <span className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse shadow-xs" title="Em atendimento" />;
      case "EM_PREPARACAO":
        return <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-xs" title="Em preparação" />;
      case "PROBLEMA":
        return <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping shadow-xs" title="Problema reportado" />;
      case "FINALIZADO":
        return <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/50" title="Finalizado" />;
      case "CANCELADO":
        return <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30 line-through" title="Cancelado" />;
      default:
        return <span className="h-2.5 w-2.5 rounded-full bg-amber-400" title="Agendado / Pendente" />;
    }
  };

  return (
    <Card
      className={`rounded-3xl transition-all duration-300 overflow-hidden flex flex-col bg-gradient-to-b ${getShiftGradient(
        config.shift
      )} ${
        isCurrentShift
          ? "ring-2 ring-primary shadow-lg shadow-primary/10"
          : "border-border/80 shadow-xs hover:border-border"
      }`}
    >
      {/* Header do Turno */}
      <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/60 bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{config.emoji}</span>
            <div>
              <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
                <span>{config.label}</span>
                {isCurrentShift && (
                  <Badge variant="default" className="text-[9px] px-1.5 py-0 uppercase bg-primary animate-pulse">
                    Em Curso
                  </Badge>
                )}
              </CardTitle>
              <p className="text-[11px] font-mono text-muted-foreground">
                {config.startTime} às {config.endTime}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xl font-black text-foreground">{stats.total}</span>
            <span className="text-[10px] block text-muted-foreground uppercase font-semibold">
              {stats.total === 1 ? "Atendimento" : "Atendimentos"}
            </span>
          </div>
        </div>

        {/* Barra de Indicadores do Turno */}
        <div className="grid grid-cols-3 gap-1.5 pt-3 text-center text-[10px] font-bold">
          <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <span>{stats.preparados} Prontos</span>
          </div>
          <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <span>{stats.pendentes} Pendentes</span>
          </div>
          <div className="p-1.5 rounded-xl bg-muted/60 text-muted-foreground">
            <span>{stats.finalizados} Concluídos</span>
          </div>
        </div>
      </CardHeader>

      {/* Lista de Atendimentos */}
      <CardContent className="p-3 sm:p-4 flex-1 flex flex-col justify-between space-y-2.5">
        {requests.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground flex-1 flex flex-col items-center justify-center space-y-1">
            <CheckCircle2 className="w-6 h-6 text-muted-foreground/40 mb-1" />
            <p className="text-xs font-semibold">Nenhum atendimento agendado</p>
            <p className="text-[11px] text-muted-foreground/80">Turno livre de preparos.</p>
          </div>
        ) : (
          <div className="space-y-2 flex-1">
            {requests.map((req) => {
              const startStr = new Date(req.startTime).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              });
              const endStr = new Date(req.endTime).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              });

              const fixedItems = req.items?.filter((i: any) => i.item?.logisticsType === "FIXED_IN_ROOM") || [];
              const mobileItems = req.items?.filter((i: any) => i.item?.logisticsType !== "FIXED_IN_ROOM") || [];

              return (
                <div
                  key={req.id}
                  onClick={() => onOpenDetails(req.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer group hover:scale-[1.01] ${
                    req.status === "PREPARADO"
                      ? "bg-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/60"
                      : req.status === "EM_ATENDIMENTO"
                      ? "bg-blue-500/5 border-blue-500/30 hover:border-blue-500/60"
                      : req.status === "PROBLEMA"
                      ? "bg-rose-500/5 border-rose-500/30 hover:border-rose-500/60"
                      : "bg-card border-border/70 hover:border-primary/50"
                  }`}
                >
                  {/* Linha Superior: Horário + Sala + Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {getStatusDot(req.status)}
                      <span className="font-mono text-xs font-bold text-foreground">
                        {startStr} - {endStr}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="font-extrabold text-xs px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                        Sala {req.room?.name}
                      </span>
                    </div>
                  </div>

                  {/* Docente e Disciplina */}
                  <div className="pt-1.5 space-y-0.5">
                    <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {req.professorName || "Professor não informado"}
                    </p>
                    {req.discipline && (
                      <p className="text-[11px] text-muted-foreground truncate">{req.discipline}</p>
                    )}
                  </div>

                  {/* Resumo de Equipamentos */}
                  <div className="pt-2 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/40 mt-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {fixedItems.length > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5" title="Datashow fixo já na sala">
                          <Tv className="w-3 h-3" /> Fixo
                        </span>
                      )}
                      {mobileItems.length > 0 && (
                        <span className="text-primary font-semibold flex items-center gap-0.5">
                          <Package className="w-3 h-3" /> {mobileItems.length} móvel
                        </span>
                      )}
                      {req.needsReview && (
                        <span className="text-amber-500 font-bold">⚠️ Revisão</span>
                      )}
                    </div>

                    <span className="text-[10px] text-muted-foreground group-hover:text-foreground flex items-center gap-0.5">
                      <span>Ver</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
