"use client";

import React from "react";
import { 
  Sparkles, 
  Clock, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  Tv, 
  Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NextAppointmentBannerProps {
  request: any | null;
  onOpenDetails: (requestId: string) => void;
}

export function NextAppointmentBanner({
  request,
  onOpenDetails,
}: NextAppointmentBannerProps) {
  if (!request) {
    return (
      <div className="p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
              Operação em dia!
            </p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
              Nenhum atendimento pendente aguardando preparo no momento.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const startTimeStr = new Date(request.startTime).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTimeStr = new Date(request.endTime).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const fixedItems = request.items?.filter((i: any) => i.item?.logisticsType === "FIXED_IN_ROOM") || [];
  const mobileItems = request.items?.filter((i: any) => i.item?.logisticsType !== "FIXED_IN_ROOM") || [];

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-primary/20 via-indigo-600/15 to-card border border-primary/30 backdrop-blur-md shadow-md relative overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Lado Esquerdo: Identificação & Horário */}
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
              <Sparkles className="w-3 h-3" />
              Próximo Atendimento
            </span>
            <span className="text-xs font-mono font-bold text-primary flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {startTimeStr} às {endTimeStr}
            </span>
            {request.status === "PREPARADO" ? (
              <Badge variant="available" className="text-[10px]">🟢 PREPARADO</Badge>
            ) : request.status === "EM_ATENDIMENTO" ? (
              <Badge variant="loaned" className="text-[10px]">🔵 EM ATENDIMENTO</Badge>
            ) : (
              <Badge variant="low" className="text-[10px]">🟡 PENDENTE</Badge>
            )}
          </div>

          <div className="flex items-baseline gap-2 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Sala {request.room?.name}
            </h2>
            {request.room?.floor && (
              <span className="text-xs text-muted-foreground">({request.room.floor})</span>
            )}
            <span className="text-muted-foreground">•</span>
            <span className="text-sm font-semibold text-foreground">
              {request.professorName || "Professor não informado"}
            </span>
          </div>

          <p className="text-xs text-muted-foreground truncate max-w-2xl">
            {request.discipline ? `${request.discipline} • ` : ""}
            {request.attendanceType || "Presencial"}
            {request.notes ? ` • Obs: ${request.notes}` : ""}
          </p>

          {/* Resumo de Equipamentos com Distinção Fixo vs Móvel */}
          <div className="flex items-center gap-3 text-[11px] pt-1 flex-wrap">
            {fixedItems.length > 0 && (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <Tv className="w-3.5 h-3.5" />
                Datashow fixo na sala (ligar)
              </span>
            )}
            {mobileItems.length > 0 && (
              <span className="text-primary font-semibold flex items-center gap-1">
                <Package className="w-3.5 h-3.5" />
                {mobileItems.length} {mobileItems.length === 1 ? "item móvel" : "itens móveis"} ({mobileItems.map((m: any) => m.label).join(", ")})
              </span>
            )}
            {request.assignedUser && (
              <span className="text-muted-foreground flex items-center gap-1 ml-auto sm:ml-0">
                <User className="w-3 h-3" />
                Responsável: <strong className="text-foreground">{request.assignedUser.name}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Lado Direito: Ação Rápida */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => onOpenDetails(request.id)}
            size="sm"
            className="rounded-2xl text-xs h-10 px-4 bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 gap-1.5 cursor-pointer hover:scale-105 transition-all"
          >
            <span>Preparar / Ver Detalhes</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

      </div>
    </div>
  );
}
