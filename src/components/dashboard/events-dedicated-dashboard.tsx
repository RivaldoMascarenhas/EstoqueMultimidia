"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Sparkles, 
  Users, 
  Gift, 
  ScanFace, 
  Trophy, 
  Tv, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Plus, 
  RefreshCw,
  BarChart3,
  Layers
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

interface EventsDedicatedDashboardProps {
  userName: string;
  userRole: string;
}

export function EventsDedicatedDashboard({ userName, userRole }: EventsDedicatedDashboardProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    totalEvents: 0,
    activeEvents: 0,
    upcomingEvents: 0,
    totalParticipants: 0,
    totalPresences: 0,
    availablePrizes: 0,
    drawnPrizes: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchEventsData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/v1/events?limit=10");
      const data = await res.json();

      if (data.success && Array.isArray(data.events)) {
        setEvents(data.events);

        // Calcular KPIs a partir dos eventos
        let totalParticipants = 0;
        let totalPresences = 0;
        let active = 0;
        let upcoming = 0;
        let availablePrizes = 0;
        let drawnPrizes = 0;

        data.events.forEach((ev: any) => {
          if (ev.status === "ACTIVE" || ev.status === "STARTED") active++;
          if (ev.status === "SCHEDULED" || ev.status === "DRAFT") upcoming++;

          totalParticipants += ev._count?.participants || 0;
          totalPresences += ev._count?.presences || 0;
          availablePrizes += ev._count?.prizes || 0;
          drawnPrizes += ev._count?.winners || 0;
        });

        setMetrics({
          totalEvents: data.total || data.events.length,
          activeEvents: active,
          upcomingEvents: upcoming,
          totalParticipants,
          totalPresences,
          availablePrizes,
          drawnPrizes,
        });
      }
    } catch (err) {
      console.error("Erro ao carregar dashboard de eventos:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEventsData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
      case "STARTED":
        return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Em Andamento</Badge>;
      case "SCHEDULED":
        return <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30">Agendado</Badge>;
      case "COMPLETED":
        return <Badge variant="outline" className="text-muted-foreground">Finalizado</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">Rascunho</Badge>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      
      {/* 1. Header & Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/95 via-primary/85 to-accent/90 p-6 md:p-8 text-primary-foreground shadow-lg border border-primary/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5" />
                Painel de Eventos Acadêmicos
              </span>
              <Badge className="bg-amber-400/90 text-amber-950 font-bold border-none hover:bg-amber-400">
                Perfil: EVENTOS
              </Badge>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Olá, {userName} 👋
            </h1>
            <p className="text-sm md:text-base text-white/85 font-medium leading-relaxed">
              Bem-vindo ao centro de gestão de eventos da UniFAP. Administre participantes, realize credenciamento com biometria facial, configure prêmios e opere o telão de sorteios.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchEventsData}
              disabled={isLoading}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Link href="/eventos">
              <Button className="bg-white text-primary hover:bg-white/90 font-semibold shadow-md">
                <Plus className="h-4 w-4 mr-1.5" />
                Novo Evento
              </Button>
            </Link>
          </div>
        </div>

        {/* Decorative Background Accents */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-accent/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 2. Quick Action Grid */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
          Ações Rápidas do Módulo
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          
          <Link href="/eventos" className="group">
            <Card className="h-full p-4 hover:border-primary/50 hover:shadow-md transition-all duration-200 group-hover:-translate-y-0.5 cursor-pointer bg-card/60 backdrop-blur-sm">
              <div className="flex flex-col items-center text-center gap-2.5">
                <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">Gerenciar</p>
                  <p className="text-[11px] text-muted-foreground">Meus Eventos</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/biometria/pessoas" className="group">
            <Card className="h-full p-4 hover:border-blue-500/50 hover:shadow-md transition-all duration-200 group-hover:-translate-y-0.5 cursor-pointer bg-card/60 backdrop-blur-sm">
              <div className="flex flex-col items-center text-center gap-2.5">
                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                  <Users className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">Participantes</p>
                  <p className="text-[11px] text-muted-foreground">Inscrições & Base</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/presenca" className="group">
            <Card className="h-full p-4 hover:border-emerald-500/50 hover:shadow-md transition-all duration-200 group-hover:-translate-y-0.5 cursor-pointer bg-card/60 backdrop-blur-sm">
              <div className="flex flex-col items-center text-center gap-2.5">
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                  <ScanFace className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">Presença</p>
                  <p className="text-[11px] text-muted-foreground">Check-in Facial</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/sorteios" className="group">
            <Card className="h-full p-4 hover:border-amber-500/50 hover:shadow-md transition-all duration-200 group-hover:-translate-y-0.5 cursor-pointer bg-card/60 backdrop-blur-sm">
              <div className="flex flex-col items-center text-center gap-2.5">
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                  <Trophy className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">Sorteios</p>
                  <p className="text-[11px] text-muted-foreground">Operar & Prêmios</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/relatorios" className="group">
            <Card className="h-full p-4 hover:border-purple-500/50 hover:shadow-md transition-all duration-200 group-hover:-translate-y-0.5 cursor-pointer bg-card/60 backdrop-blur-sm">
              <div className="flex flex-col items-center text-center gap-2.5">
                <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">Relatórios</p>
                  <p className="text-[11px] text-muted-foreground">Listas & PDFs</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/eventos" className="group">
            <Card className="h-full p-4 hover:border-indigo-500/50 hover:shadow-md transition-all duration-200 group-hover:-translate-y-0.5 cursor-pointer bg-card/60 backdrop-blur-sm">
              <div className="flex flex-col items-center text-center gap-2.5">
                <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                  <Tv className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">Telão</p>
                  <p className="text-[11px] text-muted-foreground">Abrir Projeção</p>
                </div>
              </div>
            </Card>
          </Link>

        </div>
      </div>

      {/* 3. KPI Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <Card className="border-l-4 border-l-primary shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Total de Eventos</p>
              <p className="text-2xl font-bold text-foreground">{metrics.totalEvents}</p>
              <p className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{metrics.activeEvents}</span> em andamento
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Participantes Inscritos</p>
              <p className="text-2xl font-bold text-foreground">{metrics.totalParticipants}</p>
              <p className="text-[11px] text-muted-foreground">Cadastros nos eventos</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Presenças Confirmadas</p>
              <p className="text-2xl font-bold text-foreground">{metrics.totalPresences}</p>
              <p className="text-[11px] text-muted-foreground">
                {metrics.totalParticipants > 0 
                  ? `${Math.round((metrics.totalPresences / metrics.totalParticipants) * 100)}% de taxa de presença`
                  : "Registros biométricos"}
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Prêmios Cadastrados</p>
              <p className="text-2xl font-bold text-foreground">{metrics.availablePrizes}</p>
              <p className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-amber-600 dark:text-amber-400">{metrics.drawnPrizes}</span> já sorteados
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Trophy className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

      </div>

      {/* 4. Recent Events Table */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between py-4 px-6 border-b border-border/60">
          <div>
            <CardTitle className="text-base font-bold">Meus Eventos Recentes</CardTitle>
            <CardDescription className="text-xs">Lista de eventos cadastrados para operação</CardDescription>
          </div>
          <Link href="/eventos">
            <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary/90 font-medium">
              Ver todos <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" /> Carregando eventos...
            </div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <p>Nenhum evento encontrado.</p>
              <Link href="/eventos" className="mt-3 inline-block">
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" /> Criar Primeiro Evento
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento</TableHead>
                  <TableHead>Data / Local</TableHead>
                  <TableHead className="text-center">Inscritos</TableHead>
                  <TableHead className="text-center">Presenças</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((ev) => (
                  <TableRow key={ev.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell>
                      <div className="font-semibold text-sm text-foreground">{ev.name}</div>
                      <div className="text-xs text-muted-foreground">/{ev.slug}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-medium text-foreground">
                        {ev.date ? formatDate(ev.date) : "Sem data"} {ev.time ? `às ${ev.time}` : ""}
                      </div>
                      <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {ev.location || "Local não informado"}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-semibold text-xs">
                      {ev._count?.participants || 0}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-xs text-emerald-600 dark:text-emerald-400">
                      {ev._count?.presences || 0}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(ev.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/eventos/${ev.id}`}>
                          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs">
                            Gerenciar
                          </Button>
                        </Link>
                        <Link href={`/eventos/${ev.id}/sorteio`}>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-amber-600 dark:text-amber-400" title="Abrir Sorteio">
                            <Trophy className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
