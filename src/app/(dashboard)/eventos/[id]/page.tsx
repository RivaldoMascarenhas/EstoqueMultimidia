"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Calendar,
  Users,
  Camera,
  Gift,
  Trophy,
  FileText,
  Settings,
  Plus,
  Play,
  Upload,
  Download,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Sparkles,
  MapPin,
  Clock,
  Trash2,
  Edit2,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Filter,
  Tv,
  Copy,
  Check,
  Lock,
  Pencil,
  Building2,
  Smartphone,
  Image as ImageIcon,
  Printer,
} from "lucide-react";
import { FaceAttendanceCamera } from "@/components/biometria/FaceAttendanceCamera";
import { PrizeFormModal } from "@/components/events/PrizeFormModal";
import { EventFormModal } from "@/components/events/EventFormModal";
import { EnrollParticipantsModal } from "@/components/events/EnrollParticipantsModal";
import { PersonFormModal } from "@/components/biometria/PersonFormModal";
import { WinnerShareModal } from "@/components/events/WinnerShareModal";
import { AttendancePrintModal } from "@/components/events/AttendancePrintModal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { normalizeImageUrl } from "@/lib/formatImageUrl";
import { toast } from "sonner";

export default function EventHubPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [activeTab, setActiveTab] = useState<
    "overview" | "participants" | "presence" | "prizes" | "winners" | "reports"
  >("overview");

  const [event, setEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Tab Data States
  const [participants, setParticipants] = useState<any[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [prizes, setPrizes] = useState<any[]>([]);
  const [winners, setWinners] = useState<any[]>([]);
  const [recentPresences, setRecentPresences] = useState<any[]>([]);

  // Search & Filter for Participants Tab
  const [participantSearch, setParticipantSearch] = useState("");
  const [participantPresenceFilter, setParticipantPresenceFilter] = useState("all");

  // Modals
  const [isPrizeModalOpen, setIsPrizeModalOpen] = useState(false);
  const [editingPrize, setEditingPrize] = useState<any | null>(null);
  const [isEventEditModalOpen, setIsEventEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedShareWinner, setSelectedShareWinner] = useState<any | null>(null);
  const [isPrintAttendanceModalOpen, setIsPrintAttendanceModalOpen] = useState(false);

  // Custom Delete/Cancel Confirmation Modal State
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    itemName?: string;
    confirmText?: string;
    variant?: "danger" | "warning";
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  // Presentation Token State for Remote Projectors / TVs
  const [presentationUrl, setPresentationUrl] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);

  // Fetch Event Details
  const fetchEvent = async () => {
    try {
      const [resEvent, resToken] = await Promise.all([
        fetch(`/api/v1/events/${eventId}`).then((r) => r.json()),
        fetch(`/api/v1/events/${eventId}/presentation-token`).then((r) => r.json()),
      ]);

      if (resEvent.success) {
        setEvent(resEvent.event);
      } else {
        toast.error("Evento não encontrado.");
      }

      if (resToken.success) {
        setPresentationUrl(resToken.presentationUrl);
      }
    } catch {
      toast.error("Erro ao carregar dados do evento.");
    } finally {
      setLoading(false);
    }
  };

  const copyPresentationLink = () => {
    if (!presentationUrl) return;
    const fullUrl = `${window.location.origin}${presentationUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    toast.success("Link do Telão 4K copiado para a área de transferência!");
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Fetch Participants
  const fetchParticipants = async () => {
    setParticipantsLoading(true);
    try {
      const pParams = new URLSearchParams();
      if (participantSearch) pParams.append("query", participantSearch);
      if (participantPresenceFilter === "true") pParams.append("hasPresence", "true");
      if (participantPresenceFilter === "false") pParams.append("hasPresence", "false");
      pParams.append("limit", "100");

      const res = await fetch(`/api/v1/events/${eventId}/participants?${pParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setParticipants(data.items);
      }
    } catch {
      toast.error("Erro ao carregar lista de participantes.");
    } finally {
      setParticipantsLoading(false);
    }
  };

  // Fetch Prizes
  const fetchPrizes = async () => {
    try {
      const res = await fetch(`/api/v1/events/${eventId}/prizes`);
      const data = await res.json();
      if (data.success) {
        setPrizes(data.prizes);
      }
    } catch {}
  };

  // Fetch Winners
  const fetchWinners = async () => {
    try {
      const res = await fetch(`/api/v1/events/${eventId}/winners`);
      const data = await res.json();
      if (data.success) {
        setWinners(data.winners);
      }
    } catch {}
  };



  useEffect(() => {
    fetchEvent();
    fetchPrizes();
    fetchWinners();
  }, [eventId]);

  useEffect(() => {
    if (activeTab === "participants") {
      fetchParticipants();
    } else if (activeTab === "prizes") {
      fetchPrizes();
    } else if (activeTab === "winners") {
      fetchWinners();
    }
  }, [activeTab, participantPresenceFilter]);

  // Handle Manual Presence Toggle
  const handleManualPresence = async (personId: string) => {
    try {
      const res = await fetch(`/api/v1/events/${eventId}/presences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Presença registrada!");
        fetchParticipants();
        fetchEvent();
      } else {
        toast.error(data.error || "Erro ao registrar presença.");
      }
    } catch {
      toast.error("Erro na requisição.");
    }
  };

  // Handle Prize Delivery Status Toggle
  const handleToggleWinnerDelivered = async (winnerId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/v1/events/${eventId}/winners`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          winnerId,
          delivered: !currentStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(!currentStatus ? "Prêmio marcado como entregue!" : "Entrega cancelada.");
        fetchWinners();
      }
    } catch {
      toast.error("Erro ao atualizar entrega.");
    }
  };

  // Handle Download Attendance CSV
  const handleDownloadAttendance = (presenceOnly: boolean) => {
    const url = `/api/v1/events/${eventId}/participants/export?presenceOnly=${presenceOnly}`;
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(
      presenceOnly
        ? "Baixando lista de presenças confirmadas..."
        : "Baixando lista completa de participantes..."
    );
  };

  // Handle Delete Prize with Custom Modal & RBAC check
  const handleDeletePrize = (prize: any) => {
    if (prize.status !== "AVAILABLE" && session?.user?.role !== "ADMIN") {
      toast.error("Apenas administradores podem excluir prêmios que já foram sorteados.");
      return;
    }

    setConfirmModalState({
      isOpen: true,
      title: "Excluir Prêmio",
      description: `Tem certeza que deseja excluir o prêmio "${prize.name}"? Esta ação removerá o item da premiação deste evento.`,
      itemName: `🏆 ${prize.name} (#${prize.order || 1})`,
      confirmText: "Excluir Prêmio",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/v1/events/${eventId}/prizes/${prize.id}`, {
            method: "DELETE",
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || "Erro ao excluir prêmio.");
          }
          toast.success("Prêmio excluído com sucesso!");
          fetchPrizes();
          fetchEvent();
        } catch (err: any) {
          toast.error(err.message || "Erro ao excluir.");
        }
      },
    });
  };

  // Handle Cancel/Invalidate Draw with Custom Modal
  const handleCancelDrawFromTable = (winner: any) => {
    const drawId = winner.drawId || winner.draw?.id;
    if (!drawId) {
      toast.error("ID do sorteio não identificado.");
      return;
    }

    setConfirmModalState({
      isOpen: true,
      title: "Anular Sorteio do Participante",
      description: `Deseja anular a premiação de "${winner.person.name}" para o prêmio "${winner.prize.name}"? O prêmio voltará imediatamente a ficar disponível para sorteio na roleta.`,
      itemName: `👤 ${winner.person.name} • 🎁 Prêmio: ${winner.prize.name}`,
      confirmText: "Anular e Devolver Prêmio",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/v1/events/${eventId}/draws/${drawId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reason: "Anulado pelo painel de vencedores",
              disqualifyParticipant: true,
            }),
          });

          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || "Erro ao anular sorteio.");
          }

          toast.success("Sorteio anulado com sucesso! O prêmio voltou para a fila de disponíveis.");
          fetchWinners();
          fetchPrizes();
          fetchEvent();
        } catch (err: any) {
          toast.error(err.message || "Erro ao anular sorteio.");
        }
      },
    });
  };



  if (loading) {
    return (
      <div className="py-24 text-center text-muted-foreground">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 opacity-50" />
        Carregando Hub do Evento...
      </div>
    );
  }

  if (!event) {
    return (
      <div className="py-24 text-center text-muted-foreground">
        <p className="text-sm font-bold text-foreground">Evento não encontrado.</p>
        <Link href="/eventos" className="text-xs text-primary hover:underline mt-2 inline-block">
          Voltar para Lista de Eventos
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div
          className="absolute top-0 left-0 right-0 h-2"
          style={{ backgroundColor: event.primaryColor || "#002B49" }}
        />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pt-2">
          <div className="flex items-start gap-4">
            {/* Event Logo Thumbnail */}
            <div
              onClick={() => setIsEventEditModalOpen(true)}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-border bg-card p-2 shrink-0 flex items-center justify-center cursor-pointer shadow-xs hover:border-primary/60 transition group relative overflow-hidden"
              title="Clique para alterar a logo do evento"
            >
              {event.logoUrl ? (
                <img
                  src={normalizeImageUrl(event.logoUrl)}
                  alt={event.name}
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (img.src.includes("drive.google.com/thumbnail")) {
                      const fileId = img.src.match(/id=([a-zA-Z0-9_-]+)/)?.[1];
                      if (fileId) {
                        img.src = `https://lh3.googleusercontent.com/d/${fileId}`;
                      }
                    } else if (img.src.includes("lh3.googleusercontent.com/d/")) {
                      const fileId = img.src.split("/d/")[1]?.split("?")[0];
                      if (fileId) {
                        img.src = `https://drive.google.com/uc?export=view&id=${fileId}`;
                      }
                    }
                  }}
                />
              ) : (
                <div className="text-center text-muted-foreground flex flex-col items-center">
                  <ImageIcon className="h-6 w-6 opacity-50 group-hover:text-primary transition-colors" />
                  <span className="text-[9px] font-bold text-muted-foreground mt-0.5">+ Logo</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-500/10 px-3 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {event.status}
                </span>
                {event.date && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(event.date).toLocaleDateString("pt-BR")}
                  </span>
                )}
                {event.time && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                    <Clock className="h-3.5 w-3.5" />
                    {event.time}
                  </span>
                )}
                {event.location && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                    <MapPin className="h-3.5 w-3.5" />
                    {event.location}
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-black tracking-tight text-foreground">{event.name}</h1>
              {event.description && (
                <p className="text-xs text-muted-foreground max-w-2xl">{event.description}</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {presentationUrl && (
              <>
                <a
                  href={presentationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl border border-amber-500/30 transition-colors shadow-xs"
                  title="Abrir Telão 4K em Nova Aba para Projetores/TVs"
                >
                  <Tv className="h-4 w-4" />
                  <span>Telão 4K (Projetor)</span>
                  <ExternalLink className="h-3 w-3 opacity-70" />
                </a>

                <button
                  onClick={copyPresentationLink}
                  className="p-2 rounded-xl text-muted-foreground hover:bg-accent border border-border transition-colors"
                  title="Copiar Link 4K do Telão para TV/Projetor"
                >
                  {copiedLink ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </>
            )}

            <Link
              href={`/eventos/${event.id}/sorteio`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-md transition-all"
            >
              <Play className="h-4 w-4" />
              Operar Sorteio (Projeção)
            </Link>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-foreground bg-muted/60 hover:bg-accent rounded-xl border border-border transition-colors"
            >
              <Upload className="h-4 w-4" />
              Importar Lista
            </button>

            <button
              onClick={() => setIsEventEditModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-foreground bg-muted/60 hover:bg-accent rounded-xl border border-border transition-colors"
              title="Configurações e Logo do Evento"
            >
              <ImageIcon className="h-4 w-4 text-[#EAA023]" />
              <span>Editar Evento & Logo</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto border-t border-border/80 pt-4 mt-6">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              activeTab === "overview"
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            Visão Geral
          </button>

          <button
            onClick={() => setActiveTab("participants")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              activeTab === "participants"
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4" />
            Participantes ({event.stats?.participantsCount || 0})
          </button>

          <button
            onClick={() => setActiveTab("presence")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              activeTab === "presence"
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Camera className="h-4 w-4" />
            Presença Facial ({event.stats?.presencesTotal || 0})
          </button>

          <button
            onClick={() => setActiveTab("prizes")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              activeTab === "prizes"
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Gift className="h-4 w-4" />
            Prêmios ({event.stats?.prizesCount || 0})
          </button>

          <button
            onClick={() => setActiveTab("winners")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              activeTab === "winners"
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            Vencedores ({event.stats?.winnersCount || 0})
          </button>

          <button
            onClick={() => setActiveTab("reports")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              activeTab === "reports"
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <FileText className="h-4 w-4" />
            Relatórios
          </button>
        </div>
      </div>

      {/* TAB 1: VISÃO GERAL */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                <span>Inscritos Totais</span>
                <Users className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-black text-foreground">{event.stats?.participantsCount || 0}</p>
              <p className="text-[10px] text-muted-foreground">Participantes no evento</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                <span>Presenças Confirmadas</span>
                <Sparkles className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {event.stats?.presencesTotal || 0}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {event.stats?.presencesFace || 0} Facial • {event.stats?.presencesManual || 0} Manual
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                <span>Prêmios Cadastrados</span>
                <Gift className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-2xl font-black text-foreground">{event.stats?.prizesCount || 0}</p>
              <p className="text-[10px] text-muted-foreground">Para sorteio público</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                <span>Sorteios Executados</span>
                <Trophy className="h-4 w-4 text-orange-500" />
              </div>
              <p className="text-2xl font-black text-foreground">{event.stats?.winnersCount || 0}</p>
              <p className="text-[10px] text-muted-foreground">Ganhadores contemplados</p>
            </div>
          </div>

          {/* Quick Hub Navigator */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => setActiveTab("presence")}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:border-primary/50 cursor-pointer transition-all flex items-center justify-between group"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <Camera className="h-5 w-5" />
                  Terminal de Presença Facial
                </div>
                <p className="text-xs text-muted-foreground">
                  Abra a câmera MediaPipe e inicie a validação biométrica dos participantes em tempo real.
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </div>

            <Link
              href={`/eventos/${event.id}/sorteio`}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:border-amber-500/50 cursor-pointer transition-all flex items-center justify-between group"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                  <Trophy className="h-5 w-5" />
                  Tela de Sorteio (Projeção Telão)
                </div>
                <p className="text-xs text-muted-foreground">
                  Modo apresentação full-screen com roleta, efeitos sonoros e confetes em tempo real.
                </p>
              </div>
              <ExternalLink className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      )}

      {/* TAB 2: PARTICIPANTES */}
      {activeTab === "participants" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchParticipants()}
                  placeholder="Buscar participante..."
                  className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <select
                value={participantPresenceFilter}
                onChange={(e) => setParticipantPresenceFilter(e.target.value)}
                className="rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                <option value="all">Todas as Presenças</option>
                <option value="true">Apenas Presentes</option>
                <option value="false">Apenas Ausentes</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownloadAttendance(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl transition-colors shadow-xs"
                title="Baixar lista em planilha Excel/CSV de quem teve presença confirmada"
              >
                <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Baixar Presentes (.CSV)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPrintAttendanceModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-foreground bg-card border border-border hover:bg-accent rounded-xl transition-colors shadow-xs"
                title="Visualizar ou imprimir folha oficial de presenças / PDF"
              >
                <Printer className="h-4 w-4 text-primary" />
                <span>Imprimir Lista / PDF</span>
              </button>

              <button
                onClick={() => setIsPersonModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-foreground bg-card border border-border hover:bg-accent rounded-xl transition-colors"
                title="Cadastrar uma nova pessoa do zero"
              >
                <Plus className="h-4 w-4" />
                Cadastrar Pessoa
              </button>

              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md transition-colors"
                title="Inscrever pessoas por Categoria, Busca na base ou Planilha"
              >
                <Users className="h-4 w-4" />
                Inscrever Participantes
              </button>
            </div>
          </div>

          {/* Participants Table */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-semibold">
                  <th className="py-3 px-4">Bilhete</th>
                  <th className="py-3 px-4">Nome</th>
                  <th className="py-3 px-4">Matrícula / Categoria</th>
                  <th className="py-3 px-4 text-center">Biometria</th>
                  <th className="py-3 px-4 text-center">Presença</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {participantsLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 opacity-50" />
                      Carregando inscritos...
                    </td>
                  </tr>
                ) : participants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      Nenhum participante encontrado.
                    </td>
                  </tr>
                ) : (
                  participants.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-primary">
                        #{p.ticketNumber}
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground">
                        <p className="font-bold">{p.name}</p>
                        {p.email && <p className="text-[10px] text-muted-foreground">{p.email}</p>}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        <p className="font-mono text-foreground font-semibold">{p.registration || "—"}</p>
                        <p className="text-[10px]">{p.category || "Geral"}</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {p.hasFaceEnrolled ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            OK
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Pendente</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {p.hasPresence ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" />
                            Presente ({p.presenceMethod})
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Ausente</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {!p.hasPresence ? (
                          <button
                            onClick={() => handleManualPresence(p.personId)}
                            className="px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          >
                            Dar Presença
                          </button>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-semibold">Confirmado</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PRESENÇA FACIAL */}
      {activeTab === "presence" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <FaceAttendanceCamera
              eventId={event.id}
              eventName={event.name}
              onPresenceRecorded={(res) => {
                fetchEvent();
                if (res.person) {
                  setRecentPresences((prev) => [
                    {
                      id: String(Date.now()),
                      name: res.person!.name,
                      registration: res.person!.registration,
                      confidence: res.confidence,
                      timestamp: new Date(),
                    },
                    ...prev.slice(0, 9),
                  ]);
                }
              }}
            />
          </div>

          {/* Right Column: Live Feed */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Últimos Presentes Reconhecidos
              </h2>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                {event.stats?.presencesTotal || 0} Total
              </span>
            </div>

            <div className="space-y-2 max-h-[440px] overflow-y-auto">
              {recentPresences.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Aproxime o rosto da câmera para registrar presença automaticamente.
                </div>
              ) : (
                recentPresences.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 p-3"
                  >
                    <div>
                      <p className="text-xs font-bold text-foreground">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {item.registration ? `Matrícula: ${item.registration}` : "Participante"} •{" "}
                        {item.timestamp.toLocaleTimeString("pt-BR")}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      {item.confidence ? `${Math.round(item.confidence * 100)}%` : "100%"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PRÊMIOS */}
      {activeTab === "prizes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Cadastre e gerencie os itens e brindes que serão sorteados neste evento.
            </p>
            <button
              onClick={() => {
                setEditingPrize(null);
                setIsPrizeModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md transition-colors"
            >
              <Plus className="h-4 w-4" />
              Novo Prêmio
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {prizes.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground space-y-2">
                <Gift className="h-8 w-8 mx-auto opacity-30" />
                <p className="text-xs font-bold text-foreground">Nenhum prêmio cadastrado</p>
                <p className="text-[11px]">Clique em "Novo Prêmio" para adicionar os brindes do evento.</p>
              </div>
            ) : (
              prizes.map((prize) => {
                const isDrawn = prize.status !== "AVAILABLE";
                const isAdmin = session?.user?.role === "ADMIN";
                const canModify = !isDrawn || isAdmin;

                return (
                  <div
                    key={prize.id}
                    className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3 relative overflow-hidden flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            prize.status === "AVAILABLE"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {prize.status === "AVAILABLE" ? "Disponível para Sorteio" : "Já Sorteado"}
                        </span>
                        <span className="text-xs font-bold font-mono text-foreground">
                          Qtd: {prize.quantity}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-foreground">#{prize.order || 1} • {prize.name}</h3>
                        {prize.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {prize.description}
                          </p>
                        )}
                      </div>

                      {prize.sponsor && (
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/40 border border-border/60">
                          {prize.sponsor.logoUrl ? (
                            <img
                              src={prize.sponsor.logoUrl}
                              alt={prize.sponsor.name}
                              className="h-5 max-w-[70px] object-contain rounded bg-white/90 px-1 py-0.5"
                            />
                          ) : (
                            <Building2 className="w-3.5 h-3.5 text-primary" />
                          )}
                          <span className="text-[11px] text-muted-foreground line-clamp-1">
                            Patrocínio: <strong className="text-foreground">{prize.sponsor.name}</strong>
                          </span>
                        </div>
                      )}

                      {prize.estimatedValue && (
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          R$ {Number(prize.estimatedValue).toFixed(2)}
                        </p>
                      )}
                    </div>

                    {/* Prize Action Buttons */}
                    <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!canModify) {
                            toast.error("Apenas Administradores podem alterar prêmios que já foram sorteados.");
                            return;
                          }
                          setEditingPrize(prize);
                          setIsPrizeModalOpen(true);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
                          canModify
                            ? "border-border bg-muted/40 hover:bg-accent text-foreground"
                            : "border-border/50 bg-muted/20 text-muted-foreground/60 cursor-not-allowed"
                        }`}
                        title={!canModify ? "Apenas Administradores podem alterar prêmios sorteados" : "Editar Prêmio"}
                      >
                        {!canModify ? <Lock className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeletePrize(prize)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
                          canModify
                            ? "border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400"
                            : "border-border/50 bg-muted/20 text-muted-foreground/60 cursor-not-allowed"
                        }`}
                        title={!canModify ? "Apenas Administradores podem excluir prêmios sorteados" : "Excluir Prêmio"}
                      >
                        {!canModify ? <Lock className="h-3 w-3" /> : <Trash2 className="h-3 w-3" />}
                        <span>Excluir</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 5: VENCEDORES */}
      {activeTab === "winners" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Lista oficial de participantes contemplados e controle de entrega de brindes.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedShareWinner(null);
                  setIsShareModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-colors"
              >
                <Smartphone className="h-4 w-4" />
                <span>Divulgar no WhatsApp / Baixar Cartão PNG</span>
              </button>

              <a
                href={`/api/v1/events/${event.id}/export?type=winners&format=html`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-foreground bg-card border border-border hover:bg-accent rounded-xl transition-colors"
              >
                <Download className="h-4 w-4" />
                Imprimir Relatório
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-semibold">
                  <th className="py-3 px-4">Prêmio</th>
                  <th className="py-3 px-4">Ganhador</th>
                  <th className="py-3 px-4">Matrícula</th>
                  <th className="py-3 px-4 text-center">Status Entrega</th>
                  <th className="py-3 px-4">Data Sorteio</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {winners.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      Nenhum sorteio foi realizado ainda.
                    </td>
                  </tr>
                ) : (
                  winners.map((w) => (
                    <tr key={w.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-primary">{w.prize.name}</div>
                        {w.prize.sponsor && (
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            {w.prize.sponsor.logoUrl && (
                              <img
                                src={w.prize.sponsor.logoUrl}
                                alt={w.prize.sponsor.name}
                                className="h-3 max-w-[50px] object-contain rounded"
                              />
                            )}
                            <span>Patrocínio: {w.prize.sponsor.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground">{w.person.name}</td>
                      <td className="py-3 px-4 font-mono text-muted-foreground">
                        {w.person.registration || "—"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            w.delivered
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {w.delivered ? "Entregue" : "Pendente"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(w.drawDate).toLocaleString("pt-BR")}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedShareWinner(w);
                              setIsShareModalOpen(true);
                            }}
                            className="px-2 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition-colors flex items-center gap-1"
                            title="Notificar ganhador no WhatsApp"
                          >
                            <Smartphone className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </button>

                          <button
                            onClick={() => handleToggleWinnerDelivered(w.id, w.delivered)}
                            className="px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          >
                            {w.delivered ? "Desfazer" : "Entregar"}
                          </button>

                          <button
                            onClick={() => handleCancelDrawFromTable(w)}
                            className="px-2 py-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition-colors flex items-center gap-1"
                            title="Anular este sorteio e devolver o prêmio à fila de disponíveis"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Anular</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: RELATÓRIOS */}
      {activeTab === "reports" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Relatório de Frequência & Presença
            </h3>
            <p className="text-xs text-muted-foreground">
              Lista completa com nomes, matrículas, presenças registradas, método (facial ou manual), horários e status biométrico.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleDownloadAttendance(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Baixar Presentes (.CSV)</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownloadAttendance(false)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-foreground bg-muted hover:bg-accent rounded-xl border border-border transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Todos os Inscritos (.CSV)</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPrintAttendanceModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-foreground bg-card hover:bg-accent border border-border rounded-xl transition-colors"
              >
                <Printer className="h-4 w-4 text-primary" />
                <span>Visualizar / Imprimir Lista</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Relatório Oficial de Ganhadores
            </h3>
            <p className="text-xs text-muted-foreground">
              Ata de sorteios realizados com nomes dos ganhadores, prêmios, horários de sorteio e confirmação de entrega.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <a
                href={`/api/v1/events/${event.id}/export?type=winners&format=html`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md transition-colors"
              >
                <FileText className="h-4 w-4" />
                Visualizar / Imprimir Ata
              </a>
              <a
                href={`/api/v1/events/${event.id}/export?type=winners&format=xlsx`}
                download
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-foreground bg-muted hover:bg-accent rounded-xl border border-border transition-colors"
              >
                <Download className="h-4 w-4" />
                Excel (.xlsx)
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <PrizeFormModal
        isOpen={isPrizeModalOpen}
        onClose={() => {
          setIsPrizeModalOpen(false);
          setEditingPrize(null);
        }}
        eventId={event.id}
        prize={editingPrize}
        onSuccess={() => {
          fetchPrizes();
          fetchEvent();
        }}
      />

      <EventFormModal
        isOpen={isEventEditModalOpen}
        onClose={() => setIsEventEditModalOpen(false)}
        event={event}
        onSuccess={fetchEvent}
      />

      <EnrollParticipantsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        eventId={event.id}
        eventName={event.name}
        onSuccess={() => {
          fetchParticipants();
          fetchEvent();
        }}
      />

      <PersonFormModal
        isOpen={isPersonModalOpen}
        onClose={() => setIsPersonModalOpen(false)}
        onSuccess={() => {
          fetchParticipants();
          fetchEvent();
        }}
      />

      {/* Winner Share Modal */}
      <WinnerShareModal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setSelectedShareWinner(null);
        }}
        eventName={event?.name || "Evento UniFAP"}
        eventDate={event?.startDate}
        winners={winners}
        singleWinner={selectedShareWinner}
      />

      {/* Attendance Print & Export Modal */}
      <AttendancePrintModal
        isOpen={isPrintAttendanceModalOpen}
        onClose={() => setIsPrintAttendanceModalOpen(false)}
        event={event}
        participants={participants}
        onDownloadCsv={handleDownloadAttendance}
      />

      {/* Custom Delete / Cancellation Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModalState.onConfirm}
        title={confirmModalState.title}
        description={confirmModalState.description}
        itemName={confirmModalState.itemName}
        confirmText={confirmModalState.confirmText}
        variant={confirmModalState.variant}
      />
    </div>
  );
}
