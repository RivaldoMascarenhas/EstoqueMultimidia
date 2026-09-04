"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowRight, 
  AlertCircle, 
  RefreshCw, 
  QrCode, 
  SwitchCamera,
  X,
  Zap,
  Check,
  Boxes,
  Sparkles,
  Volume2,
  VolumeX,
  Trash2,
  ExternalLink
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  BarcodeScannerEngine, 
  DetectedBarcode, 
  ScannerCameraDevice 
} from "@/lib/scanner/barcode-scanner.engine";
import { scannerFeedback } from "@/lib/scanner/scanner-feedback";

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

interface DetectedBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ScannedBatchItem {
  code: string;
  timestamp: number;
  type?: string;
}

export function QrScannerModal({ 
  isOpen, 
  onClose,
  title = "Leitor de Código & QR Code",
  description = "Aponte a câmera para a etiqueta patrimonial, caixa ou termo de cautela."
}: QrScannerModalProps) {
  const router = useRouter();

  // Estados de Interface e Câmera
  const [manualCode, setManualCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<ScannerCameraDevice[]>([]);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState<number>(0);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [isNativeEngine, setIsNativeEngine] = useState<boolean>(false);

  // Controles de Hardware: Zoom e Lanterna
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isLockingOn, setIsLockingOn] = useState<boolean>(false);
  const isLockingOnRef = useRef<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [detectedBox, setDetectedBox] = useState<DetectedBox | null>(null);

  // Modos de Operação: Rápido vs Lote (Inventário contínuo)
  const [scanMode, setScanMode] = useState<"SINGLE" | "BATCH">("SINGLE");
  const [batchItems, setBatchItems] = useState<ScannedBatchItem[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Refs de controle
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const engineRef = useRef<BarcodeScannerEngine | null>(null);
  const isMountedRef = useRef(true);
  const isProcessingRef = useRef<boolean>(false);
  const initialTouchDistRef = useRef<number | null>(null);
  const initialZoomOnPinchRef = useRef<number>(1);

  // Encaminhamento inteligente de rota de acordo com o padrão do código
  const navigateToCode = useCallback((cleanCode: string) => {
    const clean = cleanCode.trim();
    if (!clean) return;

    if (clean.includes("/validar/")) {
      const parts = clean.split("/validar/");
      const code = parts[parts.length - 1]?.split("?")[0]?.trim();
      toast.success("Documento identificado!");
      router.push(`/validar/${encodeURIComponent(code || "")}`);
      return;
    }

    if (clean.includes("/caixas/")) {
      const parts = clean.split("/caixas/");
      const boxCode = parts[parts.length - 1].replace(/[^a-zA-Z0-9_-]/g, "");
      toast.success(`Caixa ${boxCode.toUpperCase()} identificada!`);
      router.push(`/caixas/${boxCode.toUpperCase()}`);
      return;
    }

    if (clean.includes("/patrimonio/")) {
      const parts = clean.split("/patrimonio/");
      const assetId = parts[parts.length - 1].split("?")[0]?.trim();
      toast.success(`Patrimônio identificado!`);
      router.push(`/patrimonio/${assetId}`);
      return;
    }

    if (clean.startsWith("LOAN-") || clean.startsWith("loan-") || clean.startsWith("OS-") || clean.startsWith("os-") || clean.startsWith("REL-")) {
      toast.success("Documento institucional identificado!");
      router.push(`/validar/${encodeURIComponent(clean)}`);
      return;
    }

    if (clean.startsWith("#") || clean.startsWith("PAT-") || clean.startsWith("pat-")) {
      const tag = clean.replace(/^#/, "").replace(/^[Pp][Aa][Tt]-/, "");
      toast.success(`Patrimônio #${tag} identificado!`);
      router.push(`/patrimonio?search=${tag}`);
      return;
    }

    const isLikelyBox = /^[cC][0-9]{1,4}$/.test(clean) || /^[cC][xX]-[0-9]{1,4}$/.test(clean) || clean.toLowerCase().startsWith("cx");
    if (isLikelyBox) {
      const boxCode = clean.toUpperCase();
      toast.success(`Caixa ${boxCode} identificada!`);
      router.push(`/caixas/${boxCode}`);
      return;
    }

    router.push(`/scanner?search=${encodeURIComponent(clean)}`);
  }, [router]);

  // Interceptador central de código detectado
  const handleCodeDetected = useCallback((barcode: DetectedBarcode) => {
    const raw = barcode.rawValue?.trim();
    if (!raw) return;

    if (isProcessingRef.current && scanMode === "SINGLE") return;

    // Se detectou coordenadas de caixa de enquadramento
    if (barcode.boundingBox && videoRef.current && videoRef.current.videoWidth > 0) {
      const vW = videoRef.current.videoWidth;
      const vH = videoRef.current.videoHeight;
      setDetectedBox({
        x: Math.max(0, (barcode.boundingBox.x / vW) * 100),
        y: Math.max(0, (barcode.boundingBox.y / vH) * 100),
        width: Math.min(100, (barcode.boundingBox.width / vW) * 100),
        height: Math.min(100, (barcode.boundingBox.height / vH) * 100),
      });
    }

    setLastScannedCode(raw);

    // MODO LOTE (BATCH INVENTORY)
    if (scanMode === "BATCH") {
      setBatchItems((prev) => {
        // Evita duplicatas consecutivas imediatas (nos últimos 2 segundos)
        const recentSame = prev.find((i) => i.code === raw && Date.now() - i.timestamp < 2500);
        if (recentSame) return prev;

        setIsLockingOn(true);
        isLockingOnRef.current = true;
        scannerFeedback.triggerSuccess({ sound: soundEnabled, vibration: true });
        toast.success(`Item adicionado: ${raw}`, { duration: 1500 });
        return [{ code: raw, timestamp: Date.now() }, ...prev];
      });

      setTimeout(() => {
        if (isMountedRef.current) {
          setIsLockingOn(false);
          isLockingOnRef.current = false;
          setDetectedBox(null);
        }
      }, 650);
      return;
    }

    // MODO RÁPIDO / SINGLE (Abre na hora)
    isProcessingRef.current = true;
    setIsLockingOn(true);
    isLockingOnRef.current = true;
    scannerFeedback.triggerSuccess({ sound: soundEnabled, vibration: true });
    setIsRedirecting(true);

    setTimeout(() => {
      if (engineRef.current) {
        engineRef.current.stop().catch(() => {});
      }
      onClose();
      navigateToCode(raw);
    }, 280);
  }, [scanMode, soundEnabled, onClose, navigateToCode]);

  // Inicialização e parada do motor
  const stopScanner = useCallback(async () => {
    if (engineRef.current) {
      await engineRef.current.stop();
      engineRef.current = null;
    }
    setDetectedBox(null);
    setIsLockingOn(false);
    isLockingOnRef.current = false;
    setIsScanning(false);
    setIsTorchOn(false);
  }, []);

  const startScanner = useCallback(async (targetDeviceId?: string) => {
    try {
      if (!isMountedRef.current || !videoRef.current) return;
      setCameraError(null);
      setIsRedirecting(false);
      isProcessingRef.current = false;
      setIsLockingOn(false);
      isLockingOnRef.current = false;

      await stopScanner();
      await new Promise((r) => setTimeout(r, 100));
      if (!isMountedRef.current || !videoRef.current) return;

      const available = await BarcodeScannerEngine.getAvailableCameras();
      setCameras(available);

      let chosenId = targetDeviceId;
      if (!chosenId && available.length > 0) {
        const savedId = typeof window !== "undefined" ? localStorage.getItem("unifap_scanner_cam_id") : null;
        if (savedId && available.some((c) => c.id === savedId)) {
          chosenId = savedId;
        } else {
          // Prioriza câmera traseira por padrão
          const backCam = available.find((c) => c.isBackCamera);
          chosenId = backCam ? backCam.id : available[0].id;
        }
      }

      const engine = new BarcodeScannerEngine({
        videoElement: videoRef.current,
        containerId: "qr-modal-viewfinder",
        onFrame: (b) => {
          if (b?.boundingBox && videoRef.current && videoRef.current.videoWidth > 0) {
            const vW = videoRef.current.videoWidth;
            const vH = videoRef.current.videoHeight;
            setDetectedBox({
              x: Math.max(0, (b.boundingBox.x / vW) * 100),
              y: Math.max(0, (b.boundingBox.y / vH) * 100),
              width: Math.min(100, (b.boundingBox.width / vW) * 100),
              height: Math.min(100, (b.boundingBox.height / vH) * 100),
            });
          } else if (!isLockingOnRef.current) {
            setDetectedBox(null);
          }
        },
        onDetected: (b) => handleCodeDetected(b),
        onError: (e) => {
          if (isMountedRef.current) {
            setCameraError(e.message || "Erro ao acessar a câmera.");
          }
        },
      });

      engineRef.current = engine;
      const { isNative } = await engine.start(chosenId);

      if (isMountedRef.current) {
        setIsNativeEngine(isNative);
        setIsScanning(true);
        const caps = engine.getCapabilitiesInfo();
        setHasTorch(caps.hasTorch);
        setZoomLevel(1);

        if (chosenId) {
          const idx = available.findIndex((c) => c.id === chosenId);
          if (idx !== -1) setSelectedCameraIndex(idx);
          try {
            localStorage.setItem("unifap_scanner_cam_id", chosenId);
          } catch {}
        }
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setIsScanning(false);
      setCameraError(
        err.name === "NotAllowedError" || err.message?.includes("Permission")
          ? "Permissão de acesso à câmera negada. Habilite a permissão nas configurações do navegador."
          : "Não foi possível iniciar a câmera. Verifique se outro aplicativo está utilizando-a."
      );
    }
  }, [stopScanner, handleCodeDetected]);

  // Ciclo de vida do Modal (Abre/Fecha)
  useEffect(() => {
    isMountedRef.current = true;

    if (isOpen) {
      // Delay curto para que o DOM do Dialog monte a tag <video>
      const timer = setTimeout(() => {
        startScanner();
      }, 150);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
    }

    return () => {
      isMountedRef.current = false;
      stopScanner();
    };
  }, [isOpen, startScanner, stopScanner]);

  // Controles de Hardware
  const handleToggleTorch = async () => {
    if (!engineRef.current || !hasTorch) return;
    const nextState = !isTorchOn;
    const ok = await engineRef.current.setTorch(nextState);
    if (ok) {
      setIsTorchOn(nextState);
    } else {
      toast.error("Não foi possível acionar a lanterna neste dispositivo.");
    }
  };

  const handleSetZoom = async (level: number) => {
    if (!engineRef.current) return;
    setZoomLevel(level);
    await engineRef.current.setZoom(level);
  };

  const handleToggleCamera = async () => {
    if (cameras.length <= 1 || isSwitchingCamera) return;

    try {
      setIsSwitchingCamera(true);
      const nextIndex = (selectedCameraIndex + 1) % cameras.length;
      setSelectedCameraIndex(nextIndex);
      const nextDevice = cameras[nextIndex];
      await startScanner(nextDevice.id);
    } catch {
      toast.error("Erro ao alternar câmera.");
    } finally {
      setIsSwitchingCamera(false);
    }
  };

  // Suporte a Pinch-to-Zoom tátil com 2 dedos na tela
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialTouchDistRef.current = dist;
      initialZoomOnPinchRef.current = zoomLevel;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialTouchDistRef.current !== null) {
      if (e.cancelable) e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / initialTouchDistRef.current;
      const targetZoom = Math.min(Math.max(Number((initialZoomOnPinchRef.current * factor).toFixed(1)), 1), 3);
      handleSetZoom(targetZoom);
    }
  };

  const handleTouchEnd = () => {
    initialTouchDistRef.current = null;
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    scannerFeedback.triggerSuccess({ sound: soundEnabled, vibration: true });
    stopScanner();
    onClose();
    navigateToCode(manualCode.trim());
  };

  const handleCloseModal = () => {
    stopScanner();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseModal()}>
      <DialogContent 
        hideClose={true}
        className="sm:max-w-md p-4 sm:p-5 rounded-3xl border-border/80 bg-card/95 backdrop-blur-2xl shadow-2xl overflow-hidden"
      >
        {/* Header Elegante com Seletor de Modo */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-inner">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <DialogTitle className="text-sm font-bold text-foreground">
                  {title}
                </DialogTitle>
                {isNativeEngine && (
                  <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                    GPU 60 FPS
                  </span>
                )}
              </div>
              <DialogDescription className="text-[11px] text-muted-foreground line-clamp-1">
                {description}
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Toggle de Som */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
                soundEnabled ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-muted"
              )}
              title={soundEnabled ? "Silenciar Bip" : "Ativar Bip"}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {/* Fechar */}
            <button
              type="button"
              onClick={handleCloseModal}
              className="w-7 h-7 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Alternador de Modo: Rápido vs Lote (Inventário) */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-muted/60 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setScanMode("SINGLE")}
            className={cn(
              "flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer text-[11px]",
              scanMode === "SINGLE" 
                ? "bg-background text-foreground shadow-sm font-bold" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Zap className="w-3 h-3 text-amber-500" />
            <span>Modo Rápido</span>
          </button>

          <button
            type="button"
            onClick={() => setScanMode("BATCH")}
            className={cn(
              "flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer text-[11px]",
              scanMode === "BATCH" 
                ? "bg-background text-foreground shadow-sm font-bold" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Boxes className="w-3 h-3 text-primary" />
            <span>Modo Lote {batchItems.length > 0 && `(${batchItems.length})`}</span>
          </button>
        </div>

        {/* Viewfinder Imersivo Mobile-First */}
        <div className="space-y-3">
          <div 
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="relative overflow-hidden rounded-2xl bg-black aspect-square flex flex-col items-center justify-center touch-pan-y select-none border border-border/40 shadow-inner"
          >
            {/* Elemento de Vídeo Nativo de Alta Performance com Zoom Lock-on */}
            <video 
              ref={videoRef} 
              className={cn(
                "w-full h-full object-cover transition-transform duration-300 ease-out",
                isLockingOn && "scale-105"
              )}
              style={{
                transform: isLockingOn ? `scale(${zoomLevel * 1.16})` : `scale(${zoomLevel})`
              }}
              playsInline
              muted
            />

            {/* Container para Fallback com Html5Qrcode */}
            <div id="qr-modal-viewfinder" className="absolute inset-0 w-full h-full pointer-events-none" />

            {/* Vinheta de contraste */}
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_80px_rgba(0,0,0,0.65)] z-10" />

            {/* Controles Flutuantes Superiores (Lanterna e Alternar Câmera) */}
            {isScanning && !cameraError && (
              <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
                {hasTorch && (
                  <button
                    type="button"
                    onClick={handleToggleTorch}
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full border backdrop-blur-md shadow-md active:scale-95 transition-all cursor-pointer",
                      isTorchOn
                        ? "bg-amber-400 text-black border-amber-300 shadow-amber-400/40 ring-2 ring-amber-400/50"
                        : "bg-black/60 hover:bg-black/80 text-white/90 border-white/20"
                    )}
                    title={isTorchOn ? "Desligar Lanterna" : "Ligar Lanterna"}
                  >
                    <Zap className={cn("w-3.5 h-3.5", isTorchOn && "fill-black")} />
                  </button>
                )}

                {cameras.length > 1 && (
                  <button
                    type="button"
                    onClick={handleToggleCamera}
                    disabled={isSwitchingCamera}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white/90 border border-white/20 backdrop-blur-md shadow-md active:scale-95 transition-all cursor-pointer"
                    title="Alternar Câmera"
                  >
                    <SwitchCamera className={cn("w-3.5 h-3.5 text-primary", isSwitchingCamera && "animate-spin text-amber-400")} />
                    <span className="text-[10px] font-medium">
                      {selectedCameraIndex + 1}/{cameras.length}
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* Mira / Retículo Central Sempre Visível */}
            {isScanning && !cameraError && !isRedirecting && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-15">
                <div className={cn(
                  "relative w-48 h-48 sm:w-52 sm:h-52 rounded-2xl transition-all duration-300",
                  isLockingOn 
                    ? "border-2 border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.85)] scale-105" 
                    : "border border-white/20"
                )}>
                  <div className={cn("absolute -top-1 -left-1 w-5 h-5 border-t-3 border-l-3 rounded-tl-xl transition-colors", isLockingOn ? "border-emerald-300" : "border-emerald-400")} />
                  <div className={cn("absolute -top-1 -right-1 w-5 h-5 border-t-3 border-r-3 rounded-tr-xl transition-colors", isLockingOn ? "border-emerald-300" : "border-emerald-400")} />
                  <div className={cn("absolute -bottom-1 -left-1 w-5 h-5 border-b-3 border-l-3 rounded-bl-xl transition-colors", isLockingOn ? "border-emerald-300" : "border-emerald-400")} />
                  <div className={cn("absolute -bottom-1 -right-1 w-5 h-5 border-b-3 border-r-3 rounded-br-xl transition-colors", isLockingOn ? "border-emerald-300" : "border-emerald-400")} />
                  {!isLockingOn && <div className="qr-laser-line" />}
                </div>
              </div>
            )}

            {/* Retículo Dinâmico sobre o Código Detectado (Tracking) */}
            {isScanning && !cameraError && detectedBox && !isRedirecting && (
              <div
                className={cn("qr-target-bounding-box pointer-events-none", isLockingOn && "qr-target-captured")}
                style={{
                  left: `${detectedBox.x}%`,
                  top: `${detectedBox.y}%`,
                  width: `${detectedBox.width}%`,
                  height: `${detectedBox.height}%`,
                }}
              >
                <div className="qr-target-corner-tl" />
                <div className="qr-target-corner-tr" />
                <div className="qr-target-corner-bl" />
                <div className="qr-target-corner-br" />

                <div className={cn(
                  "absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black shadow-lg whitespace-nowrap transition-colors",
                  isLockingOn ? "bg-emerald-400 text-black" : "bg-black/75 text-emerald-300 border border-emerald-500/40"
                )}>
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>{isLockingOn ? "✓ Código Identificado!" : "Código Detectado"}</span>
                </div>
              </div>
            )}

            {/* Feedback Instantâneo de Leitura (Flash de Sucesso) */}
            {isRedirecting && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center space-y-2 z-40 animate-in fade-in duration-150">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500 text-black font-bold shadow-2xl scale-105 transition-transform">
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span className="text-xs">Identificado! Abrindo...</span>
                </div>
              </div>
            )}

            {/* Barra Inferior de Zoom Tátil (1x, 2x, 3x) */}
            {isScanning && !cameraError && !isRedirecting && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/65 border border-white/20 backdrop-blur-xl shadow-2xl">
                {[1, 2, 3].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => handleSetZoom(lvl)}
                    className={cn(
                      "w-7 h-7 rounded-full text-[11px] font-bold flex items-center justify-center transition-all cursor-pointer active:scale-90",
                      zoomLevel === lvl 
                        ? "bg-white text-black font-extrabold shadow-sm scale-105" 
                        : "text-white/80 hover:bg-white/15 hover:text-white"
                    )}
                  >
                    {lvl}x
                  </button>
                ))}
              </div>
            )}

            {/* Estado de Erro da Câmera */}
            {cameraError && (
              <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-card/95 text-foreground space-y-3 z-20">
                <AlertCircle className="w-8 h-8 text-amber-500" />
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

          {/* Painel do Modo Lote (Quando houver itens lidos) */}
          {scanMode === "BATCH" && batchItems.length > 0 && (
            <div className="p-2.5 rounded-2xl bg-muted/50 border border-border/60 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-foreground flex items-center gap-1">
                  <Boxes className="w-3.5 h-3.5 text-primary" />
                  <span>Itens Bipados ({batchItems.length})</span>
                </span>
                <button
                  type="button"
                  onClick={() => setBatchItems([])}
                  className="text-muted-foreground hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Limpar</span>
                </button>
              </div>

              {/* Pílulas horizontais dos itens lidos */}
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {batchItems.map((item, idx) => (
                  <div
                    key={`${item.code}-${idx}`}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background border border-border text-[11px] font-mono text-foreground shadow-xs animate-in zoom-in-95 duration-100"
                  >
                    <span className="font-bold text-primary">#{idx + 1}</span>
                    <span>{item.code}</span>
                    <button
                      type="button"
                      onClick={() => {
                        stopScanner();
                        onClose();
                        navigateToCode(item.code);
                      }}
                      className="ml-1 text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Abrir item"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                size="sm"
                onClick={() => {
                  stopScanner();
                  onClose();
                  // Navega para a página do scanner com todos os códigos bipados
                  const codes = batchItems.map((b) => b.code).join(",");
                  router.push(`/scanner?batch=${encodeURIComponent(codes)}`);
                }}
                className="w-full rounded-xl text-xs h-8 font-bold gap-1.5 cursor-pointer"
              >
                <span>Concluir Conferência ({batchItems.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {/* Opção Manual / Digitação de Código */}
          <div className="pt-2 border-t border-border/70">
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Digitar código (#PAT-1002, C017, LOAN-...)"
                className="text-xs rounded-xl h-9 bg-background"
              />
              <Button 
                type="submit" 
                size="sm" 
                className="gap-1.5 rounded-xl px-4 text-xs shrink-0 cursor-pointer h-9 font-semibold"
              >
                <span>Buscar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
