"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Search, FileText, CheckCircle2, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ValidarDocumentosPage() {
  const [code, setCode] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    router.push(`/validar/${encodeURIComponent(code.trim())}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/30 to-background flex flex-col justify-between p-4 sm:p-8">
      {/* Header Institucional */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between py-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <img
            src="/brand/logo-unifap.png"
            alt="UniFAP"
            className="h-8 sm:h-10 w-auto object-contain"
          />
          <div className="border-l border-border pl-3">
            <span className="font-extrabold text-xs sm:text-sm tracking-tight text-foreground block">
              Centro Universitário Paraíso
            </span>
            <span className="text-[11px] text-muted-foreground block">
              Portal Oficial de Validação de Documentos
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span className="hidden sm:inline">Ambiente Seguro & Auditado</span>
        </div>
      </header>

      {/* Conteúdo Central */}
      <main className="max-w-2xl w-full mx-auto my-12 space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-2 shadow-sm">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Verificação de Autenticidade
          </h1>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Consulte a validade e a integridade de <strong>Termos de Cautela</strong>, <strong>Comprovantes de Devolução</strong>, <strong>Ordens de Serviço</strong> e <strong>Relatórios Oficiais</strong> emitidos pela UniFAP.
          </p>
        </div>

        <Card className="rounded-3xl border-border shadow-2xl bg-card overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold text-foreground">
              Consultar por Chave de Autenticação
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Digite o código de verificação impresso no rodapé ou no QR Code do documento (ex: <code className="font-mono text-primary font-bold">LOAN-1234ABCD</code>, <code className="font-mono text-primary font-bold">OS-2026-0001</code> ou <code className="font-mono text-primary font-bold">cmthzzf6n0</code>).
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3.5" />
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Ex: LOAN-72B9A1F4 ou cmthzzf6n0"
                  className="pl-10 h-11 text-xs sm:text-sm font-mono rounded-xl bg-background border-input uppercase"
                  required
                />
              </div>
              <Button
                type="submit"
                className="h-11 px-6 text-xs sm:text-sm font-bold rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20 gap-2 cursor-pointer shrink-0"
              >
                <span>Verificar Documento</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            <div className="pt-4 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Confirmação em tempo real com a base de dados oficial.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Garantia de inalterabilidade e rastreabilidade patrimonial.</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Rodapé */}
      <footer className="max-w-4xl w-full mx-auto py-6 border-t border-border/60 text-center text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground">
          Centro Universitário Paraíso • UniFAP — Setor de Suporte de TI & Multimídia
        </p>
        <p className="text-[11px]">
          Juazeiro do Norte, Ceará • Sistema Integrado de Gestão de Estoque & Patrimônio
        </p>
      </footer>
    </div>
  );
}
