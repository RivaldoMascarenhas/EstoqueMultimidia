"use client";

import React, { useState, useEffect } from "react";
import { Gauge, Activity, Server, ShieldCheck, Camera, Sparkles } from "lucide-react";
import { TestBiometricModal } from "@/components/biometria/TestBiometricModal";

export default function BiometriaTestarPage() {
  const [health, setHealth] = useState<any>(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  const fetchHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await fetch("/api/v1/biometrics/health").catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        setHealth(data);
      } else {
        setHealth({
          status: "unreachable",
          version: "desconectado",
          databaseConnected: false,
          pgvectorAvailable: false,
          faceRecognitionEngine: "indisponível",
          activeEmbeddingsCount: 0,
        });
      }
    } catch {
      setHealth({
        status: "unreachable",
        version: "desconectado",
        databaseConnected: false,
        pgvectorAvailable: false,
        faceRecognitionEngine: "indisponível",
        activeEmbeddingsCount: 0,
      });
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const isOnline = health?.status === "healthy" || health?.status === "online";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Gauge className="h-6 w-6 text-primary" />
            Laboratório de Testes Biométricos
          </h1>
          <p className="text-xs text-muted-foreground">
            Ambiente técnico para teste de similaridade facial, cálculo de distância vetorial pgvector e diagnóstico do motor de IA.
          </p>
        </div>

        <button
          onClick={() => setIsTestModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md transition-colors"
        >
          <Camera className="h-4 w-4" />
          Iniciar Teste de Câmera
        </button>
      </div>

      {!isOnline && (
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-3">
          <Activity className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Microsserviço de Biometria Facial Offline (FastAPI / pgvector)</p>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              O serviço Python em <code className="font-mono bg-background/50 px-1 py-0.5 rounded">http://localhost:8000</code> não está respondendo no momento.
              Para habilitar o cálculo de embeddings e testes com a câmera, inicie o container: <code className="font-mono bg-background/50 px-1.5 py-0.5 rounded font-bold">docker compose up -d biometric-api</code> ou execute localmente: <code className="font-mono bg-background/50 px-1.5 py-0.5 rounded font-bold">cd biometric-api && uvicorn app.main:app --port 8000</code>.
            </p>
          </div>
        </div>
      )}

      {/* Health Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Status da Biometric API</span>
            <Activity className={`h-4 w-4 ${isOnline ? "text-emerald-500" : "text-rose-500"}`} />
          </div>
          <p className={`text-lg font-bold uppercase tracking-wider ${isOnline ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {isOnline ? "ONLINE" : "OFFLINE"}
          </p>
          <p className="text-[10px] text-muted-foreground">Serviço FastAPI interno</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Motor pgvector L2</span>
            <Server className={`h-4 w-4 ${health?.pgvectorAvailable ? "text-sky-500" : "text-amber-500"}`} />
          </div>
          <p className="text-lg font-bold text-foreground">PostgreSQL 16</p>
          <p className={`text-[10px] font-semibold ${health?.pgvectorAvailable ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
            {health?.pgvectorAvailable ? "Extensão 'vector' Ativa" : "Aguardando Microsserviço"}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Algoritmo de Extração</span>
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          <p className="text-sm font-bold text-foreground">dlib 128D ResNet</p>
          <p className="text-[10px] text-muted-foreground">MediaPipe no Navegador</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Limiar de Reconhecimento</span>
            <Gauge className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-lg font-bold text-foreground font-mono">0.60 L2 / 80%</p>
          <p className="text-[10px] text-muted-foreground">Tolerância segura calibrada</p>
        </div>
      </div>

      {/* Instructions Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Como Funciona o Modo de Teste
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-muted-foreground">
          <div className="rounded-xl border border-border/80 bg-muted/10 p-4 space-y-1.5">
            <span className="font-bold text-foreground text-xs">1. Detecção Client-Side</span>
            <p className="text-[11px] leading-relaxed">
              O MediaPipe analisa o fluxo da webcam em tempo real no navegador, localiza a face e faz o recorte com margens de 20% H e 25% V.
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/10 p-4 space-y-1.5">
            <span className="font-bold text-foreground text-xs">2. Busca Vetorial L2</span>
            <p className="text-[11px] leading-relaxed">
              O FastAPI gera o vetor 128D e executa o operador <code className="text-primary font-mono font-bold">&lt;-&gt;</code> no pgvector para encontrar a face mais próxima.
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/10 p-4 space-y-1.5">
            <span className="font-bold text-foreground text-xs">3. Sem Registro de Presença</span>
            <p className="text-[11px] leading-relaxed">
              O modo de teste não grava registros na tabela de presenças, sendo ideal para calibração de câmeras, iluminação e testes de validação.
            </p>
          </div>
        </div>
      </div>

      <TestBiometricModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
      />
    </div>
  );
}
