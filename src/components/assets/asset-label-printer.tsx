"use client";

import React, { useState } from "react";
import { Printer, X, Monitor, Package, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCodeDisplay } from "@/components/scanner/qr-code-display";

interface AssetForLabel {
  id: string;
  assetTag: string;
  itemName: string;
  serialNumber?: string | null;
  model?: string | null;
  boxCode?: string | null;
}

interface AssetLabelPrinterProps {
  isOpen: boolean;
  onClose: () => void;
  assets: AssetForLabel[];
  selectedTag?: string;
}

export function AssetLabelPrinter({
  isOpen,
  onClose,
  assets,
  selectedTag,
}: AssetLabelPrinterProps) {
  const [filterTag, setFilterTag] = useState<string>(selectedTag || "ALL");

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  const displayedAssets =
    filterTag === "ALL"
      ? assets
      : assets.filter((a) => a.assetTag === filterTag);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-6">
        <DialogHeader className="no-print">
          <div className="flex items-center gap-2 text-primary">
            <Printer className="w-5 h-5" />
            <DialogTitle className="text-lg font-bold text-foreground">
              Impressão de Etiquetas de Patrimônio com QR Code
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Gere etiquetas de tombamento institucional para colar nos projetores, microfones e equipamentos.
          </DialogDescription>
        </DialogHeader>

        {/* Filtro e Botão de Imprimir */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-muted/40 border border-border no-print my-2">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-foreground shrink-0">
              Imprimir:
            </span>
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="px-3 py-1.5 text-xs bg-background border border-input rounded-lg text-foreground font-medium focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="ALL">Todos os Equipamentos ({assets.length})</option>
              {assets.map((a) => (
                <option key={a.id} value={a.assetTag}>
                  #{a.assetTag} - {a.itemName} {a.model && `(${a.model})`}
                </option>
              ))}
            </select>
          </div>

          <Button onClick={handlePrint} size="sm" className="w-full sm:w-auto gap-2 rounded-xl">
            <Printer className="w-4 h-4" />
            <span>Imprimir {displayedAssets.length} Etiqueta(s)</span>
          </Button>
        </div>

        {/* Grid de Etiquetas Patrimoniais Prontas para Impressão */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-2 print:gap-4 print:p-0 my-2">
          {displayedAssets.map((asset) => {
            const qrUrl = `${baseUrl}/patrimonio/${asset.id}`;

            return (
              <div
                key={asset.id}
                className="flex items-center justify-between p-4 rounded-2xl border-2 border-slate-900 bg-white text-slate-950 shadow-sm print:break-inside-avoid print:shadow-none"
              >
                <div className="flex flex-col justify-between h-full space-y-1">
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>UniFAP • PATRIMÔNIO TI</span>
                    </div>
                    <h2 className="text-xl font-black tracking-tight text-slate-950 font-mono mt-1">
                      #{asset.assetTag}
                    </h2>
                    <p className="text-xs font-bold text-slate-800 line-clamp-1">
                      {asset.itemName}
                    </p>
                    {asset.model && (
                      <p className="text-[11px] font-semibold text-slate-600">
                        {asset.model}
                      </p>
                    )}
                  </div>

                  {asset.serialNumber && (
                    <p className="text-[9px] font-mono text-slate-500 pt-1">
                      S/N: {asset.serialNumber}
                    </p>
                  )}

                  <div className="text-[8px] text-slate-400 font-mono">
                    Escaneie para detalhes/empréstimo
                  </div>
                </div>

                <div className="shrink-0 pl-2 flex flex-col items-center">
                  <QrCodeDisplay value={qrUrl} size={105} className="shadow-none border-0 p-1" />
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
