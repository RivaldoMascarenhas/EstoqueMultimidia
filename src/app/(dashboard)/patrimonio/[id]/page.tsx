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
  ExternalLink
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
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
            {getStatusBadge(asset.status)}
          </div>

          {asset.model && (
            <p className="text-xs text-muted-foreground">
              Modelo: <strong>{asset.model}</strong> {asset.serialNumber && `• Serial: ${asset.serialNumber}`}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {asset.status === "AVAILABLE" && (
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
              {asset.currentRoom ? (
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

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {hist.observation || (hist.toStatus ? `Status alterado para ${hist.toStatus}` : "Ação registrada")}
                    </p>
                    {hist.userName && (
                      <span className="text-[10px] text-muted-foreground/70 block">
                        Por: {hist.userName}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico Recente de Empréstimos */}
      {loansList.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Handshake className="w-4 h-4 text-blue-500" />
              <span>Histórico de Empréstimos Deste Equipamento</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Solicitante / Setor</TableHead>
                  <TableHead>Data Empréstimo</TableHead>
                  <TableHead>Devolução Prevista</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loansList.map((loan: any) => (
                  <TableRow key={loan.id}>
                    <TableCell className="font-mono font-bold text-xs text-primary">
                      #EMP-{loan.id.slice(0, 8).toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-xs text-foreground">
                          {loan.borrowerName}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {loan.borrowerDepartment || loan.destination}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {formatDateTime(loan.loanDate)}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {formatDateTime(loan.expectedReturnDate)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={loan.status === "ACTIVE" ? "loaned" : "available"}
                        dot
                        className="text-[10px]"
                      >
                        {loan.status === "ACTIVE" ? "Ativo" : "Devolvido"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Modais */}
      {isStatusModalOpen && (
        <AssetStatusModal
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          asset={{
            id: asset.id,
            assetTag: asset.assetTag,
            itemName: asset.item.name,
            currentStatus: asset.status,
            currentBoxId: asset.currentBoxId,
          }}
          boxes={allBoxes}
          onSuccess={fetchAssetData}
        />
      )}

      <AssetLabelPrinter
        isOpen={isPrinterOpen}
        onClose={() => setIsPrinterOpen(false)}
        assets={[
          {
            id: asset.id,
            assetTag: asset.assetTag,
            itemName: asset.item.name,
            serialNumber: asset.serialNumber,
            model: asset.model,
            boxCode: asset.currentBox?.code,
          },
        ]}
        selectedTag={asset.assetTag}
      />
    </div>
  );
}
