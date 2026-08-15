"use client";

import React, { useState, useEffect } from "react";
import { 
  CheckCircle2, 
  X, 
  Archive, 
  Trash2, 
  DollarSign, 
  FileText, 
  Wrench, 
  Tag, 
  Sparkles, 
  AlertTriangle,
  Lightbulb,
  Boxes
} from "lucide-react";
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
    if (isOpen && maintenance) {
      fetchBoxes();
      setCost(maintenance.cost ? String(maintenance.cost) : "");
      setReplacedParts(maintenance.replacedParts || "");
      setLampHours(maintenance.lampHours ? String(maintenance.lampHours) : "");
      setSolution(maintenance.solution || "");
      setTechnicalNotes(maintenance.technicalNotes || "");
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

    if (!solution.trim() || solution.trim().length < 3) {
      toast.error("Descreva a solução técnica ou laudo de conclusão (mínimo 3 caracteres).");
      return;
    }

    if (outcome === "AVAILABLE" && !returnBoxId) {
      toast.error("Selecione a caixa física do armário para guardar o equipamento.");
      return;
    }

    if (outcome === "WRITTEN_OFF" && (!writeOffReason.trim() || writeOffReason.trim().length < 5)) {
      toast.error("Informe a justificativa detalhada para baixa definitiva / sucata.");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        outcome,
        solution: solution.trim(),
        returnBoxId: outcome === "AVAILABLE" ? returnBoxId : undefined,
        writeOffReason: outcome === "WRITTEN_OFF" ? writeOffReason.trim() : undefined,
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
        throw new Error(json.error || "Erro ao concluir Ordem de Serviço.");
      }

      toast.success(json.message || "Ordem de Serviço concluída com sucesso!");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Falha na comunicação com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !maintenance) return null;

  // Agrupar caixas por porta
  const groupedBoxes: { [doorName: string]: any[] } = {};
  boxes.forEach((box) => {
    const doorName = box.door?.name || "Sem Porta";
    if (!groupedBoxes[doorName]) groupedBoxes[doorName] = [];
    groupedBoxes[doorName].push(box);
  });

  const isProjector = maintenance.asset?.item?.category?.slug === "projetores";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in-0 duration-200">
      <div className="relative w-full max-w-2xl bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-border/80 flex items-center justify-between bg-emerald-500/10 dark:bg-emerald-500/5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">
                  Concluir Ordem de Serviço
                </h2>
                <Badge variant="outline" className="text-xs font-mono">
                  {maintenance.orderNumber || `#OS-${maintenance.id.slice(0, 8)}`}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Registro de laudo técnico, peças substituídas, custos e reintegração física ao armário
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
          
          {/* Card Resumo do Equipamento */}
          <div className="p-3.5 rounded-xl bg-accent/40 border border-border/60 flex items-center justify-between text-xs">
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
              <Badge variant="maintenance">
                {maintenance.daysInMaintenance} {maintenance.daysInMaintenance === 1 ? "dia" : "dias"} em reparo
              </Badge>
            </div>
          </div>

          {/* Decisão de Destino (Reintegrar ao Armário vs Baixa Definitiva) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">
              Resultado da Manutenção & Destino do Equipamento <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Opção 1: Reintegrar */}
              <button
                type="button"
                onClick={() => setOutcome("AVAILABLE")}
                className={`p-3.5 rounded-xl border flex items-start gap-3 text-left transition-all ${
                  outcome === "AVAILABLE"
                    ? "bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/50"
                    : "bg-background border-input hover:bg-accent"
                }`}
              >
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mt-0.5">
                  <Archive className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    Reintegrar ao Armário Físico
                    {outcome === "AVAILABLE" && <span className="text-[10px] text-emerald-500">● Selecionado</span>}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Equipamento consertado, testado e pronto para voltar a ficar Disponível.
                  </p>
                </div>
              </button>

              {/* Opção 2: Baixa Definitiva */}
              <button
                type="button"
                onClick={() => setOutcome("WRITTEN_OFF")}
                className={`p-3.5 rounded-xl border flex items-start gap-3 text-left transition-all ${
                  outcome === "WRITTEN_OFF"
                    ? "bg-rose-500/10 border-rose-500/50 ring-1 ring-rose-500/50"
                    : "bg-background border-input hover:bg-accent"
                }`}
              >
                <div className="p-2 rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400 mt-0.5">
                  <Trash2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    Baixa Definitiva (Inviável)
                    {outcome === "WRITTEN_OFF" && <span className="text-[10px] text-rose-500">● Selecionado</span>}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Reparo inviável/condenado. Item será baixado para descarte ou sucata.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Seleção de Caixa do Armário se Disponível */}
          {outcome === "AVAILABLE" && (
            <div className="space-y-2 p-3.5 rounded-xl bg-accent/30 border border-border/60 animate-in fade-in-50">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Boxes className="h-3.5 w-3.5 text-primary" />
                Caixa Física do Armário (Local de Guarda) <span className="text-rose-500">*</span>
              </label>

              <select
                value={returnBoxId}
                onChange={(e) => setReturnBoxId(e.target.value)}
                disabled={isLoadingBoxes}
                className="w-full h-11 px-3.5 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all"
              >
                <option value="">-- Selecione a caixa física onde o item foi guardado --</option>
                {Object.entries(groupedBoxes).map(([doorName, doorBoxes]) => (
                  <optgroup key={doorName} label={`🚪 ${doorName}`}>
                    {doorBoxes.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} - {b.name} ({b.description || "Sem descrição"})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <p className="text-[10px] text-muted-foreground">
                O equipamento será vinculado imediatamente a esta caixa física no sistema e no QR Code.
              </p>
            </div>
          )}

          {/* Motivo de Baixa se Baixa Definitiva */}
          {outcome === "WRITTEN_OFF" && (
            <div className="space-y-2 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 animate-in fade-in-50">
              <label className="text-xs font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Justificativa para Baixa Definitiva do Patrimônio <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={writeOffReason}
                onChange={(e) => setWriteOffReason(e.target.value)}
                placeholder="Ex: Placa principal carbonizada sem possibilidade de substituição de componentes / Custo de reparo superior a 80% do valor do bem novo..."
                className="w-full p-2.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-background text-xs text-foreground focus:ring-2 focus:ring-rose-500 focus:outline-none transition-all resize-none"
              />
            </div>
          )}

          {/* Laudo Técnico / Solução Aplicada */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5 text-primary" />
              Laudo Técnico / Solução Executada <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              placeholder="Descreva detalhadamente o reparo efetuado, testes realizados e o estado final do equipamento..."
              className="w-full p-3 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all resize-none"
            />
          </div>

          {/* Peças Substituídas e Horas de Lâmpada */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Peças Substituídas */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Peças / Insumos Substituídos
              </label>
              <Input
                value={replacedParts}
                onChange={(e) => setReplacedParts(e.target.value)}
                placeholder="Ex: Lâmpada Epson ELPLP96 Original, Pasta Térmica..."
                className="h-10 rounded-xl text-xs"
              />
            </div>

            {/* Horas de Lâmpada (Se Projetor) ou Custo */}
            {isProjector ? (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                  Horas da Nova Lâmpada (Horímetro)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={lampHours}
                  onChange={(e) => setLampHours(e.target.value)}
                  placeholder="0 (Horas zeradas no menu)"
                  className="h-10 rounded-xl text-xs"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                  Custo Final Aprovado (R$)
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
            )}
          </div>

          {/* Custo se for Projetor (já que o campo acima foi usado para lâmpada) */}
          {isProjector && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                  Custo Final Aprovado (R$)
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

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  Observações Finais / Garantia
                </label>
                <Input
                  value={technicalNotes}
                  onChange={(e) => setTechnicalNotes(e.target.value)}
                  placeholder="Ex: Garantia da lâmpada de 90 dias com o fornecedor"
                  className="h-10 rounded-xl text-xs"
                />
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/80">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl h-10 px-4 text-xs"
            >
              Voltar
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl h-10 px-5 text-xs font-semibold gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20"
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
        </form>
      </div>
    </div>
  );
}
