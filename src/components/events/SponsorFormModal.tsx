"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Building2,
  Image as ImageIcon,
  Globe,
  Instagram,
  Phone,
  Mail,
  FileText,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { normalizeImageUrl } from "@/lib/formatImageUrl";
import { toast } from "sonner";

interface SponsorFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  sponsor?: any | null;
  onSuccess?: (newSponsor?: any) => void;
}

export function SponsorFormModal({
  isOpen,
  onClose,
  sponsor,
  onSuccess,
}: SponsorFormModalProps) {
  const isEditing = Boolean(sponsor?.id);
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sponsor) {
      setName(sponsor.name || "");
      setLogoUrl(sponsor.logoUrl || "");
      setDescription(sponsor.description || "");
      setWebsite(sponsor.website || "");
      setInstagram(sponsor.instagram || "");
      setPhone(sponsor.phone || "");
      setEmail(sponsor.email || "");
      setNotes(sponsor.notes || "");
    } else {
      setName("");
      setLogoUrl("");
      setDescription("");
      setWebsite("");
      setInstagram("");
      setPhone("");
      setEmail("");
      setNotes("");
    }
  }, [sponsor, isOpen]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("A logo deve ter no máximo 2MB.");
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
      toast.error("Informe o nome do patrocinador.");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = isEditing ? `/api/v1/sponsors/${sponsor.id}` : "/api/v1/sponsors";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          logoUrl: normalizeImageUrl(logoUrl).trim() || null,
          description: description.trim() || null,
          website: website.trim() || null,
          instagram: instagram.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao salvar patrocinador.");
      }

      toast.success(
        isEditing
          ? "Patrocinador atualizado com sucesso!"
          : "Patrocinador cadastrado com sucesso!"
      );
      if (onSuccess) onSuccess(data.sponsor);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-card border-border p-0 overflow-hidden">
        <DialogHeader className="p-5 border-b border-border/80 bg-muted/20">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {isEditing ? "Editar Patrocinador" : "Cadastrar Novo Patrocinador"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Cadastre a empresa parceira, sua logo oficial e links para exibição nos telões e palcos de sorteio.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 max-h-[82vh] overflow-y-auto">
          {/* Nome */}
          <div>
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              Nome da Empresa / Parceiro *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Livraria Universitária / Dell Technologies"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {/* Logo URL */}
          <div className="rounded-2xl border border-border/80 bg-muted/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Logo Oficial do Patrocinador</span>
              </label>
              {logoUrl && (
                <button
                  type="button"
                  onClick={() => setLogoUrl("")}
                  className="text-[10px] text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  <span>Remover</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {logoUrl && (
                <div className="w-12 h-12 rounded-xl border border-border bg-white p-1 flex items-center justify-center shrink-0 shadow-xs">
                  <img
                    src={normalizeImageUrl(logoUrl)}
                    alt="Prévia"
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
                    <span>Carregar Arquivo</span>
                  </button>
                </div>

                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(normalizeImageUrl(e.target.value))}
                  placeholder="Ou cole o link (Google Drive, Web)..."
                  className="w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Website & Instagram */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                Website
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://empresa.com.br"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
                <Instagram className="h-3.5 w-3.5 text-muted-foreground" />
                Instagram
              </label>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@empresa"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              Descrição / Cota de Patrocínio
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Patrocinador Master • Doação de 2 Notebooks"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Building2 className="h-4 w-4" />
              )}
              <span>{isEditing ? "Salvar Alterações" : "Cadastrar Patrocinador"}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
