"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { 
  Printer, 
  FileCheck2, 
  ShieldCheck, 
  Building2, 
  QrCode, 
  X, 
  CheckCircle2, 
  Clock, 
  AlertTriangle 
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime } from "@/lib/utils";
import QRCode from "qrcode";

interface LoanReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: any | null;
}

export function LoanReceiptModal({
  isOpen,
  onClose,
  loan,
}: LoanReceiptModalProps) {
  const { data: session } = useSession();
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  useEffect(() => {
    if (isOpen && loan) {
      const payload = JSON.stringify({
        unifap: "TI-MULTIMIDIA",
        protocol: `LOAN-${loan.id.slice(-8).toUpperCase()}`,
        assetTag: loan.asset?.assetTag,
        borrower: loan.borrowerName,
        date: loan.loanDate,
      });

      QRCode.toDataURL(payload, {
        width: 140,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch(() => setQrCodeDataUrl(""));
    }
  }, [isOpen, loan]);

  if (!loan) return null;

  const protocolNumber = `LOAN-${loan.id.slice(-8).toUpperCase()}`;
  const isReturned = loan.status === "RETURNED" || loan.status === "RETURNED_DAMAGED";
  const operatorName = loan.createdByUser?.name || session?.user?.name || "Suporte de TI - UniFAP";

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-3xl print:p-0 print:m-0 print:border-none print:shadow-none">
        {/* Barra superior de ações (oculta na impressão) */}
        <div className="flex items-center justify-between pb-3 border-b border-border print:hidden">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">
              Termo Oficial de Cautela & Responsabilidade
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              size="sm"
              className="gap-1.5 rounded-xl bg-primary text-primary-foreground shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Termo (A4)</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* FOLHA DO DOCUMENTO IMPRESSO (A4 FORMAT) */}
        <div className="print-area bg-white text-neutral-900 p-6 sm:p-8 rounded-2xl border border-neutral-300 shadow-sm print:border-none print:shadow-none print:p-4 text-xs font-sans">
          {/* Cabeçalho Institucional */}
          <div className="flex items-center justify-between border-b-2 border-neutral-800 pb-4 mb-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 font-black text-sm uppercase tracking-wider text-neutral-900">
                <Building2 className="w-5 h-5 text-neutral-800" />
                <span>CENTRO UNIVERSITÁRIO PARAÍSO - UNIFAP</span>
              </div>
              <p className="text-[11px] font-semibold text-neutral-700">
                Gerência de Operações & Tecnologia da Informação • Juazeiro do Norte - CE
              </p>
              <p className="text-[10px] text-neutral-600">
                Setor de Suporte de TI & Equipamentos Multimídia • Armário Central
              </p>
            </div>

            <div className="text-right shrink-0">
              <div className="px-2.5 py-1 bg-neutral-100 border border-neutral-300 rounded font-mono font-bold text-xs text-neutral-900">
                {protocolNumber}
              </div>
              <span className="text-[9px] text-neutral-500 block mt-0.5">
                Emitido em: {formatDateTime(loan.loanDate)}
              </span>
            </div>
          </div>

          {/* Título do Termo */}
          <div className="text-center my-3">
            <h1 className="text-sm sm:text-base font-black uppercase tracking-wide text-neutral-900">
              {isReturned
                ? "COMPROVANTE DE DEVOLUÇÃO E ENCERRAMENTO DE CAUTELA"
                : "TERMO DE CAUTELA E RESPONSABILIDADE POR EQUIPAMENTO INSTITUCIONAL"}
            </h1>
            <p className="text-[10px] text-neutral-600">
              Controle Patrimonial e Rastreabilidade Institucional de Ativos • UniFAP
            </p>
          </div>

          {/* Status Badge */}
          <div className="my-2.5 flex items-center justify-between p-2 rounded bg-neutral-50 border border-neutral-200">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[11px] text-neutral-800">Situação do Empréstimo:</span>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                isReturned 
                  ? "bg-emerald-100 text-emerald-800" 
                  : "bg-amber-100 text-amber-800"
              }`}>
                {isReturned 
                  ? (loan.status === "RETURNED_DAMAGED" ? "DEVOLVIDO COM AVARIA" : "DEVOLVIDO REGULARMENTE")
                  : "EM ANDAMENTO / ATIVO"}
              </span>
            </div>
            <div className="text-[10px] text-neutral-600">
              Operador Responsável: <b>{operatorName}</b>
            </div>
          </div>

          {/* Bloco 1: Identificação do Solicitante / Responsável */}
          <div className="my-3 space-y-1">
            <h3 className="font-bold text-[11px] uppercase tracking-wider text-neutral-800 border-b border-neutral-300 pb-0.5">
              1. Identificação do Solicitante / Depositário
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-neutral-800 pt-1">
              <div>
                <span className="font-semibold text-neutral-600">Nome Completo:</span>{" "}
                <b>{loan.borrowerName}</b>
              </div>
              <div>
                <span className="font-semibold text-neutral-600">Departamento/Curso:</span>{" "}
                {loan.borrowerDepartment || "Não informado"}
              </div>
              <div>
                <span className="font-semibold text-neutral-600">WhatsApp / Telefone:</span>{" "}
                {loan.borrowerPhone || "Não informado"}
              </div>
              <div>
                <span className="font-semibold text-neutral-600">E-mail:</span>{" "}
                {loan.borrowerEmail || "Não informado"}
              </div>
              <div className="col-span-2">
                <span className="font-semibold text-neutral-600">Local de Uso / Destino:</span>{" "}
                <b>{loan.destination}</b>
              </div>
            </div>
          </div>

          {/* Bloco 2: Identificação do Equipamento */}
          <div className="my-3 space-y-1">
            <h3 className="font-bold text-[11px] uppercase tracking-wider text-neutral-800 border-b border-neutral-300 pb-0.5">
              2. Especificação do Equipamento & Acessórios
            </h3>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-[11px] text-neutral-800 pt-1">
              <div>
                <span className="font-semibold text-neutral-600">Nº Patrimônio:</span>{" "}
                <b className="font-mono text-xs">#{loan.asset?.assetTag}</b>
              </div>
              <div>
                <span className="font-semibold text-neutral-600">Modelo:</span>{" "}
                {loan.asset?.model || loan.asset?.item?.model || "-"}
              </div>
              <div>
                <span className="font-semibold text-neutral-600">Nº de Série:</span>{" "}
                <span className="font-mono">{loan.asset?.serialNumber || "N/A"}</span>
              </div>
              <div className="col-span-3">
                <span className="font-semibold text-neutral-600">Descrição do Item:</span>{" "}
                <b>{loan.asset?.item?.name}</b>
              </div>
              {loan.notes && (
                <div className="col-span-3 bg-neutral-50 p-1.5 rounded border border-neutral-200 text-[10px]">
                  <span className="font-semibold text-neutral-700">Acessórios / Observações de Saída:</span>{" "}
                  {loan.notes}
                </div>
              )}
            </div>
          </div>

          {/* Bloco 3: Prazos e Movimentações */}
          <div className="my-3 space-y-1">
            <h3 className="font-bold text-[11px] uppercase tracking-wider text-neutral-800 border-b border-neutral-300 pb-0.5">
              3. Controle de Prazos e Devolução
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-neutral-800 pt-1">
              <div className="p-2 rounded bg-neutral-50 border border-neutral-200">
                <span className="text-[10px] text-neutral-500 block">Data de Retirada (Saída)</span>
                <span className="font-bold">{formatDateTime(loan.loanDate)}</span>
              </div>
              <div className="p-2 rounded bg-neutral-50 border border-neutral-200">
                <span className="text-[10px] text-neutral-500 block">Prazo Previsto de Devolução</span>
                <span className="font-bold">{formatDateTime(loan.expectedReturnDate)}</span>
              </div>
              <div className="p-2 rounded bg-neutral-50 border border-neutral-200 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-neutral-500 block">Devolução Efetiva</span>
                <span className="font-bold">
                  {loan.actualReturnDate ? formatDateTime(loan.actualReturnDate) : "Pendente"}
                </span>
              </div>
            </div>

            {isReturned && (
              <div className="p-2 rounded bg-neutral-50 border border-neutral-200 mt-2 text-[10px] space-y-0.5">
                <div>
                  <span className="font-bold text-neutral-700">Condição de Recebimento:</span>{" "}
                  {loan.returnedCondition || "Perfeito estado"}
                </div>
                {loan.returnNotes && (
                  <div>
                    <span className="font-bold text-neutral-700">Observações da Devolução:</span>{" "}
                    {loan.returnNotes}
                  </div>
                )}
                {loan.receivedByUser && (
                  <div>
                    <span className="font-bold text-neutral-700">Recebido por:</span>{" "}
                    {loan.receivedByUser.name} ({loan.receivedByUser.email})
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cláusulas de Responsabilidade */}
          <div className="my-3 p-2.5 rounded bg-neutral-50 border border-neutral-200 text-[9px] text-neutral-700 leading-tight space-y-1">
            <p className="font-bold uppercase tracking-wider text-neutral-900 text-[9.5px]">
              Cláusulas e Termos de Responsabilidade:
            </p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>
                O solicitante declara ter recebido o equipamento e seus respectivos cabos/acessórios em perfeito estado de funcionamento e conservação.
              </li>
              <li>
                Compromete-se a zelar pela guarda, integridade e uso estritamente acadêmico/institucional do bem no local acordado, sendo vedada a cessão a terceiros sem autorização prévia.
              </li>
              <li>
                Oportunamente, compromete-se a restituir o equipamento ao Setor de Suporte de TI no horário e data estipulados neste termo.
              </li>
              <li>
                Em caso de avaria, perda, furto ou extravio, o depositário comunicará imediatamente o setor para apuração administrativa cabível.
              </li>
            </ol>
          </div>

          {/* Bloco de Assinaturas e QR Code */}
          <div className="mt-6 pt-4 border-t-2 border-neutral-300 grid grid-cols-3 gap-4 items-end">
            {/* Assinatura do Solicitante */}
            <div className="text-center">
              <div className="border-b border-neutral-800 pb-1 mb-1 font-mono text-[10px]">
                ________________________________
              </div>
              <p className="font-bold text-[10px] text-neutral-900">{loan.borrowerName}</p>
              <p className="text-[9px] text-neutral-500">Assinatura do Solicitante / Depositário</p>
            </div>

            {/* Assinatura do Operador de TI */}
            <div className="text-center">
              <div className="border-b border-neutral-800 pb-1 mb-1 font-mono text-[10px]">
                ________________________________
              </div>
              <p className="font-bold text-[10px] text-neutral-900">
                {operatorName}
              </p>
              <p className="text-[9px] text-neutral-500">Operador Responsável / TI Multimídia</p>
            </div>

            {/* QR Code de Autenticidade */}
            <div className="flex flex-col items-center justify-center text-center">
              {qrCodeDataUrl && (
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code do Empréstimo"
                  className="w-16 h-16 border border-neutral-300 rounded p-0.5"
                />
              )}
              <span className="text-[8px] font-mono text-neutral-500 mt-0.5">
                Autenticação: {loan.id.slice(0, 10)}
              </span>
            </div>
          </div>
        </div>

        {/* Estilo CSS customizado para impressão nativa limpa */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-area, .print-area * {
              visibility: visible;
            }
            .print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              border: none !important;
              box-shadow: none !important;
              padding: 0 !important;
              margin: 0 !important;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
