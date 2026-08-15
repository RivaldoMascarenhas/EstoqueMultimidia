"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { Lock, ShieldAlert, KeyRound, CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function ForceChangePasswordModal() {
  const { data: session, update } = useSession();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mustChange = session?.user?.mustChangePassword === true;

  if (!mustChange) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error("A nova senha deve possuir pelo menos 6 caracteres.");
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
        // Atualizar sessão do NextAuth localmente
        await update({
          ...session,
          user: {
            ...session?.user,
            mustChangePassword: false,
          },
        });
        window.location.reload();
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
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  autoFocus
                  className="pl-9 h-11 rounded-xl text-xs bg-background"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Confirme a Nova Senha: *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  required
                  className="pl-9 h-11 rounded-xl text-xs bg-background"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-xl text-xs font-bold bg-primary text-primary-foreground gap-2 shadow-lg shadow-primary/25 mt-2"
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
