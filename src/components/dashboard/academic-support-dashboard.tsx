"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Calendar, 
  Plus, 
  Boxes, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  ChevronRight, 
  RefreshCw, 
  ShieldCheck, 
  Monitor, 
  School,
  ExternalLink,
  Info
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

interface AcademicSupportDashboardProps {
  userName: string;
  userRole: string;
}

export function AcademicSupportDashboard({ userName }: AcademicSupportDashboardProps) {
  const [requests, setRequests] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAcademicData = async () => {
    try {
      setIsLoading(true);
      const [reqRes, roomRes] = await Promise.all([
        fetch("/api/v1/requests"),
        fetch("/api/v1/rooms"),
      ]);

      const reqJson = await reqRes.json();
      const roomJson = await roomRes.json();

      if (reqJson && reqJson.success && Array.isArray(reqJson.data)) {
        setRequests(reqJson.data);
      } else {
        setRequests([]);
      }

      if (roomJson && roomJson.success && Array.isArray(roomJson.data)) {
        setRooms(roomJson.data);
      } else {
        setRooms([]);
      }
    } catch (e) {
      console.error("Erro ao carregar dados do painel acadêmico:", e);
      setRequests([]);
      setRooms([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAcademicData();
  }, []);

  const today = new Date().toISOString().split("T")[0];
  const todayRequests = requests.filter((r) => r.date === today || (r.date && r.date.startsWith(today)));
  const pendingRequests = requests.filter((r) => r.status === "AGENDADO" || r.status === "EM_PREPARACAO");
  const readyRequests = requests.filter((r) => r.status === "PREPARADO" || r.status === "EM_ATENDIMENTO");
  const roomsWithProjector = rooms.filter((r) => r.fixedProjectorModel);

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* 1. Header & Welcome Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-600/15 via-indigo-600/10 to-transparent border border-blue-500/20 backdrop-blur-md shadow-xs">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Portal de Apoio Acadêmico • TI UniFAP
            </span>
            <Badge variant="academic" className="text-[10px]">
              Apoio Acadêmico
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Olá, {userName.split(" ")[0]}!
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
            Acompanhe o atendimento às suas aulas, solicite recursos de multimídia com facilidade e consulte a infraestrutura das salas.
          </p>
        </div>

        {/* Botões de Ação Rápida */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            asChild
            size="sm"
            className="rounded-xl text-xs h-10 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-500/20 gap-2 cursor-pointer"
          >
            <Link href="/agenda/nova-solicitacao">
              <Plus className="w-4 h-4" />
              <span>Nova Solicitação de Aula</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl text-xs h-10 px-3.5 gap-1.5 bg-card/60 cursor-pointer"
          >
            <Link href="/agenda">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span>Ver Agenda</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl text-xs h-10 px-3.5 gap-1.5 bg-card/60 cursor-pointer"
          >
            <Link href="/salas">
              <School className="w-4 h-4 text-indigo-500" />
              <span>Consultar Salas</span>
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchAcademicData}
            className="rounded-xl text-xs h-10 w-10 p-0 text-muted-foreground hover:text-foreground justify-center bg-card/60 cursor-pointer"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* 2. KPI Cards Resumidos e Focados no Solicitante */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Aulas Hoje */}
        <Card className="rounded-2xl border-border/80 bg-gradient-to-br from-blue-500/10 via-card to-card shadow-xs">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Solicitações Hoje
              </span>
              <p className="text-3xl font-extrabold text-foreground">
                {todayRequests.length}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Aulas com apoio multimídia no dia
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Em Preparação */}
        <Card className="rounded-2xl border-border/80 bg-gradient-to-br from-amber-500/10 via-card to-card shadow-xs">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Em Preparação
              </span>
              <p className="text-3xl font-extrabold text-foreground">
                {pendingRequests.length}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Equipe técnica separando equipamentos
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Prontas / Em Aula */}
        <Card className="rounded-2xl border-border/80 bg-gradient-to-br from-emerald-500/10 via-card to-card shadow-xs">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Prontas / Em Aula
              </span>
              <p className="text-3xl font-extrabold text-foreground">
                {readyRequests.length}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Equipamentos testados ou já em sala
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Infraestrutura Fixa */}
        <Card className="rounded-2xl border-border/80 bg-gradient-to-br from-indigo-500/10 via-card to-card shadow-xs">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Salas c/ Projetor Fixo
              </span>
              <p className="text-3xl font-extrabold text-foreground">
                {roomsWithProjector.length} <span className="text-xs font-normal text-muted-foreground">/ {rooms.length || 53}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                Projetores no teto com cabos HDMI
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-600 flex items-center justify-center">
              <School className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Seção Principal: Próximas Solicitações de Aula & Orientações */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabela de Solicitações (2 Colunas) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <span>Próximas Solicitações de Aula</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Acompanhe o status e os recursos alocados para cada atendimento
              </p>
            </div>

            <Button asChild size="sm" variant="ghost" className="text-xs rounded-xl text-primary cursor-pointer">
              <Link href="/agenda">
                <span>Ver Todas</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>

          <Card className="rounded-2xl border-border/80 overflow-hidden shadow-xs">
            {isLoading ? (
              <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                <span>Carregando solicitações...</span>
              </div>
            ) : requests.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-3">
                <Calendar className="w-8 h-8 text-muted-foreground/40" />
                <p className="font-semibold text-foreground text-sm">Nenhuma solicitação cadastrada no momento</p>
                <p className="text-[11px] max-w-sm">
                  Precisa de suporte multimídia, notebooks, chromebooks ou caixas de som para suas aulas?
                </p>
                <Button asChild size="sm" className="rounded-xl text-xs gap-1 bg-primary text-primary-foreground font-bold mt-1 cursor-pointer">
                  <Link href="/agenda/nova-solicitacao">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Criar Primeira Solicitação</span>
                  </Link>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-bold py-3 pl-4">Sala & Docente</TableHead>
                    <TableHead className="text-xs font-bold py-3 px-3">Data & Horário</TableHead>
                    <TableHead className="text-xs font-bold py-3 px-3">Recursos</TableHead>
                    <TableHead className="text-xs font-bold py-3 px-3">Situação</TableHead>
                    <TableHead className="text-xs font-bold py-3 pr-4 text-center">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.slice(0, 6).map((req: any) => {
                    const isToday = req.date === today || (req.date && req.date.startsWith(today));
                    const startTimeStr = req.startTime
                      ? new Date(req.startTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                      : "-";
                    const endTimeStr = req.endTime
                      ? new Date(req.endTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                      : "-";

                    const getReqBadge = (status: string) => {
                      switch (status) {
                        case "PREPARADO":
                          return <Badge variant="available" dot className="text-[10px] font-bold">Preparado</Badge>;
                        case "EM_ATENDIMENTO":
                          return <Badge variant="in_use" dot className="text-[10px] font-bold">Em Aula</Badge>;
                        case "FINALIZADO":
                          return <Badge variant="outline" className="text-[10px]">Finalizado</Badge>;
                        case "CANCELADO":
                          return <Badge variant="damaged" className="text-[10px]">Cancelado</Badge>;
                        default:
                          return <Badge variant="low" dot className="text-[10px] font-bold">Aguardando</Badge>;
                      }
                    };

                    return (
                      <TableRow key={req.id} className="hover:bg-muted/30">
                        <TableCell className="py-3 pl-4">
                          <div className="space-y-0.5">
                            <span className="font-bold text-xs text-foreground block">
                              Sala {req.room?.name || "A Definir"} {req.room?.floor && `(${req.room.floor})`}
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate block max-w-[180px]">
                              {req.professorName || "Docente"} {req.discipline && `• ${req.discipline}`}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="py-3 px-3">
                          <div className="space-y-0.5">
                            <span className={`text-xs font-medium ${isToday ? "text-primary font-bold" : "text-foreground"}`}>
                              {isToday ? "Hoje" : formatDate(req.date)}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono block">
                              {startTimeStr} às {endTimeStr}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="py-3 px-3">
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {req.items && req.items.length > 0 ? (
                              req.items.map((item: any, i: number) => (
                                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium truncate">
                                  {item.quantity}x {item.item?.name || item.resourceType}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-muted-foreground">Datashow da sala</span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="py-3 px-3">
                          {getReqBadge(req.status)}
                        </TableCell>

                        <TableCell className="py-3 pr-4 text-center">
                          <Button asChild size="sm" variant="outline" className="h-7 text-[11px] rounded-lg px-2 text-primary cursor-pointer">
                            <Link href={`/agenda?requestId=${req.id}`}>
                              <span>Ver</span>
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>

        {/* Coluna Lateral: Dicas & Orientações Úteis (1 Coluna) */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <span>Guia & Orientações</span>
          </h2>

          <div className="space-y-3">
            {/* Card Dica 1: Projetor Fixo */}
            <Card className="rounded-2xl border-blue-500/20 bg-blue-500/5 p-4 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-blue-700 dark:text-blue-300">
                <Boxes className="w-4 h-4" />
                <span>Salas com Projetor Fixo</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                As salas de aula possuem projetores fixos instalados no teto com cabos HDMI conectados. Ao solicitar, basta informar que usará o <strong>Datashow da Sala</strong>.
              </p>
            </Card>

            {/* Card Dica 2: Turnos */}
            <Card className="rounded-2xl border-indigo-500/20 bg-indigo-500/5 p-4 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-indigo-700 dark:text-indigo-300">
                <Clock className="w-4 h-4" />
                <span>Horários dos Turnos</span>
              </div>
              <ul className="text-[11px] text-muted-foreground space-y-1">
                <li>🌅 <strong>Manhã:</strong> 07:00 às 12:00</li>
                <li>☀️ <strong>Tarde:</strong> 12:00 às 18:00</li>
                <li>🌙 <strong>Noite:</strong> 18:00 às 22:30</li>
              </ul>
            </Card>

            {/* Card Dica 3: Suporte Técnico */}
            <Card className="rounded-2xl border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="w-4 h-4" />
                <span>Suporte Técnico Multimídia</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                A equipe técnica realiza a preparação e teste dos recursos antes do início do turno. Em caso de dúvidas ou urgências, contate a equipe no setor.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
