"use client";

import React, { useState, useEffect } from "react";
import { Monitor, Plus, ChevronDown } from "lucide-react";
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
import { ItemFormModal } from "@/components/inventory/item-form-modal";
import { toast } from "sonner";

interface CatalogItemOption {
  id: string;
  name: string;
  sku: string;
  manufacturer?: string | null;
  model?: string | null;
}

interface BoxOption {
  id: string;
  code: string;
  name: string;
  door?: { name: string };
}

interface CategoryOption {
  id: string;
  name: string;
}

interface AssetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogItems: CatalogItemOption[];
  boxes: BoxOption[];
  categories?: CategoryOption[];
  onSuccess?: () => void;
  onRefreshCatalog?: () => void;
}

export function AssetFormModal({
  isOpen,
  onClose,
  catalogItems,
  boxes,
  categories = [],
  onSuccess,
  onRefreshCatalog,
}: AssetFormModalProps) {
  const [assetTag, setAssetTag] = useState("");
  const [itemId, setItemId] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [model, setModel] = useState("");
  const [currentBoxId, setCurrentBoxId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchaseValue, setPurchaseValue] = useState<number | undefined>(undefined);
  const [warrantyExpiry, setWarrantyExpiry] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Modal aninhado para criar novo modelo no catálogo sem sair da tela
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [internalCategories, setInternalCategories] = useState<CategoryOption[]>(categories);

  useEffect(() => {
    if (isOpen) {
      setAssetTag("");
      setSerialNumber("");
      setModel("");
      setPurchaseDate("");
      setPurchaseValue(undefined);
      setWarrantyExpiry("");
      setNotes("");
      if (catalogItems.length > 0) setItemId(catalogItems[0].id);
      if (boxes.length > 0) setCurrentBoxId(boxes[0].id);

      // Buscar categorias se não vierem por props
      if (internalCategories.length === 0) {
        fetch("/api/v1/categories")
          .then((res) => res.json())
          .then((json) => {
            if (json.success) setInternalCategories(json.data);
          })
          .catch(() => {});
      }
    }
  }, [isOpen, catalogItems, boxes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!assetTag.trim() || !itemId) {
      toast.error("Por favor, preencha o número de patrimônio e selecione o tipo/modelo no catálogo.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/v1/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetTag: assetTag.trim().toUpperCase(),
          itemId,
          serialNumber: serialNumber.trim() || undefined,
          model: model.trim() || undefined,
          currentBoxId: currentBoxId || undefined,
          purchaseDate: purchaseDate || undefined,
          purchaseValue: purchaseValue ? Number(purchaseValue) : undefined,
          warrantyExpiry: warrantyExpiry || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error || "Erro ao cadastrar patrimônio.");
        setIsLoading(false);
        return;
      }

      toast.success(`✓ Equipamento #${assetTag.toUpperCase()} cadastrado com sucesso!`);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error("Erro inesperado de comunicação com o servidor.");
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Monitor className="w-5 h-5" />
              <DialogTitle className="text-base font-bold text-foreground">
                Cadastrar Equipamento no Patrimônio
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Cadastre um ativo individual com tombamento UniFAP, número de série e alocação física.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 my-2">
            {/* Tag de Tombamento e Item do Catálogo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Nº de Tombamento / Patrimônio <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={assetTag}
                  onChange={(e) => setAssetTag(e.target.value.toUpperCase())}
                  placeholder="Ex: PAT-004129"
                  required
                  className="font-mono uppercase font-bold text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Tipo / Modelo no Catálogo <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsItemModalOpen(true)}
                    className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-1"
                    title="Cadastrar um novo modelo se não estiver na lista"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Novo Modelo</span>
                  </button>
                </div>

                <div className="relative">
                  <select
                    value={itemId}
                    onChange={(e) => setItemId(e.target.value)}
                    required
                    className="w-full h-10 pl-3 pr-10 text-xs bg-background border border-input rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary outline-none appearance-none cursor-pointer"
                  >
                    {catalogItems.length === 0 ? (
                      <option value="">Nenhum modelo cadastrado (clique em + Novo Modelo)</option>
                    ) : (
                      catalogItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.sku})
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Número de Série e Modelo Específico */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Número de Série do Fabricante
                </label>
                <Input
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="Ex: SN-EPSON-4129"
                  className="font-mono text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Versão / Detalhe do Modelo
                </label>
                <Input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Ex: PowerLite X49 (Branco)"
                  className="text-xs rounded-xl"
                />
              </div>
            </div>

            {/* Caixa Física de Armazenamento */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Localização / Caixa Física no Armário
              </label>
              <div className="relative">
                <select
                  value={currentBoxId}
                  onChange={(e) => setCurrentBoxId(e.target.value)}
                  className="w-full h-10 pl-3 pr-10 text-xs bg-background border border-input rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-primary outline-none appearance-none cursor-pointer"
                >
                  <option value="">Nenhuma (guardar avulso)</option>
                  {boxes.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} - {b.name} ({b.door?.name || "Porta"})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Dados de Aquisição e Garantia */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl border border-border/80 bg-muted/20">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-foreground">
                  Data de Compra
                </label>
                <Input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-foreground">
                  Valor Aquisição (R$)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={purchaseValue || ""}
                  onChange={(e) => setPurchaseValue(parseFloat(e.target.value) || undefined)}
                  placeholder="3200.00"
                  className="font-mono text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-foreground">
                  Garantia até
                </label>
                <Input
                  type="date"
                  value={warrantyExpiry}
                  onChange={(e) => setWarrantyExpiry(e.target.value)}
                  className="text-xs rounded-xl"
                />
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Acessórios Inclusos / Observações
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Acompanha controle remoto, cabo de força e maleta de transporte..."
                rows={2}
                className="w-full px-3 py-2 text-xs bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-border/80 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="h-10 px-4 text-xs font-semibold rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                isLoading={isLoading}
                className="h-10 px-5 text-xs font-bold rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25 gap-1.5"
              >
                <Monitor className="w-4 h-4" />
                <span>Cadastrar Equipamento</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Criação Rápida de Modelo de Catálogo */}
      <ItemFormModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        categories={internalCategories}
        boxes={boxes}
        onSuccess={() => {
          if (onRefreshCatalog) onRefreshCatalog();
        }}
      />
    </>
  );
}
