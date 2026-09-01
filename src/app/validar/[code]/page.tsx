"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Calendar,
  User,
  Monitor,
  ArrowLeft,
  Clock,
  Building2,
  FileText,
  Lock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime } from "@/lib/utils";

export default function DocumentVerificationResultPage() {
  const params = useParams();
  const code = params?.code as string;

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;

    fetch(`/api/v1/public/validate/${encodeURIComponent(code)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setData(json.data);
          setError(null);
        } else {
          setError(json.error || "Documento não encontrado na base de dados oficial.");
          setData(null);
        }
      })
      .catch(() => {
        setError("Erro ao conectar com o serviço de validação institucional.");
        setData(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [code]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background flex flex-col justify-between p-4 sm:p-8">
      {/* Header Institucional */}
      <header className="max-w-3xl w-full mx-auto flex items-center justify-between py-4 border-b border-border/60">
        <Link href="/validar" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
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
              Validação de Autenticidade
            </span>
          </div>
        </Link>

        <Link href="/validar">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-xl cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nova Consulta</span>
          </Button>
        </Link>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-3xl w-full mx-auto my-8 space-y-6">
        {isLoading ? (
          <Card className="p-12 rounded-3xl text-center space-y-4 shadow-xl">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">
                Consultando autenticidade do documento...
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                Chave: {decodeURIComponent(code || "")}
              </p>
            </div>
          </Card>
        ) : error || !data ? (
          /* Card de Documento Não Encontrado */
          <Card className="rounded-3xl border-rose-500/30 bg-card shadow-2xl overflow-hidden">
            <div className="p-6 sm:p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">
                  Documento Não Encontrado ou Inválido
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                  {error || "Não foi possível validar este documento junto à base de dados oficial da UniFAP."}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 text-left text-xs font-mono max-w-md mx-auto space-y-1">
                <span className="text-muted-foreground block text-[11px]">Código Informado:</span>
                <span className="font-bold text-foreground break-all">{decodeURIComponent(code || "")}</span>
              </div>

              <div className="pt-2">
                <Link href="/validar">
                  <Button className="rounded-xl px-6 font-bold text-xs bg-primary text-primary-foreground cursor-pointer">
                    Digitar Outro Código
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        ) : (
          /* Card de Documento Válido & Autêntico */
          <Card className="rounded-3xl border-emerald-500/30 bg-card shadow-2xl overflow-hidden space-y-6 p-6 sm:p-8">
            
            {/* Selo Oficial de Autenticidade */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-emerald-500/15 border border-emerald-500/30 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/25">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div className="space-y-0.5">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Documento Oficial Autêntico & Regular
                </span>
                <h2 className="text-sm sm:text-base font-extrabold text-foreground">
                  {data.documentTitle}
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Emitido por: <strong>{data.institution}</strong> • {data.sector}
                </p>
              </div>
            </div>

            {/* Metadados e Chaves */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-muted/40 border border-border/80">
                <span className="text-[10px] text-muted-foreground block">Protocolo</span>
                <strong className="font-mono text-foreground font-bold text-xs">{data.protocol}</strong>
              </div>

              <div className="p-3 rounded-2xl bg-muted/40 border border-border/80">
                <span className="text-[10px] text-muted-foreground block">Código Autenticação</span>
                <strong className="font-mono text-primary font-bold text-xs">{data.authenticationCode}</strong>
              </div>

              <div className="p-3 rounded-2xl bg-muted/40 border border-border/80">
                <span className="text-[10px] text-muted-foreground block">Situação</span>
                <span className={`inline-block font-bold text-xs ${
                  data.statusColor === "emerald" ? "text-emerald-600 dark:text-emerald-400" :
                  data.statusColor === "rose" ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"
                }`}>
                  {data.statusLabel}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-muted/40 border border-border/80">
                <span className="text-[10px] text-muted-foreground block">Data de Emissão</span>
                <strong className="text-foreground font-semibold text-xs">
                  {data.issuedAt ? formatDate(data.issuedAt) : "-"}
                </strong>
              </div>
            </div>

            {/* Detalhes do Empréstimo / Cautela */}
            {data.beneficiary && (
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-3">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wide">
                  <User className="w-4 h-4 text-primary" />
                  <span>Identificação do Depositário / Solicitante</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Nome do Solicitante</span>
                    <strong className="text-foreground text-xs">{data.beneficiary.name}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Departamento / Curso</span>
                    <span className="text-foreground">{data.beneficiary.department}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Local de Uso / Destino</span>
                    <strong className="text-foreground">{data.beneficiary.destination}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Contato Registrado</span>
                    <span className="font-mono text-muted-foreground">{data.beneficiary.phone}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Equipamento Patrimonial */}
            {data.asset && (
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-3">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wide">
                  <Monitor className="w-4 h-4 text-primary" />
                  <span>Equipamento Patrimonial Institucional</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Nº Tombamento / Patrimônio</span>
                    <strong className="font-mono text-primary text-xs">#{data.asset.tag}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Descrição do Item</span>
                    <strong className="text-foreground">{data.asset.itemName}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Modelo / Serial</span>
                    <span className="text-muted-foreground">{data.asset.model} • S/N: {data.asset.serialNumber}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Controle de Prazos */}
            {data.expectedReturnDate && (
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-3">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wide">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Controle de Prazos & Devolução</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Retirada</span>
                    <span className="font-semibold text-foreground">{formatDateTime(data.issuedAt)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Prazo Previsto de Devolução</span>
                    <span className="font-semibold text-foreground">{formatDateTime(data.expectedReturnDate)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Devolução Efetiva</span>
                    <span className="font-semibold text-foreground">
                      {data.actualReturnDate ? formatDateTime(data.actualReturnDate) : "Pendente"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Ordem de Serviço */}
            {data.issueDescription && (
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-3">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wide">
                  <FileText className="w-4 h-4 text-primary" />
                  <span>Detalhes da Manutenção</span>
                </h3>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Problema Relatado</span>
                    <p className="text-foreground font-medium">{data.issueDescription}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Diagnóstico / Reparo</span>
                    <p className="text-foreground">{data.solution}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Rodapé de Integridade */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-muted-foreground border-t border-border/60">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Registro auditável e inalterável nos servidores institucionais.</span>
              </div>
              <span className="font-mono text-[10px]">
                Validação em tempo real: {new Date().toLocaleTimeString("pt-BR")}
              </span>
            </div>
          </Card>
        )}
      </main>

      {/* Rodapé */}
      <footer className="max-w-3xl w-full mx-auto py-6 border-t border-border/60 text-center text-xs text-muted-foreground space-y-1">
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
