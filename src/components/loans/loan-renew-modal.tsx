"use client";

import React, { useState, useEffect } from "react";
import { 
  CalendarClock, 
  Clock, 
  FileText, 
  Loader2, 
  Monitor 
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
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

interface LoanRenewModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: any | null;
  onSuccess: () => void;
}

export function LoanRenewModal({
  isOpen,
  onClose,
  loan,
  onSuccess,
}: LoanRenewModalProps) {
  const [newExpectedReturnDate, setNewExpectedReturnDate] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatDateTimeForInput = (date: Date) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  useEffect(() => {
    if (isOpen && loan) {
      // Começar com +24 horas a partir da data atual de devolução ou de agora
      let baseDate = loan.expectedReturnDate ? new Date(loan.expectedReturnDate) : new Date();
      if (isNaN(baseDate.getTime())) baseDate = new Date();
      const now = new Date();
      const refDate = baseDate > now ? baseDate : now;
      refDate.setDate(refDate.getDate() + 1);
      setNewExpectedReturnDate(formatDateTimeForInput(refDate));
      setReason("");
    }
  }, [isOpen, loan]);

  if (!loan) return null;

  const applyPreset = (type: "2h" | "4h" | "24h" | "3d" | "7d") => {
    let baseDate = loan.expectedReturnDate ? new Date(loan.expectedReturnDate) : new Date();
    if (isNaN(baseDate.getTime())) baseDate = new Date();
    const now = new Date();
    const refDate = baseDate > now ? new Date(baseDate) : new Date(now);

    switch (type) {
      case "2h":
        refDate.setHours(refDate.getHours() + 2);
        break;
      case "4h":
        refDate.setHours(refDate.getHours() + 4);
        break;
      case "24h":
        refDate.setDate(refDate.getDate() + 1);
        break;
      case "3d":
        refDate.setDate(refDate.getDate() + 3);
        break;
      case "7d":
        refDate.setDate(refDate.getDate() + 7);
        break;
    }
    setNewExpectedReturnDate(formatDateTimeForInput(refDate));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newExpectedReturnDate) {
      toast.error("Informe a nova data e horário previstos para devolução.");
      return;
    }

    if (!reason.trim()) {
      toast.error("Informe a justificativa para a renovação de prazo.");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        newExpectedReturnDate: new Date(newExpectedReturnDate).toISOString(),
        reason: reason.trim(),
      };

      const res = await fetch(`/api/v1/loans/${loan.id}/renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Erro ao prorrogar prazo de empréstimo.");
      }

      toast.success("Prazo de empréstimo renovado com sucesso!");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao prorrogar prazo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-6 rounded-3xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                Prorrogar Prazo de Empréstimo
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Estenda a data de devolução com registro formal de justificativa no histórico.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Resumo do Empréstimo */}
        <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-foreground truncate">
              <Monitor className="w-4 h-4 text-primary shrink-0" />
              <span className="truncate">#{loan.asset?.assetTag} - {loan.asset?.item?.name}</span>
            </div>
            <Badge variant="outline" className="text-[10px] shrink-0">
              {loan.borrowerName}
            </Badge>
          </div>

          <div className="text-muted-foreground text-[11px] flex items-center justify-between pt-1 border-t border-border/40">
            <span>Prazo Anterior:</span>
            <span className="font-semibold text-foreground">{formatDateTime(loan.expectedReturnDate)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Nova Data */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-primary" />
              <span>Nova Data e Hora Previstas *</span>
            </label>
            <Input
              type="datetime-local"
              required
              value={newExpectedReturnDate}
              onChange={(e) => setNewExpectedReturnDate(e.target.value)}
              className="text-xs rounded-xl h-9"
            />

            {/* Atalhos Rápidos */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-muted-foreground font-semibold">Atalhos:</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset("2h")}
                className="h-6 text-[10px] px-2 rounded-lg"
              >
                +2 Horas
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset("4h")}
                className="h-6 text-[10px] px-2 rounded-lg"
              >
                +4 Horas
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset("24h")}
                className="h-6 text-[10px] px-2 rounded-lg"
              >
                +1 Dia
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset("3d")}
                className="h-6 text-[10px] px-2 rounded-lg"
              >
                +3 Dias
              </Button>
            </div>
          </div>

          {/* Justificativa */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-primary" />
              <span>Justificativa da Renovação *</span>
            </label>
            <Input
              required
              placeholder="Ex: Aulas estendidas para a semana de seminários"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="text-xs rounded-xl h-9"
            />
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !newExpectedReturnDate || !reason.trim()}
              className="gap-1.5 rounded-xl text-xs bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-500/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <CalendarClock className="w-4 h-4" />
                  <span>Confirmar Prorrogação</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
