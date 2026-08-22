"use client";

import React, { useState, useEffect } from "react";
import { Layers, Plus, Save, Tag, FileText } from "lucide-react";
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

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToEdit?: any | null;
  onSuccess: () => void;
}

export function CategoryFormModal({
  isOpen,
  onClose,
  categoryToEdit,
  onSuccess,
}: CategoryFormModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name || "");
      setDescription(categoryToEdit.description || "");
      setSlug(categoryToEdit.slug || "");
    } else {
      setName("");
      setDescription("");
      setSlug("");
    }
  }, [categoryToEdit, isOpen]);

  // Auto-generate slug when typing name in create mode
  const handleNameChange = (val: string) => {
    setName(val);
    if (!categoryToEdit) {
      const generatedSlug = val
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      setSlug(generatedSlug);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Por favor, informe o nome da categoria.");
      return;
    }

    try {
      setIsLoading(true);
      const url = categoryToEdit
        ? `/api/v1/categories/${categoryToEdit.id}`
        : "/api/v1/categories";
      const method = categoryToEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          slug: slug.trim() || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error || "Erro ao salvar categoria.");
        setIsLoading(false);
        return;
      }

      toast.success(
        categoryToEdit
          ? `✓ Categoria '${name}' atualizada com sucesso!`
          : `✓ Nova categoria '${name}' criada com sucesso!`
      );
      onClose();
      onSuccess();
    } catch (err) {
      toast.error("Erro inesperado de comunicação com o servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6 rounded-3xl bg-card border-border/80 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/15 text-primary shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                {categoryToEdit ? "Editar Categoria" : "Nova Categoria do Catálogo"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Segmentação para organização de materiais, insumos e equipamentos de TI.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Nome da Categoria */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>
                Nome da Categoria <span className="text-rose-500">*</span>
              </span>
            </label>
            <Input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex: Iluminação & Câmeras, Cabos de Rede, etc."
              required
              className="h-10 text-xs rounded-xl"
              autoFocus
            />
          </div>

          {/* Slug / Identificador de URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
              <Tag className="w-3 h-3 text-primary" />
              <span>Identificador / Slug (Opcional)</span>
            </label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder="ex: iluminacao-cameras"
              className="h-10 text-xs font-mono rounded-xl bg-muted/30"
            />
            <p className="text-[10px] text-muted-foreground">
              Utilizado para URLs amigáveis e filtros de integração no sistema.
            </p>
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
              <FileText className="w-3 h-3 text-primary" />
              <span>Descrição / Observações (Opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Tripés, refletores, ring lights e periféricos de transmissão para estúdio..."
              rows={3}
              className="w-full px-3 py-2 text-xs bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none font-sans"
            />
          </div>

          <DialogFooter className="pt-3 border-t border-border/80 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-xl h-10 px-4 text-xs font-medium"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              isLoading={isLoading}
              className="rounded-xl h-10 px-5 text-xs font-bold bg-primary text-primary-foreground shadow-md shadow-primary/25 gap-2"
            >
              {categoryToEdit ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{categoryToEdit ? "Salvar Alterações" : "Criar Categoria"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
