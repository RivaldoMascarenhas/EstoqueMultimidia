"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { soundEngine } from "@/lib/soundEngine";
import { fireInstitutionalConfetti } from "@/components/ui/ConfettiEffect";
import {
  Trophy,
  Users,
  Play,
  Tv,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  CheckCircle,
  AlertTriangle,
  Gift,
  Building2,
  ShieldCheck,
  Sliders,
  Hash,
  ImageIcon,
  Share2,
  Search,
  X,
  Undo2,
  ExternalLink,
  Copy,
  Check,
  ArrowLeft,
  Loader2,
  Smartphone,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { WinnerShareModal } from "@/components/events/WinnerShareModal";
import { normalizeImageUrl } from "@/lib/formatImageUrl";
import { toast } from "sonner";

export default function OperatorDrawPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<any | null>(null);
  const [prizes, setPrizes] = useState<any[]>([]);
  const [selectedPrizeId, setSelectedPrizeId] = useState<string>("");

  // Audio Controls
  const [localSoundEnabled, setLocalSoundEnabled] = useState(true);
  const [telaoSoundEnabled, setTelaoSoundEnabled] = useState(true);
  const [telaoVolume, setTelaoVolume] = useState<number>(0.85);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);

  // Prize Search
  const [prizeSearch, setPrizeSearch] = useState("");

  // Cancel Draw Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelMarkIneligible, setCancelMarkIneligible] = useState(false);
  const [isCancellingDraw, setIsCancellingDraw] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Animated rolling state for UI suspense
  const [rollingNumber, setRollingNumber] = useState<string>("000");
  const [rollingName, setRollingName] = useState<string>("Sorteando...");
  const [latestWinner, setLatestWinner] = useState<any | null>(null);
  const [presentationTokenUrl, setPresentationTokenUrl] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [eligibleList, setEligibleList] = useState<any[]>([]);
  const [eventWinners, setEventWinners] = useState<any[]>([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [singleShareWinner, setSingleShareWinner] = useState<any | null>(null);

  // Fetch Event Data & Presentation Token
  const fetchEventData = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const [resEvent, resPrizes, resToken, resEligible, resWinners] = await Promise.all([
        fetch(`/api/v1/events/${eventId}`).then((r) => r.json()),
        fetch(`/api/v1/events/${eventId}/prizes`).then((r) => r.json()),
        fetch(`/api/v1/events/${eventId}/presentation-token`).then((r) => r.json()),
        fetch(`/api/v1/events/${eventId}/eligibility`).then((r) => r.json()),
        fetch(`/api/v1/events/${eventId}/winners`).then((r) => r.json()),
      ]);

      if (resEvent.success) {
        setEvent(resEvent.event);
      }

      if (resToken.success) {
        setPresentationTokenUrl(resToken.presentationUrl);
      }

      if (resEligible.success) {
        setEligibleList(resEligible.eligible || []);
      }

      if (resWinners.success) {
        setEventWinners(resWinners.winners || []);
      }

      if (resPrizes.success) {
        const availablePrizes = resPrizes.prizes.filter((p: any) => p.status === "AVAILABLE");
        setPrizes(availablePrizes);
        if (availablePrizes.length > 0) {
          setSelectedPrizeId((prev) => {
            const exists = availablePrizes.some((p: any) => p.id === prev);
            return exists ? prev : availablePrizes[0].id;
          });
        } else {
          setSelectedPrizeId("");
        }
      }
    } catch {
      toast.error("Erro ao carregar dados da operação.");
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEventData();

    // Auto-refresh presence and prizes every 4 seconds in background
    const interval = setInterval(() => {
      fetchEventData(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [eventId]);

  // Broadcast helper to SSE Realtime service
  const broadcastRealtime = async (payload: any) => {
    try {
      await fetch(`/api/v1/events/${eventId}/realtime`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          eventId,
          timestamp: Date.now(),
        }),
      });
    } catch {
      // Graceful fallback
    }
  };

  // Audio Broadcast & Control
  const broadcastAudioConfig = async (enabled: boolean, vol: number = telaoVolume) => {
    setTelaoSoundEnabled(enabled);
    setTelaoVolume(vol);

    await broadcastRealtime({
      type: "audio:config",
      soundEnabled: enabled,
      volume: vol,
    });

    if (enabled) {
      toast.success(`Áudio Ativado nos Telões (${Math.round(vol * 100)}%)`);
    } else {
      toast.info("Telões Remotos Silenciados");
    }
  };

  const toggleTelaoAudio = () => {
    broadcastAudioConfig(!telaoSoundEnabled, telaoVolume);
  };

  const toggleLocalSound = () => {
    const next = !localSoundEnabled;
    setLocalSoundEnabled(next);
    soundEngine.setEnabled(next);
  };

  const copyPresentationLink = () => {
    if (!presentationTokenUrl) return;
    const fullUrl = `${window.location.origin}${presentationTokenUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    toast.success("Link do Telão 4K copiado para a área de transferência!");
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const selectedPrize = prizes.find((p) => p.id === selectedPrizeId);

  // Filter prizes by search term
  const filteredPrizes = prizes.filter((p) => {
    if (!prizeSearch.trim()) return true;
    const q = prizeSearch.toLowerCase().trim();
    const orderMatch = `#${p.order}`.toLowerCase().includes(q) || String(p.order) === q;
    const nameMatch = p.name?.toLowerCase().includes(q);
    const sponsorMatch = p.sponsor?.name?.toLowerCase().includes(q);
    const descMatch = p.description?.toLowerCase().includes(q);
    return Boolean(orderMatch || nameMatch || sponsorMatch || descMatch);
  });

  // Stage Projections
  const handleSelectPrize = async (prize: any) => {
    setSelectedPrizeId(prize.id);
    setLatestWinner(null);
    setRollingNumber("---");
    setRollingName("");
    await broadcastRealtime({
      type: "prize:show",
      state: "SHOWING_PRIZE",
      prizeId: prize.id,
      prize,
      winner: null,
    });
    toast.info(`Apresentando no Telão: ${prize.name}`);
  };

  const handleShowEventLogo = async () => {
    setLatestWinner(null);
    setRollingNumber("---");
    setRollingName("");
    await broadcastRealtime({
      type: "logo:show",
      state: "SHOWING_EVENT_LOGO",
      event,
      winner: null,
    });
    toast.success("Logo do Evento projetada no Telão!");
  };

  const handleShowIdle = async () => {
    setLatestWinner(null);
    setRollingNumber("---");
    setRollingName("");
    await broadcastRealtime({
      type: "idle:show",
      state: "IDLE",
      winner: null,
    });
    toast.info("Tela Inicial / Palco ativado no Telão.");
  };

  const handleShowSponsorsSlideshow = async () => {
    // 1. Extract unique sponsors from prizes
    const sponsorMap = new Map<string, any>();

    prizes.forEach((p) => {
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

    let sponsorsList = Array.from(sponsorMap.values());

    // 2. If no prizes had sponsors attached, fetch all registered sponsors
    if (sponsorsList.length === 0) {
      try {
        const resSponsors = await fetch("/api/v1/sponsors").then((r) => r.json());
        if (resSponsors.success && Array.isArray(resSponsors.sponsors) && resSponsors.sponsors.length > 0) {
          sponsorsList = resSponsors.sponsors.map((s: any) => ({
            ...s,
            prizeCount: s._count?.prizes || 1,
            totalValue: 0,
            prizes: [],
          }));
        }
      } catch {}
    }

    // 3. If still empty, add default UniFAP institutional sponsor
    if (sponsorsList.length === 0) {
      sponsorsList = [
        {
          id: "unifap-inst",
          name: "Centro Universitário Paraíso — UniFAP",
          description: "Apoio Institucional • Coordenação Multimídia",
          logoUrl: null,
          prizeCount: 1,
          instagram: "@unifapce",
          website: "https://unifapce.edu.br",
        },
      ];
    }

    await broadcastRealtime({
      type: "sponsors:show",
      state: "SPONSORS_SLIDESHOW",
      sponsors: sponsorsList,
    });
    toast.success(`Slideshow com ${sponsorsList.length} patrocinador(es) iniciado no Telão 4K!`);
  };

  // Cancel Latest Draw and free prize back to AVAILABLE
  const handleCancelLatestDraw = async () => {
    if (!latestWinner?.drawId && !latestWinner?.id) return;
    const drawId = latestWinner.drawId || latestWinner.id;

    try {
      setIsCancellingDraw(true);

      const res = await fetch(`/api/v1/events/${eventId}/draws/${drawId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: cancelReason || "Participante ausente no momento do sorteio",
          disqualifyParticipant: cancelMarkIneligible,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao anular sorteio.");
      }

      await broadcastRealtime({
        type: "draw:cancel",
        state: "IDLE",
        winner: null,
      });

      toast.success("Sorteio anulado! O prêmio voltou para a fila de disponíveis.");
      setIsCancelModalOpen(false);
      setLatestWinner(null);
      setRollingNumber("---");
      setRollingName("");
      setCancelReason("");
      setCancelMarkIneligible(false);
      await fetchEventData(true);
    } catch (err: any) {
      toast.error(err.message || "Erro ao anular sorteio.");
    } finally {
      setIsCancellingDraw(false);
    }
  };

  // Start Draw Execution
  const handleStartDraw = () => {
    if (!selectedPrizeId) {
      toast.error("Selecione um prêmio disponível para sortear.");
      return;
    }
    if (eligibleList.length === 0) {
      toast.error("Nenhum participante com presença confirmada encontrado no evento.");
      return;
    }
    setIsConfirmModalOpen(true);
  };

  const executeConfirmedDraw = async () => {
    setIsConfirmModalOpen(false);
    setIsDrawing(true);
    setLatestWinner(null);
    setRollingNumber("000");
    setRollingName("Sorteando...");

    soundEngine.play("DRAW_START");

    // Broadcast drawing state to Telão in realtime
    await broadcastRealtime({
      type: "draw:start",
      state: "DRAWING",
      prizeId: selectedPrizeId,
      prize: selectedPrize,
      winner: null,
    });

    let apiResult: any = null;
    let apiError: string | null = null;

    try {
      const res = await fetch(`/api/v1/events/${eventId}/draws`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prizeId: selectedPrizeId,
          requirePresence: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        apiError = data.error || "Falha na execução do sorteio.";
      } else {
        apiResult = data.result;
        // Broadcast result immediately to phone/projector screens
        await broadcastRealtime({
          type: "draw:result",
          state: "RESULT",
          winner: {
            ...apiResult,
            prize: selectedPrize,
          },
        });
      }
    } catch (err: any) {
      apiError = err.message || "Erro de conexão com o servidor.";
    }

    if (apiError) {
      setIsDrawing(false);
      toast.error(apiError);
      await broadcastRealtime({ type: "draw:cancel", state: "IDLE" });
      return;
    }

    // 60FPS Physics Deceleration Curve for operator monitor
    const startTime = performance.now();
    const duration = 3800;
    let lastTickTime = 0;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentTickInterval = 30 + easeProgress * 230;

      if (currentTime - lastTickTime >= currentTickInterval) {
        lastTickTime = currentTime;

        if (progress < 0.96) {
          const randIndex = Math.floor(Math.random() * (eligibleList.length || 1));
          const candidate = eligibleList[randIndex];
          if (candidate) {
            setRollingNumber(String(candidate.ticketNumber).padStart(3, "0"));
            setRollingName(candidate.name);
          } else {
            setRollingNumber(String(Math.floor(Math.random() * 900) + 100));
            setRollingName("Sorteando...");
          }

          if (easeProgress > 0.65) {
            soundEngine.play("DRAW_SLOWDOWN");
          } else {
            soundEngine.play("DRAW_TICK");
          }
        }
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setRollingNumber(String(apiResult.drawnNumber).padStart(3, "0"));
        setRollingName(apiResult.drawnName);
        setLatestWinner({
          ...apiResult,
          prize: selectedPrize,
        });
        setIsDrawing(false);

        soundEngine.play("DRAW_RESULT");
        setTimeout(() => {
          soundEngine.play("WINNER");
          fireInstitutionalConfetti();
          toast.success(`Sorteio Concluído: #${apiResult.drawnNumber} - ${apiResult.drawnName}`);
        }, 120);

        fetchEventData(true);
      }
    };

    requestAnimationFrame(animate);
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center text-muted-foreground font-semibold">
        <Loader2 className="h-7 w-7 animate-spin text-amber-500 mr-2" />
        Carregando Console de Operação do Sorteio...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Link href="/eventos" className="hover:text-foreground transition-colors">
              Eventos
            </Link>
            <span>/</span>
            <Link href={`/eventos/${eventId}`} className="hover:text-foreground transition-colors">
              {event?.name || "Detalhes"}
            </Link>
            <span>/</span>
            <span className="text-amber-500 font-bold">Console do Operador</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <Trophy className="h-6 w-6 text-amber-500" />
            Console de Operação do Sorteio
          </h1>
          <p className="text-xs text-muted-foreground">
            Controle da roleta em tempo real para <strong>{event?.name}</strong> com transmissão instantânea para projetores.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {presentationTokenUrl && (
            <>
              <a
                href={presentationTokenUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-amber-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 shadow-sm transition-all"
                title="Abrir Telão 4K em Nova Janela para Projetor"
              >
                <Tv className="w-4 h-4" />
                <span>Abrir Telão 4K (Projetor)</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>

              <button
                onClick={copyPresentationLink}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-border bg-card hover:bg-accent text-foreground text-xs font-bold transition shadow-xs"
                title="Copiar Link do Telão para TV/Projetor"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? "Copiado!" : "Copiar Link"}</span>
              </button>
            </>
          )}

          <Link
            href={`/eventos/${eventId}`}
            className="p-2.5 rounded-xl border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Voltar ao Hub do Evento"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Operator Control Bar: Remote Audio & Projection Modes */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left: Remote Audio Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5 mr-1">
            <Tv className="w-4 h-4 text-primary" />
            <span>Áudio dos Telões:</span>
          </div>

          <button
            onClick={toggleTelaoAudio}
            className={`px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 text-xs font-bold ${
              telaoSoundEnabled
                ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20"
            }`}
          >
            {telaoSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{telaoSoundEnabled ? "Áudio Ligado" : "Mudo (Silenciado)"}</span>
          </button>

          <button
            onClick={() => setIsAudioModalOpen(true)}
            className="px-3 py-1.5 rounded-xl border border-border bg-muted/50 hover:bg-accent text-foreground text-xs font-bold transition flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Ajustes de Som</span>
          </button>
        </div>

        {/* Right: Stage Projections */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase text-muted-foreground mr-1">Projetar no Telão:</span>

          <button
            onClick={handleShowEventLogo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-muted/60 hover:bg-accent text-foreground text-xs font-semibold transition"
          >
            <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
            <span>Logo</span>
          </button>

          <button
            onClick={handleShowSponsorsSlideshow}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#EAA023]/40 bg-[#EAA023]/10 hover:bg-[#EAA023]/20 text-[#EAA023] text-xs font-bold transition shadow-xs"
            title="Iniciar apresentação de slides dos patrocinadores no Telão 4K"
          >
            <Building2 className="w-3.5 h-3.5 text-[#EAA023]" />
            <span>Slideshow Patrocínio</span>
          </button>

          <button
            onClick={handleShowIdle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-muted/60 hover:bg-accent text-foreground text-xs font-semibold transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Tela Inicial</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Controls + Right Live Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Configuration */}
        <div className="lg:col-span-1 space-y-5">
          <div className="p-5 rounded-3xl bg-card border border-border shadow-xs space-y-5">
            <h2 className="text-sm font-black uppercase tracking-wider text-foreground">
              Configuração da Rodada
            </h2>

            {/* 1. Prize Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase text-muted-foreground">
                  1. Selecione o Prêmio
                </label>
                {prizes.length > 0 && (
                  <span className="text-[11px] font-bold text-muted-foreground">
                    {filteredPrizes.length} de {prizes.length} disp.
                  </span>
                )}
              </div>

              {prizes.length > 3 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={prizeSearch}
                    onChange={(e) => setPrizeSearch(e.target.value)}
                    placeholder="Buscar prêmio ou patrocinador..."
                    className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-border bg-muted/40 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                  />
                  {prizeSearch && (
                    <button
                      type="button"
                      onClick={() => setPrizeSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {prizes.length === 0 ? (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-medium text-center">
                  🏆 Todos os prêmios deste evento já foram sorteados!
                </div>
              ) : filteredPrizes.length === 0 ? (
                <div className="p-4 rounded-2xl bg-muted/50 border border-border text-muted-foreground text-xs text-center">
                  Nenhum prêmio encontrado para &quot;{prizeSearch}&quot;.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                  {filteredPrizes.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => !isDrawing && handleSelectPrize(p)}
                      className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                        selectedPrizeId === p.id
                          ? "bg-[#002B49] text-white border-[#002B49] shadow-md dark:bg-amber-500 dark:text-slate-950"
                          : "bg-muted/40 border-border hover:bg-accent text-foreground"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold truncate">
                          #{p.order || 1} • {p.name}
                        </div>
                        <div className={`text-[10px] mt-0.5 ${selectedPrizeId === p.id ? "text-amber-300 dark:text-slate-900 font-semibold" : "text-muted-foreground"}`}>
                          Patrocínio: {p.sponsor?.name || "UniFAP"}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        selectedPrizeId === p.id
                          ? "bg-white/20 text-white dark:bg-black/20 dark:text-black"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      }`}>
                        Disp.
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Critério de Participação */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
                  <ShieldCheck className="w-4 h-4" />
                  Presenças Validadas
                </span>
                <span className="text-xs font-black font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  {eligibleList.length} elegíveis
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                O sorteio ocorre <strong>exclusivamente</strong> entre os participantes com presença confirmada no evento (Biometria Facial ou Manual).
              </p>
            </div>

            {/* Big Spin Action Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled={prizes.length === 0 || isDrawing}
                onClick={handleStartDraw}
                className="w-full py-4 rounded-2xl font-black text-sm text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-500 hover:to-orange-600 shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDrawing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Sorteando Agora...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    <span>Executar Sorteio</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Stage Preview Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl bg-gradient-to-br from-[#000E1A] to-[#002B49] text-white border border-border shadow-2xl overflow-hidden relative min-h-[440px] flex flex-col justify-between p-6 sm:p-8">
            {/* Background Glow */}
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-[#0080C8]/20 rounded-full blur-3xl pointer-events-none" />

            {/* Top Bar inside Card */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-10">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs uppercase font-bold tracking-wider text-blue-200">
                  Palco de Sorteio Sincronizado
                </span>
              </div>
              {selectedPrize && (
                <div className="text-xs font-bold text-amber-400">
                  Prêmio: {selectedPrize.name}
                </div>
              )}
            </div>

            {/* Center Slot Rolling Animation & Winner Display */}
            <div className="my-auto text-center py-8 relative z-10">
              {isDrawing ? (
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: [0.95, 1.05, 0.95] }}
                  transition={{ repeat: Infinity, duration: 0.3 }}
                  className="space-y-3"
                >
                  <div className="text-7xl sm:text-9xl font-black font-mono tracking-wider text-amber-300 drop-shadow-2xl">
                    #{rollingNumber}
                  </div>
                  <div className="text-lg font-bold text-blue-200 truncate max-w-lg mx-auto">
                    {rollingName}
                  </div>
                </motion.div>
              ) : latestWinner ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="space-y-4"
                >
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500 text-slate-950 font-extrabold text-xs uppercase tracking-wider shadow-lg">
                    <Sparkles className="w-4 h-4 fill-current" />
                    TEMOS UM CONTEMPLADO!
                  </div>

                  <div className="text-6xl sm:text-8xl font-black font-mono text-white tracking-tight drop-shadow-md">
                    #{String(latestWinner.drawnNumber).padStart(3, "0")}
                  </div>

                  <div className="text-2xl sm:text-4xl font-black text-amber-400">
                    {latestWinner.drawnName || latestWinner.winner?.name}
                  </div>

                  {latestWinner.winner?.registration && (
                    <div className="text-xs text-blue-200 font-medium">
                      {latestWinner.winner?.category || "Participante"} • Matrícula: {latestWinner.winner.registration}
                    </div>
                  )}

                  {/* Winner Action Buttons: WhatsApp & Anular */}
                  <div className="pt-3 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSingleShareWinner({
                          drawnNumber: latestWinner.drawnNumber,
                          person: {
                            name: latestWinner.drawnName || latestWinner.winner?.name || "Participante",
                            registration: latestWinner.winner?.registration,
                            category: latestWinner.winner?.category,
                            phone: latestWinner.winner?.phone,
                          },
                          prize: {
                            name: selectedPrize?.name || "Prêmio do Sorteio",
                            sponsor: selectedPrize?.sponsor,
                          },
                        });
                        setIsShareModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-md"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Notificar no WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsCancelModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 text-xs font-bold transition shadow-xs"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>Anular Sorteio (Liberar Prêmio)</span>
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  <div className="text-5xl sm:text-7xl font-black font-mono text-white/30 tracking-wider">
                    ---
                  </div>
                  <p className="text-xs text-slate-300 max-w-sm mx-auto">
                    Selecione o prêmio e clique em <strong>&quot;EXECUTAR SORTEIO&quot;</strong> para rodar a roleta.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Sponsor Ribbon */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-300 relative z-10">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-400" />
                <span>
                  Patrocinador:{" "}
                  <strong>{selectedPrize?.sponsor?.name || "UniFAP (Institucional)"}</strong>
                </span>
                {selectedPrize?.sponsor?.logoUrl && (
                  <img
                    src={normalizeImageUrl(selectedPrize.sponsor.logoUrl)}
                    alt={selectedPrize.sponsor.name}
                    className="h-5 max-w-[80px] object-contain rounded bg-white/90 px-1 py-0.5"
                  />
                )}
              </div>
              <div className="text-[11px] text-slate-400">
                Sorteador Oficial UniFAP
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO: CARTÕES DOS CONTEMPLADOS DESTE EVENTO */}
      {eventWinners.length > 0 && (
        <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#EAA023]" />
                Cartões dos Ganhadores do Evento ({eventWinners.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                Acompanhe os contemplados desta edição, envie mensagens no WhatsApp e gere artes para divulgação.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setSingleShareWinner(null);
                setIsShareModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition"
            >
              <Smartphone className="w-4 h-4" />
              <span>Divulgar no WhatsApp / Baixar Cartão PNG</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {eventWinners.map((w, idx) => (
              <div
                key={w.id}
                className="p-4 rounded-2xl border border-border bg-muted/20 hover:bg-muted/40 transition flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-[#002B49] border border-[#EAA023]/40 flex items-center justify-center font-mono font-black text-sm text-[#EAA023] shrink-0 shadow-xs">
                      #{String(w.draw?.drawnNumber || idx + 1).padStart(2, "0")}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground line-clamp-1">{w.person.name}</h4>
                      <p className="text-[11px] text-muted-foreground">
                        {w.person.category || "Participante"} • {w.person.registration || "S/ Matrícula"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-background/80 border border-border/60 text-xs space-y-1">
                  <div className="font-bold text-primary flex items-center gap-1.5 line-clamp-1">
                    <Gift className="w-3.5 h-3.5 shrink-0" />
                    <span>{w.prize.name}</span>
                  </div>
                  {w.prize.sponsor && (
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      {w.prize.sponsor.logoUrl && (
                        <img
                          src={w.prize.sponsor.logoUrl}
                          alt={w.prize.sponsor.name}
                          className="h-3.5 max-w-[60px] object-contain rounded"
                        />
                      )}
                      <span>Patrocínio: <strong>{w.prize.sponsor.name}</strong></span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-muted-foreground">
                    {new Date(w.drawDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setLatestWinner({
                          id: w.drawId || w.id,
                          drawId: w.drawId || w.id,
                          drawnName: w.person.name,
                          drawnNumber: w.draw?.drawnNumber || 1,
                          winner: w.person,
                          prize: w.prize,
                        });
                        setIsCancelModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition cursor-pointer"
                      title="Anular premiação e devolver prêmio"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSingleShareWinner(w);
                        setIsShareModalOpen(true);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 transition cursor-pointer"
                    >
                      <Smartphone className="w-3 h-3" />
                      <span>Notificar WhatsApp</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground rounded-3xl border border-border shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-black text-foreground">Confirmar Execução do Sorteio</h3>
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2 text-foreground">
              <div className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                <span>Dados da Rodada:</span>
              </div>
              <div><strong>Prêmio:</strong> {selectedPrize?.name}</div>
              <div><strong>Patrocínio:</strong> {selectedPrize?.sponsor?.name || "UniFAP"}</div>
              <div><strong>Elegíveis no Evento:</strong> {eligibleList.length} participantes</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-accent transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeConfirmedDraw}
                className="px-5 py-2 text-xs font-black rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 transition shadow-sm"
              >
                Confirmar e Sortear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audio Modal */}
      {isAudioModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground rounded-3xl border border-border shadow-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-black text-foreground">Controle de Áudio dos Telões</h3>
              <button
                onClick={() => setIsAudioModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-foreground">Áudio Remoto dos Telões</div>
                    <div className="text-[11px] text-muted-foreground">Controla o som de todas as TVs e projetores abertos.</div>
                  </div>
                  <button
                    onClick={toggleTelaoAudio}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                      telaoSoundEnabled ? "bg-amber-500 text-slate-950 font-black" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {telaoSoundEnabled ? "LIGADO" : "MUDO"}
                  </button>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-semibold mb-1">
                    <span>Volume dos Telões</span>
                    <span className="font-mono font-bold">{Math.round(telaoVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={telaoVolume}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      broadcastAudioConfig(val > 0, val);
                    }}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-muted/40 border border-border flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-foreground">Áudio Local (Neste Computador)</div>
                  <div className="text-[11px] text-muted-foreground">Ouvir efeitos sonoros na mesa do operador.</div>
                </div>
                <button
                  onClick={toggleLocalSound}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    localSoundEnabled ? "bg-emerald-600 text-white font-black" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {localSoundEnabled ? "LIGADO" : "MUDO"}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsAudioModalOpen(false)}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground rounded-3xl border border-border shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-black text-rose-600 flex items-center gap-2">
              <Undo2 className="w-5 h-5" />
              Anular Sorteio e Devolver Prêmio
            </h3>
            
            <p className="text-xs text-muted-foreground">
              O prêmio <strong>{latestWinner?.prize?.name || selectedPrize?.name}</strong> voltará imediatamente para a lista de prêmios disponíveis para uma nova rodada.
            </p>

            <div className="space-y-3 pt-1">
              <div>
                <label className="text-[11px] font-bold text-foreground block mb-1">
                  Motivo da Anulação
                </label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ex: Não compareceu após ser chamado 3 vezes"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="disqualifyCheck"
                  checked={cancelMarkIneligible}
                  onChange={(e) => setCancelMarkIneligible(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <label htmlFor="disqualifyCheck" className="text-xs text-foreground cursor-pointer select-none">
                  <strong className="block text-rose-700 dark:text-rose-400">Desqualificar por Ausência</strong>
                  <span className="text-[10px] text-muted-foreground block">
                    Remove a presença deste participante para não ser sorteado novamente neste evento.
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-accent"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleCancelLatestDraw}
                disabled={isCancellingDraw}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition flex items-center gap-1.5"
              >
                {isCancellingDraw ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Undo2 className="w-3.5 h-3.5" />
                )}
                <span>{isCancellingDraw ? "Anulando..." : "Confirmar e Devolver Prêmio"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Winner Share & WhatsApp Modal */}
      <WinnerShareModal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setSingleShareWinner(null);
        }}
        eventName={event?.name || "Sorteio Oficial"}
        eventDate={event?.startDate}
        winners={eventWinners}
        singleWinner={singleShareWinner}
      />
    </div>
  );
}
