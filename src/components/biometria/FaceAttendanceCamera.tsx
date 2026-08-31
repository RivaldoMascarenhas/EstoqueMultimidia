"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { FilesetResolver, FaceDetector } from "@mediapipe/tasks-vision";
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Loader2,
  RefreshCw,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  SwitchCamera,
  Sparkles,
} from "lucide-react";
import { BiometricRecognizeResult } from "@/services/biometric-api.service";
import { toast } from "sonner";

export type RecognitionState =
  | "IDLE"
  | "DETECTING"
  | "FACE_FOUND"
  | "FACE_CENTERING"
  | "PROCESSING"
  | "REGISTERED"
  | "ALREADY_REGISTERED"
  | "NOT_PARTICIPANT"
  | "NOT_RECOGNIZED"
  | "EVENT_NOT_OPEN"
  | "ERROR";

export const RECOGNITION_STATE_CONFIG: Record<
  RecognitionState,
  {
    title: string;
    description: string;
    color: string;
    borderColor: string;
    badgeBg: string;
    iconColor: string;
  }
> = {
  IDLE: {
    title: "Aguardando Câmera",
    description: "Iniciando captura de vídeo e detector biométrico...",
    color: "text-slate-400",
    borderColor: "border-slate-700/60",
    badgeBg: "bg-slate-800 text-slate-300",
    iconColor: "text-slate-400",
  },
  DETECTING: {
    title: "Procurando Rostos",
    description: "Posicione seu rosto em frente à câmera...",
    color: "text-emerald-400",
    borderColor: "border-emerald-500/60",
    badgeBg: "bg-emerald-950/80 text-emerald-300",
    iconColor: "text-emerald-400",
  },
  FACE_FOUND: {
    title: "Rosto Alinhado",
    description: "Identificando biometria...",
    color: "text-emerald-300",
    borderColor: "border-emerald-400",
    badgeBg: "bg-emerald-950 text-emerald-200",
    iconColor: "text-emerald-300",
  },
  FACE_CENTERING: {
    title: "Centralize seu Rosto",
    description: "Aproxime-se e alinhe seu rosto dentro da moldura.",
    color: "text-amber-400",
    borderColor: "border-amber-500/80",
    badgeBg: "bg-amber-950/80 text-amber-300",
    iconColor: "text-amber-400",
  },
  PROCESSING: {
    title: "Consultando Banco...",
    description: "Pesquisando vetores faciais no pgvector...",
    color: "text-indigo-400",
    borderColor: "border-indigo-500/80",
    badgeBg: "bg-indigo-950/80 text-indigo-300",
    iconColor: "text-indigo-400",
  },
  REGISTERED: {
    title: "Presença Confirmada!",
    description: "Identidade validada e presença registrada com sucesso.",
    color: "text-emerald-400",
    borderColor: "border-emerald-500",
    badgeBg: "bg-emerald-900 text-emerald-200",
    iconColor: "text-emerald-400",
  },
  ALREADY_REGISTERED: {
    title: "Presença Já Registrada",
    description: "Sua presença neste evento já havia sido confirmada anteriormente.",
    color: "text-amber-400",
    borderColor: "border-amber-500",
    badgeBg: "bg-amber-900 text-amber-200",
    iconColor: "text-amber-400",
  },
  NOT_PARTICIPANT: {
    title: "Não Inscrito no Evento",
    description: "Rosto cadastrado no sistema, mas não há inscrição para este evento.",
    color: "text-orange-400",
    borderColor: "border-orange-500",
    badgeBg: "bg-orange-950 text-orange-200",
    iconColor: "text-orange-400",
  },
  NOT_RECOGNIZED: {
    title: "Rosto Não Reconhecido",
    description: "Nenhum cadastro biométrico correspondente encontrado.",
    color: "text-rose-400",
    borderColor: "border-rose-500",
    badgeBg: "bg-rose-950 text-rose-200",
    iconColor: "text-rose-400",
  },
  EVENT_NOT_OPEN: {
    title: "Evento Fechado",
    description: "O evento não está aberto para recebimento de presenças.",
    color: "text-amber-500",
    borderColor: "border-amber-600",
    badgeBg: "bg-amber-950 text-amber-200",
    iconColor: "text-amber-500",
  },
  ERROR: {
    title: "Erro na Leitura",
    description: "Ocorreu uma falha na comunicação ou processamento da imagem.",
    color: "text-rose-500",
    borderColor: "border-rose-600",
    badgeBg: "bg-rose-900 text-rose-100",
    iconColor: "text-rose-500",
  },
};

