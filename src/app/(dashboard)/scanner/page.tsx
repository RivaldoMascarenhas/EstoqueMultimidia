"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Volume2, 
  VolumeX, 
  Keyboard, 
  ArrowRight, 
  SwitchCamera,
  Flashlight,
  Zap,
  QrCode,
  Check,
  Loader2,
  Sparkles,
  Copy,
  Trash2,
  ListOrdered
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScannerResultSheet } from "@/components/scanner/scanner-result-sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  BarcodeScannerEngine, 
  DetectedBarcode, 
  ScannerCameraDevice 
} from "@/lib/scanner/barcode-scanner.engine";
import { scannerFeedback } from "@/lib/scanner/scanner-feedback";

type ScanMode = "LOOKUP" | "LOAN" | "RETURN" | "AUDIT" | "MAINTENANCE";
type ExecutionMode = "SINGLE" | "BATCH";

interface DetectedBox {
  x: number;
  y: number;
  width: number;
  height: number;
  rawValue?: string;
}

interface BatchScannedItem {
  id: number;
  code: string;
  timestamp: number;
}

function ScannerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Estados do Scanner e Câmera
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<ScannerCameraDevice[]>([]);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState<number>(0);
  const [activeCameraLabel, setActiveCameraLabel] = useState<string>("");
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [hasTorchSupport, setHasTorchSupport] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isNativeEngine, setIsNativeEngine] = useState(false);
  const [selectedMode, setSelectedMode] = useState<ScanMode>("LOOKUP");
  const [executionMode, setExecutionMode] = useState<ExecutionMode>("SINGLE");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualCode, setManualCode] = useState("");
  const [isLoadingLookup, setIsLoadingLookup] = useState(false);
  const [justScannedCode, setJustScannedCode] = useState<string | null>(null);

  // Zoom e Retículo
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [detectedBox, setDetectedBox] = useState<DetectedBox | null>(null);

  // Itens em Lote (Batch / Inventário Contínuo)
  const [batchItems, setBatchItems] = useState<BatchScannedItem[]>([]);

  // Resultado da Leitura Única
  const [scanResult, setScanResult] = useState<{
    entityType: "ASSET" | "BOX" | "ITEM" | "LOAN" | "MAINTENANCE" | "DOCUMENT_VALIDATION";
    data: any;
  } | null>(null);

  // Histórico da Sessão
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);

  // Referências
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const engineRef = useRef<BarcodeScannerEngine | null>(null);
  const isMountedRef = useRef(true);
  const isProcessingRef = useRef(false);
  const lastScannedCodeRef = useRef<string | null>(null);
  const lastScannedTimeRef = useRef<number>(0);
  const initialTouchDistRef = useRef<number | null>(null);
  const initialZoomOnPinchRef = useRef<number>(1);
  const resultSectionRef = useRef<HTMLDivElement>(null);
  const cameraCardRef = useRef<HTMLDivElement>(null);

  // Parar Scanner de forma segura
  const stopCamera = useCallback(async () => {
    if (engineRef.current) {
      try {
        await engineRef.current.stop();
      } catch (e) {
        console.warn("Aviso ao parar leitor:", e);
      }
      engineRef.current = null;
    }
    setDetectedBox(null);
    setIsTorchOn(false);
    setHasTorchSupport(false);
    if (isMountedRef.current) {
      setIsScanning(false);
    }
  }, []);

  // Iniciar Scanner com Motor Híbrido (GPU Hardware ou Fallback)
  const startCamera = useCallback(async (targetDeviceId?: string, cameraIndex?: number) => {
    try {
      if (!isMountedRef.current || !videoRef.current) return;
      setCameraError(null);
      isProcessingRef.current = false;

      await stopCamera();
      await new Promise((resolve) => setTimeout(resolve, 80));
      if (!isMountedRef.current || !videoRef.current) return;

      const available = await BarcodeScannerEngine.getAvailableCameras();
      if (isMountedRef.current) {
        setCameras(available);
      }

      let chosenId = targetDeviceId;
      let currentIndex = typeof cameraIndex === "number" ? cameraIndex : selectedCameraIndex;

      if (!chosenId && available.length > 0) {
        const savedId = typeof window !== "undefined" ? localStorage.getItem("unifap_scanner_cam_id") : null;
        if (savedId && available.some((c) => c.id === savedId)) {
          chosenId = savedId;
          currentIndex = available.findIndex((c) => c.id === savedId);
        } else {
          // Prioriza câmera traseira
          const backIdx = available.findIndex((c) => c.isBackCamera);
          if (backIdx !== -1) {
            currentIndex = backIdx;
            chosenId = available[backIdx].id;
          } else {
            currentIndex = 0;
            chosenId = available[0].id;
          }
        }
      }

      setSelectedCameraIndex(currentIndex >= 0 && currentIndex < available.length ? currentIndex : 0);
      setActiveCameraLabel(available[currentIndex]?.label || `Câmera ${currentIndex + 1}`);

      const engine = new BarcodeScannerEngine({
        videoElement: videoRef.current,
        containerId: "scanner-viewfinder",
        onDetected: (barcode) => {
          handleBarcodeDetected(barcode);
        },
        onError: (err) => {
          if (isMountedRef.current) {
            setCameraError(err.message || "Erro ao iniciar o leitor óptico.");
          }
        },
      });

      engineRef.current = engine;
      const res = await engine.start(chosenId);

      if (!isMountedRef.current) {
        await engine.stop();
        return;
      }

      const caps = engine.getCapabilitiesInfo();
      setHasTorchSupport(caps.hasTorch);
      setIsNativeEngine(res.isNative);
      setIsScanning(true);
    } catch (err: any) {
      console.warn("Erro ao iniciar câmera no scanner:", err);
      if (isMountedRef.current) {
        setCameraError(
          "Não foi possível acessar a câmera do dispositivo. Verifique as permissões de vídeo do navegador."
        );
        setIsScanning(false);
      }
    }
  }, [selectedCameraIndex, stopCamera]);

  // Alternar Lanterna
  const handleToggleTorch = async () => {
    if (!engineRef.current || !hasTorchSupport) return;
    const next = !isTorchOn;
    const success = await engineRef.current.setTorch(next);
    if (success) {
      setIsTorchOn(next);
    } else {
      toast.error("Não foi possível controlar a lanterna.");
    }
  };

  // Alternar Zoom
  const applyZoom = useCallback(async (level: number) => {
    setZoomLevel(level);
    if (engineRef.current) {
      await engineRef.current.setZoom(level);
    }
  }, []);

  // Alternar Câmeras
  const handleToggleFacingMode = async () => {
    if (isSwitchingCamera) return;
    setIsSwitchingCamera(true);

    try {
      let availableCams = cameras;
      if (availableCams.length === 0) {
        availableCams = await BarcodeScannerEngine.getAvailableCameras();
        setCameras(availableCams);
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
        await startCamera();
      }
    } catch {
      toast.error("Não foi possível alternar a câmera.");
    } finally {
      setIsSwitchingCamera(false);
    }
  };

  // Pinch-to-zoom em telas touch
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
      const target = Math.min(Math.max(initialZoomOnPinchRef.current * factor, 1.0), 3.0);
      applyZoom(Number(target.toFixed(1)));
    }
  };

  const handleTouchEnd = () => {
    initialTouchDistRef.current = null;
  };

  // Processamento de Leitura
  const handleBarcodeDetected = useCallback(async (barcode: DetectedBarcode) => {
    const raw = barcode.rawValue?.trim();
    if (!raw) return;

    const now = Date.now();

    // Se detectou bounding box, atualiza o retículo
    if (barcode.boundingBox && videoRef.current && videoRef.current.videoWidth > 0) {
      const vW = videoRef.current.videoWidth;
      const vH = videoRef.current.videoHeight;
      setDetectedBox({
        x: Math.max(0, (barcode.boundingBox.x / vW) * 100),
        y: Math.max(0, (barcode.boundingBox.y / vH) * 100),
        width: Math.min(100, (barcode.boundingBox.width / vW) * 100),
        height: Math.min(100, (barcode.boundingBox.height / vH) * 100),
        rawValue: raw,
      });
    }

    // MODO LOTE / INVENTÁRIO CONTÍNUO
    if (executionMode === "BATCH") {
      // Debounce de 2s para o mesmo item consecutivo
      if (lastScannedCodeRef.current === raw && now - lastScannedTimeRef.current < 2000) {
        return;
      }
      lastScannedCodeRef.current = raw;
      lastScannedTimeRef.current = now;

      scannerFeedback.triggerSuccess({ sound: soundEnabled, vibration: true });
      setJustScannedCode(raw);

      setBatchItems((prev) => {
        const alreadyExists = prev.some((i) => i.code === raw);
        if (alreadyExists) {
          toast.info(`Item ${raw} já registrado no lote`);
          return prev;
        }
        toast.success(`Adicionado ao lote: ${raw}`);
        return [{ id: Date.now(), code: raw, timestamp: Date.now() }, ...prev];
      });

      setTimeout(() => {
        if (isMountedRef.current) {
          setDetectedBox(null);
          setJustScannedCode(null);
        }
      }, 1000);
      return;
    }

    // MODO LEITURA ÚNICA
    if (isProcessingRef.current) return;
    if (lastScannedCodeRef.current === raw && now - lastScannedTimeRef.current < 3000) {
      return;
    }

    isProcessingRef.current = true;
    lastScannedCodeRef.current = raw;
    lastScannedTimeRef.current = now;

    scannerFeedback.triggerSuccess({ sound: soundEnabled, vibration: true });
    setJustScannedCode(raw);

    await processCodeLookup(raw);
  }, [executionMode, soundEnabled]);

  // Consulta do Código na API
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

        toast.dismiss();
        toast.success("Código identificado com sucesso!");

        // Auto-Scroll suave no mobile para ver os dados do item
        setTimeout(() => {
          if (resultSectionRef.current) {
            resultSectionRef.current.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }
        }, 120);

        if (selectedMode === "LOAN" && json.entityType === "ASSET") {
          router.push(`/emprestimos?assetTag=${json.data.asset.assetTag}`);
        } else if (selectedMode === "MAINTENANCE" && json.entityType === "ASSET") {
          router.push(`/manutencao?assetTag=${json.data.asset.assetTag}`);
        } else if (selectedMode === "AUDIT" && json.entityType === "BOX") {
          router.push(`/caixas/${json.data.code}`);
        }
      } else {
        scannerFeedback.triggerError({ sound: soundEnabled, vibration: true });
        toast.error(json.error || "Item ou documento não encontrado no sistema.");
        setTimeout(() => {
          isProcessingRef.current = false;
          setDetectedBox(null);
        }, 1500);
      }
    } catch {
      scannerFeedback.triggerError({ sound: soundEnabled, vibration: true });
      toast.error("Erro ao consultar o banco de dados.");
      setTimeout(() => {
        isProcessingRef.current = false;
        setDetectedBox(null);
      }, 1500);
    } finally {
      setIsLoadingLookup(false);
      setJustScannedCode(null);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    scannerFeedback.triggerSuccess({ sound: soundEnabled, vibration: true });
    processCodeLookup(manualCode.trim());
    setManualCode("");
  };

  const handleScanNext = () => {
    setScanResult(null);
    setDetectedBox(null);
    setJustScannedCode(null);
    applyZoom(1);

    isProcessingRef.current = false;
    lastScannedCodeRef.current = null;

    setTimeout(() => {
      cameraCardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 80);
  };

  const handleCopyBatch = () => {
    const list = batchItems.map((i) => i.code).join("\n");
    navigator.clipboard.writeText(list);
    toast.success("Códigos copiados para a área de transferência!");
  };

  const handleClearBatch = () => {
    setBatchItems([]);
    toast.info("Lote de leitura limpo.");
  };

  // Ciclo de Vida
  useEffect(() => {
    isMountedRef.current = true;
    startCamera();

    const searchUrl = searchParams.get("search");
    if (searchUrl) {
      processCodeLookup(searchUrl);
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopCamera();
      } else if (isMountedRef.current && !scanResult) {
        startCamera();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-5 max-w-4xl mx-auto animate-in fade-in-50 duration-300 pb-16">
      
      {/* Header com Ações Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              Scanner Inteligente
            </h1>
            <Badge variant={isScanning ? "default" : "secondary"} className="text-[11px] font-semibold">
              {isScanning ? (isNativeEngine ? "GPU 60 FPS" : "Pronto") : "Pausado"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Aponte a câmera para códigos de patrimônio, caixas, termos impressos ou ordens de serviço.
          </p>
        </div>

        {/* Atalhos de Áudio e Reiniciar */}
        <div className="flex items-center gap-2">
          {/* Seletor de Modo: Individual vs Lote */}
          <div className="flex items-center rounded-xl bg-muted/60 p-1 border border-border/60">
            <button
              type="button"
              onClick={() => setExecutionMode("SINGLE")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                executionMode === "SINGLE" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Individual
            </button>
            <button
              type="button"
              onClick={() => setExecutionMode("BATCH")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                executionMode === "BATCH" 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>Lote</span>
              {batchItems.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-primary-foreground text-primary text-[10px] font-bold flex items-center justify-center">
                  {batchItems.length}
                </span>
              )}
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="rounded-xl text-xs h-8 sm:h-9 gap-1.5 cursor-pointer"
            title={soundEnabled ? "Silenciar áudio de bip" : "Ativar áudio de bip"}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-primary" /> : <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />}
            <span className="hidden sm:inline">{soundEnabled ? "Som" : "Mudo"}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              toast.info("Reiniciando leitor...");
              startCamera();
            }}
            className="rounded-xl text-xs h-8 sm:h-9 gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Recarregar câmera"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Recarregar</span>
          </Button>
        </div>
      </div>

      {/* Seletor de Modo Operacional */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
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
              className={cn(
                "px-3.5 py-1.5 sm:py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm font-bold"
                  : "bg-card border border-border/80 text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{mode.label}</span>
            </button>
          );
        })}
      </div>

      {/* Grid Principal: Viewfinder e Resultados */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
        
        {/* Card do Viewfinder Moderno & Edge-to-Edge */}
        <Card ref={cameraCardRef} className="rounded-3xl border-border/80 overflow-hidden shadow-2xl bg-slate-950 relative">
          
          <div 
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="relative h-[65vh] sm:h-auto sm:aspect-square w-full bg-black flex flex-col items-center justify-center overflow-hidden touch-none select-none"
          >
            {/* Viewfinder da Câmera (Edge-to-Edge com Hardware Acceleration) */}
            <div id="scanner-viewfinder" className="w-full h-full relative">
              <video
                ref={videoRef}
                className="w-full h-full object-cover transition-transform duration-300"
                playsInline
                muted
              />
            </div>

            {/* Vinheta sutil nas bordas */}
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_80px_rgba(0,0,0,0.65)] z-10" />

            {/* Indicador de Hardware / GPU no Top Left */}
            <div className="absolute top-3.5 left-3.5 z-30 flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 border border-white/15 backdrop-blur-md text-[10px] text-white/90">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span className="font-semibold">{isNativeEngine ? "Aceleração GPU" : "Modo Compatível"}</span>
              </div>
            </div>

            {/* Top Toolbar Flutuante Minimalista (Lanterna & Troca de Câmera) */}
            <div className="absolute top-3.5 right-3.5 z-30 flex items-center gap-2">
              {hasTorchSupport && (
                <button
                  type="button"
                  onClick={handleToggleTorch}
                  className={cn(
                    "flex items-center justify-center w-9 h-9 rounded-full border backdrop-blur-md transition-all cursor-pointer",
                    isTorchOn 
                      ? "bg-amber-400 text-black border-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.8)]" 
                      : "bg-black/55 hover:bg-black/80 text-white/90 border-white/15"
                  )}
                  title="Lanterna do celular"
                >
                  <Flashlight className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={handleToggleFacingMode}
                disabled={isSwitchingCamera}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/55 hover:bg-black/80 text-white/90 border border-white/15 backdrop-blur-md shadow-md active:scale-95 transition-all cursor-pointer"
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

            {/* Mira Minimalista Central com Feixe Laser Animado */}
            {isScanning && !scanResult && !detectedBox && !isLoadingLookup && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-15">
                <div className="relative w-52 h-52 sm:w-56 sm:h-56">
                  <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-emerald-400 rounded-tl-xl shadow-sm" />
                  <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-emerald-400 rounded-tr-xl shadow-sm" />
                  <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-emerald-400 rounded-bl-xl shadow-sm" />
                  <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-emerald-400 rounded-br-xl shadow-sm" />
                  <div className="qr-laser-line" />
                </div>
              </div>
            )}

            {/* RETÍCULO DINÂMICO INTELIGENTE SOBRE O QR CODE DETECTADO */}
            {isScanning && !scanResult && detectedBox && !isLoadingLookup && (
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

                {/* Floating Lens Pill estilo Google Lens */}
                <div className="qr-lens-pill absolute -top-8 left-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400 text-black text-[11px] font-black shadow-2xl backdrop-blur-md whitespace-nowrap">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Código Detectado</span>
                </div>
              </div>
            )}

            {/* FEEDBACK INSTANTÂNEO DE LEITURA (SEM TELA PRETA) */}
            {isLoadingLookup && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center space-y-2 z-40 animate-in fade-in duration-200">
                <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-black/85 border border-emerald-500/50 text-white shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-black font-bold">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span className="text-xs font-bold text-emerald-300">
                    {justScannedCode ? `Lido: ${justScannedCode}` : "Carregando informações..."}
                  </span>
                </div>
              </div>
            )}

            {/* CONTROLES DE ZOOM FLUTUANTES (Estilo Apple / Google Camera) */}
            {isScanning && !scanResult && !isLoadingLookup && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/65 border border-white/15 backdrop-blur-xl shadow-2xl">
                {[1, 2, 3].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => applyZoom(lvl)}
                    className={cn(
                      "w-7 h-7 rounded-full text-[11px] font-bold flex items-center justify-center transition-all cursor-pointer active:scale-90",
                      zoomLevel === lvl 
                        ? "bg-white text-black font-extrabold shadow-md scale-105" 
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {lvl}x
                  </button>
                ))}
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

        {/* Coluna Direita: Resultado ou Histórico / Lote */}
        <div ref={resultSectionRef} className="space-y-4 scroll-mt-6">
          {scanResult ? (
            <ScannerResultSheet
              result={scanResult}
              onClose={() => setScanResult(null)}
              onScanNext={handleScanNext}
            />
          ) : executionMode === "BATCH" ? (
            /* Painel do Modo Lote / Inventário Contínuo */
            <Card className="rounded-3xl border-border/80 shadow-sm p-5 space-y-4 bg-card">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">
                    Itens Lidos no Lote
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="default" className="text-[11px] font-bold">
                    {batchItems.length} Itens
                  </Badge>
                  {batchItems.length > 0 && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCopyBatch}
                        className="w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Copiar lista de códigos"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleClearBatch}
                        className="w-7 h-7 rounded-lg text-muted-foreground hover:text-destructive cursor-pointer"
                        title="Limpar lote"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {batchItems.length === 0 ? (
                <div className="py-12 text-center space-y-2 text-muted-foreground">
                  <Boxes className="w-8 h-8 mx-auto opacity-30 text-primary" />
                  <p className="text-xs font-medium">Modo Inventário Ativo</p>
                  <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                    Aponte sucessivamente para as etiquetas. A câmera não pausa e cada leitura gera um bip imediato.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {batchItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-muted/40 hover:bg-muted/70 border border-border/60 flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-mono text-xs font-bold shrink-0">
                          {batchItems.length - idx}
                        </div>
                        <div>
                          <strong className="text-xs font-bold text-foreground block font-mono">
                            {item.code}
                          </strong>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(item.timestamp).toLocaleTimeString("pt-BR")}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setBatchItems((prev) => prev.filter((i) => i.id !== item.id));
                        }}
                        className="w-7 h-7 text-muted-foreground hover:text-destructive cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ) : (
            /* Histórico da Sessão Normal */
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

export default function ScannerPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Iniciando leitor de QR Code...</p>
      </div>
    }>
      <ScannerContent />
    </Suspense>
  );
}
