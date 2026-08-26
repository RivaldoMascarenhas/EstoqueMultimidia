"use client";

import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Share2,
  Copy,
  Download,
  CheckCircle2,
  Trophy,
  Sparkles,
  MessageSquare,
  FileSpreadsheet,
  Calendar,
  Gift,
  ExternalLink,
  Smartphone,
  Layers,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

export interface WinnerItem {
  id?: string;
  drawId?: string;
  drawDate?: string | Date;
  person: {
    id?: string;
    name: string;
    registration?: string | null;
    category?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  prize: {
    name: string;
    description?: string | null;
    sponsor?: {
      name: string;
      logoUrl?: string | null;
    } | null;
  };
}

interface WinnerShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventName: string;
  eventDate?: Date | string | null;
  winners: WinnerItem[];
  singleWinner?: WinnerItem | null;
}

export function WinnerShareModal({
  isOpen,
  onClose,
  eventName,
  eventDate,
  winners,
  singleWinner,
}: WinnerShareModalProps) {
  const [activeTab, setActiveTab] = useState<"whatsapp" | "visual" | "single">("whatsapp");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const displayWinners = singleWinner ? [singleWinner] : winners;

  // Generate WhatsApp Bulk Text
  const generateWhatsAppText = () => {
    let text = `🎓 *CENTRO UNIVERSITÁRIO PARAÍSO — UNIFAP*\n`;
    text += `🏆 *RESULTADOS OFICIAIS DOS SORTEIOS*\n\n`;
    text += `📍 *Evento:* ${eventName}\n`;
    if (eventDate) {
      text += `📅 *Data:* ${new Date(eventDate).toLocaleDateString("pt-BR")}\n`;
    }
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `🎉 *RELAÇÃO DOS CONTEMPLADOS:*\n\n`;

    if (winners.length === 0) {
      text += `Nenhum sorteio foi realizado ainda para este evento.\n\n`;
    } else {
      winners.forEach((w, idx) => {
        const reg = w.person.registration ? ` (${w.person.registration})` : "";
        const cat = w.person.category ? ` • _${w.person.category}_` : "";
        const sponsor = w.prize.sponsor?.name ? ` | 🤝 Parceria: ${w.prize.sponsor.name}` : "";

        text += `🎁 *${idx + 1}º Prêmio:* ${w.prize.name}${sponsor}\n`;
        text += `👤 *Ganhador(a):* ${w.person.name}${reg}${cat}\n\n`;
      });
    }

    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `✨ *Parabéns a todos os contemplados!*\n`;
    text += `📍 _Favor apresentar documento com foto para retirada do brinde._\n`;
    text += `🌐 _Sistema Integrado UniFAP • unifapce.edu.br_`;

    return text;
  };

  // Generate WhatsApp Single Winner Text
  const generateSingleWinnerWhatsAppText = (w: WinnerItem) => {
    let text = `🎉 *PARABÉNS, ${w.person.name.toUpperCase()}!*\n\n`;
    text += `Você foi contemplado(a) no sorteio oficial do evento *${eventName}*!\n\n`;
    text += `🎁 *Seu Prêmio:* ${w.prize.name}\n`;
    if (w.prize.sponsor?.name) {
      text += `🤝 *Oferecimento:* ${w.prize.sponsor.name}\n`;
    }
    if (w.person.registration) {
      text += `🆔 *Matrícula:* ${w.person.registration}\n`;
    }
    text += `\n📍 *Instruções de Retirada:* Dirija-se à mesa da organização / Coordenação Multimídia com um documento de identificação com foto para receber seu prêmio.\n\n`;
    text += `✨ *UniFAP — Centro Universitário Paraíso*`;
    return text;
  };

  const fullText = generateWhatsAppText();

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Texto copiado para a área de transferência!");
  };

  const handleOpenWhatsApp = (text: string, phone?: string | null) => {
    let cleanPhone = phone ? phone.replace(/\D/g, "") : "";
    if (cleanPhone && cleanPhone.length <= 11) {
      cleanPhone = `55${cleanPhone}`;
    }
    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  // Generate Canvas PNG Card
  const downloadCardImage = () => {
    setIsGeneratingImage(true);
    try {
      const width = 1080;
      const rowHeight = 90;
      const headerHeight = 320;
      const footerHeight = 120;
      const listCount = Math.max(winners.length, 1);
      const height = headerHeight + listCount * rowHeight + footerHeight;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      // 1. Background
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, "#001B2E");
      bgGrad.addColorStop(0.5, "#002B49");
      bgGrad.addColorStop(1, "#001524");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Gold Border Accent
      ctx.strokeStyle = "#EAA023";
      ctx.lineWidth = 10;
      ctx.strokeRect(20, 20, width - 40, height - 40);

      // 2. Header
      ctx.fillStyle = "#EAA023";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("CENTRO UNIVERSITÁRIO PARAÍSO — UNIFAP", width / 2, 85);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "900 44px sans-serif";
      ctx.fillText("🏆 RESULTADOS OFICIAIS DOS SORTEIOS", width / 2, 145);

      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      ctx.font = "500 22px sans-serif";
      ctx.fillText(`Evento: ${eventName}`, width / 2, 195);

      // Separator Line
      ctx.strokeStyle = "rgba(234, 160, 35, 0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(80, 240);
      ctx.lineTo(width - 80, 240);
      ctx.stroke();

      // 3. Winners Rows
      let startY = headerHeight;
      if (winners.length === 0) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.font = "italic 24px sans-serif";
        ctx.fillText("Nenhum sorteio registrado ainda.", width / 2, startY + 40);
      } else {
        winners.forEach((w, idx) => {
          const y = startY + idx * rowHeight;

          // Row Card Background
          ctx.fillStyle = idx % 2 === 0 ? "rgba(255, 255, 255, 0.06)" : "rgba(255, 255, 255, 0.02)";
          ctx.beginPath();
          ctx.roundRect(80, y - 35, width - 160, 70, 16);
          ctx.fill();

          // Gold Index Badge
          ctx.fillStyle = "#EAA023";
          ctx.font = "900 24px monospace";
          ctx.textAlign = "left";
          ctx.fillText(`#${idx + 1}`, 110, y + 10);

          // Winner Name
          ctx.fillStyle = "#FFFFFF";
          ctx.font = "bold 24px sans-serif";
          const maxNameLen = 28;
          const trimmedName =
            w.person.name.length > maxNameLen
              ? w.person.name.substring(0, maxNameLen) + "..."
              : w.person.name;
          ctx.fillText(trimmedName, 180, y + 8);

          // Registration / Category
          ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
          ctx.font = "18px sans-serif";
          const cat = w.person.category ? ` • ${w.person.category}` : "";
          const reg = w.person.registration ? ` (${w.person.registration})` : "";
          ctx.fillText(`${reg}${cat}`, 180 + ctx.measureText(trimmedName).width + 10, y + 8);

          // Prize Name (Right aligned)
          ctx.fillStyle = "#EAA023";
          ctx.font = "bold 20px sans-serif";
          ctx.textAlign = "right";
          const prizeName = w.prize.name.length > 25 ? w.prize.name.substring(0, 25) + "..." : w.prize.name;
          ctx.fillText(`🎁 ${prizeName}`, width - 110, y + 8);
        });
      }

      // 4. Footer
      const footerY = height - 50;
      ctx.fillStyle = "#EAA023";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("UNIFAP MULTIMÍDIA • SISTEMA DE SORTEIOS E EVENTOS", width / 2, footerY);

      // Download
      const link = document.createElement("a");
      link.download = `Ganhadores_${eventName.replace(/\s+/g, "_")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast.success("Cartão dos Ganhadores baixado em alta resolução (.PNG)!");
    } catch (err: any) {
      toast.error("Erro ao gerar imagem.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-card border-border p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-5 border-b border-border/80 bg-muted/20">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Compartilhar Ganhadores & Divulgação
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Envie a lista de ganhadores no WhatsApp, gere cartões visuais para redes sociais ou notifique contemplados.
          </DialogDescription>

          {/* Sub Navigation */}
          <div className="flex items-center gap-2 pt-3">
            <button
              type="button"
              onClick={() => setActiveTab("whatsapp")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "whatsapp"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Texto WhatsApp (Lista Oficial)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("visual")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "visual"
                  ? "bg-primary text-white shadow-xs"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Cartão Visual PNG (Redes Sociais)</span>
            </button>
          </div>
        </DialogHeader>

        {/* TAB 1: WHATSAPP BULK */}
        {activeTab === "whatsapp" && (
          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Prévia da Mensagem Formatada para WhatsApp:
              </label>
              <textarea
                readOnly
                rows={10}
                value={fullText}
                className="w-full rounded-2xl border border-border bg-muted/20 p-3 text-xs font-mono text-foreground focus:outline-none resize-none leading-relaxed"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/80">
              <span className="text-xs text-muted-foreground">
                <strong>{winners.length}</strong> ganhador(es) na lista.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyText(fullText)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border border-border bg-card hover:bg-accent text-foreground transition shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Mensagem</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenWhatsApp(fullText)}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-md"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Abrir no WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: VISUAL CARD PNG */}
        {activeTab === "visual" && (
          <div className="p-5 space-y-4 text-center">
            <div className="p-6 rounded-3xl bg-gradient-to-br from-[#001B2E] to-[#002B49] border-2 border-amber-500/50 text-white space-y-3 shadow-xl">
              <span className="text-[11px] font-black tracking-widest text-amber-400 uppercase">
                CENTRO UNIVERSITÁRIO PARAÍSO — UNIFAP
              </span>
              <h4 className="text-xl font-black text-white">🏆 RESULTADOS OFICIAIS DOS SORTEIOS</h4>
              <p className="text-xs text-slate-300 font-medium">Evento: {eventName}</p>

              <div className="py-2">
                <span className="px-4 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold border border-amber-400/20">
                  {winners.length} Sorteios Realizados
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Gere um cartão oficial em alta resolução (1080px) com todos os ganhadores, ideal para postar no Instagram, Stories e grupos.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/80">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent rounded-xl"
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={downloadCardImage}
                disabled={isGeneratingImage}
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-orange-500 rounded-xl shadow-lg transition"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Cartão dos Ganhadores (.PNG)</span>
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
