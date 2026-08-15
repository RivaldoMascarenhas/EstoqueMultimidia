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

export function ItemFormModal({
  isOpen,
  onClose,
  categories,
  boxes,
  onSuccess,
}: ItemFormModalProps) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [itemType, setItemType] = useState<"MATERIAL" | "ASSET_EQUIPMENT">("MATERIAL");
  const [unit, setUnit] = useState("UN");
  const [description, setDescription] = useState("");
  const [minStock, setMinStock] = useState(5);
  const [idealStock, setIdealStock] = useState(15);
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [initialBoxId, setInitialBoxId] = useState("");
  const [initialQuantity, setInitialQuantity] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

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
      if (categories.length > 0) setCategoryId(categories[0].id);
      if (boxes.length > 0) setInitialBoxId(boxes[0].id);
    }
  }, [isOpen, categories, boxes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !sku.trim() || !categoryId) {
      toast.error("Por favor, preencha os campos obrigatórios.");
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
          unit,
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
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Package className="w-5 h-5" />
            <DialogTitle className="text-base font-bold text-foreground">
              Cadastrar Novo Item no Catálogo
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Cadastre materiais de estoque ou tipos de equipamentos para o setor de TI da UniFAP.
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
                className="text-xs"
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
                className="font-mono uppercase font-bold text-xs"
              />
            </div>
          </div>

          {/* Categoria, Tipo e Unidade */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Categoria <span className="text-rose-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full h-10 px-3 py-2 text-xs bg-background border border-input rounded-xl text-foreground focus:ring-2 focus:ring-primary outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Tipo do Item
              </label>
              <select
                value={itemType}
                onChange={(e) => setItemType(e.target.value as any)}
                className="w-full h-10 px-3 py-2 text-xs bg-background border border-input rounded-xl text-foreground focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="MATERIAL">Material em Quantidade</option>
                <option value="ASSET_EQUIPMENT">Equipamento Patrimonial</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Unidade de Medida
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full h-10 px-3 py-2 text-xs bg-background border border-input rounded-xl text-foreground font-mono focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="UN">Unidade (UN)</option>
                <option value="M">Metros (M)</option>
                <option value="CX">Caixa (CX)</option>
                <option value="PC">Peça (PC)</option>
                <option value="PAR">Par (PAR)</option>
              </select>
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
                className="font-mono text-xs"
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
                className="font-mono text-xs"
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
                className="text-xs"
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
                className="text-xs"
              />
            </div>
          </div>

          {/* Alocação Inicial na Caixa */}
          {itemType === "MATERIAL" && (
            <div className="p-3.5 rounded-2xl border border-border/80 bg-muted/30 space-y-3">
              <span className="text-xs font-bold text-foreground block">
                Alocação Física Inicial (Opcional)
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Caixa no Armário
                  </label>
                  <select
                    value={initialBoxId}
                    onChange={(e) => setInitialBoxId(e.target.value)}
                    className="w-full h-9 px-3 py-1.5 text-xs bg-background border border-input rounded-xl text-foreground focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="">Nenhuma (guardar depois)</option>
                    {boxes.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} - {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Quantidade Inicial ({unit})
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={initialQuantity}
                    onChange={(e) => setInitialQuantity(parseInt(e.target.value) || 0)}
                    disabled={!initialBoxId}
                    className="h-9 font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Descrição */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Descrição / Observações Técnicas
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Especificações do material, blindagem, compatibilidade..."
              rows={2}
              className="w-full px-3 py-2 text-xs bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary transition-all resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="rounded-xl">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} isLoading={isLoading} className="rounded-xl gap-1.5">
              <span>Cadastrar Item</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
