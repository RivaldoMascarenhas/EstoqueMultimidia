"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  History, 
  ArrowLeft, 
  CheckCircle2, 
  RefreshCw, 
  Plus, 
  Check
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function RevisaoLegadoPage() {
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal de Confirmação e Edição do Evento
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [confirmedRoomId, setConfirmedRoomId] = useState("");
  const [confirmedProfessor, setConfirmedProfessor] = useState("");
  const [confirmedDiscipline, setConfirmedDiscipline] = useState("");
  const [confirmedNotes, setConfirmedNotes] = useState("");

  // Modal de Importação em Lote
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [pendingRes, roomsRes] = await Promise.all([
        fetch("/api/v1/requests/pending-review"),
        fetch("/api/v1/rooms?activeOnly=true"),
      ]);
      const pendingData = await pendingRes.json();
      const roomsData = await roomsRes.json();

      if (pendingData.success) setPendingRequests(pendingData.data);
      if (roomsData.success) setRooms(roomsData.data);
    } catch (err) {
      console.error("Erro ao carregar solicitações para revisão:", err);
      toast.error("Erro ao carregar fila de revisão.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenReviewModal = (req: any) => {
    setSelectedReq(req);
    setConfirmedRoomId(req.roomId || (rooms[0]?.id || ""));
    setConfirmedProfessor(req.professorName || "");
    setConfirmedDiscipline(req.discipline || "");
    setConfirmedNotes(req.notes || "");
    setModalOpen(true);
  };

  const handleConfirmReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    try {
      setIsSaving(true);
      const payload = {
        roomId: confirmedRoomId,
        professorName: confirmedProfessor.trim(),
        discipline: confirmedDiscipline.trim() || undefined,
        notes: confirmedNotes.trim() || undefined,
      };

      const res = await fetch(`/api/v1/requests/${selectedReq.id}/confirm-review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Solicitação revisada e confirmada na agenda com sucesso!");
        setModalOpen(false);
        fetchData();
      } else {
        toast.error(data.error || "Erro ao confirmar revisão.");
      }
    } catch {
      toast.error("Erro na comunicação com o servidor.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!jsonInput.trim()) {
      toast.error("Cole o JSON de eventos legados.");
      return;
    }

    try {
      setIsImporting(true);
      const parsed = JSON.parse(jsonInput);
      const events = Array.isArray(parsed) ? parsed : parsed.events || [];

      const res = await fetch("/api/v1/requests/import-legacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Eventos importados para a fila de revisão!");
        setImportModalOpen(false);
        setJsonInput("");
        fetchData();
      } else {
        toast.error(data.error || "Falha na importação.");
      }
    } catch (err: any) {
      toast.error("JSON inválido: " + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in-50 duration-300 pb-12">
      
      {/* 1. Header */}
      <div className="flex items-center justify-between gap-4">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="rounded-xl text-xs gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Link href="/agenda">
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para Agenda</span>
          </Link>
        </Button>

        <Button
          onClick={() => setImportModalOpen(true)}
          variant="outline"
          size="sm"
          className="rounded-xl text-xs gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Importar Novo Lote Legado</span>
        </Button>
      </div>

      <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-xs space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="low" className="text-[10px]">
            Transição Assistida
          </Badge>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
          <span>Revisão Humana de Eventos Legados ({pendingRequests.length})</span>
        </h1>
        <p className="text-xs text-muted-foreground">
          Eventos migrados do Google Calendar antigo antes da virada do formulário estruturado. Nenhum evento importado aparece como <strong>PREPARADO</strong> automaticamente sem a conferência manual de um operador.
        </p>
      </div>

      {/* 2. Lista de Solicitações Aguardando Revisão */}
      {isLoading ? (
        <div className="p-16 text-center text-muted-foreground animate-pulse rounded-3xl bg-card border border-border/60">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-xs">Carregando eventos pendentes de revisão...</p>
        </div>
      ) : pendingRequests.length === 0 ? (
        <Card className="rounded-3xl border-border/80 p-12 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">Fila de Revisão Vazia!</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Todos os eventos legados foram revisados ou não há pendências na fila de importação assistida.
          </p>
          <Button asChild size="sm" variant="outline" className="rounded-xl text-xs mt-2">
            <Link href="/agenda">Ir para a Agenda Operacional</Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {pendingRequests.map((req) => {
            const startStr = new Date(req.startTime).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            });
            const endStr = new Date(req.endTime).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <Card
                key={req.id}
                className="rounded-2xl border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60 transition-all p-4 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-lg border border-amber-500/30">
                        {formatDate(req.date)} • {startStr} às {endStr}
                      </span>
                      <span className="font-extrabold text-xs bg-card px-2 py-0.5 rounded-lg border border-border">
                        Sala Detectada: {req.room?.name || "Não identificada"}
                      </span>
                      <Badge variant="low" className="text-[9px]">
                        Revisão Pendente
                      </Badge>
                    </div>

                    <p className="text-sm font-bold text-foreground pt-1">
                      {req.professorName || "Professor não identificado"}
                    </p>

                    {req.notes && (
                      <p className="text-xs text-muted-foreground font-mono bg-card/60 p-2 rounded-xl border border-border/40 max-w-2xl">
                        {req.notes}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0">
                    <Button
                      onClick={() => handleOpenReviewModal(req)}
                      size="sm"
                      className="rounded-xl text-xs h-9 font-bold bg-amber-500 hover:bg-amber-600 text-amber-950 gap-1.5 shadow-sm"
                    >
                      <Check className="w-4 h-4" />
                      <span>Revisar & Confirmar</span>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 3. Modal de Revisão & Confirmação de Evento */}
      <Dialog open={modalOpen} onOpenChange={(open) => !open && setModalOpen(false)}>
        <DialogContent className="max-w-lg rounded-3xl border-border bg-card shadow-2xl p-6">
          <DialogHeader className="pb-3 border-b border-border/80">
            <DialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span>Confirmar Evento na Agenda Operacional</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Ajuste e confirme os dados extraídos do Google Calendar antes de liberar para o preparo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmReview} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">Sala Confirmada *</label>
              <select
                required
                value={confirmedRoomId}
                onChange={(e) => setConfirmedRoomId(e.target.value)}
                className="w-full h-9 text-xs rounded-xl border border-border bg-background px-2.5 text-foreground focus:ring-1 focus:ring-primary"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Sala {r.name} ({r.floor || "Campus"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">Nome do(a) Professor(a) *</label>
              <input
                type="text"
                required
                value={confirmedProfessor}
                onChange={(e) => setConfirmedProfessor(e.target.value)}
                className="w-full h-9 text-xs rounded-xl border border-border bg-background px-2.5 text-foreground focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">Disciplina / Atividade</label>
              <input
                type="text"
                value={confirmedDiscipline}
                onChange={(e) => setConfirmedDiscipline(e.target.value)}
                className="w-full h-9 text-xs rounded-xl border border-border bg-background px-2.5 text-foreground focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">Observações de Apoio</label>
              <input
                type="text"
                value={confirmedNotes}
                onChange={(e) => setConfirmedNotes(e.target.value)}
                className="w-full h-9 text-xs rounded-xl border border-border bg-background px-2.5 text-foreground focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                disabled={isSaving}
                size="sm"
                className="rounded-xl text-xs font-bold bg-primary text-primary-foreground"
              >
                {isSaving ? "Confirmando..." : "Confirmar na Agenda"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 4. Modal de Importação em Lote */}
      <Dialog open={importModalOpen} onOpenChange={(open) => !open && setImportModalOpen(false)}>
        <DialogContent className="max-w-lg rounded-3xl border-border bg-card shadow-2xl p-6">
          <DialogHeader className="pb-3 border-b border-border/80">
            <DialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              <span>Importação de Lote de Eventos Antigos</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cole o JSON exportado do Google Calendar com summary, location, description, startTime e endTime.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <textarea
              rows={8}
              placeholder={`[\n  {\n    "summary": "Notebook para Prof. João",\n    "location": "Sala 1A",\n    "startTime": "2026-08-18T08:00:00Z",\n    "endTime": "2026-08-18T10:00:00Z"\n  }\n]`}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="w-full text-xs font-mono rounded-xl border border-border bg-background p-3 text-foreground focus:ring-1 focus:ring-primary"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setImportModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancelar
              </Button>

              <Button
                type="button"
                onClick={handleExecuteImport}
                disabled={isImporting}
                size="sm"
                className="rounded-xl text-xs font-bold bg-primary text-primary-foreground"
              >
                {isImporting ? "Importando..." : "Processar Importação"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
