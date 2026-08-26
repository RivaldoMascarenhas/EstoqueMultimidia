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
  Loader2,
  RefreshCw,
  X,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface BiometricEnrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: {
    id: string;
    name: string;
    registration?: string | null;
    cpf?: string | null;
  } | null;
  onSuccess?: () => void;
}

export function BiometricEnrollModal({
  isOpen,
  onClose,
  person,
  onSuccess,
}: BiometricEnrollModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceDetectorRef = useRef<FaceDetector | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const [cameraReady, setCameraReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [isCentered, setIsCentered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("Iniciando câmera...");

  // Generate crop blob
  const cropFaceFromVideo = useCallback(
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
        offCanvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
      });
    },
    []
  );

  // Initialize camera and MediaPipe
  useEffect(() => {
    if (!isOpen || !person) return;
    isMountedRef.current = true;
    let localStream: MediaStream | null = null;

    async function init() {
      try {
        setStatusText("Carregando detector MediaPipe...");
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
              setStatusText("Posicione o rosto no centro do visor");
            }
          };
        }
      } catch (err: any) {
        if (!isMountedRef.current) return;
        setStatusText(`Erro ao iniciar câmera: ${err.message}`);
        toast.error("Não foi possível acessar a câmera do dispositivo.");
      }
    }

    init();

    return () => {
      isMountedRef.current = false;
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      if (localStream) localStream.getTracks().forEach((t) => t.stop());
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
      if (faceDetectorRef.current) {
        try {
          faceDetectorRef.current.close();
        } catch {}
        faceDetectorRef.current = null;
      }
      setCameraReady(false);
      setFaceDetected(false);
      setIsCentered(false);
      setCapturedBlob(null);
      setCapturedPreview(null);
    };
  }, [isOpen, person]);

  // Detection loop
  useEffect(() => {
    if (!cameraReady || capturedBlob) return;
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
              setFaceDetected(true);
              const b = detections[0].boundingBox;
              const box = b
                ? { originX: b.originX, originY: b.originY, width: b.width, height: b.height }
                : { originX: 0, originY: 0, width: 0, height: 0 };

              // Check centering
              const fX = box.originX + box.width / 2;
              const fY = box.originY + box.height / 2;
              const cX = video.videoWidth / 2;
              const cY = video.videoHeight / 2;
              const centered =
                Math.abs(fX - cX) <= video.videoWidth * 0.22 &&
                Math.abs(fY - cY) <= video.videoHeight * 0.22 &&
                box.width >= video.videoWidth * 0.16;

              setIsCentered(centered);
              setStatusText(centered ? "Rosto perfeito! Clique em Capturar." : "Aproxime e centralize o rosto.");

              // Draw green HUD
              ctx.save();
              ctx.strokeStyle = centered ? "#22c55e" : "#f59e0b";
              ctx.lineWidth = 4;
              ctx.strokeRect(box.originX, box.originY, box.width, box.height);
              ctx.restore();
            } else {
              setFaceDetected(false);
              setIsCentered(false);
              setStatusText("Posicione seu rosto em frente à câmera...");
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
  }, [cameraReady, capturedBlob]);

  // Capture face photo
  const handleCapture = async () => {
    const video = videoRef.current;
    const detector = faceDetectorRef.current;
    if (!video || !detector) return;

    try {
      const results = detector.detectForVideo(video, Math.round(performance.now()));
      const detections = results.detections || [];
      if (detections.length === 0) {
        toast.error("Nenhum rosto detectado no momento do clique.");
        return;
      }

      const b = detections[0].boundingBox!;
      const box = { originX: b.originX, originY: b.originY, width: b.width, height: b.height };

      const blob = await cropFaceFromVideo(video, box);
      if (blob) {
        setCapturedBlob(blob);
        setCapturedPreview(URL.createObjectURL(blob));
      }
    } catch (err: any) {
      toast.error(`Falha ao capturar imagem: ${err.message}`);
    }
  };

  // Submit enrollment
  const handleSubmitEnroll = async () => {
    if (!person || !capturedBlob) return;
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("personId", person.id);
      formData.append("isCrop", "true");
      formData.append("image", capturedBlob, "face.jpg");

      const res = await fetch("/api/v1/biometrics/enroll", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao salvar biometria.");
      }

      toast.success(`Biometria cadastrada com sucesso para ${person.name}!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro no envio da biometria.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl bg-card border-border p-0 overflow-hidden">
        <DialogHeader className="p-5 border-b border-border/80 bg-muted/20">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Cadastro de Biometria Facial
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Cadastrando biometria para:{" "}
            <strong className="text-foreground font-semibold">{person?.name}</strong>{" "}
            {person?.registration && `(Matrícula: ${person.registration})`}
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 space-y-4">
          <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-black flex items-center justify-center">
            {capturedPreview ? (
              <img src={capturedPreview} alt="Recorte Facial" className="h-full w-full object-contain" />
            ) : (
              <>
                <video ref={videoRef} className="h-full w-full object-cover -scale-x-100" playsInline muted />
                <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-cover -scale-x-100 pointer-events-none" />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-44 w-36 rounded-3xl border-2 border-dashed border-white/20" />
                </div>
              </>
            )}

            {/* Status bar */}
            <div className="absolute bottom-2 inset-x-2 flex items-center justify-center">
              <div className="rounded-full bg-black/70 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm border border-white/10">
                {statusText}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent rounded-xl transition-colors"
            >
              Cancelar
            </button>

            <div className="flex items-center gap-2">
              {capturedBlob ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setCapturedBlob(null);
                      setCapturedPreview(null);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-foreground bg-muted hover:bg-muted/80 rounded-xl transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Capturar Novamente
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitEnroll}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Salvar Biometria
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleCapture}
                  disabled={!isCentered}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Camera className="h-4 w-4" />
                  Capturar Foto
                </button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
