"use client";

import React, { useState } from "react";
import { 
  MessageSquare, 
  Copy, 
  Check, 
  ExternalLink, 
  Phone, 
  User, 
  AlertTriangle, 
  Clock 
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

interface LoanWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: any | null;
}

export function LoanWhatsAppModal({
  isOpen,
  onClose,
  loan,
}: LoanWhatsAppModalProps) {
  const [hasCopied, setHasCopied] = useState(false);

  if (!loan) return null;

  const isOverdue =
    loan.status === "ACTIVE" && new Date(loan.expectedReturnDate) < new Date();

  // Limpar telefone para link wa.me (apenas dígitos)
  const cleanPhone = loan.borrowerPhone ? loan.borrowerPhone.replace(/\D/g, "") : "";
  const phoneForWhatsApp = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

  // Gerar mensagem personalizada
  const generateMessageText = () => {
    const assetName = loan.asset?.item?.name || "Equipamento";
    const assetTag = loan.asset?.assetTag || "";
    const protocol = `LOAN-${loan.id.slice(-8).toUpperCase()}`;
    const returnDateStr = formatDateTime(loan.expectedReturnDate);

    if (isOverdue) {
      return `Olá, ${loan.borrowerName}! Tudo bem? 

Aqui é do Setor de Suporte de TI & Multimídia da UniFAP.

Constatamos em nosso sistema que o empréstimo do equipamento *${assetName}* (Patrimônio *#${assetTag}*, Protocolo: *${protocol}*) estava previsto para devolução em *${returnDateStr}* e encontra-se com o prazo expirado.

Solicitamos a gentileza de comparecer ao setor para realizar a devolução ou, caso necessite estender o período de uso, nos informar para formalizarmos a renovação no sistema.

Contamos com sua colaboração para que outros professores e setores também possam utilizar o equipamento.

Atenciosamente,
*Suporte de TI & Multimídia • UniFAP*`;
    }

    return `Olá, ${loan.borrowerName}! Tudo bem?

Aqui é do Setor de Suporte de TI & Multimídia da UniFAP.

Passando apenas para confirmar os dados do seu empréstimo:
📦 *Equipamento:* ${assetName} (Patrimônio #${assetTag})
📍 *Local de Uso:* ${loan.destination}
⏰ *Devolução Prevista:* ${returnDateStr}
📄 *Protocolo:* ${protocol}

Qualquer dúvida ou caso necessite prorrogar o prazo, basta entrar em contato conosco.

Atenciosamente,
*Suporte de TI & Multimídia • UniFAP*`;
  };

  const messageText = generateMessageText();

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setHasCopied(true);
    toast.success("Mensagem copiada para a área de transferência!");
    setTimeout(() => setHasCopied(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    if (!cleanPhone) {
      toast.error("Este solicitante não possui número de telefone/WhatsApp cadastrado.");
      return;
    }
    const url = `https://wa.me/${phoneForWhatsApp}?text=${encodeURIComponent(messageText)}`;
    window.open(url, "_blank");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-6 rounded-3xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                Notificação WhatsApp
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Envie um lembrete rápido de devolução ou alinhamento com o solicitante.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Informações do Contato */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <div className="font-bold text-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary" />
                <span>{loan.borrowerName}</span>
                {loan.borrowerDepartment && (
                  <span className="text-[11px] text-muted-foreground font-normal">
                    ({loan.borrowerDepartment})
                  </span>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Phone className="w-3 h-3 text-emerald-500" />
                <span>{loan.borrowerPhone || "Sem telefone cadastrado"}</span>
              </div>
            </div>

            {isOverdue ? (
              <Badge variant="damaged" dot className="text-[10px]">
                Atrasado
              </Badge>
            ) : (
              <Badge variant="loaned" dot className="text-[10px]">
                No Prazo
              </Badge>
            )}
          </div>

          {/* Prévia da Mensagem */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-muted-foreground">
                Texto Formatado
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-7 text-[11px] gap-1 px-2 rounded-lg"
              >
                {hasCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Texto</span>
                  </>
                )}
              </Button>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-xs font-mono whitespace-pre-line text-foreground/90 leading-relaxed max-h-56 overflow-y-auto">
              {messageText}
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl text-xs"
            >
              Fechar
            </Button>

            <Button
              type="button"
              onClick={handleOpenWhatsApp}
              disabled={!cleanPhone}
              className="gap-1.5 rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Abrir WhatsApp Web</span>
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
