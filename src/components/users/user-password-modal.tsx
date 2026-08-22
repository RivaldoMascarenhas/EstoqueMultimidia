"use client";

import React, { useState } from "react";
import { KeyRound, Lock, Save, Check, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { validatePasswordPolicy } from "@/lib/password-policy";
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
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) return null;

  const policy = validatePasswordPolicy(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isFormValid = policy.isValid && passwordsMatch;

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!policy.isValid) {
      toast.error(policy.error || "A nova senha não atende aos requisitos de segurança.");
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
        setShowNewPassword(false);
        setShowConfirmPassword(false);
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
      <DialogContent className="max-w-md p-6 rounded-3xl bg-card border-border/80">
        
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
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 dígitos (letras e números)"
                required
                className="pl-9 pr-10 h-10 rounded-xl text-xs bg-background"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Requisitos da Senha */}
          <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1.5 text-[11px]">
            <p className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">
              Requisitos de Segurança:
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <div className={`flex items-center gap-1.5 ${policy.hasMinLength ? "text-emerald-600 font-semibold" : "text-muted-foreground"}`}>
                {policy.hasMinLength ? <Check className="w-3.5 h-3.5" /> : <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 ml-1 mr-1" />}
                <span>Mínimo 8 caracteres</span>
              </div>
              <div className={`flex items-center gap-1.5 ${policy.hasLetter ? "text-emerald-600 font-semibold" : "text-muted-foreground"}`}>
                {policy.hasLetter ? <Check className="w-3.5 h-3.5" /> : <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 ml-1 mr-1" />}
                <span>Pelo menos 1 letra</span>
              </div>
              <div className={`flex items-center gap-1.5 ${policy.hasNumber ? "text-emerald-600 font-semibold" : "text-muted-foreground"}`}>
                {policy.hasNumber ? <Check className="w-3.5 h-3.5" /> : <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 ml-1 mr-1" />}
                <span>Pelo menos 1 número</span>
              </div>
              <div className={`flex items-center gap-1.5 ${passwordsMatch ? "text-emerald-600 font-semibold" : "text-muted-foreground"}`}>
                {passwordsMatch ? <Check className="w-3.5 h-3.5" /> : <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 ml-1 mr-1" />}
                <span>Senhas conferem</span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Confirmar Nova Senha:
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                required
                className="pl-9 pr-10 h-10 rounded-xl text-xs bg-background"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
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
              className="rounded-xl text-xs h-9 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !isFormValid}
              className="rounded-xl text-xs h-9 bg-amber-600 hover:bg-amber-700 text-white font-semibold gap-1.5 shadow-md shadow-amber-600/20 cursor-pointer"
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
