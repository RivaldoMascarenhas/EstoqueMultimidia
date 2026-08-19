"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Wrench, 
  X, 
  AlertTriangle, 
  Building2, 
  DollarSign, 
  User, 
  Phone, 
  FileText, 
  Check, 
  Tag,
  ShieldAlert,
  Home,
  ShieldCheck,
  MapPin,
  Search,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  Clock,
  Sparkles
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MaintenanceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preSelectedAssetId?: string;
}

const INTERNAL_ISSUES = [
  "Limpeza de cooler / desobstrução de ventilação",
  "Troca de lâmpada do estoque interno",
  "Cabo HDMI / conector com mau contato",
  "Ajuste de foco / alinhamento óptico",
  "Reset de configurações / firmware",
  "Ajuste de carcaça / fixação física",
  "Ruído excessivo na ventilação",
  "Verificação de áudio e conexões",
];

const EXTERNAL_ISSUES = [
  "Não liga / circuito da fonte inoperante",
  "Sem sinal de vídeo / queima de placa lógica",
  "Bloco óptico danificado / manchas na projeção",
  "Reator da lâmpada avariado",
  "Avaria estrutural física grave / reparo autorizado",
  "Defeito em período de garantia do fabricante",
];

const PREVENTIVE_ISSUES = [
  "Limpeza preventiva completa & aspiração",
  "Troca e higienização de filtros de ar",
  "Aferição de horímetro & calibração de cores",
  "Revisão geral de cabos e conectores",
];

const COMMON_PROVIDERS = [
  "Epson Assistência Autorizada",
  "Assistência Multimídia Cariri",
  "Eletrônica & Áudio Profissional",
  "Laboratório Autorizado Juazeiro",
];

const INTERNAL_LOCATIONS = [
  "Bancada TI - Sala Multimídia",
  "Laboratório de Informática",
  "No próprio local / Sala de Aula",
];

const DEADLINE_OPTIONS = [
  { id: "24h", label: "⚡ 24h (Urgente)" },
  { id: "48h", label: "⏱️ 48h (Padrão)" },
  { id: "5d", label: "📅 5 dias úteis" },
  { id: "15d", label: "🏢 15 dias (Externa)" },
];

