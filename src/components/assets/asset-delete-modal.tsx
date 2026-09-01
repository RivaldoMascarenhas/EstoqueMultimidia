"use client";

import React, { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AssetDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: {
    id: string;
    assetTag: string;
    itemName: string;
    model?: string | null;
  } | null;
  onSuccess?: () => void;
}

export function AssetDeleteModal({
  isOpen,
  onClose,
  asset,
  onSuccess,
}: AssetDeleteModalProps) {
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!asset) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      toast.error("Por favor, informe a justificativa do descarte ou baixa.");
      return;
    }

    try {
      setIsLoading(true);

      const res = await fetch(`/api/v1/assets/${asset.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error || "Erro ao descartar patrimônio.");
        setIsLoading(false);
        return;
      }

      toast.success(`✓ Patrimônio #${asset.assetTag} descartado/baixado com sucesso!`);
      setReason("");
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error("Erro inesperado de comunicação com o servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-6 rounded-3xl bg-card border-border shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Descartar / Baixar Patrimônio
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Confirme a baixa definitiva do equipamento #{asset.assetTag}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-1">
            <span className="text-xs font-bold text-foreground block">
              #{asset.assetTag} — {asset.itemName}
            </span>
            {asset.model && (
              <span className="text-[11px] text-muted-foreground block">
                Modelo: {asset.model}
              </span>
            )}
            <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium pt-1">
              ⚠️ O patrimônio será marcado como <strong>BAIXADO (WRITTEN_OFF)</strong> e desativado do acervo disponível. Esta ação ficará registrada permanentemente na auditoria do sistema.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Motivo do Descarte / Baixa <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Equipamento quebrado sem possibilidade de reparo, obsolescência técnica, sucateamento..."
              rows={3}
              required
              className="w-full px-3 py-2 text-xs bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all resize-none"
            />
          </div>

          <DialogFooter className="pt-3 border-t border-border/80 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="h-10 px-4 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              isLoading={isLoading}
              className="h-10 px-5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/25 gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Confirmar Baixa</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
