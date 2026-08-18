"use client";

import React, { useState, useEffect } from "react";
import { 
  PackageCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Archive, 
  FileText, 
  Loader2, 
  User, 
  Calendar, 
  MapPin, 
  Monitor,
  Wrench
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
import { formatDate, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

interface LoanReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: any | null;
  onSuccess: () => void;
}

export function LoanReturnModal({
  isOpen,
  onClose,
  loan,
  onSuccess,
}: LoanReturnModalProps) {
  const [condition, setCondition] = useState<"PERFECT" | "DAMAGED">("PERFECT");
  const [returnBoxId, setReturnBoxId] = useState("");
  const [returnedCondition, setReturnedCondition] = useState("");
  const [returnNotes, setReturnNotes] = useState("");
  const [allBoxes, setAllBoxes] = useState<any[]>([]);
  const [isLoadingBoxes, setIsLoadingBoxes] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadBoxes();
      setCondition("PERFECT");
      setReturnedCondition("");
      setReturnNotes("");
    }
  }, [isOpen]);

  const loadBoxes = async () => {
    try {
      setIsLoadingBoxes(true);
      const res = await fetch("/api/v1/boxes");
      const json = await res.json();
      if (json && json.success && Array.isArray(json.data)) {
        setAllBoxes(json.data);
        // Sugerir caixa anterior se houver ou primeira caixa
        if (loan?.asset?.currentBoxId) {
          setReturnBoxId(loan.asset.currentBoxId);
        } else if (json.data.length > 0) {
          setReturnBoxId(json.data[0].id);
        }
      } else {
        setAllBoxes([]);
      }
      setIsLoadingBoxes(false);
    } catch (err) {
      setAllBoxes([]);
      setIsLoadingBoxes(false);
    }
  };

  if (!loan) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!returnBoxId) {
      toast.error("Selecione a caixa física onde o equipamento foi guardado.");
      return;
    }

    if (condition === "DAMAGED" && !returnedCondition.trim()) {
      toast.error("Descreva a avaria ou problema identificado no equipamento.");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        condition,
        returnBoxId,
        returnedCondition: returnedCondition.trim() || undefined,
        returnNotes: returnNotes.trim() || undefined,
      };

      const res = await fetch(`/api/v1/loans/${loan.id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Erro ao processar devolução.");
      }

      toast.success(
        condition === "DAMAGED"
          ? "Devolução registrada! Equipamento marcado com avaria."
          : "Devolução concluída! Equipamento disponível no armário."
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar devolução.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-6 rounded-3xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                Receber Devolução (Check-in)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Conferência de integridade física e alocação no armário físico da UniFAP.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Resumo do Empréstimo */}
        <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <Monitor className="w-4 h-4 text-primary" />
              <span>#{loan.asset?.assetTag} - {loan.asset?.item?.name}</span>
            </div>
            <Badge variant="loaned" className="text-[10px]">
              Empréstimo Ativo
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-muted-foreground pt-1 border-t border-border/40">
            <div>
              <span className="font-medium text-foreground">Solicitante:</span> {loan.borrowerName}
              {loan.borrowerDepartment && <span className="block text-[11px]">({loan.borrowerDepartment})</span>}
            </div>
            <div>
              <span className="font-medium text-foreground">Destino:</span> {loan.destination}
            </div>
            <div>
              <span className="font-medium text-foreground">Saída:</span> {formatDateTime(loan.loanDate)}
            </div>
            <div>
              <span className="font-medium text-foreground">Prazo Previsto:</span> {formatDateTime(loan.expectedReturnDate)}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 pt-1">
          {/* Seletor de Estado Físico */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Estado de Conservação na Devolução *
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setCondition("PERFECT")}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col gap-1 text-left ${
                  condition === "PERFECT"
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-900 dark:text-emerald-300 shadow-sm"
                    : "hover:bg-muted/60 border-border"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Perfeito Estado</span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Sem danos ou avarias. Pronto para voltar ao acervo disponível.
                </p>
              </div>

              <div
                onClick={() => setCondition("DAMAGED")}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col gap-1 text-left ${
                  condition === "DAMAGED"
                    ? "bg-rose-500/10 border-rose-500 text-rose-900 dark:text-rose-300 shadow-sm"
                    : "hover:bg-muted/60 border-border"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span>Com Avaria / Defeito</span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Equipamento danificado, quebrado ou sem funcionar (irá para manutenção).
                </p>
              </div>
            </div>
          </div>

          {/* Campo de Descrição de Avaria */}
          {condition === "DAMAGED" && (
            <div className="space-y-1.5 p-3 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-rose-900 dark:text-rose-300 animate-in fade-in-50">
              <label className="text-[11px] font-bold flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5 text-rose-500" />
                <span>Descreva a Avaria / Problema Encontrado *</span>
              </label>
              <Input
                required
                placeholder="Ex: Cabo HDMI rompido, lâmpada não acende, tampa trincada..."
                value={returnedCondition}
                onChange={(e) => setReturnedCondition(e.target.value)}
                className="text-xs rounded-xl h-9 bg-background border-rose-500/30"
              />
              <p className="text-[10px] text-muted-foreground">
                O equipamento será marcado como <b>Danificado</b> e ficará bloqueado para novos empréstimos até passar por manutenção.
              </p>
            </div>
          )}

          {/* Seletor de Caixa de Guarda */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Archive className="w-4 h-4 text-primary" />
              <span>Guardar na Caixa Física (Armário) *</span>
            </label>
            <select
              value={returnBoxId}
              onChange={(e) => setReturnBoxId(e.target.value)}
              className="w-full text-xs rounded-xl h-9 px-3 bg-background border border-input focus:ring-2 focus:ring-primary focus:outline-none"
            >
              {allBoxes.map((box) => (
                <option key={box.id} value={box.id}>
                  {box.code} - {box.name} ({box.door?.name || "Armário"})
                </option>
              ))}
            </select>
          </div>

          {/* Observações de Devolução */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-primary" />
              <span>Observações Gerais de Encerramento (Opcional)</span>
            </label>
            <Input
              placeholder="Ex: Todos os cabos conferidos e guardados na bolsa."
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
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
              disabled={isSubmitting || !returnBoxId}
              className={`gap-1.5 rounded-xl text-xs text-white shadow-md ${
                condition === "DAMAGED"
                  ? "bg-gradient-to-r from-rose-600 to-amber-600 shadow-rose-500/20"
                  : "bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-500/20"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <PackageCheck className="w-4 h-4" />
                  <span>Confirmar Devolução</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
