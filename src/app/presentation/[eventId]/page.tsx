"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { soundEngine } from "@/lib/soundEngine";
import { fireInstitutionalConfetti } from "@/components/ui/ConfettiEffect";
import { BrandLogo } from "@/components/branding/BrandLogo";
import QRCode from "qrcode";
import {
  Trophy,
  Sparkles,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Building2,
  QrCode,
  Users,
  Smartphone,
  Calendar,
  MapPin,
  Wifi,
  WifiOff,
  Gift,
  Globe,
} from "lucide-react";
import { normalizeImageUrl } from "@/lib/formatImageUrl";

type PresentationState =
  | "IDLE"
  | "SHOWING_QR_CODE"
  | "SHOWING_EVENT_LOGO"
  | "SHOWING_LOGO_FULLSCREEN"
  | "SHOWING_PRIZE"
  | "DRAWING"
  | "RESULT"
  | "SPONSORS_SLIDESHOW";

function PresentationContent({ eventId }: { eventId: string }) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [event, setEvent] = useState<any | null>(null);
  const [state, setState] = useState<PresentationState>("IDLE");
  const stateRef = useRef<PresentationState>("IDLE");
  const [currentPrize, setCurrentPrize] = useState<any | null>(null);
  const [currentWinner, setCurrentWinner] = useState<any | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [participantCount, setParticipantCount] = useState<number>(0);
  const [sponsorsList, setSponsorsList] = useState<any[]>([]);
  const [currentSponsorIndex, setCurrentSponsorIndex] = useState(0);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rollingNumber, setRollingNumber] = useState("000");
  const [rollingName, setRollingName] = useState("");

  const rafIdRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);
  const lastProcessedTimestampRef = useRef<number>(0);
  const lastAnimatedDrawIdRef = useRef<string | null>(null);

  const setSafeState = (newState: PresentationState) => {
    if (stateRef.current !== newState) {
      stateRef.current = newState;
      setState(newState);
    }
  };

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

  // Initial event data fetch from public endpoint
  const fetchEvent = async () => {
    try {
      const url = `/api/v1/public/events/${eventId}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      if (data.success && data.event) {
        setEvent(data.event);
        setParticipantCount(data.event._count?.participants ?? data.event.stats?.participantsCount ?? 0);

        const appUrl = typeof window !== "undefined" ? window.location.origin : "";
        const regUrl = `${appUrl}/eventos/${data.event.id}`;
        const qr = await QRCode.toDataURL(regUrl, {
          width: 500,
          margin: 2,
          color: {
            dark: "#002B49",
            light: "#FFFFFF",
          },
        });
        setQrCodeDataUrl(qr);
      }
    } catch (err) {
      console.error("Erro ao carregar evento público:", err);
    }
  };

  // Fetch Sponsors from public event prizes
  const fetchSponsors = async () => {
    try {
      const url = `/api/v1/public/events/${eventId}/prizes${token ? `?token=${encodeURIComponent(token)}` : ""}`;
      const resPrizes = await fetch(url, { credentials: "include" }).then((r) => r.json());

      const sponsorMap = new Map<string, any>();

      if (resPrizes.success && Array.isArray(resPrizes.prizes)) {
        resPrizes.prizes.forEach((p: any) => {
          if (p.sponsor) {
            const existing = sponsorMap.get(p.sponsor.id) || {
              ...p.sponsor,
              prizeCount: 0,
              totalValue: 0,
              prizes: [],
            };
            existing.prizeCount += Number(p.quantity) || 1;
            if (p.estimatedValue) {
              existing.totalValue += Number(p.estimatedValue) * (Number(p.quantity) || 1);
            }
            existing.prizes.push(p.name);
            sponsorMap.set(p.sponsor.id, existing);
          }
        });
      }

      // If no prizes had sponsors attached, fallback to institutional UniFAP card
      if (sponsorMap.size === 0) {
        sponsorMap.set("unifap-inst", {
          id: "unifap-inst",
          name: "UniFAP • Centro Universitário",
          logoUrl: "/unifap-logo-white.png",
          tier: "INSTITUTIONAL",
          prizeCount: 1,
          instagram: "@unifapce",
          website: "https://unifapce.edu.br",
        });
      }

      const list = Array.from(sponsorMap.values());
      setSponsorsList(list);
      return list;
    } catch {
      return [];
    }
  };

  useEffect(() => {
    fetchEvent();
    fetchSponsors();
  }, [eventId, token]);

  // Auto-rotate Sponsors in Slideshow mode with dynamic timer based on prize count
  useEffect(() => {
    if (state !== "SPONSORS_SLIDESHOW" || sponsorsList.length <= 1) return;

    const currentSponsor = sponsorsList[currentSponsorIndex];
    // Dynamic display time: base 5.5s + 1.5s per prize offered (min 5.5s, max 12s)
    const prizeBonus = (currentSponsor?.prizeCount || 1) * 1500;
    const slideDuration = Math.min(Math.max(5500 + prizeBonus, 5500), 12000);

    const timer = setTimeout(() => {
      setCurrentSponsorIndex((prev) => (prev + 1) % sponsorsList.length);
    }, slideDuration);

    return () => clearTimeout(timer);
  }, [state, currentSponsorIndex, sponsorsList]);

  // Execute Ultra-Fluid Suspense Rolling Animation
  const startDrawRollAnimation = (winnerData: any) => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    isAnimatingRef.current = true;

    setSafeState("DRAWING");
    setCurrentWinner(null);
    setRollingNumber("000");
    setRollingName("Sorteando...");
    if (winnerData?.prize) setCurrentPrize(winnerData.prize);
    soundEngine.play("DRAW_START");

    const targetNum = Number(winnerData?.drawnNumber ?? winnerData?.winner?.ticketNumber ?? 0);
    const targetName = winnerData?.drawnName || winnerData?.winner?.name || "Participante Contemplado";

    const startTime = performance.now();
    const duration = 3800; // 3.8s smooth suspense
    let lastTickTime = 0;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentTickInterval = 30 + easeProgress * 230;

      if (currentTime - lastTickTime >= currentTickInterval) {
        lastTickTime = currentTime;

        if (progress < 0.96) {
          const randomNum = Math.floor(Math.random() * 999) + 1;
          setRollingNumber(String(randomNum).padStart(3, "0"));
          setRollingName(winnerData?.candidatePool?.[Math.floor(Math.random() * (winnerData?.candidatePool?.length || 1))] || "Sorteando...");

          if (easeProgress > 0.65) {
            soundEngine.play("DRAW_SLOWDOWN");
          } else {
            soundEngine.play("DRAW_TICK");
          }
        }
      }

      if (progress < 1) {
        rafIdRef.current = requestAnimationFrame(animate);
      } else {
        isAnimatingRef.current = false;
        setRollingNumber(String(targetNum).padStart(3, "0"));
        setRollingName(targetName);
        setCurrentWinner(winnerData);
        setSafeState("RESULT");

        soundEngine.play("DRAW_RESULT");
        setTimeout(() => {
          soundEngine.play("WINNER");
          fireInstitutionalConfetti();
        }, 120);
      }
    };

    rafIdRef.current = requestAnimationFrame(animate);
  };

  // Central Dispatcher for incoming SSE and Polling updates
  const handleIncomingState = (payload: any, isInitialLoad = false) => {
    if (!payload || !payload.type) return;

    const msgTimestamp = typeof payload.timestamp === "number" ? payload.timestamp : 0;
    if (!isInitialLoad && msgTimestamp > 0 && msgTimestamp < lastProcessedTimestampRef.current) {
      return;
    }
    if (msgTimestamp > 0) {
      lastProcessedTimestampRef.current = Math.max(lastProcessedTimestampRef.current, msgTimestamp);
    }

    const drawKey = payload.drawId || (payload.winner?.drawnNumber ? `num-${payload.winner.drawnNumber}` : null);

    if (payload.type === "state:sync") {
      if (!isAnimatingRef.current) {
        if (payload.state) setSafeState(payload.state);
        if (payload.prize !== undefined) setCurrentPrize(payload.prize);
        if (payload.winner !== undefined) setCurrentWinner(payload.winner);
      }
    } else if (payload.type === "qr:show") {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      isAnimatingRef.current = false;
      setSafeState("SHOWING_QR_CODE");
      setCurrentWinner(null);
    } else if (payload.type === "logo:show") {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      isAnimatingRef.current = false;
      setSafeState("SHOWING_EVENT_LOGO");
      fetchEvent();
      if (payload.event) setEvent(payload.event);
      setCurrentWinner(null);
    } else if (payload.type === "logo:fullscreen") {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      isAnimatingRef.current = false;
      setSafeState("SHOWING_LOGO_FULLSCREEN");
      fetchEvent();
      if (payload.event) setEvent(payload.event);
      setCurrentWinner(null);
    } else if (payload.type === "idle:show") {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      isAnimatingRef.current = false;
      setSafeState("IDLE");
      setCurrentWinner(null);
    } else if (payload.type === "prize:show") {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      isAnimatingRef.current = false;
      setSafeState("SHOWING_PRIZE");
      if (payload.prize) setCurrentPrize(payload.prize);
      setCurrentWinner(null);
    } else if (payload.type === "draw:start") {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      isAnimatingRef.current = false;
      setRollingNumber("000");
      setRollingName("Sorteando...");
      setCurrentWinner(null);
      setSafeState("DRAWING");
      if (payload.prize) setCurrentPrize(payload.prize);
      soundEngine.play("DRAW_START");
    } else if (payload.type === "draw:result") {
      if (payload.winner) {
        const isAlreadyProcessed = drawKey && lastAnimatedDrawIdRef.current === drawKey;
        if (drawKey) lastAnimatedDrawIdRef.current = drawKey;

        if (isInitialLoad || isAlreadyProcessed) {
          if (!isAnimatingRef.current) {
            setCurrentWinner(payload.winner);
            if (payload.winner.prize) setCurrentPrize(payload.winner.prize);
            setSafeState("RESULT");
          }
        } else {
          startDrawRollAnimation(payload.winner);
        }
      }
    } else if (payload.type === "draw:cancel") {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      isAnimatingRef.current = false;
      setRollingNumber("000");
      setRollingName("");
      setCurrentWinner(null);
      lastAnimatedDrawIdRef.current = null;
      setSafeState("IDLE");
    } else if (payload.type === "sponsors:show" || payload.state === "SPONSORS_SLIDESHOW") {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      isAnimatingRef.current = false;
      setSafeState("SPONSORS_SLIDESHOW");
      if (payload.sponsors && payload.sponsors.length > 0) {
        setSponsorsList(payload.sponsors);
        setCurrentSponsorIndex(0);
      } else {
        fetchSponsors();
      }
      setCurrentWinner(null);
    } else if (payload.type === "audio:config") {
      if (typeof payload.soundEnabled === "boolean") {
        setSoundEnabled(payload.soundEnabled);
        soundEngine.setEnabled(payload.soundEnabled);
      }
      if (typeof payload.volume === "number") {
        soundEngine.setVolume(payload.volume);
      }
    }

    if (typeof payload.participantCount === "number") {
      setParticipantCount(payload.participantCount);
    }
  };

  // 1. Primary: Server-Sent Events (SSE) Stream
  useEffect(() => {
    const sseUrl = `/api/v1/public/events/${eventId}/realtime${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(sseUrl);

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          handleIncomingState(payload, false);
        } catch (err) {
          console.error("Error parsing SSE payload", err);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
      };
    } catch {}

    return () => {
      if (eventSource) eventSource.close();
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [eventId, token]);

  // 2. Secondary: Fallback Polling (Every 3s)
  useEffect(() => {
    let isMounted = true;
    let isInitial = true;

    const syncState = async () => {
      if (isAnimatingRef.current) return;
      try {
        const res = await fetch(`/api/v1/public/events/${eventId}/realtime?poll=true${token ? `&token=${encodeURIComponent(token)}` : ""}`, {
          cache: "no-store",
          credentials: "include",
        });
        if (res.ok && isMounted && !isAnimatingRef.current) {
          const payload = await res.json();
          setIsConnected(true);
          if (payload && payload.state) {
            handleIncomingState(payload, isInitial);
          }
        }
      } catch {} finally {
        isInitial = false;
      }
    };

    syncState();
    const interval = setInterval(syncState, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [eventId, token]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundEngine.setEnabled(next);
  };

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

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "m") toggleSound();
      if (e.key.toLowerCase() === "f") toggleFullscreen();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [soundEnabled]);

  const primaryColor = event?.primaryColor || "#002B49";
  const secondaryColor = event?.secondaryColor || "#EAA023";

  return (
    <div
      className="fixed inset-0 bg-[#000E1A] text-white flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden font-sans"
      style={{
        backgroundImage: `
          radial-gradient(circle at 50% -20%, ${primaryColor}40 0%, transparent 60%),
          radial-gradient(circle at 100% 100%, ${secondaryColor}25 0%, transparent 50%),
          radial-gradient(circle at 0% 100%, ${primaryColor}80 0%, transparent 60%)
        `,
      }}
    >
      {/* Background Aura */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[160px] pointer-events-none"
        style={{ backgroundColor: `${primaryColor}20` }}
      />
      <div
        className="absolute bottom-10 right-10 w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none"
        style={{ backgroundColor: `${secondaryColor}20` }}
      />

      {/* Top Header */}
      <header className="relative z-20 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <BrandLogo variant="white" width={220} height={56} className="h-10 sm:h-12 w-auto drop-shadow-md" priority />
          {event?.logoUrl && (
            <>
              <div className="h-8 w-[1px] bg-white/25" />
              <div className="h-11 sm:h-14 max-w-[160px] sm:max-w-[220px] p-1 sm:p-1.5 bg-white/95 rounded-2xl flex items-center justify-center shadow-lg border border-white/40">
                <img
                  src={normalizeImageUrl(event.logoUrl)}
                  alt={event.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </>
          )}
          <div className="hidden md:block h-8 w-[1px] bg-white/20" />
          <div className="hidden md:block text-left">
            <h2 className="text-sm font-bold text-white tracking-wide">
              {event?.name || "Semana Acadêmica UniFAP 2026"}
            </h2>
            <p className="text-[11px] text-[#EAA023] font-semibold uppercase tracking-wider">
              Centro Universitário Paraíso — UniFAP
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md border ${
              isConnected
                ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
                : "bg-rose-950/40 text-rose-300 border-rose-500/30"
            }`}
          >
            {isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5 animate-pulse" />}
            <span className="text-[11px]">{isConnected ? "4K Telão Sincronizado" : "Reconectando..."}</span>
          </div>

          <button
            onClick={toggleSound}
            className={`p-3 rounded-2xl border transition backdrop-blur-md ${
              soundEnabled
                ? "bg-white/10 hover:bg-white/20 border-white/15 text-[#EAA023]"
                : "bg-rose-950/50 border-rose-500/30 text-rose-300"
            }`}
            title={soundEnabled ? "Desativar Sons dos Telões (M)" : "Ativar Sons dos Telões (M)"}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition backdrop-blur-md"
            title="Alternar Tela Cheia (F)"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Stage */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center my-auto text-center px-4">
        <AnimatePresence mode="wait">
          {state === "IDLE" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 max-w-3xl w-full"
            >
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#EAA023]/20 border border-[#EAA023]/40 text-[#EAA023] text-sm font-extrabold uppercase tracking-widest backdrop-blur-md">
                <Sparkles className="w-4 h-4" />
                <span>Palco Oficial de Premiações</span>
              </div>

              <h1 className="text-4xl sm:text-7xl font-black text-white tracking-tight leading-tight drop-shadow-2xl">
                Uni<span className="text-[#EAA023]">FAP</span> Sorteios
              </h1>

              <p className="text-lg sm:text-xl text-slate-300 max-w-xl mx-auto font-light leading-relaxed">
                Aguardando autorização da comissão organizadora para o próximo sorteio.
              </p>

              <div className="pt-2">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Transmissão em tempo real ativa{event?.location ? ` • ${event.location}` : ""}</span>
                </div>
              </div>
            </motion.div>
          )}

          {state === "SHOWING_EVENT_LOGO" && (
            <motion.div
              key="event-logo"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 max-w-5xl w-full flex flex-col items-center"
            >
              <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#EAA023] text-slate-950 text-xs sm:text-sm font-black uppercase tracking-widest shadow-xl">
                <Sparkles className="w-4 h-4" />
                <span>Evento Oficial UniFAP</span>
              </div>

              {event?.logoUrl || event?.coverUrl ? (
                <div className="p-4 sm:p-8 rounded-3xl bg-gradient-to-b from-white/15 to-white/5 backdrop-blur-2xl border border-white/25 shadow-[0_0_80px_rgba(234,160,35,0.3)] max-w-2xl sm:max-w-4xl mx-auto">
                  <img
                    src={normalizeImageUrl(event.logoUrl || event.coverUrl)}
                    alt={event.name}
                    className="max-h-72 sm:max-h-96 md:max-h-[46vh] w-auto max-w-full object-contain mx-auto rounded-2xl shadow-2xl"
                  />
                </div>
              ) : (
                <div className="p-10 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_0_80px_rgba(234,160,35,0.3)] flex flex-col items-center">
                  <BrandLogo variant="square-white" width={180} height={180} className="w-32 h-32 sm:w-44 sm:h-44 mb-4" />
                  <div className="text-xs uppercase tracking-widest text-[#EAA023] font-bold">
                    Centro Universitário Paraíso
                  </div>
                </div>
              )}

              <div>
                <h1 className="text-3xl sm:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-2xl">
                  {event?.name || "Semana Acadêmica UniFAP 2026"}
                </h1>
                {event?.description && (
                  <p className="text-sm sm:text-lg text-slate-300 font-light mt-3 max-w-3xl mx-auto leading-relaxed">
                    {event.description}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {event?.date && (
                  <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/10 border border-white/15 text-xs sm:text-sm text-slate-200">
                    <Calendar className="w-4 h-4 text-[#EAA023]" />
                    <span>{new Date(event.date).toLocaleDateString("pt-BR")}</span>
                  </div>
                )}
                {event?.location && (
                  <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/10 border border-white/15 text-xs sm:text-sm text-slate-200">
                    <MapPin className="w-4 h-4 text-[#0080C8]" />
                    <span>{event.location}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {state === "SHOWING_LOGO_FULLSCREEN" && (
            <motion.div
              key="logo-fullscreen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black"
            >
              {/* Ambient Glow / Backdrop */}
              {(event?.logoUrl || event?.coverUrl) && (
                <div
                  className="absolute inset-0 bg-center bg-no-repeat bg-cover filter blur-3xl opacity-30 pointer-events-none -z-10"
                  style={{ backgroundImage: `url(${normalizeImageUrl(event.logoUrl || event.coverUrl)})` }}
                />
              )}

              {event?.logoUrl || event?.coverUrl ? (
                <img
                  src={normalizeImageUrl(event.logoUrl || event.coverUrl)}
                  alt={event.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full">
                  <BrandLogo variant="white" width={600} height={200} className="w-[60vw] max-w-[800px] h-auto drop-shadow-2xl mb-8" />
                  <div className="text-xl sm:text-3xl uppercase tracking-widest text-[#EAA023] font-black">
                    Centro Universitário Paraíso — UniFAP
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {state === "SHOWING_QR_CODE" && (
            <motion.div
              key="qrcode"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 max-w-4xl w-full flex flex-col items-center"
            >
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#EAA023] text-slate-950 text-xs sm:text-sm font-black uppercase tracking-widest shadow-lg">
                <Smartphone className="w-4 h-4" />
                <span>Inscrições & Presença{event?.location ? ` • ${event.location}` : ""}</span>
              </div>

              <div>
                <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight drop-shadow-xl">
                  Escaneie o QR Code e Participe!
                </h1>
                <p className="text-sm sm:text-lg text-slate-300 font-light mt-2 max-w-2xl mx-auto">
                  Aponte a câmera do seu celular para registrar sua presença e concorrer aos <strong className="text-[#EAA023]">Prêmios Oficiais</strong>.
                </p>
              </div>

              <div className="relative group p-4 sm:p-6 rounded-3xl bg-white/10 backdrop-blur-xl border-2 border-[#EAA023]/60 shadow-[0_0_50px_rgba(234,160,35,0.3)] flex flex-col items-center">
                {qrCodeDataUrl ? (
                  <div className="bg-white p-4 rounded-2xl shadow-2xl">
                    <img
                      src={qrCodeDataUrl}
                      alt="QR Code Inscrição"
                      className="w-56 h-56 sm:w-72 sm:h-72 object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-64 h-64 bg-white/20 animate-pulse rounded-2xl flex items-center justify-center">
                    <QrCode className="w-16 h-16 text-white/40" />
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/40 border border-white/15 text-xs text-blue-200 font-mono">
                  <span>unifapce.edu.br • Evento Oficial</span>
                </div>
              </div>

              <div className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-2xl bg-white/10 border border-white/20 text-xs sm:text-sm text-slate-200 backdrop-blur-md shadow-xl">
                <Users className="w-4 h-4 text-[#EAA023]" />
                <span>
                  <strong className="text-[#EAA023] font-mono font-black text-sm sm:text-base">
                    {participantCount}
                  </strong>{" "}
                  {participantCount === 1 ? "participante cadastrado" : "participantes cadastrados"}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
              </div>
            </motion.div>
          )}

          {state === "SPONSORS_SLIDESHOW" && (
            <motion.div
              key={`sponsor-slide-${currentSponsorIndex}`}
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -15 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="space-y-6 max-w-4xl w-full"
            >
              {/* Header Badge */}
              <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-gradient-to-r from-[#EAA023]/20 via-[#EAA023]/30 to-[#EAA023]/20 border border-[#EAA023]/50 text-[#EAA023] text-sm sm:text-base font-black uppercase tracking-widest backdrop-blur-xl shadow-lg">
                <Building2 className="w-5 h-5" />
                <span>Patrocínio & Apoio Oficial</span>
              </div>

              {sponsorsList.length > 0 && sponsorsList[currentSponsorIndex] ? (
                (() => {
                  const sp = sponsorsList[currentSponsorIndex];
                  return (
                    <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-white/[0.12] to-white/[0.04] backdrop-blur-2xl border-2 border-[#EAA023]/60 shadow-[0_0_60px_rgba(234,160,35,0.25)] space-y-6 relative overflow-hidden">
                      {/* Ambient Glow */}
                      <div className="absolute -top-24 -left-24 w-72 h-72 bg-[#EAA023]/15 rounded-full blur-3xl pointer-events-none" />
                      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

                      {/* Sponsor Logo Container */}
                      <div className="relative z-10">
                        {sp.logoUrl ? (
                          <div className="h-32 sm:h-44 max-w-md mx-auto bg-white/95 p-6 rounded-3xl flex items-center justify-center shadow-2xl border-2 border-white/80">
                            <img
                              src={normalizeImageUrl(sp.logoUrl)}
                              alt={sp.name}
                              className="max-h-full max-w-full object-contain filter drop-shadow-md"
                            />
                          </div>
                        ) : (
                          <div className="w-32 h-32 mx-auto rounded-3xl bg-[#EAA023]/20 border-2 border-[#EAA023]/40 flex items-center justify-center text-[#EAA023] shadow-2xl">
                            <Building2 className="w-16 h-16" />
                          </div>
                        )}
                      </div>

                      {/* Sponsor Name & Tagline */}
                      <div className="relative z-10 space-y-2">
                        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight drop-shadow-lg">
                          {sp.name}
                        </h2>
                        {sp.description && (
                          <p className="text-sm sm:text-base text-slate-200 font-light max-w-xl mx-auto line-clamp-2">
                            {sp.description}
                          </p>
                        )}
                      </div>

                      {/* Stats and Links */}
                      <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 pt-2">
                        {sp.prizeCount > 0 && (
                          <div className="px-5 py-2 rounded-2xl bg-[#EAA023]/20 border border-[#EAA023]/40 text-[#EAA023] text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs">
                            <Gift className="w-4 h-4" />
                            <span>
                              {sp.prizeCount} {sp.prizeCount === 1 ? "Prêmio Ofertado" : "Prêmios Ofertados"}
                            </span>
                          </div>
                        )}

                        {sp.instagram && (
                          <div className="px-4 py-2 rounded-2xl bg-white/10 border border-white/20 text-slate-200 text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                            <span>📷 {sp.instagram}</span>
                          </div>
                        )}

                        {sp.website && (
                          <div className="px-4 py-2 rounded-2xl bg-white/10 border border-white/20 text-slate-200 text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                            <Globe className="w-4 h-4" />
                            <span>{sp.website.replace(/^https?:\/\//, "")}</span>
                          </div>
                        )}
                      </div>

                      {/* Carousel Indicator Dots */}
                      {sponsorsList.length > 1 && (
                        <div className="relative z-10 flex items-center justify-center gap-2 pt-4">
                          {sponsorsList.map((_, dotIdx) => (
                            <span
                              key={dotIdx}
                              className={`h-2 rounded-full transition-all duration-300 ${
                                dotIdx === currentSponsorIndex
                                  ? "w-8 bg-[#EAA023] shadow-[0_0_10px_#EAA023]"
                                  : "w-2 bg-white/30"
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="p-8 text-center text-slate-300">
                  Aguardando dados dos patrocinadores...
                </div>
              )}
            </motion.div>
          )}

          {state === "SHOWING_PRIZE" && (
            <motion.div
              key="prize"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 max-w-3xl w-full"
            >
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#EAA023]/20 border border-[#EAA023]/40 text-[#EAA023] text-sm font-extrabold uppercase tracking-widest backdrop-blur-md">
                <Trophy className="w-4 h-4" />
                <span>Próximo Prêmio em Disputa</span>
              </div>

              {currentPrize ? (
                <>
                  {currentPrize.imageUrl ? (
                    <div className="p-4 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 max-w-md mx-auto shadow-2xl">
                      <img
                        src={normalizeImageUrl(currentPrize.imageUrl)}
                        alt={currentPrize.name}
                        className="max-h-64 w-auto object-contain mx-auto rounded-2xl"
                      />
                    </div>
                  ) : (
                    <div className="w-32 h-32 mx-auto rounded-3xl bg-[#EAA023]/20 border border-[#EAA023]/30 flex items-center justify-center shadow-2xl backdrop-blur-md">
                      <Trophy className="w-16 h-16 text-[#EAA023]" />
                    </div>
                  )}

                  <div>
                    <div className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">
                      Rodada #{currentPrize.order || 1}
                    </div>
                    <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight drop-shadow-lg">
                      {currentPrize.name}
                    </h1>
                    {currentPrize.description && (
                      <p className="text-slate-300 font-light mt-2 max-w-lg mx-auto">
                        {currentPrize.description}
                      </p>
                    )}
                  </div>

                  {currentPrize.sponsor && (
                    <div className="mt-4 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-white/[0.08] via-white/[0.14] to-white/[0.08] backdrop-blur-xl border-2 border-[#EAA023]/50 shadow-[0_0_40px_rgba(234,160,35,0.2)] max-w-xl mx-auto flex items-center justify-center gap-5 sm:gap-6">
                      {currentPrize.sponsor.logoUrl ? (
                        <div className="h-16 sm:h-20 w-32 sm:w-44 bg-white/95 p-2.5 rounded-2xl flex items-center justify-center shrink-0 shadow-lg border border-white/60">
                          <img
                            src={normalizeImageUrl(currentPrize.sponsor.logoUrl)}
                            alt={currentPrize.sponsor.name}
                            className="max-h-full max-w-full object-contain filter drop-shadow-xs"
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-[#EAA023]/20 border border-[#EAA023]/40 flex items-center justify-center text-[#EAA023] shrink-0 shadow-md">
                          <Building2 className="w-7 h-7" />
                        </div>
                      )}

                      <div className="text-left flex-1 min-w-0">
                        <div className="text-[11px] font-black uppercase tracking-widest text-[#EAA023] flex items-center gap-1.5 mb-0.5">
                          <Trophy className="w-3.5 h-3.5" />
                          <span>Patrocínio & Apoio Oficial</span>
                        </div>
                        <div className="text-lg sm:text-2xl font-black text-white leading-tight truncate">
                          {currentPrize.sponsor.name}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <h1 className="text-3xl font-black text-white">Aguardando Seleção do Prêmio</h1>
                  <p className="text-slate-300 mt-2">O operador está preparando a próxima rodada.</p>
                </div>
              )}
            </motion.div>
          )}

          {state === "DRAWING" && (
            <motion.div
              key="drawing"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 max-w-4xl w-full"
            >
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm font-extrabold uppercase tracking-widest backdrop-blur-md animate-pulse">
                <Sparkles className="w-4 h-4" />
                <span>Sorteando Agora...</span>
              </div>

              <div className="relative p-8 sm:p-14 rounded-3xl bg-slate-950/80 border-2 border-[#EAA023]/80 shadow-[0_0_80px_rgba(234,160,35,0.4)] backdrop-blur-2xl space-y-4">
                <div className="text-8xl sm:text-[140px] font-black font-mono text-white tracking-widest drop-shadow-[0_10px_40px_rgba(234,160,35,0.8)] select-none leading-none">
                  #{rollingNumber}
                </div>
                <div className="text-2xl sm:text-4xl font-bold text-[#EAA023] truncate">
                  {rollingName || "Sorteando..."}
                </div>
                <div className="absolute inset-0 rounded-3xl pointer-events-none bg-gradient-to-b from-white/10 via-transparent to-black/40" />
              </div>

              {currentPrize && (
                <div className="text-lg sm:text-xl font-bold text-slate-200">
                  Prêmio: <span className="text-white font-extrabold">{currentPrize.name}</span>
                </div>
              )}
            </motion.div>
          )}

          {state === "RESULT" && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 280, damping: 20 }}
              className="space-y-6 max-w-4xl w-full"
            >
              {currentWinner ? (
                <>
                  <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-[#EAA023] text-slate-950 text-sm sm:text-base font-black uppercase tracking-widest shadow-2xl">
                    <Sparkles className="w-5 h-5 fill-current" />
                    PARABÉNS AO CONTEMPLADO!
                  </div>

                  <div className="text-7xl sm:text-[140px] font-black font-mono text-white tracking-tight drop-shadow-[0_10px_50px_rgba(255,255,255,0.4)] leading-none">
                    #{String(currentWinner.drawnNumber ?? currentWinner.winner?.ticketNumber ?? 0).padStart(3, "0")}
                  </div>

                  <div className="p-6 sm:p-8 rounded-3xl bg-white/15 border-2 border-[#EAA023]/80 backdrop-blur-xl shadow-2xl">
                    <h2 className="text-3xl sm:text-5xl font-black text-[#EAA023] tracking-tight">
                      {currentWinner.drawnName || currentWinner.winner?.name || "Participante Contemplado"}
                    </h2>
                    {currentWinner.winner?.registration && (
                      <p className="text-sm sm:text-base text-slate-200 font-semibold mt-2">
                        {currentWinner.winner.category || "Participante"} • Matrícula: {currentWinner.winner.registration}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-4 max-w-3xl mx-auto">
                    <div className="px-6 py-3 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md text-sm sm:text-base text-slate-200">
                      🎁 Prêmio: <strong className="text-white">{currentWinner.prize?.name || currentPrize?.name || "Premiação Oficial"}</strong>
                    </div>

                    {(currentWinner.prize?.sponsor || currentPrize?.sponsor) && (
                      <div className="px-5 py-2.5 rounded-2xl bg-white/10 border border-[#EAA023]/40 backdrop-blur-md text-sm text-white flex items-center gap-3 shadow-lg">
                        {(currentWinner.prize?.sponsor?.logoUrl || currentPrize?.sponsor?.logoUrl) ? (
                          <div className="h-9 max-w-[120px] bg-white/95 px-2.5 py-1 rounded-xl flex items-center justify-center shadow-xs">
                            <img
                              src={normalizeImageUrl(currentWinner.prize?.sponsor?.logoUrl || currentPrize?.sponsor?.logoUrl)}
                              alt="Logo Patrocinador"
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                        ) : null}
                        <span>
                          🤝 Oferecimento:{" "}
                          <strong className="text-[#EAA023]">
                            {currentWinner.prize?.sponsor?.name || currentPrize?.sponsor?.name}
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="relative z-20 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-slate-400">
        <div className="flex items-center gap-2 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>UniFAP Sorteios • Transmissão Oficial 4K para Auditórios e Projetores</span>
        </div>
        <div>Centro Universitário Paraíso — Juazeiro do Norte / CE</div>
      </footer>
    </div>
  );
}

export default function PresentationPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-bold">
          Conectando ao Telão 4K do Auditório...
        </div>
      }
    >
      <PresentationContent eventId={eventId} />
    </Suspense>
  );
}
