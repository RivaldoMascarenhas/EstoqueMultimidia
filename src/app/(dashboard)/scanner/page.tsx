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
  Maximize2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScannerResultSheet } from "@/components/scanner/scanner-result-sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ScanMode = "LOOKUP" | "LOAN" | "RETURN" | "AUDIT" | "MAINTENANCE";

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

  // Resultado
  const [scanResult, setScanResult] = useState<{
    entityType: "ASSET" | "BOX" | "ITEM" | "LOAN" | "MAINTENANCE";
    data: any;
  } | null>(null);

  // Histórico da Sessão
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isSwitchingRef = useRef(false);
  const isMountedRef = useRef(true);

  // Tocar beep suave usando Web Audio API nativo
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {}
  };

  // Disparar vibração háptica no celular
  const triggerHaptic = () => {
    if (typeof window !== "undefined" && "navigator" in window && navigator.vibrate) {
      navigator.vibrate(80);
    }
  };

  // Encerra imediatamente todas as faixas e libera a webcam no Windows/Android/iOS (LED desliga na hora)
  const killAllVideoHardware = useCallback(() => {
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
  }, []);

  // Parar câmera e limpar Html5Qrcode
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

  // Atualizar lista de dispositivos de câmera
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

  // Alternar Lanterna / Flash (Torch) em dispositivos móveis compatíveis
  const handleToggleTorch = async () => {
    if (!activeStreamRef.current) return;
    const track = activeStreamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const capabilities = (track.getCapabilities && track.getCapabilities()) as any;
        if (capabilities && capabilities.torch) {
          const nextState = !isTorchOn;
          await track.applyConstraints({
            advanced: [{ torch: nextState } as any],
          });
          setIsTorchOn(nextState);
          toast.success(nextState ? "Lanterna ligada" : "Lanterna desligada");
        } else {
          toast.info("Lanterna não suportada nesta câmera.");
        }
      } catch (e) {
        toast.error("Não foi possível acionar a lanterna.");
      }
    }
  };

  // Iniciar Leitura da Câmera com suporte total a PC (deviceId) e Mobile (facingMode)
  const startCamera = useCallback(async (targetCameraIdOrMode?: string | { facingMode: string }, cameraIndex?: number) => {
    try {
      if (!isMountedRef.current) return;
      setCameraError(null);

      // Parar qualquer instância e faixas anteriores para liberar o hardware
      await stopCamera();

      // Buffer de 150ms para liberação de hardware
      await new Promise((resolve) => setTimeout(resolve, 150));
      if (!isMountedRef.current) return;

      const html5QrCode = new Html5Qrcode("scanner-viewfinder");
      scannerRef.current = html5QrCode;

      const scanConfig = {
        fps: 20,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdge * 0.72);
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

      // 1. Obter lista de câmeras disponíveis
      let availableCams = cameras;
      if (availableCams.length === 0) {
        availableCams = await refreshCameraList();
      }

      let configToUse: any = targetCameraIdOrMode;

      if (!configToUse) {
        // Verificar se há preferência salva no localStorage
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

      // Executar inicialização com fallbacks resilientes
      try {
        await html5QrCode.start(configToUse, scanConfig, handleSuccess, () => {});
      } catch (firstErr) {
        console.warn("Tentativa 1 falhou, tentando fallback ideal...", firstErr);
        try {
          if (typeof configToUse === "string") {
            await html5QrCode.start({ deviceId: { exact: configToUse } }, scanConfig, handleSuccess, () => {});
          } else {
            await html5QrCode.start({ facingMode: { ideal: configToUse.facingMode || "environment" } }, scanConfig, handleSuccess, () => {});
          }
        } catch (secondErr) {
          console.warn("Tentativa 2 falhou, tentando qualquer câmera disponível...", secondErr);
          const devs = await Html5Qrcode.getCameras().catch(() => []);
          if (devs.length > 0) {
            await html5QrCode.start(devs[0].id, scanConfig, handleSuccess, () => {});
            if (isMountedRef.current) {
              setSelectedCameraIndex(0);
              setActiveCameraLabel(devs[0].label || "Câmera 1");
            }
          } else {
            await html5QrCode.start({ facingMode: "user" }, scanConfig, handleSuccess, () => {});
          }
        }
      }

      if (!isMountedRef.current) {
        killAllVideoHardware();
        return;
      }

      // Rastrear MediaStream ativo para suporte a lanterna e desligamento seguro
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

      // Atualizar lista de câmeras com rótulos concedidos
      const updatedDevices = await refreshCameraList();
      if (updatedDevices.length > 0 && isMountedRef.current) {
        const currentIdx = typeof cameraIndex === "number" ? cameraIndex : selectedCameraIndex;
        if (updatedDevices[currentIdx]) {
          setActiveCameraLabel(updatedDevices[currentIdx].label);
        }
      }

      setIsScanning(true);
    } catch (err: any) {
      console.warn("Erro câmera:", err);
      if (isMountedRef.current) {
        setCameraError(
          "Não foi possível acessar a câmera. Verifique as permissões do navegador ou digite o código no campo abaixo."
        );
        setIsScanning(false);
      }
    }
  }, [stopCamera, killAllVideoHardware, cameras, selectedCameraIndex]);

  // Alternar entre câmeras disponíveis (PC multi-webcam e Mobile frontal/traseira)
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

        toast.info(
          `Câmera: ${nextCam.label || `Câmera ${nextIndex + 1}`} (${nextIndex + 1}/${availableCams.length})`
        );
      } else if (availableCams.length === 1) {
        const isCurrentlyFront = /front|user|frontal/i.test(availableCams[0].label);
        const targetMode = isCurrentlyFront ? "environment" : "user";

        try {
          await startCamera({ facingMode: targetMode });
          toast.info(`Alternando para modo ${targetMode === "environment" ? "Traseira" : "Frontal"}...`);
        } catch {
          toast.info(
            `Apenas 1 câmera detectada (${availableCams[0].label || "Webcam Principal"}). Conecte outra webcam ou use no celular para alternar câmeras.`,
            { duration: 4000 }
          );
        }
      } else {
        const nextMode = activeCameraLabel.includes("Frontal") ? "environment" : "user";
        await startCamera({ facingMode: nextMode });
        toast.info(`Alternado para modo ${nextMode === "environment" ? "Traseira" : "Frontal"}`);
      }
    } catch {
      toast.error("Não foi possível alternar a câmera.");
    } finally {
      isSwitchingRef.current = false;
      setIsSwitchingCamera(false);
    }
  };

  // Ciclo de Vida: Desligamento instantâneo do hardware ao mudar de página
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

    const handleBeforeUnload = () => {
      killAllVideoHardware();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      isMountedRef.current = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Desligamento instantâneo síncrono e assíncrono
      killAllVideoHardware();
      stopCamera();
    };
  }, []);

  // Processar código lido
  const handleCodeDetected = async (code: string) => {
    if (isLoadingLookup) return;

    playBeep();
    triggerHaptic();

    // Pausar câmera temporariamente
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
        
        // Adicionar ao histórico da sessão
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

        // Modos operacionais rápidos
        if (selectedMode === "LOAN" && json.entityType === "ASSET") {
          router.push(`/emprestimos?assetTag=${json.data.asset.assetTag}`);
        } else if (selectedMode === "MAINTENANCE" && json.entityType === "ASSET") {
          router.push(`/manutencao?assetTag=${json.data.asset.assetTag}`);
        } else if (selectedMode === "AUDIT" && json.entityType === "BOX") {
          router.push(`/caixas/${json.data.code}`);
        }
      } else {
        toast.error(json.error || "Item não encontrado no sistema.");
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
    triggerHaptic();
    processCodeLookup(manualCode.trim());
    setManualCode("");
  };

  const handleScanNext = () => {
    setScanResult(null);
    startCamera();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in-50 duration-300 pb-12">
      
      {/* Header do Scanner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Camera className="w-6 h-6 text-primary" />
              Scanner Mobile & QR Code
            </h1>
            <Badge variant={isScanning ? "default" : "secondary"} className="text-xs">
              {isScanning ? "Câmera Ativa" : "Câmera Pausada"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Aponte a câmera para o QR Code da caixa, do equipamento patrimonial ou do termo para ações imediatas.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Botão de Trocar Câmera (Frontal / Traseira / Webcams) */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleFacingMode}
            disabled={isSwitchingCamera}
            className="rounded-xl text-xs h-9 gap-2 border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-semibold cursor-pointer shadow-xs"
            title="Alternar entre câmeras disponíveis"
          >
            <SwitchCamera className={cn("w-4 h-4 text-primary transition-transform duration-300", isSwitchingCamera && "animate-spin text-amber-400")} />
            <span>
              {isSwitchingCamera 
                ? "Alternando..." 
                : cameras.length > 1 
                  ? `Trocar Câmera (${selectedCameraIndex + 1}/${cameras.length})` 
                  : activeCameraLabel 
                    ? (activeCameraLabel.length > 20 ? `${activeCameraLabel.slice(0, 20)}...` : activeCameraLabel)
                    : "Trocar Câmera"}
            </span>
          </Button>

          {/* Lanterna / Flash (Se suportado pelo dispositivo) */}
          {hasTorchSupport && (
            <Button
              variant={isTorchOn ? "default" : "outline"}
              size="sm"
              onClick={handleToggleTorch}
              className={cn("rounded-xl text-xs h-9 gap-1.5 cursor-pointer", isTorchOn && "bg-amber-500 text-amber-950 font-bold hover:bg-amber-400")}
              title={isTorchOn ? "Desligar lanterna" : "Ligar lanterna (iluminação do código)"}
            >
              {isTorchOn ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4" />}
              <span className="hidden sm:inline">{isTorchOn ? "Lanterna Ligada" : "Lanterna"}</span>
            </Button>
          )}

          {/* Som Ativar/Desativar */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="rounded-xl text-xs h-9 gap-1.5 cursor-pointer"
            title={soundEnabled ? "Desativar som do beep" : "Ativar som do beep"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
            <span className="hidden sm:inline">{soundEnabled ? "Som Ativo" : "Mudo"}</span>
          </Button>

          {/* Resetar / Reiniciar Câmera */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              toast.info("Reiniciando leitor da câmera...");
              startCamera();
            }}
            className="rounded-xl text-xs h-9 gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Recarregar/Resetar o leitor da câmera"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Resetar</span>
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
              className={`px-3 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 font-bold"
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
        
        {/* Viewfinder da Câmera */}
        <Card className="rounded-3xl border-border/80 overflow-hidden shadow-md bg-black relative">
          <div className="relative aspect-square w-full bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
            
            {/* Elemento de Leitura Html5Qrcode */}
            <div id="scanner-viewfinder" className="w-full h-full" />

            {/* Controles Flutuantes Sobrepostos ao Visor */}
            <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
              {hasTorchSupport && (
                <button
                  type="button"
                  onClick={handleToggleTorch}
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full border backdrop-blur-md transition-all cursor-pointer",
                    isTorchOn 
                      ? "bg-amber-500 text-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]" 
                      : "bg-black/75 hover:bg-black/90 text-white border-white/20"
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
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md shadow-xl active:scale-95 transition-all cursor-pointer group"
                title="Alternar entre câmeras disponíveis"
              >
                <SwitchCamera className={cn("w-4 h-4 text-primary transition-transform duration-300 group-hover:rotate-180", isSwitchingCamera && "animate-spin text-amber-400")} />
                <span className="text-[11px] font-semibold tracking-wide">
                  {isSwitchingCamera 
                    ? "Trocando..." 
                    : cameras.length > 1 
                      ? `Câmera ${selectedCameraIndex + 1}/${cameras.length}` 
                      : activeCameraLabel 
                        ? (activeCameraLabel.length > 15 ? `${activeCameraLabel.slice(0, 15)}...` : activeCameraLabel)
                        : "Trocar Câmera"}
                </span>
              </button>
            </div>

            {/* Laser e Mira Holográfica se estiver escaneando */}
            {isScanning && !scanResult && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                {/* Moldura de Foco com Cantoneiras & Laser Animado */}
                <div className="relative h-[68%] max-h-[320px] min-w-[220px] aspect-square rounded-3xl overflow-hidden flex items-center justify-center">
                  
                  {/* Borda HUD com brilho pulsante */}
                  <div className="absolute inset-0 rounded-3xl border-2 border-primary/60 scanner-frame-hud" />

                  {/* Cantoneiras Futuristas */}
                  <div className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-primary rounded-tl-2xl shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                  <div className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-primary rounded-tr-2xl shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                  <div className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-primary rounded-bl-2xl shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                  <div className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-primary rounded-br-2xl shadow-[0_0_10px_rgba(59,130,246,0.8)]" />

                  {/* Mira central / Crosshair reticle */}
                  <div className="absolute w-4 h-4 border border-white/25 rounded-full flex items-center justify-center">
                    <div className="w-1 h-1 bg-white/40 rounded-full" />
                  </div>

                  {/* Feixe Laser Animado (Varredura Contínua) */}
                  <div className="scanner-laser-line" />
                  <div className="scanner-laser-glow" />
                </div>

                {/* Indicador de Status & Instrução */}
                <div className="mt-4 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/70 border border-white/10 backdrop-blur-md shadow-lg">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-[11px] font-medium text-white/90">
                    Posicione o QR Code dentro do enquadramento
                  </span>
                </div>
              </div>
            )}

            {/* Aviso se a câmera estiver pausada / com erro */}
            {cameraError && (
              <div className="p-6 text-center space-y-3 max-w-xs z-10">
                <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
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

            {/* Loading de Busca */}
            {isLoadingLookup && (
              <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center space-y-2 z-20">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
                <span className="text-xs text-white font-semibold">Identificando código...</span>
              </div>
            )}
          </div>

          {/* Fallback de Entrada Manual de Código */}
          <div className="p-4 bg-card border-t border-border/80">
            <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Digitar patrimônio (#123458), caixa (C001) ou SKU..."
                  className="pl-9 h-10 rounded-xl text-xs bg-background"
                />
              </div>
              <Button type="submit" size="sm" className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer">
                Buscar
              </Button>
            </form>
          </div>
        </Card>

        {/* Coluna Direita: Resultado da Leitura ou Histórico da Sessão */}
        <div className="space-y-4">
          
          {/* Card de Resultado da Leitura */}
          {scanResult ? (
            <ScannerResultSheet
              result={scanResult}
              onClose={() => setScanResult(null)}
              onScanNext={handleScanNext}
            />
          ) : (
            /* Histórico das Últimas Leituras da Sessão */
            <Card className="rounded-3xl border-border/80 shadow-xs">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">
                      Histórico da Sessão ({sessionHistory.length})
                    </h3>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Últimas leituras
                  </span>
                </div>

                {sessionHistory.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <Sparkles className="w-8 h-8 text-primary/40 mx-auto" />
                    <p className="text-xs font-semibold text-foreground">
                      Aguardando primeira leitura
                    </p>
                    <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                      Aponte a câmera para qualquer código ou digite no campo ao lado para visualizar os dados instantaneamente.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {sessionHistory.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => processCodeLookup(item.code)}
                        className="w-full text-left p-3 rounded-2xl bg-muted/40 hover:bg-muted/70 border border-border/60 flex items-center justify-between group transition-colors cursor-pointer"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-primary">
                              {item.code}
                            </span>
                            <Badge variant="default" className="text-[9px]">
                              {item.entityType}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-foreground font-medium">
                            {item.entityType === "ASSET" ? item.data.asset.item?.name : item.entityType === "BOX" ? item.data.name : item.data.item?.name || item.code}
                          </p>
                        </div>

                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </div>

      </div>

    </div>
  );
}
