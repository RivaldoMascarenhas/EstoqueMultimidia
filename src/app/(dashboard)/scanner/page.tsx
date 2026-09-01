"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import { 
  Camera, 
  RefreshCw, 
  Search, 
  Handshake, 
  Boxes, 
  Wrench, 
  History, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Keyboard, 
  ArrowRight, 
  SwitchCamera,
  Flashlight,
  FlashlightOff,
  Maximize2,
  Zap,
  Target,
  QrCode
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScannerResultSheet } from "@/components/scanner/scanner-result-sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ScanMode = "LOOKUP" | "LOAN" | "RETURN" | "AUDIT" | "MAINTENANCE";

interface DetectedBox {
  x: number;
  y: number;
  width: number;
  height: number;
  rawValue?: string;
}

export default function ScannerPage() {
  const router = useRouter();

  // Estados do Scanner
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState<number>(0);
  const [activeCameraLabel, setActiveCameraLabel] = useState<string>("");
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [hasTorchSupport, setHasTorchSupport] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [selectedMode, setSelectedMode] = useState<ScanMode>("LOOKUP");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualCode, setManualCode] = useState("");
  const [isLoadingLookup, setIsLoadingLookup] = useState(false);

  // Estados de Zoom & Detecção Inteligente
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [autoZoomEnabled, setAutoZoomEnabled] = useState<boolean>(true);
  const [detectedBox, setDetectedBox] = useState<DetectedBox | null>(null);

  // Resultado
  const [scanResult, setScanResult] = useState<{
    entityType: "ASSET" | "BOX" | "ITEM" | "LOAN" | "MAINTENANCE" | "DOCUMENT_VALIDATION";
    data: any;
  } | null>(null);

  // Histórico da Sessão
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isSwitchingRef = useRef(false);
  const isMountedRef = useRef(true);
  const isScanningRef = useRef(false);
  const detectLoopRef = useRef<number | null>(null);
  const initialTouchDistRef = useRef<number | null>(null);
  const initialZoomOnPinchRef = useRef<number>(1);
  const lastAutoZoomTimeRef = useRef<number>(0);

  // Som sutil de detecção
  const playTargetLockSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {}
  };

  const playDecodeSuccessSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(900, ctx.currentTime);
      osc.frequency.setValueAtTime(1800, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.14);
    } catch {}
  };

  const triggerHaptic = (pattern: number | number[] = 80) => {
    if (typeof window !== "undefined" && "navigator" in window && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  // Aplicação do Nível de Zoom (Hardware WebRTC + Fallback Digital CSS)
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
          console.warn("Hardware zoom error:", e);
        }
      }
    }

    const video = document.querySelector("#scanner-viewfinder video") as HTMLVideoElement;
    if (video) {
      video.style.transition = "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)";
      video.style.transform = `scale(${level})`;
      video.style.transformOrigin = "center center";
    }
  }, []);

  // Encerra imediatamente hardware da câmera
  const killAllVideoHardware = useCallback(() => {
    if (detectLoopRef.current) {
      cancelAnimationFrame(detectLoopRef.current);
      detectLoopRef.current = null;
    }

    if (activeStreamRef.current) {
      try {
        activeStreamRef.current.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
      } catch {}
      activeStreamRef.current = null;
    }

    if (typeof document !== "undefined") {
      document.querySelectorAll("video").forEach((video) => {
        try {
          if (video.srcObject) {
            const stream = video.srcObject as MediaStream;
            stream.getTracks().forEach((t) => {
              t.stop();
              t.enabled = false;
            });
            video.srcObject = null;
          }
        } catch {}
      });
    }

    setIsTorchOn(false);
    setHasTorchSupport(false);
    setDetectedBox(null);
  }, []);

  const stopCamera = useCallback(async () => {
    killAllVideoHardware();

    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        console.warn("Aviso ao parar scanner:", e);
      }
      scannerRef.current = null;
    }

    killAllVideoHardware();
    if (isMountedRef.current) {
      setIsScanning(false);
    }
  }, [killAllVideoHardware]);

  // Loop contínuo de detecção de QR Code inteligente (Estilo Google Lens / Apple Camera)
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

      const video = document.querySelector("#scanner-viewfinder video") as HTMLVideoElement;
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
                rawValue: b.rawValue,
              });

              const now = Date.now();
              if (autoZoomEnabled && relW < 22 && now - lastAutoZoomTimeRef.current > 2000) {
                lastAutoZoomTimeRef.current = now;
                playTargetLockSound();
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

  const refreshCameraList = async (): Promise<Array<{ id: string; label: string }>> => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        if (isMountedRef.current) setCameras(devices);
        return devices;
      }
    } catch (e) {
      console.warn("Erro ao enumerar câmeras:", e);
    }
    return [];
  };

  const startCamera = async (targetCameraIdOrMode?: string | { facingMode: string }, cameraIndex?: number) => {
    try {
      if (!isMountedRef.current) return;
      setCameraError(null);
      setScanResult(null);

      await stopCamera();
      await new Promise((resolve) => setTimeout(resolve, 150));
      if (!isMountedRef.current) return;

      const html5QrCode = new Html5Qrcode("scanner-viewfinder");
      scannerRef.current = html5QrCode;

      const scanConfig = {
        fps: 25,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdge * 0.85);
          return {
            width: qrboxSize,
            height: qrboxSize,
          };
        },
        aspectRatio: 1.0,
      };

      const handleSuccess = (decodedText: string) => {
        handleCodeDetected(decodedText);
      };

      let availableCams = cameras;
      if (availableCams.length === 0) {
        availableCams = await refreshCameraList();
      }

      let configToUse: any = targetCameraIdOrMode;

      if (!configToUse) {
        const savedCamId = typeof window !== "undefined" ? localStorage.getItem("unifap_scanner_cam_id") : null;
        if (savedCamId && availableCams.some((c) => c.id === savedCamId)) {
          configToUse = savedCamId;
          const idx = availableCams.findIndex((c) => c.id === savedCamId);
          setSelectedCameraIndex(idx !== -1 ? idx : 0);
          setActiveCameraLabel(availableCams[idx]?.label || `Câmera ${idx + 1}`);
        } else if (availableCams.length > 0) {
          let idx = typeof cameraIndex === "number" ? cameraIndex : selectedCameraIndex;
          if (idx >= availableCams.length) idx = 0;

          if (typeof cameraIndex !== "number") {
            const backIdx = availableCams.findIndex((c) => /back|rear|environment|traseira/i.test(c.label));
            if (backIdx !== -1) idx = backIdx;
          }

          setSelectedCameraIndex(idx);
          setActiveCameraLabel(availableCams[idx]?.label || `Câmera ${idx + 1}`);
          configToUse = availableCams[idx].id;
        } else {
          configToUse = { facingMode: "environment" };
        }
      }

      try {
        await html5QrCode.start(configToUse, scanConfig, handleSuccess, () => {});
      } catch (firstErr) {
        try {
          if (availableCams.length > 0) {
            await html5QrCode.start(availableCams[0].id, scanConfig, handleSuccess, () => {});
          } else {
            await html5QrCode.start({ facingMode: "user" }, scanConfig, handleSuccess, () => {});
          }
        } catch (secondErr) {
          throw secondErr;
        }
      }

      if (!isMountedRef.current) {
        killAllVideoHardware();
        return;
      }

      const videoEl = document.querySelector("#scanner-viewfinder video") as HTMLVideoElement;
      if (videoEl && videoEl.srcObject) {
        const stream = videoEl.srcObject as MediaStream;
        activeStreamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        if (track) {
          const cap = (track.getCapabilities && track.getCapabilities()) as any;
          setHasTorchSupport(!!(cap && cap.torch));
        }
      }

      isScanningRef.current = true;
      if (isMountedRef.current) {
        setIsScanning(true);
        startDetectionLoop();
      }
    } catch (err: any) {
      console.warn("Erro ao iniciar câmera:", err);
      if (isMountedRef.current) {
        setCameraError(
          "Não foi possível acessar a câmera do dispositivo. Verifique as permissões do navegador."
        );
        setIsScanning(false);
      }
    }
  };

  const handleToggleTorch = async () => {
    if (!activeStreamRef.current) return;
    const track = activeStreamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextState = !isTorchOn;
      await track.applyConstraints({
        advanced: [{ torch: nextState }] as any,
      });
      setIsTorchOn(nextState);
    } catch {
      toast.error("Não foi possível controlar a lanterna.");
    }
  };

  const handleToggleFacingMode = async () => {
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

        if (typeof window !== "undefined") {
          localStorage.setItem("unifap_scanner_cam_id", nextCam.id);
        }

        await startCamera(nextCam.id, nextIndex);
        toast.info(`${nextCam.label || `Câmera ${nextIndex + 1}`} (${nextIndex + 1}/${availableCams.length})`);
      } else {
        const nextMode = activeCameraLabel.includes("Frontal") ? "environment" : "user";
        await startCamera({ facingMode: nextMode });
      }
    } catch {
      toast.error("Não foi possível alternar a câmera.");
    } finally {
      isSwitchingRef.current = false;
      setIsSwitchingCamera(false);
    }
  };

  // Gesto Pinch-to-Zoom
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
    startCamera();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        killAllVideoHardware();
      } else if (isMountedRef.current && !scanResult) {
        startCamera();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      killAllVideoHardware();
      stopCamera();
    };
  }, []);

  const handleCodeDetected = async (code: string) => {
    if (isLoadingLookup) return;

    playDecodeSuccessSound();
    triggerHaptic([40, 60, 40]);

    stopCamera();
    await processCodeLookup(code);
  };

  const processCodeLookup = async (codeToLookup: string) => {
    try {
      setIsLoadingLookup(true);
      const res = await fetch("/api/v1/scanner/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeToLookup }),
      });

      const json = await res.json();

      if (json.success) {
        setScanResult(json);
        
        setSessionHistory((prev) => [
          {
            id: Date.now(),
            entityType: json.entityType,
            code: codeToLookup,
            data: json.data,
            timestamp: new Date(),
          },
          ...prev.slice(0, 9),
        ]);

        toast.success("Código identificado com sucesso!");

        if (selectedMode === "LOAN" && json.entityType === "ASSET") {
          router.push(`/emprestimos?assetTag=${json.data.asset.assetTag}`);
        } else if (selectedMode === "MAINTENANCE" && json.entityType === "ASSET") {
          router.push(`/manutencao?assetTag=${json.data.asset.assetTag}`);
        } else if (selectedMode === "AUDIT" && json.entityType === "BOX") {
          router.push(`/caixas/${json.data.code}`);
        }
      } else {
        toast.error(json.error || "Item ou documento não encontrado no sistema.");
      }
    } catch {
      toast.error("Erro ao consultar o banco de dados.");
    } finally {
      setIsLoadingLookup(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    triggerHaptic(60);
    processCodeLookup(manualCode.trim());
    setManualCode("");
  };

  const handleScanNext = () => {
    setScanResult(null);
    setDetectedBox(null);
    applyZoom(1);
    startCamera();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in-50 duration-300 pb-12">
      
      {/* Header Limpo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Camera className="w-6 h-6 text-primary" />
              Scanner Inteligente
            </h1>
            <Badge variant={isScanning ? "default" : "secondary"} className="text-xs font-semibold">
              {isScanning ? "Pronto" : "Pausado"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Aponte para qualquer QR Code institucional, caixa física ou etiqueta de patrimônio.
          </p>
        </div>

        {/* Atalhos Rápidos */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="rounded-xl text-xs h-9 gap-1.5 cursor-pointer"
            title={soundEnabled ? "Silenciar áudio" : "Ativar áudio"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
            <span className="hidden sm:inline">{soundEnabled ? "Som Ativo" : "Mudo"}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              toast.info("Reiniciando câmera...");
              startCamera();
            }}
            className="rounded-xl text-xs h-9 gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Recarregar leitor"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Recarregar</span>
          </Button>
        </div>
      </div>

      {/* Seletor de Modo Operacional */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: "LOOKUP", label: "Consulta Geral", icon: Search },
          { id: "LOAN", label: "Empréstimo Rápido", icon: Handshake },
          { id: "RETURN", label: "Devolução Expressa", icon: CheckCircle2 },
          { id: "AUDIT", label: "Auditoria de Caixa", icon: Boxes },
          { id: "MAINTENANCE", label: "Abertura de OS", icon: Wrench },
        ].map((mode) => {
          const Icon = mode.icon;
          const isSelected = selectedMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => setSelectedMode(mode.id as ScanMode)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm font-bold"
                  : "bg-card border border-border/80 text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{mode.label}</span>
            </button>
          );
        })}
      </div>

      {/* Grid Principal: Viewfinder e Resultados */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
        {/* Card do Viewfinder Moderno & Minimalista */}
        <Card className="rounded-3xl border-border/80 overflow-hidden shadow-xl bg-slate-950 relative">
          
          <div 
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="relative aspect-square w-full bg-black flex flex-col items-center justify-center overflow-hidden touch-none select-none"
          >
            {/* Viewfinder da Câmera (Edge-to-Edge) */}
            <div id="scanner-viewfinder" className="w-full h-full" />

            {/* Vinheta sutil e moderna nas bordas */}
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_60px_rgba(0,0,0,0.55)] z-10" />

            {/* Top Toolbar Minimalista (Câmera & Lanterna) */}
            <div className="absolute top-3.5 right-3.5 z-30 flex items-center gap-2">
              {hasTorchSupport && (
                <button
                  type="button"
                  onClick={handleToggleTorch}
                  className={cn(
                    "flex items-center justify-center w-9 h-9 rounded-full border backdrop-blur-md transition-all cursor-pointer",
                    isTorchOn 
                      ? "bg-amber-400 text-black border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.6)]" 
                      : "bg-black/50 hover:bg-black/75 text-white/90 border-white/15"
                  )}
                  title="Lanterna"
                >
                  <Flashlight className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={handleToggleFacingMode}
                disabled={isSwitchingCamera}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 hover:bg-black/75 text-white/90 border border-white/15 backdrop-blur-md shadow-md active:scale-95 transition-all cursor-pointer"
                title="Trocar de Câmera"
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

            {/* Mira Minimalista Central (Apenas 4 cantinhos sutis no meio) */}
            {isScanning && !scanResult && !detectedBox && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-15">
                <div className="relative w-48 h-48 sm:w-56 sm:h-56">
                  {/* Cantos sutis translúcidos */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white/40 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white/40 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white/40 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white/40 rounded-br-lg" />
                </div>
              </div>
            )}

            {/* RETÍCULO DINÂMICO (ENQUADRA EXATAMENTE O QR CODE QUANDO ENCONTRADO) */}
            {isScanning && !scanResult && detectedBox && (
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

                {/* Tag de Ação Flutuante Estilo Apple Camera */}
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-yellow-500/90 text-black text-[10px] font-bold shadow-lg backdrop-blur-sm whitespace-nowrap animate-in fade-in zoom-in-95 duration-200">
                  <QrCode className="w-3 h-3" />
                  <span>QR Detectado</span>
                </div>
              </div>
            )}

            {/* CONTROLES DE ZOOM FLUTUANTES (ESTILO APPLE CAMERA) */}
            {isScanning && !scanResult && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 border border-white/15 backdrop-blur-xl shadow-2xl">
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
                  title="Aproximação inteligente ao detectar código distante"
                >
                  <Zap className={cn("w-2.5 h-2.5", autoZoomEnabled ? "text-yellow-400" : "text-white/40")} />
                  <span>Auto</span>
                </button>
              </div>
            )}

            {/* Aviso de erro */}
            {cameraError && (
              <div className="p-6 text-center space-y-3 max-w-xs z-20">
                <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="text-xs text-slate-300 font-medium">{cameraError}</p>
                <Button
                  size="sm"
                  onClick={() => startCamera()}
                  className="rounded-xl text-xs gap-1.5 bg-primary text-primary-foreground cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tentar Novamente</span>
                </Button>
              </div>
            )}

            {/* Loading */}
            {isLoadingLookup && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-2 z-40">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-xs text-white font-medium">Processando...</span>
              </div>
            )}
          </div>

          {/* Campo de Entrada Manual */}
          <div className="p-3 bg-card border-t border-border/80">
            <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Digitar código (#PAT-1002, C017, LOAN-..., OS-...)"
                  className="pl-9 h-9 rounded-xl text-xs bg-background"
                />
              </div>
              <Button type="submit" size="sm" className="h-9 px-4 rounded-xl text-xs font-semibold cursor-pointer">
                Buscar
              </Button>
            </form>
          </div>
        </Card>

        {/* Coluna Direita: Resultado ou Histórico */}
        <div className="space-y-4">
          {scanResult ? (
            <ScannerResultSheet
              result={scanResult}
              onClose={() => setScanResult(null)}
              onScanNext={handleScanNext}
            />
          ) : (
            <Card className="rounded-3xl border-border/80 shadow-sm p-5 space-y-4 bg-card">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">
                    Histórico da Sessão
                  </h3>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {sessionHistory.length} Leituras
                </Badge>
              </div>

              {sessionHistory.length === 0 ? (
                <div className="py-12 text-center space-y-2 text-muted-foreground">
                  <Camera className="w-8 h-8 mx-auto opacity-30 text-primary" />
                  <p className="text-xs">Nenhum código escaneado ainda.</p>
                  <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                    Aponte a câmera para etiquetas de caixas, patrimônio ou termos impressos.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {sessionHistory.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setScanResult(item)}
                      className="p-3 rounded-2xl bg-muted/40 hover:bg-muted/70 border border-border/60 flex items-center justify-between transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-mono text-xs font-bold shrink-0">
                          {item.entityType === "ASSET" ? "#" : item.entityType === "BOX" ? "CX" : "DOC"}
                        </div>
                        <div>
                          <strong className="text-xs font-bold text-foreground block">
                            {item.entityType === "ASSET" 
                              ? `#${item.data.asset?.assetTag} - ${item.data.asset?.item?.name}`
                              : item.entityType === "BOX"
                              ? `${item.data.code} - ${item.data.name}`
                              : item.code}
                          </strong>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(item.timestamp).toLocaleTimeString("pt-BR")}
                          </span>
                        </div>
                      </div>

                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
