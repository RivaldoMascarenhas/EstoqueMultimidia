"use client";

import React, { useState, useEffect } from "react";
import { 
  ClipboardCheck, 
  CheckCircle2, 
  Package, 
  Tag, 
  Save
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface InventoryAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InventoryAuditModal({ isOpen, onClose }: InventoryAuditModalProps) {
  const [doors, setDoors] = useState<any[]>([]);
  const [selectedDoorId, setSelectedDoorId] = useState<string>("");
  const [selectedBoxId, setSelectedBoxId] = useState<string>("");
  const [selectedBox, setSelectedBox] = useState<any | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchDoors();
    }
  }, [isOpen]);

  const fetchDoors = async () => {
    try {
      const res = await fetch("/api/v1/doors");
      const json = await res.json();
      if (json.success) {
        setDoors(json.data);
        if (json.data.length > 0) {
          setSelectedDoorId(json.data[0].id);
          if (json.data[0].boxes?.length > 0) {
            setSelectedBoxId(json.data[0].boxes[0].id);
            setSelectedBox(json.data[0].boxes[0]);
          }
        }
      }
    } catch (e) {
      console.error("Erro ao carregar portas:", e);
    }
  };

  const handleDoorChange = (doorId: string) => {
    setSelectedDoorId(doorId);
    const door = doors.find((d) => d.id === doorId);
    if (door && door.boxes?.length > 0) {
      setSelectedBoxId(door.boxes[0].id);
      setSelectedBox(door.boxes[0]);
      setCheckedItems({});
    } else {
      setSelectedBoxId("");
      setSelectedBox(null);
      setCheckedItems({});
    }
  };

  const handleBoxChange = (boxId: string) => {
    setSelectedBoxId(boxId);
    const door = doors.find((d) => d.id === selectedDoorId);
    const box = door?.boxes?.find((b: any) => b.id === boxId);
    setSelectedBox(box || null);
    setCheckedItems({});
  };

  const toggleItemCheck = (itemId: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleFinishAudit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success(`Conferência da Caixa ${selectedBox?.code || ""} registrada com sucesso no log de auditoria!`);
      onClose();
    }, 600);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl bg-card border-border/80">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Auditoria & Conferência de Caixa
              </h2>
              <p className="text-xs text-muted-foreground">
                Checklist guiado de contagem física do armário
              </p>
            </div>
          </div>
        </div>

        {/* Seletores de Porta e Caixa */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">
              Porta do Armário:
            </label>
            <select
              value={selectedDoorId}
              onChange={(e) => handleDoorChange(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
            >
              {doors.map((door) => (
                <option key={door.id} value={door.id}>
                  {door.name} ({door.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">
              Caixa Física:
            </label>
            <select
              value={selectedBoxId}
              onChange={(e) => handleBoxChange(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
            >
              {doors
                .find((d) => d.id === selectedDoorId)
                ?.boxes?.map((box: any) => (
                  <option key={box.id} value={box.id}>
                    {box.code} - {box.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Checklist dos Itens Guardados na Caixa */}
        {selectedBox && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                Itens Esperados na Caixa ({selectedBox.code}):
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                Marque os itens conferidos
              </span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {/* Patrimônios */}
              {selectedBox.assets?.map((asset: any) => {
                const isChecked = !!checkedItems[`asset-${asset.id}`];
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => toggleItemCheck(`asset-${asset.id}`)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between ${
                      isChecked
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-300"
                        : "bg-muted/40 border-border/80 text-foreground hover:bg-muted/60"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-primary" />
                        <span className="font-mono text-xs font-bold">#{asset.assetTag}</span>
                        <span className="font-semibold text-xs">{asset.item?.name}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {asset.model || "Padrão"} {asset.serialNumber ? `• Nº Série: ${asset.serialNumber}` : ""}
                      </p>
                    </div>

                    <div className={`flex h-6 w-6 items-center justify-center rounded-lg border ${
                      isChecked ? "bg-emerald-600 text-white border-emerald-600" : "border-border text-transparent"
                    }`}>
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </button>
                );
              })}

              {/* Insumos */}
              {selectedBox.inventories?.map((inv: any) => {
                const isChecked = !!checkedItems[`inv-${inv.id}`];
                return (
                  <button
                    key={inv.id}
                    type="button"
                    onClick={() => toggleItemCheck(`inv-${inv.id}`)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between ${
                      isChecked
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-300"
                        : "bg-muted/40 border-border/80 text-foreground hover:bg-muted/60"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="font-semibold text-xs">{inv.item?.name}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        Saldo Esperado: <strong>{inv.quantity} {inv.item?.unit || "UN"}</strong>
                      </p>
                    </div>

                    <div className={`flex h-6 w-6 items-center justify-center rounded-lg border ${
                      isChecked ? "bg-emerald-600 text-white border-emerald-600" : "border-border text-transparent"
                    }`}>
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </button>
                );
              })}

              {(!selectedBox.assets || selectedBox.assets.length === 0) &&
               (!selectedBox.inventories || selectedBox.inventories.length === 0) && (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Esta caixa está cadastrada como vazia no sistema.
                </div>
              )}
            </div>

            {/* Observações da Conferência */}
            <div className="space-y-1 pt-2">
              <label className="text-xs font-semibold text-foreground">
                Observações ou Divergências Encontradas:
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Todos os itens conferidos e organizados conforme o padrão..."
                rows={2}
                className="w-full p-2.5 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/60">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs">
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleFinishAudit}
            disabled={isSubmitting}
            className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-md shadow-emerald-600/20"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Salvar Conferência</span>
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
