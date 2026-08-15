"use client";

import React, { useState, useEffect } from "react";
import { Package, Plus, Loader2 } from "lucide-react";
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
import { toast } from "sonner";

interface DoorOption {
  id: string;
  code: string;
  name: string;
}

interface BoxFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  doors: DoorOption[];
  onSuccess?: () => void;
}

export function BoxFormModal({
  isOpen,
  onClose,
  doors,
  onSuccess,
}: BoxFormModalProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [doorId, setDoorId] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCode("");
      setName("");
      setDescription("");
      if (doors.length > 0) setDoorId(doors[0].id);
    }
  }, [isOpen, doors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim() || !name.trim() || !doorId) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/v1/boxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          doorId,
          description: description.trim() || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error || "Erro ao cadastrar caixa.");
        setIsLoading(false);
        return;
      }

      toast.success(`✓ Caixa '${code}' cadastrada com sucesso! QR Code gerado.`);
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
          <div className="flex items-center gap-2 text-primary">
            <Package className="w-5 h-5" />
            <DialogTitle className="text-base font-bold text-foreground">
              Cadastrar Nova Caixa no Armário
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Cadastre uma caixa física com identificação numerada e geração automática de QR Code.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 my-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Código da Caixa <span className="text-rose-500">*</span>
              </label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ex: C025"
                required
                className="font-mono uppercase font-bold text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Nome da Caixa <span className="text-rose-500">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Caixa 025"
                required
                className="text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Porta do Armário <span className="text-rose-500">*</span>
            </label>
            <select
              value={doorId}
              onChange={(e) => setDoorId(e.target.value)}
              required
              className="w-full h-10 px-3 py-2 text-xs bg-background border border-input rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-primary outline-none"
            >
              {doors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Descrição do Conteúdo Planejado
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Controles remotos, passadores de slide e pilhas reservas..."
              rows={2}
              className="w-full px-3 py-2 text-xs bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary transition-all resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="rounded-xl">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} isLoading={isLoading} className="rounded-xl gap-1.5">
              <span>Cadastrar Caixa</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
