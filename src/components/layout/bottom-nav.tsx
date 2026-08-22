"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { 
  LayoutDashboard, 
  CalendarDays, 
  QrCode, 
  Handshake, 
  Boxes,
  PlusCircle,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role || "OPERADOR";

  // Itens para Apoio Acadêmico (Docentes / Solicitantes)
  if (userRole === "ACADEMIC_SUPPORT") {
    const academicItems = [
      {
        label: "Início",
        href: "/dashboard",
        icon: LayoutDashboard,
        isActive: pathname === "/dashboard",
      },
      {
        label: "Solicitar",
        href: "/agenda/nova-solicitacao",
        icon: PlusCircle,
        isActive: pathname === "/agenda/nova-solicitacao",
      },
      {
        label: "Scanner",
        href: "/scanner",
        icon: QrCode,
        isCenter: true,
        isActive: pathname === "/scanner",
      },
      {
        label: "Agenda",
        href: "/agenda",
        icon: CalendarDays,
        isActive: pathname.startsWith("/agenda") && pathname !== "/agenda/nova-solicitacao",
      },
      {
        label: "Perfil",
        href: "/perfil",
        icon: User,
        isActive: pathname === "/perfil",
      },
    ];

    return (
      <nav 
        aria-label="Navegação inferior mobile"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-xl border-t border-border/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.35)] px-2 pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {academicItems.map((item) => {
            const Icon = item.icon;
            if (item.isCenter) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center justify-center -mt-5 group"
                >
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 text-white shadow-lg shadow-primary/30 transition-all group-active:scale-95 group-hover:shadow-primary/50",
                      item.isActive && "ring-2 ring-background ring-offset-2 ring-offset-primary"
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-semibold mt-1 transition-colors",
                      item.isActive ? "text-primary font-bold" : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all select-none active:scale-95",
                  item.isActive
                    ? "text-primary font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-xl transition-colors",
                    item.isActive && "bg-primary/10 text-primary"
                  )}
                >
                  <Icon className={cn("h-5 w-5", item.isActive && "stroke-[2.5px]")} />
                </div>
                <span className="text-[10px] tracking-tight mt-0.5 leading-tight">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  // Itens para Operadores, Gestores e Administradores de TI & Multimídia
  const standardItems = [
    {
      label: "Início",
      href: "/dashboard",
      icon: LayoutDashboard,
      isActive: pathname === "/dashboard",
    },
    {
      label: "Agenda",
      href: "/agenda",
      icon: CalendarDays,
      isActive: pathname.startsWith("/agenda"),
    },
    {
      label: "Scanner",
      href: "/scanner",
      icon: QrCode,
      isCenter: true,
      isActive: pathname === "/scanner",
    },
    {
      label: "Empréstimos",
      href: "/emprestimos",
      icon: Handshake,
      isActive: pathname.startsWith("/emprestimos"),
    },
    {
      label: "Estoque",
      href: "/estoque",
      icon: Boxes,
      isActive: pathname.startsWith("/estoque") || pathname.startsWith("/armario") || pathname.startsWith("/caixas"),
    },
  ];

  return (
    <nav 
      aria-label="Navegação inferior mobile"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-xl border-t border-border/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.35)] px-2 pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {standardItems.map((item) => {
          const Icon = item.icon;
          if (item.isCenter) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-5 group"
              >
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 text-white shadow-lg shadow-primary/30 transition-all group-active:scale-95 group-hover:shadow-primary/50",
                    item.isActive && "ring-2 ring-background ring-offset-2 ring-offset-primary"
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-semibold mt-1 transition-colors",
                    item.isActive ? "text-primary font-bold" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all select-none active:scale-95",
                item.isActive
                  ? "text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-xl transition-colors",
                  item.isActive && "bg-primary/10 text-primary"
                )}
              >
                <Icon className={cn("h-5 w-5", item.isActive && "stroke-[2.5px]")} />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 leading-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
