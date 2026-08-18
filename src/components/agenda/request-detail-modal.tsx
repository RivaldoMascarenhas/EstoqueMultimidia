"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { 
  Calendar, 
  Clock, 
  User, 
  BookOpen, 
  Package, 
  Tv, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Trash2, 
  Monitor, 
  ShieldCheck, 
  Sparkles,
  Ban,
  ArrowRight,
  Plus,
  ArrowLeftRight,
  MapPin,
  FileText,
  AlertTriangle,
  Archive
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface RequestDetailModalProps {
  isOpen: boolean;
  requestId: string | null;
  onClose: () => void;
  onUpdated?: () => void;
}

export function RequestDetailModal({
  isOpen,
  requestId,
  onClose,
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

  // Modais de Ação
  const [unfulfilledTarget, setUnfulfilledTarget] = useState<{ id: string; label: string } | null>(null);
  const [unfulfilledReasonText, setUnfulfilledReasonText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // Modal de Troca de Patrimônio (Asset Swap)
  const [swapTarget, setSwapTarget] = useState<{ itemId: string; currentAssetTag: string; itemLabel: string } | null>(null);
  const [swapNewAssetId, setSwapNewAssetId] = useState("");
  const [swapReason, setSwapReason] = useState("");

  // Modal de Adição de Tarefa Personalizada
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskType, setNewTaskType] = useState<string>("CUSTOM");

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

  // 1. Alocar Patrimônio Físico a um item
  const handleAllocateAsset = async (itemId: string, assetId: string) => {
    if (!request || !isOperatorOrAdmin || !assetId) return;
    try {
      setIsSaving(true);
      const res = await fetch(`/api/v1/requests/${request.id}/allocate-asset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, assetId }),
      });
      const data = await res.json();
      if (data.success) {
        setRequest(data.data);
        toast.success("Patrimônio vinculado ao atendimento com sucesso!");
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

  // 2. Trocar Patrimônio (Asset Swap) com Histórico
  const handleConfirmSwapAsset = async () => {
    if (!request || !swapTarget || !swapNewAssetId || !swapReason.trim() || !isOperatorOrAdmin) {
      toast.error("Selecione o novo equipamento e informe o motivo da substituição.");
      return;
    }
    try {
      setIsSaving(true);
      const res = await fetch(`/api/v1/requests/${request.id}/swap-asset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: swapTarget.itemId,
          newAssetId: swapNewAssetId,
          reason: swapReason.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRequest(data.data);
        toast.success("Substituição de patrimônio registrada com sucesso!");
        setSwapTarget(null);
        setSwapNewAssetId("");
        setSwapReason("");
        onUpdated?.();
      } else {
        toast.error(data.error || "Erro ao trocar patrimônio.");
      }
    } catch {
      toast.error("Erro na comunicação com o servidor.");
    } finally {
      setIsSaving(false);
    }
  };

  // 3. Alternar Conclusão de Tarefa Operacional (Checklist)
  const handleToggleTask = async (taskId: string, currentCompleted: boolean) => {
    if (!requestId || !isOperatorOrAdmin) return;
    try {
      // Atualização otimista
      setRequest((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          tasks: prev.tasks.map((t: any) =>
            t.id === taskId ? { ...t, completed: !currentCompleted } : t
          ),
        };
      });

      const res = await fetch(`/api/v1/requests/${requestId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !currentCompleted }),
      });
      const data = await res.json();
      if (data.success) {
        setRequest(data.data);
        toast.success(!currentCompleted ? "Tarefa marcada como concluída!" : "Tarefa desmarcada.");
        onUpdated?.();
      } else {
        toast.error(data.error || "Erro ao atualizar tarefa.");
        fetchRequestDetails();
      }
    } catch {
      toast.error("Erro ao atualizar tarefa.");
      fetchRequestDetails();
    }
  };

  // 4. Adicionar Tarefa Personalizada
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !newTaskTitle.trim() || !isOperatorOrAdmin) return;
    try {
      setIsSaving(true);
      const res = await fetch(`/api/v1/requests/${request.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          taskType: newTaskType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRequest(data.data);
        toast.success("Tarefa adicionada com sucesso!");
        setIsAddTaskOpen(false);
        setNewTaskTitle("");
        onUpdated?.();
      } else {
        toast.error(data.error || "Erro ao adicionar tarefa.");
      }
    } catch {
      toast.error("Erro ao comunicar com o servidor.");
    } finally {
      setIsSaving(false);
    }
  };

  // 5. Excluir Tarefa
  const handleDeleteTask = async (taskId: string) => {
    if (!request || !isOperatorOrAdmin) return;
    try {
      const res = await fetch(`/api/v1/requests/${request.id}/tasks/${taskId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setRequest(data.data);
        toast.success("Tarefa removida.");
        onUpdated?.();
      } else {
        toast.error(data.error || "Erro ao remover tarefa.");
      }
    } catch {
      toast.error("Erro ao remover tarefa.");
    }
  };

  // 6. Atualizar Status Global
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

  // 7. Atribuir Responsável
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
        toast.success("Responsável operacional atualizado!");
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

  // 8. Confirmar Cancelamento de Item
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
          resourceType: i.resourceType,
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
            ? `${request.notes} | [Item removido: ${itemLabel}]`
            : `[Item removido: ${itemLabel}]`
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

  // 9. Confirmar Justificativa de Item Não Levado
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
            resourceType: i.resourceType,
            label: `${i.label.replace(/\s*\[Não levado:.*?\]/g, "")} [Não levado: ${reason}]`,
            quantity: i.quantity,
            separated: false,
          };
        }
        return {
          id: i.id,
          itemId: i.itemId,
          assetId: i.assetId,
          resourceType: i.resourceType,
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

  // 10. Confirmar Cancelamento do Atendimento
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

  const getTaskIcon = (type: string) => {
    switch (type) {
      case "FIXED_EQUIPMENT": return <Tv className="w-3.5 h-3.5 text-blue-500" />;
      case "DELIVERY": return <MapPin className="w-3.5 h-3.5 text-amber-500" />;
      case "COLLECTION": return <Archive className="w-3.5 h-3.5 text-purple-500" />;
      default: return <Package className="w-3.5 h-3.5 text-emerald-500" />;
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
                  {request?.isOutsideShift && (
                    <Badge variant="destructive" className="text-[10px] gap-1 font-bold">
                      <AlertTriangle className="w-3 h-3" />
                      Fora do Expediente
                    </Badge>
                  )}
                  {request && getStatusBadge(request.status)}
                </div>
                <DialogTitle className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                  <span>Sala {request?.room?.name || "..."}</span>
                  {request?.room?.floor && (
                    <span className="text-xs font-normal text-muted-foreground">({request.room.floor})</span>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Plataforma Operacional de Atendimento • Setor de Multimídia UniFAP
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
              <p className="text-xs">Carregando dados operacionais do atendimento...</p>
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

              {/* 2. Checklist de Tarefas Operacionais (RequestTask) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Tarefas Operacionais do Multimídia
                  </h4>
                  {isOperatorOrAdmin && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsAddTaskOpen(true)}
                      className="h-7 text-[11px] text-primary hover:bg-primary/10 rounded-lg gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Tarefa</span>
                    </Button>
                  )}
                </div>

                <div className="space-y-1.5">
                  {request.tasks?.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 text-center">Nenhuma tarefa operacional cadastrada.</p>
                  ) : (
                    request.tasks.map((task: any) => (
                      <div
                        key={task.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                          task.completed
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300"
                            : "bg-card border-border/80 text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          {isOperatorOrAdmin ? (
                            <button
                              type="button"
                              onClick={() => handleToggleTask(task.id, task.completed)}
                              className={`h-5 w-5 rounded-lg border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                                task.completed
                                  ? "bg-emerald-500 border-emerald-500 text-white"
                                  : "border-muted-foreground/40 hover:border-primary"
                              }`}
                            >
                              {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </button>
                          ) : (
                            <div className="h-5 w-5 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                              {task.completed ? <Check className="w-3 h-3 text-emerald-500" /> : <Clock className="w-3 h-3 text-muted-foreground" />}
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            {getTaskIcon(task.taskType)}
                            <span className={`text-xs font-medium ${task.completed ? "line-through opacity-80" : ""}`}>
                              {task.title}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {task.completed && task.completedByUser && (
                            <span className="text-[10px] text-muted-foreground hidden sm:inline font-mono">
                              por {task.completedByUser.name}
                            </span>
                          )}
                          {isOperatorOrAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-muted-foreground hover:text-rose-500 p-1 transition-colors"
                              title="Remover tarefa"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 3. Recursos Solicitados & Alocação de Patrimônio */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-primary" />
                    Recursos Solicitados & Alocação de Patrimônio
                  </h4>
                </div>

                {/* Banner de Infraestrutura Fixa */}
                {request.room?.fixedProjectorModel ? (
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5 text-xs">
                    <Tv className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-0.5">
                      <p className="font-bold text-emerald-900 dark:text-emerald-300">
                        Projetor Fixo Instalado na Sala {request.room.name}
                      </p>
                      <p className="text-[11px] text-emerald-800 dark:text-emerald-400">
                        Modelo: <strong>{request.room.fixedProjectorModel}</strong> • HDMI: {request.room.hdmiCableOk ? "OK" : "Não"} • VGA: {request.room.vgaCableOk ? "OK" : "Não"} • Lâmpada: {request.room.lampStatus || "Normal"} ({request.room.lampHours || 0}h)
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* Lista de Itens */}
                <div className="space-y-2">
                  {request.items?.map((item: any) => {
                    const isFixed = item.resourceType === "FIXED_IN_ROOM";
                    const isMobileAsset = item.resourceType === "MOBILE_ASSET" || (!isFixed && item.item?.itemType === "ASSET_EQUIPMENT");
                    const isUnfulfilled = item.label?.includes("[Não levado:");

                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          item.asset
                            ? "bg-primary/5 border-primary/20"
                            : isUnfulfilled
                            ? "bg-amber-500/10 border-amber-500/40"
                            : "bg-card border-border/80"
                        }`}
                      >
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-foreground">
                              {item.label}
                            </span>
                            {item.quantity > 1 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {item.quantity} un
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-mono">
                              {isFixed ? "Infra Fixa" : isMobileAsset ? "Equip Móvel" : "Quantitativo"}
                            </Badge>
                          </div>

                          {/* Patrimônio Físico Alocado */}
                          {item.asset ? (
                            <div className="flex items-center gap-2 text-[11px] text-primary pt-0.5 flex-wrap">
                              <Monitor className="w-3.5 h-3.5 shrink-0" />
                              <span>Patrimônio: <strong className="font-mono font-bold">#{item.asset.assetTag}</strong> ({item.asset.model || item.asset.item?.name})</span>
                              {item.asset.currentBox && (
                                <span className="text-muted-foreground">• Guardado na {item.asset.currentBox.name} ({item.asset.currentBox.door?.name})</span>
                              )}
                              {isOperatorOrAdmin && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSwapTarget({
                                      itemId: item.id,
                                      currentAssetTag: item.asset.assetTag,
                                      itemLabel: item.label,
                                    });
                                    setSwapNewAssetId("");
                                    setSwapReason("");
                                  }}
                                  className="h-6 text-[10px] text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 px-2 rounded-lg gap-1 cursor-pointer font-bold"
                                  title="Substituir por outro equipamento em caso de defeito"
                                >
                                  <ArrowLeftRight className="w-3 h-3" />
                                  <span>Trocar Patrimônio</span>
                                </Button>
                              )}
                            </div>
                          ) : !isFixed && isMobileAsset && isOperatorOrAdmin ? (
                            <div className="pt-1 flex items-center gap-2">
                              <select
                                onChange={(e) => {
                                  if (e.target.value) handleAllocateAsset(item.id, e.target.value);
                                }}
                                className="h-7 text-[11px] rounded-lg border border-border bg-background px-2 py-0.5 text-foreground max-w-xs focus:ring-1 focus:ring-primary font-medium"
                                defaultValue=""
                              >
                                <option value="" disabled>Alocar Tombamento / Patrimônio...</option>
                                {availableAssets.map((asset) => (
                                  <option key={asset.id} value={asset.id}>
                                    #{asset.assetTag} - {asset.item?.name} {asset.currentBox ? `(${asset.currentBox.name})` : ""}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : null}
                        </div>

                        {/* Ações de Linha */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          {isOperatorOrAdmin && !isFixed && (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setUnfulfilledTarget({ id: item.id, label: item.label });
                                  setUnfulfilledReasonText("");
                                }}
                                className="h-7 text-[10px] text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 px-2 rounded-lg gap-1 cursor-pointer"
                                title="Avisar que este equipamento não foi levado"
                              >
                                <AlertCircle className="w-3 h-3" />
                                <span className="hidden sm:inline">Não Levado</span>
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteTarget({ id: item.id, label: item.label })}
                                className="h-7 text-[10px] text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 px-2 rounded-lg gap-1 cursor-pointer"
                                title="Remover item"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. Observações */}
              {request.notes && (
                <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 text-xs space-y-1">
                  <span className="font-bold text-foreground flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-primary" /> Observações & Histórico de Trocas:
                  </span>
                  <p className="text-muted-foreground whitespace-pre-wrap">{request.notes}</p>
                </div>
              )}

              {/* 5. Painel de Controle Operacional do Multimídia */}
              {isOperatorOrAdmin && (
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Responsável & Transição de Status
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-muted-foreground font-semibold block mb-1">
                        Técnico / Responsável do Setor:
                      </label>
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

                    <div>
                      <label className="text-[11px] text-muted-foreground font-semibold block mb-1">
                        Mudar Status do Atendimento:
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
                          className="h-8 text-[11px] px-2.5 rounded-xl text-emerald-600 dark:text-emerald-400 font-bold"
                        >
                          Finalizar
                        </Button>
                        <Button
                          size="sm"
                          variant={request.status === "PROBLEMA" ? "destructive" : "outline"}
                          onClick={() => handleUpdateStatus("PROBLEMA")}
                          className="h-8 text-[11px] px-2.5 rounded-xl text-rose-500 font-bold"
                        >
                          Problema
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. Ações do Rodapé */}
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
      {/* DIALOG 1: MODAL DE TROCA DE PATRIMÔNIO (ASSET SWAP)                       */}
      {/* ========================================================================= */}
      <Dialog open={!!swapTarget} onOpenChange={(open) => !open && setSwapTarget(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-card border-border shadow-2xl space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-extrabold text-foreground">
                  Substituir Patrimônio Físico
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Atual: #{swapTarget?.currentAssetTag} • {swapTarget?.itemLabel}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 pt-1 text-xs">
            <div>
              <label className="font-semibold text-foreground block mb-1">
                Selecione o Novo Equipamento Substitutivo:
              </label>
              <select
                value={swapNewAssetId}
                onChange={(e) => setSwapNewAssetId(e.target.value)}
                className="w-full h-9 rounded-xl border border-border bg-background px-3 text-foreground font-medium"
              >
                <option value="">Selecione um patrimônio disponível...</option>
                {availableAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    #{asset.assetTag} - {asset.item?.name} {asset.currentBox ? `(${asset.currentBox.name})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">
                Motivo / Justificativa da Troca:
              </label>
              <div className="flex flex-wrap gap-1 mb-2">
                {["Lâmpada com defeito", "Sem sinal HDMI", "Bateria viciada", "Cabo rompido", "Substituição preventiva"].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSwapReason(r)}
                    className="text-[10px] px-2 py-0.5 rounded-lg border border-border bg-muted/40 hover:bg-muted"
                  >
                    {r}
                  </button>
                ))}
              </div>
              <textarea
                value={swapReason}
                onChange={(e) => setSwapReason(e.target.value)}
                placeholder="Descreva o problema encontrado no equipamento anterior..."
                className="w-full h-20 rounded-xl border border-border bg-background p-2.5 text-foreground resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSwapTarget(null)}
              className="rounded-xl text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmSwapAsset}
              disabled={isSaving || !swapNewAssetId || !swapReason.trim()}
              className="rounded-xl text-xs bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold gap-1.5"
            >
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Confirmar Troca</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 2: MODAL DE ADICIONAR TAREFA PERSONALIZADA                         */}
      {/* ========================================================================= */}
      <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-card border-border shadow-2xl space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-extrabold text-foreground">
                  Nova Tarefa Operacional
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Adicione um checklist específico para a equipe de plantão
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateTask} className="space-y-3 pt-1 text-xs">
            <div>
              <label className="font-semibold text-foreground block mb-1">
                Título da Tarefa:
              </label>
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="ex: Levar extensão de 10 metros extra..."
                className="w-full h-9 rounded-xl border border-border bg-background px-3 text-foreground"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">
                Tipo de Tarefa:
              </label>
              <select
                value={newTaskType}
                onChange={(e) => setNewTaskType(e.target.value)}
                className="w-full h-9 rounded-xl border border-border bg-background px-3 text-foreground font-medium"
              >
                <option value="CUSTOM">Personalizada / Geral</option>
                <option value="FIXED_EQUIPMENT">Infraestrutura Fixa</option>
                <option value="SEPARATION">Separação no Armário</option>
                <option value="DELIVERY">Transporte até a Sala</option>
                <option value="COLLECTION">Recolhimento após a Aula</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddTaskOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving || !newTaskTitle.trim()}
                className="rounded-xl text-xs bg-primary text-primary-foreground font-bold"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Adicionar</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 3: MODAL DE AVISO DE EQUIPAMENTO NÃO LEVADO                        */}
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

            <textarea
              value={unfulfilledReasonText}
              onChange={(e) => setUnfulfilledReasonText(e.target.value)}
              placeholder="Descreva o motivo..."
              className="w-full h-20 text-xs rounded-2xl border border-border bg-background p-3 text-foreground resize-none font-medium"
            />
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
              className="rounded-xl text-xs bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold gap-1.5"
            >
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Salvar Justificativa</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 4: CONFIRMAÇÃO DE REMOÇÃO DE ITEM                                 */}
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
              className="rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1.5"
            >
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span>Confirmar Remoção</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 5: CONFIRMAÇÃO DE CANCELAMENTO DO ATENDIMENTO COMPLETO             */}
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
            Tem certeza que deseja cancelar esta solicitação de atendimento? As reservas vinculadas serão liberadas no estoque.
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
              className="rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1.5"
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
