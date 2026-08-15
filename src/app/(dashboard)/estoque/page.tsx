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
  Eye, 
  Archive, 
  ChevronRight,
  Sparkles
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { StockExitModal } from "@/components/inventory/stock-exit-modal";
import { StockEntryModal } from "@/components/inventory/stock-entry-modal";
import { StockTransferModal } from "@/components/inventory/stock-transfer-modal";
import { ItemFormModal } from "@/components/inventory/item-form-modal";
import { toast } from "sonner";

export default function EstoquePage() {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [allBoxes, setAllBoxes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
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
  }, [selectedCategory, selectedStatus]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Package className="w-6 h-6 text-primary" />
              <span>Estoque de Materiais & Insumos</span>
            </h1>
            <Badge variant="normal" className="text-xs">
              SSOT Ativa
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Controle de saldo, caixas físicas de armazenamento, entradas, saídas com garantia anti-negativo e transferências.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsItemFormOpen(true)}
            size="sm"
            className="gap-1.5 rounded-xl shadow-md shadow-primary/20 bg-gradient-to-r from-primary-600 to-indigo-600 text-white"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Novo Item</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4">
          <span className="text-xs font-semibold text-muted-foreground">Itens no Catálogo</span>
          <div className="text-xl font-bold font-mono text-foreground mt-0.5">
            {items.length}
          </div>
        </Card>

        <Card className="p-4">
          <span className="text-xs font-semibold text-muted-foreground">Total de Unidades</span>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
            {totalStockItems}
          </div>
        </Card>

        <Card className={`p-4 ${criticalItemsCount > 0 ? "border-rose-500/40 bg-rose-500/5" : ""}`}>
          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">Estoque Crítico</span>
          <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
            {criticalItemsCount}
          </div>
        </Card>

        <Card className={`p-4 ${lowItemsCount > 0 ? "border-amber-500/40 bg-amber-500/5" : ""}`}>
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Estoque Baixo</span>
          <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
            {lowItemsCount}
          </div>
        </Card>
      </div>

      {/* Barra de Busca e Filtros */}
      <Card className="p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex gap-2">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, SKU, modelo ou fabricante..."
              icon={<Search className="w-4 h-4 text-primary" />}
              className="text-xs"
            />
            <Button type="submit" size="sm" variant="outline" className="rounded-xl shrink-0">
              Buscar
            </Button>
          </form>

          {/* Filtro por Categoria */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs bg-background border border-input rounded-xl text-foreground font-medium outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto"
            >
              <option value="ALL">Todas as Categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c._count?.items || 0})
                </option>
              ))}
            </select>

            {/* Filtro por Status */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="px-3 py-2 text-xs bg-background border border-input rounded-xl text-foreground font-medium outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto"
            >
              <option value="ALL">Todos os Níveis</option>
              <option value="CRITICAL">🔴 Crítico</option>
              <option value="LOW">🟡 Baixo</option>
              <option value="NORMAL">🟢 Normal</option>
            </select>
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
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão Dar Baixa */}
                          {firstBox && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                setSelectedItemForExit({
                                  item,
                                  box: {
                                    id: firstBox.id,
                                    code: firstBox.code,
                                    name: firstBox.name,
                                    doorName: firstBox.door?.name,
                                    currentQuantity: firstBoxQty,
                                  },
                                })
                              }
                              disabled={firstBoxQty <= 0}
                              className="h-8 px-2 text-xs rounded-xl gap-1 shadow-sm"
                              title={`Dar baixa de ${item.name} na Caixa ${firstBox.code}`}
                            >
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                              <span>Baixar</span>
                            </Button>
                          )}

                          {/* Botão Entrada */}
                          {allBoxes.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setSelectedItemForEntry({
                                  item,
                                  box: firstBox || allBoxes[0],
                                })
                              }
                              className="h-8 px-2 text-xs rounded-xl gap-1"
                              title="Adicionar entrada de estoque"
                            >
                              <Plus className="w-3.5 h-3.5 text-emerald-500" />
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
