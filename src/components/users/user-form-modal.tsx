"use client";

import React, { useState, useEffect } from "react";
import { UserPlus, UserCheck, Mail, Lock, User, Save, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { validatePasswordPolicy } from "@/lib/password-policy";
import { toast } from "sonner";

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit?: any | null;
  onSuccess: () => void;
}

export function UserFormModal({
  isOpen,
  onClose,
  userToEdit,
  onSuccess,
}: UserFormModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState("OPERADOR");
  const [active, setActive] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordPolicy = validatePasswordPolicy(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  useEffect(() => {
    if (userToEdit) {
      setName(userToEdit.name || "");
      setEmail(userToEdit.email || "");
      setPassword("");
      setConfirmPassword("");
      setRole(userToEdit.role || "OPERADOR");
      setActive(userToEdit.active ?? true);
      setMustChangePassword(userToEdit.mustChangePassword ?? false);
    } else {
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setRole("OPERADOR");
      setActive(true);
      setMustChangePassword(true);
    }
  }, [userToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    if (!userToEdit) {
      if (!passwordPolicy.isValid) {
        toast.error(passwordPolicy.error || "A senha deve ter pelo menos 8 caracteres contendo letras e números.");
        return;
      }

      if (password !== confirmPassword) {
        toast.error("A confirmação de senha não confere com a senha digitada.");
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const url = userToEdit ? `/api/v1/users/${userToEdit.id}` : "/api/v1/users";
      const method = userToEdit ? "PUT" : "POST";

      const bodyPayload: any = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        active,
        mustChangePassword,
      };

      if (!userToEdit) {
        bodyPayload.password = password;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      const json = await res.json();

      if (json.success) {
        toast.success(userToEdit ? "Usuário atualizado com sucesso!" : "Novo usuário cadastrado!");
        onSuccess();
        onClose();
      } else {
        toast.error(json.error || "Erro ao salvar usuário.");
      }
    } catch (e: any) {
      toast.error("Erro de conexão ao processar requisição.");
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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
              {userToEdit ? <UserCheck className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {userToEdit ? "Editar Membro da Equipe" : "Cadastrar Novo Usuário"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {userToEdit ? "Atualize as permissões e dados cadastrais" : "Adicione um operador ou gestor de TI"}
              </p>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          
          {/* Nome */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Nome Completo: *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Rivaldo Mascarenhas"
                required
                className="pl-9 h-10 rounded-xl text-xs bg-background"
              />
            </div>
          </div>

          {/* E-mail */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              E-mail Institucional: *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome.sobrenome@fapce.edu.br"
                required
                className="pl-9 h-10 rounded-xl text-xs bg-background"
              />
            </div>
          </div>

          {/* Senha (apenas na criação) */}
          {!userToEdit && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Senha Inicial de Acesso: *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres (letras, números e símbolos)"
                    required
                    className="pl-9 pr-10 h-10 rounded-xl text-xs bg-background"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmar Senha */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Confirmar Senha Inicial: *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha inicial"
                    required
                    className={`pl-9 pr-10 h-10 rounded-xl text-xs bg-background ${
                      confirmPassword.length > 0
                        ? passwordsMatch
                          ? "border-emerald-500 focus:ring-emerald-500"
                          : "border-rose-500 focus:ring-rose-500"
                        : ""
                    }`}
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
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="text-[11px] text-rose-500 font-medium">As senhas não coincidem.</p>
                )}
                {confirmPassword.length > 0 && passwordsMatch && (
                  <p className="text-[11px] text-emerald-600 font-medium">✓ Senhas coincidem!</p>
                )}
              </div>

              {/* Requisitos da Senha */}
              {password.length > 0 && (
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 space-y-1 text-[11px]">
                  <p className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">
                    Requisitos de Segurança da Senha:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
                    <span className={passwordPolicy.hasMinLength ? "text-emerald-600 font-semibold" : "text-muted-foreground"}>
                      {passwordPolicy.hasMinLength ? "✓" : "•"} 8+ caracteres
                    </span>
                    <span className={passwordPolicy.hasLetter ? "text-emerald-600 font-semibold" : "text-muted-foreground"}>
                      {passwordPolicy.hasLetter ? "✓" : "•"} 1+ letra
                    </span>
                    <span className={passwordPolicy.hasNumber ? "text-emerald-600 font-semibold" : "text-muted-foreground"}>
                      {passwordPolicy.hasNumber ? "✓" : "•"} 1+ número
                    </span>
                    <span className={passwordPolicy.hasSpecialChar ? "text-emerald-600 font-semibold" : "text-muted-foreground"}>
                      {passwordPolicy.hasSpecialChar ? "✓" : "•"} 1+ símbolo (@, #, !)
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Perfil de Acesso (Role) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Perfil de Acesso (RBAC): *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="OPERADOR">OPERADOR (Empréstimos, devoluções, baixas e OS)</option>
              <option value="GESTOR">GESTOR (Gestão de caixas, catálogo e relatórios)</option>
              <option value="EVENTOS">EVENTOS (Gestão de eventos, participantes, sorteios e telão)</option>
              <option value="ACADEMIC_SUPPORT">ACADÊMICO (Solicitações e agendamento de salas)</option>
              <option value="ADMIN">ADMINISTRADOR (Acesso total e gestão de usuários)</option>
              <option value="CONSULTA">CONSULTA (Apenas visualização sem alterações)</option>
            </select>
          </div>

          {/* Status Ativo / Inativo (na edição) */}
          {userToEdit && (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border">
              <span className="text-xs font-semibold text-foreground">Status da Conta:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActive(!active)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    active
                      ? "bg-emerald-600 text-white"
                      : "bg-rose-600 text-white"
                  }`}
                >
                  {active ? "Conta Ativa" : "Conta Desativada"}
                </button>
              </div>
            </div>
          )}

          {/* Opção de Forçar Troca de Senha no Próximo Acesso */}
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
            <input
              type="checkbox"
              id="mustChangePassword"
              checked={mustChangePassword}
              onChange={(e) => setMustChangePassword(e.target.checked)}
              className="w-4 h-4 text-primary rounded border-input focus:ring-primary"
            />
            <label htmlFor="mustChangePassword" className="text-xs text-foreground font-semibold cursor-pointer">
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
              className="rounded-xl text-xs h-9 bg-primary text-primary-foreground font-semibold gap-1.5 shadow-md shadow-primary/20"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Salvando..." : userToEdit ? "Salvar Alterações" : "Cadastrar Usuário"}</span>
            </Button>
          </div>

        </form>

      </DialogContent>
    </Dialog>
  );
}
