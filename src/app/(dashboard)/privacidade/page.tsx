"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  FileText,
  UserCheck,
  Building2,
  Mail,
  Scale,
  ArrowLeft,
  CheckCircle2,
  Shield,
  FileCheck2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in-50 duration-300 pb-12">
      {/* Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Privacidade & Proteção de Dados (LGPD)
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Diretrizes institucionais de segurança e governança de dados pessoais e biometria facial (Lei Federal nº 13.709/2018).
              </p>
            </div>
          </div>
        </div>

        <Badge variant="outline" className="gap-1.5 self-start sm:self-auto py-1.5 px-3 rounded-full border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-medium text-xs">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Conformidade com a LGPD</span>
        </Badge>
      </div>

      {/* Card de Apresentação */}
      <Card className="rounded-3xl border-border bg-card shadow-xl overflow-hidden">
        <CardHeader className="p-6 sm:p-8 space-y-3 bg-muted/20 border-b border-border/60">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider self-start">
            <Shield className="w-3.5 h-3.5" />
            <span>Segurança da Informação & Governança</span>
          </div>
          <CardTitle className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            Compromisso Institucional com a sua Privacidade
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Esta política descreve as diretrizes adotadas pelo <strong>Centro Universitário Paraíso — UniFAP</strong> para o tratamento e a proteção dos dados pessoais e dados pessoais sensíveis (biometria facial) de alunos, professores, colaboradores e convidados.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* Seção 1 */}
          <div className="p-5 rounded-2xl bg-muted/30 border border-border/70 space-y-2">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <span>1. Agente de Tratamento (Controlador)</span>
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              O <strong>Centro Universitário Paraíso — UniFAP</strong> atua como Controlador dos dados pessoais coletados nas plataformas de Gestão de Apoio Multimídia, Empréstimos de Equipamentos e Sorteios em Eventos Acadêmicos. As operações são regidas pela Lei Geral de Proteção de Dados (Lei Federal nº 13.709/2018 - LGPD).
            </p>
          </div>

          {/* Seção 2 */}
          <div className="p-5 rounded-2xl bg-muted/30 border border-border/70 space-y-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-500" />
              <span>2. Dados Coletados e Finalidades</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="p-4 rounded-xl bg-background border border-border/80 space-y-1.5">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-blue-500" />
                  Dados Pessoais Comuns
                </span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <strong>Campos:</strong> Nome completo, CPF, Matrícula acadêmica, E-mail, Telefone e Categoria institucional.<br />
                  <strong>Finalidade:</strong> Identificação individual, gestão de empréstimo de patrimônio e emissão de declarações de presença.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Lock className="w-4 h-4" />
                  Dados Pessoais Sensíveis (Biometria Facial)
                </span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <strong>Campos:</strong> Vetores numéricos de características faciais (embeddings de 128 dimensões).<br />
                  <strong>Finalidade:</strong> Autenticação ágil nos Totens de Presença e garantia de elegibilidade para sorteios de eventos (LGPD Art. 11, I e II, &apos;g&apos;).
                </p>
              </div>
            </div>
          </div>

          {/* Seção 3 */}
          <div className="p-5 rounded-2xl bg-muted/30 border border-border/70 space-y-2">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              <span>3. Segurança da Informação & Não Compartilhamento</span>
            </h2>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-2 pl-1 leading-relaxed">
              <li><strong>Criptografia Vetorial:</strong> A biometria facial é processada e convertida em representações matemáticas irreversíveis, impossíveis de serem reconstruídas em imagens fotográficas por agentes externos.</li>
              <li><strong>Não Comercialização:</strong> A UniFAP não comercializa, não aluga e não repassa quaisquer dados pessoais para empresas terceiras para fins comerciais ou publicitários.</li>
              <li><strong>Controle de Acesso Rígido:</strong> Apenas operadores autorizados com papéis específicos (RBAC) e trilha de auditoria completa possuem acesso às funções do sistema.</li>
            </ul>
          </div>

          {/* Seção 4 */}
          <div className="p-5 rounded-2xl bg-muted/30 border border-border/70 space-y-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Scale className="w-4 h-4 text-blue-500" />
              <span>4. Direitos dos Titulares de Dados (Art. 18 LGPD)</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-muted-foreground pt-1">
              <div className="p-3 rounded-xl bg-background border border-border/80">
                ✓ <strong className="text-foreground">Acesso e Informação:</strong> Consulta sobre quais dados estão cadastrados.
              </div>
              <div className="p-3 rounded-xl bg-background border border-border/80">
                ✓ <strong className="text-foreground">Retificação:</strong> Atualização de telefones, e-mails e dados de cadastro.
              </div>
              <div className="p-3 rounded-xl bg-background border border-border/80">
                ✓ <strong className="text-foreground">Revogação do Consentimento:</strong> Retirada da autorização de biometria a qualquer momento.
              </div>
              <div className="p-3 rounded-xl bg-background border border-border/80">
                ✓ <strong className="text-foreground">Direito ao Esquecimento:</strong> Exclusão definitiva dos vetores biométricos mediante requisição.
              </div>
            </div>
          </div>

          {/* Seção 5 */}
          <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              <span>5. Contato com o Encarregado de Dados (DPO)</span>
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Dúvidas, solicitações de revogação de consentimento ou pedidos de exclusão de dados biométricos podem ser encaminhados diretamente ao Encarregado de Dados (DPO) da UniFAP pelo e-mail:{" "}
              <a
                href="mailto:dpo@unifapce.edu.br"
                className="text-primary font-bold hover:underline"
              >
                dpo@unifapce.edu.br
              </a>.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Rodapé Institucional */}
      <div className="pt-2 text-center text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">
          Centro Universitário Paraíso — UniFAP • Coordenação de Gestão Multimídia & Eventos
        </p>
        <p className="text-[11px]">
          Última revisão dos Termos de Privacidade: Agosto/2026 • Versão 1.2
        </p>
      </div>
    </div>
  );
}
