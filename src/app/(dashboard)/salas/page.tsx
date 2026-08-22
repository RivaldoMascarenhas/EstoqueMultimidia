"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { 
  School, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Tv, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  X, 
  Barcode, 
  Tag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface AssetOption {
  id: string;
  assetTag: string;
  model: string | null;
  serialNumber: string | null;
  status: string;
  item: {
    id: string;
    name: string;
    category?: { name: string };
  };
  currentBox?: {
    name: string;
    code: string;
    door?: { name: string };
  } | null;
}

export default function SalasPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role || "OPERADOR";
  const canManageRooms = ["ADMIN", "GESTOR", "OPERADOR"].includes(userRole);
  const canDeleteRooms = ["ADMIN", "GESTOR"].includes(userRole);

  const [rooms, setRooms] = useState<any[]>([]);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [search, setSearch] = useState("");
  const [selectedFloor, setSelectedFloor] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);

  // Modal de Criação / Edição de Sala
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Modal de Confirmação de Desativação
  const [deactivateTarget, setDeactivateTarget] = useState<any | null>(null);
  const [isConfirmDeactivateOpen, setIsConfirmDeactivateOpen] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [floor, setFloor] = useState("");
  const [block, setBlock] = useState("Bloco Principal");
  
  // Projetor Fixo
  const [fixedProjectorModel, setFixedProjectorModel] = useState("");
  const [projectorAssetSearch, setProjectorAssetSearch] = useState("");
  const [selectedProjectorAsset, setSelectedProjectorAsset] = useState<AssetOption | null>(null);
  const [showProjectorSuggestions, setShowProjectorSuggestions] = useState(false);

  const [vgaCableOk, setVgaCableOk] = useState(false);
  const [hdmiCableOk, setHdmiCableOk] = useState(true);
  const [lampHours, setLampHours] = useState<number | "">("");
  const [lampStatus, setLampStatus] = useState("Bom");
  const [lastVisitAt, setLastVisitAt] = useState("");

  // Equipamentos Fixos Adicionais
  const [fixedEquipmentList, setFixedEquipmentList] = useState<
    Array<{ label: string; assetId?: string | null; itemId?: string | null; status?: string; notes?: string }>
  >([]);

  // Modal / Seletor de Patrimônio para Equipamentos Adicionais
  const [addAssetModalOpen, setAddAssetModalOpen] = useState(false);
  const [extraAssetSearch, setExtraAssetSearch] = useState("");

  const fetchRooms = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/v1/rooms");
      const data = await res.json();
      if (data.success) {
        setRooms(data.data);
      }
    } catch (err) {
      console.error("Erro ao listar salas:", err);
      toast.error("Erro ao carregar lista de salas.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAssets = async () => {
    try {
      const res = await fetch("/api/v1/assets");
      const data = await res.json();
      if (data.success) {
        setAssets(data.data || []);
      }
    } catch (err) {
      console.error("Erro ao carregar patrimônios:", err);
    }
  };

  useEffect(() => {
    fetchRooms();
    fetchAssets();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingRoom(null);
    setName("");
    setFloor("1 Andar");
    setBlock("Bloco Principal");
    setFixedProjectorModel("Epson s41+");
    setSelectedProjectorAsset(null);
    setProjectorAssetSearch("");
    setVgaCableOk(false);
    setHdmiCableOk(true);
    setLampHours(1500);
    setLampStatus("Bom");
    setLastVisitAt(new Date().toISOString().split("T")[0]);
    setFixedEquipmentList([]);
    setModalOpen(true);
  };

  const handleOpenEditModal = (room: any) => {
    setEditingRoom(room);
    setName(room.name);
    setFloor(room.floor || "");
    setBlock(room.block || "Bloco Principal");
    setFixedProjectorModel(room.fixedProjectorModel || "");
    setSelectedProjectorAsset(null);
    setProjectorAssetSearch("");
    setVgaCableOk(Boolean(room.vgaCableOk));
    setHdmiCableOk(Boolean(room.hdmiCableOk));
    setLampHours(room.lampHours ?? "");
    setLampStatus(room.lampStatus || "Bom");
    setLastVisitAt(
      room.lastVisitAt ? new Date(room.lastVisitAt).toISOString().split("T")[0] : ""
    );
    setFixedEquipmentList(
      room.fixedEquipment?.map((e: any) => ({
        label: e.label,
        assetId: e.assetId || null,
        itemId: e.itemId || null,
        status: e.status || "OK",
        notes: e.notes || "",
      })) || []
    );
    setModalOpen(true);
  };

  // Filtragem de patrimônios disponíveis para o projetor
  const filteredProjectorAssets = useMemo(() => {
    const term = projectorAssetSearch.toLowerCase().trim();
    return assets.filter((asset) => {
      // Ativos disponíveis ou já vinculados à sala atual
      const isAvailableOrCurrent =
        asset.status === "AVAILABLE" ||
        (editingRoom && (asset as any).currentRoomId === editingRoom.id);

      if (!isAvailableOrCurrent) return false;

      if (!term) return true;
      return (
        asset.assetTag.toLowerCase().includes(term) ||
        (asset.model && asset.model.toLowerCase().includes(term)) ||
        (asset.serialNumber && asset.serialNumber.toLowerCase().includes(term)) ||
        asset.item.name.toLowerCase().includes(term)
      );
    });
  }, [assets, projectorAssetSearch, editingRoom]);

  // Filtragem de patrimônios disponíveis para equipamentos adicionais
  const filteredExtraAssets = useMemo(() => {
    const term = extraAssetSearch.toLowerCase().trim();
    // Exclui patrimônios já adicionados na lista
    const alreadySelectedAssetIds = fixedEquipmentList
      .map((f) => f.assetId)
      .filter(Boolean);

    return assets.filter((asset) => {
      if (alreadySelectedAssetIds.includes(asset.id)) return false;

      const isAvailableOrCurrent =
        asset.status === "AVAILABLE" ||
        (editingRoom && (asset as any).currentRoomId === editingRoom.id);

      if (!isAvailableOrCurrent) return false;

      if (!term) return true;
      return (
        asset.assetTag.toLowerCase().includes(term) ||
        (asset.model && asset.model.toLowerCase().includes(term)) ||
        (asset.serialNumber && asset.serialNumber.toLowerCase().includes(term)) ||
        asset.item.name.toLowerCase().includes(term)
      );
    });
  }, [assets, extraAssetSearch, fixedEquipmentList, editingRoom]);

  const handleSelectProjectorAsset = (asset: AssetOption) => {
    setSelectedProjectorAsset(asset);
    setFixedProjectorModel(asset.model || asset.item.name);
    setShowProjectorSuggestions(false);
    toast.success(`Patrimônio #${asset.assetTag} selecionado! Clique em "Salvar Sala" para confirmar o vínculo.`);
  };

  const handleAddAssetToFixedList = (asset: AssetOption) => {
    setFixedEquipmentList((prev) => [
      ...prev,
      {
        label: `${asset.item.name} (${asset.model || "Patrimônio #" + asset.assetTag})`,
        assetId: asset.id,
        itemId: asset.item.id,
        status: "OK",
        notes: `Patrimônio oficial #${asset.assetTag}`,
      },
    ]);
    toast.success(`Patrimônio #${asset.assetTag} adicionado! Clique em "Salvar Sala" para confirmar.`);
    setAddAssetModalOpen(false);
    setExtraAssetSearch("");
  };

  const handleRemoveFixedEquipment = (index: number) => {
    const itemToRemove = fixedEquipmentList[index];
    setFixedEquipmentList((prev) => prev.filter((_, i) => i !== index));
    toast.info(`"${itemToRemove?.label || "Equipamento"}" removido da lista (será desvinculado ao clicar em Salvar Sala).`);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nome da sala é obrigatório.");
      return;
    }

    try {
      setIsSaving(true);
      
      // Se selecionou um patrimônio para o projetor, podemos adicioná-lo também aos fixedEquipment caso não esteja
      let finalFixedEquipment = [...fixedEquipmentList];
      if (selectedProjectorAsset) {
        const hasProjAlready = finalFixedEquipment.some((f) => f.assetId === selectedProjectorAsset.id);
        if (!hasProjAlready) {
          finalFixedEquipment.unshift({
            label: `Projetor Fixo: ${selectedProjectorAsset.model || fixedProjectorModel}`,
            assetId: selectedProjectorAsset.id,
            itemId: selectedProjectorAsset.item.id,
            status: "OK",
            notes: `Projetor principal no teto da sala`,
          });
        }
      }

      const payload = {
        name: name.trim(),
        floor: floor.trim() || undefined,
        block: block.trim() || undefined,
        fixedProjectorModel: fixedProjectorModel.trim() || undefined,
        vgaCableOk,
        hdmiCableOk,
        lampHours: typeof lampHours === "number" ? lampHours : undefined,
        lampStatus: lampStatus.trim() || undefined,
        lastVisitAt: lastVisitAt ? lastVisitAt : undefined,
        fixedEquipment: finalFixedEquipment,
      };

      const url = editingRoom ? `/api/v1/rooms/${editingRoom.id}` : "/api/v1/rooms";
      const method = editingRoom ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(
          editingRoom ? "Dados da sala e patrimônios atualizados!" : "Sala cadastrada com sucesso!"
        );
        setModalOpen(false);
        fetchRooms();
        fetchAssets();
      } else {
        toast.error(data.error || "Erro ao salvar sala.");
      }
    } catch {
      toast.error("Erro na comunicação com o servidor.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivateRoom = (room: any) => {
    setDeactivateTarget(room);
    setIsConfirmDeactivateOpen(true);
  };

  const executeDeactivateRoom = async () => {
    if (!deactivateTarget) return;

    try {
      const res = await fetch(`/api/v1/rooms/${deactivateTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success(`Sala ${deactivateTarget.name} desativada com sucesso.`);
        fetchRooms();
        fetchAssets();
      } else {
        toast.error(data.error || "Erro ao desativar sala.");
      }
    } catch {
      toast.error("Erro na comunicação com o servidor.");
    }
  };

  // Filtragem e Métricas
  const floors = useMemo(() => {
    const set = new Set<string>();
    rooms.forEach((r) => {
      if (r.floor) set.add(r.floor);
    });
    return Array.from(set).sort();
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const matchesFloor = selectedFloor === "ALL" || r.floor === selectedFloor;
      const term = search.toLowerCase().trim();
      const matchesSearch =
        !term ||
        r.name.toLowerCase().includes(term) ||
        (r.floor && r.floor.toLowerCase().includes(term)) ||
        (r.block && r.block.toLowerCase().includes(term)) ||
        (r.fixedProjectorModel && r.fixedProjectorModel.toLowerCase().includes(term)) ||
        r.fixedEquipment?.some((eq: any) => eq.label.toLowerCase().includes(term));

      return matchesFloor && matchesSearch;
    });
  }, [rooms, search, selectedFloor]);

  const totalRooms = rooms.length;
  const activeRooms = rooms.filter((r) => r.active).length;
  const roomsWithProjector = rooms.filter((r) => r.fixedProjectorModel).length;
  const roomsNeedingLamp = rooms.filter(
    (r) => r.lampStatus?.toUpperCase().includes("TROCAR") || r.lampStatus?.toUpperCase().includes("RUIM")
  ).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-primary font-bold uppercase tracking-wider mb-1">
            <School className="w-3.5 h-3.5" />
            <span>Gestão de Infraestrutura de Salas</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Salas de Aula & Inventário Físico
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Catálogo completo das 74 salas da UniFAP com patrimônios de TI, projetores fixos e histórico de lâmpadas.
          </p>
        </div>

        {canManageRooms && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleOpenCreateModal}
              className="rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-sm hover:scale-105 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Sala</span>
            </Button>
          </div>
        )}
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 rounded-2xl border-border/80 bg-card shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <School className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase">Salas Cadastradas</p>
              <p className="text-xl font-extrabold text-foreground">{totalRooms}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 rounded-2xl border-border/80 bg-card shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase">Salas Ativas</p>
              <p className="text-xl font-extrabold text-foreground">{activeRooms}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 rounded-2xl border-border/80 bg-card shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase">Com Projetor Fixo</p>
              <p className="text-xl font-extrabold text-foreground">{roomsWithProjector}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 rounded-2xl border-border/80 bg-card shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase">Troca de Lâmpada</p>
              <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400">{roomsNeedingLamp}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por sala, projetor, bloco ou equipamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-xs rounded-xl border border-border bg-background focus:ring-1 focus:ring-primary text-foreground"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-semibold">Andar:</span>
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="h-9 text-xs rounded-xl border border-border bg-background px-2.5 text-foreground focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="ALL">Todos os Andares ({rooms.length})</option>
              {floors.map((fl) => (
                <option key={fl} value={fl}>
                  {fl} ({rooms.filter((r) => r.floor === fl).length})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Salas */}
      <Card className="rounded-3xl border-border/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="py-3 px-4 text-xs font-bold text-foreground">Sala / Local</TableHead>
                <TableHead className="py-3 px-4 text-xs font-bold text-foreground">Andar / Bloco</TableHead>
                <TableHead className="py-3 px-4 text-xs font-bold text-foreground">Projetor Instalado (Teto)</TableHead>
                <TableHead className="py-3 px-4 text-xs font-bold text-foreground">Cabos</TableHead>
                <TableHead className="py-3 px-4 text-xs font-bold text-foreground">Lâmpada / Visita</TableHead>
                <TableHead className="py-3 px-4 text-xs font-bold text-foreground">Equipamentos Fixos</TableHead>
                {canManageRooms && <TableHead className="py-3 px-4 text-xs font-bold text-right text-foreground">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-xs">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 opacity-50" />
                    Carregando inventário de salas...
                  </TableCell>
                </TableRow>
              ) : filteredRooms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-xs">
                    Nenhuma sala encontrada para os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRooms.map((room) => {
                  const isTrocarLampada =
                    room.lampStatus?.toUpperCase().includes("TROCAR") ||
                    room.lampStatus?.toUpperCase().includes("RUIM");

                  return (
                    <TableRow key={room.id} className="hover:bg-muted/20 border-border transition-colors">
                      
                      {/* Nome da Sala */}
                      <TableCell className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl shrink-0 ${
                            room.fixedProjectorModel ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          }`}>
                            <School className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-foreground block">
                              Sala {room.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {room._count?.requests || 0} atendimentos realizados
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Andar / Bloco */}
                      <TableCell className="py-3 px-4 text-xs">
                        <span className="font-semibold text-foreground">{room.floor || "-"}</span>
                        <p className="text-[10px] text-muted-foreground">{room.block || "Bloco Principal"}</p>
                      </TableCell>

                      {/* Projetor Fixo */}
                      <TableCell className="py-3 px-4">
                        {room.fixedProjectorModel ? (
                          <div className="space-y-0.5">
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[11px] font-bold px-2 py-0.5">
                              <Tv className="w-3 h-3 mr-1" />
                              {room.fixedProjectorModel}
                            </Badge>
                          </div>
                        ) : (
                          <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[10px] px-2 py-0.5">
                            Sem Projetor Fixo
                          </Badge>
                        )}
                      </TableCell>

                      {/* Cabos */}
                      <TableCell className="py-3 px-4 text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            room.hdmiCableOk ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                          }`}>
                            HDMI: {room.hdmiCableOk ? "OK" : "❌"}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            room.vgaCableOk ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
                          }`}>
                            VGA: {room.vgaCableOk ? "OK" : "-"}
                          </span>
                        </div>
                      </TableCell>

                      {/* Lâmpada */}
                      <TableCell className="py-3 px-4">
                        <div className="space-y-0.5">
                          <span className={`text-xs font-bold ${isTrocarLampada ? "text-rose-500" : "text-foreground"}`}>
                            {room.lampHours ? `${room.lampHours}h` : "-"} ({room.lampStatus || "Normal"})
                          </span>
                          {room.lastVisitAt && (
                            <p className="text-[10px] text-muted-foreground">
                              Visita: {formatDate(room.lastVisitAt)}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Equipamentos Fixos */}
                      <TableCell className="py-3 px-4 text-xs">
                        {room.fixedEquipment?.length > 0 ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            {room.fixedEquipment.map((eq: any, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-[10px] px-1.5 py-0 flex items-center gap-1">
                                {eq.asset?.assetTag && <span className="font-mono text-primary font-bold">#{eq.asset.assetTag}</span>}
                                <span>{eq.label}</span>
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">Apenas projetor</span>
                        )}
                      </TableCell>

                      {/* Ações */}
                      {canManageRooms && (
                        <TableCell className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenEditModal(room)}
                              className="h-7 text-xs text-primary px-2 rounded-lg gap-1 cursor-pointer hover:bg-primary/10"
                              title="Editar sala e vincular patrimônios"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Editar</span>
                            </Button>

                            {canDeleteRooms && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeactivateRoom(room)}
                                className="h-7 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 px-2 rounded-lg cursor-pointer"
                                title="Desativar sala"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}

                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* 5. Modal de Criação / Edição de Sala com Busca de Patrimônio */}
      <Dialog open={modalOpen} onOpenChange={(open) => !open && setModalOpen(false)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0 rounded-3xl border-border bg-card shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-border/80 bg-muted/20">
            <DialogTitle className="text-lg font-extrabold text-foreground flex items-center gap-2">
              <School className="w-5 h-5 text-primary" />
              <span>{editingRoom ? `Editar Sala ${editingRoom.name}` : "Cadastrar Nova Sala"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure as informações físicas, projetor e vincule patrimônios do TI da sala de aula.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveRoom} className="p-6 space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Nome da Sala *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 1A, LAB 2A"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-9 text-xs rounded-xl border border-border bg-background px-2.5 text-foreground focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Andar</label>
                <input
                  type="text"
                  placeholder="Ex: 1 Andar, TÉRREO"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  className="w-full h-9 text-xs rounded-xl border border-border bg-background px-2.5 text-foreground focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Bloco</label>
                <input
                  type="text"
                  placeholder="Ex: Bloco Principal"
                  value={block}
                  onChange={(e) => setBlock(e.target.value)}
                  className="w-full h-9 text-xs rounded-xl border border-border bg-background px-2.5 text-foreground focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Projetor Fixo com Busca de Patrimônio */}
            <div className="p-4 rounded-2xl bg-accent/40 border border-border/60 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Tv className="w-3.5 h-3.5 text-primary" />
                  <span>Dados do Projetor Fixo (Teto)</span>
                </h4>
                {selectedProjectorAsset && (
                  <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/30 rounded-xl px-2.5 py-1 text-xs">
                    <span className="font-mono font-bold text-primary">🏷️ #{selectedProjectorAsset.assetTag}</span>
                    <span className="font-semibold text-foreground truncate">{selectedProjectorAsset.model || selectedProjectorAsset.item.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProjectorAsset(null);
                        setFixedProjectorModel("");
                        toast.info("Patrimônio do projetor desmarcado.");
                      }}
                      className="text-muted-foreground hover:text-rose-500 p-0.5 ml-1 cursor-pointer"
                      title="Desmarcar este patrimônio"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* 🔍 Busca Rápida de Patrimônio do Estoque */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                  <Search className="w-3 h-3 text-primary" />
                  <span>Buscar e Vincular Patrimônio de Projetor do TI:</span>
                </label>
                
                <div className="relative">
                  <div className="relative">
                    <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      placeholder="🔍 Digite o nº de patrimônio (ex: 123456) ou modelo..."
                      value={projectorAssetSearch}
                      onChange={(e) => {
                        setProjectorAssetSearch(e.target.value);
                        setShowProjectorSuggestions(true);
                      }}
                      onFocus={() => setShowProjectorSuggestions(true)}
                      className="w-full h-9 pl-9 pr-8 text-xs rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary"
                    />
                    {projectorAssetSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setProjectorAssetSearch("");
                          setShowProjectorSuggestions(false);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Lista de Sugestões de Patrimônios */}
                  {showProjectorSuggestions && (
                    <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border border-border bg-popover text-popover-foreground shadow-xl p-1.5 space-y-1">
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Patrimônios Disponíveis no Estoque ({filteredProjectorAssets.length}):
                      </div>
                      {filteredProjectorAssets.length === 0 ? (
                        <div className="p-3 text-center text-xs text-muted-foreground">
                          Nenhum patrimônio livre encontrado com esse termo.
                        </div>
                      ) : (
                        filteredProjectorAssets.map((asset) => (
                          <div
                            key={asset.id}
                            onClick={() => handleSelectProjectorAsset(asset)}
                            className="p-2 rounded-lg hover:bg-accent hover:text-accent-foreground cursor-pointer flex items-center justify-between gap-2 text-xs transition-colors"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-primary">#{asset.assetTag}</span>
                                <span className="font-semibold text-foreground truncate">{asset.model || asset.item.name}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground block">
                                {asset.item.category?.name || "Projetores"} {asset.currentBox ? `• Local: Caixa ${asset.currentBox.code}` : ""}
                              </span>
                            </div>
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] shrink-0">
                              Disponível
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Modelo do Projetor (ou nome exibido)</label>
                  <input
                    type="text"
                    placeholder="Ex: Epson s41+, Casio, PowerLite"
                    value={fixedProjectorModel}
                    onChange={(e) => setFixedProjectorModel(e.target.value)}
                    className="w-full h-8 text-xs rounded-xl border border-border bg-background px-2.5 text-foreground"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Status da Lâmpada</label>
                  <input
                    type="text"
                    placeholder="Ex: Bom, TROCAR LÂMPADA"
                    value={lampStatus}
                    onChange={(e) => setLampStatus(e.target.value)}
                    className="w-full h-8 text-xs rounded-xl border border-border bg-background px-2.5 text-foreground"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Horas da Lâmpada</label>
                  <input
                    type="number"
                    placeholder="Ex: 1955"
                    value={lampHours}
                    onChange={(e) => setLampHours(e.target.value ? parseInt(e.target.value, 10) : "")}
                    className="w-full h-8 text-xs rounded-xl border border-border bg-background px-2.5 text-foreground"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Data da Última Visita</label>
                  <input
                    type="date"
                    value={lastVisitAt}
                    onChange={(e) => setLastVisitAt(e.target.value)}
                    className="w-full h-8 text-xs rounded-xl border border-border bg-background px-2.5 text-foreground"
                  />
                </div>
              </div>

              {/* Cabos */}
              <div className="flex items-center gap-6 pt-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hdmiCableOk}
                    onChange={(e) => setHdmiCableOk(e.target.checked)}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Cabo HDMI funcionando</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vgaCableOk}
                    onChange={(e) => setVgaCableOk(e.target.checked)}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Cabo VGA funcionando</span>
                </label>
              </div>
            </div>

            {/* Outros Equipamentos Fixos com Busca de Patrimônio */}
            <div className="space-y-2.5 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">
                  Outros Equipamentos Fixos na Sala ({fixedEquipmentList.length}):
                </label>
                <Button
                  type="button"
                  variant={addAssetModalOpen ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setAddAssetModalOpen(!addAssetModalOpen)}
                  className="h-7 text-xs px-2.5 rounded-lg gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{addAssetModalOpen ? "Fechar Painel de Busca" : "Buscar e Vincular Patrimônio"}</span>
                </Button>
              </div>

              {/* 🔍 Painel Inline de Busca de Patrimônio */}
              {addAssetModalOpen && (
                <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-3 animate-in fade-in-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-primary" />
                      <span>Vincular Patrimônio Disponível no Estoque</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setAddAssetModalOpen(false)}
                      className="text-xs text-muted-foreground hover:text-foreground font-semibold p-1"
                    >
                      ✕ Fechar
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      placeholder="🔍 Buscar por patrimônio (ex: PAT-NOT-001, Som, TV)..."
                      value={extraAssetSearch}
                      onChange={(e) => setExtraAssetSearch(e.target.value)}
                      className="w-full h-8 pl-9 pr-3 text-xs rounded-xl border border-border bg-background text-foreground focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-xl p-1.5 bg-background border border-border/60">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground px-1 block">
                      Disponíveis no Estoque ({filteredExtraAssets.length}):
                    </span>

                    {filteredExtraAssets.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3">
                        Nenhum patrimônio livre encontrado com esse termo.
                      </p>
                    ) : (
                      filteredExtraAssets.map((asset) => (
                        <div
                          key={asset.id}
                          className="p-2 rounded-xl bg-card border border-border/80 hover:border-primary/60 flex items-center justify-between gap-2 text-xs transition-all"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-bold text-primary">#{asset.assetTag}</span>
                              <span className="font-semibold text-foreground truncate">{asset.item.name}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground block truncate">
                              Modelo: {asset.model || "Padrão"} {asset.currentBox ? `• Caixa ${asset.currentBox.code}` : ""}
                            </span>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleAddAssetToFixedList(asset)}
                            className="h-6 px-2.5 text-[10px] font-bold rounded-lg bg-primary text-primary-foreground shrink-0 cursor-pointer hover:scale-105"
                          >
                            + Vincular
                          </Button>
                        </div>
                      ))
                    )}
                  </div>

                </div>
              )}

              {/* Lista dos Equipamentos Já Vinculados */}
              {fixedEquipmentList.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic p-3 border border-dashed border-border rounded-xl text-center">
                  Nenhum equipamento adicional além do projetor. Clique acima para vincular computadores, TVs ou caixas de som fixas.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {fixedEquipmentList.map((eq, index) => (
                    <div key={index} className="p-2.5 rounded-xl bg-card border border-border flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-mono text-[10px] shrink-0">
                            🏷️ Patrimônio Vinculado
                          </Badge>
                        <span className="font-semibold text-foreground truncate">{eq.label}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemoveFixedEquipment(index);
                        }}
                        className="p-1.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer shrink-0 ml-2"
                        title="Remover / Desvincular este equipamento"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                className="rounded-xl text-xs h-9 cursor-pointer"
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                disabled={isSaving}
                size="sm"
                className="rounded-xl text-xs font-bold h-9 bg-primary text-primary-foreground shadow-sm cursor-pointer hover:scale-105 transition-all"
              >
                {isSaving ? "Salvando..." : "Salvar Sala & Patrimônios"}
              </Button>
            </div>

          </form>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        isOpen={isConfirmDeactivateOpen}
        onClose={() => setIsConfirmDeactivateOpen(false)}
        onConfirm={executeDeactivateRoom}
        title="Desativar Sala de Aula"
        description="Tem certeza que deseja desativar esta sala? Os equipamentos vinculados retornarão automaticamente como disponíveis no estoque."
        itemName={deactivateTarget ? `Sala ${deactivateTarget.name} (${deactivateTarget.floor || "Geral"})` : undefined}
        confirmText="Sim, Desativar"
        cancelText="Cancelar"
        variant="danger"
      />

    </div>
  );
}
