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
  SwitchCamera,
  ShieldCheck,
  Trash2,
  Lock,
} from "lucide-react";
import { PrivacyPolicyModal } from "@/components/legal/PrivacyPolicyModal";
import { toast } from "sonner";

interface BiometricEnrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: {
    id: string;
    name: string;
    registration?: string | null;
    cpf?: string | null;
    hasFaceEnrolled?: boolean;
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
  const currentStreamRef = useRef<MediaStream | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [isCentered, setIsCentered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingBiometrics, setIsDeletingBiometrics] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("Iniciando câmera...");
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  // Crop face blob from video
  const cropFaceFromVideo = useCallback(
    (
      video: HTMLVideoElement,
      box: { originX: number; originY: number; width: number; height: number }
    ): Promise<Blob | null> => {
      const vWidth = video.videoWidth;
      const vHeight = video.videoHeight;
      if (!vWidth || !vHeight) return Promise.resolve(null);

      const marginH = box.width * 0.25;
      const marginV = box.height * 0.3;

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

  // Start Camera Stream
  const startCamera = useCallback(async (deviceId?: string) => {
    if (currentStreamRef.current) {
      currentStreamRef.current.getTracks().forEach((t) => t.stop());
      currentStreamRef.current = null;
    }

    try {
      setCameraReady(false);
      setStatusText("Conectando à câmera...");

      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (!isMountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      currentStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current && isMountedRef.current) {
            videoRef.current.play().catch(() => {});
            setCameraReady(true);
            setStatusText("Posicione o rosto no centro do visor");
          }
        };
      }

      // Enumerate devices for switcher
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = devices.filter((d) => d.kind === "videoinput");
        setAvailableDevices(videoDevs);
      } catch {}
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setStatusText(`Erro ao abrir câmera: ${err.message}`);
      toast.error("Não foi possível acessar a câmera selecionada.");
    }
  }, []);

  // Initialize MediaPipe & start default camera on open
  useEffect(() => {
    if (!isOpen || !person) return;
    isMountedRef.current = true;

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
          minDetectionConfidence: 0.35,
          minSuppressionThreshold: 0.3,
        });

        if (!isMountedRef.current) {
          detector.close();
          return;
        }

        faceDetectorRef.current = detector;
        await startCamera(selectedDeviceId || undefined);
      } catch (err: any) {
        if (!isMountedRef.current) return;
        setStatusText(`Erro ao iniciar detector: ${err.message}`);
      }
    }

    init();

    return () => {
      isMountedRef.current = false;
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      if (currentStreamRef.current) {
        currentStreamRef.current.getTracks().forEach((t) => {
          t.stop();
          t.enabled = false;
        });
        currentStreamRef.current = null;
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
      setFaceDetected(false);
      setIsCentered(false);
      setCapturedBlob(null);
      setCapturedPreview(null);
    };
  }, [isOpen, person, selectedDeviceId, startCamera]);

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
        if (ctx && now - lastTime >= 66) {
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
                Math.abs(fX - cX) <= video.videoWidth * 0.24 &&
                Math.abs(fY - cY) <= video.videoHeight * 0.24 &&
                box.width >= video.videoWidth * 0.15;

              setIsCentered(centered);
              setStatusText(
                centered ? "✓ Rosto perfeito! Clique em Capturar." : "Aproxime e centralize o rosto no visor."
              );

              // Draw High-Tech Green / Amber HUD Frame
              ctx.save();
              ctx.strokeStyle = centered ? "#22c55e" : "#f59e0b";
              ctx.lineWidth = 3.5;
              ctx.strokeRect(box.originX, box.originY, box.width, box.height);

              // Corner brackets
              const cornerLen = Math.min(24, box.width * 0.25);
              ctx.strokeStyle = centered ? "#4ade80" : "#fbbf24";
              ctx.lineWidth = 4.5;
              ctx.shadowColor = centered ? "rgba(34, 197, 94, 0.7)" : "rgba(245, 158, 11, 0.7)";
              ctx.shadowBlur = 8;

              // Top-Left
              ctx.beginPath();
              ctx.moveTo(box.originX, box.originY + cornerLen);
              ctx.lineTo(box.originX, box.originY);
              ctx.lineTo(box.originX + cornerLen, box.originY);
              ctx.stroke();

              // Top-Right
              ctx.beginPath();
              ctx.moveTo(box.originX + box.width - cornerLen, box.originY);
              ctx.lineTo(box.originX + box.width, box.originY);
              ctx.lineTo(box.originX + box.width, box.originY + cornerLen);
              ctx.stroke();

              // Bottom-Left
              ctx.beginPath();
              ctx.moveTo(box.originX, box.originY + box.height - cornerLen);
              ctx.lineTo(box.originX, box.originY + box.height);
              ctx.lineTo(box.originX + cornerLen, box.originY + box.height);
              ctx.stroke();

              // Bottom-Right
              ctx.beginPath();
              ctx.moveTo(box.originX + box.width - cornerLen, box.originY + box.height);
              ctx.lineTo(box.originX + box.width, box.originY + box.height);
              ctx.lineTo(box.originX + box.width, box.originY + box.height - cornerLen);
              ctx.stroke();

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
        setStatusText("Foto capturada com sucesso! Revise antes de salvar.");
      }
    } catch (err: any) {
      toast.error(`Falha ao capturar imagem: ${err.message}`);
    }
  };

  // Switch camera device
  const handleSwitchCamera = () => {
    if (availableDevices.length <= 1) {
      toast.info("Apenas uma câmera detectada neste dispositivo.");
      return;
    }
    const currentIndex = availableDevices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % availableDevices.length;
    const nextDev = availableDevices[nextIndex];
    setSelectedDeviceId(nextDev.deviceId);
    startCamera(nextDev.deviceId);
  };

  // Revoke / Delete Biometrics (LGPD Right to Erasure)
  const handleRevokeBiometrics = async () => {
    if (!person) return;
    if (!confirm(`Tem certeza que deseja revogar e excluir a biometria facial de "${person.name}"? Esta ação removerá os dados biométricos conforme a LGPD.`)) {
      return;
    }

    setIsDeletingBiometrics(true);
    try {
      const res = await fetch("/api/v1/biometrics/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId: person.id }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao revogar biometria.");
      }

      toast.success("Biometria facial revogada e excluída com sucesso!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Falha ao excluir biometria.");
    } finally {
      setIsDeletingBiometrics(false);
    }
  };

  // Submit enrollment
  const handleSubmitEnroll = async () => {
    if (!person || !capturedBlob) return;

    if (!consentAccepted) {
      toast.error("É obrigatório assinalar o Termo de Consentimento LGPD para salvar a biometria.");
      return;
    }

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
        throw new Error(data.error || data.message || "Erro ao salvar biometria.");
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
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-xl bg-card border-border p-0 overflow-hidden shadow-2xl rounded-3xl">
          <DialogHeader className="p-5 pr-14 border-b border-border/80 bg-muted/20">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-500" />
                Cadastro de Biometria Facial
              </DialogTitle>

              {availableDevices.length > 1 && (
                <button
                  type="button"
                  onClick={handleSwitchCamera}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-background/80 hover:bg-accent border border-border text-foreground transition-all cursor-pointer mr-4 shadow-sm"
                  title="Trocar entre câmeras conectadas"
                >
                  <SwitchCamera className="w-3.5 h-3.5 text-primary" />
                  <span>Trocar Câmera</span>
                </button>
              )}
            </div>

            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Cadastrando biometria para:{" "}
              <strong className="text-foreground font-semibold">{person?.name}</strong>{" "}
              {person?.registration && `(Matrícula: ${person.registration})`}
            </DialogDescription>
          </DialogHeader>

          <div className="p-5 space-y-4">
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-black flex items-center justify-center">
              {/* Live Video & Canvas (Always in DOM to avoid black screens) */}
              <video
                ref={videoRef}
                className="h-full w-full object-cover -scale-x-100"
                playsInline
                muted
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 h-full w-full object-cover -scale-x-100 pointer-events-none"
              />

              {/* Target Outline Guide */}
              {!capturedPreview && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-[68%] max-h-[300px] min-w-[170px] aspect-[3/4] rounded-3xl border-2 border-dashed border-white/85 shadow-[0_0_25px_rgba(255,255,255,0.25)]" />
                </div>
              )}

              {/* Captured Preview Overlay (Shows on top of video, never unmounting video) */}
              {capturedPreview && (
                <div className="absolute inset-0 z-20 bg-black flex items-center justify-center animate-in fade-in duration-200">
                  <img
                    src={capturedPreview}
                    alt="Recorte Facial"
                    className="h-full w-full object-contain"
                  />
                </div>
              )}

              {/* Status bar */}
              <div className="absolute bottom-3 inset-x-3 z-30 flex items-center justify-center">
                <div className="rounded-full bg-black/80 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-md border border-white/20 shadow-lg">
                  {statusText}
                </div>
              </div>
            </div>

            {/* LGPD Biometric Consent Box (Displayed when photo is captured) */}
            {capturedBlob && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2 animate-in fade-in duration-200">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={consentAccepted}
                    onChange={(e) => setConsentAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-amber-400 text-primary focus:ring-primary accent-[#002B49]"
                  />
                  <span className="text-[11px] leading-relaxed text-muted-foreground">
                    <strong className="text-foreground font-semibold">Consentimento LGPD (Art. 11, I):</strong>{" "}
                    Declaro que o titular autorizou a coleta e processamento de sua biometria facial exclusivamente para identificação e presença em eventos da UniFAP, ciente do direito de revogação a qualquer momento.
                  </span>
                </label>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-amber-500/20">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Criptografia & Armazenamento Seguro
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPrivacyModalOpen(true)}
                    className="text-primary hover:underline font-bold cursor-pointer"
                  >
                    Ler Termos de Privacidade
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent rounded-xl transition-colors cursor-pointer"
                >
                  Fechar
                </button>

                {person?.hasFaceEnrolled && (
                  <button
                    type="button"
                    onClick={handleRevokeBiometrics}
                    disabled={isDeletingBiometrics}
                    className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors border border-rose-500/20 cursor-pointer"
                    title="Revogar e excluir biometria cadastrada (LGPD)"
                  >
                    {isDeletingBiometrics ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    <span>Revogar Biometria</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {capturedBlob ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setCapturedBlob(null);
                        setCapturedPreview(null);
                        setConsentAccepted(false);
                        setStatusText("Posicione o rosto no centro do visor");
                        if (videoRef.current) {
                          videoRef.current.play().catch(() => {});
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-foreground bg-muted hover:bg-muted/80 rounded-xl transition-colors cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Capturar Novamente
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitEnroll}
                      disabled={isSubmitting || !consentAccepted}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Salvar Biometria
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleCapture}
                    disabled={!isCentered}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />
    </>
  );
}
