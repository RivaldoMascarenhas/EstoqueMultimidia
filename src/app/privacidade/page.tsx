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
} from "lucide-react";

export const metadata = {
  title: "Política de Privacidade & LGPD | UniFAP Multimídia & Eventos",
  description:
    "Termos de Privacidade, Proteção de Dados e Tratamento de Biometria Facial conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8">
      {/* Background radial glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#0080C8]/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#EAA023]/15 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto w-full space-y-8 relative z-10 py-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition border border-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Sistema</span>
          </Link>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Conformidade com a Lei nº 13.709/2018</span>
          </div>
        </div>

        {/* Page Title Card */}
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-6 sm:p-8 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            LGPD & Segurança Institucional
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Política de Privacidade & Proteção de Dados
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
            Esta política descreve as diretrizes adotadas pelo <strong>Centro Universitário Paraíso — UniFAP</strong> para o tratamento e a proteção dos dados pessoais e dados pessoais sensíveis (biometria facial) de alunos, professores, colaboradores e convidados.
          </p>
        </div>

        {/* Policy Sections */}
        <div className="space-y-6">
          {/* Section 1 */}
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-6 sm:p-8 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
              <Building2 className="w-5 h-5 text-amber-400" />
              1. Agente de Tratamento (Controlador)
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              O <strong>Centro Universitário Paraíso — UniFAP</strong> atua como Controlador dos dados pessoais coletados nas plataformas de Gestão de Apoio Multimídia, Empréstimos de Equipamentos e Sorteios em Eventos Acadêmicos. As operações são regidas pela Lei Geral de Proteção de Dados (Lei Federal nº 13.709/2018 - LGPD).
            </p>
          </div>

          {/* Section 2 */}
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-6 sm:p-8 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-emerald-400" />
              2. Dados Coletados e Finalidades
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-blue-400" />
                  Dados Pessoais Comuns
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  <strong>Campos:</strong> Nome completo, CPF, Matrícula acadêmica, E-mail, Telefone e Categoria institucional.<br />
                  <strong>Finalidade:</strong> Identificação individual, gestão de empréstimo de patrimônio e emissão de declarações de presença.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Lock className="w-4 h-4" />
                  Dados Pessoais Sensíveis (Biometria Facial)
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  <strong>Campos:</strong> Vetores numéricos de características faciais (embeddings de 128 dimensões).<br />
                  <strong>Finalidade:</strong> Autenticação ágil nos Totens de Presença e garantia de elegibilidade para sorteios de eventos (LGPD Art. 11, I e II, &apos;g&apos;).
                </p>
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-6 sm:p-8 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
              <Lock className="w-5 h-5 text-amber-400" />
              3. Segurança da Informação & Não Compartilhamento
            </h2>
            <ul className="list-disc list-inside text-xs text-slate-300 space-y-2 pl-1 leading-relaxed">
              <li><strong>Criptografia Vetorial:</strong> A biometria facial é processada e convertida em representações matemáticas impossíveis de serem reconstruídas em imagens fotográficas por agentes externos.</li>
              <li><strong>Não Comercialização:</strong> A UniFAP não comercializa, não aluga e não repassa quaisquer dados pessoais para empresas terceiras para fins de marketing.</li>
              <li><strong>Controle de Acesso Rígido:</strong> Apenas operadores autenticados com papéis específicos e trilha de auditoria completa possuem acesso às funções operacionais.</li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-6 sm:p-8 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
              <Scale className="w-5 h-5 text-blue-400" />
              4. Direitos dos Titulares de Dados (Art. 18 LGPD)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
              <div className="p-3.5 rounded-xl bg-black/30 border border-white/10">
                ✓ <strong>Acesso e Informação:</strong> Consulta sobre quais dados estão cadastrados.
              </div>
              <div className="p-3.5 rounded-xl bg-black/30 border border-white/10">
                ✓ <strong>Retificação:</strong> Atualização de telefones, e-mails e dados de cadastro.
              </div>
              <div className="p-3.5 rounded-xl bg-black/30 border border-white/10">
                ✓ <strong>Revogação do Consentimento:</strong> Retirada da autorização de biometria a qualquer momento.
              </div>
              <div className="p-3.5 rounded-xl bg-black/30 border border-white/10">
                ✓ <strong>Direito ao Esquecimento:</strong> Exclusão definitiva dos vetores biométricos mediante requisição.
              </div>
            </div>
          </div>

          {/* Section 5 */}
          <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/20 to-primary/5 backdrop-blur-md p-6 sm:p-8 space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
              <Mail className="w-5 h-5 text-amber-400" />
              5. Contato com o Encarregado de Dados (DPO)
            </h2>
            <p className="text-xs text-slate-200 leading-relaxed">
              Dúvidas, solicitações de revogação de consentimento ou pedidos de exclusão de dados biométricos podem ser encaminhados diretamente ao Encarregado de Dados (DPO) da UniFAP pelo e-mail:{" "}
              <a
                href="mailto:dpo@unifapce.edu.br"
                className="text-amber-400 font-bold hover:underline"
              >
                dpo@unifapce.edu.br
              </a>.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto w-full pt-8 pb-4 text-center border-t border-white/10 relative z-10">
        <p className="text-xs text-slate-400">
          Centro Universitário Paraíso — UniFAP • Coordenação de Gestão Multimídia & Eventos
        </p>
        <p className="text-[11px] text-slate-500 mt-1">
          Última revisão dos Termos de Privacidade: Agosto/2026 • Versão 1.2
        </p>
      </div>
    </div>
  );
}
