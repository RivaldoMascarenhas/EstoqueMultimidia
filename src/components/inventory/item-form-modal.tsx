"use client";

import React, { useState, useEffect } from "react";
import { Package, Plus, Loader2, Check, X, Tag } from "lucide-react";
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

interface CategoryOption {
  id: string;
  name: string;
}

interface BoxOption {
  id: string;
  code: string;
  name: string;
  door?: { name: string };
}

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryOption[];
  boxes: BoxOption[];
  onSuccess?: () => void;
}

const STANDARD_UNITS = [
  { value: "UN", label: "Unidade (UN)" },
  { value: "M", label: "Metros (M)" },
  { value: "CX", label: "Caixa (CX)" },
  { value: "PC", label: "Peça (PC)" },
  { value: "PAR", label: "Par (PAR)" },
  { value: "RL", label: "Rolo (RL)" },
  { value: "KG", label: "Quilograma (KG)" },
  { value: "L", label: "Litro (L)" },
  { value: "KIT", label: "Kit (KIT)" },
  { value: "PCT", label: "Pacote (PCT)" },
  { value: "CUSTOM", label: "✏️ Outra (Digitar...)" },
];

export function ItemFormModal({
  isOpen,
  onClose,
  categories,
  boxes,
  onSuccess,
}: ItemFormModalProps) {
  const [categoryList, setCategoryList] = useState<CategoryOption[]>(categories);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [itemType, setItemType] = useState<"MATERIAL" | "ASSET_EQUIPMENT">("MATERIAL");
  
  // Unidade de Medida
  const [unitSelect, setUnitSelect] = useState("UN");
  const [customUnit, setCustomUnit] = useState("");

  // Criação Rápida de Nova Categoria Inline
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  const [description, setDescription] = useState("");
  const [minStock, setMinStock] = useState(5);
  const [idealStock, setIdealStock] = useState(15);
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [initialBoxId, setInitialBoxId] = useState("");
  const [initialQuantity, setInitialQuantity] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setCategoryList(categories);
  }, [categories]);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setSku("");
      setDescription("");
      setMinStock(5);
      setIdealStock(15);
      setManufacturer("");
      setModel("");
      setInitialQuantity(0);
      setUnitSelect("UN");
      setCustomUnit("");
      setIsCreatingCategory(false);
      setNewCategoryName("");
      if (categoryList.length > 0) setCategoryId(categoryList[0].id);
      if (boxes.length > 0) setInitialBoxId(boxes[0].id);
    }
  }, [isOpen, categoryList, boxes]);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Digite o nome da nova categoria.");
      return;
    }

    try {
      setIsSavingCategory(true);
      const res = await fetch("/api/v1/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Erro ao criar categoria.");
        setIsSavingCategory(false);
        return;
      }

      const createdCat = json.data;
      setCategoryList((prev) => [...prev, createdCat]);
      setCategoryId(createdCat.id);
      setIsCreatingCategory(false);
      setNewCategoryName("");
      setIsSavingCategory(false);
      toast.success(`Categoria '${createdCat.name}' adicionada com sucesso!`);
    } catch (err: any) {
      toast.error("Erro ao criar categoria.");
      setIsSavingCategory(false);
    }
  };

  const finalUnit = unitSelect === "CUSTOM" ? (customUnit.trim().toUpperCase() || "UN") : unitSelect;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !sku.trim() || !categoryId) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/v1/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          sku: sku.trim().toUpperCase(),
          categoryId,
          itemType,
          unit: finalUnit,
          description: description.trim() || undefined,
          minStock,
          idealStock,
          manufacturer: manufacturer.trim() || undefined,
          model: model.trim() || undefined,
          initialBoxId: initialBoxId || undefined,
          initialQuantity: initialQuantity > 0 ? initialQuantity : undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error || "Erro ao cadastrar item.");
        setIsLoading(false);
        return;
      }

      toast.success(`✓ Item '${name}' cadastrado com sucesso!`);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error("Erro inesperado de comunicação com o servidor.");
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl bg-card border-border shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Package className="w-5 h-5" />
            <DialogTitle className="text-base font-bold text-foreground">
              Cadastrar Novo Item no Catálogo
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Cadastre materiais de estoque ou tipos de equipamentos para o setor de Suporte TI & Multimídia.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 my-2">
          {/* Nome e SKU */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Nome do Item <span className="text-rose-500">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Cabo HDMI 10 metros"
                required
                className="text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Código / SKU <span className="text-rose-500">*</span>
              </label>
              <Input
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="CAB-HDMI-10M"
                required
                className="font-mono uppercase font-bold text-xs rounded-xl"
              />
            </div>
          </div>

          {/* Categoria, Tipo e Unidade */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Categoria com Botão Inline de Criar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Categoria <span className="text-rose-500">*</span>
                </label>
                {!isCreatingCategory && (
                  <button
                    type="button"
                    onClick={() => setIsCreatingCategory(true)}
                    className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Nova</span>
                  </button>
                )}
              </div>

              {isCreatingCategory ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Nome da categoria..."
                    className="h-10 text-xs rounded-xl"
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="icon"
                    onClick={handleCreateCategory}
                    disabled={isSavingCategory}
                    className="h-10 w-10 shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {isSavingCategory ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setIsCreatingCategory(false)}
                    className="h-10 w-10 shrink-0 rounded-xl text-muted-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                  className="w-full h-10 px-3 text-xs bg-background border border-input rounded-xl text-foreground focus:ring-2 focus:ring-primary outline-none font-medium"
                >
                  {categoryList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Tipo do Item */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Tipo do Item
              </label>
              <select
                value={itemType}
                onChange={(e) => setItemType(e.target.value as any)}
                className="w-full h-10 px-3 text-xs bg-background border border-input rounded-xl text-foreground focus:ring-2 focus:ring-primary outline-none font-medium"
              >
                <option value="MATERIAL">📦 Material em Quantidade</option>
                <option value="ASSET_EQUIPMENT">🏷️ Equipamento Patrimonial</option>
              </select>
            </div>

            {/* Unidade de Medida com Opção Personalizada */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Unidade de Medida
              </label>
              {unitSelect === "CUSTOM" ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value.toUpperCase())}
                    placeholder="Ex: ROLO, PAR, KIT"
                    maxLength={8}
                    className="h-10 text-xs font-mono uppercase font-bold rounded-xl"
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => setUnitSelect("UN")}
                    className="h-10 w-10 shrink-0 rounded-xl text-muted-foreground"
                    title="Voltar para lista padrão"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <select
                  value={unitSelect}
                  onChange={(e) => setUnitSelect(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-background border border-input rounded-xl text-foreground font-mono focus:ring-2 focus:ring-primary outline-none font-medium"
                >
                  {STANDARD_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Estoque Mínimo e Ideal */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Estoque Mínimo (Alerta de Atenção)
              </label>
              <Input
                type="number"
                min="0"
                value={minStock}
                onChange={(e) => setMinStock(parseInt(e.target.value) || 0)}
                className="text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Estoque Ideal (Meta)
              </label>
              <Input
                type="number"
                min="0"
                value={idealStock}
                onChange={(e) => setIdealStock(parseInt(e.target.value) || 0)}
                className="text-xs rounded-xl"
              />
            </div>
          </div>

          {/* Fabricante e Modelo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Fabricante (Opcional)
              </label>
              <Input
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="Ex: PlusCable, Epson, Shure"
                className="text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Modelo (Opcional)
              </label>
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Ex: High Speed 2.0 / X49"
                className="text-xs rounded-xl"
              />
            </div>
          </div>

          {/* Estoque Inicial Opcional (Se for Material) */}
          {itemType === "MATERIAL" && (
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 space-y-3">
              <span className="text-xs font-bold text-foreground block">
                Local de Armazenamento Inicial (Opcional)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground font-medium">
                    Caixa Física do Armário
                  </label>
                  <select
                    value={initialBoxId}
                    onChange={(e) => setInitialBoxId(e.target.value)}
                    className="w-full h-9 px-2.5 text-xs bg-background border border-input rounded-xl text-foreground focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="">Nenhuma caixa inicial</option>
                    {boxes.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} - {b.name} ({b.door?.name || "Porta"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground font-medium">
                    Quantidade Inicial ({finalUnit})
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={initialQuantity}
                    onChange={(e) => setInitialQuantity(parseInt(e.target.value) || 0)}
                    disabled={!initialBoxId}
                    placeholder="0"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Descrição */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Descrição / Observações Técnicas (Opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Utilizado para conexão de notebooks nas salas de aula dos blocos A e B..."
              rows={2}
              className="w-full px-3 py-2 text-xs bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              isLoading={isLoading}
              className="rounded-xl bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/25 gap-1.5"
            >
              <Package className="w-4 h-4" />
              <span>Salvar Item no Catálogo</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
