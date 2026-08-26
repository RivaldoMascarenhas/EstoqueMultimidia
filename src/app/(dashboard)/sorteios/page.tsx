"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Trophy, Play, Calendar, Users, Gift, RefreshCw, ChevronRight } from "lucide-react";

export default function SorteiosIndexPage() {
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
          <Trophy className="h-6 w-6 text-amber-500" />
          Central de Sorteios & Projeção
        </h1>
        <p className="text-xs text-muted-foreground">
          Selecione um evento para abrir a tela de apresentação, roleta animada e sorteio de prêmios ao vivo.
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground">
          <RefreshCw className="h-7 w-7 animate-spin mx-auto mb-2 opacity-50" />
          Carregando eventos...
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
          <Trophy className="h-10 w-10 mx-auto opacity-30 mb-2" />
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
              className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4 hover:border-amber-500/50 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  {ev.status}
                </span>
                <h2 className="text-sm font-bold text-foreground">{ev.name}</h2>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    {ev.participantsCount} inscritos
                  </span>
                  <span className="flex items-center gap-1">
                    <Gift className="h-3.5 w-3.5 text-amber-500" />
                    {ev.prizesCount} prêmios
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-border/80 flex items-center justify-between">
                <Link
                  href={`/eventos/${ev.id}`}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Ver Detalhes
                </Link>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/eventos/${ev.id}/sorteio`}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-600 shadow-xs transition-all"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Operar
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
