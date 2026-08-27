"use client";

import React, { useState } from "react";
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
  Smartphone,
  Image as ImageIcon,
  Gift,
  User,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

export interface WinnerItem {
  id?: string;
  drawId?: string;
  drawnNumber?: number;
  drawnName?: string;
  draw?: {
    drawnNumber?: number;
  };
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
  const [activeTab, setActiveTab] = useState<"whatsapp" | "visual">(
    singleWinner ? "whatsapp" : "visual"
  );
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const displayWinners = singleWinner ? [singleWinner] : winners;

  // Format Date String helper
  const formattedDate = (() => {
    if (!eventDate) return "";
    if (typeof eventDate === "string" && eventDate.includes("-")) {
      return eventDate.split("T")[0].split("-").reverse().join("/");
    }
    return new Date(eventDate).toLocaleDateString("pt-BR");
  })();

  // 1. Template para Ganhador Individual (Notificação Direta)
  const generateIndividualWhatsAppText = (w: WinnerItem) => {
    const sponsorName = w.prize.sponsor?.name || "UniFAP (Institucional)";

    let text = `🎓 *CENTRO UNIVERSITÁRIO PARAÍSO — UNIFAP*\n`;
    text += `🎉 *PARABÉNS! VOCÊ FOI CONTEMPLADO NO SORTEIO!* 🏆\n\n`;
    text += `Olá, *${w.person.name}*!\n`;
    text += `Temos uma excelente notícia para você:\n\n`;
    text += `📍 *Evento:* ${eventName}\n`;
    text += `🎁 *Prêmio Conquistado:* ${w.prize.name}\n`;
    text += `🤝 *Oferecimento:* ${sponsorName}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📍 *Como retirar seu prêmio:*\n`;
    text += `Apresente seu documento com foto ou comprovante de matrícula na coordenação/palco do evento para retirar seu brinde.\n\n`;
    text += `✨ *Parabéns pela sua conquista!*\n`;
    text += `🌐 _Sistema Institucional UniFAP Sorteios • unifapce.edu.br_`;

    return text;
  };

  // 2. Template Oficial Geral (Relação Completa dos Ganhadores)
  const generateBulkWhatsAppText = () => {
    let text = `🎓 *CENTRO UNIVERSITÁRIO PARAÍSO — UNIFAP*\n`;
    text += `🏆 *RESULTADOS OFICIAIS DOS SORTEIOS*\n\n`;
    text += `📍 *Evento:* ${eventName}\n`;
    if (formattedDate) {
      text += `📅 *Data:* ${formattedDate}\n`;
    }
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `🎉 *RELAÇÃO DOS GANHADORES:*\n\n`;

    if (winners.length === 0) {
      text += `Nenhum sorteio foi realizado ainda para este evento.\n\n`;
    } else {
      winners.forEach((w, idx) => {
        const ticketNum = w.drawnNumber || w.draw?.drawnNumber || idx + 1;
        const numStr = String(ticketNum).padStart(3, "0");
        const sponsorName = w.prize.sponsor?.name || "UniFAP (Institucional)";

        text += `🎟️ *Bilhete #${numStr}* — ${w.person.name}\n`;
        text += `🎁 *Prêmio:* ${w.prize.name}\n`;
        text += `🤝 *Parceria:* ${sponsorName}\n\n`;
      });
    }

    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `✨ *Parabéns a todos os contemplados!*\n`;
    text += `🌐 _Sistema Institucional UniFAP Sorteios • unifapce.edu.br_`;

    return text;
  };

  const fullText = singleWinner
    ? generateIndividualWhatsAppText(singleWinner)
    : generateBulkWhatsAppText();

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

