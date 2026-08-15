"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  Package, 
  Tag, 
  Archive, 
  Handshake, 
  Wrench, 
  ArrowRight, 
  X, 
  CornerDownLeft, 
  Clock, 
  Building2,
  Boxes,
  Sparkles
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  const inputRef = useRef<HTMLInputElement>(null);

  // Foco automático ao abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setQuery("");
      setResults({ items: [], assets: [], boxes: [], loans: [], maintenances: [] });
    }
  }, [isOpen]);

  // Debounced fetch
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults({ items: [], assets: [], boxes: [], loans: [], maintenances: [] });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        if (json.success) {
          setResults(json.data);
        }
      } catch (err) {
        console.error("Erro na busca global:", err);
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSelect = (url: string) => {
    onClose();
    router.push(url);
  };

  const totalResults =
    results.items.length +
    results.assets.length +
    results.boxes.length +
    results.loans.length +
    results.maintenances.length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden rounded-3xl border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl">
        
        {/* Input Bar */}
        <div className="flex items-center px-4 border-b border-border/80 bg-accent/20">
          <Search className="w-5 h-5 text-primary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por item, patrimônio (#123458), caixa (C001), OS ou solicitante..."
            className="w-full bg-transparent px-3 py-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p>Buscando em todo o sistema...</p>
            </div>
          ) : query.length >= 2 && totalResults === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-sm font-semibold text-foreground">
                Nenhum resultado encontrado para &quot;{query}&quot;
              </p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Tente buscar por nome de item, tag de patrimônio, código de caixa ou número de OS.
              </p>
            </div>
          ) : query.length < 2 ? (
            <div className="p-6 text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                Busca Rápida UniFAP
              </div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Digite pelo menos 2 caracteres para localizar instantaneamente equipamentos, insumos, caixas, termos de cautela e ordens de serviço.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                <button
                  onClick={() => setQuery("Projetor")}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-accent text-foreground hover:bg-accent/80 transition-colors"
                >
                  Projetor
                </button>
                <button
                  onClick={() => setQuery("Cabo")}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-accent text-foreground hover:bg-accent/80 transition-colors"
                >
                  Cabo HDMI
                </button>
                <button
                  onClick={() => setQuery("C001")}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-accent text-foreground hover:bg-accent/80 transition-colors"
                >
                  Caixa C001
                </button>
                <button
                  onClick={() => setQuery("Epson")}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-accent text-foreground hover:bg-accent/80 transition-colors"
                >
                  Epson
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* 1. Equipamentos Patrimoniais */}
              {results.assets.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 px-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <Tag className="w-3.5 h-3.5 text-primary" />
                    <span>Patrimônio ({results.assets.length})</span>
                  </div>
                  <div className="space-y-0.5">
                    {results.assets.map((asset) => (
                      <button
                        key={asset.id}
                        onClick={() => handleSelect(`/patrimonio?search=${asset.assetTag}`)}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-accent flex items-center justify-between group transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                              #{asset.assetTag}
                            </span>
                            <span className="font-semibold text-xs text-foreground">
                              {asset.item?.name}
                            </span>
                            {asset.model && (
                              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                                • {asset.model}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {asset.currentBox ? `Armário: ${asset.currentBox.door?.name} / ${asset.currentBox.name}` : "Sem caixa alocada"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={asset.status.toLowerCase() as any} className="text-[9px]">
                            {asset.status}
                          </Badge>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Materiais do Catálogo */}
              {results.items.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 px-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <Package className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Materiais & Insumos ({results.items.length})</span>
                  </div>
                  <div className="space-y-0.5">
                    {results.items.map((item) => {
                      const totalQty = item.inventories?.reduce((acc: number, inv: any) => acc + inv.quantity, 0) || 0;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelect(`/estoque?search=${item.sku || item.name}`)}
                          className="w-full text-left p-2.5 rounded-xl hover:bg-accent flex items-center justify-between group transition-colors"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-foreground">
                                {item.name}
                              </span>
                              <span className="font-mono text-[11px] text-muted-foreground">
                                SKU: {item.sku}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              Categoria: {item.category?.name || "Geral"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-foreground">
                              {totalQty} {item.unit || "UN"}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
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
                  <div className="flex items-center gap-1.5 px-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <Boxes className="w-3.5 h-3.5 text-blue-500" />
                    <span>Armário & Caixas ({results.boxes.length})</span>
                  </div>
                  <div className="space-y-0.5">
                    {results.boxes.map((box) => (
                      <button
                        key={box.id}
                        onClick={() => handleSelect(`/caixas/${box.code}`)}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-accent flex items-center justify-between group transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                              {box.code}
                            </span>
                            <span className="font-semibold text-xs text-foreground">
                              {box.name}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {box.door?.name} • {box.description || "Sem descrição"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground">
                            {box.assets?.length || 0} patrimônios / {box.inventories?.length || 0} materiais
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Empréstimos */}
              {results.loans.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 px-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <Handshake className="w-3.5 h-3.5 text-purple-500" />
                    <span>Empréstimos ({results.loans.length})</span>
                  </div>
                  <div className="space-y-0.5">
                    {results.loans.map((loan) => (
                      <button
                        key={loan.id}
                        onClick={() => handleSelect(`/emprestimos?search=${loan.borrowerName}`)}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-accent flex items-center justify-between group transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-foreground">
                              {loan.borrowerName}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              • Destino: {loan.destination}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Item: {loan.asset?.item?.name} (#{loan.asset?.assetTag})
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={loan.status === "ACTIVE" ? "loaned" : "available"} className="text-[9px]">
                            {loan.status}
                          </Badge>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. Ordens de Serviço */}
              {results.maintenances.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 px-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <Wrench className="w-3.5 h-3.5 text-amber-500" />
                    <span>Ordens de Serviço ({results.maintenances.length})</span>
                  </div>
                  <div className="space-y-0.5">
                    {results.maintenances.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => handleSelect(`/manutencao?search=${m.orderNumber || m.asset?.assetTag}`)}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-accent flex items-center justify-between group transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                              {m.orderNumber || `#OS-${m.id.slice(0, 8)}`}
                            </span>
                            <span className="font-semibold text-xs text-foreground">
                              {m.asset?.item?.name}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate max-w-md">
                            {m.issueDescription}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="maintenance" className="text-[9px]">
                            {m.status}
                          </Badge>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Keyboard Hints Footer */}
        <div className="px-4 py-2.5 border-t border-border/80 bg-accent/30 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">Esc</kbd> Fechar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">↵</kbd> Navegar
            </span>
          </div>
          <span className="text-[10px]">UniFAP TI Multi-Search</span>
        </div>

      </DialogContent>
    </Dialog>
  );
}
