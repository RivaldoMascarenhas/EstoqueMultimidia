"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  CalendarDays, 
  Clock, 
  MapPin, 
  User, 
  Package, 
  Tv, 
  Repeat, 
  ArrowLeft, 
  ArrowRight,
  CheckCircle2, 
  Plus,
  Minus,
  Trash2,
  AlertTriangle,
  Search,
  Calendar,
  GraduationCap,
  Volume2,
  Check,
  DoorOpen,
  X
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
import { cn, formatDateInput } from "@/lib/utils";

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
  logisticsType?: string;
  itemNotes?: string;
}

// Helper para verificar com precisão se uma sala possui projetor fixo configurado
function isRoomWithProjector(r: any): boolean {
  if (!r) return false;
  if (r.hasFixedProjector === true) return true;
  if (typeof r.fixedProjectorModel === "string" && r.fixedProjectorModel.trim() !== "") return true;
  if (Array.isArray(r.fixedEquipment) && r.fixedEquipment.some((eq: any) => 
    eq.label?.toLowerCase().includes("projetor") || 
    eq.label?.toLowerCase().includes("datashow") ||
    eq.item?.name?.toLowerCase().includes("projetor")
  )) return true;
  return false;
}

export interface QuickTimeSlot {
  shift: "MORNING" | "AFTERNOON" | "NIGHT";
  shiftLabel: string;
  shiftEmoji: string;
  label: string;
  subLabel: string;
  start: string;
  end: string;
}

export const QUICK_TIME_SLOTS: QuickTimeSlot[] = [
  // ☀️ Manhã
  {
    shift: "MORNING",
    shiftLabel: "Manhã",
    shiftEmoji: "☀️",
    label: "07:20 - 09:00",
    subLabel: "Aulas AB",
    start: "07:20",
    end: "09:00",
  },
  {
    shift: "MORNING",
    shiftLabel: "Manhã",
    shiftEmoji: "☀️",
    label: "09:20 - 11:00",
    subLabel: "Aulas CD",
    start: "09:20",
    end: "11:00",
  },
  {
    shift: "MORNING",
    shiftLabel: "Manhã",
    shiftEmoji: "☀️",
    label: "07:20 - 11:00",
    subLabel: "Turno Completo (ABCD)",
    start: "07:20",
    end: "11:00",
  },

  // 🌤️ Tarde
  {
    shift: "AFTERNOON",
    shiftLabel: "Tarde",
    shiftEmoji: "🌤️",
    label: "14:00 - 15:40",
    subLabel: "Aulas AB",
    start: "14:00",
    end: "15:40",
  },
  {
    shift: "AFTERNOON",
    shiftLabel: "Tarde",
    shiftEmoji: "🌤️",
    label: "16:00 - 17:40",
    subLabel: "Aulas CD",
    start: "16:00",
    end: "17:40",
  },
  {
    shift: "AFTERNOON",
    shiftLabel: "Tarde",
    shiftEmoji: "🌤️",
    label: "14:00 - 17:40",
    subLabel: "Turno Completo (ABCD)",
    start: "14:00",
    end: "17:40",
  },

  // 🌙 Noite
  {
    shift: "NIGHT",
    shiftLabel: "Noite",
    shiftEmoji: "🌙",
    label: "18:20 - 20:00",
    subLabel: "Aulas AB",
    start: "18:20",
    end: "20:00",
  },
  {
    shift: "NIGHT",
    shiftLabel: "Noite",
    shiftEmoji: "🌙",
    label: "20:20 - 22:00",
    subLabel: "Aulas CD",
    start: "20:20",
    end: "22:00",
  },
  {
    shift: "NIGHT",
    shiftLabel: "Noite",
    shiftEmoji: "🌙",
    label: "18:20 - 22:00",
    subLabel: "Turno Completo (ABCD)",
    start: "18:20",
    end: "22:00",
  },
];

function getInitialSchedule() {
  const now = new Date();
  const currentTotalMin = now.getHours() * 60 + now.getMinutes();

  // Se hoje for domingo (getDay() === 0), sugere segunda-feira
  if (now.getDay() === 0) {
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return {
      date: formatDateInput(monday),
      startTime: "07:20",
      endTime: "09:00",
    };
  }

  // Encontra o próximo slot para hoje com pelo menos 15 minutos de antecedência
  const upcoming = QUICK_TIME_SLOTS.find((slot) => {
    const [sh, sm] = slot.start.split(":").map(Number);
    return sh * 60 + sm > currentTotalMin + 15;
  });

  if (upcoming) {
    return {
      date: formatDateInput(now),
      startTime: upcoming.start,
      endTime: upcoming.end,
    };
  }

  // Se já é noite e todos os horários de hoje passaram, sugere o próximo dia útil
  let nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  // Se o próximo dia for domingo, pula para segunda-feira
  if (nextDay.getDay() === 0) {
    nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
  }

  return {
    date: formatDateInput(nextDay),
    startTime: "07:20",
    endTime: "09:00",
  };
}

