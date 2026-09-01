"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  Search, 
  CheckCircle2, 
  ArrowRight, 
  Camera, 
  QrCode,
  FileCheck2,
  Lock,
  Sparkles
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrScannerModal } from "@/components/scanner/qr-scanner-modal";

export default function ValidarDocumentosPage() {
  const [code, setCode] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    let cleanCode = code.trim();
    // Se colou uma URL completa (ex: https://multimidia.rivaldo.uk/validar/cmthzzf6n0), extrai só o código
    if (cleanCode.includes("/validar/")) {
      const parts = cleanCode.split("/validar/");
      cleanCode = parts[parts.length - 1]?.split("?")[0]?.split("#")[0]?.trim() || cleanCode;
    }

    router.push(`/validar/${encodeURIComponent(cleanCode)}`);
  };

  const handleScanSuccess = (scannedCode: string) => {
    let clean = scannedCode.trim();
    if (clean.includes("/validar/")) {
      const parts = clean.split("/validar/");
      clean = parts[parts.length - 1]?.split("?")[0]?.split("#")[0]?.trim() || clean;
    }
    setIsScannerOpen(false);
    router.push(`/validar/${encodeURIComponent(clean)}`);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in-50 duration-300 pb-12">
      {/* Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-primary/10 text-primary">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Validador de Documentos
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Verifique em tempo real a autenticidade e a rastreabilidade de Termos e Ordens de Serviço emitidos pela UniFAP.
              </p>
            </div>
          </div>
        </div>

        <Badge variant="outline" className="gap-1.5 self-start sm:self-auto py-1.5 px-3 rounded-full border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-medium text-xs">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Ambiente Seguro & Auditado</span>
        </Badge>
      </div>

      {/* Card Principal de Consulta */}
      <Card className="rounded-3xl border-border bg-card shadow-xl overflow-hidden">
        <CardHeader className="p-6 sm:p-8 text-center space-y-2 border-b border-border/60 bg-muted/20">
          <div className="inline-flex p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary mx-auto shadow-xs">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <CardTitle className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            Verificação de Autenticidade Digital
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">
            Consulte a validade e a integridade de <strong>Termos de Cautela</strong>, <strong>Comprovantes de Devolução</strong> e <strong>Ordens de Serviço</strong>.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* Botão de Scanner com Câmera */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-muted/40 border border-border/80 border-dashed space-y-3 text-center">
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              <Camera className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">
                Escanear QR Code com a Câmera
              </h3>
              <p className="text-xs text-muted-foreground max-w-md">
                Aponte a câmera do seu smartphone ou webcam para o QR Code impresso no canto do documento.
              </p>
            </div>

            <Button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="gap-2 rounded-2xl px-6 bg-primary text-primary-foreground font-semibold shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>Abrir Câmera para Escanear</span>
            </Button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-border/80 w-full" />
            <span className="bg-card px-3 text-[11px] font-bold text-muted-foreground uppercase tracking-widest absolute">
              OU DIGITE A CHAVE
            </span>
          </div>

          {/* Formulário de Busca Manual */}
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-primary" />
                <span>Chave de Autenticação ou Protocolo Oficial</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Ex: LOAN-72B9A1F4, OS-2026-0001 ou cole o link do QR Code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="h-11 text-xs sm:text-sm rounded-xl pl-3.5 bg-background font-mono"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={!code.trim()}
                  className="h-11 px-5 rounded-xl gap-2 font-semibold cursor-pointer shrink-0"
                >
                  <span>Verificar</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </form>

          {/* Garantias de Segurança */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-muted/30 border border-border/60">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground">Confirmação em Tempo Real</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Validação direta e criptográfica contra a base de dados oficial do UniFAP.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-muted/30 border border-border/60">
              <Lock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground">Integridade Garantida</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Impedimento contra adulteração de termos impressos e falsificação de cautelas.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal do Scanner */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        title="Escanear Documento Institucional"
        description="Posicione o QR Code impresso no documento dentro da área do visor."
      />
    </div>
  );
}
