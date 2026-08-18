"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  ArrowDownLeft, 
  RefreshCw, 
  AlertTriangle, 
  Loader2, 
  CheckCircle2, 
  Sparkles
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { StockExitModal } from "@/components/inventory/stock-exit-modal";
import { StockEntryModal } from "@/components/inventory/stock-entry-modal";
import { ItemFormModal } from "@/components/inventory/item-form-modal";
import { Tooltip } from "@/components/ui/tooltip";
import { toast } from "sonner";

export default function EstoquePage() {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [allBoxes, setAllBoxes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedBox, setSelectedBox] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | "CRITICAL" | "LOW" | "NORMAL">("ALL");

  // Modais de Ação
  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [selectedItemForExit, setSelectedItemForExit] = useState<any | null>(null);
  const [selectedItemForEntry, setSelectedItemForEntry] = useState<any | null>(null);
  const [selectedItemForTransfer, setSelectedItemForTransfer] = useState<any | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (selectedCategory !== "ALL") params.append("categoryId", selectedCategory);
      if (selectedBox !== "ALL") params.append("boxId", selectedBox);
      if (selectedStatus !== "ALL") params.append("status", selectedStatus);

      const [itemsRes, catRes, boxesRes] = await Promise.all([
        fetch(`/api/v1/items?${params.toString()}`),
        fetch(`/api/v1/categories`),
        fetch(`/api/v1/boxes`),
      ]);

      const itemsJson = await itemsRes.json();
      const catJson = await catRes.json();
      const boxesJson = await boxesRes.json();

      if (itemsJson.success) setItems(itemsJson.data);
      if (catJson.success) setCategories(catJson.data);
      if (boxesJson.success) setAllBoxes(boxesJson.data);

      setIsLoading(false);
    } catch (err: any) {
      toast.error("Erro ao carregar dados de estoque.");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCategory, selectedBox, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  // Contagens para os KPIs rápidos
  const totalStockItems = items.reduce((acc, i) => acc + i.totalQuantity, 0);
  const criticalItemsCount = items.filter((i) => i.isCritical).length;
  const lowItemsCount = items.filter((i) => i.isLow).length;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
              <span>Estoque & Insumos</span>
            </h1>
            <Badge variant="normal" className="text-[11px] font-semibold px-2 py-0.5">
              SSOT Ativa
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Controle de saldo, caixas físicas, entradas, saídas e transferências com rastreabilidade total.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={() => setIsItemFormOpen(true)}
            size="sm"
            className="w-full sm:w-auto gap-1.5 rounded-xl shadow-md shadow-primary/20 bg-gradient-to-r from-primary-600 to-indigo-600 text-white h-10 sm:h-9 text-xs font-semibold justify-center"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Novo Item</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <Card className="p-3.5 sm:p-4 rounded-2xl border-border/80 shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground">Itens no Catálogo</span>
          <div className="text-xl font-bold font-mono text-foreground mt-0.5">
            {items.length}
          </div>
        </Card>

        <Card className="p-3.5 sm:p-4 rounded-2xl border-border/80 shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground">Total de Unidades</span>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
            {totalStockItems}
          </div>
        </Card>

        <Card className={`p-3.5 sm:p-4 rounded-2xl border-border/80 shadow-xs ${criticalItemsCount > 0 ? "border-rose-500/40 bg-rose-500/5" : ""}`}>
          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">Estoque Crítico</span>
          <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
            {criticalItemsCount}
          </div>
        </Card>

        <Card className={`p-3.5 sm:p-4 rounded-2xl border-border/80 shadow-xs ${lowItemsCount > 0 ? "border-amber-500/40 bg-amber-500/5" : ""}`}>
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Estoque Baixo</span>
          <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
            {lowItemsCount}
          </div>
        </Card>
      </div>

      {/* Barra de Busca e Filtros */}
      <Card className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border-border/80 shadow-xs">
        <div className="flex flex-col gap-3">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, SKU, modelo ou fabricante..."
                icon={<Search className="w-4 h-4 text-primary" />}
                className="h-10 text-xs rounded-xl"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              className="h-10 px-4 text-xs font-semibold rounded-xl bg-primary text-primary-foreground shadow-xs shrink-0 gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Buscar</span>
            </Button>
          </form>

          {/* Filtros Dropdown em Grid Responsivo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Filtro por Caixa */}
            <select
              value={selectedBox}
              onChange={(e) => setSelectedBox(e.target.value)}
              className="h-10 px-3 text-xs bg-background border border-input rounded-xl text-foreground font-medium outline-none focus:ring-2 focus:ring-primary w-full"
            >
              <option value="ALL">📦 Todas as Caixas</option>
              {allBoxes.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} - {b.name} ({b.door?.name || "Porta"})
                </option>
              ))}
            </select>

            {/* Filtro por Categoria */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-10 px-3 text-xs bg-background border border-input rounded-xl text-foreground font-medium outline-none focus:ring-2 focus:ring-primary w-full"
            >
              <option value="ALL">Todas as Categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c._count?.items || 0})
                </option>
              ))}
            </select>

            {/* Filtro por Status + Limpar */}
            <div className="flex items-center gap-1.5">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                className="h-10 px-3 text-xs bg-background border border-input rounded-xl text-foreground font-medium outline-none focus:ring-2 focus:ring-primary flex-1"
              >
                <option value="ALL">Todos os Níveis</option>
                <option value="CRITICAL">🔴 Crítico</option>
                <option value="LOW">🟡 Baixo</option>
                <option value="NORMAL">🟢 Normal</option>
              </select>

              {(searchTerm || selectedCategory !== "ALL" || selectedBox !== "ALL" || selectedStatus !== "ALL") && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCategory("ALL");
                    setSelectedBox("ALL");
                    setSelectedStatus("ALL");
                  }}
                  className="h-10 px-2 text-xs text-muted-foreground hover:text-foreground rounded-xl shrink-0"
                  title="Limpar filtros"
                >
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Tabela de Estoque */}
      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-16 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Consultando estoque em tempo real...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Package className="w-10 h-10 text-muted-foreground mx-auto" />
              <h3 className="text-sm font-semibold text-foreground">Nenhum item encontrado</h3>
              <p className="text-xs text-muted-foreground">
                Tente alterar os filtros de busca ou cadastre um novo item.
              </p>
              <Button size="sm" onClick={() => setIsItemFormOpen(true)} className="rounded-xl">
                Cadastrar Item
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Item / Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Localização Física</TableHead>
                  <TableHead>Saldo Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações de Estoque</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const hasStock = item.totalQuantity > 0;
                  const firstBox = item.inventories[0]?.box;
                  const firstBoxQty = item.inventories[0]?.quantity || 0;

                  return (
                    <TableRow key={item.id}>
                      {/* SKU */}
                      <TableCell className="font-mono font-bold text-xs text-primary">
                        {item.sku}
                      </TableCell>

                      {/* Nome do Item */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-xs text-foreground">
                            {item.name}
                          </span>
                          {item.manufacturer && (
                            <span className="text-[10px] text-muted-foreground">
                              {item.manufacturer} {item.model && `• ${item.model}`}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Categoria */}
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {item.category?.name}
                        </Badge>
                      </TableCell>

                      {/* Localização Física (Caixas) */}
                      <TableCell>
                        {item.inventories.length === 0 ? (
                          <span className="text-[10px] text-muted-foreground/60 italic">
                            Sem caixa atribuída
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {item.inventories.map((inv: any) => (
                              <Link
                                key={inv.id}
                                href={`/caixas/${inv.box.code}`}
                                className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-muted hover:bg-primary/15 hover:text-primary transition-colors border border-border/60"
                                title={`${inv.box.door?.name} • ${inv.quantity} ${item.unit}`}
                              >
                                <span>{inv.box.code}</span>
                                <span className="text-emerald-600 dark:text-emerald-400">({inv.quantity})</span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </TableCell>

                      {/* Saldo Total */}
                      <TableCell>
                        <div className="flex flex-col font-mono">
                          <span className="font-bold text-xs text-foreground">
                            {item.totalQuantity} {item.unit}
                          </span>
                          <span className="text-[9px] text-muted-foreground">
                            Mín: {item.minStock} • Ideal: {item.idealStock}
                          </span>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge
                          variant={
                            item.statusLevel === "CRITICAL"
                              ? "critical"
                              : item.statusLevel === "LOW"
                              ? "low"
                              : "normal"
                          }
                          dot
                          className="text-[10px]"
                        >
                          {item.statusLevel === "CRITICAL"
                            ? "Crítico"
                            : item.statusLevel === "LOW"
                            ? "Baixo"
                            : "Normal"}
                        </Badge>
                      </TableCell>

                      {/* Ações */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Botão Saída */}
                          {item.itemType === "ASSET_EQUIPMENT" ? (
                            <Tooltip
                              content="Equipamento de patrimônio — saída registrada via Empréstimo ou vinculação em Sala"
                              side="top"
                            >
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled
                                className="h-8 px-3 text-xs font-semibold rounded-xl gap-1.5 bg-muted text-muted-foreground border border-border shadow-xs opacity-50 cursor-not-allowed pointer-events-none"
                              >
                                <ArrowDownLeft className="w-3.5 h-3.5" />
                                <span>Saída</span>
                              </Button>
                            </Tooltip>
                          ) : (
                            <Tooltip
                              content={
                                !firstBox || firstBoxQty <= 0
                                  ? "Sem estoque disponível nas caixas para este material"
                                  : `Registrar saída de ${item.name} (${firstBox.code})`
                              }
                              side="top"
                            >
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (firstBox) {
                                    setSelectedItemForExit({
                                      item,
                                      box: {
                                        id: firstBox.id,
                                        code: firstBox.code,
                                        name: firstBox.name,
                                        doorName: firstBox.door?.name,
                                        currentQuantity: firstBoxQty,
                                      },
                                    });
                                  }
                                }}
                                disabled={!firstBox || firstBoxQty <= 0}
                                className="h-8 px-3 text-xs font-semibold rounded-xl gap-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:border-rose-500/50 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                              >
                                <ArrowDownLeft className="w-3.5 h-3.5" />
                                <span>Saída</span>
                              </Button>
                            </Tooltip>
                          )}

                          {/* Botão Entrada */}
                          {allBoxes.length > 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setSelectedItemForEntry({
                                  item,
                                  box: firstBox || allBoxes[0],
                                })
                              }
                              className="h-8 px-3 text-xs font-semibold rounded-xl gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/50 shadow-xs"
                              title="Adicionar entrada de estoque"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Entrada</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modais de Operação */}
      {isItemFormOpen && (
        <ItemFormModal
          isOpen={isItemFormOpen}
          onClose={() => setIsItemFormOpen(false)}
          categories={categories}
          boxes={allBoxes}
          onSuccess={fetchData}
        />
      )}

      {selectedItemForExit && (
        <StockExitModal
          isOpen={!!selectedItemForExit}
          onClose={() => setSelectedItemForExit(null)}
          item={selectedItemForExit.item}
          box={selectedItemForExit.box}
          onSuccess={fetchData}
        />
      )}

      {selectedItemForEntry && (
        <StockEntryModal
          isOpen={!!selectedItemForEntry}
          onClose={() => setSelectedItemForEntry(null)}
          item={selectedItemForEntry.item}
          box={selectedItemForEntry.box}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}
