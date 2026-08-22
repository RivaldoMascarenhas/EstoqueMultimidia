"use client";

import React, { useState, useEffect } from "react";
import { 
  CheckCircle2, 
  X, 
  DollarSign, 
  FileText, 
  Tag, 
  Sparkles, 
  AlertTriangle, 
  Boxes, 
  Clock
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

interface MaintenanceCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  maintenance: any | null;
}

const COMMON_SOLUTIONS = [
  "Limpeza interna, desobstrução do cooler e troca de pasta térmica concluídas com sucesso.",
  "Substituição da lâmpada efetuada com lâmpada nova do estoque e horímetro zerado.",
  "Conector / cabo reparado e sinal de vídeo testado com sucesso em bancada.",
  "Atualização de firmware aplicada e cores calibradas para projeção em sala.",
  "Equipamento revisado pela assistência técnica, peças trocadas e aprovado nos testes.",
  "Limpeza preventiva completa realizada e filtros de ar higienizados.",
];

export function MaintenanceCompleteModal({
  isOpen,
  onClose,
  onSuccess,
  maintenance,
}: MaintenanceCompleteModalProps) {
  const [boxes, setBoxes] = useState<any[]>([]);
  const [isLoadingBoxes, setIsLoadingBoxes] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [outcome, setOutcome] = useState<"AVAILABLE" | "WRITTEN_OFF">("AVAILABLE");
  const [returnBoxId, setReturnBoxId] = useState("");
  const [solution, setSolution] = useState("");
  const [replacedParts, setReplacedParts] = useState("");
  const [lampHours, setLampHours] = useState("");
  const [cost, setCost] = useState("");
  const [technicalNotes, setTechnicalNotes] = useState("");
  const [writeOffReason, setWriteOffReason] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchBoxes();
      if (maintenance) {
        setCost(maintenance.cost ? String(maintenance.cost) : "");
        setTechnicalNotes(maintenance.technicalNotes || "");
        setReplacedParts(maintenance.replacedParts || "");
        setLampHours(
          maintenance.lampHours !== null && maintenance.lampHours !== undefined
            ? String(maintenance.lampHours)
            : ""
        );
      }
    }
  }, [isOpen, maintenance]);

  const fetchBoxes = async () => {
    try {
      setIsLoadingBoxes(true);
      const res = await fetch("/api/v1/boxes");
      const json = await res.json();
      if (json.success) {
        setBoxes(json.data);
      }
    } catch (err) {
      toast.error("Erro ao carregar caixas do armário.");
    } finally {
      setIsLoadingBoxes(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintenance) return;

    if (!solution.trim() || solution.trim().length < 3) {
      toast.error("Descreva o laudo técnico ou solução aplicada (mínimo 3 caracteres).");
      return;
    }

    if (outcome === "AVAILABLE" && !returnBoxId) {
      toast.error("Selecione uma caixa física do armário para armazenar o equipamento recuperado.");
      return;
    }

    if (outcome === "WRITTEN_OFF" && (!writeOffReason.trim() || writeOffReason.trim().length < 5)) {
      toast.error("Informe a justificativa técnica detalhada para a baixa patrimonial (mínimo 5 caracteres).");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        outcome,
        returnBoxId: outcome === "AVAILABLE" ? returnBoxId : undefined,
        writeOffReason: outcome === "WRITTEN_OFF" ? writeOffReason.trim() : undefined,
        solution: solution.trim(),
        replacedParts: replacedParts.trim() || undefined,
        lampHours: lampHours ? parseInt(lampHours, 10) : undefined,
        cost: cost ? parseFloat(cost.replace(",", ".")) : undefined,
        technicalNotes: technicalNotes.trim() || undefined,
      };

      const res = await fetch(`/api/v1/maintenances/${maintenance.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Erro ao concluir chamado de manutenção.");
      }

      toast.success(
        outcome === "AVAILABLE"
          ? "Ordem de Serviço concluída! Equipamento reintegrado ao armário."
          : "Ordem de Serviço finalizada com baixa patrimonial registrada."
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Falha na comunicação com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!maintenance) return null;

  // Agrupar caixas por porta
  const groupedBoxes: { [doorName: string]: any[] } = {};
  boxes.forEach((box) => {
    const doorName = box.door?.name || "Sem Porta";
    if (!groupedBoxes[doorName]) groupedBoxes[doorName] = [];
    groupedBoxes[doorName].push(box);
  });

  const isProjector = maintenance.asset?.item?.category?.slug === "projetores";
  const isInternal = maintenance.maintenanceType === "INTERNAL" || maintenance.maintenanceType === "PREVENTIVE";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent hideClose className="max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-3xl bg-card border-border shadow-2xl gap-0">
        
        {/* Header Fixo */}
        <div className="px-6 py-4 border-b border-border/80 flex items-center justify-between bg-emerald-500/10 dark:bg-emerald-500/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  Concluir Ordem de Serviço
                </DialogTitle>
                <Badge variant="outline" className="text-xs font-mono">
                  {maintenance.orderNumber || `#OS-${maintenance.id.slice(0, 8)}`}
                </Badge>
              </div>
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
          id="maintenance-complete-form"
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
                {maintenance.asset?.serialNumber && ` • N/S: ${maintenance.asset.serialNumber}`}
              </p>
              <p className="text-muted-foreground text-[11px] mt-0.5">
                Defeito de Entrada: <em>"{maintenance.issueDescription}"</em>
              </p>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="text-xs">
                Entrada: {new Date(maintenance.entryDate).toLocaleDateString("pt-BR")}
              </Badge>
            </div>
          </div>

          {/* Destino Final do Equipamento (Disponível vs Baixa) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Resultado / Destino do Equipamento <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOutcome("AVAILABLE")}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  outcome === "AVAILABLE"
                    ? "bg-emerald-500/10 border-emerald-500 text-foreground ring-1 ring-emerald-500"
                    : "bg-background border-input text-muted-foreground hover:bg-accent"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Reparo Concluído com Sucesso</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Equipamento 100% funcional. Devolver para uma gaveta/box do armário.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setOutcome("WRITTEN_OFF")}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  outcome === "WRITTEN_OFF"
                    ? "bg-rose-500/10 border-rose-500 text-foreground ring-1 ring-rose-500"
                    : "bg-background border-input text-muted-foreground hover:bg-accent"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Inviabilidade Técnica / Baixa</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Sem conserto ou reparo economicamente inviável. Condenar equipamento.
                </p>
              </button>
            </div>
          </div>

          {/* Seleção da Caixa Física de Retorno (Quando AVAILABLE) */}
          {outcome === "AVAILABLE" && (
            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2 animate-in fade-in-50">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Boxes className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Alocar de Volta na Gaveta / Caixa Física <span className="text-rose-500">*</span></span>
              </label>
              
              <select
                value={returnBoxId}
                onChange={(e) => setReturnBoxId(e.target.value)}
                disabled={isLoadingBoxes}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">-- Selecione a caixa física do armário --</option>
                {Object.keys(groupedBoxes).map((doorName) => (
                  <optgroup key={doorName} label={`Porta: ${doorName}`}>
                    {groupedBoxes[doorName].map((box) => (
                      <option key={box.id} value={box.id}>
                        {box.name} ({box.code}) {box.assets?.length ? `[${box.assets.length} item(ns) presentes]` : "[LIVRE]"}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <p className="text-[10px] text-muted-foreground">
                O equipamento será vinculado imediatamente a este compartimento e voltará a ficar disponível para empréstimos.
              </p>
            </div>
          )}

          {/* Motivo da Baixa (Quando WRITTEN_OFF) */}
          {outcome === "WRITTEN_OFF" && (
            <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-2 animate-in fade-in-50">
              <label className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                Justificativa Técnica da Baixa Patrimonial <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={writeOffReason}
                onChange={(e) => setWriteOffReason(e.target.value)}
                placeholder="Ex: Placa mãe queimada sem reposição pelo fabricante, custo de reparo superior a 80% do valor do ativo..."
                className="w-full p-2.5 rounded-xl border border-rose-500/30 bg-background text-xs text-foreground focus:ring-2 focus:ring-rose-500 focus:outline-none transition-all resize-none"
              />
            </div>
          )}

          {/* Laudo e Solução Aplicada */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 text-primary" />
                Laudo Técnico & Solução Aplicada <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-muted-foreground">Clique nas tags para preencher</span>
            </div>

            <textarea
              rows={2}
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              placeholder="Descreva detalhadamente o serviço executado pelo técnico ou fornecedor..."
              className="w-full p-2.5 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all resize-none"
            />

            {/* Quick solution tags */}
            <div className="flex flex-wrap gap-1 pt-0.5">
              {COMMON_SOLUTIONS.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSolution(s)}
                  className="text-[10px] px-2 py-0.5 rounded-lg bg-accent/60 hover:bg-accent text-muted-foreground hover:text-foreground border border-border/50 transition-colors text-left cursor-pointer"
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>

          {/* Peças Substituídas, Horímetro e Custo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Peças Substituídas / Insumos
              </label>
              <Input
                value={replacedParts}
                onChange={(e) => setReplacedParts(e.target.value)}
                placeholder="Ex: Lâmpada Original ELPLP96, Cooler 12V..."
                className="h-10 rounded-xl text-xs"
              />
            </div>

            {/* Se for projetor, exibir campo de horímetro */}
            {isProjector ? (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-blue-500" />
                  Horímetro da Lâmpada (Horas)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={lampHours}
                  onChange={(e) => setLampHours(e.target.value)}
                  placeholder="0 (Zerar caso lâmpada seja nova)"
                  className="h-10 rounded-xl text-xs"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                  Custo Final {isInternal ? "(Opcional)" : "Aprovado (R$)"}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder={isInternal ? "0,00 (Sem custo externo)" : "0,00"}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
            )}
          </div>

          {/* Custo se for Projetor (já que o campo acima foi usado para lâmpada) */}
          {isProjector && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                  Custo Final {isInternal ? "(Opcional)" : "Aprovado (R$)"}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder={isInternal ? "0,00 (Sem custo externo)" : "0,00"}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  Observações Finais
                </label>
                <Input
                  value={technicalNotes}
                  onChange={(e) => setTechnicalNotes(e.target.value)}
                  placeholder="Ex: Garantia de 90 dias com fornecedor"
                  className="h-10 rounded-xl text-xs"
                />
              </div>
            </div>
          )}
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
            Voltar
          </Button>

          <Button
            type="submit"
            form="maintenance-complete-form"
            disabled={isSubmitting}
            className="rounded-xl h-10 px-5 text-xs font-semibold gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Concluindo Chamado...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Finalizar & Reintegrar</span>
              </>
            )}
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
