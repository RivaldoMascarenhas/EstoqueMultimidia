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
};

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

  const lastLabel = ROUTE_LABELS[segments[segments.length - 1].toLowerCase()] || decodeURIComponent(segments[segments.length - 1]);

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
        const label = ROUTE_LABELS[segment.toLowerCase()] || decodeURIComponent(segment);

        if (!isLast) {
          return (
            <React.Fragment key={href}>
              <ChevronRight className="hidden sm:inline-block w-3 h-3 text-muted-foreground/50 shrink-0" />
              <Link
                href={href}
                className="hidden sm:inline hover:text-foreground transition-colors truncate max-w-[120px]"
              >
                {label}
              </Link>
            </React.Fragment>
          );
        }

        return (
          <React.Fragment key={href}>
            <ChevronRight className="hidden sm:inline-block w-3 h-3 text-muted-foreground/50 shrink-0" />
            <span className="font-bold text-foreground truncate max-w-[130px] sm:max-w-none text-xs sm:text-sm">
              {label}
            </span>
          </React.Fragment>
        );
      })}
    </nav>
  );
}
