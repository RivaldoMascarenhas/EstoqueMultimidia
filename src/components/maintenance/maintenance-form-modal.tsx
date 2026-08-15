"use client";

import React, { useState, useEffect } from "react";
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
  Sparkles,
  Layers,
  Tag,
  Clock,
  ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface MaintenanceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preSelectedAssetId?: string;
}

const COMMON_ISSUES = [
  "Lâmpada queimada / aviso de vida útil esgotada",
  "Sem sinal HDMI / falha na transmissão de vídeo",
  "Não liga / fonte de alimentação inoperante",
  "Superaquecimento / cooler travado ou obstruído",
  "Imagem com distorção de cores / linhas na tela",
  "Conector quebrado / porta física avariada",
  "Limpeza preventiva completa & troca de filtros",
  "Ruído excessivo / falha no circuito de áudio",
];

const COMMON_PROVIDERS = [
  "Laboratório Interno de Suporte UniFAP",
  "Epson Assistência Autorizada",
  "Assistência Multimídia Cariri",
  "Eletrônica & Áudio Profissional",
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

  // Form State
  const [assetId, setAssetId] = useState(preSelectedAssetId || "");
  const [issueDescription, setIssueDescription] = useState("");
  const [maintenanceType, setMaintenanceType] = useState<"CORRECTIVE" | "PREVENTIVE" | "EXTERNAL" | "INTERNAL">("CORRECTIVE");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
  const [serviceProvider, setServiceProvider] = useState("");
  const [cost, setCost] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [technicalNotes, setTechnicalNotes] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchEligibleAssets();
      if (preSelectedAssetId) {
        setAssetId(preSelectedAssetId);
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

  const selectedAsset = eligibleAssets.find((a) => a.id === assetId);

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

    try {
      setIsSubmitting(true);

      const payload = {
        assetId,
        issueDescription: issueDescription.trim(),
        maintenanceType,
        priority,
        serviceProvider: serviceProvider.trim() || undefined,
        cost: cost ? parseFloat(cost.replace(",", ".")) : undefined,
        diagnosis: diagnosis.trim() || undefined,
        contactName: contactName.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        technicalNotes: technicalNotes.trim() || undefined,
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

      toast.success(json.message || "Ordem de Serviço aberta com sucesso!");
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
    setIssueDescription("");
    setMaintenanceType("CORRECTIVE");
    setPriority("MEDIUM");
    setServiceProvider("");
    setCost("");
    setDiagnosis("");
    setContactName("");
    setContactPhone("");
    setTechnicalNotes("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in-0 duration-200">
      <div className="relative w-full max-w-2xl bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-border/80 flex items-center justify-between bg-accent/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                Abertura de Ordem de Serviço (OS)
              </h2>
              <p className="text-xs text-muted-foreground">
                Envio de equipamento para manutenção técnica, troca de peças ou assistência externa
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6">
          
          {/* Seleção do Equipamento */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-primary" />
              Equipamento Patrimonial <span className="text-rose-500">*</span>
            </label>
            
            <select
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              disabled={isLoadingAssets}
              className="w-full h-11 px-3.5 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all disabled:opacity-60"
            >
              <option value="">-- Selecione o equipamento que precisa de reparo --</option>
              {eligibleAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  #{asset.assetTag} - {asset.item.name} {asset.model ? `(${asset.model})` : ""} - {asset.currentBox ? `${asset.currentBox.door?.name || "Armário"} / ${asset.currentBox.name}` : "Sem caixa"} [{asset.status === "DAMAGED" ? "⚠️ COM AVARIA" : "DISPONÍVEL"}]
                </option>
              ))}
            </select>

            {/* Preview do Equipamento Selecionado */}
            {selectedAsset && (
              <div className="mt-2 p-3 rounded-xl bg-accent/40 border border-border/60 flex items-center justify-between text-xs animate-in fade-in-50">
                <div className="space-y-0.5">
                  <p className="font-semibold text-foreground">
                    {selectedAsset.item.name} {selectedAsset.model ? `• ${selectedAsset.model}` : ""}
                  </p>
                  <p className="text-muted-foreground flex items-center gap-2">
                    <span>Patrimônio: <strong className="text-foreground">#{selectedAsset.assetTag}</strong></span>
                    {selectedAsset.serialNumber && (
                      <span>• N/S: {selectedAsset.serialNumber}</span>
                    )}
                  </p>
                </div>
                <Badge variant={selectedAsset.status === "DAMAGED" ? "damaged" : "available"}>
                  {selectedAsset.status === "DAMAGED" ? "Avariado" : "Disponível"}
                </Badge>
              </div>
            )}
          </div>

          {/* Defeito Relatado com Atalhos Rápidos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                Defeito / Motivo do Chamado <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-muted-foreground">Clique nas tags abaixo para preencher</span>
            </div>

            <textarea
              rows={3}
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              placeholder="Descreva detalhadamente a falha apresentada, sintomas ou necessidade de reparo..."
              className="w-full p-3 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all resize-none"
            />

            {/* Tags de Sintomas Frequentes */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {COMMON_ISSUES.map((issue, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setIssueDescription(issue)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-accent/60 hover:bg-accent text-muted-foreground hover:text-foreground border border-border/50 transition-colors text-left"
                >
                  + {issue}
                </button>
              ))}
            </div>
          </div>

          {/* Tipo de Manutenção e Prioridade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Tipo */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Tipo de Manutenção
              </label>
              <select
                value={maintenanceType}
                onChange={(e) => setMaintenanceType(e.target.value as any)}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="CORRECTIVE">Corretiva Interna (Reparo no Setor)</option>
                <option value="EXTERNAL">Assistência Técnica Externa / Fornecedor</option>
                <option value="PREVENTIVE">Preventiva (Limpeza / Troca Preventiva)</option>
                <option value="INTERNAL">Ajuste / Configuração de Firmware</option>
              </select>
            </div>

            {/* Prioridade */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
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
                      className={`py-2 text-[11px] font-semibold rounded-lg border transition-all text-center ${
                        isSelected 
                          ? `${p.color} border-current ring-1 ring-current shadow-sm` 
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

          {/* Prestador de Serviço e Custo Estimado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                Prestador / Assistência Responsável
              </label>
              <Input
                value={serviceProvider}
                onChange={(e) => setServiceProvider(e.target.value)}
                placeholder="Ex: Laboratório UniFAP ou Epson Autorizada"
                className="h-10 rounded-xl text-xs"
              />
              <div className="flex flex-wrap gap-1 pt-0.5">
                {COMMON_PROVIDERS.slice(0, 2).map((prov, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setServiceProvider(prov)}
                    className="text-[10px] text-muted-foreground hover:text-foreground underline decoration-dotted"
                  >
                    {prov}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                Estimativa de Custo Inicial (R$)
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
              <p className="text-[10px] text-muted-foreground">Opcional. Pode ser ajustado na conclusão do laudo.</p>
            </div>
          </div>

          {/* Contato (Nome e WhatsApp do Fornecedor / Solicitante) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                Nome do Contato / Técnico
              </label>
              <Input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Ex: Carlos (Técnico Epson)"
                className="h-10 rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                Telefone / WhatsApp para Acompanhamento
              </label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="(88) 99999-9999"
                className="h-10 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Diagnóstico Inicial e Notas Internas */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              Diagnóstico Preliminar & Notas Técnicas
            </label>
            <textarea
              rows={2}
              value={technicalNotes}
              onChange={(e) => setTechnicalNotes(e.target.value)}
              placeholder="Testes já efetuados pelo suporte, cabos testados, sintomas adicionais observados..."
              className="w-full p-2.5 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all resize-none"
            />
          </div>

          {/* Aviso Institucional */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
              Ao abrir a Ordem de Serviço, o equipamento passará automaticamente para o status <strong>EM MANUTENÇÃO</strong> e ficará bloqueado para novos empréstimos até a conclusão do reparo e realocação no armário.
            </p>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/80">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl h-10 px-4 text-xs"
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl h-10 px-5 text-xs font-semibold gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md shadow-amber-500/20"
            >
              {isSubmitting ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Gerando OS...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Abrir Ordem de Serviço</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
