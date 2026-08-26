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
} from "lucide-react";
import { normalizeImageUrl } from "@/lib/formatImageUrl";
import { toast } from "sonner";

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

  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setLogoUrl("");
      setCoverUrl("");
      setAllowRepeatWinners(false);
      setMaxParticipants("");
    }
  }, [event, isOpen]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLogoUrl(reader.result as string);
      toast.success("Logo carregada com sucesso!");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nome do evento é obrigatório.");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = isEditing
        ? `/api/v1/events/${event.id}`
        : "/api/v1/events";
      const method = isEditing ? "PATCH" : "POST";

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
          logoUrl: normalizeImageUrl(logoUrl).trim() || null,
          coverUrl: normalizeImageUrl(coverUrl).trim() || null,
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
      <DialogContent className="max-w-xl bg-card border-border p-0 overflow-hidden">
        <DialogHeader className="p-5 border-b border-border/80 bg-muted/20">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {isEditing ? "Editar Evento" : "Novo Evento Institucional"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure informações, logo oficial, local, data e regras de sorteio do evento.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* 1. Basic Info */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">
              Nome do Evento *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Semana Acadêmica de Tecnologia 2026"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">
              Descrição / Resumo
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do evento, palestras ou atividades..."
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none resize-none"
            />
          </div>

          {/* 2. Logo do Evento (Alta Resolução) */}
          <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-[#EAA023]" />
                <span>Logo Oficial do Evento (Exibida no Telão 4K & Palco)</span>
              </label>
              {logoUrl && (
                <button
                  type="button"
                  onClick={() => setLogoUrl("")}
                  className="text-[11px] text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  <span>Remover Logo</span>
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Preview Area */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 border-dashed border-border bg-background/80 flex items-center justify-center p-2 shrink-0 shadow-xs relative overflow-hidden group">
                {logoUrl ? (
                  <img
                    src={normalizeImageUrl(logoUrl)}
                    alt="Logo do Evento"
                    className="max-h-full max-w-full object-contain filter drop-shadow-sm"
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
                  <div className="text-center p-2 text-muted-foreground">
                    <ImageIcon className="h-6 w-6 mx-auto mb-1 opacity-40" />
                    <span className="text-[10px] block leading-tight font-medium">Sem Logo</span>
                  </div>
                )}
              </div>

              {/* Upload and URL input */}
              <div className="space-y-2 flex-1 w-full">
                <div className="flex items-center gap-2">
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
                    className="flex-1 px-3 py-2 text-xs font-bold rounded-xl bg-muted/80 hover:bg-accent border border-border text-foreground transition flex items-center justify-center gap-1.5"
                  >
                    <Upload className="h-3.5 w-3.5 text-primary" />
                    <span>Carregar Arquivo (PNG / JPG)</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(normalizeImageUrl(e.target.value))}
                    placeholder="Ou cole o link do Google Drive / Web..."
                    className="flex-1 rounded-xl border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Suporta links de compartilhamento do Google Drive, Dropbox, ou arquivos do computador.
                </p>
              </div>
            </div>
          </div>

          {/* 3. Date, Time, Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                Data
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Horário
              </label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="Ex: 19:00"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              Local / Sala
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Auditório Principal, Bloco B"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Status do Evento
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                <option value="DRAFT">Rascunho</option>
                <option value="OPEN">Aberto (Presença Ativa)</option>
                <option value="IN_PROGRESS">Em Andamento</option>
                <option value="COMPLETED">Encerrado</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                Capacidade Máxima
              </label>
              <input
                type="number"
                min={1}
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Sem limite"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Rules and Customization */}
          <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Regras & Personalização Visual
            </span>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={allowRepeatWinners}
                onChange={(e) => setAllowRepeatWinners(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-xs font-medium text-foreground">
                Permitir que a mesma pessoa ganhe mais de um prêmio
              </span>
            </label>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Cor Primária
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-7 w-8 rounded cursor-pointer border-0 bg-transparent p-0"
                  />
                  <span className="text-xs font-mono">{primaryColor}</span>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Cor Secundária
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="h-7 w-8 rounded cursor-pointer border-0 bg-transparent p-0"
                  />
                  <span className="text-xs font-mono">{secondaryColor}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md transition-colors disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isEditing ? "Salvar Alterações" : "Criar Evento"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
