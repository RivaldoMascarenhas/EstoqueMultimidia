"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { 
  Archive, 
  QrCode, 
  Printer, 
  Camera, 
  Search, 
  Boxes, 
  ChevronRight, 
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { QrScannerModal } from "@/components/scanner/qr-scanner-modal";
import { LabelPrinterModal } from "./label-printer";
import { BoxFormModal } from "./box-form-modal";
import { DoorFormModal } from "./door-form-modal";

interface StoredItem {
  id: string;
  quantity: number;
  item: {
    id: string;
    name: string;
    sku: string;
    unit: string;
    category?: { name: string };
  };
}

interface StoredAsset {
  id: string;
  assetTag: string;
  model?: string | null;
  status: string;
  item: {
    name: string;
  };
}

interface BoxData {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  totalItemsInBox: number;
  isEmpty: boolean;
  inventories: StoredItem[];
  assets: StoredAsset[];
}

interface DoorData {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  orderIndex: number;
  totalBoxes: number;
  totalStoredItems: number;
  boxes: BoxData[];
}

interface PhysicalCabinetViewProps {
  doors: DoorData[];
  onRefresh?: () => void;
}

export function PhysicalCabinetView({ doors, onRefresh }: PhysicalCabinetViewProps) {
  const { data: session } = useSession();
  const userRole = session?.user?.role || "OPERADOR";
  const isReadOnly = userRole === "CONSULTA";

  const [selectedDoorFilter, setSelectedDoorFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isPrinterOpen, setIsPrinterOpen] = useState(false);
  const [isBoxModalOpen, setIsBoxModalOpen] = useState(false);
  const [isDoorModalOpen, setIsDoorModalOpen] = useState(false);
  const [selectedBoxForLabel, setSelectedBoxForLabel] = useState<string | undefined>(undefined);

  // Flatten boxes for label printing
  const allBoxesForLabels = doors.flatMap((d) =>
    d.boxes.map((b) => ({
      id: b.id,
      code: b.code,
      name: b.name,
      doorName: d.name,
      description: b.description,
    }))
  );

  const doorOptions = doors.map((d) => ({
    id: d.id,
    code: d.code,
    name: d.name,
  }));

  // Filter doors and boxes
  const filteredDoors = doors
    .filter((d) => selectedDoorFilter === "ALL" || d.code === selectedDoorFilter)
    .map((d) => {
      const matchingBoxes = d.boxes.filter((b) => {
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        const matchCode = b.code.toLowerCase().includes(q);
        const matchName = b.name.toLowerCase().includes(q);
        const matchItem = b.inventories.some(
          (inv) =>
            inv.item.name.toLowerCase().includes(q) ||
            inv.item.sku.toLowerCase().includes(q)
        );
        const matchAsset = b.assets.some(
          (ast) =>
            ast.assetTag.toLowerCase().includes(q) ||
            ast.item.name.toLowerCase().includes(q)
        );
        return matchCode || matchName || matchItem || matchAsset;
      });

      return {
        ...d,
        boxes: matchingBoxes,
        hasMatches: matchingBoxes.length > 0,
      };
    })
    .filter((d) => !searchTerm || d.hasMatches);

  return (
    <div className="space-y-6">
      {/* Search & Actions Toolbar */}
      <div className="flex flex-col gap-3 p-4 rounded-3xl border border-border/80 bg-card shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por caixa (C001), item ou patrimônio (#123458)..."
              className="pl-9 text-xs rounded-xl bg-background border-border/80 h-10 sm:h-9"
            />
          </div>

          {/* Scanner Button (Camera) */}
          <Button
            onClick={() => setIsScannerOpen(true)}
            size="sm"
            className="h-10 sm:h-9 gap-1.5 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 shadow-md shadow-primary/20 text-white font-semibold text-xs shrink-0"
          >
            <Camera className="w-4 h-4" />
            <span>Escanear QR</span>
          </Button>
        </div>

        {/* Secondary Action Grid on Mobile / Flex on Desktop */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 pt-1 border-t border-border/40">
          {/* Botão Atalho para Lista de Caixas */}
          <Link href="/caixas" className="w-full sm:w-auto">
            <Button
              size="sm"
              variant="outline"
              className="w-full gap-1.5 rounded-xl text-xs h-9"
            >
              <Boxes className="w-3.5 h-3.5 text-primary" />
              <span className="truncate">Índice de Caixas</span>
            </Button>
          </Link>

          {/* Botão Nova Caixa */}
          {!isReadOnly && (
            <Button
              onClick={() => setIsBoxModalOpen(true)}
              size="sm"
              variant="emerald"
              className="w-full sm:w-auto gap-1.5 rounded-xl text-xs h-9"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="truncate">Nova Caixa</span>
            </Button>
          )}

          {/* Botão Nova Porta */}
          {!isReadOnly && (
            <Button
              onClick={() => setIsDoorModalOpen(true)}
              size="sm"
              variant="outline"
              className="w-full sm:w-auto gap-1.5 rounded-xl text-xs h-9"
            >
              <Archive className="w-3.5 h-3.5 text-primary" />
              <span className="truncate">Nova Porta</span>
            </Button>
          )}

          {/* Botão Imprimir Etiquetas */}
          <Button
            onClick={() => {
              setSelectedBoxForLabel("ALL");
              setIsPrinterOpen(true);
            }}
            size="sm"
            variant="outline"
            className="w-full sm:w-auto gap-1.5 rounded-xl text-xs h-9"
          >
            <Printer className="w-3.5 h-3.5 text-primary" />
            <span className="truncate">Etiquetas</span>
          </Button>
        </div>
      </div>

      {/* Door Selector Tabs with smooth touch scrolling */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar scrollbar-none">
        <button
          onClick={() => setSelectedDoorFilter("ALL")}
          className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            selectedDoorFilter === "ALL"
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
              : "bg-card border border-border/80 text-muted-foreground hover:text-foreground hover:bg-accent/60"
          }`}
        >
          Armário Completo ({doors.length} Portas)
        </button>

        {doors.map((door) => (
          <button
            key={door.code}
            onClick={() => setSelectedDoorFilter(door.code)}
            className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              selectedDoorFilter === door.code
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "bg-card border border-border/80 text-muted-foreground hover:text-foreground hover:bg-accent/60"
            }`}
          >
            <span>{door.name}</span>
            <span className="text-[10px] opacity-75 font-mono">({door.boxes.length})</span>
          </button>
        ))}
      </div>

      {/* Visual Cabinet Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 items-start">
        {filteredDoors.map((door) => (
          <div
            key={door.id}
            className="rounded-2xl sm:rounded-3xl border border-border/80 bg-card/80 backdrop-blur-md shadow-xs overflow-hidden flex flex-col transition-all hover:border-primary/40"
          >
            {/* Door Header */}
            <div className="p-3.5 sm:p-4 border-b border-border/80 bg-gradient-to-r from-primary/10 via-muted/30 to-transparent flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Archive className="w-4 h-4 text-primary shrink-0" />
                  <h3 className="text-sm font-bold text-foreground">
                    {door.name}
                  </h3>
                </div>
                {door.description && (
                  <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                    {door.description}
                  </p>
                )}
              </div>
              <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                {door.boxes.length} caixas
              </Badge>
            </div>

            {/* Boxes Inside this Door */}
            <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3 max-h-[70vh] overflow-y-auto">
              {door.boxes.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl space-y-2">
                  <p>Nenhuma caixa cadastrada nesta porta.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsBoxModalOpen(true)}
                    className="text-xs rounded-xl"
                  >
                    + Adicionar Caixa
                  </Button>
                </div>
              ) : (
                door.boxes.map((box) => (
                  <div
                    key={box.id}
                    className="group rounded-2xl border border-border/80 bg-background/80 hover:bg-accent/40 p-3 sm:p-3.5 transition-all duration-200 hover:border-primary/50 hover:shadow-xs space-y-2 relative"
                  >
                    {/* Top line of Box: Code, Name, Items count badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex h-7 px-2 items-center justify-center rounded-lg bg-primary/15 text-primary font-mono text-xs font-black border border-primary/30 shrink-0">
                          {box.code}
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                            {box.name}
                          </h4>
                          {box.description && (
                            <p className="text-[10px] text-muted-foreground line-clamp-1">
                              {box.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <Badge
                        variant={box.isEmpty ? "outline" : "normal"}
                        className="text-[10px] px-1.5 shrink-0"
                      >
                        {box.isEmpty ? "Vazia" : `${box.totalItemsInBox} itens`}
                      </Badge>
                    </div>

                    {/* Previews of Items Inside Box */}
                    {box.inventories.length > 0 || box.assets.length > 0 ? (
                      <div className="space-y-1 pt-1.5 border-t border-border/50">
                        {box.inventories.map((inv) => (
                          <div
                            key={inv.id}
                            className="flex items-center justify-between text-[11px] text-muted-foreground gap-2"
                          >
                            <span className="truncate max-w-[130px] sm:max-w-[200px] text-foreground font-medium">
                              • {inv.item.name}
                            </span>
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                              {inv.quantity} {inv.item.unit}
                            </span>
                          </div>
                        ))}

                        {box.assets.map((ast) => (
                          <div
                            key={ast.id}
                            className="flex items-center justify-between text-[11px] text-muted-foreground gap-2"
                          >
                            <span className="truncate max-w-[130px] sm:max-w-[200px] text-indigo-600 dark:text-indigo-400 font-medium">
                              • {ast.item.name}
                            </span>
                            <span className="font-mono text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1 rounded shrink-0">
                              #{ast.assetTag}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground/60 italic pt-1">
                        Caixa livre / pronta para alocação
                      </p>
                    )}

                    {/* Quick Action Link to Box Page */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <button
                        onClick={() => {
                          setSelectedBoxForLabel(box.code);
                          setIsPrinterOpen(true);
                        }}
                        className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
                        title="Ver etiqueta com QR Code"
                      >
                        <QrCode className="w-3 h-3 text-primary" />
                        <span>QR Code</span>
                      </button>

                      <Link
                        href={`/caixas/${box.code}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        <span>Abrir Caixa</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modais de Ação */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />

      <LabelPrinterModal
        isOpen={isPrinterOpen}
        onClose={() => setIsPrinterOpen(false)}
        boxes={allBoxesForLabels}
        selectedBoxCode={selectedBoxForLabel}
      />

      <BoxFormModal
        isOpen={isBoxModalOpen}
        onClose={() => setIsBoxModalOpen(false)}
        doors={doorOptions}
        onSuccess={onRefresh}
      />

      <DoorFormModal
        isOpen={isDoorModalOpen}
        onClose={() => setIsDoorModalOpen(false)}
        onSuccess={onRefresh}
      />
    </div>
  );
}
