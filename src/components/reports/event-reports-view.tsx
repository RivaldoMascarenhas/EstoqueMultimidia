"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  Users,
  CheckCircle2,
  Trophy,
  Printer,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  Gift,
  Building2,
  Clock,
  Check,
  X,
  ExternalLink,
  Play,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { formatDateTime, formatDate } from "@/lib/utils";
import { toast } from "sonner";

export type EventReportSubtype = "PARTICIPANTS" | "PRESENCES" | "WINNERS";

export function EventReportsView() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [subtype, setSubtype] = useState<EventReportSubtype>("PARTICIPANTS");

  // Filters & State
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  // Data arrays
  const [participants, setParticipants] = useState<any[]>([]);
  const [presences, setPresences] = useState<any[]>([]);
  const [winners, setWinners] = useState<any[]>([]);

  // Fetch events list
  useEffect(() => {
    fetch("/api/v1/events?limit=50")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.items?.length > 0) {
          setEvents(data.items);
          setSelectedEventId(data.items[0].id);
        }
      })
      .catch(() => toast.error("Erro ao carregar lista de eventos."))
      .finally(() => setLoading(false));
  }, []);

  // Fetch event details, participants, presences and winners in parallel
  useEffect(() => {
    if (!selectedEventId) return;

    setDataLoading(true);
    const ev = events.find((e) => e.id === selectedEventId) || null;
    setSelectedEvent(ev);

    Promise.all([
      fetch(`/api/v1/events/${selectedEventId}/participants?limit=500`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            const list = data.items || data.participants || [];
            setParticipants(list);
            setPresences(list.filter((p: any) => p.hasPresence));
          }
        }),
      fetch(`/api/v1/events/${selectedEventId}/winners`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setWinners(data.winners || data.items || []);
          }
        }),
    ])
      .catch(() => toast.error("Erro ao carregar dados do evento."))
      .finally(() => setDataLoading(false));
  }, [selectedEventId, events]);

  // Categories list
  const categories = Array.from(
    new Set(participants.map((p) => p.category).filter(Boolean))
  );

  // Filtered participants
  const filteredParticipants = participants.filter((p) => {
    const matchesSearch =
      !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.registration?.toLowerCase().includes(search.toLowerCase()) ||
      p.ticketNumber?.toString().includes(search);
    const matchesCategory =
      categoryFilter === "ALL" || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Filtered presences
  const filteredPresences = presences.filter((p) => {
    const matchesSearch =
      !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.registration?.toLowerCase().includes(search.toLowerCase()) ||
      p.ticketNumber?.toString().includes(search);
    const matchesCategory =
      categoryFilter === "ALL" || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Filtered winners
  const filteredWinners = winners.filter((w) => {
    const matchesSearch =
      !search ||
      w.person?.name?.toLowerCase().includes(search.toLowerCase()) ||
      w.prize?.name?.toLowerCase().includes(search.toLowerCase()) ||
      w.ticketNumber?.toString().includes(search);
    return matchesSearch;
  });

  const getExportUrl = (format: "html" | "excel" | "csv") => {
    if (!selectedEventId) return "#";
    const typeParam =
      subtype === "PARTICIPANTS"
        ? "participants"
        : subtype === "PRESENCES"
        ? "presences"
        : "winners";
    return `/api/v1/events/${selectedEventId}/export?type=${typeParam}&format=${format}`;
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 opacity-50" />
        Carregando módulos de relatórios de eventos...
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="rounded-3xl border-border bg-card p-12 text-center text-muted-foreground">
        <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30 text-primary" />
        <h2 className="text-base font-bold text-foreground">Nenhum evento acadêmico cadastrado</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Crie um evento no menu de Eventos para emitir listas de presença, bilhetes e relatórios oficiais.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Event Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border/80 p-5 rounded-3xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Relatórios Oficiais de Eventos</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Emissão de listas institucionais, atas de presença, credenciamento e termos de sorteio com timbre UniFAP.
          </p>
        </div>

        {/* Event Selector Dropdown */}
        <div className="flex items-center gap-2 min-w-[280px]">
          <span className="text-xs font-semibold text-muted-foreground shrink-0">Evento:</span>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs font-bold text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} ({ev.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards for Selected Event */}
      {selectedEvent && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl border border-border bg-card/60 space-y-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">Inscritos Totais</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-foreground">
                {participants.length}
              </span>
              <Users className="h-4 w-4 text-primary opacity-60" />
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-border bg-card/60 space-y-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">Presenças Confirmadas</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {presences.length}
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500 opacity-60" />
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-border bg-card/60 space-y-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">Quórum / Comparecimento</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-primary">
                {participants.length > 0
                  ? `${Math.round((presences.length / participants.length) * 100)}%`
                  : "0%"}
              </span>
              <Sparkles className="h-4 w-4 text-primary opacity-60" />
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-border bg-card/60 space-y-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">Sorteios Realizados</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-amber-500">
                {winners.length}
                <span className="text-xs text-muted-foreground font-normal ml-1">
                  / {selectedEvent.prizesCount || 0} prêmios
                </span>
              </span>
              <Trophy className="h-4 w-4 text-amber-500 opacity-60 ml-auto" />
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              {winners.length === 0
                ? `${selectedEvent.prizesCount || 0} cadastrado(s) a sortear`
                : `${winners.length} contemplado(s)`}
            </p>
          </div>
        </div>
      )}

      {/* Subtype Selector Tabs & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-2xl border border-border/60">
          <button
            onClick={() => setSubtype("PARTICIPANTS")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              subtype === "PARTICIPANTS"
                ? "bg-primary text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Inscritos & Bilhetes
          </button>

          <button
            onClick={() => setSubtype("PRESENCES")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              subtype === "PRESENCES"
                ? "bg-primary text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Ata de Presença
          </button>

          <button
            onClick={() => setSubtype("WINNERS")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              subtype === "WINNERS"
                ? "bg-primary text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Trophy className="h-3.5 w-3.5" />
            Ganhadores & Sorteios
          </button>
        </div>

        {/* Official Export Buttons */}
        <div className="flex items-center gap-2">
          <a
            href={getExportUrl("html")}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all"
            title="Imprimir Documento Oficial A4 com Timbre UniFAP"
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimir A4 Oficial
          </a>

          <a
            href={getExportUrl("excel")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-foreground bg-card border border-border hover:bg-accent transition-all"
            title="Exportar Planilha Excel"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            Excel
          </a>

          <a
            href={getExportUrl("csv")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-foreground bg-card border border-border hover:bg-accent transition-all"
            title="Exportar Arquivo CSV"
          >
            <Download className="h-3.5 w-3.5 text-primary" />
            CSV
          </a>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, matrícula, e-mail ou bilhete..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl text-xs bg-card"
          />
        </div>

        {subtype !== "WINNERS" && categories.length > 0 && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 px-3 rounded-xl border border-input bg-card text-xs font-medium text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="ALL">Todas as Categorias</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Table Data Preview */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        {dataLoading ? (
          <div className="py-16 text-center text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 opacity-50" />
            Atualizando dados do relatório...
          </div>
        ) : subtype === "PARTICIPANTS" ? (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-20 font-bold text-primary">Bilhete</TableHead>
                <TableHead className="font-bold">Participante</TableHead>
                <TableHead className="font-bold">Matrícula / Categoria</TableHead>
                <TableHead className="font-bold text-center">Biometria</TableHead>
                <TableHead className="font-bold text-center">Presença</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParticipants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground text-xs">
                    Nenhum inscrito encontrado com os filtros aplicados.
                  </TableCell>
                </TableRow>
              ) : (
                filteredParticipants.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/20 text-xs">
                    <TableCell className="font-mono font-bold text-primary">
                      #{p.ticketNumber}
                    </TableCell>
                    <TableCell className="font-medium">
                      <p className="font-bold text-foreground">{p.name}</p>
                      {p.email && <p className="text-[10px] text-muted-foreground">{p.email}</p>}
                    </TableCell>
                    <TableCell>
                      <p className="font-mono text-foreground">{p.registration || "—"}</p>
                      <p className="text-[10px] text-muted-foreground">{p.category || "Geral"}</p>
                    </TableCell>
                    <TableCell className="text-center">
                      {p.hasFaceEnrolled ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" /> OK
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Pendente</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {p.hasPresence ? (
                        <Badge variant="normal" className="text-[10px] font-bold">
                          Presente ({p.presenceMethod})
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          Ausente
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        ) : subtype === "PRESENCES" ? (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-20 font-bold text-primary">Bilhete</TableHead>
                <TableHead className="font-bold">Participante Presente</TableHead>
                <TableHead className="font-bold">Matrícula</TableHead>
                <TableHead className="font-bold">Categoria</TableHead>
                <TableHead className="font-bold text-center">Método</TableHead>
                <TableHead className="font-bold text-right pr-6">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPresences.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground text-xs">
                    Nenhuma presença registrada para este evento até o momento.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPresences.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/20 text-xs">
                    <TableCell className="font-mono font-bold text-primary">
                      #{p.ticketNumber}
                    </TableCell>
                    <TableCell className="font-medium">
                      <p className="font-bold text-foreground">{p.name}</p>
                      {p.email && <p className="text-[10px] text-muted-foreground">{p.email}</p>}
                    </TableCell>
                    <TableCell className="font-mono text-foreground">
                      {p.registration || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.category || "Geral"}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3" />
                        {p.presenceMethod === "FACIAL" ? "Biometria Facial" : "Manual / Mesa"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <span className="text-[10px] font-bold text-emerald-600">
                        Confirmado ✓
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-bold">Prêmio Sorteado</TableHead>
                <TableHead className="font-bold">Ganhador</TableHead>
                <TableHead className="font-bold">Bilhete</TableHead>
                <TableHead className="font-bold">Patrocínio</TableHead>
                <TableHead className="font-bold text-right pr-6">Entrega do Brinde</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWinners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                        <Trophy className="w-6 h-6 text-amber-500" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-foreground">
                          Nenhum sorteio realizado ainda
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedEvent?.prizesCount && selectedEvent.prizesCount > 0
                            ? `Este evento possui ${selectedEvent.prizesCount} prêmio(s) cadastrado(s) aguardando realização do sorteio.`
                            : "Nenhum prêmio cadastrado para este evento."}
                        </p>
                      </div>
                      {selectedEvent && selectedEvent.prizesCount > 0 && (
                        <Link
                          href={`/eventos/${selectedEvent.id}/sorteio`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 transition-colors shadow-sm cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Sortear Prêmios Agora</span>
                        </Link>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredWinners.map((w) => (
                  <TableRow key={w.id} className="hover:bg-muted/20 text-xs">
                    <TableCell className="font-bold text-foreground">
                      <div className="flex items-center gap-2">
                        <Gift className="h-4 w-4 text-amber-500 shrink-0" />
                        <div>
                          <p>{w.prize?.name}</p>
                          {w.prize?.estimatedValue && (
                            <span className="text-[10px] text-emerald-600 font-mono">
                              R$ {Number(w.prize.estimatedValue).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-bold text-foreground">{w.person?.name}</p>
                      {w.person?.registration && (
                        <p className="text-[10px] font-mono text-muted-foreground">
                          Mat: {w.person?.registration}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-primary">
                      #{w.ticketNumber || w.person?.ticketNumber || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {w.prize?.sponsor?.name || "Institucional"}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      {w.delivered ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                          <Check className="h-3 w-3" /> Entregue
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                          <Clock className="h-3 w-3" /> Pendente Retirada
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
