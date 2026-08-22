"use client";

import React, { useState, useEffect } from "react";
import { 
  Handshake, 
  Calendar, 
  Clock, 
  User, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Search, 
  PackageCheck, 
  Loader2, 
  Sparkles, 
  CalendarCheck2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface AvailableAsset {
  id: string;
  assetTag: string;
  serialNumber?: string | null;
  model?: string | null;
  item: {
    name: string;
    category?: { name: string };
  };
  currentBox?: {
    code: string;
    name: string;
    door: { name: string };
  } | null;
}

interface LoanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (loanId: string) => void;
  preSelectedAssetId?: string;
}

export function LoanFormModal({
  isOpen,
  onClose,
  onSuccess,
  preSelectedAssetId,
}: LoanFormModalProps) {
  const [availableAssets, setAvailableAssets] = useState<AvailableAsset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [assetSearch, setAssetSearch] = useState("");

  // Form States
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [borrowerName, setBorrowerName] = useState("");
  const [borrowerEmail, setBorrowerEmail] = useState("");
  const [borrowerPhone, setBorrowerPhone] = useState("");
  const [borrowerDepartment, setBorrowerDepartment] = useState("");
  const [destination, setDestination] = useState("");
  
  // Data e Horário em campos dedicados
  const [returnDate, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState("18:00");
  
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getLocalDateString = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const getLocalTimeString = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Carregar ativos disponíveis
  useEffect(() => {
    if (isOpen) {
      loadAvailableAssets();
      if (preSelectedAssetId) {
        setSelectedAssetId(preSelectedAssetId);
      }
      
      const now = new Date();
      setReturnDate(getLocalDateString(now));
      
      // Sugerir 4 horas à frente ou 18:00
      const defaultTime = new Date();
      defaultTime.setHours(defaultTime.getHours() + 4);
      setReturnTime(getLocalTimeString(defaultTime));
    }
  }, [isOpen, preSelectedAssetId]);

  const loadAvailableAssets = async () => {
    try {
      setIsLoadingAssets(true);
      const res = await fetch("/api/v1/loans/available-assets");
      const json = await res.json();
      if (json && json.success && Array.isArray(json.data)) {
        setAvailableAssets(json.data);
      } else {
        setAvailableAssets([]);
      }
      setIsLoadingAssets(false);
    } catch (err) {
      setAvailableAssets([]);
      setIsLoadingAssets(false);
    }
  };

  // Atalhos rápidos de prazo
  const applyPresetTime = (type: "2h" | "4h" | "end_of_day" | "night" | "24h" | "3d" | "7d") => {
    const d = new Date();
    switch (type) {
      case "2h":
        d.setHours(d.getHours() + 2);
        setReturnDate(getLocalDateString(d));
        setReturnTime(getLocalTimeString(d));
        break;
      case "4h":
        d.setHours(d.getHours() + 4);
        setReturnDate(getLocalDateString(d));
        setReturnTime(getLocalTimeString(d));
        break;
      case "end_of_day":
        d.setHours(18, 0, 0, 0);
        if (d < new Date()) {
          d.setDate(d.getDate() + 1);
        }
        setReturnDate(getLocalDateString(d));
        setReturnTime("18:00");
        break;
      case "night":
        d.setHours(22, 30, 0, 0);
        if (d < new Date()) {
          d.setDate(d.getDate() + 1);
        }
        setReturnDate(getLocalDateString(d));
        setReturnTime("22:30");
        break;
      case "24h":
        d.setDate(d.getDate() + 1);
        setReturnDate(getLocalDateString(d));
        break;
      case "3d":
        d.setDate(d.getDate() + 3);
        setReturnDate(getLocalDateString(d));
        break;
      case "7d":
        d.setDate(d.getDate() + 7);
        setReturnDate(getLocalDateString(d));
        break;
    }
  };

  const filteredAssets = availableAssets.filter((a) => {
    if (!assetSearch.trim()) return true;
    const q = assetSearch.toLowerCase();
    return (
      a.assetTag.toLowerCase().includes(q) ||
      a.item.name.toLowerCase().includes(q) ||
      (a.serialNumber && a.serialNumber.toLowerCase().includes(q)) ||
      (a.model && a.model.toLowerCase().includes(q))
    );
  });

  const selectedAsset = availableAssets.find((a) => a.id === selectedAssetId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAssetId) {
      toast.error("Por favor, selecione um equipamento patrimonial.");
      return;
    }

    if (!borrowerName.trim()) {
      toast.error("Informe o nome do solicitante.");
      return;
    }

    if (!destination.trim()) {
      toast.error("Informe o local ou sala de uso.");
      return;
    }

    if (!returnDate || !returnTime) {
      toast.error("Informe a data e horário previstos para devolução.");
      return;
    }

    try {
      setIsSubmitting(true);
      const combinedDateTime = new Date(`${returnDate}T${returnTime}:00`);

      const payload = {
        assetId: selectedAssetId,
        borrowerName: borrowerName.trim(),
        borrowerEmail: borrowerEmail.trim() || undefined,
        borrowerPhone: borrowerPhone.trim() || undefined,
        borrowerDepartment: borrowerDepartment.trim() || undefined,
        destination: destination.trim(),
        expectedReturnDate: combinedDateTime.toISOString(),
        notes: notes.trim() || undefined,
      };

      const res = await fetch("/api/v1/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error || "Erro ao registrar empréstimo.");
        setIsSubmitting(false);
        return;
      }

      toast.success("✓ Empréstimo registrado com sucesso! Gerando Termo Oficial...");
      onClose();
      onSuccess(json.data.id);
    } catch (err: any) {
      toast.error("Erro inesperado ao registrar saída.");
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl bg-card border-border shadow-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-border/80 shrink-0 space-y-1">
            <div className="flex items-center gap-2.5 text-primary">
              <div className="p-2 rounded-2xl bg-primary/10 border border-primary/20">
                <Handshake className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  Novo Empréstimo de Equipamento
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Registre a cautela temporária de equipamento com emissão de Termo de Responsabilidade A4.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Área Scrollável do Formulário */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {/* Seção 1: Seleção do Equipamento */}
          <div className="space-y-3 p-4 rounded-2xl bg-muted/30 border border-border/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>1. Selecionar Equipamento no Armário *</span>
              </label>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Filtrar por patrimônio, item ou caixa..."
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  className="pl-8 text-xs rounded-xl h-8 bg-background"
                />
              </div>
            </div>

            {/* Lista com scroll dos equipamentos disponíveis */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {isLoadingAssets ? (
                <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Buscando equipamentos disponíveis...</span>
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground border border-dashed rounded-xl p-4">
                  {assetSearch ? "Nenhum equipamento disponível encontrado para esta busca." : "Não há equipamentos disponíveis para empréstimo no momento."}
                </div>
              ) : (
                filteredAssets.map((asset) => {
                  const isSelected = selectedAssetId === asset.id;

                  return (
                    <div
                      key={asset.id}
                      onClick={() => setSelectedAssetId(asset.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-xs"
                          : "border-border/60 bg-background hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg font-mono text-xs font-bold ${
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                        }`}>
                          #{asset.assetTag}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-foreground block">
                            {asset.item.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {asset.model ? `Modelo: ${asset.model} • ` : ""}
                            {asset.currentBox ? `Armazenado em: ${asset.currentBox.name} (${asset.currentBox.door.name})` : "Sem caixa"}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-primary">
                          <PackageCheck className="w-4 h-4" />
                          <span>Selecionado</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {selectedAsset && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold">Item Selecionado:</span> #{selectedAsset.assetTag} - {selectedAsset.item.name}
                  {selectedAsset.currentBox && (
                    <span className="block text-[11px] opacity-85">
                      Local de retirada: {selectedAsset.currentBox.name} ({selectedAsset.currentBox.door.name})
                    </span>
                  )}
                </div>
                <Badge variant="available" className="text-[10px]">Pronto para Saída</Badge>
              </div>
            )}
          </div>

          {/* Seção 2: Dados do Solicitante */}
          <div className="space-y-3 p-4 rounded-2xl bg-card border border-border/80 shadow-xs">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <User className="w-4 h-4 text-primary" />
              <span>2. Dados do Solicitante / Responsável</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span>Nome Completo <span className="text-rose-500">*</span></span>
                </label>
                <Input
                  required
                  placeholder="Ex: Prof. João da Silva"
                  value={borrowerName}
                  onChange={(e) => setBorrowerName(e.target.value)}
                  className="text-xs rounded-xl h-10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  <span>Departamento / Curso</span>
                </label>
                <Input
                  placeholder="Ex: Coordenação de Medicina, DTI, Prograd"
                  value={borrowerDepartment}
                  onChange={(e) => setBorrowerDepartment(e.target.value)}
                  className="text-xs rounded-xl h-10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-primary" />
                  <span>WhatsApp / Telefone</span>
                </label>
                <Input
                  placeholder="Ex: (88) 98111-2233"
                  value={borrowerPhone}
                  onChange={(e) => setBorrowerPhone(e.target.value)}
                  className="text-xs rounded-xl h-10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-primary" />
                  <span>E-mail Institucional</span>
                </label>
                <Input
                  type="email"
                  placeholder="Ex: joao.silva@unifapce.edu.br"
                  value={borrowerEmail}
                  onChange={(e) => setBorrowerEmail(e.target.value)}
                  className="text-xs rounded-xl h-10"
                />
              </div>
            </div>
          </div>

          {/* Seção 3: Destino & Prazo de Retorno */}
          <div className="space-y-3.5 p-4 rounded-2xl bg-card border border-border/80 shadow-xs">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CalendarCheck2 className="w-4 h-4 text-primary" />
              <span>3. Destino de Uso & Prazo de Devolução</span>
            </label>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span>Local / Sala de Uso <span className="text-rose-500">*</span></span>
              </label>
              <Input
                required
                placeholder="Ex: Auditório Principal, Sala 203 Bloco B"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="text-xs rounded-xl h-10"
              />
            </div>

            {/* SELETORES LIMPOS DE DATA E HORÁRIO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>Data Prevista de Retorno <span className="text-rose-500">*</span></span>
                </label>
                <Input
                  type="date"
                  required
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="text-xs rounded-xl h-10 font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>Horário Previsto <span className="text-rose-500">*</span></span>
                </label>
                <Input
                  type="time"
                  required
                  value={returnTime}
                  onChange={(e) => setReturnTime(e.target.value)}
                  className="text-xs rounded-xl h-10 font-mono font-bold"
                />
              </div>
            </div>

            {/* Atalhos Rápidos de Prazo (Chips Elegantes) */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-muted-foreground block">
                Atalhos Rápidos de Prazo:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPresetTime("2h")}
                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-muted/60 hover:bg-primary/15 hover:text-primary border border-border/80 transition-all"
                >
                  ⚡ +2 Horas (Aula)
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetTime("4h")}
                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-muted/60 hover:bg-primary/15 hover:text-primary border border-border/80 transition-all"
                >
                  🕒 +4 Horas
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetTime("end_of_day")}
                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-muted/60 hover:bg-primary/15 hover:text-primary border border-border/80 transition-all"
                >
                  🌇 Fim do Dia (18h)
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetTime("night")}
                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-muted/60 hover:bg-primary/15 hover:text-primary border border-border/80 transition-all"
                >
                  🌙 Noite (22:30)
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetTime("24h")}
                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-muted/60 hover:bg-primary/15 hover:text-primary border border-border/80 transition-all"
                >
                  📅 Amanhã (+24h)
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetTime("3d")}
                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-muted/60 hover:bg-primary/15 hover:text-primary border border-border/80 transition-all"
                >
                  📆 +3 Dias
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetTime("7d")}
                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-muted/60 hover:bg-primary/15 hover:text-primary border border-border/80 transition-all"
                >
                  🗓️ +7 Dias
                </button>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-primary" />
                <span>Acessórios Inclusos & Observações (Opcional)</span>
              </label>
              <Input
                placeholder="Ex: Acompanha cabo HDMI 5m, cabo de força, controle remoto e bolsa protetora"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs rounded-xl h-10"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 sm:px-6 bg-card/95 backdrop-blur-md border-t border-border/80 flex items-center justify-between sm:justify-end gap-2.5 shrink-0 z-10">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-11 px-5 rounded-xl text-xs font-semibold"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !selectedAssetId}
            className="h-11 px-6 gap-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-md shadow-primary/25"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Registrando Saída...</span>
              </>
            ) : (
              <>
                <Handshake className="w-4 h-4" />
                <span>Confirmar Empréstimo</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
  );
}
