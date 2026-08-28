"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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

function EventTotemContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const token = searchParams.get("token") || "";

  const [event, setEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [presentCount, setPresentCount] = useState(0);
  const [recentPresences, setRecentPresences] = useState<any[]>([]);
  const [showLiveFeed, setShowLiveFeed] = useState(true);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  // Bootstrap session cookie if token is provided
  useEffect(() => {
    if (eventId && token) {
      fetch("/api/v1/public/presentation/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, token }),
      }).catch(() => {});
    }
  }, [eventId, token]);

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

  // Fetch Event Details from Public Endpoint
  const loadEvent = useCallback(async () => {
    try {
      const url = `/api/v1/public/events/${eventId}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      if (data.success && data.event) {
        setEvent(data.event);
        setPresentCount(data.event._count?.presences || data.event.stats?.presencesTotal || 0);
      }
    } catch (err) {
      console.error("Erro ao carregar evento público:", err);
    } finally {
      setLoading(false);
    }
  }, [eventId, token]);

  // Fetch Recent Presences (Public Live Feed)
  const fetchRecentPresences = useCallback(async () => {
    try {
      const url = `/api/v1/public/events/${eventId}/presences?limit=15${token ? `&token=${encodeURIComponent(token)}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      if (data.success && data.items) {
        setRecentPresences(data.items);
        if (typeof data.total === "number") {
          setPresentCount(data.total);
        }
      }
    } catch {}
  }, [eventId, token]);

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
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#020617] text-white">
        <RefreshCw className="h-10 w-10 animate-spin text-emerald-400 mb-4 opacity-80" />
        <p className="text-sm font-semibold tracking-wider uppercase text-zinc-400">
          Iniciando Totem Inteligente...
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#020617] text-white select-none">
      {/* Dynamic Background Glows */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-[20%] left-[20%] h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[130px]" />
        <div className="absolute top-[60%] -right-[10%] h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[150px]" />
        <div className="absolute -bottom-[20%] left-[10%] h-[400px] w-[400px] rounded-full bg-indigo-500/10 blur-[140px]" />
      </div>

      {/* Top Bar / Header */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-800/80 bg-[#091124]/90 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push("/eventos")}
            className="flex items-center justify-center p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700/80 text-zinc-300 hover:text-white transition cursor-pointer shrink-0"
            title="Voltar aos Eventos"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-2 truncate">
              <span>{event?.name || "Totem de Presença"}</span>
              <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                AO VIVO
              </span>
            </h1>
            <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-mono">
              {event?.location && (
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                  {event.location}
                </span>
              )}
              {event?.date && (
                <span className="hidden sm:flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-emerald-400 shrink-0" />
                  {new Date(event.date).toLocaleDateString("pt-BR")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Info: Live Time, Counter & Actions */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Clock */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs font-mono text-zinc-300">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>{currentTime}</span>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-mono">
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
          >
            {showLiveFeed ? (
              <PanelRightClose className="w-4 h-4" />
            ) : (
              <PanelRightOpen className="w-4 h-4" />
            )}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-zinc-300 hover:text-white transition cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Face Attendance Area + Live Feed Side Panel */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 w-full max-w-7xl mx-auto min-h-0 overflow-hidden gap-4">
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
      <footer className="relative z-10 py-2 px-4 flex flex-wrap items-center justify-between text-[11px] text-zinc-500 border-t border-slate-900 bg-[#020617] shrink-0">
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

export default function EventTotemPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#020617] text-white">
          <RefreshCw className="h-10 w-10 animate-spin text-emerald-400 mb-4 opacity-80" />
          <p className="text-sm font-semibold tracking-wider uppercase text-zinc-400">
            Carregando Totem...
          </p>
        </div>
      }
    >
      <EventTotemContent />
    </Suspense>
  );
}
