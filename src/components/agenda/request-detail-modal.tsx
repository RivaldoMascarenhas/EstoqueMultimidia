"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { 
  Calendar,
  Clock, 
  MapPin, 
  User, 
  BookOpen, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  Package, 
  Monitor, 
  Tv, 
  Sparkles,
  ShieldCheck,
  Check,
  Ban,
  ArrowRight,
  AlertCircle,
  MessageSquare,
  Trash2,
  HelpCircle
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface RequestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string | null;
  onUpdated?: () => void;
}

export function RequestDetailModal({
  isOpen,
  onClose,
  requestId,
  onUpdated,
}: RequestDetailModalProps) {
  const { data: session } = useSession();
  const userRole = session?.user?.role || "OPERADOR";
  const userId = session?.user?.id;

  const isAcademicSupport = userRole === "ACADEMIC_SUPPORT";
  const isOperatorOrAdmin = ["ADMIN", "GESTOR", "OPERADOR"].includes(userRole);

  const [request, setRequest] = useState<any>(null);
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedAssetForField, setSelectedAssetForField] = useState<{ [itemId: string]: string }>({});

  // Modais de Ação Elegantes
  const [unfulfilledTarget, setUnfulfilledTarget] = useState<{ id: string; label: string } | null>(null);
  const [unfulfilledReasonText, setUnfulfilledReasonText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // Lista de usuários garantindo a presença imediata do usuário logado
  const displayUsers = useMemo(() => {
    const map = new Map<string, any>();
    if (session?.user?.id && session?.user?.name) {
      map.set(session.user.id, {
        id: session.user.id,
        name: session.user.name,
        role: session.user.role || "OPERADOR",
      });
    }
    if (request?.assignedUser?.id) {
      map.set(request.assignedUser.id, request.assignedUser);
    }
    users.forEach((u) => {
      map.set(u.id, u);
    });
    return Array.from(map.values());
  }, [users, session?.user, request?.assignedUser]);

  const fetchRequestDetails = async () => {
    if (!requestId) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/v1/requests/${requestId}`);
      const data = await res.json();
      if (data.success) {
        setRequest(data.data);
        // Pre-fill asset selections
        const assetMap: { [itemId: string]: string } = {};
        data.data.items?.forEach((i: any) => {
          if (i.assetId) assetMap[i.id] = i.assetId;
        });
        setSelectedAssetForField(assetMap);
      }
    } catch (err) {
      console.error("Erro ao carregar detalhes:", err);
      toast.error("Não foi possível carregar os detalhes da solicitação.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableAssetsAndUsers = async () => {
    if (!isOperatorOrAdmin) return;
    try {
      const [assetsRes, usersRes] = await Promise.all([
        fetch("/api/v1/assets?status=AVAILABLE"),
        fetch("/api/v1/users"),
      ]);
      const assetsData = await assetsRes.json();
      const usersData = await usersRes.json();
      if (assetsData.success) setAvailableAssets(assetsData.data);
      if (usersData.success) setUsers(usersData.data);
    } catch {}
  };

  useEffect(() => {
    if (isOpen && requestId) {
      fetchRequestDetails();
      fetchAvailableAssetsAndUsers();
    } else {
      setRequest(null);
    }
  }, [isOpen, requestId]);

  // Auto-atribuir reativamente o operador logado se o atendimento estiver sem responsável
  useEffect(() => {
    if (
      isOpen &&
      request &&
      !request.assignedUserId &&
      userId &&
      isOperatorOrAdmin
    ) {
      handleAssignTechnician(userId);
    }
  }, [isOpen, request?.id, request?.assignedUserId, userId, isOperatorOrAdmin]);

  const handleToggleSeparated = async (itemId: string, currentSeparated: boolean) => {
    if (!requestId || !isOperatorOrAdmin) return;
    try {
      const res = await fetch(`/api/v1/requests/${requestId}/items/${itemId}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ separated: !currentSeparated }),
      });
      const data = await res.json();
      if (data.success) {
        setRequest(data.data);
        toast.success(
          !currentSeparated
            ? "Item marcado como separado!"
            : "Item desmarcado da separação."
        );
        onUpdated?.();
      } else {
        toast.error(data.error || "Erro ao atualizar item.");
      }
    } catch {
      toast.error("Erro ao atualizar item.");
    }
  };

  const handleAssignAssetToItem = async (itemId: string, assetId: string | null) => {
    if (!request || !isOperatorOrAdmin) return;
    try {
      setIsSaving(true);
      const updatedItems = request.items.map((i: any) => {
        if (i.id === itemId) {
          return {
            id: i.id,
            itemId: i.itemId,
            assetId: assetId || null,
            label: i.label,
            quantity: i.quantity,
            separated: i.separated,
          };
        }
        return {
          id: i.id,
          itemId: i.itemId,
          assetId: i.assetId,
          label: i.label,
          quantity: i.quantity,
          separated: i.separated,
        };
      });

      const res = await fetch(`/api/v1/requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: updatedItems }),
      });

      const data = await res.json();
      if (data.success) {
        setRequest(data.data);
        toast.success("Patrimônio vinculado ao item com sucesso!");
        onUpdated?.();
      } else {
        toast.error(data.error || "Erro ao vincular patrimônio.");
      }
    } catch {
      toast.error("Erro na comunicação com o servidor.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!request || !isOperatorOrAdmin) return;
    try {
      setIsSaving(true);
      const res = await fetch(`/api/v1/requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setRequest(data.data);
        toast.success(`Status atualizado para ${newStatus}!`);
        onUpdated?.();
      } else {
        toast.error(data.error || "Erro ao atualizar status.");
      }
    } catch {
      toast.error("Erro ao atualizar status.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssignTechnician = async (assignedUserId: string) => {
    if (!request || !isOperatorOrAdmin) return;
    try {
      setIsSaving(true);
      const res = await fetch(`/api/v1/requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedUserId: assignedUserId || null }),
      });
      const data = await res.json();
      if (data.success) {
        setRequest(data.data);
        toast.success("Responsável operacional atribuído!");
        onUpdated?.();
      } else {
        toast.error(data.error || "Erro ao atribuir técnico.");
      }
    } catch {
      toast.error("Erro ao atribuir responsável.");
    } finally {
      setIsSaving(false);
    }
  };

  // 1. Confirmar Remoção/Cancelamento de Item
  const handleConfirmRemoveItem = async () => {
    if (!request || !deleteTarget || !isOperatorOrAdmin) return;
    try {
      setIsSaving(true);
      const itemId = deleteTarget.id;
      const itemLabel = deleteTarget.label;

      const updatedItems = request.items
        .filter((i: any) => i.id !== itemId)
        .map((i: any) => ({
          id: i.id,
          itemId: i.itemId,
          assetId: i.assetId,
          label: i.label,
          quantity: i.quantity,
          separated: i.separated,
        }));

      const res = await fetch(`/api/v1/requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          items: updatedItems,
          notes: request.notes 
            ? `${request.notes} | [Item removido/cancelado: ${itemLabel}]`
            : `[Item removido/cancelado: ${itemLabel}]`
        }),
      });

      const data = await res.json();
      if (data.success) {
        setRequest(data.data);
        toast.success(`Item "${itemLabel}" removido do atendimento.`);
        setDeleteTarget(null);
        onUpdated?.();
      } else {
        toast.error(data.error || "Erro ao remover item.");
      }
    } catch {
      toast.error("Erro na comunicação com o servidor.");
    } finally {
      setIsSaving(false);
    }
  };

  // 2. Confirmar Justificativa de Item Não Levado
  const handleConfirmUnfulfilled = async () => {
    if (!request || !unfulfilledTarget || !isOperatorOrAdmin) return;
    const reason = unfulfilledReasonText.trim();
    if (!reason) {
      toast.error("Por favor, digite ou selecione um motivo.");
      return;
    }

    try {
      setIsSaving(true);
      const itemId = unfulfilledTarget.id;
      const itemLabel = unfulfilledTarget.label;

      const updatedItems = request.items.map((i: any) => {
        if (i.id === itemId) {
          return {
            id: i.id,
            itemId: i.itemId,
            assetId: i.assetId,
            label: `${i.label.replace(/\s*\[Não levado:.*?\]/g, "")} [Não levado: ${reason}]`,
            quantity: i.quantity,
            separated: false,
          };
        }
        return {
          id: i.id,
          itemId: i.itemId,
          assetId: i.assetId,
          label: i.label,
          quantity: i.quantity,
          separated: i.separated,
        };
      });

      const res = await fetch(`/api/v1/requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          items: updatedItems,
          notes: request.notes 
            ? `${request.notes} | [Aviso de não levado: ${itemLabel} - ${reason}]`
            : `[Aviso de não levado: ${itemLabel} - ${reason}]`
        }),
      });

      const data = await res.json();
      if (data.success) {
        setRequest(data.data);
        toast.success(`Justificativa registrada para "${itemLabel}".`);
        setUnfulfilledTarget(null);
        setUnfulfilledReasonText("");
        onUpdated?.();
      } else {
        toast.error(data.error || "Erro ao registrar justificativa.");
      }
    } catch {
      toast.error("Erro na comunicação com o servidor.");
    } finally {
      setIsSaving(false);
    }
  };

  // 3. Confirmar Cancelamento do Atendimento Completo
  const handleConfirmCancelRequest = async () => {
    if (!request) return;
    try {
      setIsSaving(true);
      const res = await fetch(`/api/v1/requests/${request.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Solicitação cancelada com sucesso!");
        setCancelDialogOpen(false);
        onUpdated?.();
        onClose();
      } else {
        toast.error(data.error || "Erro ao cancelar solicitação.");
      }
    } catch {
      toast.error("Erro ao cancelar.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetryGoogleSync = async () => {
    if (!request) return;
    try {
      const res = await fetch(`/api/v1/requests/${request.id}/retry-sync`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setRequest(data.data);
        toast.success(data.message || "Sincronização reprocessada!");
        onUpdated?.();
      } else {
        toast.error(data.error || "Falha ao sincronizar com Google.");
      }
    } catch {
      toast.error("Erro ao conectar com serviço de sincronização.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PREPARADO":
        return <Badge variant="available">PREPARADO</Badge>;
      case "EM_ATENDIMENTO":
        return <Badge variant="normal">EM ATENDIMENTO</Badge>;
      case "FINALIZADO":
        return <Badge variant="normal">FINALIZADO</Badge>;
      case "PROBLEMA":
        return <Badge variant="destructive">PROBLEMA</Badge>;
      case "CANCELADO":
        return <Badge variant="low">CANCELADO</Badge>;
      default:
        return <Badge variant="low">EM PREPARAÇÃO</Badge>;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8 bg-card border-border shadow-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-border/80">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-mono font-bold">
                    {request?.shift === "MORNING" ? "🌅 Manhã" : request?.shift === "AFTERNOON" ? "☀️ Tarde" : "🌙 Noite"}
                  </Badge>
                  {request && getStatusBadge(request.status)}
                </div>
                <DialogTitle className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                  <span>Sala {request?.room?.name || "..."}</span>
                  {request?.room?.floor && (
                    <span className="text-xs font-normal text-muted-foreground">({request.room.floor})</span>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Detalhes do atendimento, controle de infraestrutura e separação de materiais.
                </DialogDescription>
              </div>

              {request?.seriesId && (
                <Badge variant="secondary" className="text-[11px] gap-1 py-1">
                  <RefreshCw className="w-3 h-3" />
                  Série Recorrente
                </Badge>
              )}
            </div>
          </DialogHeader>

          {isLoading || !request ? (
            <div className="p-12 text-center text-muted-foreground animate-pulse">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
              <p className="text-xs">Carregando dados da solicitação...</p>
            </div>
          ) : (
            <div className="space-y-6 pt-2">
              
              {/* 1. Grade de Informações Gerais */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-4 rounded-2xl bg-muted/20 border border-border/60 text-xs">
                <div>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-primary" /> Data & Horário:
                  </span>
                  <p className="font-bold text-foreground mt-0.5 font-mono">
                    {formatDate(request.date)} • {new Date(request.startTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} às {new Date(request.endTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>

                <div>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-primary" /> Solicitante / Docente:
                  </span>
                  <p className="font-bold text-foreground mt-0.5">{request.professorName || "Não informado"}</p>
                </div>

                <div>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-primary" /> Disciplina / Atividade:
                  </span>
                  <p className="font-bold text-foreground mt-0.5">{request.discipline || "Não informada"}</p>
                </div>

                <div>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-primary" /> Tipo de Atendimento:
                  </span>
                  <p className="font-medium text-foreground mt-0.5">{request.attendanceType || "Presencial"}</p>
                </div>

                <div>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Criado por:
                  </span>
                  <p className="font-medium text-foreground mt-0.5">
                    {request.createdBy?.name || "Sistema"} ({request.createdBy?.role})
                  </p>
                </div>
              </div>

              {/* 2. Equipamentos e Infraestrutura da Sala */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-primary" />
                    Equipamentos & Checklist de Preparo
                  </h4>
                  {isOperatorOrAdmin && (
                    <span className="text-[11px] text-muted-foreground">
                      Marque os itens separados para mudar para <strong className="text-emerald-500">PREPARADO</strong>
                    </span>
                  )}
                </div>

                {/* Banner Informativo do Projetor Fixo da Sala */}
                {request.room?.fixedProjectorModel ? (
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5 text-xs">
                    <Tv className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-0.5">
                      <p className="font-bold text-emerald-900 dark:text-emerald-300">
                        ✅ Projetor Fixo já Instalado na Sala {request.room.name}
                      </p>
                      <p className="text-[11px] text-emerald-800 dark:text-emerald-400">
                        Modelo: <strong>{request.room.fixedProjectorModel}</strong> • HDMI: {request.room.hdmiCableOk ? "OK" : "Não"} • VGA: {request.room.vgaCableOk ? "OK" : "Não"} • Lâmpada: {request.room.lampStatus || "Normal"} ({request.room.lampHours || 0}h)
                      </p>
                      <p className="text-[10px] text-muted-foreground italic pt-0.5">
                        Instrução: Ir até a sala antes do início e ligar/testar. Não requer retirada de projetor do armário.
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* Lista de Itens Solicitados */}
                <div className="space-y-2">
                  {request.items?.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 text-center">Nenhum equipamento adicional listado.</p>
                  ) : (
                    request.items.map((item: any) => {
                      const isFixed = item.item?.logisticsType === "FIXED_IN_ROOM";
                      const isUnfulfilled = item.label?.includes("[Não levado:");
                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            item.separated
                              ? "bg-emerald-500/5 border-emerald-500/30"
                              : isUnfulfilled
                              ? "bg-amber-500/10 border-amber-500/40"
                              : "bg-card border-border/80"
                          }`}
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            {/* Checkbox de Separação */}
                            {isOperatorOrAdmin && !isFixed ? (
                              <button
                                type="button"
                                onClick={() => handleToggleSeparated(item.id, item.separated)}
                                className={`mt-0.5 h-5 w-5 rounded-lg border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                                  item.separated
                                    ? "bg-emerald-500 border-emerald-500 text-white"
                                    : "border-muted-foreground/40 hover:border-primary"
                                }`}
                                title={item.separated ? "Marcar como não separado" : "Marcar como separado"}
                              >
                                {item.separated && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </button>
                            ) : (
                              <div className="mt-0.5 h-5 w-5 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                                {isFixed ? <Check className="w-3 h-3 text-emerald-500" /> : <Package className="w-3 h-3 text-muted-foreground" />}
                              </div>
                            )}

                            <div className="space-y-0.5 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-bold ${item.separated ? "text-emerald-700 dark:text-emerald-300" : isUnfulfilled ? "text-amber-800 dark:text-amber-300" : "text-foreground"}`}>
                                  {item.label}
                                </span>
                                {item.quantity > 1 && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    {item.quantity} un
                                  </Badge>
                                )}
                                {isFixed && (
                                  <Badge variant="normal" className="text-[9px] px-1.5 py-0">
                                    Fixo na sala
                                  </Badge>
                                )}
                                {isUnfulfilled && (
                                  <Badge variant="low" className="text-[9px] px-1.5 py-0 font-bold">
                                    ⚠️ Justificado
                                  </Badge>
                                )}
                              </div>

                              {/* Vinculação de Patrimônio Específico */}
                              {item.asset ? (
                                <div className="flex items-center gap-1.5 text-[11px] text-primary pt-0.5">
                                  <Monitor className="w-3 h-3" />
                                  <span>Patrimônio: <strong className="font-mono">#{item.asset.assetTag}</strong> ({item.asset.model || item.asset.item?.name})</span>
                                  {item.asset.currentBox && (
                                    <span className="text-muted-foreground">• Guardado na {item.asset.currentBox.name} ({item.asset.currentBox.door?.name})</span>
                                  )}
                                </div>
                              ) : !isFixed && isOperatorOrAdmin ? (
                                <div className="pt-1 flex items-center gap-2">
                                  <select
                                    value={selectedAssetForField[item.id] || ""}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setSelectedAssetForField((prev) => ({ ...prev, [item.id]: val }));
                                      handleAssignAssetToItem(item.id, val || null);
                                    }}
                                    className="h-7 text-[11px] rounded-lg border border-border bg-background px-2 py-0.5 text-foreground max-w-xs focus:ring-1 focus:ring-primary"
                                  >
                                    <option value="">Vincular Patrimônio do Armário...</option>
                                    {availableAssets.map((asset) => (
                                      <option key={asset.id} value={asset.id}>
                                        #{asset.assetTag} - {asset.item?.name} {asset.currentBox ? `(${asset.currentBox.name})` : ""}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            {/* Ações Rápidas de Item: Avisar Não Levado ou Cancelar Item com Modal Elegante */}
                            {isOperatorOrAdmin && !isFixed && (
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setUnfulfilledTarget({ id: item.id, label: item.label });
                                    setUnfulfilledReasonText("");
                                  }}
                                  className="h-7 text-[10px] text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 px-2 rounded-lg gap-1 cursor-pointer"
                                  title="Avisar / Justificar motivo de não levar este equipamento"
                                >
                                  <AlertCircle className="w-3 h-3" />
                                  <span className="hidden sm:inline">Avisar Não Levado</span>
                                </Button>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDeleteTarget({ id: item.id, label: item.label })}
                                  className="h-7 text-[10px] text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 px-2 rounded-lg gap-1 cursor-pointer"
                                  title="Cancelar e remover este item do atendimento"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span className="hidden sm:inline">Cancelar Item</span>
                                </Button>
                              </div>
                            )}

                            {item.separated ? (
                              <Badge variant="available" className="text-[10px]">
                                Separado
                              </Badge>
                            ) : isFixed ? (
                              <span className="text-[11px] text-muted-foreground italic">
                                Instrução em sala
                              </span>
                            ) : isUnfulfilled ? (
                              <Badge variant="low" className="text-[10px]">
                                Não Levado
                              </Badge>
                            ) : (
                              <Badge variant="low" className="text-[10px]">
                                Pendente
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 3. Observações */}
              {request.notes && (
                <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 text-xs space-y-1">
                  <span className="font-bold text-foreground">Observações:</span>
                  <p className="text-muted-foreground whitespace-pre-wrap">{request.notes}</p>
                </div>
              )}

              {/* 4. Painel de Controle Operacional (Multimídia/Admin) */}
              {isOperatorOrAdmin && (
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Controle Operacional do Atendimento
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Atribuição de Responsável */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] text-muted-foreground font-semibold">
                          Técnico / Responsável do Setor:
                        </label>
                        {userId && request.assignedUserId !== userId && (
                          <button
                            type="button"
                            onClick={() => handleAssignTechnician(userId)}
                            className="text-[10px] text-primary font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                            title="Atribuir imediatamente a você"
                          >
                            <span>Atribuir a mim</span>
                          </button>
                        )}
                      </div>
                      <select
                        value={request.assignedUserId || (isOperatorOrAdmin && userId ? userId : "") || ""}
                        onChange={(e) => handleAssignTechnician(e.target.value)}
                        className="w-full h-8 text-xs rounded-xl border border-border bg-background px-2.5 text-foreground focus:ring-1 focus:ring-primary font-medium"
                      >
                        <option value="">Sem responsável atribuído</option>
                        {displayUsers.map((u: any) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.role}) {u.id === userId ? "★ (Eu)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Alteração Rápida de Status */}
                    <div>
                      <label className="text-[11px] text-muted-foreground font-semibold block mb-1">
                        Mudar Status Operacional:
                      </label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Button
                          size="sm"
                          variant={request.status === "EM_ATENDIMENTO" ? "default" : "outline"}
                          onClick={() => handleUpdateStatus("EM_ATENDIMENTO")}
                          className="h-8 text-[11px] px-2.5 rounded-xl"
                        >
                          Em Atendimento
                        </Button>
                        <Button
                          size="sm"
                          variant={request.status === "FINALIZADO" ? "default" : "outline"}
                          onClick={() => handleUpdateStatus("FINALIZADO")}
                          className="h-8 text-[11px] px-2.5 rounded-xl text-emerald-600 dark:text-emerald-400"
                        >
                          Finalizar
                        </Button>
                        <Button
                          size="sm"
                          variant={request.status === "PROBLEMA" ? "destructive" : "outline"}
                          onClick={() => handleUpdateStatus("PROBLEMA")}
                          className="h-8 text-[11px] px-2.5 rounded-xl text-rose-500"
                        >
                          Problema
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Status de Sincronização Google Calendar */}
              <div className="p-3 rounded-2xl bg-card border border-border/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                  <div>
                    <span className="font-semibold text-foreground">Google Calendar (Sync de Saída): </span>
                    <span className="text-muted-foreground">
                      {request.syncStatus === "SYNCED" ? (
                        <span className="text-emerald-500 font-bold">Sincronizado ✅</span>
                      ) : request.syncStatus === "ERROR" ? (
                        <span className="text-rose-500 font-bold">Erro de sincronização ⚠️</span>
                      ) : (
                        <span className="text-amber-500 font-medium">Pendente de envio ⏳</span>
                      )}
                    </span>
                  </div>
                </div>

                {request.syncStatus !== "SYNCED" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleRetryGoogleSync}
                    className="h-7 text-xs text-primary px-2 gap-1 rounded-lg"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Tentar Novamente</span>
                  </Button>
                )}
              </div>

              {/* 6. Ações do Rodapé (Cancelar com borda visível / Fechar) */}
              <div className="flex items-center justify-between pt-2 border-t border-border/80">
                {(isOperatorOrAdmin || (isAcademicSupport && request.createdById === userId)) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCancelDialogOpen(true)}
                    disabled={isSaving || request.status === "CANCELADO"}
                    className="text-xs font-bold text-rose-600 dark:text-rose-400 border border-rose-500/50 bg-rose-500/10 hover:bg-rose-500/20 hover:border-rose-500 rounded-xl gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Cancelar Atendimento</span>
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="rounded-xl text-xs ml-auto cursor-pointer"
                >
                  Fechar
                </Button>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 1: MODAL ELEGANTE DE AVISO DE EQUIPAMENTO NÃO LEVADO               */}
      {/* ========================================================================= */}
      <Dialog open={!!unfulfilledTarget} onOpenChange={(open) => !open && setUnfulfilledTarget(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-card border-border shadow-2xl space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-extrabold text-foreground">
                  Avisar Equipamento Não Levado
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground truncate max-w-[280px]">
                  {unfulfilledTarget?.label}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            <p className="text-xs text-muted-foreground">
              Selecione uma justificativa rápida ou descreva o motivo para registro operacional:
            </p>

            {/* Chips de Opções Rápidas */}
            <div className="flex flex-wrap gap-1.5">
              {[
                "Em manutenção no setor",
                "Sem estoque disponível",
                "Dispensado pelo docente",
                "Avaria no cabo / conector",
                "Não localizado no armário",
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setUnfulfilledReasonText(preset)}
                  className={`text-[11px] px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${
                    unfulfilledReasonText === preset
                      ? "bg-amber-500/20 border-amber-500/50 text-amber-900 dark:text-amber-200 font-bold"
                      : "bg-muted/40 border-border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Campo de Texto Personalizado */}
            <div>
              <textarea
                value={unfulfilledReasonText}
                onChange={(e) => setUnfulfilledReasonText(e.target.value)}
                placeholder="Descreva o motivo (ex: equipamento em bancada de testes)..."
                className="w-full h-20 text-xs rounded-2xl border border-border bg-background p-3 text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-amber-500 resize-none font-medium"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUnfulfilledTarget(null)}
              className="rounded-xl text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmUnfulfilled}
              disabled={isSaving || !unfulfilledReasonText.trim()}
              className="rounded-xl text-xs bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold gap-1.5 shadow-md shadow-amber-500/20"
            >
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[3]" />}
              <span>Salvar Justificativa</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 2: MODAL ELEGANTE DE CONFIRMAÇÃO DE REMOÇÃO DE ITEM               */}
      {/* ========================================================================= */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-card border-border shadow-2xl space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-extrabold text-foreground">
                  Remover Item do Atendimento
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Esta ação cancela a separação deste equipamento individual.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <p className="text-xs text-muted-foreground pt-1">
            Tem certeza que deseja cancelar e remover o item <strong className="text-foreground">"{deleteTarget?.label}"</strong> deste atendimento?
          </p>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              className="rounded-xl text-xs"
            >
              Voltar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmRemoveItem}
              disabled={isSaving}
              className="rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1.5 shadow-md shadow-rose-600/20"
            >
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span>Confirmar Remoção</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 3: MODAL ELEGANTE DE CANCELAMENTO DO ATENDIMENTO COMPLETO         */}
      {/* ========================================================================= */}
      <Dialog open={cancelDialogOpen} onOpenChange={(open) => setCancelDialogOpen(open)}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-card border-border shadow-2xl space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-extrabold text-foreground">
                  Cancelar Atendimento
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Sala {request?.room?.name} • {request?.professorName || "Reserva"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <p className="text-xs text-muted-foreground pt-1">
            Tem certeza que deseja cancelar esta solicitação de atendimento? O agendamento será desativado na grade e atualizado no Google Calendar.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCancelDialogOpen(false)}
              className="rounded-xl text-xs"
            >
              Voltar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmCancelRequest}
              disabled={isSaving}
              className="rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1.5 shadow-md shadow-rose-600/20"
            >
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
              <span>Confirmar Cancelamento</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
