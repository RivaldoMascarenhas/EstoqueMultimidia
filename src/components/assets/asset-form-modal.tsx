"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { 
  Monitor, 
  Plus, 
  ChevronDown, 
  Sparkles, 
  Layers, 
  Pencil,
  QrCode,
  MapPin,
  Calendar,
  DollarSign,
  ShieldCheck,
  FileText,
  Building2,
  Tag,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Wrench,
  Boxes,
  Info
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { ItemFormModal } from "@/components/inventory/item-form-modal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CatalogItemOption {
  id: string;
  name: string;
  sku: string;
  manufacturer?: string | null;
  model?: string | null;
  category?: { name: string } | null;
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
  const { data: session } = useSession();
  const userRole = session?.user?.role || "OPERADOR";
  const canEditItem = userRole === "ADMIN" || userRole === "GESTOR";

  const [mode, setMode] = useState<"SINGLE" | "BATCH">("SINGLE");
  const [activeTab, setActiveTab] = useState<"IDENTIFICATION" | "LOCATION" | "FINANCIAL">("IDENTIFICATION");

  // Campos do Ativo Individual
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

  // Modal aninhado para criar ou editar modelo no catálogo
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [internalCategories, setInternalCategories] = useState<CategoryOption[]>(categories);

  const isEditing = !!assetToEdit;
  const selectedCatalogItem = catalogItems.find((i) => i.id === itemId);

  useEffect(() => {
    if (isOpen) {
      setActiveTab("IDENTIFICATION");
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

  // Preview das etiquetas geradas no modo Lote
  const previewTags = useMemo(() => {
    if (mode !== "BATCH") return [];
    const count = Math.min(Math.max(1, batchQuantity || 1), 100);
    const prefix = (tagPrefix || "PAT-").toUpperCase().trim();
    const list: string[] = [];

    for (let i = 0; i < count; i++) {
      if (generationType === "SEQUENTIAL") {
        const num = (startNumber || 1001) + i;
        list.push(`${prefix}${String(num).padStart(6, "0")}`);
      } else {
        list.push(generateRandomTag(prefix));
      }
    }
    return list;
  }, [mode, batchQuantity, tagPrefix, generationType, startNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "SINGLE" && !assetTag.trim()) {
      toast.error("Informe o número de tombamento (patrimônio).");
      return;
    }

    if (!itemId) {
      toast.error("Selecione o modelo do catálogo correspondente.");
      return;
    }

    try {
      setIsLoading(true);

      if (isEditing) {
        // Atualização de Equipamento Existente
        const res = await fetch(`/api/v1/assets/${assetToEdit.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assetTag: assetTag.trim().toUpperCase(),
            itemId,
            serialNumber: serialNumber.trim() || null,
            model: model.trim() || null,
            currentBoxId: currentBoxId || null,
            acquisitionDate: purchaseDate ? new Date(purchaseDate).toISOString() : null,
            acquisitionValue: purchaseValue ? Number(purchaseValue) : null,
            notes: notes.trim() || null,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          toast.error(json.error || "Erro ao atualizar dados do equipamento.");
          setIsLoading(false);
          return;
        }

        toast.success(json.message || `✓ Equipamento #${assetTag} atualizado com sucesso!`);
      } else if (mode === "SINGLE") {
        // Cadastro Individual
        const res = await fetch("/api/v1/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assetTag: assetTag.trim().toUpperCase(),
            itemId,
            serialNumber: serialNumber.trim() || undefined,
            model: model.trim() || undefined,
            currentBoxId: currentBoxId || undefined,
            acquisitionDate: purchaseDate ? new Date(purchaseDate).toISOString() : undefined,
            acquisitionValue: purchaseValue ? Number(purchaseValue) : undefined,
            warrantyExpiry: warrantyExpiry || undefined,
            notes: notes.trim() || undefined,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          toast.error(json.error || "Erro ao cadastrar equipamento.");
          setIsLoading(false);
          return;
        }

        toast.success(json.message || `✓ Equipamento #${assetTag} cadastrado com sucesso!`);
      } else {
        // Cadastro em Lote
        const res = await fetch("/api/v1/assets/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId,
            quantity: Number(batchQuantity),
            tagPrefix: tagPrefix.trim().toUpperCase(),
            startNumber: generationType === "SEQUENTIAL" ? Number(startNumber) : undefined,
            model: model.trim() || undefined,
            currentBoxId: currentBoxId || undefined,
            purchaseDate: purchaseDate ? new Date(purchaseDate).toISOString() : undefined,
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

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "AVAILABLE":
        return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">Disponível no Armário</Badge>;
      case "LOANED":
        return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-bold">Emprestado / Em Uso</Badge>;
      case "IN_MAINTENANCE":
      case "MAINTENANCE":
        return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px] font-bold">Em Manutenção Técnica</Badge>;
      case "DAMAGED":
        return <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[10px] font-bold">Avariado / Danificado</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px] font-bold">Ativo</Badge>;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-3xl bg-card border-border shadow-2xl">
          <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
            
            {/* Header com Design Institucional */}
            <DialogHeader className="p-6 pb-4 border-b border-border/80 shrink-0 space-y-2 bg-muted/20">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                        {isEditing ? `Editar Equipamento` : "Novo Equipamento"}
                      </DialogTitle>
                      {isEditing && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-black text-xs border border-primary/25">
                          #{assetToEdit.assetTag}
                        </span>
                      )}
                    </div>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      {isEditing
                        ? "Atualize a identificação, localização e dados cadastrais desta unidade patrimonial."
                        : "Cadastre ativos individuais ou em lote com alocação física no armário."}
                    </DialogDescription>
                  </div>
                </div>

                {isEditing && (
                  <div className="shrink-0 self-start">
                    {getStatusBadge(assetToEdit.status)}
                  </div>
                )}
              </div>

              {/* Seletor de Modo na Criação */}
              {!isEditing && (
                <div className="grid grid-cols-2 p-1 bg-muted/60 rounded-2xl border border-border/60 text-xs font-semibold mt-2">
                  <button
                    type="button"
                    onClick={() => setMode("SINGLE")}
                    className={cn(
                      "py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                      mode === "SINGLE"
                        ? "bg-card text-foreground shadow-xs font-bold border border-border/60"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Unidade Individual (1 Item)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("BATCH")}
                    className={cn(
                      "py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                      mode === "BATCH"
                        ? "bg-primary text-primary-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Em Lote (Múltiplas Unidades)</span>
                  </button>
                </div>
              )}
            </DialogHeader>

            {/* Abas de Navegação Rápida (quando editando) */}
            {isEditing && (
              <div className="flex border-b border-border/70 px-6 bg-muted/10 gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab("IDENTIFICATION")}
                  className={cn(
                    "py-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer",
                    activeTab === "IDENTIFICATION"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>1. Identificação</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("LOCATION")}
                  className={cn(
                    "py-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer",
                    activeTab === "LOCATION"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>2. Localização & Armário</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("FINANCIAL")}
                  className={cn(
                    "py-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer",
                    activeTab === "FINANCIAL"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>3. Dados Fiscais & Notas</span>
                </button>
              </div>
            )}

            {/* Conteúdo Scrollável do Formulário */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              
              {/* SEÇÃO 1: IDENTIFICAÇÃO DO EQUIPAMENTO */}
              {(!isEditing || activeTab === "IDENTIFICATION") && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Tombamento */}
                    {mode === "SINGLE" ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-foreground flex items-center gap-1">
                            <Tag className="w-3.5 h-3.5 text-primary" />
                            <span>Nº de Tombamento (Patrimônio) *</span>
                          </label>
                          {!isEditing && (
                            <button
                              type="button"
                              onClick={() => setAssetTag(generateRandomTag())}
                              className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                              title="Gerar código aleatório"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Gerar Novo</span>
                            </button>
                          )}
                        </div>
                        <Input
                          value={assetTag}
                          onChange={(e) => setAssetTag(e.target.value.toUpperCase())}
                          placeholder="Ex: PAT-001004"
                          required
                          className="font-mono uppercase font-black text-xs sm:text-sm h-10 rounded-xl bg-background tracking-wider"
                        />
                      </div>
                    ) : (
                      /* Configuração de Lote */
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-foreground">
                          Quantidade a Cadastrar *
                        </label>
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            min={1}
                            max={200}
                            value={batchQuantity}
                            onChange={(e) => setBatchQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            required
                            className="font-bold text-xs h-10 rounded-xl bg-background w-20 text-center font-mono"
                          />
                          <div className="flex items-center gap-1 flex-1">
                            {[5, 10, 20, 50].map((qty) => (
                              <button
                                key={qty}
                                type="button"
                                onClick={() => setBatchQuantity(qty)}
                                className={cn(
                                  "flex-1 h-10 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                                  batchQuantity === qty
                                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                    : "bg-muted/40 border-border/80 text-muted-foreground hover:text-foreground"
                                )}
                              >
                                {qty}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Modelo no Catálogo */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground flex items-center gap-1">
                        <Boxes className="w-3.5 h-3.5 text-primary" />
                        <span>Tipo / Modelo no Catálogo *</span>
                      </label>
                      <div className="relative">
                        <select
                          value={itemId}
                          onChange={(e) => setItemId(e.target.value)}
                          required
                          className="w-full h-10 pl-3 pr-10 text-xs bg-background border border-input rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-primary outline-none appearance-none cursor-pointer"
                        >
                          {catalogItems.length === 0 ? (
                            <option value="">Nenhum modelo cadastrado</option>
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

                  {/* Card Informativo do Modelo Selecionado (Evita abrir modal complexo sem necessidade) */}
                  {selectedCatalogItem && (
                    <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-foreground text-xs">
                            {selectedCatalogItem.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-mono text-[10px] font-bold border border-border/60">
                            SKU: {selectedCatalogItem.sku}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Fabricante: <strong>{selectedCatalogItem.manufacturer || "Genérico / Não informado"}</strong>
                          {selectedCatalogItem.category?.name ? ` • Categoria: ${selectedCatalogItem.category.name}` : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        {canEditItem && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingItem(selectedCatalogItem);
                              setIsItemModalOpen(true);
                            }}
                            className="h-8 px-2.5 text-[11px] rounded-xl font-semibold gap-1 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 cursor-pointer"
                            title="Editar especificações globais deste modelo"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Editar Modelo</span>
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingItem(null);
                            setIsItemModalOpen(true);
                          }}
                          className="h-8 px-2.5 text-[11px] rounded-xl font-semibold gap-1 text-primary border-primary/30 hover:bg-primary/10 cursor-pointer"
                          title="Cadastrar um novo modelo de equipamento"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Novo Modelo</span>
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Detalhes Específicos Desta Unidade (S/N e Versão) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {mode === "SINGLE" && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">
                          Número de Série do Fabricante (S/N)
                        </label>
                        <Input
                          value={serialNumber}
                          onChange={(e) => setSerialNumber(e.target.value)}
                          placeholder="Ex: SN-EPSON-4129"
                          className="font-mono text-xs h-10 rounded-xl bg-background"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Versão / Especificação Desta Unidade
                      </label>
                      <Input
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="Ex: PowerLite X49 (Branco, Bivolt)"
                        className="text-xs h-10 rounded-xl bg-background"
                      />
                    </div>
                  </div>

                  {/* Painel do Modo Lote */}
                  {mode === "BATCH" && (
                    <div className="p-4 rounded-2xl bg-muted/30 border border-border/80 space-y-3">
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

                      {/* Prévia das Etiquetas */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                          <span>Prévia das {batchQuantity} etiquetas sequenciais:</span>
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
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SEÇÃO 2: LOCALIZAÇÃO & ARMAZENAMENTO */}
              {(!isEditing || activeTab === "LOCATION") && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      <span>Localização / Caixa Física no Armário Inteligente</span>
                    </label>
                    <div className="relative">
                      <select
                        value={currentBoxId}
                        onChange={(e) => setCurrentBoxId(e.target.value)}
                        className="w-full h-10 pl-3 pr-10 text-xs bg-background border border-input rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-primary outline-none appearance-none cursor-pointer"
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
                    <p className="text-[11px] text-muted-foreground">
                      Define em qual gaveta/caixa do totem ou armário este equipamento será guardado para leitura por QR Code.
                    </p>
                  </div>
                </div>
              )}

              {/* SEÇÃO 3: DADOS FISCAIS & OBSERVAÇÕES */}
              {(!isEditing || activeTab === "FINANCIAL") && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-primary" />
                        <span>Data de Compra</span>
                      </label>
                      <Input
                        type="date"
                        value={purchaseDate}
                        onChange={(e) => setPurchaseDate(e.target.value)}
                        className="text-xs h-10 rounded-xl bg-background"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-primary" />
                        <span>{mode === "BATCH" ? "Valor Unitário (R$)" : "Valor Aquisição (R$)"}</span>
                      </label>
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
                      <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-primary" />
                        <span>Garantia até</span>
                      </label>
                      <Input
                        type="date"
                        value={warrantyExpiry}
                        onChange={(e) => setWarrantyExpiry(e.target.value)}
                        className="text-xs h-10 rounded-xl bg-background"
                      />
                    </div>
                  </div>

                  {/* Observações / Acessórios */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      <span>Acessórios Inclusos & Observações de Conservação</span>
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ex: Acompanha controle remoto, cabo de força 3 pinos, adaptador HDMI e bolsa de transporte original..."
                      rows={3}
                      className="w-full px-3.5 py-2.5 text-xs bg-background border border-input rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none leading-relaxed"
                    />
                  </div>
                </div>
              )}

            </div>

            {/* Footer com Botões de Ação */}
            <DialogFooter className="p-4 sm:p-5 border-t border-border/80 bg-muted/20 flex items-center justify-between sm:justify-between gap-3 shrink-0">
              <div className="text-[11px] text-muted-foreground hidden sm:block">
                {isEditing ? "Alterações gravadas na trilha de auditoria." : "O ativo estará disponível após salvar."}
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
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
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isEditing
                      ? "Salvar Alterações"
                      : mode === "BATCH"
                      ? `Cadastrar Lote (${batchQuantity} Itens)`
                      : "Cadastrar Equipamento"}
                  </span>
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Criação / Edição de Modelo de Catálogo */}
      <ItemFormModal
        isOpen={isItemModalOpen}
        onClose={() => {
          setIsItemModalOpen(false);
          setEditingItem(null);
        }}
        categories={internalCategories}
        boxes={boxes}
        itemToEdit={editingItem}
        onSuccess={() => {
          setIsItemModalOpen(false);
          setEditingItem(null);
          if (onRefreshCatalog) onRefreshCatalog();
        }}
      />
    </>
  );
}
