"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  Package, 
  Tag, 
  Handshake, 
  Wrench, 
  ArrowRight, 
  X, 
  Boxes, 
  Sparkles
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchEntry {
  type: "ASSET" | "ITEM" | "BOX" | "LOAN" | "MAINTENANCE";
  url: string;
  data: any;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    items: any[];
    assets: any[];
    boxes: any[];
    loans: any[];
    maintenances: any[];
  }>({
    items: [],
    assets: [],
    boxes: [],
    loans: [],
    maintenances: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Flattened entries list for arrow navigation
  const flatEntries: SearchEntry[] = [
    ...results.assets.map((asset) => ({
      type: "ASSET" as const,
      url: `/patrimonio?search=${asset.assetTag}`,
      data: asset,
    })),
    ...results.items.map((item) => ({
      type: "ITEM" as const,
      url: `/estoque?search=${item.sku || item.name}`,
      data: item,
    })),
    ...results.boxes.map((box) => ({
      type: "BOX" as const,
      url: `/caixas/${box.code}`,
      data: box,
    })),
    ...results.loans.map((loan) => ({
      type: "LOAN" as const,
      url: `/emprestimos?search=${loan.borrowerName}`,
      data: loan,
    })),
    ...results.maintenances.map((m) => ({
      type: "MAINTENANCE" as const,
      url: `/manutencao?search=${m.orderNumber || m.asset?.assetTag}`,
      data: m,
    })),
  ];

  // Foco automático ao abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setQuery("");
      setResults({ items: [], assets: [], boxes: [], loans: [], maintenances: [] });
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounced fetch
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults({ items: [], assets: [], boxes: [], loans: [], maintenances: [] });
      setIsLoading(false);
      setSelectedIndex(0);
      return;
    }

    setIsLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        if (json.success) {
          setResults(json.data);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error("Erro na busca global:", err);
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Teclado: Navegação com Setas Cima/Baixo e Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (flatEntries.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % flatEntries.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatEntries.length) % flatEntries.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatEntries[selectedIndex]) {
        handleSelect(flatEntries[selectedIndex].url);
      }
    }
  };

  const handleSelect = (url: string) => {
    onClose();
    router.push(url);
  };

  const totalResults = flatEntries.length;

  const getAssetBadge = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return <Badge variant="available" className="text-xs">Disponível</Badge>;
      case "IN_USE":
        return <Badge variant="in_use" className="text-xs">Em Uso</Badge>;
      case "LOANED":
        return <Badge variant="loaned" className="text-xs">Emprestado</Badge>;
      case "IN_MAINTENANCE":
        return <Badge variant="maintenance" className="text-xs">Em Manutenção</Badge>;
      case "DAMAGED":
        return <Badge variant="damaged" className="text-xs">Danificado</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const getLoanBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="loaned" className="text-xs">Em Aberto</Badge>;
      case "RETURNED":
        return <Badge variant="available" className="text-xs">Devolvido</Badge>;
      case "OVERDUE":
        return <Badge variant="overdue" className="text-xs">Atrasado</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const getMaintenanceBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="low" className="text-xs">Pendente</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="maintenance" className="text-xs">Em Reparo</Badge>;
      case "COMPLETED":
        return <Badge variant="available" className="text-xs">Concluída</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  let globalCounter = -1;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent hideClose className="max-w-2xl p-0 gap-0 overflow-hidden rounded-3xl border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl">
        
        {/* Input Bar */}
        <div className="flex items-center px-4 border-b border-border/80 bg-accent/20 gap-2.5">
          <Search className="w-5 h-5 text-primary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onKeyDown={handleKeyDown}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite para buscar patrimônio (#123458), caixa (C001), item ou solicitante..."
            className="w-full bg-transparent px-2 py-4 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              title="Limpar busca"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/80 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            title="Fechar busca (Esc)"
            className="text-xs font-semibold px-2 py-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/80 transition-colors cursor-pointer shrink-0 ml-1"
          >
            Esc
          </button>
        </div>

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p>Buscando no inventário e cadastros...</p>
            </div>
          ) : query.length >= 2 && totalResults === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-sm font-bold text-foreground">
                Nenhum resultado para &quot;{query}&quot;
              </p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Verifique o número do tombamento (#123458), nome do material ou código da caixa.
              </p>
            </div>
          ) : query.length < 2 ? (
            <div className="p-6 text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                Busca Rápida UniFAP
              </div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Digite 2 ou mais caracteres para pesquisar instantaneamente entre todos os materiais, patrimônios, armários e chamados.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                {["Projetor", "Cabo HDMI", "C001", "Microfone", "Manutenção"].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setQuery(tag)}
                    className="text-xs font-medium px-3 py-1 rounded-xl bg-accent text-foreground hover:bg-accent/80 transition-colors cursor-pointer border border-border/60"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* 1. Equipamentos Patrimoniais */}
              {results.assets.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <Tag className="w-3.5 h-3.5 text-primary" />
                    <span>Patrimônio ({results.assets.length})</span>
                  </div>
                  <div className="space-y-0.5">
                    {results.assets.map((asset) => {
                      globalCounter++;
                      const isHighlighted = selectedIndex === globalCounter;
                      return (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => handleSelect(`/patrimonio?search=${asset.assetTag}`)}
                          className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between group transition-colors cursor-pointer ${
                            isHighlighted ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-accent"
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                                isHighlighted ? "bg-primary-foreground/20 text-primary-foreground" : "text-primary bg-primary/10"
                              }`}>
                                #{asset.assetTag}
                              </span>
                              <span className={`text-xs font-bold ${isHighlighted ? "text-primary-foreground" : "text-foreground"}`}>
                                {asset.item?.name}
                              </span>
                              {asset.model && (
                                <span className={`text-xs hidden sm:inline ${isHighlighted ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                                  • {asset.model}
                                </span>
                              )}
                            </div>
                            <p className={`text-[11px] ${isHighlighted ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                              {asset.currentRoom ? `Sala: ${asset.currentRoom.name}` : asset.currentBox ? `Armário: ${asset.currentBox.door?.name} / ${asset.currentBox.name}` : "Sem caixa alocada"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getAssetBadge(asset.status)}
                            <ArrowRight className={`w-3.5 h-3.5 transition-all ${
                              isHighlighted ? "text-primary-foreground translate-x-0.5" : "text-muted-foreground group-hover:text-foreground"
                            }`} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. Materiais do Catálogo */}
              {results.items.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <Package className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Materiais de Estoque ({results.items.length})</span>
                  </div>
                  <div className="space-y-0.5">
                    {results.items.map((item) => {
                      globalCounter++;
                      const isHighlighted = selectedIndex === globalCounter;
                      const totalQty = item.inventories?.reduce((acc: number, inv: any) => acc + inv.quantity, 0) || 0;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelect(`/estoque?search=${item.sku || item.name}`)}
                          className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between group transition-colors cursor-pointer ${
                            isHighlighted ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-accent"
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${isHighlighted ? "text-primary-foreground" : "text-foreground"}`}>
                                {item.name}
                              </span>
                              <span className={`font-mono text-xs ${isHighlighted ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                                SKU: {item.sku}
                              </span>
                            </div>
                            <p className={`text-[11px] ${isHighlighted ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                              Categoria: {item.category?.name || "Geral"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-mono font-bold ${isHighlighted ? "text-primary-foreground" : "text-foreground"}`}>
                              {totalQty} {item.unit || "UN"}
                            </span>
                            <ArrowRight className={`w-3.5 h-3.5 transition-all ${
                              isHighlighted ? "text-primary-foreground translate-x-0.5" : "text-muted-foreground group-hover:text-foreground"
                            }`} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. Caixas do Armário */}
              {results.boxes.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <Boxes className="w-3.5 h-3.5 text-blue-500" />
                    <span>Caixas & Armário ({results.boxes.length})</span>
                  </div>
                  <div className="space-y-0.5">
                    {results.boxes.map((box) => {
                      globalCounter++;
                      const isHighlighted = selectedIndex === globalCounter;
                      return (
                        <button
                          key={box.id}
                          type="button"
                          onClick={() => handleSelect(`/caixas/${box.code}`)}
                          className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between group transition-colors cursor-pointer ${
                            isHighlighted ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-accent"
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                                isHighlighted ? "bg-primary-foreground/20 text-primary-foreground" : "text-blue-600 dark:text-blue-400 bg-blue-500/10"
                              }`}>
                                {box.code}
                              </span>
                              <span className={`text-xs font-bold ${isHighlighted ? "text-primary-foreground" : "text-foreground"}`}>
                                {box.name}
                              </span>
                            </div>
                            <p className={`text-[11px] ${isHighlighted ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                              {box.door?.name} • {box.description || "Caixa organizada"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs ${isHighlighted ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                              {box.assets?.length || 0} pat. / {box.inventories?.length || 0} mat.
                            </span>
                            <ArrowRight className={`w-3.5 h-3.5 transition-all ${
                              isHighlighted ? "text-primary-foreground translate-x-0.5" : "text-muted-foreground group-hover:text-foreground"
                            }`} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. Empréstimos */}
              {results.loans.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <Handshake className="w-3.5 h-3.5 text-purple-500" />
                    <span>Empréstimos ({results.loans.length})</span>
                  </div>
                  <div className="space-y-0.5">
                    {results.loans.map((loan) => {
                      globalCounter++;
                      const isHighlighted = selectedIndex === globalCounter;
                      return (
                        <button
                          key={loan.id}
                          type="button"
                          onClick={() => handleSelect(`/emprestimos?search=${loan.borrowerName}`)}
                          className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between group transition-colors cursor-pointer ${
                            isHighlighted ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-accent"
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${isHighlighted ? "text-primary-foreground" : "text-foreground"}`}>
                                {loan.borrowerName}
                              </span>
                              <span className={`text-xs ${isHighlighted ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                                • {loan.destination}
                              </span>
                            </div>
                            <p className={`text-[11px] ${isHighlighted ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                              Equipamento: {loan.asset?.item?.name} (#{loan.asset?.assetTag})
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getLoanBadge(loan.status)}
                            <ArrowRight className={`w-3.5 h-3.5 transition-all ${
                              isHighlighted ? "text-primary-foreground translate-x-0.5" : "text-muted-foreground group-hover:text-foreground"
                            }`} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 5. Ordens de Serviço */}
              {results.maintenances.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <Wrench className="w-3.5 h-3.5 text-amber-500" />
                    <span>Ordens de Serviço ({results.maintenances.length})</span>
                  </div>
                  <div className="space-y-0.5">
                    {results.maintenances.map((m) => {
                      globalCounter++;
                      const isHighlighted = selectedIndex === globalCounter;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleSelect(`/manutencao?search=${m.orderNumber || m.asset?.assetTag}`)}
                          className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between group transition-colors cursor-pointer ${
                            isHighlighted ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-accent"
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                                isHighlighted ? "bg-primary-foreground/20 text-primary-foreground" : "text-amber-600 dark:text-amber-400 bg-amber-500/10"
                              }`}>
                                {m.orderNumber || `#OS-${m.id.slice(0, 8)}`}
                              </span>
                              <span className={`text-xs font-bold ${isHighlighted ? "text-primary-foreground" : "text-foreground"}`}>
                                {m.asset?.item?.name}
                              </span>
                            </div>
                            <p className={`text-[11px] truncate max-w-md ${isHighlighted ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                              {m.issueDescription}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getMaintenanceBadge(m.status)}
                            <ArrowRight className={`w-3.5 h-3.5 transition-all ${
                              isHighlighted ? "text-primary-foreground translate-x-0.5" : "text-muted-foreground group-hover:text-foreground"
                            }`} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Keyboard Hints Footer */}
        <div className="px-4 py-2.5 border-t border-border/80 bg-accent/30 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[11px] font-bold">↑↓</kbd> navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[11px] font-bold">↵</kbd> abrir
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[11px] font-bold">Esc</kbd> fechar
            </span>
          </div>
          <span className="text-[11px] font-medium hidden sm:inline">Paleta de Comandos • UniFAP</span>
        </div>

      </DialogContent>
    </Dialog>
  );
}
