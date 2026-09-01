"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import { 
  Search, 
  ArrowRight, 
  AlertCircle, 
  RefreshCw, 
  QrCode, 
  SwitchCamera,
  X,
  Camera,
  Keyboard,
  ShieldCheck,
  Boxes,
  Monitor
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
  title?: string;
  description?: string;
}

export function QrScannerModal({ 
  isOpen, 
  onClose,
  title = "Leitor de QR Code & Scanner",
  description = "Aponte a câmera para a etiqueta da caixa, equipamento ou documento oficial."
}: QrScannerModalProps) {
  const router = useRouter();
  const [manualCode, setManualCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState<number>(0);
  const [activeCameraLabel, setActiveCameraLabel] = useState<string>("");
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef(true);
  const isScanningRef = useRef(false);
  const camerasRef = useRef<Array<{ id: string; label: string }>>([]);
  const cameraIndexRef = useRef<number>(0);

  // Terminação imediata de faixas de vídeo e liberação do LED da webcam/celular
  const killAllVideoHardware = useCallback(() => {
    if (activeStreamRef.current) {
      try {
        activeStreamRef.current.getTracks().forEach((t) => {
          t.stop();
          t.enabled = false;
        });
      } catch {}
      activeStreamRef.current = null;
    }

    if (typeof document !== "undefined") {
      document.querySelectorAll("#qr-modal-viewfinder video").forEach((video) => {
        try {
          if ((video as HTMLVideoElement).srcObject) {
            const stream = (video as HTMLVideoElement).srcObject as MediaStream;
            stream.getTracks().forEach((t) => {
              t.stop();
              t.enabled = false;
            });
            (video as HTMLVideoElement).srcObject = null;
          }
        } catch {}
      });
    }
  }, []);

  const stopScanner = useCallback(async () => {
    isScanningRef.current = false;
    killAllVideoHardware();

    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        console.warn("Erro ao parar scanner no modal:", e);
      }
      scannerRef.current = null;
    }

    killAllVideoHardware();
    if (isMountedRef.current) {
      setIsScanning(false);
    }
  }, [killAllVideoHardware]);

  const playBeep = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {}
  };

  const triggerHaptic = () => {
    if (typeof window !== "undefined" && "navigator" in window && navigator.vibrate) {
      navigator.vibrate(80);
    }
  };

  // Processamento inteligente do código escaneado
  const handleScanSuccess = (rawText: string) => {
    playBeep();
    triggerHaptic();
    killAllVideoHardware();
    stopScanner();
    onClose();

    const clean = rawText.trim();

    // 1. URL de Validação de Documentos
    if (clean.includes("/validar/")) {
      const parts = clean.split("/validar/");
      const code = parts[1]?.split("?")[0]?.trim();
      toast.success("Documento identificado! Abrindo validação...");
      router.push(`/validar/${encodeURIComponent(code || "")}`);
      return;
    }

    // 2. URL de Caixas
    if (clean.includes("/caixas/")) {
      const parts = clean.split("/caixas/");
      const boxCode = parts[parts.length - 1].replace(/[^a-zA-Z0-9_-]/g, "");
      toast.success(`Caixa ${boxCode.toUpperCase()} identificada!`);
      router.push(`/caixas/${boxCode.toUpperCase()}`);
      return;
    }

    // 3. URL de Patrimônio
    if (clean.includes("/patrimonio/")) {
      const parts = clean.split("/patrimonio/");
      const assetId = parts[parts.length - 1].split("?")[0]?.trim();
      toast.success(`Patrimônio identificado!`);
      router.push(`/patrimonio/${assetId}`);
      return;
    }

    // 4. Códigos de Documento (LOAN-*, OS-*, REL-*)
    if (clean.startsWith("LOAN-") || clean.startsWith("loan-") || clean.startsWith("OS-") || clean.startsWith("os-") || clean.startsWith("REL-")) {
      toast.success("Documento identificado! Redirecionando para validação...");
      router.push(`/validar/${encodeURIComponent(clean)}`);
      return;
    }

    // 5. Código de Patrimônio (#123456 ou PAT-*)
    if (clean.startsWith("#") || clean.startsWith("PAT-") || clean.startsWith("pat-")) {
      const tag = clean.replace(/^#/, "").replace(/^[Pp][Aa][Tt]-/, "");
      toast.success(`Patrimônio #${tag} identificado!`);
      router.push(`/patrimonio?search=${tag}`);
      return;
    }

    // 6. Código de Caixa Padrão (C01, CX-01, etc.)
    const isLikelyBox = /^[cC][0-9]{1,4}$/.test(clean) || /^[cC][xX]-[0-9]{1,4}$/.test(clean) || clean.toLowerCase().startsWith("cx");
    if (isLikelyBox) {
      const boxCode = clean.toUpperCase();
      toast.success(`Caixa ${boxCode} identificada!`);
      router.push(`/caixas/${boxCode}`);
      return;
    }

    // Fallback: Redireciona para o Scanner Geral para resolver qualquer entidade
    toast.info(`Código ${clean} lido. Consultando...`);
    router.push(`/scanner?search=${encodeURIComponent(clean)}`);
  };

  const startScanner = async (targetCameraId?: string, targetIndex?: number) => {
    try {
      if (!isMountedRef.current) return;
      setCameraError(null);

      await stopScanner();
      await new Promise((resolve) => setTimeout(resolve, 150));
      if (!isMountedRef.current) return;

      const html5QrCode = new Html5Qrcode("qr-modal-viewfinder");
      scannerRef.current = html5QrCode;

      const scanConfig = {
        fps: 20,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdge * 0.72);
          return { width: qrboxSize, height: qrboxSize };
        },
        aspectRatio: 1.0,
      };

      const handleSuccess = (decodedText: string) => {
        handleScanSuccess(decodedText);
      };

      // Enumerar câmeras disponíveis
      let availableCams = camerasRef.current;
      if (availableCams.length === 0) {
        const devices = await Html5Qrcode.getCameras().catch(() => []);
        if (devices && devices.length > 0) {
          availableCams = devices;
          camerasRef.current = devices;
          if (isMountedRef.current) setCameras(devices);
        }
      }

      let configToUse: any = targetCameraId;

      if (!configToUse) {
        if (availableCams.length > 0) {
          let idx = typeof targetIndex === "number" ? targetIndex : cameraIndexRef.current;
          if (idx >= availableCams.length) idx = 0;

          // Se não especificado, preferir câmera traseira
          if (typeof targetIndex !== "number") {
            const backIdx = availableCams.findIndex((c) => /back|rear|environment|traseira/i.test(c.label));
            if (backIdx !== -1) idx = backIdx;
          }

          cameraIndexRef.current = idx;
          if (isMountedRef.current) {
            setSelectedCameraIndex(idx);
            setActiveCameraLabel(availableCams[idx]?.label || `Câmera ${idx + 1}`);
          }
          configToUse = availableCams[idx].id;
        } else {
          configToUse = { facingMode: "environment" };
        }
      }

      try {
        await html5QrCode.start(configToUse, scanConfig, handleSuccess, () => {});
      } catch (err1) {
        console.warn("Tentativa 1 falhou, tentando fallback...", err1);
        try {
          if (availableCams.length > 0) {
            await html5QrCode.start(availableCams[0].id, scanConfig, handleSuccess, () => {});
          } else {
            await html5QrCode.start({ facingMode: "user" }, scanConfig, handleSuccess, () => {});
          }
        } catch (err2) {
          throw err2;
        }
      }

      if (!isMountedRef.current) {
        killAllVideoHardware();
        return;
      }

      // Capturar stream para controle de hardware
      const videoEl = document.querySelector("#qr-modal-viewfinder video") as HTMLVideoElement;
      if (videoEl && videoEl.srcObject) {
        activeStreamRef.current = videoEl.srcObject as MediaStream;
      }

      isScanningRef.current = true;
      if (isMountedRef.current) {
        setIsScanning(true);
      }
    } catch (err: any) {
      console.warn("Erro ao iniciar câmera no modal:", err);
      if (isMountedRef.current) {
        setCameraError(
          "Não foi possível acessar a câmera do dispositivo. Verifique as permissões do navegador ou digite o código abaixo."
        );
        setIsScanning(false);
      }
    }
  };

  const handleToggleCamera = async () => {
    if (isSwitchingCamera) return;
    setIsSwitchingCamera(true);

    try {
      let availableCams = camerasRef.current;
      if (availableCams.length === 0) {
        const devices = await Html5Qrcode.getCameras().catch(() => []);
        if (devices && devices.length > 0) {
          availableCams = devices;
          camerasRef.current = devices;
          setCameras(devices);
        }
      }

      if (availableCams.length > 1) {
        const nextIndex = (cameraIndexRef.current + 1) % availableCams.length;
        const nextCam = availableCams[nextIndex];
        cameraIndexRef.current = nextIndex;
        setSelectedCameraIndex(nextIndex);
        setActiveCameraLabel(nextCam.label || `Câmera ${nextIndex + 1}`);

        await startScanner(nextCam.id, nextIndex);
        toast.info(`Câmera: ${nextCam.label || `Câmera ${nextIndex + 1}`} (${nextIndex + 1}/${availableCams.length})`);
      } else if (availableCams.length === 1) {
        const isCurrentlyFront = /front|user|frontal/i.test(availableCams[0].label);
        const targetMode = isCurrentlyFront ? "environment" : "user";
        await startScanner({ facingMode: targetMode } as any);
        toast.info(`Alternado para modo ${targetMode === "environment" ? "Traseira" : "Frontal"}`);
      } else {
        await startScanner({ facingMode: "environment" } as any);
      }
    } catch {
      toast.error("Não foi possível alternar a câmera.");
    } finally {
      setIsSwitchingCamera(false);
    }
  };

  // Ciclo de vida: Inicia uma única vez ao abrir e desliga limpo ao fechar
  useEffect(() => {
    isMountedRef.current = true;

    if (isOpen) {
      const timer = setTimeout(() => {
        startScanner();
      }, 150);

      return () => {
        clearTimeout(timer);
        killAllVideoHardware();
        stopScanner();
      };
    } else {
      killAllVideoHardware();
      stopScanner();
    }

    return () => {
      isMountedRef.current = false;
      killAllVideoHardware();
      stopScanner();
    };
  }, [isOpen]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleScanSuccess(manualCode.trim());
    setManualCode("");
  };

  const handleCloseModal = () => {
    killAllVideoHardware();
    stopScanner();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseModal()}>
      <DialogContent 
        hideClose={true}
        className="sm:max-w-md p-5 sm:p-6 rounded-3xl border-border bg-card shadow-2xl overflow-hidden"
      >
        {/* Header Personalizado sem colisão de botões */}
        <div className="flex items-center justify-between border-b border-border/70 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-sm sm:text-base font-bold text-foreground">
                {title}
              </DialogTitle>
              <DialogDescription className="text-[11px] text-muted-foreground line-clamp-1">
                {description}
              </DialogDescription>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCloseModal}
            className="w-8 h-8 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Fechar Scanner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 pt-1">
          {/* Visor da Câmera com Efeito HUD */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-slate-950 aspect-square flex flex-col items-center justify-center shadow-inner">
            <div id="qr-modal-viewfinder" className="w-full h-full" />

            {/* Toolbar Superior sobre o Visor (Botão de Alternar Câmera) */}
            {isScanning && !cameraError && (
              <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleCamera}
                  disabled={isSwitchingCamera}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 hover:bg-black text-white border border-white/20 backdrop-blur-md shadow-lg active:scale-95 transition-all cursor-pointer group"
                  title="Alternar câmera"
                >
                  <SwitchCamera className={cn("w-3.5 h-3.5 text-primary transition-transform duration-300 group-hover:rotate-180", isSwitchingCamera && "animate-spin text-amber-400")} />
                  <span className="text-[11px] font-semibold">
                    {isSwitchingCamera 
                      ? "..." 
                      : cameras.length > 1 
                        ? `${selectedCameraIndex + 1}/${cameras.length}` 
                        : "Trocar Câmera"}
                  </span>
                </button>
              </div>
            )}

            {/* Laser e cantoneiras visuais */}
            {isScanning && !cameraError && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6 z-20">
                <div className="relative w-full h-full max-w-[230px] max-h-[230px] rounded-2xl border border-primary/40 flex items-center justify-center">
                  <div className="absolute top-0 left-0 w-5 h-5 border-t-3 border-l-3 border-primary rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-5 h-5 border-t-3 border-r-3 border-primary rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-5 h-5 border-b-3 border-l-3 border-primary rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-5 h-5 border-b-3 border-r-3 border-primary rounded-br-xl" />
                </div>
                <span className="mt-3 text-[10px] font-semibold text-white/90 bg-black/60 px-3 py-1 rounded-full border border-white/10 backdrop-blur-sm">
                  Posicione o QR Code dentro do quadro
                </span>
              </div>
            )}

            {/* Aviso se a câmera não puder ser aberta */}
            {cameraError && (
              <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-card/95 text-foreground space-y-3 z-20">
                <AlertCircle className="w-10 h-10 text-amber-500" />
                <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                  {cameraError}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => startScanner()}
                  className="text-xs rounded-xl gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tentar Novamente</span>
                </Button>
              </div>
            )}
          </div>

          {/* Opção Manual / Digitação de Código ou Chave */}
          <div className="space-y-2 pt-2 border-t border-border/70">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Keyboard className="w-3.5 h-3.5 text-primary" />
                Entrada manual de código:
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                Ex: C017, #1002, cmthzzf6n0
              </span>
            </div>

            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Digitar código da caixa, patrimônio ou documento..."
                className="font-mono text-xs sm:text-sm uppercase rounded-xl"
              />
              <Button 
                type="submit" 
                size="sm" 
                className="gap-1.5 rounded-xl px-4 font-bold text-xs shrink-0 cursor-pointer bg-primary text-primary-foreground"
              >
                <span>Consultar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
