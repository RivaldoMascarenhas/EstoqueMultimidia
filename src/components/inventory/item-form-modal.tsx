"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Package, Plus, Loader2, Check, X, Tag, Monitor, Layers, Box, CheckCircle2, Sliders, Sparkles } from "lucide-react";
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
  itemToEdit?: any | null;
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
  { value: "CUSTOM", label: "✏️ Outra Unidade..." },
];

function generateRandomTag(prefix = "PAT-"): string {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `${prefix.toUpperCase()}${rand}`;
}

function generateAutoSku(type: "MATERIAL" | "ASSET_EQUIPMENT", itemName?: string): string {
  const prefix = type === "ASSET_EQUIPMENT" ? "EQP" : "MAT";
  if (itemName && itemName.trim().length >= 3) {
    const clean = itemName
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9\s]/g, "")
      .split(/\s+/)
      .filter(Boolean);
    if (clean.length >= 2) {
      return `${clean[0].slice(0, 4)}-${clean[1].slice(0, 4)}-${Math.floor(100 + Math.random() * 900)}`;
    } else if (clean.length === 1) {
      return `${clean[0].slice(0, 5)}-${Math.floor(1000 + Math.random() * 9000)}`;
    }
  }
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${rand}`;
}

export function ItemFormModal({
  isOpen,
  onClose,
  categories,
  boxes,
  itemToEdit = null,
  onSuccess,
}: ItemFormModalProps) {
  const isEditing = !!itemToEdit;
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

  // Campos específicos de Equipamento Patrimonial
  const [assetMode, setAssetMode] = useState<"SINGLE" | "BATCH" | "CATALOG_ONLY">("SINGLE");
  const [assetTag, setAssetTag] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [acquisitionDate, setAcquisitionDate] = useState("");
  const [acquisitionValue, setAcquisitionValue] = useState<number | undefined>(undefined);
  
  // Lote de Equipamentos (ex: 50 pcs)
  const [batchQuantity, setBatchQuantity] = useState(10);
  const [tagPrefix, setTagPrefix] = useState("PAT-");
  const [startNumber, setStartNumber] = useState(1001);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setCategoryList(categories);
  }, [categories]);

  useEffect(() => {
    if (isOpen) {
      if (itemToEdit) {
        setName(itemToEdit.name || "");
        setSku(itemToEdit.sku || "");
        setDescription(itemToEdit.description || "");
        setMinStock(itemToEdit.minStock !== undefined ? itemToEdit.minStock : 5);
        setIdealStock(itemToEdit.idealStock !== undefined ? itemToEdit.idealStock : 15);
        setManufacturer(itemToEdit.manufacturer || "");
        setModel(itemToEdit.model || "");
        setCategoryId(itemToEdit.categoryId || itemToEdit.category?.id || (categoryList[0]?.id || ""));
        setItemType(itemToEdit.itemType || "MATERIAL");

        const standardMatch = STANDARD_UNITS.find((u) => u.value === itemToEdit.unit);
        if (standardMatch) {
          setUnitSelect(itemToEdit.unit);
          setCustomUnit("");
        } else {
          setUnitSelect("CUSTOM");
          setCustomUnit(itemToEdit.unit || "");
        }
      } else {
        setName("");
        setSku(generateAutoSku("MATERIAL"));
        setDescription("");
        setMinStock(5);
        setIdealStock(15);
        setManufacturer("");
        setModel("");
        setInitialQuantity(0);
        setUnitSelect("UN");
        setCustomUnit("");
        setItemType("MATERIAL");
        setAssetMode("SINGLE");
        setAssetTag(generateRandomTag("PAT-"));
        setSerialNumber("");
        setAcquisitionDate("");
        setAcquisitionValue(undefined);
        setBatchQuantity(10);
        setTagPrefix("PAT-");
        setStartNumber(1001);
        setIsCreatingCategory(false);
        setNewCategoryName("");
        if (categoryList.length > 0) setCategoryId(categoryList[0].id);
        if (boxes.length > 0) setInitialBoxId(boxes[0].id);
      }
    }
  }, [isOpen, itemToEdit, categoryList, boxes]);

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

  // Preview das etiquetas no modo Lote
  const previewTags = useMemo(() => {
    if (itemType !== "ASSET_EQUIPMENT" || assetMode !== "BATCH") return [];
    const count = Math.min(Math.max(1, batchQuantity || 1), 100);
    const prefix = (tagPrefix || "PAT-").toUpperCase().trim();
    const list: string[] = [];
    const start = startNumber || 1;
    for (let i = 0; i < count; i++) {
      list.push(`${prefix}${String(start + i).padStart(6, "0")}`);
    }
    return list;
  }, [itemType, assetMode, batchQuantity, tagPrefix, startNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !sku.trim() || !categoryId) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    if (!isEditing && itemType === "ASSET_EQUIPMENT" && assetMode === "SINGLE" && !assetTag.trim()) {
      toast.error("Por favor, informe o número de tombamento/patrimônio do equipamento.");
      return;
    }

    try {
      setIsLoading(true);

      if (isEditing) {
        const payload: any = {
          name: name.trim(),
          sku: sku.trim().toUpperCase(),
          categoryId,
          itemType,
          unit: finalUnit,
          description: description.trim() || null,
          minStock: Number(minStock),
          idealStock: Number(idealStock),
          manufacturer: manufacturer.trim() || null,
          model: model.trim() || null,
        };

        const res = await fetch(`/api/v1/items/${itemToEdit.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const json = await res.json();

        if (!res.ok || !json.success) {
          toast.error(json.error || "Erro ao atualizar item.");
          setIsLoading(false);
          return;
        }

        toast.success(`✓ Item '${name}' atualizado com sucesso!`);
        onClose();
        if (onSuccess) onSuccess();
        return;
      }

      const payload: any = {
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
      };

      if (itemType === "MATERIAL") {
        payload.initialQuantity = initialQuantity > 0 ? initialQuantity : undefined;
      } else if (itemType === "ASSET_EQUIPMENT") {
        if (assetMode === "BATCH") {
          payload.batchQuantity = Number(batchQuantity);
          payload.tagPrefix = (tagPrefix || "PAT-").toUpperCase();
          payload.startNumber = Number(startNumber);
          payload.acquisitionDate = acquisitionDate || undefined;
          payload.acquisitionValue = acquisitionValue !== undefined ? Number(acquisitionValue) : undefined;
        } else if (assetMode === "SINGLE") {
          payload.assetTag = assetTag.trim().toUpperCase();
          payload.serialNumber = serialNumber.trim() || undefined;
          payload.acquisitionDate = acquisitionDate || undefined;
          payload.acquisitionValue = acquisitionValue !== undefined ? Number(acquisitionValue) : undefined;
        }
      }

      const res = await fetch("/api/v1/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error || "Erro ao cadastrar item.");
        setIsLoading(false);
        return;
      }

      toast.success(
        itemType === "ASSET_EQUIPMENT" && assetMode === "BATCH"
          ? `✓ Modelo '${name}' e lote de ${batchQuantity} equipamentos cadastrados com sucesso!`
          : itemType === "ASSET_EQUIPMENT" && assetMode === "SINGLE"
          ? `✓ Equipamento '${name}' (#${assetTag.trim().toUpperCase()}) tombado com sucesso!`
          : `✓ Item '${name}' cadastrado com sucesso!`
      );
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error("Erro inesperado de comunicação com o servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[90vh] overflow-y-auto p-6 sm:p-7 rounded-3xl bg-card border-border shadow-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2.5 text-primary">
            <div className="p-2 rounded-2xl bg-primary/10 border border-primary/20">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {isEditing ? `Editar Item: ${itemToEdit.name}` : "Cadastrar Novo Item no Catálogo"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {isEditing
                  ? "Altere nome, categoria, SKU, fabricante ou metas de estoque do item/modelo."
                  : "Cadastre novos materiais ou equipamentos (individuais ou em lote para 50+ unidades)."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* 1. SELEÇÃO VISUAL DO TIPO DE ITEM (NATUREZA) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span>1. Tipo / Natureza do Item</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Opção 1: Material em Quantidade */}
              <button
                type="button"
                onClick={() => {
                  setItemType("MATERIAL");
                  setSku(generateAutoSku("MATERIAL", name));
                }}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  itemType === "MATERIAL"
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-sm"
                    : "border-border/80 bg-muted/30 hover:bg-muted/60"
                }`}
              >
                <div className={`p-2 rounded-xl mt-0.5 ${
                  itemType === "MATERIAL" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  <Package className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground">Material / Insumo</span>
                    {itemType === "MATERIAL" && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Cabos, pilhas, adaptadores e itens estocados por quantidade/saldo.
                  </p>
                </div>
              </button>

              {/* Opção 2: Equipamento Patrimonial */}
              <button
                type="button"
                onClick={() => {
                  setItemType("ASSET_EQUIPMENT");
                  setSku(generateAutoSku("ASSET_EQUIPMENT", name));
                }}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  itemType === "ASSET_EQUIPMENT"
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-sm"
                    : "border-border/80 bg-muted/30 hover:bg-muted/60"
                }`}
              >
                <div className={`p-2 rounded-xl mt-0.5 ${
                  itemType === "ASSET_EQUIPMENT" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  <Monitor className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground">Equipamento Patrimonial</span>
                    {itemType === "ASSET_EQUIPMENT" && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Computadores, projetores e itens tombados individualmente ou em lote.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* 2. IDENTIFICAÇÃO DO ITEM */}
          <div className="space-y-3 pt-1 border-t border-border/60">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
              <Tag className="w-3.5 h-3.5 text-primary" />
              <span>2. Identificação do Item</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <div className="flex items-center justify-between h-4">
                  <label className="text-xs font-semibold text-foreground">
                    Nome do Item <span className="text-rose-500">*</span>
                  </label>
                </div>
                <Input
                  value={name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setName(newName);
                    // Se o SKU estiver com o padrão de 6 dígitos aleatórios, sugere com base no nome
                    if (!sku || sku.startsWith("MAT-") || sku.startsWith("EQP-")) {
                      setSku(generateAutoSku(itemType, newName));
                    }
                  }}
                  placeholder={itemType === "ASSET_EQUIPMENT" ? "Ex: Dell OptiPlex 3080 i5 16GB" : "Ex: Cabo HDMI 10 metros com blindagem"}
                  required
                  className="h-10 text-xs rounded-xl bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between h-4">
                  <label className="text-xs font-semibold text-foreground">
                    Código / SKU <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setSku(generateAutoSku(itemType, name))}
                    className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    title="Gerar outro código SKU automático"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Gerar Novo</span>
                  </button>
                </div>
                <Input
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  placeholder="Ex: EQP-049182"
                  required
                  className="h-10 font-mono uppercase font-bold text-xs rounded-xl bg-background"
                />
              </div>
            </div>

            {/* Categoria e Unidade de Medida */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {/* Categoria com Botão Inline */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between h-4">
                  <label className="text-xs font-semibold text-foreground">
                    Categoria <span className="text-rose-500">*</span>
                  </label>
                  {!isCreatingCategory && (
                    <button
                      type="button"
                      onClick={() => setIsCreatingCategory(true)}
                      className="text-[11px] text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Nova Categoria</span>
                    </button>
                  )}
                </div>

                {isCreatingCategory ? (
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Nome da categoria..."
                      className="h-10 text-xs rounded-xl bg-background"
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="icon"
                      onClick={handleCreateCategory}
                      disabled={isSavingCategory}
                      className="h-10 w-10 shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                      title="Salvar nova categoria"
                    >
                      {isSavingCategory ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => setIsCreatingCategory(false)}
                      className="h-10 w-10 shrink-0 rounded-xl text-muted-foreground cursor-pointer"
                      title="Cancelar"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    required
                    className="w-full h-10 px-3 text-xs bg-background border border-input rounded-xl text-foreground focus:ring-2 focus:ring-primary outline-none font-medium cursor-pointer"
                  >
                    {categoryList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Unidade de Medida */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between h-4">
                  <label className="text-xs font-semibold text-foreground">
                    Unidade de Medida
                  </label>
                  {unitSelect !== "CUSTOM" ? (
                    <button
                      type="button"
                      onClick={() => setUnitSelect("CUSTOM")}
                      className="text-[11px] text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>+ Digitar Outra</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setUnitSelect("UN")}
                      className="text-[11px] text-muted-foreground hover:underline cursor-pointer"
                    >
                      Lista padrão
                    </button>
                  )}
                </div>

                {unitSelect === "CUSTOM" ? (
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value.toUpperCase())}
                      placeholder="Ex: ROLO, PAR, KIT..."
                      maxLength={10}
                      className="h-10 text-xs font-mono uppercase font-bold rounded-xl bg-background"
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => setUnitSelect("UN")}
                      className="h-10 w-10 shrink-0 rounded-xl text-muted-foreground cursor-pointer"
                      title="Voltar para lista"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <select
                    value={unitSelect}
                    onChange={(e) => setUnitSelect(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-background border border-input rounded-xl text-foreground font-mono focus:ring-2 focus:ring-primary outline-none font-medium cursor-pointer"
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
          </div>

          {/* 3. METAS DE ESTOQUE & DADOS DO FABRICANTE */}
          <div className="space-y-3 pt-1 border-t border-border/60">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
              <Sliders className="w-3.5 h-3.5 text-primary" />
              <span>3. Metas de Estoque & Fabricante</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between h-4">
                  <label className="text-xs font-semibold text-foreground">
                    Estoque Mínimo (Alerta de Atenção)
                  </label>
                </div>
                <Input
                  type="number"
                  min="0"
                  value={minStock}
                  onChange={(e) => setMinStock(parseInt(e.target.value) || 0)}
                  className="h-10 text-xs rounded-xl bg-background font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between h-4">
                  <label className="text-xs font-semibold text-foreground">
                    Estoque Ideal (Meta de Armazenamento)
                  </label>
                </div>
                <Input
                  type="number"
                  min="0"
                  value={idealStock}
                  onChange={(e) => setIdealStock(parseInt(e.target.value) || 0)}
                  className="h-10 text-xs rounded-xl bg-background font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between h-4">
                  <label className="text-xs font-semibold text-foreground">
                    Fabricante / Marca (Opcional)
                  </label>
                </div>
                <Input
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  placeholder="Ex: Dell, Epson, Logitech, Sony"
                  className="h-10 text-xs rounded-xl bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between h-4">
                  <label className="text-xs font-semibold text-foreground">
                    Modelo / Versão (Opcional)
                  </label>
                </div>
                <Input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Ex: OptiPlex 3080 / PowerLite X49"
                  className="h-10 text-xs rounded-xl bg-background"
                />
              </div>
            </div>
          </div>

          {/* 4. DADOS DE TOMBAMENTO OU ARMAZENAMENTO INICIAL (Apenas no cadastro inicial) */}
          {!isEditing && (
            itemType === "MATERIAL" ? (
            <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-3">
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground">
                  Local de Armazenamento & Saldo Inicial no Armário
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between h-4">
                    <label className="text-xs text-muted-foreground font-medium">
                      Caixa Física do Armário
                    </label>
                  </div>
                  <select
                    value={initialBoxId}
                    onChange={(e) => setInitialBoxId(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-background border border-input rounded-xl text-foreground focus:ring-2 focus:ring-primary outline-none font-medium cursor-pointer"
                  >
                    <option value="">Nenhuma caixa inicial</option>
                    {boxes.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} - {b.name} ({b.door?.name || "Porta"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between h-4">
                    <label className="text-xs text-muted-foreground font-medium">
                      Quantidade Inicial ({finalUnit})
                    </label>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    value={initialQuantity}
                    onChange={(e) => setInitialQuantity(parseInt(e.target.value) || 0)}
                    disabled={!initialBoxId}
                    placeholder="0"
                    className="h-10 text-xs rounded-xl font-bold font-mono bg-background"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-5 rounded-2xl bg-primary/5 border border-primary/30 space-y-3.5">
              <div className="flex items-center justify-between border-b border-primary/20 pb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground">
                      Geração de Exemplares no Patrimônio
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Cadastre este modelo e já gere as plaquetas de patrimônio físico (ex: 50 unidades)
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase text-primary bg-primary/15 px-2 py-0.5 rounded-md">
                  Item Rastreável
                </span>
              </div>

              {/* Seletor de Modo de Patrimônio */}
              <div className="grid grid-cols-3 p-1 bg-muted/60 rounded-xl border border-border/60 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setAssetMode("SINGLE")}
                  className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    assetMode === "SINGLE"
                      ? "bg-primary text-primary-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Monitor className="w-3 h-3" />
                  <span>1 Unidade</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAssetMode("BATCH")}
                  className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    assetMode === "BATCH"
                      ? "bg-primary text-primary-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>Em Lote (50+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAssetMode("CATALOG_ONLY")}
                  className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    assetMode === "CATALOG_ONLY"
                      ? "bg-primary text-primary-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>Apenas Modelo</span>
                </button>
              </div>

              {/* Modo 1: 1 Unidade */}
              {assetMode === "SINGLE" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between h-4">
                      <label className="text-xs font-semibold text-foreground">
                        Nº de Tombamento <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setAssetTag(generateRandomTag())}
                        className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Gerar Código</span>
                      </button>
                    </div>
                    <Input
                      value={assetTag}
                      onChange={(e) => setAssetTag(e.target.value.toUpperCase())}
                      placeholder="Ex: PAT-004129"
                      className="font-mono uppercase font-bold text-xs h-10 rounded-xl bg-background"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between h-4">
                      <label className="text-xs font-semibold text-foreground">
                        Número de Série (S/N) (Opcional)
                      </label>
                    </div>
                    <Input
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                      placeholder="Ex: SN-EPSON-4129"
                      className="font-mono text-xs h-10 rounded-xl bg-background"
                    />
                  </div>
                </div>
              )}

              {/* Modo 2: Lote (ex: 50 computadores) */}
              {assetMode === "BATCH" && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between h-4">
                        <label className="text-[11px] font-semibold text-foreground">
                          Quantidade a Criar
                        </label>
                      </div>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={1}
                          max={200}
                          value={batchQuantity}
                          onChange={(e) => setBatchQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="font-bold text-xs h-9 rounded-xl bg-background w-20 text-center font-mono"
                        />
                        <div className="flex items-center gap-1 flex-1">
                          {[10, 20, 50].map((qty) => (
                            <button
                              key={qty}
                              type="button"
                              onClick={() => setBatchQuantity(qty)}
                              className={`flex-1 h-9 rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
                                batchQuantity === qty
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background border-border text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {qty}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between h-4">
                        <label className="text-[11px] font-semibold text-foreground">
                          Prefixo da Tag
                        </label>
                      </div>
                      <Input
                        value={tagPrefix}
                        onChange={(e) => setTagPrefix(e.target.value.toUpperCase())}
                        placeholder="PAT-"
                        className="font-mono uppercase font-bold text-xs h-9 rounded-xl bg-background"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between h-4">
                        <label className="text-[11px] font-semibold text-foreground">
                          Nº Inicial Sequencial
                        </label>
                      </div>
                      <Input
                        type="number"
                        value={startNumber}
                        onChange={(e) => setStartNumber(parseInt(e.target.value) || 1)}
                        className="font-mono font-bold text-xs h-9 rounded-xl bg-background"
                      />
                    </div>
                  </div>

                  {/* Preview de Etiquetas */}
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto p-2 bg-background rounded-xl border border-border/80 text-[10px] font-mono font-bold">
                    {previewTags.slice(0, 10).map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-muted text-foreground border border-border/60">
                        #{tag}
                      </span>
                    ))}
                    {batchQuantity > 10 && (
                      <span className="px-2 py-0.5 text-muted-foreground italic">
                        + {batchQuantity - 10} unidades adicionais
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Alocação e Data para Equipamento */}
              {assetMode !== "CATALOG_ONLY" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between h-4">
                      <label className="text-xs font-semibold text-foreground">
                        Caixa de Armazenamento no Armário
                      </label>
                    </div>
                    <select
                      value={initialBoxId}
                      onChange={(e) => setInitialBoxId(e.target.value)}
                      className="w-full h-10 px-3 text-xs bg-background border border-input rounded-xl text-foreground focus:ring-2 focus:ring-primary outline-none font-medium cursor-pointer"
                    >
                      <option value="">Sem caixa inicial (Atribuir depois)</option>
                      {boxes.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.code} - {b.name} ({b.door?.name || "Porta"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between h-4">
                      <label className="text-xs font-semibold text-foreground">
                        Data de Aquisição / Entrada (Opcional)
                      </label>
                    </div>
                    <Input
                      type="date"
                      value={acquisitionDate}
                      onChange={(e) => setAcquisitionDate(e.target.value)}
                      className="h-10 text-xs rounded-xl bg-background"
                    />
                  </div>
                </div>
              )}
              </div>
            )
          )}

          {/* 5. DESCRIÇÃO / OBSERVAÇÕES TÉCNICAS */}
          <div className="space-y-1.5 pt-1 border-t border-border/60">
            <label className="text-xs font-semibold text-foreground">
              Descrição / Observações Técnicas (Opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Utilizado para laboratórios de informática e salas de aula..."
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
              className="h-10 px-6 text-xs font-bold rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25 gap-2 cursor-pointer"
            >
              <Package className="w-4 h-4" />
              <span>
                {isEditing
                  ? "Salvar Alterações"
                  : itemType === "ASSET_EQUIPMENT" && assetMode === "BATCH"
                  ? `Salvar Modelo e Gerar ${batchQuantity} Itens`
                  : "Salvar Item no Catálogo"}
              </span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
