"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { FaceAttendanceCamera } from "@/components/biometria/FaceAttendanceCamera";
import {
  Camera,
  ExternalLink,
  Maximize2,
  Users,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export default function EventBiometriaPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvent() {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/events/${eventId}`);
        const data = await res.json();
        if (data.success) {
          setEvent(data.event);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (eventId) {
      loadEvent();
    }
  }, [eventId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl border border-border bg-card shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/eventos/${eventId}`}
              className="text-xs text-muted-foreground hover:text-primary transition flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao Hub do Evento</span>
            </Link>
          </div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-500" />
            <span>Totem de Reconhecimento Facial</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {event?.name ? `Evento: ${event.name}` : "Carregando evento..."}
          </p>
        </div>

        {/* Botão de Destaque: Abrir Totem em Nova Tela */}
        <a
          href={`/totem/${eventId}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
        >
          <Maximize2 className="w-4 h-4" />
          <span>Abrir Totem em Nova Tela (2ª Tela / Kiosk)</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-80" />
        </a>
      </div>

      {/* Grid de Operação */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 & 2: Câmera com MediaPipe */}
        <div className="lg:col-span-2 p-6 rounded-3xl border border-border bg-card flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span>Câmera de Recepção</span>
            </h2>
            <span className="text-xs text-muted-foreground">MediaPipe AI Face Tracking</span>
          </div>

          <FaceAttendanceCamera
            eventId={eventId}
            eventName={event?.name || "Evento"}
          />
        </div>

        {/* Coluna 3: Informações */}
        <div className="space-y-6">
          <div className="p-5 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 space-y-3">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Como Usar na Mesa de Recepção</span>
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Clique em <strong>"Abrir Totem em Nova Tela"</strong> e arraste a janela aberta para o segundo monitor ou posicione o notebook voltado para o participante.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              O participante verá o enquadramento verde em tempo real e receberá um <strong>card de confirmação</strong> com o nome, foto e status de presença.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
