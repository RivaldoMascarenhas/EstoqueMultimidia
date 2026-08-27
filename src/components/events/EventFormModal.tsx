"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Calendar,
  MapPin,
  Clock,
  Palette,
  Save,
  Loader2,
  Users,
  Image as ImageIcon,
  Upload,
  X,
  Sparkles,
  Trophy,
  Sliders,
  Building,
  Check,
} from "lucide-react";
import { normalizeImageUrl } from "@/lib/formatImageUrl";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: any | null;
  onSuccess?: () => void;
}

export function EventFormModal({
  isOpen,
  onClose,
  event,
  onSuccess,
}: EventFormModalProps) {
  const isEditing = !!event;

  const [activeTab, setActiveTab] = useState<"general" | "stage">("general");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [primaryColor, setPrimaryColor] = useState("#002B49");
  const [secondaryColor, setSecondaryColor] = useState("#EAA023");
  const [logoUrl, setLogoUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [allowRepeatWinners, setAllowRepeatWinners] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imgHasError, setImgHasError] = useState(false);

  // Salas disponíveis no sistema para sugestão
  const [rooms, setRooms] = useState<Array<{ id: string; name: string; capacity?: number }>>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadRooms() {
      try {
        const res = await fetch("/api/v1/rooms");
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setRooms(json.data);
        }
      } catch {}
    }
    loadRooms();
  }, []);

  useEffect(() => {
    if (event) {
      setName(event.name || "");
      setDescription(event.description || "");
      setDate(event.date ? new Date(event.date).toISOString().split("T")[0] : "");
      setTime(event.time || "");
      setLocation(event.location || "");
      setStatus(event.status || "DRAFT");
      setPrimaryColor(event.primaryColor || "#002B49");
      setSecondaryColor(event.secondaryColor || "#EAA023");
      setLogoUrl(event.logoUrl || "");
      setCoverUrl(event.coverUrl || "");
      setAllowRepeatWinners(event.allowRepeatWinners ?? false);
      setMaxParticipants(event.maxParticipants || "");
    } else {
      setName("");
      setDescription("");
      setDate(new Date().toISOString().split("T")[0]);
      setTime("19:00");
      setLocation("Auditório Principal — UniFAP");
      setStatus("OPEN");
      setPrimaryColor("#002B49");
      setSecondaryColor("#EAA023");
      setLogoUrl("/brand/logo-unifap-negativa.png");
      setCoverUrl("");
      setAllowRepeatWinners(false);
      setMaxParticipants("");
    }
    setImgHasError(false);
    setActiveTab("general");
  }, [event, isOpen]);

  // Compress & optimize image upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL("image/png");
          setLogoUrl(compressed);
          setImgHasError(false);
          toast.success("Logo carregada e otimizada com sucesso!");
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nome do evento é obrigatório.");
      setActiveTab("general");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = isEditing ? `/api/v1/events/${event.id}` : "/api/v1/events";
      const method = isEditing ? "PATCH" : "POST";

      const finalLogoUrl = normalizeImageUrl(logoUrl).trim() || null;
      const finalCoverUrl = normalizeImageUrl(coverUrl).trim() || null;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          date: date ? new Date(date).toISOString() : null,
          time: time.trim() || null,
          location: location.trim() || null,
          status,
          primaryColor,
          secondaryColor,
          logoUrl: finalLogoUrl,
          coverUrl: finalCoverUrl,
          allowRepeatWinners,
          maxParticipants: maxParticipants ? Number(maxParticipants) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao salvar evento.");
      }

      toast.success(isEditing ? "Evento atualizado com sucesso!" : "Evento criado com sucesso!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl bg-card border-border p-0 overflow-hidden shadow-2xl rounded-3xl">
        {/* Header com Abas Integradas */}
        <div className="border-b border-border/80 bg-muted/20">
          <div className="p-5 pb-3">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                {isEditing ? "Editar Evento" : "Novo Evento Institucional"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Configure informações, local, status e regras do telão e sorteios.
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Seletor de Abas */}
          <div className="flex items-center px-5 gap-2 border-t border-border/40 pt-2 pb-1">
            <button
              type="button"
              onClick={() => setActiveTab("general")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer",
                activeTab === "general"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Dados Gerais</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("stage")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer",
                activeTab === "stage"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Sparkles className="h-3.5 w-3.5 text-[#EAA023]" />
              <span>Telão & Sorteios</span>
            </button>
          </div>
        </div>

        {/* Formulário com Abas */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* ========================================================================= */}
          {/* ABA 1: DADOS GERAIS DO EVENTO */}
          {/* ========================================================================= */}
          {activeTab === "general" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Nome do Evento */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Nome do Evento *</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Obrigatório</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Semana Acadêmica de Engenharia 2026"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              {/* Descrição */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Descrição / Informações Adicionais</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalhes sobre a programação, palestrantes ou público-alvo..."
                  className="w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground focus:border-primary focus:outline-none resize-none"
                />
              </div>

              {/* Data, Horário e Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Data</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Horário</span>
                  </label>
                  <input
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="Ex: 19:00"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Status do Evento</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="DRAFT">Rascunho</option>
                    <option value="OPEN">Aberto (Check-in & Sorteios)</option>
                    <option value="IN_PROGRESS">Em Andamento</option>
                    <option value="PAUSED">Pausado</option>
                    <option value="FINISHED">Finalizado</option>
                    <option value="CANCELLED">Cancelado</option>
                  </select>
                </div>
              </div>

              {/* Local / Auditório / Sala */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Localização / Sala / Auditório</span>
                  </span>
                  {rooms.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">Sugestões do sistema</span>
                  )}
                </label>

                <div className="relative">
                  <input
                    type="text"
                    list="rooms-suggestions"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ex: Auditório Principal — UniFAP ou Sala 104"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                  <datalist id="rooms-suggestions">
                    <option value="Auditório Principal — UniFAP" />
                    <option value="Auditório de Saúde — UniFAP" />
                    <option value="Laboratório Multimídia" />
                    <option value="Pátio Central" />
                    {rooms.map((r) => (
                      <option key={r.id} value={r.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Limite de Participantes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Capacidade Máxima de Inscritos (Opcional)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={maxParticipants}
                  onChange={(e) =>
                    setMaxParticipants(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="Ilimitado se vazio (Ex: 250)"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 2: TELÃO 4K & REGRAS DE SORTEIO */}
          {/* ========================================================================= */}
          {activeTab === "stage" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Logo Oficial do Evento */}
              <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4 text-[#EAA023]" />
                    <span>Logo Oficial (Exibida no Telão 4K & Palco)</span>
                  </label>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setLogoUrl("");
                        setImgHasError(false);
                      }}
                      className="text-[11px] text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                      <span>Remover Logo</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3.5">
                  {/* Preview Box */}
                  <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-border bg-[#001b2e] flex items-center justify-center p-2 shrink-0 overflow-hidden shadow-xs relative">
                    {logoUrl && !imgHasError ? (
                      <img
                        src={normalizeImageUrl(logoUrl)}
                        alt="Logo"
                        onError={() => setImgHasError(true)}
                        onLoad={() => setImgHasError(false)}
                        className="max-h-full max-w-full object-contain filter drop-shadow-sm"
                      />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <ImageIcon className="h-5 w-5 mx-auto opacity-40 mb-0.5" />
                        <span className="text-[9px] block leading-tight font-medium">
                          {imgHasError ? "Erro no Link" : "Sem Logo"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions & URL Input */}
                  <div className="space-y-2 flex-1">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-muted/80 hover:bg-accent border border-border text-foreground transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Upload className="h-3.5 w-3.5 text-primary" />
                      <span>Carregar Imagem do Computador</span>
                    </button>

                    <input
                      type="text"
                      value={logoUrl}
                      onChange={(e) => {
                        setLogoUrl(e.target.value);
                        setImgHasError(false);
                      }}
                      onBlur={(e) => {
                        setLogoUrl(normalizeImageUrl(e.target.value));
                      }}
                      placeholder="Ou cole link do Google Drive / Web..."
                      className="w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                    />

                    {/* 1-Click Fast Presets for UniFAP */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] font-semibold text-muted-foreground">Logos UniFAP:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setLogoUrl("/brand/logo-unifap-negativa.png");
                          setImgHasError(false);
                        }}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition cursor-pointer"
                      >
                        Logo Negativa (Telão)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLogoUrl("/brand/logo-unifap.png");
                          setImgHasError(false);
                        }}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-muted text-foreground border border-border hover:bg-accent transition cursor-pointer"
                      >
                        Logo Padrão
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Regra de Sorteio */}
              <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Trophy className="h-4 w-4 text-[#EAA023]" />
                  <span>Regra de Sorteio & Ganhadores</span>
                </span>

                <label className="flex items-center gap-3 p-2.5 rounded-xl bg-background/60 border border-border/60 cursor-pointer hover:bg-background/90 transition-all">
                  <input
                    type="checkbox"
                    checked={allowRepeatWinners}
                    onChange={(e) => setAllowRepeatWinners(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <div className="text-xs">
                    <p className="font-semibold text-foreground">
                      Permitir que a mesma pessoa ganhe mais de um prêmio
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Se desmarcado, quem for contemplado é excluído automaticamente dos próximos sorteios deste evento.
                    </p>
                  </div>
                </label>
              </div>

              {/* Personalização Visual do Telão */}
              <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-3">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Palette className="h-4 w-4 text-primary" />
                  <span>Cores Temáticas do Telão da Roleta</span>
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground block">
                      Cor Primária (Fundo & Acentos)
                    </label>
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-background border border-border">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="h-6 w-6 rounded-lg cursor-pointer border-0 bg-transparent"
                      />
                      <span className="text-xs font-mono font-bold text-foreground">{primaryColor}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground block">
                      Cor Secundária (Destaques & Ouro)
                    </label>
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-background border border-border">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="h-6 w-6 rounded-lg cursor-pointer border-0 bg-transparent"
                      />
                      <span className="text-xs font-mono font-bold text-foreground">{secondaryColor}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer de Ações */}
          <div className="flex items-center justify-between pt-3 border-t border-border/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
