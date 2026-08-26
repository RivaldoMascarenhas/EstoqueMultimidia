"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Gift, DollarSign, Layers, Save, Loader2, Building2, Plus, Image as ImageIcon, Upload, X } from "lucide-react";
import { SponsorFormModal } from "@/components/events/SponsorFormModal";
import { normalizeImageUrl } from "@/lib/formatImageUrl";
import { toast } from "sonner";

interface PrizeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  prize?: any | null;
  onSuccess?: () => void;
}

export function PrizeFormModal({
  isOpen,
  onClose,
  eventId,
  prize,
  onSuccess,
}: PrizeFormModalProps) {
  const isEditing = !!prize;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sponsorId, setSponsorId] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [estimatedValue, setEstimatedValue] = useState<number | "">("");
  const [order, setOrder] = useState(0);
  const [status, setStatus] = useState("AVAILABLE");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Sponsor state
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [isSponsorModalOpen, setIsSponsorModalOpen] = useState(false);

  const fetchSponsors = async () => {
    try {
      const res = await fetch("/api/v1/sponsors");
      const data = await res.json();
      if (data.success) {
        setSponsors(data.sponsors || []);
      }
    } catch {
      // Graceful fallback
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSponsors();
    }
  }, [isOpen]);

  useEffect(() => {
    if (prize) {
      setName(prize.name || "");
      setDescription(prize.description || "");
      setImageUrl(prize.imageUrl || "");
      setSponsorId(prize.sponsorId || prize.sponsor?.id || "");
      setQuantity(prize.quantity || 1);
      setEstimatedValue(prize.estimatedValue !== null ? Number(prize.estimatedValue) : "");
      setOrder(prize.order || 0);
      setStatus(prize.status || "AVAILABLE");
    } else {
      setName("");
      setDescription("");
      setImageUrl("");
      setSponsorId("");
      setQuantity(1);
      setEstimatedValue("");
      setOrder(0);
      setStatus("AVAILABLE");
    }
  }, [prize, isOpen]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result as string);
      toast.success("Foto do prêmio carregada com sucesso!");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nome do prêmio é obrigatório.");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = isEditing
        ? `/api/v1/events/${eventId}/prizes/${prize.id}`
        : `/api/v1/events/${eventId}/prizes`;

      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          imageUrl: normalizeImageUrl(imageUrl).trim() || null,
          sponsorId: sponsorId || null,
          quantity: Number(quantity) || 1,
          estimatedValue: estimatedValue !== "" ? Number(estimatedValue) : null,
          order: Number(order) || 0,
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao salvar prêmio.");
      }

      toast.success(isEditing ? "Prêmio atualizado com sucesso!" : "Prêmio cadastrado com sucesso!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedSponsor = sponsors.find((s) => s.id === sponsorId);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-md bg-card border-border p-0 overflow-hidden">
          <DialogHeader className="p-5 border-b border-border/80 bg-muted/20">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              {isEditing ? "Editar Prêmio" : "Cadastrar Novo Prêmio"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cadastre os itens que serão sorteados e vincule seus respectivos patrocinadores.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
            {/* Nome do Prêmio */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Nome do Prêmio *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Notebook Dell Inspiron 15"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            {/* Patrocinador e Logo */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Patrocinador / Parceiro
                </label>
                <button
                  type="button"
                  onClick={() => setIsSponsorModalOpen(true)}
                  className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Novo Patrocinador
                </button>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={sponsorId}
                  onChange={(e) => setSponsorId(e.target.value)}
                  className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="">UniFAP (Institucional / Sem Patrocinador)</option>
                  {sponsors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                {selectedSponsor?.logoUrl && (
                  <div className="w-9 h-9 rounded-xl border border-border bg-muted/40 p-1 flex items-center justify-center shrink-0">
                    <img
                      src={selectedSponsor.logoUrl}
                      alt={selectedSponsor.name}
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => ((e.target as HTMLElement).style.display = "none")}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Imagem do Prêmio (Opcional) */}
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Foto / Imagem do Prêmio (Opcional)</span>
                </label>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="text-[10px] text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1"
                  >
                    <X className="h-3 w-3" />
                    <span>Remover Imagem</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Thumbnail Preview */}
                {imageUrl && (
                  <div className="w-14 h-14 rounded-xl border border-border bg-background p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                    <img
                      src={normalizeImageUrl(imageUrl)}
                      alt="Preview"
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => ((e.target as HTMLElement).style.display = "none")}
                    />
                  </div>
                )}

                <div className="flex-1 space-y-1.5">
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
                      className="px-3 py-1.5 text-xs font-bold rounded-xl bg-card hover:bg-accent border border-border text-foreground transition flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Upload className="h-3 w-3 text-primary" />
                      <span>Carregar Imagem (PNG/JPG)</span>
                    </button>
                  </div>

                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(normalizeImageUrl(e.target.value))}
                    placeholder="Ou cole o link (Google Drive, Imgur, Web)..."
                    className="w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Descrição / Especificações
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Processador Intel i5, 16GB RAM, SSD 512GB..."
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
                  <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                  Quantidade
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                  Valor Estimado (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Ex: 3500.00"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                <option value="AVAILABLE">Disponível para Sorteio</option>
                <option value="DRAWN">Já Sorteado</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
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
                Salvar Prêmio
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal para Adicionar Novo Patrocinador em Tempo Real */}
      <SponsorFormModal
        isOpen={isSponsorModalOpen}
        onClose={() => setIsSponsorModalOpen(false)}
        onSuccess={(newSponsor) => {
          fetchSponsors();
          if (newSponsor?.id) {
            setSponsorId(newSponsor.id);
          }
        }}
      />
    </>
  );
}
