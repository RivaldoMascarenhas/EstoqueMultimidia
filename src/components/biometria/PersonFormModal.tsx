"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { User, Mail, Phone, Hash, Tag, FileText, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

interface PersonFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  person?: any | null;
  onSuccess?: () => void;
}

export function PersonFormModal({
  isOpen,
  onClose,
  person,
  onSuccess,
}: PersonFormModalProps) {
  const isEditing = !!person;

  const [name, setName] = useState("");
  const [registration, setRegistration] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState("Aluno");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (person) {
      setName(person.name || "");
      setRegistration(person.registration || "");
      setCpf(person.cpf || "");
      setEmail(person.email || "");
      setPhone(person.phone || "");
      setCategory(person.category || "Aluno");
      setNotes(person.notes || "");
    } else {
      setName("");
      setRegistration("");
      setCpf("");
      setEmail("");
      setPhone("");
      setCategory("Aluno");
      setNotes("");
    }
  }, [person, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nome completo é obrigatório.");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = isEditing
        ? `/api/v1/biometrics/persons/${person.id}`
        : "/api/v1/biometrics/persons";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          registration: registration.trim() || null,
          cpf: cpf.replace(/\D/g, "") || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          category: category.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao salvar participante.");
      }

      toast.success(isEditing ? "Participante atualizado com sucesso!" : "Participante cadastrado com sucesso!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-card border-border p-0 overflow-hidden">
        <DialogHeader className="p-5 border-b border-border/80 bg-muted/20">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {isEditing ? "Editar Pessoa / Participante" : "Cadastrar Pessoa / Participante"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isEditing
              ? "Atualize os dados cadastrais da pessoa."
              : "Cadastre uma nova pessoa física para biometria e eventos."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              Nome Completo *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Maria Oliveira Santos"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
                <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                Matrícula
              </label>
              <input
                type="text"
                value={registration}
                onChange={(e) => setRegistration(e.target.value)}
                placeholder="Ex: 20261001"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                CPF
              </label>
              <input
                type="text"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="Ex: 123.456.789-00"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="maria@fapce.edu.br"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                Telefone / Celular
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(88) 99999-0000"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              Categoria
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            >
              <option value="Aluno">Aluno</option>
              <option value="Professor">Professor</option>
              <option value="Colaborador Administrativo">Colaborador Administrativo</option>
              <option value="Técnico Administrativo">Técnico Administrativo</option>
              <option value="Geral">Geral</option>
              <option value="Convidado">Convidado</option>
              <option value="Externo">Comunidade Externa</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              Observações
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informações adicionais..."
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md transition-colors disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isEditing ? "Salvar Alterações" : "Cadastrar Pessoa"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