export function MaintenanceFormModal({
  isOpen,
  onClose,
  onSuccess,
  preSelectedAssetId,
}: MaintenanceFormModalProps) {
  const [eligibleAssets, setEligibleAssets] = useState<any[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assetSearchQuery, setAssetSearchQuery] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const issueInputRef = useRef<HTMLTextAreaElement>(null);

  // Form State
  const [assetId, setAssetId] = useState(preSelectedAssetId || "");
  const [issueDescription, setIssueDescription] = useState("");
  const [maintenanceType, setMaintenanceType] = useState<"INTERNAL" | "EXTERNAL" | "PREVENTIVE">("INTERNAL");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
  const [estimatedDeadline, setEstimatedDeadline] = useState("48h");
  const [internalLocation, setInternalLocation] = useState("Bancada TI - Sala Multimídia");
  const [serviceProvider, setServiceProvider] = useState("");
  const [cost, setCost] = useState("");
  const [hasCost, setHasCost] = useState(false);
  const [diagnosis, setDiagnosis] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [technicalNotes, setTechnicalNotes] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchEligibleAssets();
      if (preSelectedAssetId) {
        setAssetId(preSelectedAssetId);
        setTimeout(() => issueInputRef.current?.focus(), 150);
      }
      setAssetSearchQuery("");
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  }, [isOpen, preSelectedAssetId]);

  const fetchEligibleAssets = async () => {
    try {
      setIsLoadingAssets(true);
      const res = await fetch("/api/v1/maintenances/eligible-assets");
      const json = await res.json();
      if (json.success) {
        setEligibleAssets(json.data);
      }
    } catch (err) {
      toast.error("Erro ao carregar equipamentos disponíveis.");
    } finally {
      setIsLoadingAssets(false);
    }
  };

  const selectedAsset = useMemo(() => {
    return eligibleAssets.find((a) => a.id === assetId);
  }, [eligibleAssets, assetId]);

  const filteredAssets = useMemo(() => {
    if (!assetSearchQuery.trim()) return eligibleAssets;
    const q = assetSearchQuery.toLowerCase().trim();
    return eligibleAssets.filter((asset) => {
      const tag = (asset.assetTag || "").toLowerCase();
      const name = (asset.item?.name || "").toLowerCase();
      const model = (asset.model || asset.item?.model || "").toLowerCase();
      const serial = (asset.serialNumber || "").toLowerCase();
      const box = (asset.currentBox?.name || "").toLowerCase();
      const door = (asset.currentBox?.door?.name || "").toLowerCase();
      return tag.includes(q) || name.includes(q) || model.includes(q) || serial.includes(q) || box.includes(q) || door.includes(q);
    });
  }, [eligibleAssets, assetSearchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!assetId) {
      toast.error("Selecione um equipamento patrimonial para manutenção.");
      return;
    }

    if (!issueDescription.trim() || issueDescription.trim().length < 3) {
      toast.error("Descreva o defeito ou motivo do chamado (mínimo 3 caracteres).");
      return;
    }

    if (maintenanceType === "EXTERNAL" && !serviceProvider.trim()) {
      toast.error("Informe o nome da assistência técnica ou prestador externo.");
      return;
    }

    try {
      setIsSubmitting(true);

      const deadlineNote = `[Prazo Estimado: ${DEADLINE_OPTIONS.find((d) => d.id === estimatedDeadline)?.label || estimatedDeadline}]`;
      const locationNote = maintenanceType === "INTERNAL" || maintenanceType === "PREVENTIVE"
        ? `[Local: ${internalLocation}]`
        : "";

      const notesCombined = [locationNote, deadlineNote, technicalNotes.trim()]
        .filter(Boolean)
        .join(" ")
        .trim();

      const payload = {
        assetId,
        issueDescription: issueDescription.trim(),
        maintenanceType,
        priority,
        serviceProvider: maintenanceType === "EXTERNAL" 
          ? serviceProvider.trim() || undefined 
          : "Laboratório Interno Suporte TI",
        cost: (maintenanceType === "EXTERNAL" || hasCost) && cost 
          ? parseFloat(cost.replace(",", ".")) 
          : undefined,
        diagnosis: diagnosis.trim() || undefined,
        contactName: maintenanceType === "EXTERNAL" ? contactName.trim() || undefined : undefined,
        contactPhone: maintenanceType === "EXTERNAL" ? contactPhone.trim() || undefined : undefined,
        technicalNotes: notesCombined || undefined,
      };

      const res = await fetch("/api/v1/maintenances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Erro ao abrir chamado de manutenção.");
      }

      toast.success(
        maintenanceType === "INTERNAL"
          ? "Ordem de Serviço Interna aberta com sucesso!"
          : maintenanceType === "EXTERNAL"
          ? "Ordem de Serviço Externa aberta com sucesso!"
          : "Ordem de Serviço Preventiva aberta com sucesso!"
      );
      resetForm();
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Falha na comunicação com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setAssetId("");
    setAssetSearchQuery("");
    setIssueDescription("");
    setMaintenanceType("INTERNAL");
    setPriority("MEDIUM");
    setEstimatedDeadline("48h");
    setInternalLocation("Bancada TI - Sala Multimídia");
    setServiceProvider("");
    setCost("");
    setHasCost(false);
    setDiagnosis("");
    setContactName("");
    setContactPhone("");
    setTechnicalNotes("");
  };

  const getQuickIssues = () => {
    switch (maintenanceType) {
      case "PREVENTIVE": return PREVENTIVE_ISSUES;
      case "EXTERNAL": return EXTERNAL_ISSUES;
      default: return INTERNAL_ISSUES;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent hideClose className="max-w-4xl max-h-[94vh] flex flex-col p-0 overflow-hidden rounded-3xl bg-card border-border shadow-2xl gap-0">
        
        {/* 1. HEADER FIXO ELEGANTE */}
        <div className="px-6 py-4 border-b border-border/80 flex items-center justify-between bg-accent/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md transition-all shrink-0",
              maintenanceType === "INTERNAL" 
                ? "bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-500/25"
                : maintenanceType === "EXTERNAL"
                ? "bg-gradient-to-tr from-purple-600 to-pink-600 shadow-purple-500/25"
                : "bg-gradient-to-tr from-cyan-600 to-teal-600 shadow-cyan-500/25"
            )}>
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  Abertura de Ordem de Serviço (OS)
                </DialogTitle>
                <Badge variant="outline" className="font-mono text-[10px] font-bold bg-background/80 border-border text-muted-foreground px-2 py-0.5 shadow-2xs">
                  Protocolo: OS-{new Date().getFullYear()}-NOVA
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {maintenanceType === "INTERNAL"
                  ? "Reparo e testes executados no laboratório do Suporte TI"
                  : maintenanceType === "EXTERNAL"
                  ? "Envio de equipamento para fornecedor ou assistência autorizada"
                  : "Rotina periódica de limpeza, troca de filtros e revisão preventiva"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 2. SELETOR VISUAL FIXO DE TIPO NO TOPO */}
        <div className="px-6 pt-3 pb-3 border-b border-border/60 bg-muted/20 shrink-0">
          <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-muted/60 border border-border/60 max-w-2xl mx-auto">
            <button
              type="button"
              onClick={() => {
                setMaintenanceType("INTERNAL");
                setServiceProvider("");
              }}
              className={cn(
                "flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer",
                maintenanceType === "INTERNAL"
                  ? "bg-card text-blue-600 dark:text-blue-400 shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/40"
              )}
            >
              <Home className="w-3.5 h-3.5 text-blue-500" />
              <span>🛠️ Manutenção Interna</span>
            </button>

            <button
              type="button"
              onClick={() => setMaintenanceType("EXTERNAL")}
              className={cn(
                "flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer",
                maintenanceType === "EXTERNAL"
                  ? "bg-card text-purple-600 dark:text-purple-400 shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/40"
              )}
            >
              <Building2 className="w-3.5 h-3.5 text-purple-500" />
              <span>🏢 Assistência Externa</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMaintenanceType("PREVENTIVE");
                setServiceProvider("");
              }}
              className={cn(
                "flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer",
                maintenanceType === "PREVENTIVE"
                  ? "bg-card text-cyan-600 dark:text-cyan-400 shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/40"
              )}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
              <span>🛡️ Preventiva</span>
            </button>
          </div>
        </div>

        {/* 3. CORPO DO FORMULÁRIO COM DUAS COLUNAS */}
        <form 
          id="maintenance-create-form" 
          onSubmit={handleSubmit} 
          className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            
            {/* === COLUNA ESQUERDA: EQUIPAMENTO COM BUSCA, DEFEITO E PRIORIDADE === */}
            <div className="space-y-4">
              
              {/* Seleção do Equipamento com Busca Rápida */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-primary" />
                    <span>Equipamento Patrimonial</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    {eligibleAssets.length} disponíveis
                  </span>
                </div>

                {/* Se um equipamento já estiver selecionado, exibe card elegante */}
                {selectedAsset ? (
                  <div className="p-3.5 rounded-2xl bg-accent/40 border border-border/80 flex items-center justify-between gap-3 shadow-xs animate-in fade-in-50">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary font-mono font-bold text-xs border border-primary/20">
                        #{selectedAsset.assetTag}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-sm text-foreground truncate">
                            {selectedAsset.item?.name}
                          </p>
                          <Badge variant={selectedAsset.status === "DAMAGED" ? "damaged" : "available"} className="text-[10px] py-0.5 px-2">
                            {selectedAsset.status === "DAMAGED" ? "Avariado" : "Disponível"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {selectedAsset.model ? `Modelo: ${selectedAsset.model} • ` : ""}
                          {selectedAsset.currentBox ? `${selectedAsset.currentBox.door?.name || "Armário"} / ${selectedAsset.currentBox.name}` : "Sem caixa"}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAssetId("");
                        setAssetSearchQuery("");
                      }}
                      className="rounded-xl h-9 px-3.5 text-xs font-semibold text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      Trocar
                    </Button>
                  </div>
                ) : (
                  /* Campo de Busca Interativa + Lista de Resultados */
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        value={assetSearchQuery}
                        onChange={(e) => setAssetSearchQuery(e.target.value)}
                        placeholder="Buscar por patrimônio, modelo ou nome (ex: 042, Epson, microfone)..."
                        className="pl-10 pr-9 h-11 rounded-xl text-sm bg-background border-input focus:ring-2 focus:ring-primary"
                        autoFocus={!preSelectedAssetId}
                      />
                      {assetSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setAssetSearchQuery("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Lista com scroll confortável */}
                    <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 rounded-2xl border border-border/80 p-2 bg-muted/20">
                      {isLoadingAssets ? (
                        <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          <span>Carregando equipamentos...</span>
                        </div>
                      ) : filteredAssets.length === 0 ? (
                        <div className="py-5 text-center text-xs text-muted-foreground">
                          Nenhum equipamento encontrado para "{assetSearchQuery}".
                        </div>
                      ) : (
                        filteredAssets.map((asset) => (
                          <button
                            key={asset.id}
                            type="button"
                            onClick={() => {
                              setAssetId(asset.id);
                              setAssetSearchQuery("");
                              setTimeout(() => issueInputRef.current?.focus(), 100);
                            }}
                            className="w-full flex items-center justify-between p-2.5 rounded-xl border border-transparent hover:border-primary/40 bg-card hover:bg-accent/70 transition-all text-left group cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="px-2.5 py-1 rounded-lg bg-muted text-foreground font-mono text-xs font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                                #{asset.assetTag}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                                  {asset.item?.name} {asset.model ? `• ${asset.model}` : ""}
                                </p>
                                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                  {asset.currentBox ? `${asset.currentBox.door?.name || "Armário"} / ${asset.currentBox.name}` : "Sem caixa"}
                                </p>
                              </div>
                            </div>

                            <Badge variant={asset.status === "DAMAGED" ? "damaged" : "available"} className="text-[10px] py-0.5 px-2 shrink-0">
                              {asset.status === "DAMAGED" ? "Avaria" : "Disponível"}
                            </Badge>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Defeito Relatado */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    <span>Defeito / Motivo do Chamado</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-primary" />
                    Sugestões rápidas
                  </span>
                </div>

                <textarea
                  ref={issueInputRef}
                  rows={2}
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder={
                    maintenanceType === "INTERNAL"
                      ? "Descreva o sintoma observado para o laboratório de TI..."
                      : maintenanceType === "EXTERNAL"
                      ? "Descreva a falha para o laudo de envio à assistência..."
                      : "Descreva os itens para inspeção preventiva..."
                  }
                  className="w-full p-3 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all resize-none"
                />

                {/* Tags de Sintomas Dinâmicas */}
                <div className="flex flex-wrap gap-1.5 pt-0.5 max-h-20 overflow-y-auto">
                  {getQuickIssues().map((issue, idx) => {
                    const isSelected = issueDescription === issue;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setIssueDescription(issue)}
                        className={cn(
                          "text-[11px] px-2.5 py-1 rounded-lg border transition-all text-left cursor-pointer",
                          isSelected
                            ? "bg-primary text-primary-foreground font-bold border-primary shadow-2xs"
                            : "bg-accent/60 hover:bg-accent text-muted-foreground hover:text-foreground border-border/50"
                        )}
                      >
                        {isSelected ? "✓ " : "+ "}{issue}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nível de Prioridade */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Nível de Prioridade
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: "LOW", label: "Baixa", color: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30" },
                    { id: "MEDIUM", label: "Média", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30" },
                    { id: "HIGH", label: "Alta", color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
                    { id: "CRITICAL", label: "Crítica", color: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30" },
                  ].map((p) => {
                    const isSelected = priority === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPriority(p.id as any)}
                        className={`py-2 text-xs font-semibold rounded-xl border transition-all text-center cursor-pointer ${
                          isSelected 
                            ? `${p.color} border-current ring-1 ring-current shadow-xs font-bold` 
                            : "bg-background border-input text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* === COLUNA DIREITA: DADOS ESPECÍFICOS (INTERNA vs EXTERNA) === */}
            <div className="space-y-4">
              
              {/* SEÇÃO 1: MANUTENÇÃO INTERNA / PREVENTIVA */}
              {(maintenanceType === "INTERNAL" || maintenanceType === "PREVENTIVE") && (
                <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-3.5 animate-in fade-in-50">
                  <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 font-semibold text-xs border-b border-blue-500/20 pb-2">
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4" />
                      <span>Detalhes da Bancada Interna de TI</span>
                    </div>
                    <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30">
                      Sem custo externo
                    </Badge>
                  </div>

                  {/* Local do Reparo & Prazo Estimado */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground flex items-center gap-1.5 h-5">
                        <MapPin className="h-3.5 w-3.5 text-blue-500" />
                        <span>Posto / Local</span>
                      </label>
                      <div className="relative">
                        <select
                          value={internalLocation}
                          onChange={(e) => setInternalLocation(e.target.value)}
                          className="w-full h-10 pl-3.5 pr-8 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none appearance-none cursor-pointer"
                        >
                          {INTERNAL_LOCATIONS.map((loc, i) => (
                            <option key={i} value={loc}>{loc}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground flex items-center gap-1.5 h-5">
                        <Clock className="h-3.5 w-3.5 text-blue-500" />
                        <span>Previsão de Retorno</span>
                      </label>
                      <div className="relative">
                        <select
                          value={estimatedDeadline}
                          onChange={(e) => setEstimatedDeadline(e.target.value)}
                          className="w-full h-10 pl-3.5 pr-8 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none appearance-none cursor-pointer"
                        >
                          {DEADLINE_OPTIONS.map((d) => (
                            <option key={d.id} value={d.id}>{d.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Diagnóstico Preliminar */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5 h-5">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Procedimentos Iniciais & Notas Técnicas</span>
                    </label>
                    <textarea
                      rows={2}
                      value={technicalNotes}
                      onChange={(e) => setTechnicalNotes(e.target.value)}
                      placeholder="Testes preliminares, cabos verificados, insumos necessários..."
                      className="w-full p-3 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all resize-none"
                    />
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    ℹ️ Manutenção executada pela equipe interna do Suporte Multimídia. O equipamento fica indisponível para empréstimo.
                  </p>
                </div>
              )}

              {/* SEÇÃO 2: MANUTENÇÃO EXTERNA / FORNECEDOR */}
              {maintenanceType === "EXTERNAL" && (
                <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-3.5 animate-in fade-in-50">
                  <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 font-semibold text-xs border-b border-purple-500/20 pb-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      <span>Assistência Técnica / Fornecedor</span>
                    </div>
                    <Badge variant="outline" className="text-[9px] bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30">
                      Terceirizado
                    </Badge>
                  </div>

                  {/* Prestador e Orçamento Previsto */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground flex items-center gap-1.5 h-5">
                        <Building2 className="h-3.5 w-3.5 text-purple-500" />
                        <span>Empresa / Assistência</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        value={serviceProvider}
                        onChange={(e) => setServiceProvider(e.target.value)}
                        placeholder="Ex: Epson Autorizada"
                        className="h-10 rounded-xl text-xs"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground flex items-center gap-1.5 h-5">
                        <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Orçamento Previsto (R$)</span>
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={cost}
                        onChange={(e) => setCost(e.target.value)}
                        placeholder="0,00"
                        className="h-10 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  {/* Atalhos de Fornecedores */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-muted-foreground font-medium">Sugestões rápidas:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_PROVIDERS.map((prov, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setServiceProvider(prov)}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 border border-purple-500/20 transition-colors cursor-pointer"
                        >
                          + {prov}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Contato e WhatsApp */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground flex items-center gap-1.5 h-5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Nome do Contato</span>
                      </label>
                      <Input
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Ex: Carlos (Técnico)"
                        className="h-10 rounded-xl text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground flex items-center gap-1.5 h-5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>WhatsApp do Prestador</span>
                      </label>
                      <Input
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="(88) 99999-9999"
                        className="h-10 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  {/* Notas de Envio */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5 h-5">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Notas de Envio / Remessa</span>
                    </label>
                    <textarea
                      rows={2}
                      value={technicalNotes}
                      onChange={(e) => setTechnicalNotes(e.target.value)}
                      placeholder="Instruções de envio, prazos combinados..."
                      className="w-full p-3 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Aviso Institucional */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
                <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                  O equipamento passará automaticamente para o status <strong>EM MANUTENÇÃO</strong> e ficará bloqueado para novos empréstimos até a conclusão e devolução física ao armário.
                </p>
              </div>

            </div>

          </div>
        </form>

        {/* 4. FOOTER FIXO */}
        <div className="p-4 px-6 border-t border-border/80 bg-muted/20 flex items-center justify-between shrink-0">
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Bloqueio automático de empréstimo ativo</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl h-10 px-4 text-xs cursor-pointer"
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              form="maintenance-create-form"
              disabled={isSubmitting}
              className={cn(
                "rounded-xl h-10 px-5 text-xs font-semibold gap-2 text-white shadow-md cursor-pointer transition-all",
                maintenanceType === "INTERNAL"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/20"
                  : maintenanceType === "EXTERNAL"
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-purple-500/20"
                  : "bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 shadow-cyan-500/20"
              )}
            >
              {isSubmitting ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Gerando OS...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>
                    {maintenanceType === "INTERNAL"
                      ? "Abrir OS Interna"
                      : maintenanceType === "EXTERNAL"
                      ? "Abrir OS Externa"
                      : "Abrir OS Preventiva"}
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
