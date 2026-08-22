"use client";

import React, { useState, useEffect } from "react";
import { ArrowDownLeft, Minus, Plus } from "lucide-react";
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

interface StockExitModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    name: string;
    sku: string;
    unit: string;
    minStock?: number;
  };
  box: {
    id: string;
    code: string;
    name: string;
    doorName?: string;
    currentQuantity: number;
  };
  onSuccess?: () => void;
}

const QUICK_REASONS = [
  "Uso em Aula / Laboratório",
  "Atendimento / Suporte Técnico",
  "Reposição no Armário",
  "Material Danificado / Descarte",
  "Retirada Rápida",
];

export function StockExitModal({
  isOpen,
  onClose,
  item,
  box,
  onSuccess,
}: StockExitModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState("Uso / Atendimento no setor");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setObservation("Uso / Atendimento no setor");
    }
  }, [isOpen]);

  const available = box.currentQuantity;
  const remaining = Math.max(0, available - quantity);
  const isExceeded = quantity > available;
  const isValid = quantity > 0 && !isExceeded;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isExceeded) {
      toast.error(`Quantidade solicitada (${quantity}) excede o saldo disponível (${available}).`);
      return;
    }

    if (quantity <= 0) {
      toast.error("A quantidade deve ser maior que zero.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/v1/inventory/exit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          boxId: box.id,
          quantity,
          observation: observation.trim() || "Baixa de material realizada no setor",
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error || "Erro ao registrar saída de estoque.");
        setIsLoading(false);
        return;
      }

      toast.success(`✓ Baixa de ${quantity} ${item.unit} registrada com sucesso!`);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error("Erro inesperado de comunicação com o servidor.");
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-6 rounded-3xl bg-card border-border shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Registrar Saída de Material
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Registrar retirada física de itens desta caixa
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Resumo do Item & Caixa */}
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
                Local: <strong className="text-foreground">{box.name} ({box.code})</strong> {box.doorName && `• ${box.doorName}`}
              </span>
              <span className="font-semibold text-foreground font-mono">
                Saldo Atual: <span className="text-emerald-600 dark:text-emerald-400">{available} {item.unit}</span>
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Seletor de Quantidade com Stepper */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Quantidade a Retirar</span>
                <span className={`text-[11px] font-medium font-mono ${isExceeded ? "text-rose-500 font-bold" : "text-muted-foreground"}`}>
                  {isExceeded ? `Excede o saldo! (Máx: ${available})` : `Restarão: ${remaining} ${item.unit}`}
                </span>
              </label>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="rounded-xl h-10 w-10 shrink-0"
                >
                  <Minus className="w-4 h-4" />
                </Button>

                <Input
                  type="number"
                  min="1"
                  max={available}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  required
                  className="text-center font-bold font-mono text-base h-10 rounded-xl"
                />

                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => setQuantity(Math.min(available, quantity + 1))}
                  disabled={quantity >= available}
                  className="rounded-xl h-10 w-10 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Motivo / Observação com Quick Chips */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Motivo da Saída / Destino</span>
                <span className="text-[10px] text-muted-foreground">Clique para preencher rápido</span>
              </label>

              {/* Quick Preset Chips */}
              <div className="flex flex-wrap gap-1.5 pb-1">
                {QUICK_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setObservation(reason)}
                    className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all ${
                      observation === reason
                        ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                        : "bg-muted/60 hover:bg-muted text-muted-foreground border-border/60 hover:text-foreground"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <textarea
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Ex: Entregue para aula no Bloco B / Reposição..."
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
                variant="destructive"
                disabled={!isValid || isLoading}
                isLoading={isLoading}
                className="rounded-xl gap-1.5 font-bold shadow-md shadow-rose-600/20"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>Confirmar Saída ({quantity} {item.unit})</span>
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
