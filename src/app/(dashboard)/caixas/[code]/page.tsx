"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { 
  ArrowDownLeft, 
  Plus, 
  RefreshCw, 
  Printer, 
  Monitor, 
  ArrowLeft, 
  Loader2, 
  CheckCircle2,
  AlertTriangle,
  Trash2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { QrCodeDisplay } from "@/components/scanner/qr-code-display";
import { LabelPrinterModal } from "@/components/cabinet/label-printer";
import { StockExitModal } from "@/components/inventory/stock-exit-modal";
import { StockEntryModal } from "@/components/inventory/stock-entry-modal";
import { StockTransferModal } from "@/components/inventory/stock-transfer-modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { toast } from "sonner";

export default function BoxDetailsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = session?.user?.role || "OPERADOR";
  const isReadOnly = userRole === "CONSULTA";

  const params = useParams();
  const boxCode = (params?.code as string)?.toUpperCase();

  const [boxData, setBoxData] = useState<any | null>(null);
  const [allBoxes, setAllBoxes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modais de Operação
  const [selectedItemForExit, setSelectedItemForExit] = useState<any | null>(null);
  const [selectedItemForEntry, setSelectedItemForEntry] = useState<any | null>(null);
  const [selectedItemForTransfer, setSelectedItemForTransfer] = useState<any | null>(null);
  const [isPrinterOpen, setIsPrinterOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const fetchBoxData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [boxRes, allBoxesRes] = await Promise.all([
        fetch(`/api/v1/boxes/${boxCode}`),
        fetch(`/api/v1/boxes`),
      ]);

      const boxJson = await boxRes.json();
      const allBoxesJson = await allBoxesRes.json();

      if (!boxRes.ok || !boxJson.success) {
        setError(boxJson.error || `Caixa '${boxCode}' não encontrada.`);
        setIsLoading(false);
        return;
      }

      setBoxData(boxJson.data);
      if (allBoxesJson.success) {
        setAllBoxes(allBoxesJson.data);
      }
      setIsLoading(false);
    } catch (err: any) {
      setError("Erro ao carregar dados da caixa.");
      setIsLoading(false);
    }
  };

  const handleDeleteBox = async () => {
    try {
      const res = await fetch(`/api/v1/boxes/${boxData.code}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Erro ao excluir caixa.");
        return;
      }
      toast.success(`✓ Caixa '${boxData.code}' excluída com sucesso!`);
      router.push("/armario");
    } catch (err: any) {
      toast.error("Erro inesperado ao excluir caixa.");
    }
  };

  useEffect(() => {
    if (boxCode) {
      fetchBoxData();
    }
  }, [boxCode]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Carregando dados da Caixa {boxCode}...</p>
      </div>
    );
  }

  if (error || !boxData) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 text-center space-y-4 rounded-3xl border border-border bg-card shadow-sm">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-foreground">Caixa Não Encontrada</h2>
        <p className="text-xs text-muted-foreground">{error}</p>
        <Link href="/armario">
          <Button size="sm" variant="outline" className="gap-2 rounded-xl">
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Armário</span>
          </Button>
        </Link>
      </div>
    );
  }

  const qrUrl = typeof window !== "undefined" ? window.location.href : `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/caixas/${boxData.code}`;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/armario"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mr-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Armário</span>
            </Link>
            <span>/</span>
            <Badge variant="outline" className="font-mono font-bold text-xs bg-primary/10 text-primary border-primary/30">
              {boxData.door.name}
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <span>{boxData.name}</span>
            <span className="font-mono text-primary font-bold">({boxData.code})</span>
          </h1>
          {boxData.description && (
            <p className="text-xs text-muted-foreground max-w-2xl">
              {boxData.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsPrinterOpen(true)}
            size="sm"
            variant="outline"
            className="gap-1.5 rounded-xl shadow-sm"
          >
            <Printer className="w-4 h-4 text-primary" />
            <span>Imprimir Etiqueta</span>
          </Button>

          {!isReadOnly && (
            <Button
              onClick={() => setIsDeleteModalOpen(true)}
              size="sm"
              variant="outline"
              className="gap-1.5 rounded-xl border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/50 cursor-pointer shadow-sm"
              title="Excluir Caixa"
            >
              <Trash2 className="w-4 h-4" />
              <span>Excluir Caixa</span>
            </Button>
          )}
        </div>
      </div>

      {/* Grid: QR Code Card & Box Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Card do QR Code Físico */}
        <Card className="flex flex-col items-center justify-center p-6 text-center shadow-sm border-2 border-primary/20 bg-gradient-to-b from-primary/5 via-card to-card">
          <div className="mb-3">
            <Badge variant="normal" className="text-[10px] uppercase font-mono tracking-wider">
              {boxData.door.name} • {boxData.code}
            </Badge>
          </div>

          <QrCodeDisplay value={qrUrl} size={150} className="shadow-lg" />

          <p className="text-[11px] font-mono text-muted-foreground mt-3">
            {boxData.code} • {boxData.name}
          </p>

          <Button
            onClick={() => setIsPrinterOpen(true)}
            size="sm"
            variant="outline"
            className="mt-4 text-xs rounded-xl gap-1.5 w-full"
          >
            <Printer className="w-3.5 h-3.5 text-primary" />
            <span>Gerar Etiqueta Adesiva</span>
          </Button>
        </Card>

        {/* Resumo da Caixa e Totais */}
        <div className="md:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 bg-muted/20">
              <span className="text-xs font-semibold text-muted-foreground block">
                Itens / Peças Guardadas
              </span>
              <div className="text-2xl font-black text-foreground font-mono mt-1">
                {boxData.totalQuantity}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {boxData.inventories.length} tipo(s) de material
              </p>
            </Card>

            <Card className="p-4 bg-muted/20">
              <span className="text-xs font-semibold text-muted-foreground block">
                Equipamentos Patrimoniais
              </span>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-1">
                {boxData.assets.length}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Ativos rastreados
              </p>
            </Card>
          </div>

          {/* Banner de Ajuda Operacional */}
          <div className="p-4 rounded-2xl border border-border bg-card text-xs space-y-1">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Operação Rápida no Armário:
            </span>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Use os botões <strong>"Saída"</strong> para registrar a retirada de cabos/materiais pelo setor, <strong>"Entrada"</strong> para adicionar novas compras ou <strong>"Transferir"</strong> para mover itens para outra caixa.
            </p>
          </div>
        </div>
      </div>

      {/* Tabela de Itens Quantitativos Guardados nesta Caixa */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-foreground">
              Materiais Armazenados na Caixa
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Cabos, adaptadores e insumos disponíveis para retirada
            </CardDescription>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {boxData.inventories.length} item(ns)
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          {boxData.inventories.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Nenhum material a granel guardado nesta caixa no momento.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Material / Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Saldo na Caixa</TableHead>
                  <TableHead className="text-right">Ações Rápidas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {boxData.inventories.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono font-bold text-xs text-primary">
                      {inv.item.sku}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-xs text-foreground">
                          {inv.item.name}
                        </span>
                        {inv.item.description && (
                          <span className="text-[10px] text-muted-foreground line-clamp-1">
                            {inv.item.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {inv.item.category?.name || "Geral"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        {inv.quantity} {inv.item.unit}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {isReadOnly ? (
                        <Badge variant="available" className="text-[10px]">
                          Disponível na Caixa
                        </Badge>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {/* BOTÃO SAÍDA */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setSelectedItemForExit({
                                item: inv.item,
                                box: {
                                  id: boxData.id,
                                  code: boxData.code,
                                  name: boxData.name,
                                  doorName: boxData.door.name,
                                  currentQuantity: inv.quantity,
                                },
                              })
                            }
                            disabled={inv.quantity <= 0}
                            className="h-8 px-3 text-xs font-semibold rounded-xl gap-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:border-rose-500/50 disabled:opacity-40 shadow-xs"
                          >
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            <span>Saída</span>
                          </Button>

                          {/* BOTÃO ENTRADA */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setSelectedItemForEntry({
                                item: inv.item,
                                box: {
                                  id: boxData.id,
                                  code: boxData.code,
                                  name: boxData.name,
                                  currentQuantity: inv.quantity,
                                },
                              })
                            }
                            className="h-8 px-3 text-xs font-semibold rounded-xl gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/50 shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Entrada</span>
                          </Button>

                          {/* BOTÃO TRANSFERIR */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setSelectedItemForTransfer({
                                item: inv.item,
                                sourceBox: {
                                  id: boxData.id,
                                  code: boxData.code,
                                  name: boxData.name,
                                  currentQuantity: inv.quantity,
                                },
                              })
                            }
                            disabled={inv.quantity <= 0}
                            className="h-8 px-3 text-xs font-semibold rounded-xl gap-1.5 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 hover:border-indigo-500/50 disabled:opacity-40 shadow-xs"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Transferir</span>
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Tabela de Ativos / Equipamentos Guardados nesta Caixa */}
      {boxData.assets.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Monitor className="w-4 h-4 text-indigo-500" />
              Equipamentos Patrimoniais nesta Caixa
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Ativos físicos guardados e prontos para empréstimo
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patrimônio</TableHead>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Número de Série</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {boxData.assets.map((ast: any) => (
                  <TableRow key={ast.id}>
                    <TableCell className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                      #{ast.assetTag}
                    </TableCell>
                    <TableCell className="font-semibold text-xs text-foreground">
                      {ast.item.name} {ast.model && `(${ast.model})`}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {ast.serialNumber || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="available" className="text-[10px]">
                        Disponível
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/emprestimos?assetId=${ast.id}`}>
                        <Button size="sm" variant="outline" className="h-8 text-xs rounded-xl gap-1">
                          <span>Emprestar</span>
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Modais de Ação */}
      {selectedItemForExit && (
        <StockExitModal
          isOpen={!!selectedItemForExit}
          onClose={() => setSelectedItemForExit(null)}
          item={selectedItemForExit.item}
          box={selectedItemForExit.box}
          onSuccess={fetchBoxData}
        />
      )}

      {selectedItemForEntry && (
        <StockEntryModal
          isOpen={!!selectedItemForEntry}
          onClose={() => setSelectedItemForEntry(null)}
          item={selectedItemForEntry.item}
          box={selectedItemForEntry.box}
          onSuccess={fetchBoxData}
        />
      )}

      {selectedItemForTransfer && (
        <StockTransferModal
          isOpen={!!selectedItemForTransfer}
          onClose={() => setSelectedItemForTransfer(null)}
          item={selectedItemForTransfer.item}
          sourceBox={selectedItemForTransfer.sourceBox}
          allBoxes={allBoxes}
          onSuccess={fetchBoxData}
        />
      )}

      <LabelPrinterModal
        isOpen={isPrinterOpen}
        onClose={() => setIsPrinterOpen(false)}
        boxes={[
          {
            id: boxData.id,
            code: boxData.code,
            name: boxData.name,
            doorName: boxData.door.name,
            description: boxData.description,
          },
        ]}
        selectedBoxCode={boxData.code}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteBox}
        title="Excluir Caixa do Armário"
        description="Tem certeza que deseja excluir esta caixa? Apenas caixas completamente vazias (sem materiais em estoque e sem patrimônios) podem ser excluídas."
        itemName={`${boxData.code} - ${boxData.name}`}
        confirmText="Sim, Excluir Caixa"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
}
