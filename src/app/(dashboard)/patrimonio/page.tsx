"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { 
  Monitor, 
  Plus, 
  Search, 
  Wrench, 
  Printer, 
  Loader2, 
  Handshake, 
  ChevronRight, 
  MapPin
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { AssetFormModal } from "@/components/assets/asset-form-modal";
import { AssetStatusModal } from "@/components/assets/asset-status-modal";
import { AssetLabelPrinter } from "@/components/assets/asset-label-printer";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function PatrimonioPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role || "OPERADOR";
  const isReadOnly = userRole === "CONSULTA";

  const [assets, setAssets] = useState<any[]>([]);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [allBoxes, setAllBoxes] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({
    total: 0,
    available: 0,
    loaned: 0,
    maintenance: 0,
    damaged: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [boxFilter, setBoxFilter] = useState("ALL");

  // Modais
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPrinterOpen, setIsPrinterOpen] = useState(false);
  const [selectedAssetForStatus, setSelectedAssetForStatus] = useState<any | null>(null);
  const [selectedAssetForLabel, setSelectedAssetForLabel] = useState<string | undefined>(undefined);

  const fetchData = async (isInitial: boolean | unknown = false) => {
    try {
      if (isInitial === true) setIsLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (boxFilter !== "ALL") params.append("boxId", boxFilter);

      const [assetsRes, itemsRes, catRes, boxesRes, metricsRes] = await Promise.all([
        fetch(`/api/v1/assets?${params.toString()}`),
        fetch(`/api/v1/items`),
        fetch(`/api/v1/categories`),
        fetch(`/api/v1/boxes`),
        fetch(`/api/v1/assets/metrics`),
      ]);

      const assetsJson = await assetsRes.json();
      const itemsJson = await itemsRes.json();
      const catJson = await catRes.json();
      const boxesJson = await boxesRes.json();
      const metricsJson = await metricsRes.json();

      if (assetsJson.success) setAssets(assetsJson.data);
      if (itemsJson.success) setCatalogItems(itemsJson.data);
      if (catJson.success) setCategories(catJson.data);
      if (boxesJson.success) setAllBoxes(boxesJson.data);
      if (metricsJson.success) setMetrics(metricsJson.data);
    } catch (err: any) {
      if (isInitial === true) toast.error("Erro ao carregar equipamentos patrimoniais.");
    } finally {
      if (isInitial === true) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, [statusFilter, boxFilter]);

  // Sincronização automática em segundo plano a cada 10s
  useAutoRefresh(() => fetchData(false), {
    intervalMs: 10000,
    enabled: !isFormOpen && !isPrinterOpen && !selectedAssetForStatus && !selectedAssetForLabel,
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return <Badge variant="available" dot className="text-[10px]">Disponível</Badge>;
      case "LOANED":
        return <Badge variant="loaned" dot className="text-[10px]">Emprestado</Badge>;
      case "MAINTENANCE":
        return <Badge variant="maintenance" dot className="text-[10px]">Em Manutenção</Badge>;
      case "DAMAGED":
        return <Badge variant="damaged" dot className="text-[10px]">Danificado</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">Baixado</Badge>;
    }
  };

  const assetsForLabels = assets.map((a) => ({
    id: a.id,
    assetTag: a.assetTag,
    itemName: a.item.name,
    serialNumber: a.serialNumber,
    model: a.model,
    boxCode: a.currentBox?.code,
  }));

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Monitor className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
              <span>Patrimônio & Equipamentos</span>
            </h1>
            <Badge variant="normal" className="text-[11px] font-semibold px-2 py-0.5">
              {metrics.total} Ativos
            </Badge>
            {isReadOnly && (
              <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30">
                Modo Consulta
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Controle unitário com tombamento, número de série, localização no armário e histórico individual.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {!isReadOnly && (
            <Button
              onClick={() => setIsFormOpen(true)}
              size="sm"
              className="flex-1 sm:flex-none gap-1.5 rounded-xl shadow-md shadow-primary/20 bg-gradient-to-r from-primary-600 to-indigo-600 text-white h-10 sm:h-9 text-xs font-semibold justify-center"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Equipamento</span>
            </Button>
          )}

          <Button
            onClick={() => {
              setSelectedAssetForLabel("ALL");
              setIsPrinterOpen(true);
            }}
            size="sm"
            variant="outline"
            className="gap-1.5 rounded-xl h-10 sm:h-9 text-xs font-semibold"
            title="Imprimir etiquetas com QR Code"
          >
            <Printer className="w-4 h-4 text-primary" />
            <span>Etiquetas</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
        <Card className="p-3.5 sm:p-4 rounded-2xl border-border/80 shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground">Total de Ativos</span>
          <div className="text-xl font-bold font-mono text-foreground mt-0.5">
            {metrics.total}
          </div>
        </Card>

        <Card className="p-3.5 sm:p-4 rounded-2xl border-emerald-500/30 bg-emerald-500/5 shadow-xs">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Disponíveis</span>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
            {metrics.available}
          </div>
        </Card>

        <Card className="p-3.5 sm:p-4 rounded-2xl border-blue-500/30 bg-blue-500/5 shadow-xs">
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Emprestados</span>
          <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">
            {metrics.loaned}
          </div>
        </Card>

        <Card className="p-3.5 sm:p-4 rounded-2xl border-amber-500/30 bg-amber-500/5 shadow-xs">
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Em Manutenção</span>
          <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
            {metrics.maintenance}
          </div>
        </Card>

        <Card className="p-3.5 sm:p-4 rounded-2xl border-rose-500/30 bg-rose-500/5 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">Com Avaria</span>
          <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
            {metrics.damaged}
          </div>
        </Card>
      </div>

      {/* Barra de Filtros e Busca */}
      <Card className="p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex gap-2">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por Nº de Patrimônio (PAT-...), Nº de Série ou Modelo..."
              icon={<Search className="w-4 h-4 text-primary" />}
              className="text-xs"
            />
            <Button type="submit" size="sm" variant="outline" className="rounded-xl shrink-0">
              Buscar
            </Button>
          </form>

          {/* Filtro por Status */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-background border border-input rounded-xl text-foreground font-medium outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto"
            >
              <option value="ALL">Todos os Status</option>
              <option value="AVAILABLE">🟢 Disponíveis</option>
              <option value="LOANED">🔵 Emprestados</option>
              <option value="MAINTENANCE">🟡 Em Manutenção</option>
              <option value="DAMAGED">🔴 Danificados</option>
              <option value="RETIRED">⚪ Baixados</option>
            </select>

            {/* Filtro por Caixa */}
            <select
              value={boxFilter}
              onChange={(e) => setBoxFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-background border border-input rounded-xl text-foreground font-medium outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto"
            >
              <option value="ALL">Todas as Caixas</option>
              {allBoxes.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} - {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Tabela de Equipamentos */}
      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-16 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Consultando acervo de patrimônio...</p>
            </div>
          ) : assets.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Monitor className="w-10 h-10 text-muted-foreground mx-auto" />
              <h3 className="text-sm font-semibold text-foreground">Nenhum equipamento encontrado</h3>
              <p className="text-xs text-muted-foreground">Tente alterar os termos de busca ou cadastre um novo ativo.</p>
              <Button size="sm" onClick={() => setIsFormOpen(true)} className="rounded-xl">
                + Cadastrar Equipamento
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tombamento / Tag</TableHead>
                  <TableHead>Equipamento / Modelo</TableHead>
                  <TableHead>Número de Série</TableHead>
                  <TableHead>Localização / Onde Está</TableHead>
                  <TableHead>Status Atual</TableHead>
                  <TableHead className="text-center w-[180px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => {
                  const activeLoan = asset.loans && asset.loans.length > 0 ? asset.loans[0] : null;
                  const activeRes = asset.reservations && asset.reservations.length > 0 ? asset.reservations[0] : null;

                  const now = new Date();
                  const isCurrentlyInClass =
                    activeRes &&
                    new Date(activeRes.startTime).getTime() <= now.getTime() + 15 * 60 * 1000 &&
                    new Date(activeRes.endTime).getTime() >= now.getTime();

                  const isUpcomingToday = activeRes && !isCurrentlyInClass;

                  return (
                    <TableRow key={asset.id} className={isCurrentlyInClass ? "bg-primary/5" : undefined}>
                      {/* Tombamento */}
                      <TableCell>
                        <Link
                          href={`/patrimonio/${asset.id}`}
                          className="font-mono font-bold text-xs text-primary hover:underline"
                        >
                          #{asset.assetTag}
                        </Link>
                      </TableCell>

                      {/* Equipamento */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-xs text-foreground">
                            {asset.item.name}
                          </span>
                          {asset.model && (
                            <span className="text-[10px] text-muted-foreground">
                              {asset.model}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Serial */}
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {asset.serialNumber || "-"}
                      </TableCell>

                      {/* Localização / Onde Está */}
                      <TableCell>
                        {isCurrentlyInClass ? (
                          <div className="flex flex-col gap-0.5 max-w-[220px]">
                            <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              <span>Sala {activeRes.request?.room?.name || "em aula"}</span>
                            </div>
                            <span className="text-[11px] text-muted-foreground truncate">
                              Prof. {activeRes.request?.professorName || "Atendimento"}
                            </span>
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                              Em aula até {new Date(activeRes.endTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        ) : asset.status === "LOANED" ? (
                          activeLoan ? (
                            <div className="flex flex-col gap-0.5 max-w-[220px]">
                              <div className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400">
                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{activeLoan.destination || "Destino não informado"}</span>
                              </div>
                              <span className="text-[11px] text-muted-foreground truncate">
                                Com: <strong className="text-foreground">{activeLoan.borrowerName}</strong>
                              </span>
                              {activeLoan.expectedReturnDate && (
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  Prev: {formatDate(activeLoan.expectedReturnDate)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-0.5 max-w-[220px]">
                              <div className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400">
                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{asset.notes || "Emprestado (fora do armário)"}</span>
                              </div>
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                ⚠️ Sem registro formal de empréstimo
                              </span>
                            </div>
                          )
                        ) : asset.status === "IN_USE" ? (
                          asset.currentRoom ? (
                            <Link
                              href="/salas"
                              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              <span>Fixo na Sala {asset.currentRoom.name}</span>
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground">Em uso em sala</span>
                          )
                        ) : asset.status === "IN_MAINTENANCE" ? (
                          <div className="flex flex-col gap-0.5 max-w-[200px]">
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <Wrench className="w-3.5 h-3.5" />
                              Bancada / Manutenção
                            </span>
                            {asset.maintenances?.[0]?.issueDescription && (
                              <span className="text-[10px] text-muted-foreground truncate">
                                {asset.maintenances[0].issueDescription}
                              </span>
                            )}
                          </div>
                        ) : asset.currentBox ? (
                          <div className="space-y-0.5">
                            <Link
                              href={`/caixas/${asset.currentBox.code}`}
                              className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-muted hover:bg-primary/15 hover:text-primary transition-colors border border-border/60"
                            >
                              <span>{asset.currentBox.code}</span>
                              <span className="text-muted-foreground font-normal">({asset.currentBox.door?.name})</span>
                            </Link>
                            {isUpcomingToday && (
                              <span className="text-[10px] text-primary block font-medium">
                                Agendado hoje às {new Date(activeRes.startTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">
                            Fora do armário (Disponível)
                          </span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {isCurrentlyInClass ? (
                          <Badge variant="in_use" dot className="text-xs font-semibold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30">
                            Em Atendimento
                          </Badge>
                        ) : isUpcomingToday ? (
                          <div className="space-y-0.5">
                            {getStatusBadge(asset.status)}
                            <Badge variant="outline" className="text-[9px] font-mono block">
                              Reserva {new Date(activeRes.startTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </Badge>
                          </div>
                        ) : (
                          getStatusBadge(asset.status)
                        )}
                      </TableCell>

                      {/* Ações */}
                      <TableCell className="text-center w-[180px]">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Botão Emprestar Rápido quando Disponível e não em aula agora */}
                          {!isReadOnly && asset.status === "AVAILABLE" && !isCurrentlyInClass && (
                            <Link href={`/emprestimos?assetId=${asset.id}`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 text-xs rounded-xl gap-1"
                                title="Emprestar este equipamento"
                              >
                                <Handshake className="w-3.5 h-3.5 text-blue-500" />
                                <span>Emprestar</span>
                              </Button>
                            </Link>
                          )}

                          {/* Se estiver em aula, botão para ver a solicitação na agenda */}
                          {isCurrentlyInClass && activeRes.request && (
                            <Link href={`/agenda?requestId=${activeRes.request.id}`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 text-xs rounded-xl gap-1 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10"
                                title="Ver solicitação na Agenda"
                              >
                                <MapPin className="w-3.5 h-3.5" />
                                <span>Ver Aula</span>
                              </Button>
                            </Link>
                          )}

                          {/* Botão Ver Empréstimo quando Emprestado */}
                          {asset.status === "LOANED" && activeLoan && (
                            <Link href={`/emprestimos?search=${asset.assetTag}`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 text-xs rounded-xl gap-1 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                                title="Ver histórico ou detalhes do empréstimo"
                              >
                                <Handshake className="w-3.5 h-3.5" />
                                <span>Ver Empréstimo</span>
                              </Button>
                            </Link>
                          )}

                          {/* Botão Alterar Status */}
                          {!isReadOnly && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setSelectedAssetForStatus({
                                  id: asset.id,
                                  assetTag: asset.assetTag,
                                  itemName: asset.item.name,
                                  currentStatus: asset.status,
                                  currentBoxId: asset.currentBoxId,
                                })
                              }
                              className="h-8 px-2 text-xs rounded-xl gap-1"
                              title="Alterar status ou localização"
                            >
                              <Wrench className="w-3.5 h-3.5 text-amber-500" />
                              <span>Status</span>
                            </Button>
                          )}

                          {/* Botão Detalhes */}
                          <Link href={`/patrimonio/${asset.id}`}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-xs rounded-xl gap-1 text-primary hover:text-primary"
                              title="Ver histórico e linha do tempo"
                            >
                              <span>Detalhes</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modais */}
      {isFormOpen && (
        <AssetFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          catalogItems={catalogItems}
          boxes={allBoxes}
          categories={categories}
          onSuccess={fetchData}
          onRefreshCatalog={fetchData}
        />
      )}

      {selectedAssetForStatus && (
        <AssetStatusModal
          isOpen={!!selectedAssetForStatus}
          onClose={() => setSelectedAssetForStatus(null)}
          asset={selectedAssetForStatus}
          boxes={allBoxes}
          onSuccess={fetchData}
        />
      )}

      <AssetLabelPrinter
        isOpen={isPrinterOpen}
        onClose={() => setIsPrinterOpen(false)}
        assets={assetsForLabels}
        selectedTag={selectedAssetForLabel}
      />
    </div>
  );
}