  // Helper to load image for canvas
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });
  };

  // Generate Canvas PNG Card
  const downloadCardImage = async () => {
    setIsGeneratingImage(true);
    try {
      const width = 1080;
      const rowHeight = 110;
      const headerHeight = 360;
      const footerHeight = 130;
      const listCount = Math.max(displayWinners.length, 1);
      const height = headerHeight + listCount * rowHeight + footerHeight;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      // 1. Background Gradient
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, "#001322");
      bgGrad.addColorStop(0.3, "#002B49");
      bgGrad.addColorStop(0.7, "#001F35");
      bgGrad.addColorStop(1, "#000F1B");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Gold Double Border
      ctx.strokeStyle = "#EAA023";
      ctx.lineWidth = 8;
      ctx.strokeRect(24, 24, width - 48, height - 48);

      ctx.strokeStyle = "rgba(234, 160, 35, 0.4)";
      ctx.lineWidth = 2;
      ctx.strokeRect(36, 36, width - 72, height - 72);

      // 2. Load and draw UniFAP Logo
      try {
        const logoImg = await loadImage("/brand/logo-unifap-negativa.png");
        const logoAspect = logoImg.width / logoImg.height;
        const logoHeight = 65;
        const logoWidth = logoHeight * logoAspect;
        ctx.drawImage(logoImg, (width - logoWidth) / 2, 60, logoWidth, logoHeight);
      } catch {
        // Fallback text if logo fails to load
        ctx.fillStyle = "#EAA023";
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("CENTRO UNIVERSITÁRIO PARAÍSO — UNIFAP", width / 2, 85);
      }

      // Title & Subtitles
      ctx.textAlign = "center";
      ctx.fillStyle = "#EAA023";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("SETOR DE TI & MULTIMÍDIA", width / 2, 160);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "900 40px sans-serif";
      ctx.fillText("🏆 RESULTADOS OFICIAIS DOS SORTEIOS", width / 2, 215);

      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.font = "600 22px sans-serif";
      const dateStr = eventDate
        ? ` • ${new Date(eventDate).toLocaleDateString("pt-BR")}`
        : "";
      ctx.fillText(`Evento: ${eventName}${dateStr}`, width / 2, 260);

      // Separator Line
      ctx.strokeStyle = "rgba(234, 160, 35, 0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(80, 295);
      ctx.lineTo(width - 80, 295);
      ctx.stroke();

      // 3. Winners Rows
      let startY = headerHeight;
      if (displayWinners.length === 0) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.font = "italic 24px sans-serif";
        ctx.fillText("Nenhum sorteio registrado ainda.", width / 2, startY + 50);
      } else {
        displayWinners.forEach((w, idx) => {
          const y = startY + idx * rowHeight;

          // Row Card Background (Glassmorphism effect)
          ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
          ctx.beginPath();
          ctx.roundRect(80, y - 45, width - 160, 92, 16);
          ctx.fill();

          ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Left: Gold Position Badge (#1, #2)
          ctx.fillStyle = "#EAA023";
          ctx.beginPath();
          ctx.roundRect(100, y - 28, 56, 56, 12);
          ctx.fill();

          ctx.fillStyle = "#001B2E";
          ctx.font = "900 24px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`#${idx + 1}`, 128, y + 8);

          // Winner Details (Two-line layout to avoid collisions)
          ctx.textAlign = "left";

          // Line 1: Winner Full Name
          ctx.fillStyle = "#FFFFFF";
          ctx.font = "bold 24px sans-serif";
          const maxNameLen = 30;
          const trimmedName =
            w.person.name.length > maxNameLen
              ? w.person.name.substring(0, maxNameLen) + "..."
              : w.person.name;
          ctx.fillText(trimmedName, 175, y - 4);

          // Line 2: Registration & Category
          ctx.fillStyle = "#94a3b8"; // Slate 400
          ctx.font = "16px sans-serif";
          const regStr = w.person.registration ? `Matrícula: ${w.person.registration}` : "";
          const catStr = w.person.category ? ` • ${w.person.category}` : "";
          ctx.fillText(`${regStr}${catStr}` || "Participante do Evento", 175, y + 24);

          // Right: Prize Pill Box
          const prizeName =
            w.prize.name.length > 22
              ? w.prize.name.substring(0, 22) + "..."
              : w.prize.name;

          ctx.fillStyle = "rgba(234, 160, 35, 0.18)";
          ctx.beginPath();
          ctx.roundRect(width - 440, y - 28, 340, 56, 14);
          ctx.fill();

          ctx.strokeStyle = "rgba(234, 160, 35, 0.4)";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = "#FBBF24"; // Amber 400
          ctx.font = "bold 18px sans-serif";
          ctx.textAlign = "left";
          ctx.fillText(`🎁 ${prizeName}`, width - 420, y + 7);
        });
      }

      // 4. Footer
      const footerY = height - 55;
      ctx.fillStyle = "#EAA023";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        "CENTRO UNIVERSITÁRIO PARAÍSO • SISTEMA DE GESTÃO & SORTEIOS DE EVENTOS",
        width / 2,
        footerY
      );

      // Download Trigger
      const link = document.createElement("a");
      link.download = `Ganhadores_${eventName.replace(/\s+/g, "_")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast.success("Cartão dos Ganhadores baixado com sucesso em alta resolução (.PNG)!");
    } catch (err: any) {
      toast.error("Erro ao gerar imagem do cartão.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-card border-border p-0 overflow-hidden shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-5 border-b border-border/80 bg-muted/20">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Compartilhar Ganhadores & Divulgação
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Gere o cartão oficial com layout corrigido e logo UniFAP para redes sociais ou envie o texto no WhatsApp.
          </DialogDescription>

          {/* Sub Navigation */}
          <div className="flex items-center gap-2 pt-3">
            <button
              type="button"
              onClick={() => setActiveTab("visual")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "visual"
                  ? "bg-primary text-white shadow-xs"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Cartão Visual PNG (Com Logo UniFAP)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("whatsapp")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "whatsapp"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Texto WhatsApp (Lista Oficial)</span>
            </button>
          </div>
        </DialogHeader>

        {/* TAB 1: VISUAL CARD PNG (Preview) */}
        {activeTab === "visual" && (
          <div className="p-5 space-y-4">
            {/* Live Visual Card Preview */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-[#001322] via-[#002B49] to-[#001524] border-2 border-amber-500 text-white shadow-2xl space-y-5">
              {/* Header with official logo */}
              <div className="flex flex-col items-center text-center space-y-2">
                <img
                  src="/brand/logo-unifap-negativa.png"
                  alt="UniFAP"
                  className="h-10 w-auto object-contain drop-shadow-md"
                />
                <span className="text-[10px] font-bold tracking-widest text-amber-400 uppercase">
                  SETOR DE TI & MULTIMÍDIA
                </span>
                <h4 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                  🏆 RESULTADOS OFICIAIS DOS SORTEIOS
                </h4>
                <p className="text-xs text-slate-300 font-medium">
                  Evento: <strong className="text-white">{eventName}</strong>
                  {eventDate && ` • ${new Date(eventDate).toLocaleDateString("pt-BR")}`}
                </p>
                <div className="w-full h-px bg-amber-500/30 my-2" />
              </div>

              {/* Winners List Preview (Clean 2-line layout without overlapping) */}
              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {displayWinners.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 italic">
                    Nenhum sorteio foi realizado ainda para este evento.
                  </div>
                ) : (
                  displayWinners.map((w, idx) => (
                    <div
                      key={w.id || idx}
                      className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Position Badge */}
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-sm shadow-md">
                          #{idx + 1}
                        </div>

                        {/* Person details */}
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">
                            {w.person.name}
                          </p>
                          <p className="text-[11px] text-slate-300 truncate">
                            {w.person.registration && `Matrícula: ${w.person.registration}`}
                            {w.person.registration && w.person.category && " • "}
                            {w.person.category}
                          </p>
                        </div>
                      </div>

                      {/* Prize Chip */}
                      <div className="flex-shrink-0 px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-xs">
                        <Gift className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate max-w-[150px]">{w.prize.name}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-2 border-t border-amber-500/30 text-center">
                <span className="text-[10px] font-bold tracking-wider text-amber-400 uppercase">
                  CENTRO UNIVERSITÁRIO PARAÍSO • SISTEMA DE GESTÃO & SORTEIOS
                </span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/80">
              <span className="text-xs text-muted-foreground">
                <strong>{displayWinners.length}</strong> sorteio(s) realizado(s).
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent rounded-xl cursor-pointer"
                >
                  Fechar
                </button>

                <button
                  type="button"
                  onClick={downloadCardImage}
                  disabled={isGeneratingImage}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-orange-500 rounded-xl shadow-lg transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Cartão dos Ganhadores (.PNG)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: WHATSAPP BULK */}
        {activeTab === "whatsapp" && (
          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Prévia da Mensagem Formatada para WhatsApp:
              </label>
              <textarea
                readOnly
                rows={9}
                value={fullText}
                className="w-full rounded-2xl border border-border bg-muted/20 p-3 text-xs font-mono text-foreground focus:outline-none resize-none leading-relaxed"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/80">
              <span className="text-xs text-muted-foreground">
                <strong>{displayWinners.length}</strong> ganhador(es) na lista.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyText(fullText)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border border-border bg-card hover:bg-accent text-foreground transition shadow-xs cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Mensagem</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenWhatsApp(fullText, singleWinner?.person?.phone)}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-md cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>{singleWinner?.person?.phone ? "Enviar Mensagem no WhatsApp" : "Abrir no WhatsApp"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
