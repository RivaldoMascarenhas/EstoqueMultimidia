"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import { 
  Camera, 
  X, 
  Search, 
  ArrowRight, 
  AlertCircle, 
  RefreshCw, 
  QrCode,
  Sparkles
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QrScannerModal({ isOpen, onClose }: QrScannerModalProps) {
  const router = useRouter();
  const [manualCode, setManualCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const startScanner = async () => {
    try {
      setCameraError(null);
      setIsScanning(true);

      const html5QrCode = new Html5Qrcode("qr-reader-container");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Sucesso no scan
          html5QrCode.stop().then(() => {
            handleScanSuccess(decodedText);
          }).catch(() => {
            handleScanSuccess(decodedText);
          });
        },
        () => {
          // Erro de frame normal ignorado
        }
      );
    } catch (err: any) {
      console.warn("Erro ao iniciar câmera:", err);
      setCameraError(
        "Não foi possível acessar a câmera do dispositivo. Verifique as permissões do navegador ou digite o código da caixa abaixo."
      );
      setIsScanning(false);
    }
  };

  const stopScanner = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().catch(() => {});
    }
    setIsScanning(false);
  };

  useEffect(() => {
    if (isOpen) {
      // Tentar iniciar scanner automaticamente
      const timer = setTimeout(() => {
        startScanner();
      }, 300);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen]);

  const handleScanSuccess = (rawText: string) => {
    stopScanner();
    onClose();

    // Extrair código da URL ou usar o texto direto
    // Exemplos possíveis: "http://localhost:3000/caixas/C017" ou "C017"
    let boxCode = rawText.trim();
    if (boxCode.includes("/caixas/")) {
      const parts = boxCode.split("/caixas/");
      boxCode = parts[parts.length - 1].replace(/[^a-zA-Z0-9_-]/g, "");
    }

    toast.success(`Caixa ${boxCode.toUpperCase()} identificada! Redirecionando...`);
    router.push(`/caixas/${boxCode.toUpperCase()}`);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    const code = manualCode.trim().toUpperCase();
    stopScanner();
    onClose();
    router.push(`/caixas/${code}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <QrCode className="w-5 h-5" />
            <DialogTitle className="text-base font-bold text-foreground">
              Escanear QR Code da Caixa
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Aponte a câmera do celular para a etiqueta da caixa ou digite o código físico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Container do Scanner da Câmera */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-slate-950 aspect-square flex flex-col items-center justify-center">
            <div id="qr-reader-container" className="w-full h-full" />

            {cameraError && (
              <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-card/95 text-foreground space-y-3">
                <AlertCircle className="w-10 h-10 text-amber-500" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {cameraError}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={startScanner}
                  className="text-xs rounded-xl gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tentar Novamente</span>
                </Button>
              </div>
            )}
          </div>

          {/* Opção Manual / Digitação do Código */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Ou digite o código da caixa:</span>
              <span className="text-[10px] text-muted-foreground font-mono">Ex: C017, C001</span>
            </label>

            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Ex: C017"
                className="font-mono uppercase font-bold text-sm"
                icon={<Search className="w-4 h-4" />}
              />
              <Button type="submit" size="sm" className="gap-1.5 rounded-xl shrink-0">
                <span>Abrir</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
