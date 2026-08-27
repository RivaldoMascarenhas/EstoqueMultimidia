"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  CheckCircle2,
  Radio,
  PanelRightClose,
  PanelRightOpen,
  ShieldCheck,
} from "lucide-react";
import { PrivacyPolicyModal } from "@/components/legal/PrivacyPolicyModal";

export default function EventTotemPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [presentCount, setPresentCount] = useState(0);
  const [recentPresences, setRecentPresences] = useState<any[]>([]);
  const [showLiveFeed, setShowLiveFeed] = useState(true);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

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

  // Fetch Event Details
  const loadEvent = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/events/${eventId}`);
      const data = await res.json();
      if (data.success && data.event) {
        setEvent(data.event);
        setPresentCount(data.event._count?.presences || data.event.stats?.presencesTotal || 0);
      }
    } catch (err) {
      console.error("Erro ao carregar evento:", err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  // Fetch Recent Presences (Live Feed)
  const fetchRecentPresences = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/events/${eventId}/presences?limit=15`);
      const data = await res.json();
      if (data.success && data.items) {
        setRecentPresences(data.items);
        if (typeof data.total === "number") {
          setPresentCount(data.total);
        }
      }
    } catch {}
  }, [eventId]);

  useEffect(() => {
    if (eventId) {
      loadEvent();
      fetchRecentPresences();

      // Sincronização automática contínua em tempo real a cada 3.5 segundos
      const interval = setInterval(() => {
        fetchRecentPresences();
      }, 3500);

      return () => clearInterval(interval);
    }
  }, [eventId, loadEvent, fetchRecentPresences]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    const isCurrentlyFullscreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );

    if (!isCurrentlyFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
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
    <div className="relative h-screen max-h-screen w-full bg-[#060b19] text-white flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-20 w-full px-4 sm:px-6 py-3 flex items-center justify-between border-b border-slate-800/80 bg-[#091124]/90 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button
            onClick={() => router.push(`/eventos/${eventId}`)}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-zinc-300 hover:text-white transition cursor-pointer shrink-0"
            title="Voltar ao Painel"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {event?.logoUrl ? (
            <img
              src={event.logoUrl}
              alt="Logo"
              className="h-9 sm:h-10 max-w-[100px] sm:max-w-[120px] object-contain filter drop-shadow shrink-0"
            />
          ) : (
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm sm:text-base shrink-0">
              UF
            </div>
          )}

          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-extrabold tracking-tight text-white leading-tight truncate">
              {event?.name || "Totem de Presença UniFAP"}
            </h1>
            <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-zinc-400 mt-0.5 truncate">
              <span className="flex items-center gap-1 truncate">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{event?.location || "Auditório Principal"}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-semibold text-emerald-400 shrink-0">
                <Users className="w-3.5 h-3.5" />
                {presentCount} presentes
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 font-mono text-xs text-zinc-300 font-semibold shadow-inner">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>{currentTime}</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] sm:text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#22c55e]" />
            <span className="hidden xs:inline">TOTEM ATIVO</span>
          </div>

          {/* Toggle Feed Lateral */}
          <button
            onClick={() => setShowLiveFeed(!showLiveFeed)}
            className={`p-2 rounded-xl border transition cursor-pointer hidden lg:flex items-center gap-1.5 text-xs font-bold ${
              showLiveFeed
                ? "bg-slate-800 border-slate-700 text-emerald-400"
                : "bg-slate-900/60 border-slate-800 text-zinc-400 hover:text-white"
            }`}
            title={showLiveFeed ? "Ocultar Feed de Presenças" : "Exibir Feed de Presenças"}
          >
            {showLiveFeed ? (
              <PanelRightClose className="w-4 h-4" />
            ) : (
              <PanelRightOpen className="w-4 h-4" />
            )}
            <span className="hidden xl:inline">{showLiveFeed ? "Feed Aberto" : "Ver Feed"}</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-zinc-300 hover:text-white transition cursor-pointer"
            title="Modo Tela Cheia (F11)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Face Attendance Area + Live Feed Side Panel */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-2 sm:p-4 w-full max-w-7xl mx-auto min-h-0 overflow-hidden gap-4">
        {/* Left / Center: Camera Stream */}
        <div className="flex-1 h-full w-full max-h-full flex items-center justify-center min-h-0 overflow-hidden">
          <FaceAttendanceCamera
            eventId={eventId}
            eventName={event?.name || "Evento"}
            isKioskMode={true}
            className="h-full max-h-full w-full"
            onPresenceRecorded={() => {
              setPresentCount((prev) => prev + 1);
              fetchRecentPresences();
            }}
          />
        </div>

        {/* Right: Live Presences Feed (Sincronizado em tempo real) */}
        {showLiveFeed && (
          <aside className="hidden lg:flex flex-col w-80 xl:w-96 h-full max-h-full rounded-3xl border border-slate-800 bg-[#091124]/90 backdrop-blur-md p-4 shadow-2xl overflow-hidden shrink-0 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <h2 className="text-xs font-black uppercase tracking-wider text-zinc-200">
                  Últimos Reconhecidos
                </h2>
              </div>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                {presentCount} Total
              </span>
            </div>

            {/* List with Smooth Scroll */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0 scrollbar-thin scrollbar-thumb-slate-700">
              {recentPresences.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 space-y-2">
                  <Radio className="w-8 h-8 opacity-30 text-emerald-400 animate-pulse" />
                  <p className="text-xs font-semibold text-zinc-400">Aguardando Presenças</p>
                  <p className="text-[11px] leading-relaxed">
                    Aproxime o rosto da câmera para registrar e aparecer no feed ao vivo.
                  </p>
                </div>
              ) : (
                recentPresences.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="flex items-center justify-between rounded-2xl border border-slate-800/90 bg-slate-900/60 p-3 hover:bg-slate-800/50 hover:border-slate-700 transition-all shadow-sm"
                  >
                    <div className="min-w-0 flex-1 mr-2">
                      <p className="text-xs font-bold text-white truncate">{item.name}</p>
                      <p className="text-[10px] text-zinc-400 font-mono mt-0.5 truncate">
                        {item.registration ? `Matrícula: ${item.registration}` : "Participante"} •{" "}
                        {item.capturedAt
                          ? new Date(item.capturedAt).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })
                          : "Agora"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {item.confidence
                          ? `${Math.round(item.confidence * 100)}%`
                          : "100%"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Status */}
            <div className="pt-3 mt-2 border-t border-slate-800 text-[10px] text-zinc-500 flex items-center justify-between shrink-0 font-mono">
              <span className="flex items-center gap-1">
                <Radio className="w-3 h-3 text-emerald-400" />
                Sincronizado
              </span>
              <span>UniFAP Live Totem</span>
            </div>
          </aside>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-2 px-4 flex flex-wrap items-center justify-between text-[11px] text-zinc-500 border-t border-slate-900 bg-[#060b19] shrink-0">
        <span>UniFAP Multimídia • Sistema Integrado de Presença Facial & Sorteios</span>
        <button
          type="button"
          onClick={() => setIsPrivacyModalOpen(true)}
          className="flex items-center gap-1 text-emerald-400/80 hover:text-emerald-400 transition cursor-pointer"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Privacidade & LGPD</span>
        </button>
      </footer>

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />
    </div>
  );
}
