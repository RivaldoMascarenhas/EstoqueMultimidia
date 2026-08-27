"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  estoque: "Estoque",
  armario: "Armário Físico",
  caixas: "Caixas",
  patrimonio: "Patrimônio & Equipamentos",
  emprestimos: "Empréstimos",
  manutencao: "Manutenção",
  movimentacoes: "Movimentações",
  relatorios: "Relatórios",
  usuarios: "Usuários",
  configuracoes: "Configurações",
  novo: "Novo Cadastro",
  eventos: "Hub de Eventos",
  biometria: "Biometria",
  pessoas: "Pessoas & Biometria",
  testar: "Lab Biométrico",
  scanner: "Scanner Mobile",
  agenda: "Agenda de Salas",
  sorteio: "Sorteio Ao Vivo",
  totem: "Totem Facial",
};

function formatSegmentLabel(segment: string, prevSegment?: string): string {
  const lower = segment.toLowerCase();
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
    if (parent === "patrimonio" || parent === "itens") return "Ficha do Item";
    if (parent === "emprestimos") return "Detalhes do Empréstimo";
    if (parent === "manutencao") return "Ordem de Serviço";
    if (parent === "usuarios") return "Perfil do Usuário";
    if (parent === "pessoas" || parent === "biometria") return "Ficha da Pessoa";
    if (parent === "caixas") return "Detalhes da Caixa";
    return "Detalhes";
  }

  return decodeURIComponent(segment);
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
        className="hidden sm:flex items-center gap-1 hover:text-foreground transition-colors shrink-0"
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
              <ChevronRight className="hidden sm:inline-block w-3 h-3 text-muted-foreground/50 shrink-0" />
              <Link
                href={href}
                className="hidden sm:inline hover:text-foreground transition-colors truncate max-w-[140px]"
              >
                {label}
              </Link>
            </React.Fragment>
          );
        }

        return (
          <React.Fragment key={href}>
            <ChevronRight className="hidden sm:inline-block w-3 h-3 text-muted-foreground/50 shrink-0" />
            <span className="font-bold text-foreground truncate max-w-[180px] sm:max-w-none text-xs sm:text-sm">
              {label}
            </span>
          </React.Fragment>
        );
      })}
    </nav>
  );
}