interface FaceAttendanceCameraProps {
  eventId: string;
  eventName: string;
  deviceIdentifier?: string;
  onPresenceRecorded?: (result: BiometricRecognizeResult) => void;
  className?: string;
  isKioskMode?: boolean;
}

export function FaceAttendanceCamera({
  eventId,
  eventName,
  deviceIdentifier,
  onPresenceRecorded,
  className = "",
  isKioskMode = false,
}: FaceAttendanceCameraProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceDetectorRef = useRef<FaceDetector | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastDetectionTimeRef = useRef<number>(0);
  const lastRecognitionTimeRef = useRef<number>(0);
  const recognizingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const currentStreamRef = useRef<MediaStream | null>(null);
  const activeStreamsSetRef = useRef<Set<MediaStream>>(new Set());
  const streamSessionIdRef = useRef<number>(0);

  const [recognitionState, setRecognitionState] = useState<RecognitionState>("IDLE");
  const [statusMessage, setStatusMessage] = useState<string>("Iniciando câmera...");
  const [latestResult, setLatestResult] = useState<BiometricRecognizeResult | null>(null);
  const [detectedFacesCount, setDetectedFacesCount] = useState<number>(0);
  const [cameraReady, setCameraReady] = useState<boolean>(false);
  const [soundMuted, setSoundMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Stop camera tracks cleanly and instantly so hardware LED turns off immediately
  const stopCameraStream = useCallback(() => {
    streamSessionIdRef.current += 1; // Invalidate any pending in-flight getUserMedia

    // 1. Stop all tracked streams in the active set
    if (activeStreamsSetRef.current) {
      activeStreamsSetRef.current.forEach((s) => {
        try {
          s.getTracks().forEach((track) => {
            track.stop();
            track.enabled = false;
          });
        } catch {}
      });
      activeStreamsSetRef.current.clear();
    }

    // 2. Stop current stream
    if (currentStreamRef.current) {
      try {
        currentStreamRef.current.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
      } catch {}
      currentStreamRef.current = null;
    }

    // 3. Stop video element srcObject
    if (videoRef.current) {
      if (videoRef.current.srcObject) {
        try {
          const s = videoRef.current.srcObject as MediaStream;
          s.getTracks().forEach((track) => {
            track.stop();
            track.enabled = false;
          });
        } catch {}
        videoRef.current.srcObject = null;
      }
      try {
        videoRef.current.pause();
        videoRef.current.src = "";
        videoRef.current.load();
      } catch {}
    }

    setCameraReady(false);
  }, []);

  // Web Audio API feedback tones
  const playFeedbackSound = useCallback(
    (type: "success" | "warning" | "error") => {
      if (soundMuted || typeof window === "undefined") return;
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === "success") {
          osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
          osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.1); // A5
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
          osc.start();
          osc.stop(ctx.currentTime + 0.35);
        } else if (type === "warning") {
          osc.frequency.setValueAtTime(440, ctx.currentTime);
          osc.frequency.setValueAtTime(370, ctx.currentTime + 0.12);
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        } else {
          osc.frequency.setValueAtTime(300, ctx.currentTime);
          osc.frequency.setValueAtTime(200, ctx.currentTime + 0.15);
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
          osc.start();
          osc.stop(ctx.currentTime + 0.35);
        }
      } catch {
        // audio policy fallback
      }
    },
    [soundMuted]
  );

  // Crop face from video frame
  const generateFaceCropBlob = useCallback(
    async (
      video: HTMLVideoElement,
      box: { originX: number; originY: number; width: number; height: number }
    ): Promise<Blob | null> => {
      const vWidth = video.videoWidth;
      const vHeight = video.videoHeight;
      if (!vWidth || !vHeight) return null;

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
      if (!ctx) return null;
      ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, offCanvas.width, offCanvas.height);

      return new Promise<Blob | null>((resolve) => {
        offCanvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
      });
    },
    []
  );

  // Start Camera Stream with device enumeration
  const startCamera = useCallback(
    async (deviceId?: string) => {
      stopCameraStream();
      const currentSessionId = streamSessionIdRef.current;

      try {
        setStatusMessage("Conectando à câmera...");

        const targetId =
          deviceId ||
          (typeof window !== "undefined"
            ? localStorage.getItem("unifap_selected_camera_id") || ""
            : "");

        const constraints: MediaStreamConstraints = {
          video: targetId
            ? { deviceId: { exact: targetId } }
            : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        // If component unmounted or stopCameraStream was called while in-flight
        if (!isMountedRef.current || streamSessionIdRef.current !== currentSessionId) {
          stream.getTracks().forEach((t) => {
            t.stop();
            t.enabled = false;
          });
          return;
        }

        activeStreamsSetRef.current.add(stream);
        currentStreamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            if (!isMountedRef.current || streamSessionIdRef.current !== currentSessionId) {
              stream.getTracks().forEach((t) => {
                t.stop();
                t.enabled = false;
              });
              return;
            }
            if (videoRef.current) {
              videoRef.current.play().catch(() => {});
              setCameraReady(true);
              setRecognitionState("DETECTING");
              setStatusMessage("Aguardando participante...");
            }
          };
        }

        // List video input devices
        try {
          const devs = await navigator.mediaDevices.enumerateDevices();
          const videoDevs = devs.filter((d) => d.kind === "videoinput");
          setAvailableDevices(videoDevs);
          if (targetId) setSelectedDeviceId(targetId);
          else if (videoDevs.length > 0) setSelectedDeviceId(videoDevs[0].deviceId);
        } catch {}
      } catch (err: any) {
        if (!isMountedRef.current || streamSessionIdRef.current !== currentSessionId) return;
        setRecognitionState("ERROR");
        setStatusMessage(
          err.name === "NotAllowedError"
            ? "Permissão da webcam negada no navegador. Permita o acesso."
            : `Erro ao iniciar câmera: ${err.message}`
        );
      }
    },
    [stopCameraStream]
  );

  // Switch camera device
  const handleSwitchCamera = async () => {
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = devs.filter((d) => d.kind === "videoinput");
      setAvailableDevices(videoDevs);

      if (videoDevs.length <= 1) {
        toast.info("Apenas uma câmera física detectada.");
        return;
      }

      const currentIndex = videoDevs.findIndex((d) => d.deviceId === selectedDeviceId);
      const nextIndex = (currentIndex + 1) % videoDevs.length;
      const nextDevice = videoDevs[nextIndex];

      setSelectedDeviceId(nextDevice.deviceId);
      if (typeof window !== "undefined") {
        localStorage.setItem("unifap_selected_camera_id", nextDevice.deviceId);
      }
      toast.success(`Câmera alterada: ${nextDevice.label || `Câmera ${nextIndex + 1}`}`);
      await startCamera(nextDevice.deviceId);
    } catch {
      toast.error("Erro ao alternar câmera.");
    }
  };

  // Inicializar MediaPipe FaceDetector & Câmera
  useEffect(() => {
    isMountedRef.current = true;

    async function initialize() {
      try {
        setStatusMessage("Carregando detector MediaPipe...");
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
          minDetectionConfidence: 0.3,
          minSuppressionThreshold: 0.3,
        });

        if (!isMountedRef.current) {
          detector.close();
          return;
        }

        faceDetectorRef.current = detector;
        await startCamera();
      } catch (err: any) {
        if (!isMountedRef.current) return;
        setRecognitionState("ERROR");
        setStatusMessage(`Erro ao carregar detector: ${err.message}`);
      }
    }

    initialize();

    return () => {
      isMountedRef.current = false;
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      stopCameraStream();
      if (faceDetectorRef.current) {
        try {
          faceDetectorRef.current.close();
        } catch {}
        faceDetectorRef.current = null;
      }
    };
  }, [startCamera, stopCameraStream]);

  // Listener para desligamento forçado e instantâneo ao mudar de página, aba ou navegar
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopCameraStream();
      } else if (isMountedRef.current && faceDetectorRef.current) {
        startCamera();
      }
    };

    const handleUnload = () => {
      stopCameraStream();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handleUnload);
    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("popstate", handleUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handleUnload);
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("popstate", handleUnload);
      stopCameraStream();
    };
  }, [startCamera, stopCameraStream]);

  // Send crop to recognize endpoint
  const performRecognition = useCallback(
    async (cropBlob: Blob) => {
      if (recognizingRef.current || !isMountedRef.current) return;

      recognizingRef.current = true;
      setRecognitionState("PROCESSING");
      setStatusMessage("Identificando biometria no evento...");

      try {
        const formData = new FormData();
        formData.append("eventId", eventId);
        if (deviceIdentifier) formData.append("deviceIdentifier", deviceIdentifier);
        formData.append("crop", cropBlob, "crop.jpg");

        const res = await fetch("/api/v1/biometrics/recognize", {
          method: "POST",
          body: formData,
        });

        const result: BiometricRecognizeResult = await res.json();
        if (!isMountedRef.current) return;

        setLatestResult(result);
        const stateKey = result.status as RecognitionState;
        setRecognitionState(stateKey);

        if (result.status === "REGISTERED") {
          setStatusMessage(`Presença confirmada: ${result.person?.name}`);
          playFeedbackSound("success");
          if (onPresenceRecorded) onPresenceRecorded(result);
        } else if (result.status === "ALREADY_REGISTERED") {
          setStatusMessage(`Presença já confirmada: ${result.person?.name}`);
          playFeedbackSound("warning");
          if (onPresenceRecorded) onPresenceRecorded(result);
        } else if (result.status === "NOT_PARTICIPANT") {
          setStatusMessage(result.message || "Pessoa identificada, mas não está inscrita neste evento.");
          playFeedbackSound("error");
        } else if (result.status === "NOT_RECOGNIZED") {
          setStatusMessage("Rosto não reconhecido no sistema.");
          playFeedbackSound("error");
        } else {
          setStatusMessage(result.message || "Não foi possível registrar a presença.");
          playFeedbackSound("error");
        }

        setTimeout(() => {
          if (isMountedRef.current) {
            setRecognitionState("DETECTING");
            setStatusMessage("Aguardando próximo participante...");
            setLatestResult(null);
            recognizingRef.current = false;
          }
        }, 3500);
      } catch (err: any) {
        if (!isMountedRef.current) return;
        setRecognitionState("ERROR");
        setStatusMessage(err.message || "Erro de conexão ao validar biometria.");
        playFeedbackSound("error");

        setTimeout(() => {
          if (isMountedRef.current) {
            setRecognitionState("DETECTING");
            setStatusMessage("Aguardando participante...");
            recognizingRef.current = false;
          }
        }, 3000);
      }
    },
    [eventId, deviceIdentifier, onPresenceRecorded, playFeedbackSound]
  );

  // Main Detection Loop with ~15 FPS
  useEffect(() => {
    if (!cameraReady) return;
    let isRunning = true;

    const detectLoop = async (now: number) => {
      if (!isRunning || !isMountedRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const detector = faceDetectorRef.current;

      if (video && canvas && detector && video.readyState >= 2) {
        const vWidth = video.videoWidth;
        const vHeight = video.videoHeight;

        if (canvas.width !== vWidth || canvas.height !== vHeight) {
          canvas.width = vWidth;
          canvas.height = vHeight;
        }

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (now - lastDetectionTimeRef.current >= 66) {
            lastDetectionTimeRef.current = now;

            try {
              const detectionResult = detector.detectForVideo(video, Math.round(now));
              const detections = detectionResult.detections || [];
              setDetectedFacesCount(detections.length);

              if (detections.length > 0) {
                // Map bounding boxes and calculate area to prioritize closest person
                const facesWithArea = detections.map((det) => {
                  const b = det.boundingBox;
                  const box = b
                    ? {
                        originX: b.originX,
                        originY: b.originY,
                        width: b.width,
                        height: b.height,
                      }
                    : { originX: 0, originY: 0, width: 0, height: 0 };
                  return { det, box, area: box.width * box.height };
                });

                facesWithArea.sort((a, b) => b.area - a.area);
                const primaryFace = facesWithArea[0];
                const secondaryFaces = facesWithArea.slice(1);

                // Draw secondary faces in cyan/slate HUD tags
                secondaryFaces.forEach(({ box }) => {
                  ctx.save();
                  ctx.strokeStyle = "rgba(56, 189, 248, 0.6)"; // Sky blue
                  ctx.lineWidth = 2;
                  ctx.setLineDash([6, 6]);
                  ctx.strokeRect(box.originX, box.originY, box.width, box.height);
                  ctx.restore();
                });

                // Primary Face (Center / Closest)
                const { box } = primaryFace;
                const faceCenterX = box.originX + box.width / 2;
                const faceCenterY = box.originY + box.height / 2;
                const frameCenterX = vWidth / 2;
                const frameCenterY = vHeight / 2;

                const toleranceX = vWidth * 0.26;
                const toleranceY = vHeight * 0.26;
                const isCentered =
                  Math.abs(faceCenterX - frameCenterX) <= toleranceX &&
                  Math.abs(faceCenterY - frameCenterY) <= toleranceY;
                const isAdequateSize = box.width >= vWidth * 0.14 && box.height >= vHeight * 0.16;

                const isWellFramed = isCentered && isAdequateSize;

                // Draw primary bounding box
                const isBoxActiveGreen = isWellFramed;
                ctx.save();
                ctx.strokeStyle = isBoxActiveGreen ? "#22c55e" : "#f59e0b";
                ctx.lineWidth = 3.5;
                ctx.strokeRect(box.originX, box.originY, box.width, box.height);

                // High-Tech Glowing Corner Brackets
                const cornerLen = Math.min(28, box.width * 0.28);
                ctx.strokeStyle = isBoxActiveGreen ? "#4ade80" : "#fbbf24";
                ctx.lineWidth = 5;
                ctx.shadowColor = isBoxActiveGreen
                  ? "rgba(34, 197, 94, 0.8)"
                  : "rgba(245, 158, 11, 0.8)";
                ctx.shadowBlur = 10;

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

                // Trigger Recognition
                if (!recognizingRef.current) {
                  if (!isWellFramed) {
                    setRecognitionState("FACE_CENTERING");
                    setStatusMessage("Aproxime-se e alinhe o rosto na moldura");
                  } else {
                    setRecognitionState("FACE_FOUND");
                    setStatusMessage("Rosto identificado! Processando presença...");

                    const timeSinceLastRecognize = now - lastRecognitionTimeRef.current;
                    if (timeSinceLastRecognize >= 2800) {
                      lastRecognitionTimeRef.current = now;
                      generateFaceCropBlob(video, box).then((cropBlob) => {
                        if (cropBlob) {
                          performRecognition(cropBlob);
                        }
                      });
                    }
                  }
                }
              } else {
                if (!recognizingRef.current) {
                  setRecognitionState("DETECTING");
                  setStatusMessage("Posicione o rosto em frente à câmera...");
                }
              }
            } catch {}
          }
        }
      }

      animationFrameIdRef.current = requestAnimationFrame(detectLoop);
    };

    animationFrameIdRef.current = requestAnimationFrame(detectLoop);

    return () => {
      isRunning = false;
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [cameraReady, generateFaceCropBlob, performRecognition]);

  // Sincronização em tempo real de Fullscreen (corrige tecla ESC e botão sair)
  useEffect(() => {
    const handleFullscreenChange = () => {
      // isFullscreen no componente só é ativo se o próprio container foi colocado em fullscreen
      const isCurrentlyFullscreen = document.fullscreenElement === containerRef.current;
      setIsFullscreen(isCurrentlyFullscreen);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "f" && !isKioskMode) {
        toggleFullscreen();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isKioskMode]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    const isCurrentlyFullscreen = document.fullscreenElement === containerRef.current;

    if (!isCurrentlyFullscreen) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center justify-center overflow-hidden rounded-3xl bg-black border border-slate-800 shadow-2xl transition-all duration-300 ${
        isFullscreen
          ? "fixed inset-0 z-50 h-screen w-screen rounded-none border-none"
          : isKioskMode
          ? "h-full w-full max-h-full"
          : "h-[540px] w-full max-w-4xl"
      } ${className}`}
    >
      {/* Top Header Bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/50 to-transparent p-4">
        <div className="flex items-center gap-2.5">
          {!isKioskMode && (
            <>
              <div className="flex h-3 w-3 items-center justify-center">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                {eventName}
              </span>
              {deviceIdentifier && (
                <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] text-white/80 font-mono">
                  {deviceIdentifier}
                </span>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Detected Face Counter Badge */}
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs text-slate-200 shadow-md">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${
                detectedFacesCount > 0
                  ? "bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]"
                  : "bg-slate-500"
              }`}
            />
            <span className="font-mono font-bold">
              {detectedFacesCount} {detectedFacesCount === 1 ? "rosto na cena" : "rostos na cena"}
            </span>
          </div>

          {/* Switch Camera Button (Always visible) */}
          <button
            onClick={handleSwitchCamera}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-600/60 text-xs font-bold text-zinc-100 hover:text-white transition-all shadow-sm cursor-pointer"
            title="Trocar entre câmeras conectadas"
          >
            <SwitchCamera className="h-4 w-4 text-emerald-400" />
            <span className="hidden sm:inline">
              {availableDevices.length > 1
                ? `Trocar Câmera (${availableDevices.findIndex((d) => d.deviceId === selectedDeviceId) + 1}/${availableDevices.length})`
                : "Trocar Câmera"}
            </span>
          </button>

          <button
            onClick={() => setSoundMuted(!soundMuted)}
            className="rounded-xl bg-black/50 border border-white/10 p-2 text-white hover:bg-black/70 transition-colors cursor-pointer"
            title={soundMuted ? "Ativar som" : "Silenciar som"}
          >
            {soundMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          {!isKioskMode && (
            <button
              onClick={toggleFullscreen}
              className="rounded-xl bg-black/50 border border-white/10 p-2 text-white hover:bg-black/70 transition-colors cursor-pointer"
              title="Tela cheia"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Video & Canvas Overlay */}
      <div className="relative flex h-full w-full items-center justify-center">
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

        {/* HUD Center Target Outline - Proporcional, Limpo e Elegante */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div
            className={`rounded-3xl border-[2.5px] border-dashed border-white/85 shadow-[0_0_30px_rgba(255,255,255,0.25)] transition-all duration-300 relative ${
              isFullscreen
                ? "h-[62vh] w-[26vw] min-w-[340px] max-w-[500px] min-h-[440px] max-h-[640px]"
                : "h-[68%] max-h-[350px] aspect-[3/4] min-w-[220px]"
            }`}
          />
        </div>
      </div>

      {/* Dynamic Bottom Status Card / Recognition Result Banner */}
      <div className="absolute bottom-6 inset-x-6 z-30 flex flex-col items-center pointer-events-none">
        {latestResult &&
        (latestResult.status === "REGISTERED" ||
          latestResult.status === "ALREADY_REGISTERED" ||
          latestResult.status === "NOT_PARTICIPANT" ||
          latestResult.status === "NOT_RECOGNIZED") ? (
          /* RESULT BANNER CARD */
          <div
            className={`w-full max-w-lg p-5 rounded-3xl bg-slate-900/95 backdrop-blur-md shadow-2xl border-2 pointer-events-auto animate-in fade-in zoom-in-95 duration-200 ${
              latestResult.status === "REGISTERED"
                ? "border-emerald-500/90 shadow-[0_0_40px_rgba(16,185,129,0.45)]"
                : latestResult.status === "ALREADY_REGISTERED"
                ? "border-amber-500/90 shadow-[0_0_40px_rgba(245,158,11,0.45)]"
                : latestResult.status === "NOT_PARTICIPANT"
                ? "border-orange-500/90 shadow-[0_0_40px_rgba(249,115,22,0.45)]"
                : "border-rose-500/90 shadow-[0_0_40px_rgba(244,63,94,0.45)]"
            }`}
          >
            <div className="flex items-center space-x-4">
              <div
                className={`flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center border ${
                  latestResult.status === "REGISTERED"
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                    : latestResult.status === "ALREADY_REGISTERED"
                    ? "bg-amber-500/20 border-amber-500 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)]"
                    : latestResult.status === "NOT_PARTICIPANT"
                    ? "bg-orange-500/20 border-orange-500 text-orange-400"
                    : "bg-rose-500/20 border-rose-500 text-rose-400"
                }`}
              >
                {latestResult.status === "REGISTERED" ? (
                  <CheckCircle2 className="w-9 h-9" />
                ) : latestResult.status === "ALREADY_REGISTERED" ? (
                  <AlertTriangle className="w-9 h-9" />
                ) : latestResult.status === "NOT_PARTICIPANT" ? (
                  <XCircle className="w-9 h-9" />
                ) : (
                  <HelpCircle className="w-9 h-9" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                      latestResult.status === "REGISTERED"
                        ? "bg-emerald-950 text-emerald-300 border-emerald-700 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                        : latestResult.status === "ALREADY_REGISTERED"
                        ? "bg-amber-950 text-amber-300 border-amber-700"
                        : latestResult.status === "NOT_PARTICIPANT"
                        ? "bg-orange-950 text-orange-300 border-orange-700"
                        : "bg-rose-950 text-rose-300 border-rose-700"
                    }`}
                  >
                    {latestResult.status === "REGISTERED"
                      ? "✓ PRESENÇA CONFIRMADA"
                      : latestResult.status === "ALREADY_REGISTERED"
                      ? "⚠️ PRESENÇA JÁ REGISTRADA"
                      : latestResult.status === "NOT_PARTICIPANT"
                      ? "NÃO INSCRITO NO EVENTO"
                      : "ROSTO NÃO RECONHECIDO"}
                  </span>
                  <span className="text-xs font-mono text-slate-400 font-semibold">
                    {new Date().toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>

                <h3 className="mt-1.5 text-xl font-extrabold text-white truncate">
                  {latestResult.person?.name || "Participante"}
                </h3>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  {latestResult.person?.registration && (
                    <span>
                      Matrícula:{" "}
                      <strong className="text-emerald-400 font-mono">
                        {latestResult.person.registration}
                      </strong>
                    </span>
                  )}
                  {latestResult.person?.category && (
                    <span className="text-slate-400">• {latestResult.person.category}</span>
                  )}
                  {latestResult.confidence !== undefined && (
                    <span className="text-slate-400">
                      • Confiança:{" "}
                      <strong className="text-emerald-400">
                        {Math.round(latestResult.confidence * 100)}%
                      </strong>
                    </span>
                  )}
                </div>

                {latestResult.status === "ALREADY_REGISTERED" && (
                  <p className="mt-1 text-xs text-amber-300/90">
                    A presença deste participante já havia sido confirmada anteriormente neste evento.
                  </p>
                )}
                {latestResult.status === "NOT_PARTICIPANT" && (
                  <p className="mt-1 text-xs text-orange-300/90">
                    {latestResult.message ||
                      "Pessoa identificada no cadastro geral, mas não está vinculada a este evento."}
                  </p>
                )}
                {latestResult.status === "NOT_RECOGNIZED" && (
                  <p className="mt-1 text-xs text-rose-300/90">
                    Não foi possível identificar a biometria facial. Aproxime-se e verifique o cadastro.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* STANDARD REAL-TIME HUD STATUS PILL */
          <div
            className={`px-6 py-2.5 rounded-full bg-slate-900/95 border-2 shadow-2xl backdrop-blur-md flex items-center space-x-3 animate-in fade-in duration-150 ${
              RECOGNITION_STATE_CONFIG[recognitionState]?.borderColor || "border-slate-700/60"
            }`}
          >
            {recognitionState === "PROCESSING" ? (
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
            ) : recognitionState === "FACE_FOUND" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-pulse" />
            ) : recognitionState === "FACE_CENTERING" ? (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            ) : recognitionState === "NOT_RECOGNIZED" ||
              recognitionState === "NOT_PARTICIPANT" ||
              recognitionState === "ERROR" ? (
              <XCircle className="w-5 h-5 text-rose-400" />
            ) : (
              <Camera className="w-5 h-5 text-emerald-400" />
            )}

            <div>
              <p
                className={`text-xs font-extrabold tracking-wide ${
                  RECOGNITION_STATE_CONFIG[recognitionState]?.color || "text-white"
                }`}
              >
                {RECOGNITION_STATE_CONFIG[recognitionState]?.title || "Câmera Ativa"}
              </p>
              <p className="text-[11px] text-slate-300 font-medium">{statusMessage}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
