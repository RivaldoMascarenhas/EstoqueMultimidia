"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Printer, Download, Users, CheckCircle2, XCircle, FileText } from "lucide-react";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { normalizeImageUrl } from "@/lib/formatImageUrl";

interface AttendancePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: any;
  participants: any[];
  onDownloadCsv: (presenceOnly: boolean) => void;
}

export function AttendancePrintModal({
  isOpen,
  onClose,
  event,
  participants,
  onDownloadCsv,
}: AttendancePrintModalProps) {
  const [filter, setFilter] = useState<"all" | "present" | "absent">("present");

  const filteredList = participants.filter((p) => {
    const isPresent = Boolean(p.person?.presences && p.person.presences.length > 0);
    if (filter === "present") return isPresent;
    if (filter === "absent") return !isPresent;
    return true;
  });

  const presentCount = participants.filter(
    (p) => p.person?.presences && p.person.presences.length > 0
  ).length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-card border-border">
        {/* Modal Controls Header - Hidden on Print */}
        <DialogHeader className="p-4 sm:p-5 border-b border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
          <div>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <FileText className="h-5 w-5 text-primary" />
              <span>Lista Oficial de Presenças — {event?.name}</span>
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Visualização formatada para impressão institucional ou exportação em PDF.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="rounded-xl border border-input bg-background px-3 py-1.5 text-xs text-foreground font-semibold focus:outline-none"
            >
              <option value="present">Apenas Presentes ({presentCount})</option>
              <option value="all">Todos os Inscritos ({participants.length})</option>
              <option value="absent">Apenas Ausentes ({participants.length - presentCount})</option>
            </select>

            <button
              onClick={() => onDownloadCsv(filter === "present")}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-border bg-background hover:bg-accent text-foreground transition flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5 text-primary" />
              <span>Excel / CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 text-xs font-bold rounded-xl bg-primary hover:bg-primary/90 text-white shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Imprimir / PDF</span>
            </button>
          </div>
        </DialogHeader>

        {/* Printable Sheet Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white text-slate-900 font-sans print:p-0 print:overflow-visible">
          {/* Institutional Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BrandLogo variant="default" width={160} height={42} />
              {event?.logoUrl && (
                <>
                  <div className="h-8 w-[1px] bg-slate-300 mx-1" />
                  <img
                    src={normalizeImageUrl(event.logoUrl)}
                    alt={event.name}
                    className="h-10 max-w-[120px] object-contain"
                  />
                </>
              )}
            </div>

            <div className="text-right">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
                Relatório Oficial de Frequência & Presença
              </h2>
              <p className="text-[11px] text-slate-600 font-medium">
                Gerado em: {new Date().toLocaleString("pt-BR")}
              </p>
            </div>
          </div>

          {/* Event Summary Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Evento</span>
              <strong className="text-slate-800 text-sm">{event?.name}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Data / Horário</span>
              <span className="text-slate-700 font-medium">
                {event?.date ? new Date(event.date).toLocaleDateString("pt-BR") : "—"} {event?.time ? `às ${event.time}` : ""}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Local</span>
              <span className="text-slate-700 font-medium">{event?.location || "Auditório Principal"}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Resumo de Presença</span>
              <span className="text-slate-800 font-black">
                {presentCount} de {participants.length} presentes ({participants.length > 0 ? Math.round((presentCount / participants.length) * 100) : 0}%)
              </span>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-left text-xs border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                <th className="py-2 px-2.5 border-r border-slate-300 w-12 text-center">Nº</th>
                <th className="py-2 px-3 border-r border-slate-300">Nome do Participante</th>
                <th className="py-2 px-2.5 border-r border-slate-300 w-28">Matrícula</th>
                <th className="py-2 px-2.5 border-r border-slate-300 w-28">Categoria</th>
                <th className="py-2 px-2.5 border-r border-slate-300 w-20 text-center">Presença</th>
                <th className="py-2 px-2.5 border-r border-slate-300 w-28">Horário</th>
                <th className="py-2 px-3 w-40 text-center">Assinatura do Participante</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Nenhum participante encontrado para este filtro.
                  </td>
                </tr>
              ) : (
                filteredList.map((p, idx) => {
                  const presence = p.person?.presences?.[0];
                  const isPresent = Boolean(presence);

                  return (
                    <tr
                      key={p.id || idx}
                      className={`border-b border-slate-200 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}`}
                    >
                      <td className="py-2 px-2.5 border-r border-slate-300 text-center font-mono font-bold text-slate-600">
                        {p.ticketNumber ? String(p.ticketNumber).padStart(3, "0") : String(idx + 1).padStart(3, "0")}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-300 font-semibold text-slate-900">
                        {p.person?.name}
                      </td>
                      <td className="py-2 px-2.5 border-r border-slate-300 font-mono text-slate-600">
                        {p.person?.registration || "—"}
                      </td>
                      <td className="py-2 px-2.5 border-r border-slate-300 text-slate-600">
                        {p.person?.category || p.category || "Participante"}
                      </td>
                      <td className="py-2 px-2.5 border-r border-slate-300 text-center font-bold">
                        {isPresent ? (
                          <span className="text-emerald-700 font-bold">PRESENTE</span>
                        ) : (
                          <span className="text-slate-400 font-normal">AUSENTE</span>
                        )}
                      </td>
                      <td className="py-2 px-2.5 border-r border-slate-300 text-[11px] text-slate-600 font-mono">
                        {presence?.capturedAt
                          ? new Date(presence.capturedAt).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="py-2 px-3 border-b border-slate-300">
                        <div className="border-b border-dashed border-slate-400 h-4 w-full" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Footer Signature Box */}
          <div className="mt-8 pt-6 border-t border-slate-300 flex justify-between items-end text-xs text-slate-500">
            <div>
              <p className="font-semibold text-slate-700">Centro Universitário Paraíso — UniFAP</p>
              <p className="text-[10px]">Documento emitido automaticamente pelo Sistema de Eventos & Sorteios</p>
            </div>
            <div className="text-center w-64">
              <div className="border-b border-slate-800 w-full mb-1" />
              <p className="text-[10px] font-bold text-slate-700 uppercase">Assinatura do Responsável do Evento</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