export default function NovaSolicitacaoPage() {
  const router = useRouter();

  // Wizard Step State (1: Quando & Onde, 2: Recursos, 3: Revisão & Recorrência, 4: Sucesso)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  const [rooms, setRooms] = useState<any[]>([]);
  const [availabilityData, setAvailabilityData] = useState<AvailableItem[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Etapa 1: Quando, Onde e Quem?
  const [date, setDate] = useState(() => getInitialSchedule().date);
  const [startTime, setStartTime] = useState(() => getInitialSchedule().startTime);
  const [endTime, setEndTime] = useState(() => getInitialSchedule().endTime);
  const [roomId, setRoomId] = useState("");
  const [professorName, setProfessorName] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [attendanceType] = useState("Aula Teórica");

  const todayStr = useMemo(() => formatDateInput(new Date()), []);
  const tomorrowStr = useMemo(() => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return formatDateInput(d);
  }, []);

  const nextWorkDayStr = useMemo(() => {
    const now = new Date();
    let d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    if (d.getDay() === 0) {
      d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
    }
    return formatDateInput(d);
  }, []);

  const isTodaySunday = useMemo(() => new Date().getDay() === 0, []);
  const isTomorrowSunday = useMemo(() => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return d.getDay() === 0;
  }, []);

  const isSelectedDateSunday = useMemo(() => {
    if (!date) return false;
    const [y, m, d] = date.split("-").map(Number);
    const dt = new Date(y, m - 1, d, 12, 0, 0);
    return dt.getDay() === 0;
  }, [date]);

  const isTimeSlotPast = (slotStart: string) => {
    if (date !== todayStr) return false;
    const now = new Date();
    const [sh, sm] = slotStart.split(":").map(Number);
    const slotMin = sh * 60 + sm;
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return slotMin <= nowMin;
  };

  const isSelectedTimeInPast = useMemo(() => {
    if (!date || !startTime) return false;
    const now = new Date();
    const [y, m, d] = date.split("-").map(Number);
    const [sh, sm] = startTime.split(":").map(Number);
    const startDt = new Date(y, m - 1, d, sh, sm, 0);
    return startDt < new Date(now.getTime() - 5 * 60 * 1000);
  }, [date, startTime]);

  // Busca Inteligente de Salas
  const [roomSearch, setRoomSearch] = useState("");
  const [isRoomSelectorOpen, setIsRoomSelectorOpen] = useState(false);
  const [roomTypeFilter, setRoomTypeFilter] = useState<"ALL" | "WITH_PROJECTOR" | "WITHOUT_PROJECTOR">("ALL");
  const [roomFloorFilter, setRoomFloorFilter] = useState<string>("ALL");

  // Etapa 2: Recursos & Datashow
  const [turnOnProjector, setTurnOnProjector] = useState<boolean>(true);
  const [selectedItems, setSelectedItems] = useState<SelectedEquipment[]>([]);
  const [resourceCategory, setResourceCategory] = useState<"ALL" | "COMPUTING" | "AUDIO" | "CABLES">("ALL");
  const [resourceSearch, setResourceSearch] = useState("");

  // Modal Inteligente de Microfone & Caixa de Som
  const [isMicModalOpen, setIsMicModalOpen] = useState(false);
  const [pendingMicItem, setPendingMicItem] = useState<AvailableItem | null>(null);
  const [matchingSpeakerItem, setMatchingSpeakerItem] = useState<AvailableItem | null>(null);

  // Modal de Item Customizado
  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false);
  const [customItemLabel, setCustomItemLabel] = useState("");
  const [customItemQty, setCustomItemQty] = useState(1);
  const [customItemNotes, setCustomItemNotes] = useState("");

  // Etapa 3: Recorrência & Revisão
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [recurrenceMode, setRecurrenceMode] = useState<"SEMESTER" | "MONTH" | "CUSTOM">("SEMESTER");
  const [repeatUntilDate, setRepeatUntilDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 4);
    return formatDateInput(d);
  });
  const [generalNotes, setGeneralNotes] = useState("");

  // Dados da aula recém criada para exibição na tela de sucesso
  const [createdSummary, setCreatedSummary] = useState<any>(null);

  // 1. Carregar salas
  useEffect(() => {
    const loadRooms = async () => {
      try {
        const res = await fetch("/api/v1/rooms?activeOnly=true");
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setRooms(json.data);
          if (json.data.length > 0 && !roomId) {
            setRoomId(json.data[0].id);
          }
        } else {
          setRooms([]);
        }
      } catch (err) {
        toast.error("Erro ao carregar lista de salas.");
        setRooms([]);
      }
    };
    loadRooms();
  }, []);

  // 2. Consulta de disponibilidade em tempo real
  const fetchAvailability = async () => {
    if (!date || !startTime || !endTime) return;
    try {
      setIsLoadingAvailability(true);
      const url = `/api/v1/inventory/availability?date=${date}&startTime=${startTime}&endTime=${endTime}${roomId ? `&roomId=${roomId}` : ""}`;
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        const items = Array.isArray(json.data.items) 
          ? json.data.items 
          : Array.isArray(json.data) 
          ? json.data 
          : [];
        setAvailabilityData(items);
      } else {
        setAvailabilityData([]);
      }
    } catch (err) {
      console.error("Erro ao verificar disponibilidade:", err);
      setAvailabilityData([]);
    } finally {
      setIsLoadingAvailability(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, [date, startTime, endTime, roomId]);

  // Lista de andares únicos disponíveis para filtro
  const availableFloors = useMemo(() => {
    if (!Array.isArray(rooms)) return [];
    const set = new Set<string>();
    rooms.forEach((r) => {
      if (r.floor && r.floor.trim()) set.add(r.floor.trim());
    });
    return Array.from(set);
  }, [rooms]);

  // Salas filtradas pela busca inteligente
  const filteredRooms = useMemo(() => {
    if (!Array.isArray(rooms)) return [];
    return rooms.filter((r) => {
      const q = roomSearch.toLowerCase().trim();
      const matchText =
        !q ||
        r.name.toLowerCase().includes(q) ||
        (r.floor && r.floor.toLowerCase().includes(q)) ||
        (r.block && r.block.toLowerCase().includes(q)) ||
        (r.fixedProjectorModel && r.fixedProjectorModel.toLowerCase().includes(q));

      if (!matchText) return false;

      const hasProjector = isRoomWithProjector(r);
      if (roomTypeFilter === "WITH_PROJECTOR" && !hasProjector) return false;
      if (roomTypeFilter === "WITHOUT_PROJECTOR" && hasProjector) return false;

      if (roomFloorFilter !== "ALL" && r.floor !== roomFloorFilter) return false;

      return true;
    });
  }, [rooms, roomSearch, roomTypeFilter, roomFloorFilter]);

  // Sala selecionada atual
  const currentRoom = useMemo(() => {
    if (!Array.isArray(rooms)) return undefined;
    return rooms.find((r) => r.id === roomId);
  }, [rooms, roomId]);

  // Modo de recorrência
  const handleSetRecurrenceMode = (mode: "SEMESTER" | "MONTH" | "CUSTOM") => {
    setRecurrenceMode(mode);
    const baseDate = new Date(date + "T12:00:00");
    if (isNaN(baseDate.getTime())) return;

    if (mode === "SEMESTER") {
      const endSem = new Date(baseDate.getTime() + 18 * 7 * 24 * 60 * 60 * 1000);
      setRepeatUntilDate(formatDateInput(endSem));
    } else if (mode === "MONTH") {
      const endMonth = new Date(baseDate.getTime() + 4 * 7 * 24 * 60 * 60 * 1000);
      setRepeatUntilDate(formatDateInput(endMonth));
    }
  };

  // Quantidade estimada de semanas
  const estimatedWeeks = useMemo(() => {
    if (!repeatWeekly || !date || !repeatUntilDate) return 1;
    const start = new Date(date + "T00:00:00").getTime();
    const end = new Date(repeatUntilDate + "T00:00:00").getTime();
    if (end <= start) return 1;
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.floor(diffDays / 7) + 1);
  }, [repeatWeekly, date, repeatUntilDate]);

  // Adicionar item do catálogo
  const handleToggleItem = (item: AvailableItem) => {
    const isSelected = selectedItems.some((s) => s.itemId === item.itemId);
    if (isSelected) {
      setSelectedItems((prev) => prev.filter((s) => s.itemId !== item.itemId));
      return;
    }

    if (!item.isAvailable || item.availableQuantity < 1) {
      toast.error(`"${item.name}" não está disponível neste horário.`);
      return;
    }

    // Se for microfone, verificar se precisa de caixa de som
    const isMic = item.name.toLowerCase().includes("microfone") || item.category.toLowerCase().includes("microfone") || item.category.toLowerCase().includes("audio");
    if (isMic) {
      const speaker = availabilityData.find(
        (a) => a.name.toLowerCase().includes("caixa") && a.name.toLowerCase().includes("som") && a.isAvailable
      );
      if (speaker) {
        setPendingMicItem(item);
        setMatchingSpeakerItem(speaker);
        setIsMicModalOpen(true);
        return;
      }
    }

    setSelectedItems((prev) => [
      ...prev,
      {
        itemId: item.itemId,
        label: item.name,
        quantity: 1,
        logisticsType: item.logisticsType || "MOBILE_STOCK",
      },
    ]);
  };

  const handleConfirmMicWithSpeaker = (includeSpeaker: boolean) => {
    if (!pendingMicItem) return;
    const newItems: SelectedEquipment[] = [
      {
        itemId: pendingMicItem.itemId,
        label: pendingMicItem.name,
        quantity: 1,
        logisticsType: pendingMicItem.logisticsType || "MOBILE_STOCK",
      },
    ];

    if (includeSpeaker && matchingSpeakerItem) {
      newItems.push({
        itemId: matchingSpeakerItem.itemId,
        label: matchingSpeakerItem.name,
        quantity: 1,
        logisticsType: matchingSpeakerItem.logisticsType || "MOBILE_STOCK",
      });
      toast.success("Microfone e Caixa de Som adicionados!");
    } else {
      toast.success("Microfone adicionado.");
    }

    setSelectedItems((prev) => [...prev, ...newItems]);
    setIsMicModalOpen(false);
    setPendingMicItem(null);
    setMatchingSpeakerItem(null);
  };

  const handleUpdateQuantity = (index: number, qty: number) => {
    if (qty < 1) return;
    const current = selectedItems[index];
    if (current.itemId) {
      const avail = availabilityData.find((a) => a.itemId === current.itemId);
      if (avail && qty > avail.availableQuantity) {
        toast.error(`Quantidade máxima disponível: ${avail.availableQuantity}`);
        return;
      }
    }
    setSelectedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity: qty } : item))
    );
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddCustomItem = () => {
    if (!customItemLabel.trim()) {
      toast.error("Informe a descrição do item.");
      return;
    }
    setSelectedItems((prev) => [
      ...prev,
      {
        label: customItemLabel.trim(),
        quantity: Math.max(1, customItemQty),
        logisticsType: "MOBILE_STOCK",
        itemNotes: customItemNotes.trim() || undefined,
      },
    ]);
    setIsCustomItemModalOpen(false);
    setCustomItemLabel("");
    setCustomItemQty(1);
    setCustomItemNotes("");
    toast.success("Item complementar adicionado.");
  };

  // Validação da Etapa 1
  const handleProceedToStep2 = () => {
    if (!date) {
      toast.error("Selecione a data da aula.");
      return;
    }
    if (!startTime || !endTime) {
      toast.error("Defina os horários de início e término.");
      return;
    }
    if (endTime <= startTime) {
      toast.error("O horário de término deve ser posterior ao horário de início.");
      return;
    }

    const now = new Date();
    const [y, m, d] = date.split("-").map((v) => parseInt(v, 10));
    const [sh, sm] = startTime.split(":").map((v) => parseInt(v, 10));
    const startDateTime = new Date(y, m - 1, d, sh, sm, 0);

    if (startDateTime < new Date(now.getTime() - 5 * 60 * 1000)) {
      const isToday = now.getFullYear() === y && now.getMonth() === (m - 1) && now.getDate() === d;
      if (isToday) {
        toast.error(`O horário selecionado (${startTime}) já passou hoje. Por favor, escolha um horário futuro.`);
      } else {
        toast.error("Não é permitido agendar aulas para datas passadas.");
      }
      return;
    }

    if (startDateTime.getDay() === 0) {
      toast.error("A faculdade não funciona aos domingos. Selecione uma data de segunda-feira a sábado.");
      return;
    }

    if (!roomId) {
      toast.error("Selecione a sala de aula.");
      return;
    }
    if (!professorName.trim()) {
      toast.error("Informe o nome do professor responsável.");
      return;
    }
    setCurrentStep(2);
  };

  // Validação da Etapa 2
  const handleProceedToStep3 = () => {
    setCurrentStep(3);
  };

  // Submissão Final do Agendamento
  const handleSubmitFinal = async () => {
    try {
      setIsSubmitting(true);

      const itemsPayload = selectedItems.map((item) => ({
        itemId: item.itemId || undefined,
        label: item.label,
        quantity: item.quantity,
        notes: item.itemNotes || undefined,
      }));

      // Se solicitou ligar o datashow
      if (turnOnProjector) {
        if (isRoomWithProjector(currentRoom)) {
          const alreadyHasFixed = itemsPayload.some((i) => i.label.toLowerCase().includes("datashow") || i.label.toLowerCase().includes("projetor"));
          if (!alreadyHasFixed) {
            itemsPayload.unshift({
              itemId: undefined,
              label: `Ligar Datashow Fixo (${currentRoom?.name})`,
              quantity: 1,
              notes: `Ligar e testar sinal do projetor fixo (${currentRoom?.fixedProjectorModel || "No teto"}).`,
            });
          }
        } else {
          const hasMobileProj = itemsPayload.some((i) => i.label.toLowerCase().includes("datashow") || i.label.toLowerCase().includes("projetor"));
          if (!hasMobileProj) {
            itemsPayload.unshift({
              itemId: undefined,
              label: `Datashow Móvel para Sala ${currentRoom?.name}`,
              quantity: 1,
              notes: `Instalar e ligar projetor móvel na sala (sala sem projetor fixo).`,
            });
          }
        }
      }

      const payload = {
        date,
        startTime,
        endTime,
        roomId,
        professorName: professorName.trim(),
        discipline: discipline.trim() || undefined,
        attendanceType: attendanceType.trim() || undefined,
        notes: generalNotes.trim() || undefined,
        turnOnProjector,
        items: itemsPayload,
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
        setCreatedSummary({
          date,
          startTime,
          endTime,
          roomName: currentRoom?.name || "Sala Selecionada",
          professorName,
          discipline,
          itemCount: selectedItems.length,
          turnOnProjector,
          repeatWeekly,
          totalWeeks: estimatedWeeks,
        });
        setCurrentStep(4); // Tela de Sucesso
        toast.success(
          repeatWeekly
            ? `Série de ${estimatedWeeks} aulas agendada com sucesso!`
            : "Aula agendada com sucesso e enviada ao Multimídia!"
        );
      } else {
        toast.error(data.error || "Erro ao agendar aula.");
      }
    } catch (err: any) {
      toast.error("Falha ao conectar ao servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Itens filtrados para o catálogo simplificado da Etapa 2
  const filteredCatalog = useMemo(() => {
    if (!Array.isArray(availabilityData)) return [];
    return availabilityData.filter((item) => {
      // Ocultar projetores fixos da lista móvel se a sala já tem fixo
      if (item.logisticsType === "FIXED_IN_ROOM") return false;

      const q = resourceSearch.toLowerCase().trim();
      const matchSearch = !q || item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (resourceCategory === "COMPUTING") {
        return item.name.toLowerCase().includes("notebook") || item.category.toLowerCase().includes("comput") || item.name.toLowerCase().includes("laser") || item.name.toLowerCase().includes("passador");
      }
      if (resourceCategory === "AUDIO") {
        return item.name.toLowerCase().includes("microfone") || item.name.toLowerCase().includes("som") || item.name.toLowerCase().includes("caixa") || item.category.toLowerCase().includes("audio");
      }
      if (resourceCategory === "CABLES") {
        return item.name.toLowerCase().includes("cabo") || item.name.toLowerCase().includes("hdmi") || item.name.toLowerCase().includes("adaptador") || item.name.toLowerCase().includes("extens");
      }

      return true;
    });
  }, [availabilityData, resourceCategory, resourceSearch]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      
      {/* Header com Navegação */}
      <div className="flex items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/agenda">
            <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              <span>Agendar Aula com Multimídia</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Assistente rápido para Apoio Acadêmico solicitar suporte para aulas e eventos.
            </p>
          </div>
        </div>

        {currentStep < 4 && (
          <Badge variant="outline" className="font-mono text-xs px-3 py-1 bg-primary/10 text-primary border-primary/20">
            Etapa {currentStep} de 3
          </Badge>
        )}
      </div>

      {/* Stepper Visual (Etapas 1, 2 e 3) */}
      {currentStep < 4 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4 p-1.5 rounded-2xl bg-muted/40 border border-border/60">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={cn(
              "flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all",
              currentStep === 1
                ? "bg-card text-primary shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
              currentStep === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>1</span>
            <span className="hidden sm:inline">Quando e Onde?</span>
          </button>

          <button
            type="button"
            onClick={() => currentStep > 1 && setCurrentStep(2)}
            disabled={currentStep < 2}
            className={cn(
              "flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all",
              currentStep === 2
                ? "bg-card text-primary shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground disabled:opacity-40"
            )}
          >
            <span className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
              currentStep === 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>2</span>
            <span className="hidden sm:inline">Recursos da Aula</span>
          </button>

          <button
            type="button"
            onClick={() => currentStep > 2 && setCurrentStep(3)}
            disabled={currentStep < 3}
            className={cn(
              "flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all",
              currentStep === 3
                ? "bg-card text-primary shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground disabled:opacity-40"
            )}
          >
            <span className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
              currentStep === 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>3</span>
            <span className="hidden sm:inline">Revisão & Agendamento</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 1: QUANDO, ONDE E QUEM? */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <Card className="rounded-3xl border-border/80 shadow-xs animate-in fade-in-50">
          <CardHeader className="pb-4 border-b border-border/60 bg-muted/20">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span>1. Informações Básicas da Aula</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Informe a data, horários, local e o professor responsável pela aula.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            
            {/* Linha 1: Data e Horários Rápidos */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-foreground">
                      Data da Aula *
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={isTodaySunday}
                        onClick={() => setDate(todayStr)}
                        className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded-md transition-colors",
                          isTodaySunday
                            ? "opacity-40 text-muted-foreground line-through cursor-not-allowed"
                            : date === todayStr
                            ? "bg-primary/20 text-primary border border-primary/30 cursor-pointer"
                            : "text-muted-foreground hover:text-foreground cursor-pointer"
                        )}
                        title={isTodaySunday ? "Hoje é domingo (sem expediente)" : "Selecionar data de hoje"}
                      >
                        {isTodaySunday ? "Hoje (Domingo)" : "Hoje"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDate(isTomorrowSunday ? nextWorkDayStr : tomorrowStr)}
                        className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded-md transition-colors cursor-pointer",
                          (isTomorrowSunday ? date === nextWorkDayStr : date === tomorrowStr)
                            ? "bg-primary/20 text-primary border border-primary/30"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        title={isTomorrowSunday ? "Pular domingo para segunda-feira" : "Selecionar amanhã"}
                      >
                        {isTomorrowSunday ? "Segunda-feira" : "Amanhã"}
                      </button>
                    </div>
                  </div>
                  <input
                    type="date"
                    required
                    min={todayStr}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={cn(
                      "w-full h-11 text-xs font-semibold rounded-xl border bg-background px-3 text-foreground focus:ring-2 focus:ring-primary",
                      isSelectedDateSunday ? "border-rose-500/80 focus:ring-rose-500" : "border-border"
                    )}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1.5">
                    Horário de Início *
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={cn(
                      "w-full h-11 text-xs font-semibold rounded-xl border bg-background px-3 text-foreground focus:ring-2 focus:ring-primary",
                      isSelectedTimeInPast ? "border-rose-500/80 focus:ring-rose-500" : "border-border"
                    )}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1.5">
                    Horário de Término *
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full h-11 text-xs font-semibold rounded-xl border border-border bg-background px-3 text-foreground focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Alerta de Domingo Fechado */}
              {isSelectedDateSunday && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-600 dark:text-rose-400 animate-in fade-in-50">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>
                    <strong>Domingo não permitido:</strong> A instituição não tem funcionamento aos domingos. Por favor, selecione uma data de segunda-feira a sábado.
                  </span>
                </div>
              )}

              {/* Alerta de Horário no Passado */}
              {isSelectedTimeInPast && !isSelectedDateSunday && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-600 dark:text-rose-400 animate-in fade-in-50">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>
                    <strong>Horário não permitido:</strong> O horário selecionado ({startTime}) já passou para a data informada. Por favor, escolha um horário futuro ou avance a data.
                  </span>
                </div>
              )}

              {/* Atalhos Rápidos por Turno */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Atalhos de Horário por Turno:
                  </span>
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">
                    Clique para preencher início e término
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Grupo Manhã */}
                  <div className="p-2.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 px-1 pb-0.5">
                      <span>☀️</span>
                      <span>Manhã</span>
                    </div>
                    <div className="space-y-1">
                      {QUICK_TIME_SLOTS.filter((s) => s.shift === "MORNING").map((slot, i) => {
                        const isPast = isTimeSlotPast(slot.start);
                        const isSelected = startTime === slot.start && endTime === slot.end;
                        return (
                          <button
                            key={i}
                            type="button"
                            disabled={isPast}
                            title={isPast ? "Este horário já passou hoje" : `${slot.label} (${slot.subLabel})`}
                            onClick={() => {
                              setStartTime(slot.start);
                              setEndTime(slot.end);
                            }}
                            className={cn(
                              "w-full flex items-center justify-between py-1.5 px-2.5 rounded-xl text-xs transition-all text-left",
                              isPast
                                ? "opacity-35 bg-muted text-muted-foreground/60 line-through cursor-not-allowed border border-transparent"
                                : isSelected
                                ? "bg-amber-500 text-white font-bold shadow-xs border border-amber-500 cursor-pointer"
                                : "bg-card hover:bg-amber-500/10 text-foreground border border-border/60 hover:border-amber-500/40 cursor-pointer"
                            )}
                          >
                            <span className="font-mono font-medium">{slot.label}</span>
                            <span className={cn(
                              "text-[10px] truncate ml-1",
                              isSelected ? "text-amber-100 font-semibold" : "text-muted-foreground"
                            )}>
                              {slot.subLabel}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Grupo Tarde */}
                  <div className="p-2.5 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 px-1 pb-0.5">
                      <span>🌤️</span>
                      <span>Tarde</span>
                    </div>
                    <div className="space-y-1">
                      {QUICK_TIME_SLOTS.filter((s) => s.shift === "AFTERNOON").map((slot, i) => {
                        const isPast = isTimeSlotPast(slot.start);
                        const isSelected = startTime === slot.start && endTime === slot.end;
                        return (
                          <button
                            key={i}
                            type="button"
                            disabled={isPast}
                            title={isPast ? "Este horário já passou hoje" : `${slot.label} (${slot.subLabel})`}
                            onClick={() => {
                              setStartTime(slot.start);
                              setEndTime(slot.end);
                            }}
                            className={cn(
                              "w-full flex items-center justify-between py-1.5 px-2.5 rounded-xl text-xs transition-all text-left",
                              isPast
                                ? "opacity-35 bg-muted text-muted-foreground/60 line-through cursor-not-allowed border border-transparent"
                                : isSelected
                                ? "bg-blue-600 text-white font-bold shadow-xs border border-blue-600 cursor-pointer"
                                : "bg-card hover:bg-blue-500/10 text-foreground border border-border/60 hover:border-blue-500/40 cursor-pointer"
                            )}
                          >
                            <span className="font-mono font-medium">{slot.label}</span>
                            <span className={cn(
                              "text-[10px] truncate ml-1",
                              isSelected ? "text-blue-100 font-semibold" : "text-muted-foreground"
                            )}>
                              {slot.subLabel}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Grupo Noite */}
                  <div className="p-2.5 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 px-1 pb-0.5">
                      <span>🌙</span>
                      <span>Noite</span>
                    </div>
                    <div className="space-y-1">
                      {QUICK_TIME_SLOTS.filter((s) => s.shift === "NIGHT").map((slot, i) => {
                        const isPast = isTimeSlotPast(slot.start);
                        const isSelected = startTime === slot.start && endTime === slot.end;
                        return (
                          <button
                            key={i}
                            type="button"
                            disabled={isPast}
                            title={isPast ? "Este horário já passou hoje" : `${slot.label} (${slot.subLabel})`}
                            onClick={() => {
                              setStartTime(slot.start);
                              setEndTime(slot.end);
                            }}
                            className={cn(
                              "w-full flex items-center justify-between py-1.5 px-2.5 rounded-xl text-xs transition-all text-left",
                              isPast
                                ? "opacity-35 bg-muted text-muted-foreground/60 line-through cursor-not-allowed border border-transparent"
                                : isSelected
                                ? "bg-purple-600 text-white font-bold shadow-xs border border-purple-600 cursor-pointer"
                                : "bg-card hover:bg-purple-500/10 text-foreground border border-border/60 hover:border-purple-500/40 cursor-pointer"
                            )}
                          >
                            <span className="font-mono font-medium">{slot.label}</span>
                            <span className={cn(
                              "text-[10px] truncate ml-1",
                              isSelected ? "text-purple-100 font-semibold" : "text-muted-foreground"
                            )}>
                              {slot.subLabel}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Linha 2: Sala de Aula - Busca Inteligente */}
            <div className="space-y-3 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span>Sala de Aula / Laboratório *</span>
                </label>
                {currentRoom && !isRoomSelectorOpen && (
                  <span className="text-[11px] text-muted-foreground">
                    Clique em <strong>Trocar Sala</strong> para pesquisar outra
                  </span>
                )}
              </div>

              {/* Modo 1: Sala já Selecionada (Card Rico) */}
              {currentRoom && !isRoomSelectorOpen ? (
                <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in-50">
                  <div className="flex items-center gap-3.5">
                    <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <DoorOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-foreground">{currentRoom.name}</h4>
                        {currentRoom.floor && (
                          <Badge variant="outline" className="text-[10px] font-medium bg-muted/40">
                            {currentRoom.floor}
                          </Badge>
                        )}
                        {currentRoom.block && (
                          <Badge variant="outline" className="text-[10px] font-medium bg-muted/40">
                            {currentRoom.block}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs mt-1 flex items-center gap-1.5">
                        {isRoomWithProjector(currentRoom) ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Projetor Fixo no Teto ({currentRoom.fixedProjectorModel || "Incluso"})
                          </span>
                        ) : (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Tv className="w-3.5 h-3.5 text-muted-foreground" /> Sem projetor fixo (solicite um móvel na etapa 2)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsRoomSelectorOpen(true);
                      setRoomSearch("");
                    }}
                    className="rounded-xl text-xs h-9 px-3.5 gap-1.5 hover:bg-accent cursor-pointer shrink-0 w-full sm:w-auto"
                  >
                    <Search className="w-3.5 h-3.5 text-primary" />
                    <span>Trocar Sala</span>
                  </Button>
                </div>
              ) : (
                /* Modo 2: Busca Inteligente e Seletor Aberto */
                <div className="space-y-3 p-4 rounded-2xl bg-muted/30 border border-border/80 animate-in fade-in-50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-primary" />
                      Buscar por nome, número, andar ou bloco
                    </span>
                    {currentRoom && (
                      <button
                        type="button"
                        onClick={() => setIsRoomSelectorOpen(false)}
                        className="text-[11px] text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <X className="w-3 h-3" /> Cancelar / Manter {currentRoom.name}
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      value={roomSearch}
                      onChange={(e) => setRoomSearch(e.target.value)}
                      placeholder="Digite para buscar: 1A, 204, Lab, Bloco B..."
                      className="pl-10 pr-9 h-11 text-xs rounded-xl bg-background border-border shadow-2xs"
                      autoFocus
                    />
                    {roomSearch && (
                      <button
                        type="button"
                        onClick={() => setRoomSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Filtros Rápidos de Salas */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] text-muted-foreground mr-1">Filtro:</span>
                    <button
                      type="button"
                      onClick={() => setRoomTypeFilter("ALL")}
                      className={cn(
                        "text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer",
                        roomTypeFilter === "ALL"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border/60 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Todas ({rooms.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoomTypeFilter("WITH_PROJECTOR")}
                      className={cn(
                        "text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer",
                        roomTypeFilter === "WITH_PROJECTOR"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border/60 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      📽️ Com Projetor Fixo
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoomTypeFilter("WITHOUT_PROJECTOR")}
                      className={cn(
                        "text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer",
                        roomTypeFilter === "WITHOUT_PROJECTOR"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border/60 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Sem Projetor Fixo
                    </button>

                    {availableFloors.length > 1 && (
                      <select
                        value={roomFloorFilter}
                        onChange={(e) => setRoomFloorFilter(e.target.value)}
                        className="h-7 text-[10px] font-semibold px-2 rounded-lg border border-border/60 bg-background text-foreground cursor-pointer"
                      >
                        <option value="ALL">Todos os Andares</option>
                        {availableFloors.map((floor) => (
                          <option key={floor} value={floor}>{floor}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Grade com Scroll Elegante de Salas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1 pt-1">
                    {filteredRooms.length === 0 ? (
                      <div className="col-span-2 py-6 text-center text-xs text-muted-foreground border border-dashed rounded-xl bg-background/50">
                        Nenhuma sala encontrada com o termo "{roomSearch}".
                      </div>
                    ) : (
                      filteredRooms.map((r) => {
                        const isSelected = r.id === roomId;
                        const hasProj = isRoomWithProjector(r);
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                              setRoomId(r.id);
                              setIsRoomSelectorOpen(false);
                            }}
                            className={cn(
                              "p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-2 cursor-pointer",
                              isSelected
                                ? "bg-primary/10 border-primary shadow-2xs ring-1 ring-primary"
                                : "bg-background border-border/70 hover:border-primary/40 hover:bg-accent/40"
                            )}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-bold text-foreground truncate">{r.name}</p>
                                {r.floor && (
                                  <span className="text-[10px] text-muted-foreground">({r.floor})</span>
                                )}
                              </div>
                              <p className="text-[11px] mt-0.5 truncate">
                                {hasProj ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                    📽️ Projetor Fixo ({r.fixedProjectorModel || "Incluso"})
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">
                                    Sem Projetor Fixo
                                  </span>
                                )}
                              </p>
                            </div>
                            {isSelected ? (
                              <Badge className="bg-primary text-primary-foreground text-[10px] shrink-0">
                                Selecionada ✓
                              </Badge>
                            ) : (
                              <span className="text-[11px] text-primary font-bold shrink-0">
                                Selecionar
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Linha 3: Professor e Disciplina */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  Professor(a) Responsável *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    value={professorName}
                    onChange={(e) => setProfessorName(e.target.value)}
                    placeholder="Ex: Prof. Carlos Silva"
                    className="pl-9 h-11 text-xs rounded-xl"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  Disciplina / Evento (Opcional)
                </label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    value={discipline}
                    onChange={(e) => setDiscipline(e.target.value)}
                    placeholder="Ex: Cálculo I, Defesa de TCC..."
                    className="pl-9 h-11 text-xs rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Botão de Avanço */}
            <div className="pt-4 flex items-center justify-end">
              <Button
                type="button"
                onClick={handleProceedToStep2}
                className="rounded-xl h-11 px-6 text-xs font-bold bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:scale-102 transition-all gap-2"
              >
                <span>Continuar para Recursos</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 2: RECURSOS DA AULA */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <Card className="rounded-3xl border-border/80 shadow-xs animate-in fade-in-50">
          <CardHeader className="pb-4 border-b border-border/60 bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  <span>2. O que esta aula precisa?</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Selecione os equipamentos móveis adicionais que o Multimídia deverá levar até a sala.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCustomItemModalOpen(true)}
                className="rounded-xl text-xs h-8 gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-primary" />
                <span>Outro Acessório</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-5">

            {/* 📽️ SELETOR INTELIGENTE DE LIGAR DATASHOW */}
            <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card shadow-xs space-y-3.5">
              <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "p-2 rounded-xl border transition-colors",
                    turnOnProjector 
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" 
                      : "bg-muted text-muted-foreground border-border"
                  )}>
                    <Tv className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                      <span>É preciso ligar o Datashow / Projetor para esta aula?</span>
                      <span className="text-rose-500 text-xs">*</span>
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {isRoomWithProjector(currentRoom) 
                        ? `A Sala ${currentRoom?.name} possui projetor fixo (${currentRoom?.fixedProjectorModel || "Instalado no teto"}).` 
                        : `A Sala ${currentRoom?.name} não possui projetor fixo instalado.`}
                    </p>
                  </div>
                </div>

                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-[10px] font-bold px-2.5 py-0.5 rounded-full transition-colors",
                    turnOnProjector 
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" 
                      : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                  )}
                >
                  {turnOnProjector ? "Datashow Necessário" : "Projetor Não Necessário"}
                </Badge>
              </div>

              {/* Grid das 2 opções de decisão */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Opção 1: Sim, Ligar Datashow */}
                <button
                  type="button"
                  onClick={() => setTurnOnProjector(true)}
                  className={cn(
                    "p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer group",
                    turnOnProjector
                      ? "bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/30 shadow-xs"
                      : "bg-background border-border/80 hover:border-border hover:bg-muted/30"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-xl shrink-0 mt-0.5 transition-colors",
                    turnOnProjector 
                      ? "bg-emerald-600 text-white shadow-xs shadow-emerald-600/30" 
                      : "bg-muted text-muted-foreground group-hover:bg-muted/80"
                  )}>
                    <Check className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-foreground">
                        Sim, ligar o Datashow
                      </p>
                      {turnOnProjector && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {isRoomWithProjector(currentRoom)
                        ? `A equipe do Multimídia irá à Sala ${currentRoom?.name} antes da aula para ligar o projetor fixo e testar a projeção.`
                        : "A equipe levará e instalará um datashow móvel na sala antes da aula."}
                    </p>
                  </div>
                </button>

                {/* Opção 2: Não precisa de Datashow */}
                <button
                  type="button"
                  onClick={() => setTurnOnProjector(false)}
                  className={cn(
                    "p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer group",
                    !turnOnProjector
                      ? "bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30 shadow-xs"
                      : "bg-background border-border/80 hover:border-border hover:bg-muted/30"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-xl shrink-0 mt-0.5 transition-colors",
                    !turnOnProjector 
                      ? "bg-amber-600 text-white shadow-xs shadow-amber-600/30" 
                      : "bg-muted text-muted-foreground group-hover:bg-muted/80"
                  )}>
                    <X className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-foreground">
                        Não precisa de Datashow
                      </p>
                      {!turnOnProjector && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      O professor não utilizará projeção (economiza lâmpada e dispensa preparação de datashow).
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Categorias de Recursos */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/50">
                {[
                  { id: "ALL", label: "Todos os Recursos" },
                  { id: "COMPUTING", label: "💻 Notebooks" },
                  { id: "AUDIO", label: "🎤 Microfones & Som" },
                  { id: "CABLES", label: "🔌 Cabos & HDMI" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setResourceCategory(cat.id as any)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer",
                      resourceCategory === cat.id
                        ? "bg-card text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={resourceSearch}
                  onChange={(e) => setResourceSearch(e.target.value)}
                  placeholder="Filtrar recursos..."
                  className="pl-8 h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            {/* Grade de Recursos Disponíveis */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
              {isLoadingAvailability ? (
                <div className="col-span-2 py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span>Checando disponibilidade do estoque...</span>
                </div>
              ) : filteredCatalog.length === 0 ? (
                <div className="col-span-2 py-8 text-center text-xs text-muted-foreground border border-dashed rounded-2xl">
                  Nenhum recurso encontrado nesta categoria.
                </div>
              ) : (
                filteredCatalog.map((item) => {
                  const isSelected = selectedItems.some((s) => s.itemId === item.itemId);
                  const selectedQty = selectedItems.find((s) => s.itemId === item.itemId)?.quantity || 1;

                  return (
                    <div
                      key={item.itemId}
                      className={cn(
                        "p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3",
                        isSelected
                          ? "bg-primary/10 border-primary shadow-2xs"
                          : item.isAvailable
                          ? "bg-card border-border/80 hover:border-primary/40"
                          : "bg-muted/40 border-border/40 opacity-60"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{item.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.isAvailable ? (
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                              🟢 {item.availableQuantity} {item.availableQuantity === 1 ? "disponível" : "disponíveis"}
                            </span>
                          ) : (
                            <span className="text-[11px] text-rose-500 font-medium">
                              🔴 Indisponível no horário
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isSelected ? (
                          <div className="flex items-center gap-1.5 bg-background border border-border rounded-xl p-1 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => {
                                const idx = selectedItems.findIndex((s) => s.itemId === item.itemId);
                                if (idx !== -1) {
                                  if (selectedQty > 1) {
                                    handleUpdateQuantity(idx, selectedQty - 1);
                                  } else {
                                    handleRemoveItem(idx);
                                  }
                                }
                              }}
                              className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>

                            <span className="w-6 text-center text-xs font-bold text-foreground">
                              {selectedQty}
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                const idx = selectedItems.findIndex((s) => s.itemId === item.itemId);
                                if (idx !== -1) {
                                  handleUpdateQuantity(idx, selectedQty + 1);
                                }
                              }}
                              disabled={selectedQty >= item.availableQuantity}
                              className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent disabled:opacity-30"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            disabled={!item.isAvailable}
                            onClick={() => handleToggleItem(item)}
                            className="rounded-xl h-8 px-3 text-xs font-bold bg-card text-foreground hover:bg-primary hover:text-primary-foreground border border-border"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            Adicionar
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Resumo dos Itens Selecionados */}
            <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-2">
              <span className="text-xs font-bold text-foreground block">
                Itens selecionados para levar ({selectedItems.length}):
              </span>
              {selectedItems.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic">
                  Nenhum equipamento móvel selecionado. (Apenas o projetor fixo da sala será utilizado).
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedItems.map((item, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="text-xs py-1 px-2.5 rounded-xl flex items-center gap-1.5 bg-card border border-border/80"
                    >
                      <span className="font-bold">{item.quantity}x</span>
                      <span>{item.label}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-muted-foreground hover:text-rose-500 ml-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Botões de Navegação */}
            <div className="pt-4 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="rounded-xl h-11 px-5 text-xs font-semibold gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </Button>

              <Button
                type="button"
                onClick={handleProceedToStep3}
                className="rounded-xl h-11 px-6 text-xs font-bold bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:scale-102 transition-all gap-2"
              >
                <span>Revisar Agendamento</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 3: REVISÃO & AGENDAMENTO */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <Card className="rounded-3xl border-border/80 shadow-xs animate-in fade-in-50">
          <CardHeader className="pb-4 border-b border-border/60 bg-muted/20">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>3. Revisão da Aula e Recorrência</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Verifique os detalhes antes de confirmar o agendamento no sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-5">

            {/* Card de Resumo Visual */}
            <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-3 flex-wrap gap-2">
                <div>
                  <h3 className="font-bold text-sm text-foreground">
                    {discipline ? `${discipline} • ` : ""}Prof. {professorName}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {attendanceType || "Aula Teórica"}
                  </p>
                </div>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-bold">
                  🟢 Recursos Disponíveis
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <Calendar className="w-4 h-4 text-primary shrink-0" />
                  <span>Data: <strong className="text-foreground">{new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</strong></span>
                </div>

                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <Clock className="w-4 h-4 text-primary shrink-0" />
                  <span>Horário: <strong className="text-foreground">{startTime} às {endTime}</strong></span>
                </div>

                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <span>Local: <strong className="text-foreground">{currentRoom?.name || "Sala Selecionada"}</strong></span>
                </div>

                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <Tv className="w-4 h-4 text-primary shrink-0" />
                  <span>
                    Ligar Datashow:{" "}
                    <strong className={turnOnProjector ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-amber-600 dark:text-amber-400 font-bold"}>
                      {turnOnProjector 
                        ? (isRoomWithProjector(currentRoom) ? `Sim, ligar projetor fixo ✅ (${currentRoom?.fixedProjectorModel || "No teto"})` : "Sim, levar datashow móvel ✅") 
                        : "Não precisa ligar ⏹️"}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Lista de Recursos Solicitados */}
              <div className="pt-3 border-t border-border/50">
                <span className="text-xs font-bold text-foreground block mb-2">
                  Recursos a serem entregues pelo Multimídia:
                </span>
                {selectedItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {turnOnProjector 
                      ? "✓ Apenas acionamento do projetor instalado na sala." 
                      : "✓ Nenhum equipamento extra solicitado para entrega física."}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedItems.map((item, i) => (
                      <span key={i} className="text-xs bg-muted/60 px-2.5 py-1 rounded-lg border border-border/60 font-semibold text-foreground">
                        {item.quantity}x {item.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bloco de Recorrência Simples */}
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
                    Repetir esta aula toda semana durante o período
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Gera automaticamente as aulas semanais para o semestre todo.
                  </p>
                </div>
              </label>

              {repeatWeekly && (
                <div className="pt-2 border-t border-border/60 space-y-3 animate-in fade-in-50">
                  <div className="flex items-center gap-2 flex-wrap">
                    {[
                      { id: "SEMESTER", label: "Semestre Letivo (~18 aulas)" },
                      { id: "MONTH", label: "1 Mês (4 aulas)" },
                      { id: "CUSTOM", label: "Data Específica" },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => handleSetRecurrenceMode(mode.id as any)}
                        className={cn(
                          "px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer",
                          recurrenceMode === mode.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>

                  {recurrenceMode === "CUSTOM" && (
                    <div>
                      <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                        Repetir até a data:
                      </label>
                      <input
                        type="date"
                        value={repeatUntilDate}
                        onChange={(e) => setRepeatUntilDate(e.target.value)}
                        className="h-9 px-3 text-xs rounded-xl border border-border bg-background"
                      />
                    </div>
                  )}

                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                    <Check className="w-4 h-4" />
                    <span>Total de <strong>{estimatedWeeks} aulas</strong> serão agendadas com esta configuração.</span>
                  </p>
                </div>
              )}
            </div>

            {/* Observações Gerais */}
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Observações para a equipe do Multimídia (Opcional)
              </label>
              <textarea
                rows={2}
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder="Ex: Aula de laboratório prático, professor precisa de extensão elétrica..."
                className="w-full p-3 rounded-xl border border-border bg-background text-xs text-foreground focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            {/* Botões Finais de Confirmação */}
            <div className="pt-4 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(2)}
                disabled={isSubmitting}
                className="rounded-xl h-11 px-5 text-xs font-semibold gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </Button>

              <Button
                type="button"
                onClick={handleSubmitFinal}
                disabled={isSubmitting}
                className="rounded-xl h-11 px-8 text-xs font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:scale-102 transition-all gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Agendando Aula...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirmar e Agendar Aula</span>
                  </>
                )}
              </Button>
            </div>

          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 4: TELA DE SUCESSO ACOLHEDORA */}
      {/* ========================================================================= */}
      {currentStep === 4 && createdSummary && (
        <Card className="rounded-3xl border-border/80 shadow-lg text-center p-8 space-y-6 animate-in zoom-in-95">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mx-auto shadow-md shadow-emerald-500/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-foreground">
              Aula Agendada com Sucesso!
            </h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              A equipe do Multimídia já foi notificada para preparar e entregar os equipamentos na sala no horário correto.
            </p>
          </div>

          {/* Resumo da Aula */}
          <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 max-w-lg mx-auto text-left space-y-2 text-xs">
            <div className="flex justify-between border-b border-border/40 pb-2">
              <span className="text-muted-foreground">Professor:</span>
              <strong className="text-foreground">{createdSummary.professorName}</strong>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-2">
              <span className="text-muted-foreground">Sala & Horário:</span>
              <strong className="text-foreground">{createdSummary.roomName} • {createdSummary.startTime} às {createdSummary.endTime}</strong>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-2">
              <span className="text-muted-foreground">Datashow / Projeção:</span>
              <strong className={createdSummary.turnOnProjector ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-amber-600 dark:text-amber-400 font-bold"}>
                {createdSummary.turnOnProjector ? "Ligar Datashow antes da aula ✅" : "Não precisa ligar ⏹️"}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Recorrência:</span>
              <strong className="text-foreground">
                {createdSummary.repeatWeekly ? `Série Semanal (${createdSummary.totalWeeks} aulas)` : "Aula única"}
              </strong>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelectedItems([]);
                setProfessorName("");
                setDiscipline("");
                setCurrentStep(1);
              }}
              className="rounded-xl h-11 px-5 text-xs font-semibold gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Agendar Outra Aula</span>
            </Button>

            <Button
              type="button"
              onClick={() => router.push("/agenda")}
              className="rounded-xl h-11 px-6 text-xs font-bold bg-primary text-primary-foreground shadow-md shadow-primary/25 gap-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Ver na Agenda</span>
            </Button>
          </div>
        </Card>
      )}

      {/* 🎙️ Modal Inteligente de Microfone e Caixa de Som */}
      <Dialog open={isMicModalOpen} onOpenChange={setIsMicModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                <Volume2 className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Deseja incluir uma Caixa de Som?
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Item selecionado: <strong>{pendingMicItem?.name}</strong>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-3 text-xs text-foreground space-y-2.5">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-300">
              <p className="font-semibold">🎙️ Você selecionou um microfone!</p>
              <p className="text-[11px] opacity-90 mt-1">
                Temos <strong>{matchingSpeakerItem?.availableQuantity} Caixa(s) de Som</strong> disponíveis. Deseja que a equipe leve uma caixa amplificada para a sala?
              </p>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleConfirmMicWithSpeaker(false)}
              className="rounded-xl text-xs h-10 px-4"
            >
              Apenas o Microfone
            </Button>
            <Button
              type="button"
              onClick={() => handleConfirmMicWithSpeaker(true)}
              className="rounded-xl text-xs font-bold h-10 px-5 bg-primary text-primary-foreground shadow-md"
            >
              <Check className="w-3.5 h-3.5 mr-1.5" />
              Sim, Incluir Caixa de Som
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Item Complementar / Customizado */}
      <Dialog open={isCustomItemModalOpen} onOpenChange={setIsCustomItemModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Adicionar Outro Acessório
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Solicite itens que não constam na lista padrão de equipamentos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Descrição do Item *</label>
              <Input
                placeholder="Ex: Adaptador USB-C para HDMI, Extensão de 10m..."
                value={customItemLabel}
                onChange={(e) => setCustomItemLabel(e.target.value)}
                className="h-10 text-xs rounded-xl"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Quantidade:</label>
                <Input
                  type="number"
                  min={1}
                  max={999}
                  value={customItemQty}
                  onChange={(e) => setCustomItemQty(parseInt(e.target.value, 10) || 1)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Observação:</label>
                <Input
                  placeholder="Opcional"
                  value={customItemNotes}
                  onChange={(e) => setCustomItemNotes(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCustomItemModalOpen(false)}
              className="rounded-xl text-xs h-10 px-4"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleAddCustomItem}
              className="rounded-xl text-xs font-bold h-10 px-5 bg-primary text-primary-foreground"
            >
              Adicionar Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
