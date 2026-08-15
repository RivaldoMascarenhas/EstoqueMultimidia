"use client";

import React, { useState, useEffect } from "react";
import { ArrowDownLeft, Plus, Loader2, Package } from "lucide-react";
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

interface StockEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    name: string;
    sku: string;
    unit: string;
  };
  box: {
    id: string;
    code: string;
    name: string;
    doorName?: string;
    currentQuantity?: number;
  };
  onSuccess?: () => void;
}

export function StockEntryModal({
  isOpen,
  onClose,
  item,
  box,
  onSuccess,
}: StockEntryModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setObservation("");
    }
  }, [isOpen]);

  const currentQty = box.currentQuantity || 0;
  const newTotal = currentQty + quantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (quantity <= 0) {
      toast.error("A quantidade deve ser maior que zero.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/v1/inventory/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          boxId: box.id,
          quantity,
          observation: observation.trim() || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error || "Erro ao registrar entrada.");
        setIsLoading(false);
        return;
      }

      toast.success(`✓ Entrada de ${quantity} ${item.unit} registrada na Caixa ${box.code}!`);
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
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Registrar Entrada de Material
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Adicionar mais unidades desta peça na caixa
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 my-2">
          <div className="p-3.5 rounded-2xl border border-border/80 bg-muted/40 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-primary">
                  {item.sku}
                </span>
                <h4 className="text-sm font-bold text-foreground leading-tight">
                  {item.name}
                </h4>
              </div>
              <Badge variant="outline" className="font-mono text-[10px]">
                {item.unit}
              </Badge>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
              <span className="text-muted-foreground">
                Destino: <strong className="text-foreground">{box.name} ({box.code})</strong>
              </span>
              <span className="font-semibold text-foreground font-mono">
                Novo Total: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{newTotal} {item.unit}</span>
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Quantidade a Adicionar ({item.unit})
              </label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                required
                className="font-bold font-mono text-base"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Observação (Opcional)
              </label>
              <textarea
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Ex: Compra institucional / Reposição de estoque..."
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
                variant="emerald"
                disabled={quantity <= 0 || isLoading}
                isLoading={isLoading}
                className="rounded-xl gap-1.5"
              >
                <span>Confirmar Entrada (+{quantity} {item.unit})</span>
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
