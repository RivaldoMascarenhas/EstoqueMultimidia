"use client";

import React, { useState } from "react";
import { KeyRound, Lock, AlertCircle, Save, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface UserPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any | null;
}

export function UserPasswordModal({
  isOpen,
  onClose,
  user,
}: UserPasswordModalProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mustChangePassword, setMustChangePassword] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) return null;

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("As senhas digitadas não coincidem.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/v1/users/${user.id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          newPassword,
          mustChangePassword,
        }),
      });

      const json = await res.json();

      if (json.success) {
        toast.success(json.message || "Senha redefinida com sucesso!");
        setNewPassword("");
        setConfirmPassword("");
        onClose();
      } else {
        toast.error(json.error || "Erro ao redefinir senha.");
      }
    } catch (e: any) {
      toast.error("Erro na comunicação com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm p-6 rounded-3xl bg-card border-border/80">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Redefinir Senha
              </h2>
              <p className="text-xs text-muted-foreground">
                Usuário: <strong className="text-foreground">{user.name}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleResetPassword} className="space-y-4 pt-2">
          
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Nova Senha de Acesso:
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 dígitos"
                required
                className="pl-9 h-10 rounded-xl text-xs bg-background"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Confirmar Nova Senha:
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                required
                className="pl-9 h-10 rounded-xl text-xs bg-background"
              />
            </div>
          </div>

          {/* Opção de Forçar Troca de Senha */}
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
            <input
              type="checkbox"
              id="pwdMustChangePassword"
              checked={mustChangePassword}
              onChange={(e) => setMustChangePassword(e.target.checked)}
              className="w-4 h-4 text-primary rounded border-input focus:ring-primary"
            />
            <label htmlFor="pwdMustChangePassword" className="text-xs text-foreground font-semibold cursor-pointer">
              Exigir que o usuário troque a senha no próximo login
            </label>
          </div>

          {/* Botões */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl text-xs h-9"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="rounded-xl text-xs h-9 bg-amber-600 hover:bg-amber-700 text-white font-semibold gap-1.5 shadow-md shadow-amber-600/20"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Salvando..." : "Redefinir Senha"}</span>
            </Button>
          </div>

        </form>

      </DialogContent>
    </Dialog>
  );
}
