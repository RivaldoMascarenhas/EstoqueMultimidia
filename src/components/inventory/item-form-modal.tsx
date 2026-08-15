"use client";

import React, { useState, useEffect } from "react";
import { Package, Plus, Loader2, Check, X, Tag, Monitor, Layers, Box, CheckCircle2, Sliders } from "lucide-react";
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
  { value: "CUSTOM", label: "✏️ Outra Unidade..." },
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

  // Campos específicos de Equipamento Patrimonial
  const [assetTag, setAssetTag] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [acquisitionDate, setAcquisitionDate] = useState("");

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
      setAssetTag("");
      setSerialNumber("");
      setAcquisitionDate("");
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

    if (itemType === "ASSET_EQUIPMENT" && !assetTag.trim()) {
      toast.error("Por favor, informe o número de tombamento/patrimônio do equipamento.");
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
          initialQuantity: itemType === "MATERIAL" && initialQuantity > 0 ? initialQuantity : undefined,
          assetTag: itemType === "ASSET_EQUIPMENT" && assetTag.trim() ? assetTag.trim().toUpperCase() : undefined,
          serialNumber: itemType === "ASSET_EQUIPMENT" && serialNumber.trim() ? serialNumber.trim() : undefined,
          acquisitionDate: itemType === "ASSET_EQUIPMENT" && acquisitionDate ? acquisitionDate : undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error || "Erro ao cadastrar item.");
        setIsLoading(false);
        return;
      }

      toast.success(
        itemType === "ASSET_EQUIPMENT"
          ? `✓ Equipamento '${name}' (#${assetTag.trim().toUpperCase()}) tombado com sucesso!`
          : `✓ Item '${name}' cadastrado com sucesso!`
      );
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error("Erro inesperado de comunicação com o servidor.");
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-3xl bg-card border-border shadow-2xl space-y-6">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2.5 text-primary">
            <div className="p-2 rounded-2xl bg-primary/10 border border-primary/20">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Cadastrar Novo Item no Catálogo
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Adicione materiais de estoque, cabos, periféricos ou equipamentos para o setor de TI & Multimídia.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
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
                onClick={() => setItemType("MATERIAL")}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all ${
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
                onClick={() => setItemType("ASSET_EQUIPMENT")}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all ${
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
                    Projetores, caixas ativas e aparelhos com etiqueta de patrimônio.
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
                <label className="text-xs font-semibold text-foreground">
                  Nome do Item <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Cabo HDMI 10 metros com blindagem"
                  required
                  className="h-11 text-xs rounded-xl"
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
                  className="h-11 font-mono uppercase font-bold text-xs rounded-xl"
                />
              </div>
            </div>

            {/* Categoria e Unidade de Medida (2 Colunas Espaçosas) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Categoria com Botão Inline */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Categoria <span className="text-rose-500">*</span>
                  </label>
                  {!isCreatingCategory && (
                    <button
                      type="button"
                      onClick={() => setIsCreatingCategory(true)}
                      className="text-[11px] text-primary hover:underline font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Nova Categoria</span>
                    </button>
                  )}
                </div>

                {isCreatingCategory ? (
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Nome da categoria..."
                      className="h-11 text-xs rounded-xl"
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="icon"
                      onClick={handleCreateCategory}
                      disabled={isSavingCategory}
                      className="h-11 w-11 shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                      title="Salvar nova categoria"
                    >
                      {isSavingCategory ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => setIsCreatingCategory(false)}
                      className="h-11 w-11 shrink-0 rounded-xl text-muted-foreground"
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
                    className="w-full h-11 px-3 text-xs bg-background border border-input rounded-xl text-foreground focus:ring-2 focus:ring-primary outline-none font-medium"
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
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Unidade de Medida
                  </label>
                  {unitSelect !== "CUSTOM" ? (
                    <button
                      type="button"
                      onClick={() => setUnitSelect("CUSTOM")}
                      className="text-[11px] text-primary hover:underline font-bold flex items-center gap-1"
                    >
                      <span>+ Digitar Outra</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setUnitSelect("UN")}
                      className="text-[11px] text-muted-foreground hover:underline"
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
                      placeholder="Ex: ROLO, PAR, KIT, TUBO..."
                      maxLength={10}
                      className="h-11 text-xs font-mono uppercase font-bold rounded-xl"
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => setUnitSelect("UN")}
                      className="h-11 w-11 shrink-0 rounded-xl text-muted-foreground"
                      title="Voltar para lista"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <select
                    value={unitSelect}
                    onChange={(e) => setUnitSelect(e.target.value)}
                    className="w-full h-11 px-3 text-xs bg-background border border-input rounded-xl text-foreground font-mono focus:ring-2 focus:ring-primary outline-none font-medium"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Estoque Mínimo (Alerta de Atenção)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={minStock}
                  onChange={(e) => setMinStock(parseInt(e.target.value) || 0)}
                  className="h-11 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Estoque Ideal (Meta de Armazenamento)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={idealStock}
                  onChange={(e) => setIdealStock(parseInt(e.target.value) || 0)}
                  className="h-11 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Fabricante / Marca (Opcional)
                </label>
                <Input
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  placeholder="Ex: PlusCable, Epson, Shure, Sony"
                  className="h-11 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Modelo / Versão (Opcional)
                </label>
                <Input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Ex: High Speed 2.0 / X49"
                  className="h-11 text-xs rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* 4. DADOS DE TOMBAMENTO & ARMAZENAMENTO INICIAL */}
          {itemType === "MATERIAL" ? (
            <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-3">
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground">
                  Local de Armazenamento Inicial no Armário (Opcional)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">
                    Caixa Física do Armário
                  </label>
                  <select
                    value={initialBoxId}
                    onChange={(e) => setInitialBoxId(e.target.value)}
                    className="w-full h-11 px-3 text-xs bg-background border border-input rounded-xl text-foreground focus:ring-2 focus:ring-primary outline-none font-medium"
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
                  <label className="text-xs text-muted-foreground font-medium">
                    Quantidade Inicial ({finalUnit})
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={initialQuantity}
                    onChange={(e) => setInitialQuantity(parseInt(e.target.value) || 0)}
                    disabled={!initialBoxId}
                    placeholder="0"
                    className="h-11 text-xs rounded-xl font-bold font-mono"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-primary/5 border-2 border-primary/30 space-y-4">
              <div className="flex items-center justify-between border-b border-primary/20 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground">
                      Tombamento do Equipamento (Patrimônio)
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Cadastre o primeiro exemplar deste modelo já com a plaqueta de identificação
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase text-primary bg-primary/15 px-2 py-0.5 rounded-md">
                  Item Rastreável
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Número de Tombamento / Plaqueta <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    value={assetTag}
                    onChange={(e) => setAssetTag(e.target.value.toUpperCase())}
                    placeholder="Ex: 123458 ou UNIFAP-0982"
                    className="h-11 font-mono uppercase font-bold text-xs rounded-xl bg-background border-primary/40 focus:border-primary"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Código da etiqueta de patrimônio fixada no equipamento.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Número de Série (S/N) (Opcional)
                  </label>
                  <Input
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="Ex: S/N: EPX-9872134"
                    className="h-11 font-mono text-xs rounded-xl bg-background"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Número de série gravado pelo fabricante.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Caixa de Armazenamento Inicial no Armário
                  </label>
                  <select
                    value={initialBoxId}
                    onChange={(e) => setInitialBoxId(e.target.value)}
                    className="w-full h-11 px-3 text-xs bg-background border border-input rounded-xl text-foreground focus:ring-2 focus:ring-primary outline-none font-medium"
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
                  <label className="text-xs font-semibold text-foreground">
                    Data de Aquisição / Entrada (Opcional)
                  </label>
                  <Input
                    type="date"
                    value={acquisitionDate}
                    onChange={(e) => setAcquisitionDate(e.target.value)}
                    className="h-11 text-xs rounded-xl bg-background"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 5. DESCRIÇÃO / OBSERVAÇÕES TÉCNICAS */}
          <div className="space-y-1.5 pt-1 border-t border-border/60">
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

          <DialogFooter className="pt-3 border-t border-border/80 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-xl px-5 h-11"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              isLoading={isLoading}
              className="rounded-xl bg-primary text-primary-foreground font-bold shadow-md shadow-primary/25 gap-2 px-6 h-11"
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
