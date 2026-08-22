"use client";

import React, { useState, useEffect } from "react";
import { 
  Edit3, 
  X, 
  Building2, 
  DollarSign, 
  Phone, 
  FileText, 
  Check, 
  AlertTriangle, 
  Tag, 
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

interface MaintenanceUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  maintenance: any | null;
}

export function MaintenanceUpdateModal({
  isOpen,
  onClose,
  onSuccess,
  maintenance,
}: MaintenanceUpdateModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [issueDescription, setIssueDescription] = useState("");
  const [maintenanceType, setMaintenanceType] = useState<string>("INTERNAL");
  const [priority, setPriority] = useState<string>("MEDIUM");
  const [status, setStatus] = useState<string>("IN_PROGRESS");
  const [serviceProvider, setServiceProvider] = useState("");
  const [cost, setCost] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [solution, setSolution] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [technicalNotes, setTechnicalNotes] = useState("");
  const [replacedParts, setReplacedParts] = useState("");
  const [lampHours, setLampHours] = useState("");

  useEffect(() => {
    if (isOpen && maintenance) {
      setIssueDescription(maintenance.issueDescription || "");
      setMaintenanceType(maintenance.maintenanceType || "INTERNAL");
      setPriority(maintenance.priority || "MEDIUM");
      setStatus(maintenance.status || "IN_PROGRESS");
      setServiceProvider(maintenance.serviceProvider || "");
      setCost(maintenance.cost ? String(maintenance.cost) : "");
      setDiagnosis(maintenance.diagnosis || "");
      setSolution(maintenance.solution || "");
      setContactName(maintenance.contactName || "");
      setContactPhone(maintenance.contactPhone || "");
      setTechnicalNotes(maintenance.technicalNotes || "");
      setReplacedParts(maintenance.replacedParts || "");
      setLampHours(
        maintenance.lampHours !== null && maintenance.lampHours !== undefined
          ? String(maintenance.lampHours)
          : ""
      );
    }
  }, [isOpen, maintenance]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintenance) return;

    try {
      setIsSubmitting(true);

      const payload = {
        issueDescription: issueDescription.trim() || undefined,
        maintenanceType,
        priority,
        status,
        serviceProvider: maintenanceType === "EXTERNAL" ? serviceProvider.trim() || undefined : undefined,
        cost: cost ? parseFloat(cost.replace(",", ".")) : undefined,
        diagnosis: diagnosis.trim() || undefined,
        solution: solution.trim() || undefined,
        contactName: maintenanceType === "EXTERNAL" ? contactName.trim() || undefined : undefined,
        contactPhone: maintenanceType === "EXTERNAL" ? contactPhone.trim() || undefined : undefined,
        technicalNotes: technicalNotes.trim() || undefined,
        replacedParts: replacedParts.trim() || undefined,
        lampHours: lampHours ? parseInt(lampHours, 10) : undefined,
      };

      const res = await fetch(`/api/v1/maintenances/${maintenance.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Erro ao atualizar Ordem de Serviço.");
      }

      toast.success("Ordem de Serviço atualizada com sucesso!");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Falha na comunicação com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!maintenance) return null;

  const isInternal = maintenanceType === "INTERNAL" || maintenanceType === "PREVENTIVE";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent hideClose className="max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-3xl bg-card border-border shadow-2xl gap-0">
        
        {/* Header Fixo */}
        <div className="px-6 py-4 border-b border-border/80 flex items-center justify-between bg-accent/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-indigo-600 text-white shadow-md shadow-primary/20 shrink-0">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  Editar Ordem de Serviço
                </DialogTitle>
                <Badge variant="outline" className="text-xs font-mono">
                  {maintenance.orderNumber || `#OS-${maintenance.id.slice(0, 8)}`}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Atualização de diagnóstico, procedimentos técnicos e status do reparo
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

        {/* Content Form Scrollável */}
        <form 
          id="maintenance-update-form"
          onSubmit={handleSubmit} 
          className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4"
        >
          {/* Card Resumo do Equipamento */}
          <div className="p-3.5 rounded-2xl bg-accent/40 border border-border/60 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-primary" />
                {maintenance.asset?.item?.name} {maintenance.asset?.model ? `• ${maintenance.asset.model}` : ""}
              </p>
              <p className="text-muted-foreground">
                Patrimônio: <strong className="text-foreground">#{maintenance.asset?.assetTag}</strong>
              </p>
            </div>
            <Badge variant="maintenance">
              {maintenance.daysInMaintenance} dias em reparo
            </Badge>
          </div>

          {/* Tipo de Manutenção e Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Tipo de Manutenção
              </label>
              <select
                value={maintenanceType}
                onChange={(e) => setMaintenanceType(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="INTERNAL">🛠️ Manutenção Interna</option>
                <option value="EXTERNAL">🏢 Assistência Externa</option>
                <option value="PREVENTIVE">🛡️ Preventiva</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Status Atual do Chamado
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="PENDING">Pendente (Aguardando Análise)</option>
                <option value="IN_PROGRESS">Em Andamento (Bancada/Oficina)</option>
                <option value="COMPLETED">Concluído</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Prioridade
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
                <option value="CRITICAL">Crítica</option>
              </select>
            </div>
          </div>

          {/* Defeito Relatado */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              Defeito Relatado
            </label>
            <textarea
              rows={2}
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all resize-none"
            />
          </div>

          {/* Campos Exclusivos de Manutenção Externa */}
          {!isInternal && (
            <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-3 animate-in fade-in-50">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-semibold text-xs border-b border-purple-500/20 pb-2">
                <Building2 className="w-4 h-4" />
                <span>Dados da Assistência Externa / Fornecedor</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Prestador / Assistência
                  </label>
                  <Input
                    value={serviceProvider}
                    onChange={(e) => setServiceProvider(e.target.value)}
                    placeholder="Ex: Epson Autorizada"
                    className="h-10 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                    Custo Orçado / Aprovado (R$)
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Nome do Contato na Assistência
                  </label>
                  <Input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Ex: Carlos (Técnico)"
                    className="h-10 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    WhatsApp para Acompanhamento
                  </label>
                  <Input
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="(88) 99999-9999"
                    className="h-10 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Diagnóstico Preliminar */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              {isInternal ? "Diagnóstico / Procedimentos da Bancada TI" : "Diagnóstico / Laudo Preliminar"}
            </label>
            <textarea
              rows={2}
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Diagnóstico realizado pelo técnico..."
              className="w-full p-2.5 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all resize-none"
            />
          </div>

          {/* Peças e Componentes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Peças Necessárias / Utilizadas do Estoque
            </label>
            <Input
              value={replacedParts}
              onChange={(e) => setReplacedParts(e.target.value)}
              placeholder="Ex: Lâmpada ELPLP96, Cabo HDMI 2.0, Filtro de Ar..."
              className="h-10 rounded-xl text-xs"
            />
          </div>

          {/* Notas Gerais */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Observações & Andamento
            </label>
            <textarea
              rows={2}
              value={technicalNotes}
              onChange={(e) => setTechnicalNotes(e.target.value)}
              placeholder="Anotações de testes, histórico e andamento do chamado..."
              className="w-full p-2.5 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all resize-none"
            />
          </div>
        </form>

        {/* Footer Fixo */}
        <div className="p-4 px-6 border-t border-border/80 bg-muted/20 flex items-center justify-end gap-3 shrink-0">
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
            form="maintenance-update-form"
            disabled={isSubmitting}
            className="rounded-xl h-10 px-5 text-xs font-semibold gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>Salvar Alterações</span>
              </>
            )}
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
