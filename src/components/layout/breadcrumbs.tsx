"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const ROUTE_LABELS: Record<string, string> = {
  // Módulos Principais
  dashboard: "Dashboard",
  estoque: "Estoque",
  armario: "Armário Físico",
  caixas: "Caixas Organizadoras",
  patrimonio: "Patrimônio & Equipamentos",
  emprestimos: "Empréstimos",
  manutencao: "Manutenção & Reparos",
  movimentacoes: "Movimentações",
  relatorios: "Relatórios & Auditoria",
  usuarios: "Usuários",
  configuracoes: "Configurações",
  perfil: "Meu Perfil",
  privacidade: "Privacidade & LGPD",
  validar: "Validador de Documentos",

  // Salas & Agendamento
  salas: "Salas & Agendamentos",
  agenda: "Agenda de Salas",

  // Scanner
  scanner: "Scanner Operacional",

  // Eventos & Presença
  eventos: "Hub de Eventos",
  sorteios: "Sorteios Ao Vivo",
  sorteio: "Sorteio Ao Vivo",
  presenca: "Controle de Presença",
  totem: "Totem de Autoatendimento",
  presentation: "Modo Telão",

  // Biometria
  biometria: "Biometria Facial",
  pessoas: "Pessoas & Alunos",
  cadastro: "Cadastro",
  importacao: "Importação em Massa",
  testar: "Laboratório Biométrico",

  // Ações Comuns
  novo: "Novo Cadastro",
  editar: "Editar",
  detalhes: "Detalhes",
  historico: "Histórico",
  auditoria: "Auditoria",
  permissoes: "Permissões de Acesso",
};

/**
 * Converte qualquer texto em formato Title Case (Primeira Letra Maiúscula em Cada Palavra),
 * tratando preposições em minúsculas (de, da, do, e, em, para, etc.).
 */
function toTitleCase(text: string): string {
  if (!text) return "";
  const cleaned = decodeURIComponent(text).replace(/[-_]+/g, " ").trim();
  const lowerPrepositions = new Set(["de", "da", "do", "dos", "das", "e", "em", "para", "com", "no", "na", "nos", "nas", "por"]);

  return cleaned
    .split(/\s+/)
    .map((word, idx) => {
      if (!word) return "";
      const lower = word.toLowerCase();
      if (idx > 0 && lowerPrepositions.has(lower)) {
        return lower;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function formatSegmentLabel(segment: string, prevSegment?: string): string {
  const lower = segment.toLowerCase().trim();
  if (ROUTE_LABELS[lower]) {
    return ROUTE_LABELS[lower];
  }

  // Verifica se o segmento é um CUID (ex: cmta89sdj002ji5jdvhmaoffz) ou UUID
  const isCuidOrUuid =
    /^[a-z0-9]{20,}$/i.test(segment) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);

  if (isCuidOrUuid) {
    const parent = prevSegment ? prevSegment.toLowerCase() : "";
    if (parent === "eventos") return "Painel do Evento";
    if (parent === "patrimonio" || parent === "itens") return "Ficha do Equipamento";
    if (parent === "emprestimos") return "Detalhes do Empréstimo";
    if (parent === "manutencao") return "Ordem de Serviço";
    if (parent === "usuarios") return "Perfil do Usuário";
    if (parent === "pessoas" || parent === "biometria") return "Ficha da Pessoa";
    if (parent === "caixas") return "Detalhes da Caixa";
    if (parent === "salas") return "Ficha da Sala";
    if (parent === "validar") return "Autenticidade";
    return "Detalhes";
  }

  // Fallback: Converte automaticamente para Title Case com primeira letra maiúscula
  return toTitleCase(segment);
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0 || pathname === "/dashboard") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Home className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="hidden sm:inline">/</span>
        <span className="font-bold text-foreground text-xs sm:text-sm">Dashboard</span>
      </div>
    );
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 hover:text-foreground transition-colors shrink-0"
        title="Página Inicial"
      >
        <Home className="w-3.5 h-3.5 text-primary" />
      </Link>

      {segments.map((segment, index) => {
        const href = "/" + segments.slice(0, index + 1).join("/");
        const isLast = index === segments.length - 1;
        const prevSegment = index > 0 ? segments[index - 1] : undefined;
        const label = formatSegmentLabel(segment, prevSegment);

        if (!isLast) {
          return (
            <React.Fragment key={href}>
              <ChevronRight className="inline-block w-3 h-3 text-muted-foreground/50 shrink-0" />
              <Link
                href={href}
                className="hover:text-foreground transition-colors truncate max-w-[140px] font-medium"
              >
                {label}
              </Link>
            </React.Fragment>
          );
        }

        return (
          <React.Fragment key={href}>
            <ChevronRight className="inline-block w-3 h-3 text-muted-foreground/50 shrink-0" />
            <span className="font-bold text-foreground truncate max-w-[180px] sm:max-w-none text-xs sm:text-sm">
              {label}
            </span>
          </React.Fragment>
        );
      })}
    </nav>
  );
}
