"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw, ArrowRight, Loader2, Package } from "lucide-react";
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
import { toast } from "sonner";

interface BoxOption {
  id: string;
  code: string;
  name: string;
  door?: { name: string };
}

interface StockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    name: string;
    sku: string;
    unit: string;
  };
  sourceBox: {
    id: string;
    code: string;
    name: string;
    currentQuantity: number;
  };
  allBoxes: BoxOption[];
  onSuccess?: () => void;
}

export function StockTransferModal({
  isOpen,
  onClose,
  item,
  sourceBox,
  allBoxes,
  onSuccess,
}: StockTransferModalProps) {
  const [destinationBoxId, setDestinationBoxId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Filtrar caixas para não exibir a caixa de origem
  const availableTargetBoxes = allBoxes.filter((b) => b.id !== sourceBox.id);

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setObservation("");
      if (availableTargetBoxes.length > 0 && !destinationBoxId) {
        setDestinationBoxId(availableTargetBoxes[0].id);
      }
    }
  }, [isOpen, availableTargetBoxes, destinationBoxId]);

  const available = sourceBox.currentQuantity;
  const isExceeded = quantity > available;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!destinationBoxId) {
      toast.error("Selecione a caixa de destino.");
      return;
    }

    if (isExceeded) {
      toast.error(`Quantidade a transferir (${quantity}) excede o saldo disponível na origem (${available}).`);
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/v1/inventory/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          sourceBoxId: sourceBox.id,
          destinationBoxId,
          quantity,
          observation: observation.trim() || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error || "Erro ao realizar transferência.");
        setIsLoading(false);
        return;
      }

      toast.success(`✓ Transferência de ${quantity} ${item.unit} concluída com sucesso!`);
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
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Transferir Material entre Caixas
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Mover itens fisicamente de uma caixa para outra no armário
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Origem e Destino Visuais */}
          <div className="p-3.5 rounded-2xl border border-border/80 bg-muted/40 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-primary">
                  {item.sku}
                </span>
                <h4 className="text-xs font-bold text-foreground">
                  {item.name}
                </h4>
              </div>
              <span className="text-xs font-semibold text-muted-foreground font-mono">
                Disponível na Origem: <strong className="text-foreground">{available} {item.unit}</strong>
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60 text-xs">
              <div className="flex-1 p-2 rounded-xl bg-background border border-border text-center">
                <span className="text-[10px] text-muted-foreground block">Origem</span>
                <strong className="text-foreground font-mono">{sourceBox.code}</strong>
              </div>
              <ArrowRight className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 p-2 rounded-xl bg-background border border-primary/40 text-center">
                <span className="text-[10px] text-primary block">Destino</span>
                <select
                  value={destinationBoxId}
                  onChange={(e) => setDestinationBoxId(e.target.value)}
                  className="w-full text-xs font-bold font-mono bg-transparent border-0 text-center text-foreground outline-none cursor-pointer"
                >
                  {availableTargetBoxes.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} - {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Quantidade a Transferir ({item.unit})</span>
                <span className={`text-[11px] font-mono ${isExceeded ? "text-rose-500 font-bold" : "text-muted-foreground"}`}>
                  Máx: {available} {item.unit}
                </span>
              </label>
              <Input
                type="number"
                min="1"
                max={available}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                required
                className="font-bold font-mono text-base"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Observação da Transferência (Opcional)
              </label>
              <textarea
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Ex: Reorganização das caixas da Porta 2..."
                rows={2}
                className="w-full px-3 py-2 text-xs bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="rounded-xl">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={quantity <= 0 || isExceeded || isLoading || !destinationBoxId}
                isLoading={isLoading}
                className="rounded-xl gap-1.5"
              >
                <span>Transferir ({quantity} {item.unit})</span>
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
