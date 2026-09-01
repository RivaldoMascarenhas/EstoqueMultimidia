"use client";

import React from "react";
import Link from "next/link";
import { 
  Package, 
  Tag, 
  Boxes, 
  Handshake, 
  Wrench, 
  X, 
  MapPin, 
  ExternalLink, 
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatDate } from "@/lib/utils";

interface ScannerResultSheetProps {
  result: {
    entityType: "ASSET" | "BOX" | "ITEM" | "LOAN" | "MAINTENANCE" | "DOCUMENT_VALIDATION";
    data: any;
  } | null;
  onClose: () => void;
  onScanNext: () => void;
  onOpenLoanModal?: (asset: any) => void;
  onOpenReturnModal?: (loan: any) => void;
  onOpenMaintenanceModal?: (asset: any) => void;
}

export function ScannerResultSheet({
  result,
  onClose,
  onScanNext,
  onOpenLoanModal,
  onOpenReturnModal,
  onOpenMaintenanceModal,
}: ScannerResultSheetProps) {
  if (!result) return null;

  const { entityType, data } = result;

  return (
    <div className="rounded-3xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl p-5 space-y-4 animate-in slide-in-from-bottom-4 duration-300">
      
      {/* Header com tipo e botão de fechar */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          {entityType === "ASSET" && (
            <Badge variant="default" className="gap-1 bg-primary text-primary-foreground font-bold">
              <Tag className="w-3 h-3" />
              Equipamento Patrimonial
            </Badge>
          )}
          {entityType === "BOX" && (
            <Badge variant="default" className="gap-1 bg-blue-600 text-white font-bold">
              <Boxes className="w-3 h-3" />
              Caixa Física do Armário
            </Badge>
          )}
          {entityType === "ITEM" && (
            <Badge variant="default" className="gap-1 bg-emerald-600 text-white font-bold">
              <Package className="w-3 h-3" />
              Material de Estoque
            </Badge>
          )}
          {entityType === "LOAN" && (
            <Badge variant="default" className="gap-1 bg-purple-600 text-white font-bold">
              <Handshake className="w-3 h-3" />
              Termo de Cautela Autêntico
            </Badge>
          )}
          {entityType === "MAINTENANCE" && (
            <Badge variant="default" className="gap-1 bg-amber-600 text-white font-bold">
              <Wrench className="w-3 h-3" />
              Ordem de Serviço (OS) Autêntica
            </Badge>
          )}
          {entityType === "DOCUMENT_VALIDATION" && (
            <Badge variant="default" className="gap-1 bg-emerald-600 text-white font-bold">
              <ShieldCheck className="w-3 h-3" />
              Documento Oficial Autêntico
            </Badge>
          )}
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Conteúdo Dinâmico por Tipo */}

      {/* 1. PATRIMÔNIO */}
      {entityType === "ASSET" && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                  #{data.asset.assetTag}
                </span>
                <Badge variant={data.asset.status.toLowerCase() as any} className="text-[10px]">
                  {data.asset.status}
                </Badge>
              </div>
              <h3 className="text-base font-bold text-foreground">
                {data.asset.item?.name}
              </h3>
              <p className="text-xs text-muted-foreground">
                {data.asset.model || "Modelo Padrão"} {data.asset.serialNumber ? `• Nº Série: ${data.asset.serialNumber}` : ""}
              </p>
            </div>
          </div>

          {/* Localização Atual */}
          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <span className="text-muted-foreground">Localização no Armário:</span>
            </div>
            <strong className="text-foreground">
              {data.asset.currentBox ? `${data.asset.currentBox.door?.name || "Porta"} / ${data.asset.currentBox.name} (${data.asset.currentBox.code})` : "Sem caixa atribuída"}
            </strong>
          </div>

          {/* Se estiver emprestado */}
          {data.activeLoan && (
            <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-700 dark:text-purple-400">Empréstimo em Aberto</span>
                <span className="text-[10px] font-mono text-muted-foreground">Previsto: {formatDate(data.activeLoan.expectedReturnDate)}</span>
              </div>
              <p className="text-foreground font-semibold">Solicitante: {data.activeLoan.borrowerName}</p>
              <p className="text-[11px] text-muted-foreground">Destino: {data.activeLoan.destination}</p>
            </div>
          )}

          {/* Se estiver em manutenção */}
          {data.activeMaintenance && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-700 dark:text-amber-400">{data.activeMaintenance.orderNumber}</span>
                <Badge variant="maintenance" className="text-[9px]">{data.activeMaintenance.status}</Badge>
              </div>
              <p className="text-foreground font-medium">{data.activeMaintenance.issueDescription}</p>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {data.asset.status === "AVAILABLE" && (
              <Button
                asChild
                size="sm"
                className="rounded-xl text-xs h-9 bg-primary text-primary-foreground font-semibold gap-1.5 col-span-2 shadow-md shadow-primary/20"
              >
                <Link href={`/emprestimos?assetTag=${data.asset.assetTag}`}>
                  <Handshake className="w-4 h-4" />
                  <span>Realizar Empréstimo</span>
                </Link>
              </Button>
            )}

            {data.asset.status === "LOANED" && (
              <Button
                asChild
                size="sm"
                className="rounded-xl text-xs h-9 bg-purple-600 hover:bg-purple-700 text-white font-semibold gap-1.5 col-span-2 shadow-md shadow-purple-600/20"
              >
                <Link href={`/emprestimos?search=${data.asset.assetTag}`}>
                  <Handshake className="w-4 h-4" />
                  <span>Devolver Equipamento</span>
                </Link>
              </Button>
            )}

            {data.asset.status !== "IN_MAINTENANCE" && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="rounded-xl text-xs h-9 gap-1.5 shadow-xs"
              >
                <Link href={`/manutencao?assetTag=${data.asset.assetTag}`}>
                  <Wrench className="w-3.5 h-3.5 text-amber-500" />
                  <span>Abrir OS</span>
                </Link>
              </Button>
            )}

            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-xl text-xs h-9 gap-1.5 shadow-xs"
            >
              <Link href={`/patrimonio/${data.asset.id}`}>
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Ver Histórico</span>
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* 2. CAIXA DO ARMÁRIO */}
      {entityType === "BOX" && (
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-extrabold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-lg">
                {data.code}
              </span>
              <span className="text-xs text-muted-foreground font-semibold">
                {data.door?.name || "Porta Principal"}
              </span>
            </div>
            <h3 className="text-base font-bold text-foreground">
              {data.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              {data.description || "Caixa organizada no armário central de TI."}
            </p>
          </div>

          {/* Conteúdo Físico */}
          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 space-y-2 text-xs">
            <span className="font-bold text-foreground block uppercase text-[10px] tracking-wider text-muted-foreground">
              Conteúdo Armazenado:
            </span>
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {data.assets?.length === 0 && data.inventories?.length === 0 ? (
                <p className="text-muted-foreground italic text-[11px]">Caixa atualmente vazia.</p>
              ) : (
                <>
                  {data.assets?.map((asset: any) => (
                    <div key={asset.id} className="flex items-center justify-between text-[11px]">
                      <span className="text-foreground">#{asset.assetTag} - {asset.item?.name}</span>
                      <Badge variant={asset.status.toLowerCase() as any} className="text-[8px]">{asset.status}</Badge>
                    </div>
                  ))}
                  {data.inventories?.map((inv: any) => (
                    <div key={inv.id} className="flex items-center justify-between text-[11px]">
                      <span className="text-foreground">{inv.item?.name}</span>
                      <strong className="text-foreground font-mono">{inv.quantity} {inv.item?.unit || "UN"}</strong>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          <Button
            asChild
            size="sm"
            className="w-full rounded-xl text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shadow-md shadow-blue-600/20"
          >
            <Link href={`/caixas/${data.code}`}>
              <Boxes className="w-4 h-4" />
              <span>Abrir Caixa no Armário</span>
            </Link>
          </Button>
        </div>
      )}

      {/* 3. MATERIAL DE ESTOQUE */}
      {entityType === "ITEM" && (
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                SKU: {data.item.sku}
              </span>
              <span className="text-xs text-muted-foreground">
                {data.item.category?.name || "Material"}
              </span>
            </div>
            <h3 className="text-base font-bold text-foreground">
              {data.item.name}
            </h3>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">Saldo Atual em Estoque:</span>
            <span className="text-xl font-extrabold text-foreground font-mono">
              {data.totalStock} {data.item.unit || "UN"}
            </span>
          </div>

          <Button
            asChild
            size="sm"
            className="w-full rounded-xl text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-md shadow-emerald-600/20"
          >
            <Link href={`/estoque?search=${data.item.sku}`}>
              <Package className="w-4 h-4" />
              <span>Gerenciar Saldo / Saída</span>
            </Link>
          </Button>
        </div>
      )}

      {/* 4. EMPRÉSTIMO / TERMO DE CAUTELA */}
      {entityType === "LOAN" && (
        <div className="space-y-4">
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <span className="text-[11px] font-black uppercase text-emerald-700 dark:text-emerald-300 block">
                  Documento Oficial Autêntico
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Centro Universitário Paraíso • UniFAP
                </span>
              </div>
            </div>
            <Badge variant={data.status === "ACTIVE" ? "loaned" : "available"} className="text-[10px]">
              {data.status === "ACTIVE" ? "EM ANDAMENTO" : data.status === "RETURNED" ? "DEVOLVIDO" : data.status}
            </Badge>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-lg">
                LOAN-{data.id.slice(-8).toUpperCase()}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                Chave: {data.id.slice(0, 10)}
              </span>
            </div>
            <h3 className="text-base font-bold text-foreground">
              {data.borrowerName}
            </h3>
            <p className="text-xs text-muted-foreground">
              Local: {data.destination} {data.borrowerPhone ? `• Contato: ${data.borrowerPhone}` : ""}
            </p>
          </div>

          {data.asset && (
            <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 text-xs space-y-1">
              <span className="text-muted-foreground block text-[10px] uppercase font-bold">Equipamento Vinculado:</span>
              <strong className="text-foreground block">
                #{data.asset.assetTag} — {data.asset.item?.name}
              </strong>
              <span className="text-muted-foreground text-[11px] block">
                Prazo Previsto: {formatDateTime(data.expectedReturnDate)}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              asChild
              size="sm"
              className="w-full rounded-xl text-xs h-9 bg-purple-600 hover:bg-purple-700 text-white font-semibold gap-1.5 shadow-md shadow-purple-600/20"
            >
              <Link href={`/validar/${data.id}`} target="_blank">
                <ShieldCheck className="w-4 h-4" />
                <span>Ver Selo de Validação</span>
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full rounded-xl text-xs h-9 font-semibold gap-1.5"
            >
              <Link href={`/emprestimos?search=${data.borrowerName}`}>
                <Handshake className="w-4 h-4 text-purple-600" />
                <span>Painel de Empréstimos</span>
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* 5. ORDEM DE SERVIÇO */}
      {entityType === "MAINTENANCE" && (
        <div className="space-y-4">
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <span className="text-[11px] font-black uppercase text-emerald-700 dark:text-emerald-300 block">
                  Ordem de Serviço Oficial
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Suporte Técnico • TI Multimídia
                </span>
              </div>
            </div>
            <Badge variant="maintenance" className="text-[10px]">
              {data.status}
            </Badge>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg">
                {data.orderNumber}
              </span>
            </div>
            <h3 className="text-base font-bold text-foreground">
              {data.asset?.item?.name} (#{data.asset?.assetTag})
            </h3>
            <p className="text-xs text-muted-foreground">
              Problema: {data.issueDescription}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              asChild
              size="sm"
              className="w-full rounded-xl text-xs h-9 bg-amber-600 hover:bg-amber-700 text-white font-semibold gap-1.5 shadow-md shadow-amber-600/20"
            >
              <Link href={`/validar/${data.id}`} target="_blank">
                <ShieldCheck className="w-4 h-4" />
                <span>Ver Selo de Validação</span>
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full rounded-xl text-xs h-9 font-semibold gap-1.5"
            >
              <Link href={`/manutencao?search=${data.orderNumber}`}>
                <Wrench className="w-4 h-4 text-amber-600" />
                <span>Ver Manutenção</span>
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* 6. RELATÓRIO OFICIAL / VALIDAÇÃO INSTITUCIONAL */}
      {entityType === "DOCUMENT_VALIDATION" && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-300 block">
                {data.statusLabel}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {data.institution} • {data.sector}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
              {data.protocol}
            </span>
            <h3 className="text-base font-bold text-foreground">
              {data.documentTitle}
            </h3>
            <p className="text-xs text-muted-foreground">
              Código de Autenticação: <strong className="font-mono text-foreground">{data.authenticationCode}</strong>
            </p>
          </div>

          <Button
            asChild
            size="sm"
            className="w-full rounded-xl text-xs h-9 bg-primary text-primary-foreground font-semibold gap-1.5 shadow-md shadow-primary/20"
          >
            <Link href={`/validar/${encodeURIComponent(data.protocol)}`} target="_blank">
              <ExternalLink className="w-4 h-4" />
              <span>Abrir Certificado Completo</span>
            </Link>
          </Button>
        </div>
      )}

      {/* Botão Escanear Próximo */}
      <div className="pt-2 border-t border-border/60 flex items-center justify-between">
        <Button
          onClick={onScanNext}
          variant="outline"
          size="sm"
          className="w-full rounded-xl text-xs h-9 font-semibold gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5 text-primary" />
          <span>Escanear Próximo Código</span>
        </Button>
      </div>

    </div>
  );
}
