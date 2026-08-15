"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Crop, 
  Check, 
  X, 
  Move, 
  Sparkles,
  Camera
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

export function AvatarCropperModal({
  isOpen,
  imageSrc,
  onClose,
  onApplyCroppedImage,
}: AvatarCropperModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Resetar ao abrir
  useEffect(() => {
    if (isOpen && imageSrc) {
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });

      const img = new Image();
      img.src = imageSrc;
      img.onload = () => {
        imageRef.current = img;
        drawCanvas();
      };
    }
  }, [isOpen, imageSrc]);

  useEffect(() => {
    if (imageRef.current) {
      drawCanvas();
    }
  }, [zoom, rotation, position]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width; // 320x320
    ctx.clearRect(0, 0, size, size);

    ctx.save();
    // Centralizar transformação no centro do canvas
    ctx.translate(size / 2 + position.x, size / 2 + position.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Calcular tamanho proporcional
    const aspect = img.width / img.height;
    let drawWidth = size;
    let drawHeight = size;

    if (aspect > 1) {
      drawWidth = size * aspect;
    } else {
      drawHeight = size / aspect;
    }

    ctx.drawImage(
      img,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
    );

    ctx.restore();
  };

  // Dragging handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers para celular
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleSaveCrop = () => {
    if (!canvasRef.current) return;

    // Gerar canvas final quadrado em alta resolução (300x300)
    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = 300;
    finalCanvas.height = 300;
    const finalCtx = finalCanvas.getContext("2d");

    if (finalCtx && canvasRef.current) {
      finalCtx.drawImage(canvasRef.current, 0, 0, 300, 300);
      const base64 = finalCanvas.toDataURL("image/jpeg", 0.92);
      onApplyCroppedImage(base64);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6 rounded-3xl bg-card border-border/80 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Ajustar Imagem do Avatar
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Arraste e aproxime a imagem para centralizar seu rosto
              </p>
            </div>
          </div>
        </div>

        {/* Viewport Interativo de Corte */}
        <div className="space-y-4 pt-2">
          
          <div 
            className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] mx-auto rounded-3xl overflow-hidden bg-slate-950 border-2 border-primary/40 cursor-grab active:cursor-grabbing select-none shadow-inner"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
          >
            {/* Canvas de Renderização */}
            <canvas
              ref={canvasRef}
              width={320}
              height={320}
              className="w-full h-full object-cover"
            />

            {/* Máscara Circular Holográfica */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Círculo Guia */}
              <div className="w-64 h-64 sm:w-72 sm:h-72 rounded-full border-2 border-primary/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
              
              {/* Linhas de Grade de Enquadramento */}
              <div className="absolute w-64 h-64 sm:w-72 sm:h-72 rounded-full grid grid-cols-3 grid-rows-3 pointer-events-none opacity-30 border border-primary">
                <div className="border-r border-b border-primary/50" />
                <div className="border-r border-b border-primary/50" />
                <div className="border-b border-primary/50" />
                <div className="border-r border-b border-primary/50" />
                <div className="border-r border-b border-primary/50" />
                <div className="border-b border-primary/50" />
                <div className="border-r border-primary/50" />
                <div className="border-r border-primary/50" />
                <div />
              </div>
            </div>

            {/* Dica de arraste */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] text-white/80 font-medium pointer-events-none flex items-center gap-1">
              <Move className="w-3 h-3" />
              <span>Arraste para posicionar</span>
            </div>
          </div>

          {/* Controles de Zoom & Rotação */}
          <div className="space-y-3 p-3 rounded-2xl bg-muted/40 border border-border/60">
            
            {/* Slider de Zoom */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.max(0.6, prev - 0.15))}
                className="p-1 text-muted-foreground hover:text-foreground"
                title="Diminuir Zoom"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              
              <input
                type="range"
                min="0.6"
                max="3.0"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />

              <button
                type="button"
                onClick={() => setZoom((prev) => Math.min(3.0, prev + 0.15))}
                className="p-1 text-muted-foreground hover:text-foreground"
                title="Aumentar Zoom"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleRotate}
                className="p-1.5 rounded-xl border border-input bg-background hover:bg-accent text-foreground text-xs flex items-center gap-1"
                title="Girar 90 Graus"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono">{rotation}°</span>
              </button>
            </div>

          </div>

          {/* Botões do Rodapé */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl text-xs h-9"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveCrop}
              className="rounded-xl text-xs h-9 bg-primary text-primary-foreground font-semibold gap-1.5 shadow-md shadow-primary/20"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Aplicar Foto Perfeita</span>
            </Button>
          </div>

        </div>

      </DialogContent>
    </Dialog>
  );
}
