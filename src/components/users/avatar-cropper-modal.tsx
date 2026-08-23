"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Crop, 
  Check, 
  Move,
  FlipHorizontal,
  ScanFace,
  Grid3x3,
  Undo2,
  Circle,
  Square,
  Sparkles,
  SlidersHorizontal
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AvatarCropperModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onApplyCroppedImage: (croppedBase64: string) => void;
}

type GuideMode = "face" | "grid" | "none";
type MaskShape = "circle" | "rounded";

export function AvatarCropperModal({
  isOpen,
  imageSrc,
  onClose,
  onApplyCroppedImage,
}: AvatarCropperModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270 ou ajuste contínuo
  const [fineRotation, setFineRotation] = useState(0); // -45° a +45°
  const [flipH, setFlipH] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [guideMode, setGuideMode] = useState<GuideMode>("face");
  const [maskShape, setMaskShape] = useState<MaskShape>("circle");
  const [showFineAngle, setShowFineAngle] = useState(false);

  // Estados de arraste / toque
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const touchDistanceRef = useRef<number | null>(null);
  const touchInitialZoomRef = useRef<number>(1);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Ângulo total combinado
  const totalRotation = (rotation + fineRotation) % 360;

  // Resetar parâmetros ao abrir uma nova imagem
  useEffect(() => {
    if (isOpen && imageSrc) {
      setZoom(1);
      setRotation(0);
      setFineRotation(0);
      setFlipH(false);
      setPosition({ x: 0, y: 0 });
      setShowFineAngle(false);
      setGuideMode("face");

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageSrc;
      img.onload = () => {
        imageRef.current = img;
        drawCanvas();
      };
    }
  }, [isOpen, imageSrc]);

  // Função de renderização no Canvas com suporte a HiDPI / Retina
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const displaySize = 340; // Tamanho visual em pixels CSS

    // Configurar resolução interna nítida para telas Retina/HiDPI
    if (canvas.width !== displaySize * dpr || canvas.height !== displaySize * dpr) {
      canvas.width = displaySize * dpr;
      canvas.height = displaySize * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, displaySize, displaySize);

    // Suavização de alta qualidade
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Centralizar transformação no meio do canvas
    ctx.translate(displaySize / 2 + position.x, displaySize / 2 + position.y);
    ctx.rotate((totalRotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, 1);
    ctx.scale(zoom, zoom);

    // Calcular tamanho com base na proporção original
    const aspect = img.width / img.height;
    let drawWidth = displaySize;
    let drawHeight = displaySize;

    if (aspect > 1) {
      drawWidth = displaySize * aspect;
    } else {
      drawHeight = displaySize / aspect;
    }

    ctx.drawImage(
      img,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
    );

    ctx.restore();
  }, [zoom, totalRotation, flipH, position]);

  useEffect(() => {
    if (imageRef.current) {
      drawCanvas();
    }
  }, [drawCanvas]);

  // Handler de Zoom via Roda do Mouse (Wheel)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = -e.deltaY * 0.0015;
    setZoom((prev) => Math.min(3.5, Math.max(0.6, Number((prev + zoomDelta).toFixed(3)))));
  };

  // Dragging handlers (Mouse)
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPosition({
      x: dragStartRef.current.posX + dx,
      y: dragStartRef.current.posY + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers (Pinch-to-zoom & Pan no Mobile)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        posX: position.x,
        posY: position.y,
      };
      touchDistanceRef.current = null;
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchDistanceRef.current = dist;
      touchInitialZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      setPosition({
        x: dragStartRef.current.posX + dx,
        y: dragStartRef.current.posY + dy,
      });
    } else if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleChange = currentDist / touchDistanceRef.current;
      const newZoom = Math.min(3.5, Math.max(0.6, touchInitialZoomRef.current * scaleChange));
      setZoom(Number(newZoom.toFixed(3)));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchDistanceRef.current = null;
  };

  // Rotação em passos de 90°
  const handleRotate90 = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Alternar Espelhamento Horizontal
  const handleToggleFlip = () => {
    setFlipH((prev) => !prev);
  };

  // Resetar tudo para padrão
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setFineRotation(0);
    setFlipH(false);
    setPosition({ x: 0, y: 0 });
  };

  // Alternar Modos de Guia (Face -> Grade -> Nenhum)
  const handleCycleGuides = () => {
    setGuideMode((prev) => {
      if (prev === "face") return "grid";
      if (prev === "grid") return "none";
      return "face";
    });
  };

  // Duplo clique na área de corte para centralizar ou dar zoom rápido
  const handleDoubleClick = () => {
    if (zoom === 1 && position.x === 0 && position.y === 0) {
      setZoom(1.4);
    } else {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  };

  // Atalhos de teclado (Setas para ajuste fino, +/-, R, F, Enter)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const step = e.shiftKey ? 12 : 3;
      
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          setPosition((prev) => ({ ...prev, x: prev.x - step }));
          break;
        case "ArrowRight":
          e.preventDefault();
          setPosition((prev) => ({ ...prev, x: prev.x + step }));
          break;
        case "ArrowUp":
          e.preventDefault();
          setPosition((prev) => ({ ...prev, y: prev.y - step }));
          break;
        case "ArrowDown":
          e.preventDefault();
          setPosition((prev) => ({ ...prev, y: prev.y + step }));
          break;
        case "+":
        case "=":
          e.preventDefault();
          setZoom((prev) => Math.min(3.5, Number((prev + 0.1).toFixed(2))));
          break;
        case "-":
        case "_":
          e.preventDefault();
          setZoom((prev) => Math.max(0.6, Number((prev - 0.1).toFixed(2))));
          break;
        case "r":
        case "R":
          e.preventDefault();
          handleRotate90();
          break;
        case "f":
        case "F":
          e.preventDefault();
          handleToggleFlip();
          break;
        case "Enter":
          if (!e.repeat) {
            e.preventDefault();
            handleSaveCrop();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, zoom, position, totalRotation, flipH]);

  // Exportação em Alta Definição (HD 512x512)
  const handleSaveCrop = () => {
    const img = imageRef.current;
    if (!img) return;

    // Gerar canvas final quadrado em altíssima definição (512x512)
    const exportSize = 512;
    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = exportSize;
    finalCanvas.height = exportSize;
    const finalCtx = finalCanvas.getContext("2d");

    if (!finalCtx) return;

    finalCtx.imageSmoothingEnabled = true;
    finalCtx.imageSmoothingQuality = "high";

    const displaySize = 340;
    const scaleRatio = exportSize / displaySize;

    finalCtx.translate(
      exportSize / 2 + position.x * scaleRatio,
      exportSize / 2 + position.y * scaleRatio
    );
    finalCtx.rotate((totalRotation * Math.PI) / 180);
    finalCtx.scale(flipH ? -1 : 1, 1);
    finalCtx.scale(zoom, zoom);

    const aspect = img.width / img.height;
    let drawWidth = exportSize;
    let drawHeight = exportSize;

    if (aspect > 1) {
      drawWidth = exportSize * aspect;
    } else {
      drawHeight = exportSize / aspect;
    }

    finalCtx.drawImage(
      img,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
    );

    // Exportar em JPEG de alta fidelidade
    const base64 = finalCanvas.toDataURL("image/jpeg", 0.95);
    onApplyCroppedImage(base64);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-5 sm:p-6 rounded-3xl bg-card/95 backdrop-blur-xl border-border/80 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/20 shadow-inner">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-1.5">
                Ajustar Imagem do Avatar
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  HD
                </span>
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Arraste, gire e use o scroll do mouse para enquadrar seu rosto com precisão
              </p>
            </div>
          </div>
        </div>

        {/* Viewport Interativo de Corte */}
        <div className="space-y-3 pt-2">
          
          <div 
            ref={containerRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onDoubleClick={handleDoubleClick}
            className="relative w-[300px] h-[300px] sm:w-[340px] sm:h-[340px] mx-auto rounded-3xl overflow-hidden bg-slate-950/90 border-2 border-primary/40 cursor-grab active:cursor-grabbing select-none shadow-2xl group transition-all"
            title="Arraste para mover • Scroll para zoom • Duplo clique para alternar zoom"
          >
            {/* Canvas de Renderização */}
            <canvas
              ref={canvasRef}
              className="w-full h-full object-cover block"
            />

            {/* Máscara de Recorte & Vinheta Holográfica */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              
              {/* Formato Circular ou Quadrado */}
              <div 
                className={`w-[260px] h-[260px] sm:w-[290px] sm:h-[290px] border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] transition-all duration-300 ${
                  maskShape === "circle" ? "rounded-full" : "rounded-3xl"
                }`}
              />

              {/* Guia 1: Silhueta Biométrica Facial (Face Framing Guide) */}
              {guideMode === "face" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300">
                  <svg 
                    viewBox="0 0 200 200" 
                    className="w-[260px] h-[260px] sm:w-[290px] sm:h-[290px] text-primary/40 stroke-current fill-none"
                  >
                    {/* Linha dos olhos */}
                    <line x1="60" y1="85" x2="140" y2="85" strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
                    {/* Linha vertical central */}
                    <line x1="100" y1="30" x2="100" y2="175" strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
                    {/* Oval da cabeça */}
                    <ellipse cx="100" cy="85" rx="38" ry="48" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.75" />
                    {/* Contorno sutil de ombros */}
                    <path d="M 50 175 Q 75 145 100 145 Q 125 145 150 175" strokeWidth="1.2" opacity="0.5" />
                  </svg>
                  
                  {/* Badge auxiliar "Alinhe os olhos" */}
                  <div className="absolute top-4 bg-primary/20 backdrop-blur-md border border-primary/30 text-primary text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm">
                    Alinhe seu rosto na silhueta
                  </div>
                </div>
              )}

              {/* Guia 2: Grade dos Terços (Rule of Thirds) */}
              {guideMode === "grid" && (
                <div className={`absolute w-[260px] h-[260px] sm:w-[290px] sm:h-[290px] grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40 border border-primary/60 transition-all duration-300 ${
                  maskShape === "circle" ? "rounded-full" : "rounded-3xl"
                }`}>
                  <div className="border-r border-b border-primary/50" />
                  <div className="border-r border-b border-primary/50" />
                  <div className="border-b border-primary/50" />
                  <div className="border-r border-b border-primary/50" />
                  <div className="border-r border-b border-primary/50" />
                  <div className="border-b border-primary/50" />
                  <div className="border-r border-b border-primary/50" />
                  <div className="border-r border-b border-primary/50" />
                  <div />
                </div>
              )}
            </div>

            {/* Dica de arraste & zoom flutuante */}
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 bg-black/75 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-white/90 font-medium pointer-events-none flex items-center gap-1.5 shadow-lg border border-white/10 opacity-90 group-hover:opacity-100 transition-opacity">
              <Move className="w-3 h-3 text-primary" />
              <span>Arraste • Scroll para Zoom</span>
            </div>
          </div>

          {/* Barra de Ferramentas e Modos Rápidos */}
          <div className="flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-2xl bg-muted/40 border border-border/60 text-xs">
            
            {/* Alternar Modos de Guia */}
            <button
              type="button"
              onClick={handleCycleGuides}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition-colors ${
                guideMode === "face"
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : guideMode === "grid"
                  ? "bg-blue-500/15 border-blue-500/40 text-blue-500"
                  : "bg-background border-border hover:bg-accent text-muted-foreground"
              }`}
              title="Alternar Guia: Silhueta Facial / Grade 3x3 / Ocultar"
            >
              {guideMode === "face" ? (
                <>
                  <ScanFace className="w-3.5 h-3.5" />
                  <span>Guia Facial</span>
                </>
              ) : guideMode === "grid" ? (
                <>
                  <Grid3x3 className="w-3.5 h-3.5" />
                  <span>Grade 3x3</span>
                </>
              ) : (
                <>
                  <Crop className="w-3.5 h-3.5" />
                  <span>Sem Guias</span>
                </>
              )}
            </button>

            {/* Alternar Formato da Máscara (Circular / Quadrado) */}
            <button
              type="button"
              onClick={() => setMaskShape((prev) => (prev === "circle" ? "rounded" : "circle"))}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border bg-background hover:bg-accent text-foreground text-[11px] font-medium transition-colors"
              title="Alternar formato de visualização"
            >
              {maskShape === "circle" ? (
                <>
                  <Circle className="w-3.5 h-3.5 text-primary" />
                  <span>Circular</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-primary" />
                  <span>Quadrado</span>
                </>
              )}
            </button>

            {/* Espelhar Imagem Horizontalmente */}
            <button
              type="button"
              onClick={handleToggleFlip}
              className={`p-1.5 rounded-xl border text-[11px] font-medium transition-colors ${
                flipH 
                  ? "bg-primary/20 border-primary text-primary" 
                  : "bg-background border-border hover:bg-accent text-muted-foreground"
              }`}
              title="Espelhar Horizontalmente (Flip)"
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
            </button>

            {/* Alternar Ajuste Fino de Rotação */}
            <button
              type="button"
              onClick={() => setShowFineAngle((prev) => !prev)}
              className={`p-1.5 rounded-xl border text-[11px] font-medium transition-colors ${
                showFineAngle || fineRotation !== 0
                  ? "bg-primary/20 border-primary text-primary" 
                  : "bg-background border-border hover:bg-accent text-muted-foreground"
              }`}
              title="Ajuste Fino de Inclinação"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>

            {/* Resetar Parâmetros */}
            <button
              type="button"
              onClick={handleReset}
              className="p-1.5 rounded-xl border border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground text-[11px] transition-colors"
              title="Centralizar e Resetar"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>

          </div>

          {/* Painel de Ajuste Fino de Inclinação (Opcional Expandido) */}
          {showFineAngle && (
            <div className="p-2.5 rounded-2xl bg-muted/50 border border-border/70 space-y-1.5 animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-medium flex items-center gap-1">
                  <RotateCw className="w-3 h-3 text-primary" />
                  Inclinação Fina
                </span>
                <button
                  type="button"
                  onClick={() => setFineRotation(0)}
                  className="font-mono text-primary font-bold hover:underline"
                  title="Zerar inclinação fina"
                >
                  {fineRotation > 0 ? `+${fineRotation}°` : `${fineRotation}°`}
                </button>
              </div>
              <input
                type="range"
                min="-45"
                max="45"
                step="1"
                value={fineRotation}
                onChange={(e) => setFineRotation(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          )}

          {/* Controles de Zoom & Giro 90° */}
          <div className="space-y-2 p-3 rounded-2xl bg-muted/40 border border-border/60">
            
            {/* Slider de Zoom com Percentual */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.max(0.6, Number((prev - 0.15).toFixed(2))))}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                title="Diminuir Zoom (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              
              <input
                type="range"
                min="0.6"
                max="3.5"
                step="0.02"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />

              <button
                type="button"
                onClick={() => setZoom((prev) => Math.min(3.5, Number((prev + 0.15).toFixed(2))))}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                title="Aumentar Zoom (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              {/* Badge de Zoom */}
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="px-2 py-1 rounded-lg bg-background border border-border text-[10px] font-mono font-bold text-foreground hover:border-primary/50 transition-colors"
                title="Clique para redefinir zoom para 100%"
              >
                {Math.round(zoom * 100)}%
              </button>

              {/* Botão de Giro 90° */}
              <button
                type="button"
                onClick={handleRotate90}
                className="p-1.5 rounded-xl border border-input bg-background hover:bg-accent text-foreground text-xs flex items-center gap-1 shadow-sm transition-colors"
                title="Girar 90 Graus no Sentido Horário (R)"
              >
                <RotateCw className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-mono">{rotation}°</span>
              </button>
            </div>

          </div>

          {/* Botões do Rodapé */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-muted-foreground hover:text-foreground text-xs h-9 gap-1"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Restaurar</span>
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="rounded-xl text-xs h-9 px-4"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveCrop}
                className="rounded-xl text-xs h-9 px-4 bg-primary text-primary-foreground font-semibold gap-1.5 shadow-md shadow-primary/20 hover:shadow-primary/30 transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Aplicar Foto Perfeita</span>
              </Button>
            </div>
          </div>

        </div>

      </DialogContent>
    </Dialog>
  );
}
