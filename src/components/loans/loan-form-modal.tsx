"use client";

import React, { useState, useEffect } from "react";
import { 
  Handshake, 
  Search, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  Building2, 
  MapPin, 
  FileText, 
  Loader2, 
  Sparkles,
  PackageCheck,
  AlertCircle,
  Monitor
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

interface LoanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newLoan?: any) => void;
  preSelectedAssetId?: string;
}

export function LoanFormModal({
  isOpen,
  onClose,
  onSuccess,
  preSelectedAssetId,
}: LoanFormModalProps) {
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [assetSearch, setAssetSearch] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState<string>(preSelectedAssetId || "");
  
  const [borrowerName, setBorrowerName] = useState("");
  const [borrowerEmail, setBorrowerEmail] = useState("");
  const [borrowerPhone, setBorrowerPhone] = useState("");
  const [borrowerDepartment, setBorrowerDepartment] = useState("");
  const [destination, setDestination] = useState("");
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [notes, setNotes] = useState("");

  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Carregar ativos disponíveis
  useEffect(() => {
    if (isOpen) {
      loadAvailableAssets();
      if (preSelectedAssetId) {
        setSelectedAssetId(preSelectedAssetId);
      }
      
      // Sugerir devolução padrão para 4 horas à frente
      const defaultDate = new Date();
      defaultDate.setHours(defaultDate.getHours() + 4);
      setExpectedReturnDate(formatDateTimeForInput(defaultDate));
    }
  }, [isOpen, preSelectedAssetId]);

  const loadAvailableAssets = async () => {
    try {
      setIsLoadingAssets(true);
      const res = await fetch("/api/v1/loans/available-assets");
      const json = await res.json();
      if (json.success) {
        setAvailableAssets(json.data);
      }
      setIsLoadingAssets(false);
    } catch (err) {
      toast.error("Erro ao carregar equipamentos disponíveis.");
      setIsLoadingAssets(false);
    }
  };

  const formatDateTimeForInput = (date: Date) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Atalhos rápidos de prazo
  const applyPresetTime = (type: "2h" | "4h" | "end_of_day" | "24h" | "3d" | "7d") => {
    const d = new Date();
    switch (type) {
      case "2h":
        d.setHours(d.getHours() + 2);
        break;
      case "4h":
        d.setHours(d.getHours() + 4);
        break;
      case "end_of_day":
        d.setHours(18, 0, 0, 0);
        if (d < new Date()) {
          d.setDate(d.getDate() + 1);
        }
        break;
      case "24h":
        d.setDate(d.getDate() + 1);
        break;
      case "3d":
        d.setDate(d.getDate() + 3);
        break;
      case "7d":
        d.setDate(d.getDate() + 7);
        break;
    }
    setExpectedReturnDate(formatDateTimeForInput(d));
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

    if (!expectedReturnDate) {
      toast.error("Informe a data e horário previstos para devolução.");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        assetId: selectedAssetId,
        borrowerName: borrowerName.trim(),
        borrowerEmail: borrowerEmail.trim() || undefined,
        borrowerPhone: borrowerPhone.trim() || undefined,
        borrowerDepartment: borrowerDepartment.trim() || undefined,
        destination: destination.trim(),
        expectedReturnDate: new Date(expectedReturnDate).toISOString(),
        notes: notes.trim() || undefined,
      };

      const res = await fetch("/api/v1/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Erro ao registrar empréstimo.");
      }

      toast.success(`Empréstimo registrado com sucesso para ${borrowerName}!`);
      onSuccess(json.data);
      onClose();
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Erro ao registrar empréstimo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedAssetId("");
    setAssetSearch("");
    setBorrowerName("");
    setBorrowerEmail("");
    setBorrowerPhone("");
    setBorrowerDepartment("");
    setDestination("");
    setNotes("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-primary/10 text-primary">
              <Handshake className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                Novo Empréstimo de Equipamento
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Registre o checkout de equipamentos multimídia e patrimoniais com geração de termo e rastreamento.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Seção 1: Seleção do Equipamento */}
          <div className="space-y-3 p-4 rounded-2xl bg-card border border-border/80 shadow-sm">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Monitor className="w-4 h-4 text-primary" />
                <span>1. Equipamento Patrimonial Disponível</span>
              </label>
              {availableAssets.length > 0 && (
                <Badge variant="available" className="text-[10px]">
                  {availableAssets.length} Disponíveis
                </Badge>
              )}
            </div>

            {/* Busca Rápida de Ativo */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por Patrimônio (#123456), Modelo ou Série..."
                value={assetSearch}
                onChange={(e) => setAssetSearch(e.target.value)}
                className="pl-9 text-xs rounded-xl h-9"
              />
            </div>

            {/* Lista de Ativos Disponíveis */}
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 divide-y divide-border/40">
              {isLoadingAssets ? (
                <div className="py-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Carregando acervo disponível...</span>
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Nenhum equipamento disponível encontrado para os termos da busca.
                </div>
              ) : (
                filteredAssets.map((asset) => {
                  const isSelected = selectedAssetId === asset.id;
                  return (
                    <div
                      key={asset.id}
                      onClick={() => setSelectedAssetId(asset.id)}
                      className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 text-xs ${
                        isSelected
                          ? "bg-primary/10 border border-primary/40 font-medium text-primary shadow-sm"
                          : "hover:bg-muted/60 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                          #{asset.assetTag}
                        </Badge>
                        <div className="truncate">
                          <p className="truncate font-semibold text-foreground">
                            {asset.item.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {asset.model ? `Mod: ${asset.model} • ` : ""}
                            {asset.currentBox ? `Armário: ${asset.currentBox.name} (${asset.currentBox.door.name})` : "Sem caixa"}
                          </p>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="flex items-center gap-1 text-[10px] text-primary font-bold shrink-0">
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
          <div className="space-y-3 p-4 rounded-2xl bg-card border border-border/80 shadow-sm">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <User className="w-4 h-4 text-primary" />
              <span>2. Dados do Solicitante / Responsável</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>Nome Completo *</span>
                </label>
                <Input
                  required
                  placeholder="Ex: Prof. João da Silva"
                  value={borrowerName}
                  onChange={(e) => setBorrowerName(e.target.value)}
                  className="text-xs rounded-xl h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  <span>Departamento / Curso</span>
                </label>
                <Input
                  placeholder="Ex: Coordenação de Medicina, DTI, Prograd"
                  value={borrowerDepartment}
                  onChange={(e) => setBorrowerDepartment(e.target.value)}
                  className="text-xs rounded-xl h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  <span>WhatsApp / Telefone</span>
                </label>
                <Input
                  placeholder="Ex: (96) 98111-2233"
                  value={borrowerPhone}
                  onChange={(e) => setBorrowerPhone(e.target.value)}
                  className="text-xs rounded-xl h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  <span>E-mail Institucional</span>
                </label>
                <Input
                  type="email"
                  placeholder="Ex: joao.silva@unifap.br"
                  value={borrowerEmail}
                  onChange={(e) => setBorrowerEmail(e.target.value)}
                  className="text-xs rounded-xl h-9"
                />
              </div>
            </div>
          </div>

          {/* Seção 3: Destino & Prazo de Retorno */}
          <div className="space-y-3 p-4 rounded-2xl bg-card border border-border/80 shadow-sm">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-primary" />
              <span>3. Destino de Uso & Prazo de Devolução</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>Local / Sala de Uso *</span>
                </label>
                <Input
                  required
                  placeholder="Ex: Auditório Principal, Sala 203 Bloco B"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="text-xs rounded-xl h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Data e Hora Previstas de Retorno *</span>
                </label>
                <Input
                  type="datetime-local"
                  required
                  value={expectedReturnDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                  className="text-xs rounded-xl h-9"
                />
              </div>
            </div>

            {/* Atalhos Rápidos de Prazo */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-muted-foreground font-semibold mr-1">Atalhos:</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPresetTime("2h")}
                className="h-6 text-[10px] px-2 rounded-lg"
              >
                +2 Horas
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPresetTime("4h")}
                className="h-6 text-[10px] px-2 rounded-lg"
              >
                +4 Horas
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPresetTime("end_of_day")}
                className="h-6 text-[10px] px-2 rounded-lg"
              >
                Fim do Turno (18h)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPresetTime("24h")}
                className="h-6 text-[10px] px-2 rounded-lg"
              >
                Amanhã (+24h)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPresetTime("3d")}
                className="h-6 text-[10px] px-2 rounded-lg"
              >
                +3 Dias
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPresetTime("7d")}
                className="h-6 text-[10px] px-2 rounded-lg"
              >
                +7 Dias
              </Button>
            </div>

            <div className="space-y-1 pt-1">
              <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <FileText className="w-3 h-3" />
                <span>Acessórios Inclusos & Observações</span>
              </label>
              <Input
                placeholder="Ex: Acompanha cabo HDMI 5m, cabo de força, controle remoto e bolsa protetora"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs rounded-xl h-9"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !selectedAssetId}
              className="gap-1.5 rounded-xl text-xs bg-gradient-to-r from-primary-600 to-indigo-600 text-white shadow-md shadow-primary/20"
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
