"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import { 
  Camera, 
  RefreshCw, 
  Search, 
  Zap, 
  Handshake, 
  Boxes, 
  Wrench, 
  History, 
  Tag, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles,
  Volume2,
  VolumeX,
  Keyboard,
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScannerResultSheet } from "@/components/scanner/scanner-result-sheet";
import { toast } from "sonner";

type ScanMode = "LOOKUP" | "LOAN" | "RETURN" | "AUDIT" | "MAINTENANCE";

export default function ScannerPage() {
  const router = useRouter();

  // Estados do Scanner
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
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
  const audioCtxRef = useRef<AudioContext | null>(null);

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
      osc.frequency.setValueAtTime(880, ctx.currentTime); // Tom A5 agradável
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      // Audio não suportado ou bloqueado
    }
  };

  // Disparar vibração háptica no celular
  const triggerHaptic = () => {
    if (typeof window !== "undefined" && "navigator" in window && navigator.vibrate) {
      navigator.vibrate(80);
    }
  };

  // Iniciar Leitura da Câmera
  const startCamera = async () => {
    try {
      setCameraError(null);
      setIsScanning(true);

      const html5QrCode = new Html5Qrcode("scanner-viewfinder");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleCodeDetected(decodedText);
        },
        () => {
          // Frame normal
        }
      );
    } catch (err: any) {
      console.warn("Erro câmera:", err);
      setCameraError(
        "Não foi possível iniciar a câmera traseira. Conceda permissão no navegador ou digite o código do patrimônio/caixa no campo abaixo."
      );
      setIsScanning(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (e) {}
    }
    setIsScanning(false);
  };

  useEffect(() => {
    startCamera();
    return () => {
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
          ...prev.slice(0, 9), // Limitar a 10 itens
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
    } catch (err) {
      toast.error("Erro ao consultar o banco de dados.");
    } finally {
      setIsLoadingLookup(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
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
            <Badge variant="normal" className="text-xs">
              Câmera Ativa
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Aponte a câmera para o QR Code da caixa, do equipamento patrimonial ou do termo para ações imediatas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Som Ativar/Desativar */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="rounded-xl text-xs h-9 gap-1.5"
            title={soundEnabled ? "Desativar som do beep" : "Ativar som do beep"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
            <span className="hidden sm:inline">{soundEnabled ? "Som Ativo" : "Mudo"}</span>
          </Button>

          {/* Reiniciar Câmera */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              stopCamera();
              setTimeout(startCamera, 200);
            }}
            className="rounded-xl text-xs h-9 gap-1.5"
            title="Reiniciar Câmera"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reiniciar Câmera</span>
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
              className={`px-3 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
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

            {/* Laser e Mira Holográfica se estiver escaneando */}
            {isScanning && !scanResult && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                {/* Moldura de Foco */}
                <div className="w-56 h-56 border-2 border-primary/80 rounded-2xl relative animate-pulse shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                  {/* Cantoneiras */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-primary rounded-tl" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-primary rounded-tr" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-primary rounded-bl" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-primary rounded-br" />

                  {/* Linha Laser Animada */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent absolute top-1/2 -translate-y-1/2 animate-bounce shadow-[0_0_8px_#f43f5e]" />
                </div>

                <span className="text-[11px] font-semibold text-white/80 bg-black/60 px-3 py-1 rounded-full mt-4 backdrop-blur-md">
                  Posicione o QR Code dentro do quadro
                </span>
              </div>
            )}

            {/* Aviso se a câmera estiver pausada / com erro */}
            {cameraError && (
              <div className="p-6 text-center space-y-3 max-w-xs z-10">
                <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
                <p className="text-xs text-slate-300 font-medium">{cameraError}</p>
                <Button
                  size="sm"
                  onClick={startCamera}
                  className="rounded-xl text-xs gap-1.5 bg-primary text-primary-foreground"
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
              <Button type="submit" size="sm" className="h-10 px-4 rounded-xl text-xs font-semibold">
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
                        className="w-full text-left p-3 rounded-2xl bg-muted/40 hover:bg-muted/70 border border-border/60 flex items-center justify-between group transition-colors"
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
