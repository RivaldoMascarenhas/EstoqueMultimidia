"use client";

import React, { useState, useEffect } from "react";
import { 
  MessageSquare, 
  Copy, 
  ExternalLink, 
  Check, 
  X, 
  Send,
  Phone,
  Tag,
  Wrench
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils";

interface MaintenanceWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  maintenance: any | null;
}

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

export function MaintenanceWhatsAppModal({
  isOpen,
  onClose,
  maintenance,
}: MaintenanceWhatsAppModalProps) {
  const [copied, setCopied] = useState(false);
  const [recipientPhone, setRecipientPhone] = useState(
    maintenance?.contactPhone || ""
  );

  useEffect(() => {
    if (maintenance?.contactPhone) {
      setRecipientPhone(maintenance.contactPhone);
    }
  }, [maintenance]);

  if (!maintenance) return null;

  const orderNum = maintenance.orderNumber || `#OS-${maintenance.id.slice(0, 8)}`;
  const isCompleted = maintenance.status === "COMPLETED";

  const generateMessage = () => {
    const isInternal = maintenance.maintenanceType === "INTERNAL" || maintenance.maintenanceType === "PREVENTIVE";
    const typeTitle = maintenance.maintenanceType === "EXTERNAL" 
      ? "🏢 *ASSISTÊNCIA TÉCNICA EXTERNA*"
      : maintenance.maintenanceType === "PREVENTIVE"
      ? "🛡️ *MANUTENÇÃO PREVENTIVA*"
      : "🛠️ *MANUTENÇÃO INTERNA (BANCADA TI)*";

    const statusText = isCompleted
      ? "✅ *CONCLUÍDO & REINTEGRADO AO ARMÁRIO*"
      : maintenance.status === "IN_PROGRESS"
      ? "🛠️ *EM ANDAMENTO NA BANCADA / OFICINA*"
      : "⏳ *PENDENTE / AGUARDANDO AVALIAÇÃO*";

    const parts = [
      `*UniFAP - Atualização de Ordem de Serviço* 🛠️`,
      `----------------------------------------`,
      `*Ordem de Serviço:* \`${orderNum}\``,
      `*Tipo:* ${typeTitle}`,
      `*Status:* ${statusText}`,
      `*Equipamento:* ${maintenance.asset?.item?.name || "Equipamento"} ${maintenance.asset?.model ? `(${maintenance.asset.model})` : ""}`,
      `*Patrimônio:* #${maintenance.asset?.assetTag}`,
      maintenance.asset?.serialNumber ? `*Nº de Série:* ${maintenance.asset.serialNumber}` : null,
      `*Defeito Informado:* ${maintenance.issueDescription}`,
      maintenance.maintenanceType === "EXTERNAL" && maintenance.serviceProvider ? `*Prestador:* ${maintenance.serviceProvider}` : null,
      isInternal ? `*Local:* Laboratório de Suporte TI UniFAP` : null,
      maintenance.diagnosis ? `*Diagnóstico:* ${maintenance.diagnosis}` : null,
      maintenance.solution ? `*Solução Técnica:* ${maintenance.solution}` : null,
      maintenance.replacedParts ? `*Peças Substituídas:* ${maintenance.replacedParts}` : null,
      maintenance.lampHours !== null && maintenance.lampHours !== undefined ? `*Horímetro Lâmpada:* ${maintenance.lampHours}h` : null,
      isCompleted && maintenance.asset?.currentBox ? `*Localização Atual:* Armário TI - ${maintenance.asset.currentBox.door?.name || "Porta"} / ${maintenance.asset.currentBox.name} (${maintenance.asset.currentBox.code})` : null,
      maintenance.cost ? `*Custo Total:* R$ ${Number(maintenance.cost).toFixed(2)}` : null,
      `----------------------------------------`,
      `_Setor de Suporte de TI & Multimídia - Centro Universitário Paraíso (UniFAP)_`,
    ].filter(Boolean);

    return parts.join("\n");
  };

  const messageText = generateMessage();

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    toast.success("Mensagem copiada para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    let cleanPhone = recipientPhone.replace(/\D/g, "");
    if (cleanPhone && !cleanPhone.startsWith("55") && cleanPhone.length >= 10) {
      cleanPhone = `55${cleanPhone}`;
    }

    const encodedText = encodeURIComponent(messageText);
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;

    window.open(url, "_blank");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent hideClose className="max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl bg-card border-border shadow-2xl gap-0">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/80 flex items-center justify-between bg-emerald-500/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                Notificação WhatsApp
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Envio de status de OS para técnico, solicitante ou coordenação
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
          
          {/* Campo Telefone */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-emerald-500" />
              Número de WhatsApp (com DDD)
            </label>
            <Input
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              placeholder="Ex: (88) 99999-9999 (Opcional)"
              className="h-11 rounded-xl text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Se deixar em branco, o WhatsApp abrirá para você escolher o contato da lista.
            </p>
          </div>

          {/* Preview da Mensagem */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">
                Prévia da Mensagem Formatada
              </label>
              <Badge variant="outline" className="text-xs font-mono">
                {orderNum}
              </Badge>
            </div>

            <div className="p-3.5 rounded-2xl bg-accent/40 border border-border/80 text-xs font-mono text-foreground whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
              {messageText}
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="px-6 py-4 bg-muted/20 border-t border-border/80 flex items-center justify-between gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleCopy}
            className="gap-2 rounded-xl text-xs h-10 cursor-pointer"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? "Copiado!" : "Copiar Texto"}</span>
          </Button>

          <Button
            type="button"
            onClick={handleOpenWhatsApp}
            className="gap-2 rounded-xl text-xs h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md shadow-emerald-500/20 cursor-pointer"
          >
            <Send className="h-4 w-4" />
            <span>Enviar no WhatsApp</span>
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
