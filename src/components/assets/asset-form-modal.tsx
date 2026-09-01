"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Monitor, Plus, ChevronDown, Sparkles, Layers } from "lucide-react";
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
  assetToEdit?: any | null;
  onSuccess?: () => void;
  onRefreshCatalog?: () => void;
}

function generateRandomTag(prefix = "PAT-"): string {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `${prefix.toUpperCase()}${rand}`;
}

export function AssetFormModal({
  isOpen,
  onClose,
  catalogItems,
  boxes,
  categories = [],
  assetToEdit = null,
  onSuccess,
  onRefreshCatalog,
}: AssetFormModalProps) {
  const [mode, setMode] = useState<"SINGLE" | "BATCH">("SINGLE");

  // Modo Individual
  const [assetTag, setAssetTag] = useState("");
  const [itemId, setItemId] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [model, setModel] = useState("");
  const [currentBoxId, setCurrentBoxId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchaseValue, setPurchaseValue] = useState<number | undefined>(undefined);
  const [warrantyExpiry, setWarrantyExpiry] = useState("");
  const [notes, setNotes] = useState("");

  // Modo em Lote (ex: 50 computadores)
  const [batchQuantity, setBatchQuantity] = useState(10);
  const [tagPrefix, setTagPrefix] = useState("PAT-");
  const [generationType, setGenerationType] = useState<"SEQUENTIAL" | "RANDOM">("SEQUENTIAL");
  const [startNumber, setStartNumber] = useState(1001);

  const [isLoading, setIsLoading] = useState(false);

  // Modal aninhado para criar novo modelo no catálogo
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [internalCategories, setInternalCategories] = useState<CategoryOption[]>(categories);

  const isEditing = !!assetToEdit;

  useEffect(() => {
    if (isOpen) {
      if (assetToEdit) {
        setMode("SINGLE");
        setAssetTag(assetToEdit.assetTag || "");
        setItemId(assetToEdit.itemId || assetToEdit.item?.id || (catalogItems[0]?.id || ""));
        setSerialNumber(assetToEdit.serialNumber || "");
        setModel(assetToEdit.model || "");
        setCurrentBoxId(assetToEdit.currentBoxId || "");
        setPurchaseDate(assetToEdit.acquisitionDate ? assetToEdit.acquisitionDate.split("T")[0] : "");
        setPurchaseValue(
          assetToEdit.acquisitionValue !== null && assetToEdit.acquisitionValue !== undefined
            ? Number(assetToEdit.acquisitionValue)
            : undefined
        );
        setWarrantyExpiry("");
        setNotes(assetToEdit.notes || "");
      } else {
        setMode("SINGLE");
        setAssetTag(generateRandomTag("PAT-"));
        setSerialNumber("");
        setModel("");
        setPurchaseDate("");
        setPurchaseValue(undefined);
        setWarrantyExpiry("");
        setNotes("");
        setBatchQuantity(10);
        setTagPrefix("PAT-");
        setGenerationType("SEQUENTIAL");
        setStartNumber(1001);

        if (catalogItems.length > 0) setItemId(catalogItems[0].id);
        if (boxes.length > 0) setCurrentBoxId(boxes[0].id);
      }

      if (internalCategories.length === 0) {
        fetch("/api/v1/categories")
          .then((res) => res.json())
          .then((json) => {
            if (json.success) setInternalCategories(json.data);
          })
          .catch(() => {});
      }
    }
  }, [isOpen, assetToEdit, catalogItems, boxes]);

  // Preview em tempo real das etiquetas geradas no modo Lote
  const previewTags = useMemo(() => {
    if (mode !== "BATCH") return [];
    const count = Math.min(Math.max(1, batchQuantity || 1), 100);
    const prefix = (tagPrefix || "PAT-").toUpperCase().trim();
    const list: string[] = [];

    if (generationType === "SEQUENTIAL") {
      const start = startNumber || 1;
      for (let i = 0; i < count; i++) {
        list.push(`${prefix}${String(start + i).padStart(6, "0")}`);
      }
    } else {
      for (let i = 0; i < Math.min(count, 12); i++) {
        list.push(`${prefix}${100000 + i * 137}`);
      }
    }
    return list;
  }, [mode, batchQuantity, tagPrefix, generationType, startNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!itemId) {
      toast.error("Por favor, selecione o tipo/modelo no catálogo.");
      return;
    }

    if (purchaseValue !== undefined && purchaseValue < 0) {
      toast.error("O valor de aquisição não pode ser negativo.");
      return;
    }

    try {
      setIsLoading(true);

      if (isEditing) {
        if (!assetTag.trim()) {
          toast.error("Por favor, preencha o número de tombamento/patrimônio.");
          setIsLoading(false);
          return;
        }

        const res = await fetch(`/api/v1/assets/${assetToEdit.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assetTag: assetTag.trim().toUpperCase(),
            itemId,
            serialNumber: serialNumber.trim() || null,
            model: model.trim() || null,
            currentBoxId: currentBoxId || null,
            acquisitionDate: purchaseDate || null,
            acquisitionValue: purchaseValue !== undefined ? Number(purchaseValue) : null,
            notes: notes.trim() || null,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          toast.error(json.error || "Erro ao atualizar patrimônio.");
          setIsLoading(false);
          return;
        }

        toast.success(`✓ Dados do patrimônio #${assetTag.toUpperCase()} atualizados com sucesso!`);
      } else if (mode === "SINGLE") {
        if (!assetTag.trim()) {
          toast.error("Por favor, preencha o número de tombamento/patrimônio.");
          setIsLoading(false);
          return;
        }

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
      } else {
        // Modo em Lote
        if (batchQuantity < 1) {
          toast.error("A quantidade do lote deve ser de pelo menos 1 unidade.");
          setIsLoading(false);
          return;
        }

        const res = await fetch("/api/v1/assets/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId,
            quantity: Number(batchQuantity),
            tagPrefix: (tagPrefix || "PAT-").toUpperCase(),
            startNumber: generationType === "SEQUENTIAL" ? Number(startNumber) : undefined,
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
          toast.error(json.error || "Erro ao cadastrar lote de equipamentos.");
          setIsLoading(false);
          return;
        }

        toast.success(json.message || `✓ ${batchQuantity} equipamentos cadastrados com sucesso!`);
      }

      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error("Erro inesperado de comunicação com o servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6 sm:p-7 rounded-3xl bg-card border-border shadow-2xl">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {isEditing
                    ? `Editar Equipamento #${assetToEdit.assetTag}`
                    : "Cadastrar Equipamento no Patrimônio"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {isEditing
                    ? "Edite as informações cadastrais. Todas as alterações serão salvas no histórico de auditoria."
                    : "Cadastre ativos individuais ou em lote (ex: 50 unidades) com tombamento e alocação física."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Seletor de Modo: Individual vs Em Lote (apenas na criação) */}
          {!isEditing && (
            <div className="grid grid-cols-2 p-1 bg-muted/60 rounded-xl border border-border/60 text-xs font-semibold mt-2">
              <button
                type="button"
                onClick={() => setMode("SINGLE")}
                className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === "SINGLE"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>1 Unidade (Individual)</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("BATCH")}
                className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === "BATCH"
                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Em Lote (Múltiplos Itens)</span>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            
            {/* Linha Superior: Tombamento / Quantidade e Modelo do Catálogo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              
              {/* Coluna Esquerda: Tombamento Individual OU Configuração do Lote */}
              {mode === "SINGLE" ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between h-4">
                    <label className="text-xs font-semibold text-foreground">
                      Nº de Tombamento <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setAssetTag(generateRandomTag())}
                      className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                      title="Gerar um número aleatório único"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Gerar Código</span>
                    </button>
                  </div>
                  <Input
                    value={assetTag}
                    onChange={(e) => setAssetTag(e.target.value.toUpperCase())}
                    placeholder="Ex: PAT-004129"
                    required
                    className="font-mono uppercase font-bold text-xs h-10 rounded-xl bg-background"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between h-4">
                    <label className="text-xs font-semibold text-foreground">
                      Quantidade no Lote <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-muted-foreground font-mono font-bold">
                      {batchQuantity} unidades
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={1}
                      max={200}
                      value={batchQuantity}
                      onChange={(e) => setBatchQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      required
                      className="font-bold text-xs h-10 rounded-xl bg-background w-24 text-center font-mono"
                    />
                    <div className="flex items-center gap-1 flex-1">
                      {[5, 10, 20, 50].map((qty) => (
                        <button
                          key={qty}
                          type="button"
                          onClick={() => setBatchQuantity(qty)}
                          className={`flex-1 h-10 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                            batchQuantity === qty
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/40 border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted"
                          }`}
                        >
                          {qty}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Coluna Direita: Tipo / Modelo no Catálogo */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between h-4">
                  <label className="text-xs font-semibold text-foreground">
                    Tipo / Modelo no Catálogo <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsItemModalOpen(true)}
                    className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
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
                      <option value="">Nenhum modelo cadastrado (+ Novo Modelo)</option>
                    ) : (
                      catalogItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.sku})
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

            </div>

            {/* Painel Específico do Modo Lote: Prefixo, Numeração e Preview */}
            {mode === "BATCH" && (
              <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/80 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">
                      Prefixo do Tombamento
                    </label>
                    <Input
                      value={tagPrefix}
                      onChange={(e) => setTagPrefix(e.target.value.toUpperCase())}
                      placeholder="PAT-"
                      className="font-mono uppercase font-bold text-xs h-9 rounded-xl bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">
                      Número Inicial Sequencial
                    </label>
                    <Input
                      type="number"
                      value={startNumber}
                      onChange={(e) => setStartNumber(parseInt(e.target.value) || 1)}
                      className="font-mono font-bold text-xs h-9 rounded-xl bg-background"
                    />
                  </div>
                </div>

                {/* Preview das Etiquetas */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                    <span>Prévia das {batchQuantity} etiquetas geradas:</span>
                    <span className="font-mono text-primary font-bold">
                      {previewTags[0]} ... {previewTags[previewTags.length - 1]}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-2 bg-background rounded-xl border border-border/80 text-[10px] font-mono font-bold">
                    {previewTags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-muted text-foreground border border-border/60">
                        #{tag}
                      </span>
                    ))}
                    {batchQuantity > previewTags.length && (
                      <span className="px-2 py-0.5 text-muted-foreground italic">
                        + {batchQuantity - previewTags.length} adicionais
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Número de Série e Detalhe de Versão */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {mode === "SINGLE" ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between h-4">
                    <label className="text-xs font-semibold text-foreground">
                      Número de Série do Fabricante (S/N)
                    </label>
                  </div>
                  <Input
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="Ex: SN-EPSON-4129"
                    className="font-mono text-xs h-10 rounded-xl bg-background"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between h-4">
                    <label className="text-xs font-semibold text-foreground">
                      S/N nos Equipamentos em Lote
                    </label>
                  </div>
                  <div className="h-10 px-3 rounded-xl bg-muted/40 border border-border/80 text-[11px] text-muted-foreground flex items-center">
                    Gerado automaticamente / Preenchível na auditoria
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between h-4">
                  <label className="text-xs font-semibold text-foreground">
                    Versão / Detalhe do Modelo
                  </label>
                </div>
                <Input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Ex: PowerLite X49 (Branco)"
                  className="text-xs h-10 rounded-xl bg-background"
                />
              </div>
            </div>

            {/* Localização / Caixa Física */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between h-4">
                <label className="text-xs font-semibold text-foreground">
                  Localização / Caixa Física no Armário
                </label>
              </div>
              <div className="relative">
                <select
                  value={currentBoxId}
                  onChange={(e) => setCurrentBoxId(e.target.value)}
                  className="w-full h-10 pl-3 pr-10 text-xs bg-background border border-input rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary outline-none appearance-none cursor-pointer"
                >
                  <option value="">Sem caixa atribuída (Deixar avulso/geral)</option>
                  {boxes.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} - {b.name} ({b.door?.name || "Porta"})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Dados de Compra, Valor e Garantia */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between h-4">
                  <label className="text-[11px] font-semibold text-foreground">
                    Data de Compra
                  </label>
                </div>
                <Input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="text-xs h-10 rounded-xl bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between h-4">
                  <label className="text-[11px] font-semibold text-foreground">
                    {mode === "BATCH" ? "Valor Unitário (R$)" : "Valor Aquisição (R$)"}
                  </label>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  value={purchaseValue || ""}
                  onChange={(e) => setPurchaseValue(parseFloat(e.target.value) || undefined)}
                  placeholder="3200.00"
                  className="font-mono text-xs h-10 rounded-xl bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between h-4">
                  <label className="text-[11px] font-semibold text-foreground">
                    Garantia até
                  </label>
                </div>
                <Input
                  type="date"
                  value={warrantyExpiry}
                  onChange={(e) => setWarrantyExpiry(e.target.value)}
                  className="text-xs h-10 rounded-xl bg-background"
                />
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between h-4">
                <label className="text-xs font-semibold text-foreground">
                  Acessórios Inclusos / Observações
                </label>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Acompanha cabos de força, manuais e acessórios..."
                rows={2}
                className="w-full px-3 py-2 text-xs bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
              />
            </div>

            {/* Rodapé Limpo (sem barras flutuantes cortando os campos) */}
            <DialogFooter className="pt-3 border-t border-border/80 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="h-10 px-4 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                isLoading={isLoading}
                className="h-10 px-5 text-xs font-bold rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25 gap-1.5 cursor-pointer"
              >
                <Monitor className="w-4 h-4" />
                <span>
                  {isEditing
                    ? "Salvar Alterações"
                    : mode === "BATCH"
                    ? `Cadastrar Lote (${batchQuantity} Itens)`
                    : "Cadastrar Equipamento"}
                </span>
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
