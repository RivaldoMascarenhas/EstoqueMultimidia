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
  Monitor,
  Zap,
  Target
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

interface DetectedBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function QrScannerModal({ 
  isOpen, 
  onClose,
  title = "Leitor de QR Code",
  description = "Aponte a câmera para a etiqueta da caixa, patrimônio ou documento."
}: QrScannerModalProps) {
  const router = useRouter();
  const [manualCode, setManualCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState<number>(0);
  const [activeCameraLabel, setActiveCameraLabel] = useState<string>("");
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);

  // Estados de Zoom & Detecção Inteligente
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [autoZoomEnabled, setAutoZoomEnabled] = useState<boolean>(true);
  const [detectedBox, setDetectedBox] = useState<DetectedBox | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef(true);
  const isScanningRef = useRef(false);
  const camerasRef = useRef<Array<{ id: string; label: string }>>([]);
  const cameraIndexRef = useRef<number>(0);
  const detectLoopRef = useRef<number | null>(null);
  const lastAutoZoomTimeRef = useRef<number>(0);
  const initialTouchDistRef = useRef<number | null>(null);
  const initialZoomOnPinchRef = useRef<number>(1);

  // Aplicação do Nível de Zoom
  const applyZoom = useCallback(async (level: number) => {
    setZoomLevel(level);

    if (activeStreamRef.current) {
      const track = activeStreamRef.current.getVideoTracks()[0];
      if (track) {
        try {
          const cap = (track.getCapabilities && track.getCapabilities()) as any;
          if (cap && cap.zoom) {
            const clamped = Math.min(Math.max(level, cap.zoom.min || 1), cap.zoom.max || 5);
            await track.applyConstraints({
              advanced: [{ zoom: clamped }] as any,
            });
          }
        } catch (e) {
          console.warn("Modal zoom hardware error:", e);
        }
      }
    }

    const video = document.querySelector("#qr-modal-viewfinder video") as HTMLVideoElement;
    if (video) {
      video.style.transition = "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)";
      video.style.transform = `scale(${level})`;
      video.style.transformOrigin = "center center";
    }
  }, []);

  const killAllVideoHardware = useCallback(() => {
    if (detectLoopRef.current) {
      cancelAnimationFrame(detectLoopRef.current);
      detectLoopRef.current = null;
    }

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

    setDetectedBox(null);
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

  const triggerHaptic = (pattern: number | number[] = 80) => {
    if (typeof window !== "undefined" && "navigator" in window && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  const startDetectionLoop = useCallback(() => {
    if (typeof window === "undefined") return;

    let detector: any = null;
    if ("BarcodeDetector" in window) {
      try {
        detector = new (window as any).BarcodeDetector({
          formats: ["qr_code", "ean_13", "code_128", "data_matrix"],
        });
      } catch {}
    }

    const checkFrame = async () => {
      if (!isMountedRef.current || !isScanningRef.current) return;

      const video = document.querySelector("#qr-modal-viewfinder video") as HTMLVideoElement;
      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        if (detector) {
          try {
            const barcodes = await detector.detect(video);
            if (barcodes && barcodes.length > 0) {
              const b = barcodes[0];
              const bbox = b.boundingBox;

              const relX = (bbox.x / video.videoWidth) * 100;
              const relY = (bbox.y / video.videoHeight) * 100;
              const relW = (bbox.width / video.videoWidth) * 100;
              const relH = (bbox.height / video.videoHeight) * 100;

              setDetectedBox({
                x: Math.max(0, relX),
                y: Math.max(0, relY),
                width: Math.min(100, relW),
                height: Math.min(100, relH),
              });

              const now = Date.now();
              if (autoZoomEnabled && relW < 22 && now - lastAutoZoomTimeRef.current > 2000) {
                lastAutoZoomTimeRef.current = now;
                applyZoom(2.2);
                triggerHaptic(40);
              }
            } else {
              setDetectedBox(null);
            }
          } catch {}
        }
      }

      if (isMountedRef.current && isScanningRef.current) {
        detectLoopRef.current = requestAnimationFrame(checkFrame);
      }
    };

    detectLoopRef.current = requestAnimationFrame(checkFrame);
  }, [autoZoomEnabled, applyZoom]);

  const handleScanSuccess = (rawText: string) => {
    playBeep();
    triggerHaptic([40, 60, 40]);
    killAllVideoHardware();
    stopScanner();
    onClose();

    const clean = rawText.trim();

    if (clean.includes("/validar/")) {
      const parts = clean.split("/validar/");
      const code = parts[1]?.split("?")[0]?.trim();
      toast.success("Documento identificado! Abrindo...");
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
      toast.success("Documento identificado!");
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
        fps: 25,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdge * 0.85);
          return { width: qrboxSize, height: qrboxSize };
        },
        aspectRatio: 1.0,
      };

      const handleSuccess = (decodedText: string) => {
        handleScanSuccess(decodedText);
      };

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

      const videoEl = document.querySelector("#qr-modal-viewfinder video") as HTMLVideoElement;
      if (videoEl && videoEl.srcObject) {
        activeStreamRef.current = videoEl.srcObject as MediaStream;
      }

      isScanningRef.current = true;
      if (isMountedRef.current) {
        setIsScanning(true);
        startDetectionLoop();
      }
    } catch (err: any) {
      console.warn("Erro ao iniciar câmera no modal:", err);
      if (isMountedRef.current) {
        setCameraError(
          "Não foi possível acessar a câmera. Digite o código abaixo."
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
        toast.info(`${nextCam.label || `Câmera ${nextIndex + 1}`} (${nextIndex + 1}/${availableCams.length})`);
      } else {
        await startScanner({ facingMode: "environment" } as any);
      }
    } catch {
      toast.error("Não foi possível alternar a câmera.");
    } finally {
      setIsSwitchingCamera(false);
    }
  };

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
    if (e.touches.length === 2 && initialTouchDistRef.current) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = currentDist / initialTouchDistRef.current;
      const target = Math.min(Math.max(initialZoomOnPinchRef.current * factor, 1.0), 3.5);
      applyZoom(Number(target.toFixed(1)));
    }
  };

  const handleTouchEnd = () => {
    initialTouchDistRef.current = null;
  };

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
        className="sm:max-w-md p-5 rounded-3xl border-border bg-card shadow-2xl overflow-hidden"
      >
        {/* Header Limpo */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-foreground">
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
            className="w-8 h-8 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 pt-1">
          {/* Visor Minimalista */}
          <div 
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="relative overflow-hidden rounded-2xl bg-black aspect-square flex flex-col items-center justify-center touch-none select-none"
          >
            <div id="qr-modal-viewfinder" className="w-full h-full" />

            {/* Vinheta sutil */}
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_60px_rgba(0,0,0,0.55)] z-10" />

            {/* Troca de Câmera */}
            {isScanning && !cameraError && (
              <div className="absolute top-3 right-3 z-30">
                <button
                  type="button"
                  onClick={handleToggleCamera}
                  disabled={isSwitchingCamera}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 hover:bg-black/75 text-white/90 border border-white/15 backdrop-blur-md shadow-md active:scale-95 transition-all cursor-pointer"
                  title="Trocar Câmera"
                >
                  <SwitchCamera className={cn("w-3.5 h-3.5 text-primary", isSwitchingCamera && "animate-spin text-amber-400")} />
                  <span className="text-[11px] font-medium">
                    {isSwitchingCamera 
                      ? "..." 
                      : cameras.length > 1 
                        ? `${selectedCameraIndex + 1}/${cameras.length}` 
                        : "Trocar"}
                  </span>
                </button>
              </div>
            )}

            {/* Mira Minimalista Central */}
            {isScanning && !cameraError && !detectedBox && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-15">
                <div className="relative w-44 h-44">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white/40 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white/40 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white/40 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white/40 rounded-br-lg" />
                </div>
              </div>
            )}

            {/* RETÍCULO DINÂMICO SOBRE O QR CODE DETECTADO */}
            {isScanning && !cameraError && detectedBox && (
              <div
                className="qr-target-bounding-box"
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

                <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-yellow-500/90 text-black text-[10px] font-bold shadow-lg backdrop-blur-sm whitespace-nowrap animate-in fade-in zoom-in-95 duration-200">
                  <QrCode className="w-3 h-3" />
                  <span>QR Detectado</span>
                </div>
              </div>
            )}

            {/* Zoom Bar Minimalista */}
            {isScanning && !cameraError && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 border border-white/15 backdrop-blur-xl shadow-2xl">
                {[1, 2, 3].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => applyZoom(lvl)}
                    className={cn(
                      "w-7 h-7 rounded-full text-[11px] font-bold flex items-center justify-center transition-all cursor-pointer active:scale-90",
                      zoomLevel === lvl 
                        ? "bg-white text-black font-extrabold shadow-sm scale-105" 
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {lvl}x
                  </button>
                ))}

                <div className="w-[1px] h-3.5 bg-white/20 mx-0.5" />

                <button
                  type="button"
                  onClick={() => {
                    const next = !autoZoomEnabled;
                    setAutoZoomEnabled(next);
                    toast.info(next ? "Auto-Zoom ativado" : "Auto-Zoom desativado");
                  }}
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer",
                    autoZoomEnabled 
                      ? "bg-yellow-400/20 text-yellow-300 border border-yellow-400/30" 
                      : "text-white/50 hover:text-white"
                  )}
                  title="Auto-Zoom"
                >
                  <Zap className={cn("w-2.5 h-2.5", autoZoomEnabled ? "text-yellow-400" : "text-white/40")} />
                  <span>Auto</span>
                </button>
              </div>
            )}

            {/* Aviso se a câmera falhar */}
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

          {/* Opção Manual */}
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
                className="gap-1.5 rounded-xl px-4 text-xs shrink-0 cursor-pointer h-9"
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
