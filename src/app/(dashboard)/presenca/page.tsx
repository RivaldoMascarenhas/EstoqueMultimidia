"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Camera, Calendar, Users, Sparkles, RefreshCw, ChevronRight } from "lucide-react";

export default function PresencaIndexPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/events?limit=20")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setEvents(data.items);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Camera className="h-6 w-6 text-primary" />
          Terminais de Presença Facial
        </h1>
        <p className="text-xs text-muted-foreground">
          Selecione o evento para abrir o leitor biométrico e registrar a presença dos inscritos pela câmera.
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground">
          <RefreshCw className="h-7 w-7 animate-spin mx-auto mb-2 opacity-50" />
          Carregando eventos...
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
          <Camera className="h-10 w-10 mx-auto opacity-30 mb-2" />
          <p className="text-sm font-bold text-foreground">Nenhum evento ativo cadastrado</p>
          <Link href="/eventos" className="text-xs text-primary hover:underline mt-2 inline-block">
            Criar Evento
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4 hover:border-primary/50 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  {ev.status}
                </span>
                <h2 className="text-sm font-bold text-foreground">{ev.name}</h2>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    {ev.participantsCount} inscritos
                  </span>
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                    {ev.presencesCount} presentes
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-border/80 flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/eventos/${ev.id}`}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Ver Detalhes
                </Link>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/eventos/${ev.id}?tab=presence`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-foreground bg-muted/60 hover:bg-muted border border-border transition-all"
                    title="Mesa de Credenciamento e Check-in Manual"
                  >
                    <Users className="h-3.5 w-3.5 text-primary" />
                    Mesa
                  </Link>

                  <a
                    href={`/totem/${ev.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary/90 shadow-md transition-all"
                    title="Abrir Totem de Presença Facial em Tela Cheia"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    Abrir Totem
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
