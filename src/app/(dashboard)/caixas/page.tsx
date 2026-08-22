"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Package, 
  Search, 
  Camera, 
  Printer, 
  Plus, 
  ChevronRight, 
  Loader2, 
  QrCode
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { QrScannerModal } from "@/components/scanner/qr-scanner-modal";
import { LabelPrinterModal } from "@/components/cabinet/label-printer";
import { BoxFormModal } from "@/components/cabinet/box-form-modal";
import { toast } from "sonner";

export default function CaixasIndexPage() {
  const [doors, setDoors] = useState<any[]>([]);
  const [boxes, setBoxes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDoorFilter, setSelectedDoorFilter] = useState("ALL");

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isPrinterOpen, setIsPrinterOpen] = useState(false);
  const [isBoxModalOpen, setIsBoxModalOpen] = useState(false);
  const [selectedBoxForLabel, setSelectedBoxForLabel] = useState<string | undefined>(undefined);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/v1/doors");
      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error("Erro ao carregar caixas.");
        setIsLoading(false);
        return;
      }

      setDoors(json.data);

      const flattenedBoxes = json.data.flatMap((door: any) =>
        door.boxes.map((box: any) => ({
          ...box,
          doorName: door.name,
          doorCode: door.code,
        }))
      );

      setBoxes(flattenedBoxes);
      setIsLoading(false);
    } catch (err: any) {
      toast.error("Erro de conexão com o servidor.");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const doorOptions = doors.map((d) => ({
    id: d.id,
    code: d.code,
    name: d.name,
  }));

  const filteredBoxes = boxes.filter((box) => {
    const matchesDoor = selectedDoorFilter === "ALL" || box.doorCode === selectedDoorFilter;
    if (!matchesDoor) return false;

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();

    const matchesCodeOrName =
      box.code.toLowerCase().includes(term) ||
      box.name.toLowerCase().includes(term) ||
      (box.description && box.description.toLowerCase().includes(term));

    const matchesItems = box.inventories?.some(
      (inv: any) =>
        inv.item.name.toLowerCase().includes(term) ||
        inv.item.sku.toLowerCase().includes(term)
    );

    return matchesCodeOrName || matchesItems;
  });

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Package className="w-6 h-6 text-primary" />
              <span>Índice de Caixas Físicas</span>
            </h1>
            <Badge variant="normal" className="text-xs">
              {boxes.length} Caixas Ativas
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Listagem de todas as caixas numeradas do armário com acesso direto e geração de QR Code.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsScannerOpen(true)}
            size="sm"
            className="gap-1.5 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 shadow-md shadow-primary/20 text-white"
          >
            <Camera className="w-4 h-4" />
            <span>Escanear QR Code</span>
          </Button>

          <Button
            onClick={() => setIsBoxModalOpen(true)}
            size="sm"
            variant="emerald"
            className="gap-1.5 rounded-xl"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Caixa</span>
          </Button>

          <Button
            onClick={() => {
              setSelectedBoxForLabel("ALL");
              setIsPrinterOpen(true);
            }}
            size="sm"
            variant="outline"
            className="gap-1.5 rounded-xl"
          >
            <Printer className="w-4 h-4 text-primary" />
            <span>Etiquetas</span>
          </Button>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <Card className="p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex-1 w-full">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código (ex: C017), nome ou item armazenado..."
              icon={<Search className="w-4 h-4 text-primary" />}
              className="text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedDoorFilter}
              onChange={(e) => setSelectedDoorFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-background border border-input rounded-xl text-foreground font-semibold outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto"
            >
              <option value="ALL">Todas as Portas ({boxes.length} caixas)</option>
              {doors.map((d) => (
                <option key={d.id} value={d.code}>
                  {d.name} ({d.boxes.length} caixas)
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Grid de Caixas */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Carregando caixas do armário...</p>
        </div>
      ) : filteredBoxes.length === 0 ? (
        <div className="p-12 text-center space-y-3 rounded-2xl border border-dashed border-border bg-card">
          <Package className="w-10 h-10 text-muted-foreground mx-auto" />
          <h3 className="text-sm font-semibold text-foreground">Nenhuma caixa encontrada</h3>
          <p className="text-xs text-muted-foreground">Tente alterar os termos de busca ou cadastrar uma nova caixa.</p>
          <Button size="sm" onClick={() => setIsBoxModalOpen(true)} className="rounded-xl">
            + Cadastrar Caixa
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredBoxes.map((box) => (
            <div
              key={box.id}
              className="group rounded-2xl border border-border bg-card hover:bg-accent/40 p-4 transition-all duration-200 hover:border-primary/50 hover:shadow-md space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex h-7 px-2.5 items-center justify-center rounded-lg bg-primary/15 text-primary font-mono text-xs font-black border border-primary/30">
                    {box.code}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {box.doorName}
                  </Badge>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    {box.name}
                  </h3>
                  {box.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                      {box.description}
                    </p>
                  )}
                </div>

                {/* Resumo de itens na caixa */}
                <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground flex items-center justify-between">
                  <span>Itens armazenados:</span>
                  <span className="font-mono font-bold text-foreground">
                    {box.totalItemsInBox || 0}
                  </span>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <button
                  onClick={() => {
                    setSelectedBoxForLabel(box.code);
                    setIsPrinterOpen(true);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  title="Ver QR Code e Imprimir Etiqueta"
                >
                  <QrCode className="w-3.5 h-3.5 text-primary" />
                  <span>QR Code</span>
                </button>

                <Link
                  href={`/caixas/${box.code}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <span>Abrir Caixa</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modais */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />

      <LabelPrinterModal
        isOpen={isPrinterOpen}
        onClose={() => setIsPrinterOpen(false)}
        boxes={boxes.map((b) => ({
          id: b.id,
          code: b.code,
          name: b.name,
          doorName: b.doorName,
          description: b.description,
        }))}
        selectedBoxCode={selectedBoxForLabel}
      />

      <BoxFormModal
        isOpen={isBoxModalOpen}
        onClose={() => setIsBoxModalOpen(false)}
        doors={doorOptions}
        onSuccess={fetchData}
      />
    </div>
  );
}
