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
        <Home className="w-3.5 h-3.5 text-primary" />
        <span>/</span>
        <span className="font-semibold text-foreground">Dashboard</span>
      </div>
    );
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>

      {segments.map((segment, index) => {
        const href = "/" + segments.slice(0, index + 1).join("/");
        const isLast = index === segments.length - 1;
        const label = ROUTE_LABELS[segment.toLowerCase()] || decodeURIComponent(segment);

        return (
          <React.Fragment key={href}>
            <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
            {isLast ? (
              <span className="font-semibold text-foreground truncate max-w-[150px] sm:max-w-none">
                {label}
              </span>
            ) : (
              <Link
                href={href}
                className="hover:text-foreground transition-colors truncate max-w-[120px] sm:max-w-none"
              >
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
