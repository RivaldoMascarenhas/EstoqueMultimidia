"use client";

import React, { useState } from "react";
import { AlertTriangle, Trash2, Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  itemName?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning";
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "danger",
}: ConfirmModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Erro na confirmação:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDanger = variant === "danger";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-md p-6 rounded-3xl bg-card border-border/80 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center text-center space-y-4 pt-2">
          {/* Glowing Icon */}
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl ring-8 transition-all ${
              isDanger
                ? "bg-rose-500/15 text-rose-500 ring-rose-500/10 shadow-lg shadow-rose-500/20"
                : "bg-amber-500/15 text-amber-500 ring-amber-500/10 shadow-lg shadow-amber-500/20"
            }`}
          >
            {isDanger ? <Trash2 className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
          </div>

          {/* Title & Description */}
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-foreground tracking-tight">
              {title}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
              {description}
            </p>
          </div>

          {/* Highlight Item if provided */}
          {itemName && (
            <div className="px-3.5 py-2 rounded-xl bg-muted/50 border border-border text-xs font-semibold text-foreground font-mono">
              {itemName}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border/60 mt-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onClose}
            className="rounded-xl h-10 text-xs font-semibold hover:bg-muted cursor-pointer"
          >
            {cancelText}
          </Button>

          <Button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirm}
            className={`rounded-xl h-10 text-xs font-bold gap-2 text-white shadow-md cursor-pointer transition-all ${
              isDanger
                ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                : "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              confirmText
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
