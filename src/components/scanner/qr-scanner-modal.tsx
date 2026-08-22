"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import { 
  Search, 
  ArrowRight, 
  AlertCircle, 
  RefreshCw, 
  QrCode, 
  SwitchCamera
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
import { cn } from "@/lib/utils";

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QrScannerModal({ isOpen, onClose }: QrScannerModalProps) {
  const router = useRouter();
  const [manualCode, setManualCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState<number>(0);
  const [activeCameraLabel, setActiveCameraLabel] = useState<string>("");
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isSwitchingRef = useRef(false);

  const refreshCameraList = async (): Promise<Array<{ id: string; label: string }>> => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setCameras(devices);
        return devices;
      }
    } catch (e) {
      console.warn("Erro ao enumerar câmeras no modal:", e);
    }
    return [];
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        console.warn("Erro ao parar scanner no modal:", e);
      }
    }

    // Parar todos os tracks residuais do hardware
    const existingVideo = document.querySelector("#qr-reader-container video") as HTMLVideoElement;
    if (existingVideo && existingVideo.srcObject) {
      try {
        const stream = existingVideo.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
        existingVideo.srcObject = null;
      } catch (e) {}
    }

    setIsScanning(false);
  };

  const startScanner = async (targetCameraIdOrMode?: string | { facingMode: string }, cameraIndex?: number) => {
    try {
      setCameraError(null);
      setIsScanning(true);

      // Parar instâncias anteriores e liberar hardware
      await stopScanner();

      // Buffer de 150ms para liberação pelo SO móvel/desktop
      await new Promise((resolve) => setTimeout(resolve, 150));

      const html5QrCode = new Html5Qrcode("qr-reader-container");
      scannerRef.current = html5QrCode;

      const scanConfig = {
        fps: 15,
        qrbox: { width: 240, height: 240 },
      };

      const handleSuccess = (decodedText: string) => {
        stopScanner().then(() => {
          handleScanSuccess(decodedText);
        }).catch(() => {
          handleScanSuccess(decodedText);
        });
      };

      // 1. Obter lista de câmeras disponíveis
      let availableCams = cameras;
      if (availableCams.length === 0) {
        availableCams = await refreshCameraList();
      }

      let configToUse: any = targetCameraIdOrMode;

      if (!configToUse) {
        if (availableCams.length > 0) {
          let idx = typeof cameraIndex === "number" ? cameraIndex : selectedCameraIndex;
          if (idx >= availableCams.length) idx = 0;

          if (typeof cameraIndex !== "number") {
            const backIdx = availableCams.findIndex((c) => /back|rear|environment|traseira/i.test(c.label));
            if (backIdx !== -1) {
              idx = backIdx;
            }
          }

          setSelectedCameraIndex(idx);
          setActiveCameraLabel(availableCams[idx]?.label || `Câmera ${idx + 1}`);
          configToUse = availableCams[idx].id;
        } else {
          configToUse = { facingMode: "environment" };
        }
      }

      // Estratégia em cascata com fallbacks resilientes
      try {
        await html5QrCode.start(configToUse, scanConfig, handleSuccess, () => {});
      } catch (firstErr) {
        console.warn("Modal: Tentativa 1 falhou, tentando fallback ideal/deviceId...", firstErr);
        try {
          if (typeof configToUse === "string") {
            await html5QrCode.start({ deviceId: { exact: configToUse } }, scanConfig, handleSuccess, () => {});
          } else {
            await html5QrCode.start({ facingMode: { ideal: configToUse.facingMode || "environment" } }, scanConfig, handleSuccess, () => {});
          }
        } catch (secondErr) {
          console.warn("Modal: Tentativa 2 falhou, tentando enumeração...", secondErr);
          const devs = await Html5Qrcode.getCameras().catch(() => []);
          if (devs.length > 0) {
            await html5QrCode.start(devs[0].id, scanConfig, handleSuccess, () => {});
            setSelectedCameraIndex(0);
            setActiveCameraLabel(devs[0].label || "Câmera 1");
          } else {
            await html5QrCode.start({ facingMode: "user" }, scanConfig, handleSuccess, () => {});
          }
        }
      }

      const updatedDevices = await refreshCameraList();
      if (updatedDevices.length > 0) {
        const currentIdx = typeof cameraIndex === "number" ? cameraIndex : selectedCameraIndex;
        if (updatedDevices[currentIdx]) {
          setActiveCameraLabel(updatedDevices[currentIdx].label);
        }
      }

      setIsScanning(true);
    } catch (err: any) {
      console.warn("Erro ao iniciar câmera no modal:", err);
      setCameraError(
        "Não foi possível acessar a câmera do dispositivo. Verifique as permissões do navegador ou digite o código da caixa abaixo."
      );
      setIsScanning(false);
    }
  };

  const handleToggleCamera = async () => {
    if (isSwitchingRef.current) return;
    isSwitchingRef.current = true;
    setIsSwitchingCamera(true);

    try {
      let availableCams = cameras;
      if (availableCams.length === 0) {
        availableCams = await refreshCameraList();
      }

      if (availableCams.length > 1) {
        const nextIndex = (selectedCameraIndex + 1) % availableCams.length;
        const nextCam = availableCams[nextIndex];
        setSelectedCameraIndex(nextIndex);
        setActiveCameraLabel(nextCam.label || `Câmera ${nextIndex + 1}`);

        await startScanner(nextCam.id, nextIndex);
        toast.info(`Câmera alterada: ${nextCam.label || `Câmera ${nextIndex + 1}`} (${nextIndex + 1}/${availableCams.length})`);
      } else if (availableCams.length === 1) {
        const isCurrentlyFront = /front|user|frontal/i.test(availableCams[0].label);
        const targetMode = isCurrentlyFront ? "environment" : "user";

        try {
          await startScanner({ facingMode: targetMode });
          toast.info(`Alternando para modo ${targetMode === "environment" ? "Traseira" : "Frontal"}...`);
        } catch (e) {
          toast.info(
            `Apenas 1 câmera detectada neste computador (${availableCams[0].label || "Webcam Principal"}). Conecte outra webcam ou teste no celular para alternar entre frontal e traseira.`,
            { duration: 5000 }
          );
        }
      } else {
        const nextMode = activeCameraLabel.includes("Frontal") ? "environment" : "user";
        await startScanner({ facingMode: nextMode });
        toast.info(`Alternado para modo ${nextMode === "environment" ? "Traseira" : "Frontal"}`);
      }
    } catch (e) {
      toast.error("Erro ao alternar câmera.");
    } finally {
      isSwitchingRef.current = false;
      setIsSwitchingCamera(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
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

  const triggerHaptic = () => {
    if (typeof window !== "undefined" && "navigator" in window && navigator.vibrate) {
      navigator.vibrate(80);
    }
  };

  const handleScanSuccess = (rawText: string) => {
    triggerHaptic();
    stopScanner();
    onClose();

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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <QrCode className="w-5 h-5" />
              <DialogTitle className="text-base font-bold text-foreground">
                Escanear QR Code da Caixa
              </DialogTitle>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleToggleCamera}
              disabled={isSwitchingCamera}
              className="h-8 px-2.5 text-xs rounded-xl gap-1.5 border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary shrink-0"
              title="Alternar entre câmeras disponíveis"
            >
              <SwitchCamera className={cn("w-3.5 h-3.5 text-primary transition-transform duration-300", isSwitchingCamera && "animate-spin text-amber-400")} />
              <span className="text-[11px] font-semibold">
                {isSwitchingCamera 
                  ? "Trocando..." 
                  : cameras.length > 1 
                    ? `Câmera ${selectedCameraIndex + 1}/${cameras.length}` 
                    : activeCameraLabel 
                      ? (activeCameraLabel.length > 12 ? `${activeCameraLabel.slice(0, 12)}...` : activeCameraLabel)
                      : "Trocar Câmera"}
              </span>
            </Button>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Aponte a câmera do celular para a etiqueta da caixa ou digite o código físico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Container do Scanner da Câmera */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-slate-950 aspect-square flex flex-col items-center justify-center">
            <div id="qr-reader-container" className="w-full h-full" />

            {/* Botão Flutuante de Troca de Câmera Sobre o Visor */}
            {isScanning && !cameraError && (
              <button
                type="button"
                onClick={handleToggleCamera}
                disabled={isSwitchingCamera}
                className="absolute top-3 right-3 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md shadow-lg active:scale-95 transition-all cursor-pointer group"
                title="Alternar entre câmeras disponíveis"
              >
                <SwitchCamera className={cn("w-3.5 h-3.5 text-primary transition-transform duration-300 group-hover:rotate-180", isSwitchingCamera && "animate-spin text-amber-400")} />
                <span className="text-[10px] font-semibold">
                  {isSwitchingCamera 
                    ? "..." 
                    : cameras.length > 1 
                      ? `${selectedCameraIndex + 1}/${cameras.length}` 
                      : "Trocar"}
                </span>
              </button>
            )}

            {cameraError && (
              <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-card/95 text-foreground space-y-3 z-20">
                <AlertCircle className="w-10 h-10 text-amber-500" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {cameraError}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => startScanner()}
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
