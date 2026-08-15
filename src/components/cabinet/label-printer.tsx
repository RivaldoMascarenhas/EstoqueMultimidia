"use client";

import React, { useState } from "react";
import { Printer, X, Check, QrCode, Layers, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCodeDisplay } from "@/components/scanner/qr-code-display";

interface BoxForLabel {
  id: string;
  code: string;
  name: string;
  doorName: string;
  description?: string | null;
}

interface LabelPrinterModalProps {
  isOpen: boolean;
  onClose: () => void;
  boxes: BoxForLabel[];
  selectedBoxCode?: string;
}

export function LabelPrinterModal({
  isOpen,
  onClose,
  boxes,
  selectedBoxCode,
}: LabelPrinterModalProps) {
  const [filterCode, setFilterCode] = useState<string>(selectedBoxCode || "ALL");

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  const displayedBoxes =
    filterCode === "ALL"
      ? boxes
      : boxes.filter((b) => b.code === filterCode);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-6">
        <DialogHeader className="no-print">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <Printer className="w-5 h-5" />
              <DialogTitle className="text-lg font-bold text-foreground">
                Impressão de Etiquetas com QR Code
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Gere etiquetas padronizadas para colar nas portas e caixas físicas do armário.
          </DialogDescription>
        </DialogHeader>

        {/* Filtro e Botão de Imprimir (Oculto na impressão) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-muted/40 border border-border no-print my-2">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-foreground shrink-0">
              Imprimir:
            </span>
            <select
              value={filterCode}
              onChange={(e) => setFilterCode(e.target.value)}
              className="px-3 py-1.5 text-xs bg-background border border-input rounded-lg text-foreground font-medium focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="ALL">Todas as Caixas ({boxes.length})</option>
              {boxes.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.code} - {b.name} ({b.doorName})
                </option>
              ))}
            </select>
          </div>

          <Button onClick={handlePrint} size="sm" className="w-full sm:w-auto gap-2 rounded-xl">
            <Printer className="w-4 h-4" />
            <span>Imprimir {displayedBoxes.length} Etiqueta(s)</span>
          </Button>
        </div>

        {/* Grid de Etiquetas Prontas para Impressão */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-2 print:gap-4 print:p-0 my-2">
          {displayedBoxes.map((box) => {
            const qrUrl = `${baseUrl}/caixas/${box.code}`;

            return (
              <div
                key={box.code}
                className="flex items-center justify-between p-4 rounded-2xl border-2 border-slate-900 bg-white text-slate-950 shadow-sm print:break-inside-avoid print:shadow-none"
              >
                {/* Textos da Etiqueta */}
                <div className="flex flex-col justify-between h-full space-y-1">
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                      <Package className="w-3 h-3" />
                      <span>UniFAP • TI & Multimídia</span>
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-950 font-mono mt-1">
                      {box.code}
                    </h2>
                    <p className="text-xs font-bold text-slate-800">
                      {box.name}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-600">
                      {box.doorName}
                    </p>
                  </div>

                  {box.description && (
                    <p className="text-[9px] text-slate-500 line-clamp-2 max-w-[160px] pt-1">
                      {box.description}
                    </p>
                  )}

                  <div className="text-[8px] text-slate-400 font-mono pt-1">
                    Escaneie para consultar/baixar
                  </div>
                </div>

                {/* QR Code */}
                <div className="shrink-0 pl-2 flex flex-col items-center">
                  <QrCodeDisplay value={qrUrl} size={110} className="shadow-none border-0 p-1" />
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
