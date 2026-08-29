"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { Lock, KeyRound, ArrowRight, Check, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { validatePasswordPolicy } from "@/lib/password-policy";
import { toast } from "sonner";

export function ForceChangePasswordModal() {
  const { data: session, update } = useSession();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mustChange = session?.user?.mustChangePassword === true;

  if (!mustChange) return null;

  const policy = validatePasswordPolicy(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isFormValid = policy.isValid && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!policy.isValid) {
      toast.error(policy.error || "A senha não atende aos requisitos de segurança.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("As senhas digitadas não conferem.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/v1/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      const json = await res.json();

      if (json.success) {
        toast.success("Sua senha pessoal foi atualizada com sucesso!");
        // Atualizar sessão do NextAuth consultando o status no banco
        await update();
        window.location.href = "/dashboard";
      } else {
        toast.error(json.error || "Erro ao atualizar senha.");
      }
    } catch (e: any) {
      toast.error("Erro de conexão com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent 
        className="max-w-md p-6 sm:p-8 rounded-3xl bg-card border-border/80 shadow-2xl [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="space-y-6 text-center">
          
          {/* Ícone */}
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500 mx-auto shadow-inner">
            <KeyRound className="w-8 h-8 animate-pulse" />
          </div>

          {/* Título */}
          <div className="space-y-1.5">
            <h2 className="text-xl font-extrabold tracking-tight text-foreground">
              Troca Obrigatória de Senha
            </h2>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Olá, <strong className="text-foreground">{session?.user?.name}</strong>! Por motivos de segurança institucional, é necessário definir sua nova senha pessoal antes de continuar.
            </p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Digite sua Nova Senha: *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres (letras, números e símbolos)"
                  required
                  autoFocus
                  className="pl-9 pr-10 h-11 rounded-xl text-xs bg-background"
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
                Requisitos de Segurança Institucional:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                <div className={`flex items-center gap-1.5 ${policy.hasMinLength ? "text-emerald-600 font-semibold" : "text-muted-foreground"}`}>
                  {policy.hasMinLength ? <Check className="w-3.5 h-3.5" /> : <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 ml-1 mr-1" />}
                  <span>8+ caracteres</span>
                </div>
                <div className={`flex items-center gap-1.5 ${policy.hasLetter ? "text-emerald-600 font-semibold" : "text-muted-foreground"}`}>
                  {policy.hasLetter ? <Check className="w-3.5 h-3.5" /> : <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 ml-1 mr-1" />}
                  <span>1+ letra</span>
                </div>
                <div className={`flex items-center gap-1.5 ${policy.hasNumber ? "text-emerald-600 font-semibold" : "text-muted-foreground"}`}>
                  {policy.hasNumber ? <Check className="w-3.5 h-3.5" /> : <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 ml-1 mr-1" />}
                  <span>1+ número</span>
                </div>
                <div className={`flex items-center gap-1.5 ${policy.hasSpecialChar ? "text-emerald-600 font-semibold" : "text-muted-foreground"}`}>
                  {policy.hasSpecialChar ? <Check className="w-3.5 h-3.5" /> : <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 ml-1 mr-1" />}
                  <span>1+ símbolo (@, #, !)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passwordsMatch && confirmPassword.length > 0 ? "text-emerald-600 font-semibold" : "text-muted-foreground"}`}>
                  {passwordsMatch && confirmPassword.length > 0 ? <Check className="w-3.5 h-3.5" /> : <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 ml-1 mr-1" />}
                  <span>Senhas conferem</span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Confirme a Nova Senha: *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha exatamente"
                  required
                  className="pl-9 pr-10 h-11 rounded-xl text-xs bg-background"
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

            <Button
              type="submit"
              disabled={isSubmitting || !isFormValid}
              className="w-full h-11 rounded-xl text-xs font-bold bg-primary text-primary-foreground gap-2 shadow-lg shadow-primary/25 mt-2 cursor-pointer"
            >
              <span>{isSubmitting ? "Salvando..." : "Definir Minha Senha e Acessar"}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>

          </form>

        </div>
      </DialogContent>
    </Dialog>
  );
}
