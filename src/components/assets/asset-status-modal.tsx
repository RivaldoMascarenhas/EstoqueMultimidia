"use client";

import React, { useState, useEffect } from "react";
import { Wrench, AlertTriangle, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
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
import { toast } from "sonner";

interface BoxOption {
  id: string;
  code: string;
  name: string;
}

interface AssetStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: {
    id: string;
    assetTag: string;
    itemName: string;
    currentStatus: string;
    currentBoxId?: string | null;
  };
  boxes: BoxOption[];
  onSuccess?: () => void;
}

export function AssetStatusModal({
  isOpen,
  onClose,
  asset,
  boxes,
  onSuccess,
}: AssetStatusModalProps) {
  const [newStatus, setNewStatus] = useState<string>("AVAILABLE");
  const [newBoxId, setNewBoxId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNewStatus(asset.currentStatus);
      setNewBoxId(asset.currentBoxId || "");
      setReason("");
    }
  }, [isOpen, asset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      toast.error("Por favor, informe a justificativa da alteração.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`/api/v1/assets/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          currentBoxId: newBoxId || undefined,
          reason: reason.trim(),
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error || "Erro ao atualizar status do equipamento.");
        setIsLoading(false);
        return;
      }

      toast.success(`✓ Status do equipamento #${asset.assetTag} atualizado com sucesso!`);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error("Erro inesperado de comunicação com o servidor.");
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Wrench className="w-5 h-5" />
            <DialogTitle className="text-base font-bold text-foreground">
              Alterar Status / Localização do Ativo
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Atualize a situação física ou operacional do equipamento com justificativa auditável.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 my-2">
          <div className="p-3 rounded-2xl bg-muted/40 border border-border text-xs space-y-1">
            <span className="text-muted-foreground">Equipamento:</span>
            <div className="flex items-center justify-between">
              <strong className="text-foreground">{asset.itemName}</strong>
              <Badge variant="outline" className="font-mono text-primary font-bold">
                #{asset.assetTag}
              </Badge>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Novo Status Operacional <span className="text-rose-500">*</span>
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full h-10 px-3 py-2 text-xs bg-background border border-input rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="AVAILABLE">🟢 Disponível (Pronto para Empréstimo)</option>
              <option value="MAINTENANCE">🟡 Em Manutenção / Laboratório</option>
              <option value="DAMAGED">🔴 Danificado / Avariado</option>
              <option value="RETIRED">⚪ Baixado / Desativado (Sucata)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Caixa / Localização no Armário
            </label>
            <select
              value={newBoxId}
              onChange={(e) => setNewBoxId(e.target.value)}
              className="w-full h-10 px-3 py-2 text-xs bg-background border border-input rounded-xl text-foreground focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="">Sem caixa / Fora do armário</option>
              {boxes.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} - {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Motivo / Justificativa da Alteração <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Enviado para limpeza de lente e troca de lâmpada no laboratório de TI..."
              rows={2}
              required
              className="w-full px-3 py-2 text-xs bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="rounded-xl">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} isLoading={isLoading} className="rounded-xl gap-1.5">
              <span>Salvar Alteração</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
