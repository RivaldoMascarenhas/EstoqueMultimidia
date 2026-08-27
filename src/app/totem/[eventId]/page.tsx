"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { FaceAttendanceCamera } from "@/components/biometria/FaceAttendanceCamera";
import {
  Sparkles,
  Maximize2,
  Minimize2,
  Calendar,
  MapPin,
  Users,
  Clock,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";

export default function EventTotemPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [presentCount, setPresentCount] = useState(0);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadEvent() {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/events/${eventId}`);
        const data = await res.json();
        if (data.success && data.event) {
          setEvent(data.event);
          setPresentCount(data.event._count?.presences || 0);
        }
      } catch (err) {
        console.error("Erro ao carregar evento:", err);
      } finally {
        setLoading(false);
      }
    }
    if (eventId) {
      loadEvent();
    }
  }, [eventId]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060b19] flex flex-col items-center justify-center text-white">
        <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wide text-zinc-300">
          Iniciando Totem de Recepção Facial...
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-[#060b19] text-white flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-20 w-full px-6 py-4 flex items-center justify-between border-b border-slate-800/80 bg-[#091124]/90 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/eventos/${eventId}`)}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-zinc-300 hover:text-white transition cursor-pointer"
            title="Voltar ao Painel"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {event?.logoUrl ? (
            <img
              src={event.logoUrl}
              alt="Logo"
              className="h-10 max-w-[120px] object-contain filter drop-shadow"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-base">
              UF
            </div>
          )}

          <div>
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white leading-tight">
              {event?.name || "Totem de Presença UniFAP"}
            </h1>
            <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                {event?.location || "Auditório Principal"}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-semibold text-emerald-400">
                <Users className="w-3.5 h-3.5" />
                {presentCount} presentes
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/60 border border-white/10 font-mono text-xs text-zinc-300 font-semibold shadow-inner">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>{currentTime}</span>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#22c55e]" />
            <span>TOTEM ATIVO</span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-zinc-300 hover:text-white transition cursor-pointer"
            title="Modo Tela Cheia (F11)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Face Attendance Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 max-w-4xl mx-auto w-full">
        <FaceAttendanceCamera
          eventId={eventId}
          eventName={event?.name || "Evento"}
          onPresenceRecorded={() => {
            setPresentCount((prev) => prev + 1);
          }}
        />
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-3 text-center text-xs text-zinc-500 border-t border-slate-900 bg-[#060b19]">
        <span>UniFAP Multimídia • Sistema Integrado de Presença Facial & Sorteios</span>
      </footer>
    </div>
  );
}
