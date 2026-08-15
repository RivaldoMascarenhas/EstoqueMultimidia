"use client";

import React, { useState, useEffect } from "react";
import { 
  MessageSquare, 
  Copy, 
  Check, 
  ExternalLink, 
  Phone, 
  User, 
  AlertTriangle, 
  Clock,
  Package,
  MapPin,
  Calendar,
  Send
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatDate } from "@/lib/utils";
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
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (loan) {
      setPhone(loan.borrowerPhone || "");
    }
  }, [loan, isOpen]);

  if (!loan) return null;

  const isOverdue =
    loan.diffHours !== undefined ||
    loan.status === "OVERDUE" ||
    (loan.status === "ACTIVE" && new Date(loan.expectedReturnDate) < new Date());

  const assetName = loan.asset?.item?.name || loan.itemName || "Equipamento";
  const assetTag = loan.asset?.assetTag || loan.assetTag || "";
  const protocol = loan.protocol || (loan.id ? `LOAN-${loan.id.slice(-8).toUpperCase()}` : "LOAN");
  const returnDateStr = loan.expectedReturnDate ? formatDateTime(loan.expectedReturnDate) : "Data não definida";
  const loanDateStr = loan.loanDate ? formatDateTime(loan.loanDate) : null;

  // Limpar telefone para link wa.me (apenas dígitos)
  const cleanPhone = phone ? phone.replace(/\D/g, "") : "";
  const phoneForWhatsApp = cleanPhone.length >= 10
    ? (cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`)
    : "";

  // Gerar mensagem personalizada
  const generateMessageText = () => {
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
📍 *Local de Uso:* ${loan.destination || "Não especificado"}
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
    let url = "";
    if (phoneForWhatsApp) {
      url = `https://wa.me/${phoneForWhatsApp}?text=${encodeURIComponent(messageText)}`;
    } else {
      url = `https://wa.me/?text=${encodeURIComponent(messageText)}`;
    }
    window.open(url, "_blank");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-6 rounded-3xl bg-card border-border/80 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                Cobrar / Notificar Solicitante
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Envie uma cobrança ou lembrete rápido via WhatsApp direto para o solicitante.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          
          {/* Card Detalhado do Pedido em Atraso */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-3">
            
            {/* Linha 1: Solicitante & Status / Protocolo */}
            <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3">
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Solicitante
                </span>
                <p className="font-bold text-sm text-foreground flex items-center gap-1.5 truncate">
                  <User className="w-4 h-4 text-primary shrink-0" />
                  <span>{loan.borrowerName}</span>
                </p>
                {loan.borrowerDepartment && (
                  <p className="text-[11px] text-muted-foreground truncate">
                    {loan.borrowerDepartment}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Status & Protocolo
                </span>
                <div className="flex items-center gap-2">
                  {isOverdue ? (
                    <Badge variant="destructive" className="text-[10px] px-2.5 py-0.5 font-bold shadow-xs">
                      {loan.diffHours ? `Atrasado há ${loan.diffHours}h` : "Em Atraso"}
                    </Badge>
                  ) : (
                    <Badge variant="loaned" className="text-[10px] px-2.5 py-0.5 font-bold shadow-xs">
                      No Prazo
                    </Badge>
                  )}
                  <span className="font-mono text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20">
                    {protocol}
                  </span>
                </div>
              </div>
            </div>

            {/* Linha 2: Equipamento & Local */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Equipamento
                </span>
                <p className="font-semibold text-foreground truncate flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>{assetName}</span>
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  Patrimônio: #{assetTag}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Local / Destino
                </span>
                <p className="font-semibold text-foreground truncate flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>{loan.destination || "Não informado"}</span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Devolução: <strong className={isOverdue ? "text-rose-500" : "text-foreground"}>{returnDateStr}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Campo de Telefone / WhatsApp Editável */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-500" />
                Telefone / WhatsApp do Solicitante
              </span>
              <span className="text-[10px] text-muted-foreground font-normal">
                {phoneForWhatsApp ? "Pronto para envio direto" : "Opcional (ou selecione no WhatsApp)"}
              </span>
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex: (96) 99123-4567"
              className="h-10 rounded-xl text-xs font-medium text-foreground bg-background border-border/80 focus:border-primary"
            />
            <p className="text-[10px] text-muted-foreground">
              Se o número estiver preenchido, abrirá a conversa diretamente com o solicitante. Se vazio, você poderá escolher o contato na lista do WhatsApp.
            </p>
          </div>

          {/* Prévia da Mensagem */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Send className="w-3 h-3 text-primary" />
                Prévia da Mensagem
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

            <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-xs font-mono whitespace-pre-line text-foreground/90 leading-relaxed max-h-48 overflow-y-auto select-text">
              {messageText}
            </div>
          </div>

          {/* Rodapé / Ações */}
          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl text-xs h-10 px-4"
            >
              Fechar
            </Button>

            <Button
              type="button"
              onClick={handleOpenWhatsApp}
              className="gap-2 rounded-xl text-xs h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md shadow-emerald-500/25 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Cobrar no WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
