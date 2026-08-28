"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { FilesetResolver, FaceDetector } from "@mediapipe/tasks-vision";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  RefreshCw,
  Gauge,
  UserCheck,
} from "lucide-react";
import { BiometricTestResult } from "@/services/biometric-api.service";

interface TestBiometricModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPerson?: {
    id: string;
    name: string;
    registration?: string | null;
  } | null;
}

export function TestBiometricModal({
  isOpen,
  onClose,
  targetPerson,
}: TestBiometricModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceDetectorRef = useRef<FaceDetector | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const testingRef = useRef<boolean>(false);

  const [cameraReady, setCameraReady] = useState(false);
  const [statusText, setStatusText] = useState("Iniciando câmera...");
  const [testResult, setTestResult] = useState<BiometricTestResult | null>(null);
  const [responseTimeMs, setResponseTimeMs] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Crop face from video
  const cropFace = useCallback(
    (video: HTMLVideoElement, box: { originX: number; originY: number; width: number; height: number }): Promise<Blob | null> => {
      const vWidth = video.videoWidth;
      const vHeight = video.videoHeight;
      if (!vWidth || !vHeight) return Promise.resolve(null);

      const marginH = box.width * 0.2;
      const marginV = box.height * 0.25;

      const cropX = Math.max(0, box.originX - marginH);
      const cropY = Math.max(0, box.originY - marginV);
      const cropW = Math.min(vWidth - cropX, box.width + marginH * 2);
      const cropH = Math.min(vHeight - cropY, box.height + marginV * 2);

      const offCanvas = document.createElement("canvas");
      offCanvas.width = Math.round(cropW);
      offCanvas.height = Math.round(cropH);

      const ctx = offCanvas.getContext("2d");
      if (!ctx) return Promise.resolve(null);

      ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, offCanvas.width, offCanvas.height);

      return new Promise<Blob | null>((resolve) => {
        offCanvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
      });
    },
    []
  );

  // Execute test request
  const executeTest = useCallback(
    async (cropBlob: Blob) => {
      if (testingRef.current || !isMountedRef.current) return;
      testingRef.current = true;
      setIsProcessing(true);

      const startTime = performance.now();
      try {
        const formData = new FormData();
        if (targetPerson?.id) {
          formData.append("targetPersonId", targetPerson.id);
        }
        formData.append("crop", cropBlob, "test_crop.jpg");

        const res = await fetch("/api/v1/biometrics/test", {
          method: "POST",
          body: formData,
        });

        const result: BiometricTestResult = await res.json();
        const duration = Math.round(performance.now() - startTime);

        if (!isMountedRef.current) return;
        setTestResult(result);
        setResponseTimeMs(duration);
      } catch (err: any) {
        if (!isMountedRef.current) return;
        setTestResult({
          success: false,
          status: "ERROR",
          isApproved: false,
          message: err.message || "Erro no teste biométrico.",
          evaluatedAt: new Date().toISOString(),
        });
      } finally {
        if (isMountedRef.current) {
          setIsProcessing(false);
          testingRef.current = false;
        }
      }
    },
    [targetPerson]
  );

  // Initialize camera
  useEffect(() => {
    if (!isOpen) return;
    isMountedRef.current = true;
    let localStream: MediaStream | null = null;

    async function init() {
      try {
        setStatusText("Carregando MediaPipe...");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );

        if (!isMountedRef.current) return;

        const detector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "/models/blaze_face_short_range.tflite",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          minDetectionConfidence: 0.5,
        });

        if (!isMountedRef.current) {
          detector.close();
          return;
        }

        faceDetectorRef.current = detector;
        setStatusText("Iniciando câmera...");

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: false,
        });

        if (!isMountedRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current && isMountedRef.current) {
              videoRef.current.play();
              setCameraReady(true);
              setStatusText("Posicione o rosto e clique em Testar");
            }
          };
        }
      } catch (err: any) {
        if (!isMountedRef.current) return;
        setStatusText(`Erro ao abrir câmera: ${err.message}`);
      }
    }

    init();

    return () => {
      isMountedRef.current = false;
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      if (localStream) {
        localStream.getTracks().forEach((t) => {
          t.stop();
          t.enabled = false;
        });
      }
      if (videoRef.current) {
        if (videoRef.current.srcObject) {
          (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => {
            t.stop();
            t.enabled = false;
          });
          videoRef.current.srcObject = null;
        }
        try {
          videoRef.current.pause();
          videoRef.current.src = "";
          videoRef.current.load();
        } catch {}
      }
      if (faceDetectorRef.current) {
        try {
          faceDetectorRef.current.close();
        } catch {}
        faceDetectorRef.current = null;
      }
      setCameraReady(false);
      setTestResult(null);
      setResponseTimeMs(null);
    };
  }, [isOpen]);

  // Detection loop for live canvas drawing
  useEffect(() => {
    if (!cameraReady) return;
    let isRunning = true;
    let lastTime = 0;

    const loop = (now: number) => {
      if (!isRunning || !isMountedRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const detector = faceDetectorRef.current;

      if (video && canvas && detector && video.readyState >= 2) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        const ctx = canvas.getContext("2d");
        if (ctx && now - lastTime >= 100) {
          lastTime = now;
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          try {
            const results = detector.detectForVideo(video, Math.round(now));
            const detections = results.detections || [];

            if (detections.length > 0) {
              const b = detections[0].boundingBox!;
              ctx.save();
              ctx.strokeStyle = "#38bdf8";
              ctx.lineWidth = 3;
              ctx.strokeRect(b.originX, b.originY, b.width, b.height);
              ctx.restore();
            }
          } catch {}
        }
      }

      animationFrameIdRef.current = requestAnimationFrame(loop);
    };

    animationFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      isRunning = false;
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
    };
  }, [cameraReady]);

  // Manual Trigger
  const handleTriggerTest = async () => {
    const video = videoRef.current;
    const detector = faceDetectorRef.current;
    if (!video || !detector) return;

    try {
      const results = detector.detectForVideo(video, Math.round(performance.now()));
      const detections = results.detections || [];
      if (detections.length === 0) {
        setStatusText("Nenhum rosto detectado. Aproxime-se da câmera.");
        return;
      }

      const b = detections[0].boundingBox!;
      const box = { originX: b.originX, originY: b.originY, width: b.width, height: b.height };

      const blob = await cropFace(video, box);
      if (blob) {
        executeTest(blob);
      }
    } catch (err: any) {
      setStatusText(`Erro ao capturar: ${err.message}`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-card border-border p-0 overflow-hidden">
        <DialogHeader className="p-5 border-b border-border/80 bg-muted/20">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            Teste de Reconhecimento Biométrico
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {targetPerson ? (
              <span>
                Validação 1:1 contra: <strong>{targetPerson.name}</strong>
              </span>
            ) : (
              <span>Busca global 1:N em todo o banco de biometrias ativas.</span>
            )}
            {" • "}
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              Este teste não registra presença.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: Video Preview */}
          <div className="space-y-3">
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-black flex items-center justify-center">
              <video ref={videoRef} className="h-full w-full object-cover -scale-x-100" playsInline muted />
              <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-cover -scale-x-100 pointer-events-none" />

              <div className="absolute bottom-2 inset-x-2 flex items-center justify-center">
                <div className="rounded-full bg-black/70 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm border border-white/10">
                  {statusText}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTriggerTest}
              disabled={isProcessing || !cameraReady}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary/90 shadow-md transition-colors disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              Realizar Teste Agora
            </button>
          </div>

          {/* Right: Technical Results Card */}
          <div className="flex flex-col justify-between rounded-xl border border-border bg-muted/20 p-4">
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Diagnóstico Técnico
              </span>

              {testResult ? (
                <div className="space-y-3">
                  <div
                    className={`rounded-xl p-3 border flex items-center gap-2.5 ${
                      testResult.isApproved
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {testResult.isApproved ? (
                      <CheckCircle2 className="h-6 w-6 shrink-0" />
                    ) : (
                      <XCircle className="h-6 w-6 shrink-0" />
                    )}
                    <div>
                      <p className="font-bold text-xs">
                        {testResult.isApproved ? "Biometria Aprovada" : "Não Reconhecido"}
                      </p>
                      <p className="text-[11px] opacity-90">{testResult.message}</p>
                    </div>
                  </div>

                  {testResult.matchedPerson && (
                    <div className="rounded-lg bg-card border border-border p-3 space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                        <UserCheck className="h-4 w-4 text-primary" />
                        {testResult.matchedPerson.name}
                      </div>
                      {testResult.matchedPerson.registration && (
                        <p className="text-[11px] text-muted-foreground font-mono">
                          Matrícula: {testResult.matchedPerson.registration}
                        </p>
                      )}
                      {testResult.matchedPerson.category && (
                        <p className="text-[11px] text-muted-foreground">
                          Categoria: {testResult.matchedPerson.category}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-lg bg-card border border-border p-2">
                      <p className="text-[10px] text-muted-foreground">Confiança</p>
                      <p className="text-sm font-bold text-foreground">
                        {testResult.confidence !== undefined && testResult.confidence !== null
                          ? `${Math.round(testResult.confidence * 100)}%`
                          : "—"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-card border border-border p-2">
                      <p className="text-[10px] text-muted-foreground">Distância L2</p>
                      <p className="text-sm font-bold text-foreground font-mono">
                        {testResult.distance !== undefined && testResult.distance !== null
                          ? testResult.distance.toFixed(4)
                          : "—"}
                      </p>
                    </div>
                  </div>

                  {responseTimeMs !== null && (
                    <p className="text-[10px] text-muted-foreground text-center">
                      Tempo de resposta da API: <strong className="text-foreground">{responseTimeMs} ms</strong>
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <Gauge className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-xs font-medium">Aguardando disparo do teste.</p>
                  <p className="text-[11px] opacity-70">Posicione o rosto e clique no botão abaixo.</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border/60 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
