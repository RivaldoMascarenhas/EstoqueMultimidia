"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  Lock,
  Eye,
  FileText,
  UserCheck,
  Trash2,
  Building2,
  Mail,
  Scale,
} from "lucide-react";

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] bg-card border-border p-0 overflow-hidden shadow-2xl rounded-3xl flex flex-col">
        {/* Header */}
        <DialogHeader className="p-6 border-b border-border/80 bg-muted/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Política de Privacidade & Proteção de Dados (LGPD)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Centro Universitário Paraíso — UniFAP • Lei Geral de Proteção de Dados (Lei nº 13.709/2018)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body with scroll */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-foreground leading-relaxed">
          {/* Section 1: Apresentação e Controlador */}
          <div className="space-y-2 p-4 rounded-2xl bg-muted/40 border border-border/80">
            <h4 className="font-bold text-sm text-primary flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              1. Agente de Tratamento (Controlador)
            </h4>
            <p className="text-muted-foreground">
              O <strong>Centro Universitário Paraíso — UniFAP</strong>, com sede em Juazeiro do Norte - CE, atua como <strong>Controlador</strong> dos dados pessoais e dados pessoais sensíveis coletados através da Plataforma de Gestão de Eventos, Estoque e Apoio Acadêmico Multimídia.
            </p>
          </div>

          {/* Section 2: Dados Coletados e Finalidades */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-500" />
              2. Dados Pessoais Coletados e Finalidades Específicas
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-border bg-card space-y-1.5">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                  Dados Pessoais Comuns
                </span>
                <p className="text-[11px] text-muted-foreground">
                  <strong>Dados:</strong> Nome completo, CPF, Matrícula acadêmica, E-mail, Telefone e Categoria institucional.<br />
                  <strong>Finalidade:</strong> Identificação do participante, controle de empréstimo de patrimônio multimídia e emissão de certificados.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1.5">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Dados Pessoais Sensíveis (Biometria Facial)
                </span>
                <p className="text-[11px] text-muted-foreground">
                  <strong>Dados:</strong> Vetor numérico de características faciais (embeddings criptografados de 128 dimensões).<br />
                  <strong>Finalidade:</strong> Autenticação ágil e sem filas no Totem de Presença e validação de elegibilidade para sorteios nos termos do Art. 11, I e II, &apos;g&apos; da LGPD.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Princípios de Segurança e Não Compartilhamento */}
          <div className="space-y-2">
            <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-500" />
              3. Segurança da Informação & Não Compartilhamento
            </h4>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 pl-1">
              <li><strong>Armazenamento Criptografado:</strong> As fotos são convertidas em representações matemáticas vetoriais (embeddings) e armazenadas de forma segura.</li>
              <li><strong>Não Comercialização:</strong> A UniFAP <strong>jamais</strong> comercializa, aluga ou compartilha dados pessoais com empresas terceiras para fins de marketing.</li>
              <li><strong>Acesso Restrito:</strong> Somente operadores e gestores autorizados com perfil de acesso e login autenticado têm permissão para operar o sistema.</li>
            </ul>
          </div>

          {/* Section 4: Direitos dos Titulares (Art. 18 LGPD) */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" />
              4. Direitos dos Titulares (Art. 18 da LGPD)
            </h4>
            <p className="text-muted-foreground text-[11px]">
              O titular dos dados pessoais tem direito a obter da UniFAP, a qualquer momento e mediante requisição:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60">
                ✓ <strong>Acesso e Confirmação:</strong> Saber quais dados estão armazenados.
              </div>
              <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60">
                ✓ <strong>Correção:</strong> Atualizar dados incompletos ou inexatos.
              </div>
              <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60">
                ✓ <strong>Revogação do Consentimento:</strong> Retirar a autorização de uso da biometria a qualquer tempo.
              </div>
              <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60">
                ✓ <strong>Eliminação dos Dados:</strong> Solicitar a exclusão definitiva dos dados biométricos.
              </div>
            </div>
          </div>

          {/* Section 5: Canal de Contato e Encarregado (DPO) */}
          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
            <h4 className="font-bold text-xs text-primary flex items-center gap-1.5 uppercase tracking-wide">
              <Mail className="w-4 h-4" />
              5. Canal de Atendimento ao Titular & DPO
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Para exercer seus direitos ou tirar dúvidas sobre o tratamento de seus dados pessoais, entre em contato com a Coordenação Multimídia ou com o Encarregado de Dados (DPO) da UniFAP através do e-mail:{" "}
              <a
                href="mailto:dpo@unifapce.edu.br"
                className="text-primary font-bold hover:underline"
              >
                dpo@unifapce.edu.br
              </a>{" "}
              ou pelo portal{" "}
              <a
                href="https://unifapce.edu.br"
                target="_blank"
                rel="noreferrer"
                className="text-primary font-bold hover:underline"
              >
                unifapce.edu.br
              </a>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/80 bg-muted/20 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-muted-foreground">
            Última atualização: <strong>Agosto/2026</strong> • Versão 1.2
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition shadow-sm cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
