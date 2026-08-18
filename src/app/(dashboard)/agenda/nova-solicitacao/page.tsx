"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { 
  CalendarDays, 
  Clock, 
  MapPin, 
  User, 
  BookOpen, 
  Package, 
  Tv, 
  Monitor, 
  Repeat, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Layers,
  Plus,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Search,
  Calendar,
  GraduationCap,
  FileText,
  Volume2,
  Mic
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface AvailableItem {
  itemId: string;
  name: string;
  sku: string;
  category: string;
  logisticsType: string;
  totalStock: number;
  inMaintenance: number;
  inLoans: number;
  alreadyReserved: number;
  availableQuantity: number;
  isAvailable: boolean;
  fixedDetails?: {
    model: string;
    lampStatus: string;
    hdmiOk: boolean;
    vgaOk: boolean;
  } | null;
  unavailabilityReason?: string | null;
}

interface SelectedEquipment {
  itemId?: string;
  label: string;
  quantity: number;
  logisticsType: string;
  itemNotes?: string;
}

export default function NovaSolicitacaoPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const userName = session?.user?.name || "";

  const [rooms, setRooms] = useState<any[]>([]);
  const [availabilityData, setAvailabilityData] = useState<AvailableItem[]>([]);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(true);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtro de busca de equipamentos
  const [equipmentSearch, setEquipmentSearch] = useState("");

  // Form State
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("10:00");
  const [roomId, setRoomId] = useState("");
  const [professorName, setProfessorName] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [attendanceType, setAttendanceType] = useState("Aula Teórica");
  const [notes, setNotes] = useState("");

  // Recurrence State
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [recurrenceMode, setRecurrenceMode] = useState<"SEMESTER" | "MONTH" | "CUSTOM">("SEMESTER");
  const [repeatUntilDate, setRepeatUntilDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 4); // 4 meses à frente (semestre) por padrão
    return d.toISOString().split("T")[0];
  });

  // Selected Equipment Items
  const [selectedItems, setSelectedItems] = useState<SelectedEquipment[]>([]);

  // Modal Inteligente de Microfone & Caixa de Som
  const [isMicModalOpen, setIsMicModalOpen] = useState(false);
  const [pendingMicItem, setPendingMicItem] = useState<AvailableItem | null>(null);
  const [matchingSpeakerItem, setMatchingSpeakerItem] = useState<AvailableItem | null>(null);

  // 1. Carregar salas ativas
  useEffect(() => {
    const loadRooms = async () => {
      try {
        setIsLoadingCatalogs(true);
        const roomsRes = await fetch("/api/v1/rooms?activeOnly=true");
        const roomsData = await roomsRes.json();
        if (roomsData.success) {
          setRooms(roomsData.data);
          if (roomsData.data.length > 0 && !roomId) {
            setRoomId(roomsData.data[0].id);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar salas:", err);
        toast.error("Erro ao carregar lista de salas.");
      } finally {
        setIsLoadingCatalogs(false);
      }
    };

    loadRooms();
  }, []);

  // 2. Atualizar data limite conforme o modo de recorrência selecionado
  const handleSetRecurrenceMode = (mode: "SEMESTER" | "MONTH" | "CUSTOM") => {
    setRecurrenceMode(mode);
    const baseDate = new Date(date + "T12:00:00");
    if (isNaN(baseDate.getTime())) return;

    if (mode === "SEMESTER") {
      // 18 semanas (~4.5 meses) para cobrir o semestre letivo completo
      const endSem = new Date(baseDate.getTime() + 18 * 7 * 24 * 60 * 60 * 1000);
      setRepeatUntilDate(endSem.toISOString().split("T")[0]);
    } else if (mode === "MONTH") {
      // 4 semanas (1 mês)
      const endMonth = new Date(baseDate.getTime() + 4 * 7 * 24 * 60 * 60 * 1000);
      setRepeatUntilDate(endMonth.toISOString().split("T")[0]);
    }
  };

  // 3. Consultar disponibilidade de estoque em tempo real para data/horário/sala selecionados
  useEffect(() => {
    if (!date || !startTime || !endTime) return;

    const checkAvailability = async () => {
      try {
        setIsLoadingAvailability(true);
        const url = new URL("/api/v1/inventory/availability", window.location.origin);
        url.searchParams.set("date", date);
        url.searchParams.set("startTime", startTime);
        url.searchParams.set("endTime", endTime);
        if (roomId) url.searchParams.set("roomId", roomId);

        const res = await fetch(url.toString());
        const json = await res.json();
        if (json.success) {
          setAvailabilityData(json.data.items || []);
        }
      } catch (err) {
        console.error("Erro ao verificar disponibilidade:", err);
      } finally {
        setIsLoadingAvailability(false);
      }
    };

    const timer = setTimeout(checkAvailability, 250);
    return () => clearTimeout(timer);
  }, [date, startTime, endTime, roomId]);

  const selectedRoom = rooms.find((r) => r.id === roomId);

  // 4. Auto-inclusão / confirmação automática dos equipamentos fixos da sala selecionada
  useEffect(() => {
    if (!selectedRoom || availabilityData.length === 0) return;

    const fixedItem = availabilityData.find((a) => a.logisticsType === "FIXED_IN_ROOM");

    if (
      selectedRoom.fixedProjectorModel &&
      selectedRoom.lampStatus !== "TROCAR LAMPADA" &&
      fixedItem &&
      fixedItem.isAvailable
    ) {
      setSelectedItems((prev) => {
        const otherItems = prev.filter((i) => i.logisticsType !== "FIXED_IN_ROOM");
        return [
          {
            itemId: fixedItem.itemId,
            label: `Datashow (Projetor fixo: ${selectedRoom.fixedProjectorModel})`,
            quantity: 1,
            logisticsType: "FIXED_IN_ROOM",
            itemNotes: `Projetor de teto da sala ${selectedRoom.name} (${selectedRoom.floor || "Campus"})`,
          },
          ...otherItems,
        ];
      });
    } else {
      // Se a nova sala não possui projetor fixo, remove o item fixo da sala anterior
      setSelectedItems((prev) => prev.filter((i) => i.logisticsType !== "FIXED_IN_ROOM"));
    }
  }, [roomId, selectedRoom, availabilityData]);

  // Filtragem de equipamentos por busca
  const filteredAvailabilityData = useMemo(() => {
    if (!equipmentSearch.trim()) return availabilityData;
    const term = equipmentSearch.toLowerCase().trim();
    return availabilityData.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term) ||
        item.sku.toLowerCase().includes(term)
    );
  }, [availabilityData, equipmentSearch]);

  // Adição direta de item
  const addEquipmentDirectly = (item: AvailableItem, customNotes: string = "") => {
    if (selectedItems.some((si) => si.itemId === item.itemId)) {
      toast.info(`"${item.name}" já está na lista de equipamentos.`);
      return;
    }

    setSelectedItems((prev) => [
      ...prev,
      {
        itemId: item.itemId,
        label: item.name,
        quantity: 1,
        logisticsType: item.logisticsType || "MOBILE_STOCK",
        itemNotes: customNotes,
      },
    ]);
    toast.success(`"${item.name}" incluído na solicitação!`);
  };

  // Clique no botão "+ Incluir" com Regra Inteligente de Microfone & Caixa de Som
  const handleAddItemFromCatalog = (item: AvailableItem) => {
    if (!item.isAvailable) {
      toast.error(`Equipamento indisponível: ${item.unavailabilityReason || "Sem estoque para este horário"}`);
      return;
    }

    // Identificar se o item selecionado é um microfone
    const isMicrophone =
      item.name.toLowerCase().includes("microfone") ||
      item.category.toLowerCase().includes("microfone");

    const hasSpeakerAlready = selectedItems.some(
      (si) =>
        si.label.toLowerCase().includes("caixa de som") ||
        si.label.toLowerCase().includes("som")
    );

    if (isMicrophone && !hasSpeakerAlready) {
      // Buscar caixa de som no catálogo de disponibilidade
      const speakerItem = availabilityData.find(
        (a) =>
          a.name.toLowerCase().includes("caixa de som") ||
          a.name.toLowerCase().includes("som amplificada")
      );

      setPendingMicItem(item);
      setMatchingSpeakerItem(speakerItem || null);
      setIsMicModalOpen(true);
      return;
    }

    // Se não for microfone ou já tiver caixa de som, adiciona diretamente
    addEquipmentDirectly(item);
  };

  // Confirmar Microfone + Caixa de Som
  const handleConfirmMicWithSpeaker = () => {
    if (pendingMicItem) {
      addEquipmentDirectly(pendingMicItem);
    }
    if (matchingSpeakerItem && matchingSpeakerItem.isAvailable) {
      addEquipmentDirectly(matchingSpeakerItem);
    }
    setIsMicModalOpen(false);
    setPendingMicItem(null);
    setMatchingSpeakerItem(null);
  };

  // Confirmar apenas o Microfone
  const handleConfirmMicOnly = () => {
    if (pendingMicItem) {
      addEquipmentDirectly(
        pendingMicItem,
        matchingSpeakerItem && !matchingSpeakerItem.isAvailable
          ? "Professor ciente da ausência de caixa de som móvel"
          : ""
      );
    }
    setIsMicModalOpen(false);
    setPendingMicItem(null);
    setMatchingSpeakerItem(null);
  };

  const handleAddCustomItem = () => {
    const customLabel = prompt("Digite o nome ou descrição do acessório / insumo complementar:");
    if (!customLabel?.trim()) return;

    setSelectedItems((prev) => [
      ...prev,
      {
        label: customLabel.trim(),
        quantity: 1,
        logisticsType: "MOBILE_STOCK",
        itemNotes: "",
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return;
    const current = selectedItems[index];
    if (current.itemId) {
      const avail = availabilityData.find((a) => a.itemId === current.itemId);
      if (avail && quantity > avail.availableQuantity) {
        toast.error(`Quantidade máxima disponível para este horário: ${avail.availableQuantity}`);
        return;
      }
    }
    setSelectedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity } : item))
    );
  };

  const handleUpdateItemNotes = (index: number, noteText: string) => {
    setSelectedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, itemNotes: noteText } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!date || !startTime || !endTime) {
      toast.error("Preencha a data e os horários de início e término.");
      return;
    }

    if (!roomId) {
      toast.error("Selecione a sala de aula ou laboratório.");
      return;
    }

    if (!professorName.trim()) {
      toast.error("Informe o nome do(a) professor(a) responsável.");
      return;
    }

    if (selectedItems.length === 0) {
      toast.error("Adicione ao menos um equipamento ou serviço multimídia.");
      return;
    }

    // Validação preventiva de estoque no frontend
    for (const item of selectedItems) {
      if (item.itemId) {
        const avail = availabilityData.find((a) => a.itemId === item.itemId);
        if (avail && (!avail.isAvailable || item.quantity > avail.availableQuantity)) {
          toast.error(
            `Estoque insuficiente para "${item.label}". Disponível para o horário: ${avail?.availableQuantity || 0}`
          );
          return;
        }
      }
    }

    try {
      setIsSubmitting(true);

      const payload = {
        date,
        startTime,
        endTime,
        roomId,
        professorName: professorName.trim(),
        discipline: discipline.trim() || undefined,
        attendanceType: attendanceType.trim() || undefined,
        notes: notes.trim() || undefined,
        items: selectedItems.map((i) => {
          const finalLabel = i.itemNotes?.trim()
            ? `${i.label} (Obs: ${i.itemNotes.trim()})`
            : i.label;

          let resourceType = "QUANTITATIVE";
          if (i.logisticsType === "FIXED_IN_ROOM") {
            resourceType = "FIXED_IN_ROOM";
          } else if (
            i.label.toLowerCase().includes("notebook") ||
            i.label.toLowerCase().includes("datashow móvel") ||
            i.label.toLowerCase().includes("caixa de som") ||
            i.label.toLowerCase().includes("microfone") ||
            i.label.toLowerCase().includes("projetor móvel")
          ) {
            resourceType = "MOBILE_ASSET";
          }

          return {
            itemId: i.itemId,
            resourceType,
            label: finalLabel,
            quantity: i.quantity,
            separated: false,
            notes: i.itemNotes?.trim() || null,
          };
        }),
        repeatWeekly,
        repeatUntilDate: repeatWeekly ? repeatUntilDate : undefined,
      };

      const res = await fetch("/api/v1/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(
          repeatWeekly
            ? "Série semestral de atendimentos agendada com sucesso e sincronizada ao estoque!"
            : "Atendimento agendado com sucesso e sincronizado ao estoque!"
        );
        router.push("/agenda");
      } else {
        toast.error(data.error || "Erro ao criar solicitação.");
      }
    } catch (err: any) {
      console.error("Erro ao submeter solicitação:", err);
      toast.error("Falha ao comunicar com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link href="/agenda">
            <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              <span>Novo Agendamento Multimídia</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Cadastro oficial por Semestre, Mês ou Semana com verificação de estoque e salas em tempo real.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Bloco 1: Data, Horários e Recorrência (Semestre / Mês / Semana) */}
        <Card className="rounded-3xl border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span>1. Data, Horários e Período de Repetição</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Escolha a data inicial e configure a repetição para o Semestre Letivo, Mês ou Semana.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Data Inicial */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Data Inicial / 1ª Aula *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-10 text-xs font-semibold rounded-xl border border-border bg-background px-3 text-foreground focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Início */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Horário de Início *
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full h-10 text-xs font-semibold rounded-xl border border-border bg-background px-3 text-foreground focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Fim */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Horário de Término *
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full h-10 text-xs font-semibold rounded-xl border border-border bg-background px-3 text-foreground focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Configuração de Repetição Semestral / Mensal */}
            <div className="p-4 rounded-2xl bg-accent/40 border border-border/60 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={repeatWeekly}
                  onChange={(e) => {
                    setRepeatWeekly(e.target.checked);
                    if (e.target.checked) handleSetRecurrenceMode(recurrenceMode);
                  }}
                  className="h-4 w-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5 text-primary" />
                    Repetir agendamento durante o período (Semestre / Mês / Semanas)
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Gera automaticamente as aulas semanais para o semestre todo, com controle de checklist individual para cada semana.
                  </p>
                </div>
              </label>

              {repeatWeekly && (
                <div className="pt-3 border-t border-border/60 space-y-3 animate-in fade-in-50">
                  
                  {/* Botões de Escolha Rápida do Período */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                      Escolha o Alcance da Repetição:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      
                      {/* Opção 1: Semestre Todo */}
                      <button
                        type="button"
                        onClick={() => handleSetRecurrenceMode("SEMESTER")}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                          recurrenceMode === "SEMESTER"
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-card text-foreground border-border hover:border-primary/60"
                        }`}
                      >
                        <GraduationCap className="w-4 h-4 shrink-0" />
                        <div>
                          <p className="text-xs font-bold">Todo o Semestre</p>
                          <span className="text-[10px] opacity-80 block">~ 18 Semanas de Aulas</span>
                        </div>
                      </button>

                      {/* Opção 2: 1 Mês */}
                      <button
                        type="button"
                        onClick={() => handleSetRecurrenceMode("MONTH")}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                          recurrenceMode === "MONTH"
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-card text-foreground border-border hover:border-primary/60"
                        }`}
                      >
                        <Calendar className="w-4 h-4 shrink-0" />
                        <div>
                          <p className="text-xs font-bold">Durante 1 Mês</p>
                          <span className="text-[10px] opacity-80 block">4 Semanas consecutivas</span>
                        </div>
                      </button>

                      {/* Opção 3: Personalizado */}
                      <button
                        type="button"
                        onClick={() => handleSetRecurrenceMode("CUSTOM")}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                          recurrenceMode === "CUSTOM"
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-card text-foreground border-border hover:border-primary/60"
                        }`}
                      >
                        <Repeat className="w-4 h-4 shrink-0" />
                        <div>
                          <p className="text-xs font-bold">Personalizado</p>
                          <span className="text-[10px] opacity-80 block">Definir data final exata</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Campo de Data Limite */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
                    <label className="text-xs font-bold text-foreground shrink-0">
                      Repetir todas as semanas até:
                    </label>
                    <input
                      type="date"
                      value={repeatUntilDate}
                      onChange={(e) => {
                        setRepeatUntilDate(e.target.value);
                        setRecurrenceMode("CUSTOM");
                      }}
                      className="h-9 text-xs font-semibold rounded-xl border border-border bg-background px-3 text-foreground focus:ring-1 focus:ring-primary max-w-xs"
                    />
                    <span className="text-[11px] text-muted-foreground">
                      (Aulas geradas automaticamente a cada 7 dias)
                    </span>
                  </div>

                </div>
              )}
            </div>

          </CardContent>
        </Card>

        {/* Bloco 2: Sala & Infraestrutura */}
        <Card className="rounded-3xl border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span>2. Local / Sala de Aula</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Selecione uma das 74 salas para inspecionar os equipamentos fixos já instalados.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Sala de Aula / Laboratório *
              </label>
              <select
                required
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full h-11 text-xs font-semibold rounded-xl border border-border bg-background px-3 text-foreground focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="">Selecione a sala de aula...</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    Sala {room.name} {room.floor ? `(${room.floor})` : ""} {room.fixedProjectorModel ? `• Projetor Fixo: ${room.fixedProjectorModel}` : "• Sem Projetor Fixo"}
                  </option>
                ))}
              </select>
            </div>

            {/* Diagnóstico da Sala Selecionada */}
            {selectedRoom && (
              <div className={`p-4 rounded-2xl border space-y-1.5 animate-in fade-in-50 ${
                selectedRoom.fixedProjectorModel
                  ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-800 dark:text-emerald-300"
                  : "bg-amber-500/10 border-amber-500/25 text-amber-800 dark:text-amber-300"
              }`}>
                <div className="flex items-center gap-2 font-bold text-xs">
                  {selectedRoom.fixedProjectorModel ? <Tv className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-amber-600" />}
                  <span>Status da Sala {selectedRoom.name} ({selectedRoom.floor || "Campus"}):</span>
                </div>
                <p className="text-xs">
                  {selectedRoom.fixedProjectorModel ? (
                    <>
                      • Projetor fixo: <strong>{selectedRoom.fixedProjectorModel}</strong> | Cabo HDMI: {selectedRoom.hdmiCableOk ? "✅ OK" : "❌ Ausente"} | Lâmpada: <strong>{selectedRoom.lampStatus || "Operacional"}</strong>
                    </>
                  ) : (
                    "• Esta sala NÃO possui projetor fixo no teto. É obrigatório solicitar um Datashow Móvel abaixo."
                  )}
                </p>
              </div>
            )}

          </CardContent>
        </Card>

        {/* Bloco 3: Professor e Disciplina */}
        <Card className="rounded-3xl border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              <span>3. Professor e Dados da Atividade</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Nome do(a) Professor(a) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Profa. Paloma Morais"
                  value={professorName}
                  onChange={(e) => setProfessorName(e.target.value)}
                  className="w-full h-10 text-xs rounded-xl border border-border bg-background px-3 text-foreground focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Disciplina / Matéria
                </label>
                <input
                  type="text"
                  placeholder="Ex: Engenharia de Software I"
                  value={discipline}
                  onChange={(e) => setDiscipline(e.target.value)}
                  className="w-full h-10 text-xs rounded-xl border border-border bg-background px-3 text-foreground focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Tipo de Atendimento
                </label>
                <select
                  value={attendanceType}
                  onChange={(e) => setAttendanceType(e.target.value)}
                  className="w-full h-10 text-xs rounded-xl border border-border bg-background px-3 text-foreground focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  <option value="Aula Teórica">Aula Teórica</option>
                  <option value="Aula Prática / Laboratório">Aula Prática / Laboratório</option>
                  <option value="Seminário / Apresentação de TCC">Seminário / Apresentação de TCC</option>
                  <option value="Palestra / Evento Institucional">Palestra / Evento Institucional</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Observações Gerais do Atendimento
                </label>
                <input
                  type="text"
                  placeholder="Ex: Ligar equipamento 15 min antes, testar áudio da sala..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-10 text-xs rounded-xl border border-border bg-background px-3 text-foreground focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Bloco 4: Equipamentos Disponíveis com Barra de Pesquisa e Observações */}
        <Card className="rounded-3xl border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  <span>4. Equipamentos Disponíveis (Estoque em Tempo Real)</span>
                  {isLoadingAvailability && <RefreshCw className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                </CardTitle>
                <CardDescription className="text-xs">
                  Validação instantânea: apenas equipamentos com estoque livre para o horário podem ser adicionados.
                </CardDescription>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCustomItem}
                className="h-8 text-xs rounded-xl gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Outro Acessório</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            
            {/* 🔍 Barra de Pesquisa de Equipamentos */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="🔍 Pesquisar equipamento por nome ou categoria (ex: HDMI, Projetor, Dell, Microfone, Pilha, Passador, Som)..."
                value={equipmentSearch}
                onChange={(e) => setEquipmentSearch(e.target.value)}
                className="h-11 pl-10 pr-4 text-xs rounded-2xl border-border bg-background shadow-2xs focus:ring-2 focus:ring-primary"
              />
              {equipmentSearch && (
                <button
                  type="button"
                  onClick={() => setEquipmentSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-bold p-1"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Grid de Itens do Catálogo Filtrados */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Itens do Catálogo ({filteredAvailabilityData.length} encontrados):
                </label>
              </div>
              
              {filteredAvailabilityData.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-border rounded-2xl space-y-1">
                  <Package className="w-6 h-6 text-muted-foreground mx-auto opacity-50" />
                  <p className="text-xs font-semibold text-foreground">Nenhum equipamento encontrado para &quot;{equipmentSearch}&quot;</p>
                  <p className="text-[11px] text-muted-foreground">Tente buscar por HDMI, Projetor, Dell, Microfone, Som ou limpe a busca.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredAvailabilityData.map((item) => {
                    const isFixed = item.logisticsType === "FIXED_IN_ROOM";
                    const alreadySelected = selectedItems.some((si) => si.itemId === item.itemId);

                    return (
                      <div
                        key={item.itemId}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 ${
                          alreadySelected
                            ? "bg-primary/5 border-primary ring-1 ring-primary/30"
                            : !item.isAvailable
                            ? "bg-muted/40 border-border/50 opacity-60 cursor-not-allowed"
                            : isFixed
                            ? "bg-emerald-500/5 border-emerald-500/30 hover:border-emerald-500 cursor-pointer"
                            : "bg-card border-border/80 hover:border-primary/60 cursor-pointer"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-xl shrink-0 ${
                              isFixed ? "bg-emerald-500/10 text-emerald-600" : "bg-accent text-primary"
                            }`}>
                              {isFixed ? <Tv className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-foreground leading-snug">{item.name}</p>
                              <span className="text-[10px] text-muted-foreground block">{item.category}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status de Disponibilidade em Tempo Real */}
                        <div className="pt-1.5 border-t border-border/40 flex items-center justify-between gap-2">
                          {item.isAvailable ? (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold px-2 py-0.5">
                              🟢 {isFixed ? "Projetor Disponível" : `${item.availableQuantity} em estoque livre`}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[10px] font-bold px-2 py-0.5" title={item.unavailabilityReason || ""}>
                              🔴 {isFixed ? "Sem Projetor Fixo" : "Esgotado neste horário"}
                            </Badge>
                          )}

                          <Button
                            type="button"
                            size="sm"
                            disabled={!item.isAvailable || alreadySelected}
                            onClick={() => handleAddItemFromCatalog(item)}
                            className={`h-7 px-3 text-[11px] font-bold rounded-lg cursor-pointer ${
                              alreadySelected
                                ? isFixed
                                  ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 cursor-default"
                                  : "bg-muted text-muted-foreground"
                                : item.isAvailable
                                ? "bg-primary text-primary-foreground hover:scale-105"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {alreadySelected ? (isFixed ? "🏢 Incluso na Sala" : "Adicionado") : "+ Incluir"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Lista dos Itens Selecionados no Pedido com Campo de Observação */}
            <div className="space-y-3 pt-4 border-t border-border/60">
              <label className="text-xs font-bold text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Equipamentos confirmados para este agendamento ({selectedItems.length}):</span>
              </label>

              {selectedItems.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
                  Nenhum equipamento adicionado ainda. Pesquise e inclua os equipamentos necessários acima.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedItems.map((item, index) => {
                    const isFixed = item.logisticsType === "FIXED_IN_ROOM";
                    return (
                      <div
                        key={index}
                        className={`p-3.5 rounded-2xl border space-y-2.5 animate-in fade-in-50 ${
                          isFixed
                            ? "bg-emerald-500/5 border-emerald-500/30"
                            : "bg-card border-border/80"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-xl shrink-0 ${
                              isFixed ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-accent text-primary"
                            }`}>
                              {isFixed ? <Tv className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-xs font-bold text-foreground truncate">{item.label}</p>
                                {isFixed && (
                                  <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 text-[9px] font-bold px-1.5 py-0">
                                    🏢 Confirmado da Sala
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                {isFixed
                                  ? "✅ Projetor já instalado na sala (requer apenas acionamento)"
                                  : "📦 Item de estoque móvel (separação física e empréstimo)"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {!isFixed && (
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="text-muted-foreground text-[11px] font-bold">Qtd:</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={10}
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateQuantity(index, parseInt(e.target.value, 10) || 1)}
                                  className="w-12 h-7 text-xs font-bold text-center rounded-lg border border-border bg-background"
                                />
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="p-1.5 text-muted-foreground hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Remover item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Campo de Observação Específica do Item */}
                        <div className="pt-1.5 border-t border-border/40 flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <input
                            type="text"
                            placeholder="Observação específica para este equipamento (ex: precisa de adaptador USB-C, testar cabo de força...)"
                            value={item.itemNotes || ""}
                            onChange={(e) => handleUpdateItemNotes(index, e.target.value)}
                            className="w-full h-8 text-[11px] rounded-xl border border-border bg-background/50 px-2.5 text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </CardContent>
        </Card>

        {/* Botão de Envio */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/agenda")}
            className="rounded-xl text-xs h-10 px-4 cursor-pointer"
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting || selectedItems.length === 0}
            className="rounded-xl text-xs font-bold h-10 px-6 bg-primary text-primary-foreground shadow-md shadow-primary/25 cursor-pointer hover:scale-105 transition-all"
          >
            {isSubmitting ? (
              <span>Validando e Agendando...</span>
            ) : repeatWeekly ? (
              <span>Confirmar Série ({recurrenceMode === "SEMESTER" ? "Semestre Letivo" : recurrenceMode === "MONTH" ? "1 Mês" : "Recorrente"})</span>
            ) : (
              <span>Confirmar e Agendar Atendimento</span>
            )}
          </Button>
        </div>

      </form>

      {/* 🎙️ Modal Inteligente de Sugestão de Caixa de Som para Microfone */}
      <Dialog open={isMicModalOpen} onOpenChange={setIsMicModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${
                matchingSpeakerItem?.isAvailable
                  ? "bg-primary/10 text-primary"
                  : "bg-amber-500/10 text-amber-600"
              }`}>
                {matchingSpeakerItem?.isAvailable ? (
                  <Volume2 className="w-6 h-6" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {matchingSpeakerItem?.isAvailable
                    ? "Deseja incluir uma Caixa de Som?"
                    : "Aviso: Sem Caixa de Som Disponível"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Item selecionado: <strong>{pendingMicItem?.name}</strong>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-3 text-xs text-foreground space-y-2.5">
            {matchingSpeakerItem?.isAvailable ? (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-1 text-emerald-800 dark:text-emerald-300">
                <p className="font-semibold">
                  🎙️ Você selecionou um microfone!
                </p>
                <p className="text-[11px] opacity-90">
                  O estoque possui <strong>{matchingSpeakerItem.availableQuantity} Caixa(s) de Som Amplificada(s)</strong> disponível(is) para este horário. Deseja adicionar uma caixa de som para amplificar a voz do professor?
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-1.5 text-amber-800 dark:text-amber-300">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Não há Caixa de Som amplificada disponível para este horário!</span>
                </p>
                <p className="text-[11px] opacity-90">
                  Todas as caixas de som móveis do estoque já estão em uso em outras salas ou eventos neste horário.
                </p>
                <p className="text-[11px] font-bold">
                  Deseja reservar apenas o microfone mesmo assim (ex: se a sala já contar com sistema de áudio próprio no teto/mesa)?
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2 flex-col-reverse sm:flex-row pt-2">
            {matchingSpeakerItem?.isAvailable ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleConfirmMicOnly}
                  className="rounded-xl text-xs h-9 cursor-pointer"
                >
                  Não, apenas o Microfone
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmMicWithSpeaker}
                  className="rounded-xl text-xs font-bold h-9 bg-primary text-primary-foreground gap-1.5 cursor-pointer hover:scale-105 transition-all"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Sim, incluir Caixa de Som</span>
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsMicModalOpen(false);
                    setPendingMicItem(null);
                  }}
                  className="rounded-xl text-xs h-9 cursor-pointer"
                >
                  Cancelar inclusão do microfone
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmMicOnly}
                  className="rounded-xl text-xs font-bold h-9 bg-amber-600 hover:bg-amber-700 text-white gap-1.5 cursor-pointer hover:scale-105 transition-all"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Sim, reservar apenas o microfone</span>
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
