"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Printer, 
  Wrench, 
  Handshake, 
  History, 
  Archive, 
  ShieldCheck, 
  AlertTriangle, 
  Loader2, 
  Clock, 
  ExternalLink, 
  MapPin, 
  User, 
  Calendar, 
  Phone, 
  Info
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCodeDisplay } from "@/components/scanner/qr-code-display";
import { AssetStatusModal } from "@/components/assets/asset-status-modal";
import { AssetLabelPrinter } from "@/components/assets/asset-label-printer";
import { formatDate, formatDateTime } from "@/lib/utils";

export default function AssetDetailsPage() {
  const params = useParams();
  const assetId = params?.id as string;

  const [asset, setAsset] = useState<any | null>(null);
  const [allBoxes, setAllBoxes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modais
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isPrinterOpen, setIsPrinterOpen] = useState(false);

  const fetchAssetData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [assetRes, boxesRes] = await Promise.all([
        fetch(`/api/v1/assets/${assetId}`),
        fetch(`/api/v1/boxes`),
      ]);

      const assetJson = await assetRes.json();
      const boxesJson = await boxesRes.json();

      if (!assetRes.ok || !assetJson.success) {
        setError(assetJson.error || "Equipamento não encontrado.");
        setIsLoading(false);
        return;
      }

      setAsset(assetJson.data);
      if (boxesJson.success) setAllBoxes(boxesJson.data);
      setIsLoading(false);
    } catch (err: any) {
      setError("Erro ao carregar dados do equipamento.");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (assetId) {
      fetchAssetData();
    }
  }, [assetId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Carregando detalhes do patrimônio...</p>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 text-center space-y-4 rounded-3xl border border-border bg-card shadow-sm">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-foreground">Equipamento Não Encontrado</h2>
        <p className="text-xs text-muted-foreground">{error}</p>
        <Link href="/patrimonio">
          <Button size="sm" variant="outline" className="gap-2 rounded-xl">
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Patrimônio</span>
          </Button>
        </Link>
      </div>
    );
  }

  const qrUrl = typeof window !== "undefined" ? window.location.href : `http://localhost:3000/patrimonio/${asset.id}`;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return <Badge variant="available" dot className="text-xs font-semibold">Disponível no Armário</Badge>;
      case "IN_USE":
        return <Badge variant="in_use" dot className="text-xs font-semibold">Em Uso (Fixo na Sala)</Badge>;
      case "LOANED":
        return <Badge variant="loaned" dot className="text-xs font-semibold">Emprestado</Badge>;
      case "IN_MAINTENANCE":
        return <Badge variant="maintenance" dot className="text-xs font-semibold">Em Manutenção</Badge>;
      case "DAMAGED":
        return <Badge variant="damaged" dot className="text-xs font-semibold">Danificado</Badge>;
      case "WRITTEN_OFF":
        return <Badge variant="secondary" className="text-xs font-semibold">Baixado</Badge>;
      case "LOST":
        return <Badge variant="destructive" className="text-xs font-semibold">Perdido</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const historyList = asset.history || [];
  const loansList = asset.loans || [];
  const activeLoan = loansList.find((l: any) => l.status === "ACTIVE" || l.status === "OVERDUE") || null;
  const activeRes = asset.reservations && asset.reservations.length > 0 ? asset.reservations[0] : null;

  const now = new Date();
  const isCurrentlyInClass =
    activeRes &&
    new Date(activeRes.startTime).getTime() <= now.getTime() + 15 * 60 * 1000 &&
    new Date(activeRes.endTime).getTime() >= now.getTime();

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/patrimonio"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mr-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Patrimônio</span>
            </Link>
            <span>/</span>
            <Badge variant="outline" className="font-mono text-xs">
              {asset.item?.category?.name || "Equipamento"}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground font-mono">
              #{asset.assetTag}
            </h1>
            <span className="text-xl sm:text-2xl font-bold text-muted-foreground">
              {asset.item?.name}
            </span>
            {isCurrentlyInClass ? (
              <Badge variant="in_use" dot className="text-xs font-semibold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30">
                Em Atendimento (Sala {activeRes.request?.room?.name})
              </Badge>
            ) : (
              getStatusBadge(asset.status)
            )}
          </div>

          {asset.model && (
            <p className="text-xs text-muted-foreground">
              Modelo: <strong>{asset.model}</strong> {asset.serialNumber && `• Serial: ${asset.serialNumber}`}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {asset.status === "AVAILABLE" && !isCurrentlyInClass && (
            <Link href={`/emprestimos?assetId=${asset.id}`}>
              <Button
                size="sm"
                className="gap-1.5 rounded-xl shadow-md shadow-primary/20 bg-gradient-to-r from-primary-600 to-indigo-600 text-white cursor-pointer"
              >
                <Handshake className="w-4 h-4" />
                <span>Novo Empréstimo</span>
              </Button>
            </Link>
          )}

          {isCurrentlyInClass && activeRes.request && (
            <Link href={`/agenda?requestId=${activeRes.request.id}`}>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 rounded-xl text-indigo-600 dark:text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10 cursor-pointer font-bold"
              >
                <MapPin className="w-4 h-4" />
                <span>Ver Solicitação na Agenda</span>
              </Button>
            </Link>
          )}

          {asset.status === "LOANED" && activeLoan && (
            <Link href={`/emprestimos?search=${asset.assetTag}`}>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 rounded-xl text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/10 cursor-pointer font-bold"
              >
                <Handshake className="w-4 h-4" />
                <span>Ver Empréstimo</span>
              </Button>
            </Link>
          )}

          <Button
            onClick={() => setIsStatusModalOpen(true)}
            size="sm"
            variant="outline"
            className="gap-1.5 rounded-xl cursor-pointer"
          >
            <Wrench className="w-4 h-4 text-amber-500" />
            <span>Alterar Status</span>
          </Button>

          <Button
            onClick={() => setIsPrinterOpen(true)}
            size="sm"
            variant="outline"
            className="gap-1.5 rounded-xl cursor-pointer"
          >
            <Printer className="w-4 h-4 text-primary" />
            <span>Etiqueta</span>
          </Button>
        </div>
      </div>

      {/* BANNER 0: Em Atendimento / Aula Agora na Agenda */}
      {isCurrentlyInClass && activeRes.request && (
        <Card className="rounded-3xl border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 via-card to-card shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b border-indigo-500/15 bg-indigo-500/5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">
                    Equipamento em Atendimento na Sala {activeRes.request.room?.name || ""}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Alocado e em uso pela equipe de Multimídia para aula/evento
                  </CardDescription>
                </div>
              </div>
              <Badge variant="in_use" className="text-[11px] font-bold">
                Em Andamento Agora
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
                <span className="text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500" /> Sala de Aula:
                </span>
                <p className="font-bold text-foreground text-sm">
                  Sala {activeRes.request.room?.name} {activeRes.request.room?.floor && `(${activeRes.request.room.floor})`}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
                <span className="text-muted-foreground flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-indigo-500" /> Docente / Solicitante:
                </span>
                <p className="font-bold text-foreground text-sm">
                  {activeRes.request.professorName || "Não informado"}
                </p>
                {activeRes.request.discipline && (
                  <p className="text-[11px] text-muted-foreground">{activeRes.request.discipline}</p>
                )}
              </div>

              <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" /> Horário da Aula:
                </span>
                <p className="font-bold text-foreground font-mono">
                  {new Date(activeRes.startTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} às {new Date(activeRes.endTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                  Status: {activeRes.request.status}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 flex flex-col justify-between">
                <span className="text-muted-foreground text-[10px]">Ação Rápida:</span>
                <Link href={`/agenda?requestId=${activeRes.request.id}`}>
                  <Button size="sm" variant="outline" className="w-full text-xs rounded-xl gap-1 text-indigo-600 dark:text-indigo-400 font-bold">
                    <span>Abrir na Agenda</span>
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* BANNER 1: Detalhes do Empréstimo Ativo (Onde e com quem está) */}
      {asset.status === "LOANED" && (
        <Card className="rounded-3xl border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-card to-card shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b border-blue-500/15 bg-blue-500/5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Handshake className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">
                    Equipamento Atualmente Emprestado
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Informações de posse e destino deste patrimônio
                  </CardDescription>
                </div>
              </div>

              {activeLoan && (
                <Badge variant={activeLoan.status === "OVERDUE" ? "destructive" : "loaned"} className="text-[11px] font-bold">
                  {activeLoan.status === "OVERDUE" ? "⚠️ Empréstimo em Atraso" : "Empréstimo em Andamento"}
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            {activeLoan ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-500" /> Destino / Local:
                  </span>
                  <p className="font-bold text-foreground text-sm">
                    {activeLoan.destination || "Não especificado"}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-blue-500" /> Responsável / Solicitante:
                  </span>
                  <p className="font-bold text-foreground text-sm">
                    {activeLoan.borrowerName}
                  </p>
                  {activeLoan.borrowerEmail && (
                    <p className="text-[11px] text-muted-foreground">{activeLoan.borrowerEmail}</p>
                  )}
                </div>

                <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-500" /> Data do Empréstimo:
                  </span>
                  <p className="font-medium text-foreground">
                    {formatDateTime(activeLoan.loanDate)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Por: {activeLoan.createdByUser?.name || "Operador"}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" /> Previsão de Devolução:
                  </span>
                  <p className="font-bold text-foreground font-mono">
                    {formatDate(activeLoan.expectedReturnDate)}
                  </p>
                  {activeLoan.borrowerPhone && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" /> {activeLoan.borrowerPhone}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                  <Info className="w-4 h-4 text-amber-600" />
                  <span>Empréstimo sem registro formal de Ordem no sistema</span>
                </div>
                <p className="text-muted-foreground">
                  Este equipamento foi marcado com status <strong>Emprestado</strong> no cadastro manual/legado.
                  {asset.notes && (
                    <span className="block mt-1 text-foreground">
                      Observação / Destino registrado: <strong>"{asset.notes}"</strong>
                    </span>
                  )}
                </p>
                <div className="pt-2 flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsStatusModalOpen(true)}
                    className="rounded-xl text-xs bg-card hover:bg-muted font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/40"
                  >
                    <Archive className="w-3.5 h-3.5 mr-1" />
                    <span>Guardar no Armário (Devolver)</span>
                  </Button>

                  <Link href={`/emprestimos?assetId=${asset.id}`}>
                    <Button size="sm" className="rounded-xl text-xs bg-primary text-primary-foreground font-bold">
                      <Handshake className="w-3.5 h-3.5 mr-1" />
                      <span>Formalizar Registro de Empréstimo</span>
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {activeLoan?.notes && (
              <div className="p-3 rounded-xl bg-card border border-border/80 text-xs">
                <span className="font-semibold text-foreground">Observações do Empréstimo:</span>
                <p className="text-muted-foreground mt-0.5">{activeLoan.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Grid: QR Code & Detalhes Técnicos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Card do QR Code do Ativo */}
        <Card className="flex flex-col items-center justify-center p-6 text-center shadow-sm border-2 border-indigo-500/20 bg-gradient-to-b from-indigo-500/5 via-card to-card">
          <div className="mb-3">
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-mono">
              UniFAP • Tombamento
            </span>
          </div>

          <QrCodeDisplay value={qrUrl} size={150} className="shadow-lg" />

          <h3 className="text-lg font-black font-mono text-foreground mt-3">
            #{asset.assetTag}
          </h3>
          <p className="text-xs text-muted-foreground">
            {asset.item?.name}
          </p>

          <Button
            onClick={() => setIsPrinterOpen(true)}
            size="sm"
            variant="outline"
            className="mt-4 text-xs rounded-xl gap-1.5 w-full cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-primary" />
            <span>Imprimir Etiqueta Adesiva</span>
          </Button>
        </Card>

        {/* Informações Físicas & Financeiras */}
        <div className="md:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Localização Física */}
            <Card className="p-4 bg-muted/20 space-y-2">
              <div className="flex items-center gap-2 text-primary font-semibold text-xs">
                <Archive className="w-4 h-4" />
                <span>Localização Física Atual</span>
              </div>
              {asset.status === "LOANED" ? (
                <div>
                  <p className="text-base font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span>{activeLoan?.destination || asset.notes || "Emprestado (Fora do armário)"}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Em posse de <strong>{activeLoan?.borrowerName || "Uso Externo"}</strong>
                  </p>
                </div>
              ) : asset.currentRoom ? (
                <div>
                  <Link
                    href={`/salas`}
                    className="text-base font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                  >
                    <span>Sala {asset.currentRoom.name}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Instalado como equipamento fixo {asset.currentRoom.floor ? `(${asset.currentRoom.floor})` : ""}
                  </p>
                </div>
              ) : asset.currentBox ? (
                <div>
                  <Link
                    href={`/caixas/${asset.currentBox.code}`}
                    className="text-base font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                  >
                    <span>{asset.currentBox.name} ({asset.currentBox.code})</span>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Alocado na <strong>{asset.currentBox.door?.name || "Porta"}</strong>
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Equipamento sem caixa ou sala atribuída.
                </p>
              )}
            </Card>

            {/* Número de Série & Tombamento */}
            <Card className="p-4 bg-muted/20 space-y-2">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>Identificação & Tombamento</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-xs text-muted-foreground block">
                  Patrimônio: <strong className="text-foreground font-mono">#{asset.assetTag}</strong>
                </span>
                <span className="text-xs text-muted-foreground block">
                  Serial: <strong className="text-foreground font-mono">{asset.serialNumber || "N/A"}</strong>
                </span>
              </div>
            </Card>
          </div>

          {/* Dados de Aquisição & Observações */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between text-xs border-b border-border/60 pb-2 flex-wrap gap-2">
              <span className="text-muted-foreground">
                Data de Aquisição: <strong className="text-foreground">{asset.acquisitionDate ? formatDate(asset.acquisitionDate) : "Não informada"}</strong>
              </span>
              <span className="text-muted-foreground">
                Valor de Aquisição: <strong className="text-foreground font-mono">{asset.acquisitionValue ? `R$ ${Number(asset.acquisitionValue).toFixed(2)}` : "-"}</strong>
              </span>
            </div>

            {asset.notes && (
              <div className="text-xs space-y-1">
                <span className="font-semibold text-foreground">Observações Técnicas / Acessórios:</span>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  {asset.notes}
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Linha do Tempo Auditável de Histórico (AssetHistory) */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                <span>Linha do Tempo & Histórico Auditável</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Registro inalterável de todos os eventos, empréstimos, manutenções e alterações do equipamento.
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {historyList.length} evento(s)
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {historyList.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Nenhum evento registrado no histórico até o momento.
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
              {historyList.map((hist: any) => (
                <div key={hist.id} className="relative group">
                  {/* Ponto da Linha do Tempo */}
                  <div className="absolute -left-[27px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-primary ring-4 ring-primary/10 group-hover:scale-125 transition-transform" />

                  <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/70 space-y-1.5 hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="font-bold text-xs text-foreground uppercase tracking-wide">
                        {hist.action || "EVENTO"}
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(hist.createdAt)}
                      </span>
                    </div>

                    {hist.details && typeof hist.details === "object" ? (
                      <div className="text-xs text-muted-foreground space-y-1 pt-1">
                        {Object.entries(hist.details).map(([key, val]) => (
                          <div key={key} className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-foreground/70">{key}:</span>
                            <span className="font-semibold text-foreground text-[11px]">
                              {typeof val === "object" ? JSON.stringify(val) : String(val)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">{String(hist.details || "Sem detalhes adicionais")}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modais de Status e Etiqueta */}
      {isStatusModalOpen && (
        <AssetStatusModal
          isOpen={isStatusModalOpen}
          asset={{
            id: asset.id,
            assetTag: asset.assetTag,
            itemName: asset.item?.name || "Equipamento",
            currentStatus: asset.status,
            currentBoxId: asset.currentBoxId,
          }}
          boxes={allBoxes}
          onClose={() => setIsStatusModalOpen(false)}
          onSuccess={() => {
            setIsStatusModalOpen(false);
            fetchAssetData();
          }}
        />
      )}

      {isPrinterOpen && (
        <AssetLabelPrinter
          isOpen={isPrinterOpen}
          assets={[asset]}
          onClose={() => setIsPrinterOpen(false)}
        />
      )}
    </div>
  );
}
