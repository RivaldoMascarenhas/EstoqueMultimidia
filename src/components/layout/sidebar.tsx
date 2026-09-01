"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { 
  Package, 
  LayoutDashboard, 
  Archive, 
  Boxes, 
  Monitor, 
  Handshake, 
  Wrench, 
  History, 
  BarChart3, 
  Users, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  X,
  Camera,
  CalendarDays,
  School,
  Calendar,
  Trophy,
  ScanFace,
  Gauge,
  Sparkles,
  ShieldCheck,
  QrCode,
  Layers,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface SubItem {
  title: string;
  href: string;
  badge?: string | number;
  roles?: string[];
}

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  badge?: string | number;
  roles?: string[];
  subItems?: SubItem[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function Sidebar({ 
  isMobileOpen, 
  onCloseMobile,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role || "OPERADOR";

  // Estado dos submenus abertos (fechados por padrão)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    estoque: false,
    patrimonio: false,
    eventos: false,
    gestao: false,
  });

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !(prev[key] ?? false) }));
  };

  // Travar o scroll da página de fundo no mobile enquanto o menu lateral estiver aberto
  useEffect(() => {
    if (isMobileOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  }, [isMobileOpen]);

  // Auto-abrir apenas o grupo correspondente à rota ativa atual
  useEffect(() => {
    if (pathname.startsWith("/estoque") || pathname.startsWith("/armario") || pathname.startsWith("/caixas") || pathname.startsWith("/movimentacoes")) {
      setOpenGroups((prev) => ({ ...prev, estoque: true }));
    } else if (pathname.startsWith("/patrimonio") || pathname.startsWith("/emprestimos") || pathname.startsWith("/manutencao")) {
      setOpenGroups((prev) => ({ ...prev, patrimonio: true }));
    } else if (pathname.startsWith("/eventos") || pathname.startsWith("/biometria") || pathname.startsWith("/sorteios")) {
      setOpenGroups((prev) => ({ ...prev, eventos: true }));
    } else if (pathname.startsWith("/relatorios") || pathname.startsWith("/usuarios") || pathname.startsWith("/configuracoes") || pathname.startsWith("/privacidade")) {
      setOpenGroups((prev) => ({ ...prev, gestao: true }));
    }
  }, [pathname]);

  const isEventosRole = userRole === "EVENTOS";

  const navSections: NavSection[] = isEventosRole
    ? [
        {
          title: "MÓDULO DE EVENTOS",
          items: [
            {
              title: "Dashboard",
              href: "/dashboard",
              icon: LayoutDashboard,
            },
            {
              title: "Meus Eventos",
              href: "/eventos",
              icon: Sparkles,
              badge: "Hub",
            },
            {
              title: "Presenças & Check-in",
              href: "/presenca",
              icon: ScanFace,
            },
            {
              title: "Sorteios",
              href: "/sorteios",
              icon: Trophy,
            },
            {
              title: "Pessoas & Participantes",
              href: "/biometria/pessoas",
              icon: Users,
            },
            {
              title: "Relatórios de Eventos",
              href: "/relatorios",
              icon: BarChart3,
            },
            {
              title: "Privacidade & LGPD",
              href: "/privacidade",
              icon: ShieldCheck,
            },
          ],
        },
      ]
    : [
        {
          title: "PRINCIPAL",
          items: [
            {
              title: "Dashboard",
              href: "/dashboard",
              icon: LayoutDashboard,
            },
            {
              title: "Scanner Operacional",
              href: "/scanner",
              icon: Camera,
              badge: "QR",
              roles: ["ADMIN", "GESTOR", "OPERADOR", "CONSULTA"],
            },
            {
              title: "Agenda Operacional",
              href: "/agenda",
              icon: CalendarDays,
              badge: "Turnos",
              roles: ["ADMIN", "GESTOR", "OPERADOR", "ACADEMIC_SUPPORT", "CONSULTA"],
            },
            {
              title: "Salas & Infra",
              href: "/salas",
              icon: School,
              roles: ["ADMIN", "GESTOR", "OPERADOR", "ACADEMIC_SUPPORT", "CONSULTA"],
            },
          ],
        },
        {
          title: "OPERAÇÃO",
          items: [
            {
              title: "Estoque",
              icon: Package,
              roles: ["ADMIN", "GESTOR", "OPERADOR", "CONSULTA"],
              subItems: [
                { title: "Catálogo de Itens", href: "/estoque" },
                { title: "Armário Físico", href: "/armario" },
                { title: "Caixas & QR Code", href: "/caixas" },
                { title: "Movimentações", href: "/movimentacoes" },
              ],
            },
            {
              title: "Patrimônio",
              icon: Monitor,
              roles: ["ADMIN", "GESTOR", "OPERADOR", "CONSULTA"],
              subItems: [
                { title: "Equipamentos", href: "/patrimonio" },
                { title: "Empréstimos", href: "/emprestimos" },
                { title: "Manutenções (OS)", href: "/manutencao" },
              ],
            },
            {
              title: "Eventos & Biometria",
              icon: ScanFace,
              roles: ["ADMIN", "GESTOR", "OPERADOR", "CONSULTA"],
              subItems: [
                { title: "Hub de Eventos", href: "/eventos" },
                { title: "Pessoas & Biometria", href: "/biometria/pessoas" },
                { title: "Laboratório Facial", href: "/biometria/testar", roles: ["ADMIN", "GESTOR"] },
              ],
            },
          ],
        },
        {
          title: "GESTÃO & SISTEMA",
          items: [
            {
              title: "Administração",
              icon: SlidersHorizontal,
              roles: ["ADMIN", "GESTOR", "CONSULTA"],
              subItems: [
                { title: "Relatórios & KPIs", href: "/relatorios" },
                { title: "Validador de Documentos", href: "/validar" },
                { title: "Gestão de Usuários", href: "/usuarios", roles: ["ADMIN"] },
                { title: "Configurações", href: "/configuracoes", roles: ["ADMIN"] },
                { title: "Privacidade & LGPD", href: "/privacidade" },
              ],
            },
          ],
        },
      ];

  const renderSidebarContent = (isMobileView: boolean) => {
    const collapsed = isMobileView ? false : isCollapsed;

    return (
      <div className="flex h-full flex-col overflow-hidden overscroll-contain bg-card text-foreground">
        {/* Brand Header (Fixo no Topo) */}
        <div className="shrink-0">
          <div className={cn(
            "flex h-16 items-center border-b border-border/80 transition-all",
            collapsed ? "justify-center px-0" : "justify-between px-4"
          )}>
            <Link href="/dashboard" className="flex items-center gap-3 group" title="UniFAP - Centro Universitário Paraíso">
              {collapsed ? (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card border border-border/80 shadow-sm p-1.5 hover:border-primary/50 transition-all">
                  <img
                    src="/brand/logo-unifap-quadrada.png"
                    alt="UniFAP"
                    className="h-full w-full object-contain dark:hidden"
                  />
                  <img
                    src="/brand/logo-unifap-quadrada-negativa.png"
                    alt="UniFAP"
                    className="h-full w-full object-contain hidden dark:block"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-auto flex items-center shrink-0">
                    <img
                      src="/brand/logo-unifap.png"
                      alt="UniFAP"
                      className="h-7 w-auto object-contain dark:hidden"
                    />
                    <img
                      src="/brand/logo-unifap-negativa.png"
                      alt="UniFAP"
                      className="h-7 w-auto object-contain hidden dark:block"
                    />
                  </div>
                  <div className="flex flex-col border-l border-border/80 pl-2 min-w-0">
                    <span className="text-[11px] font-bold text-foreground tracking-tight whitespace-nowrap leading-tight">
                      Estoque & Multimídia
                    </span>
                    <span className="text-[9px] font-medium text-muted-foreground whitespace-nowrap leading-none mt-0.5">
                      UniFAP • Suporte TI
                    </span>
                  </div>
                </div>
              )}
            </Link>

            {/* Mobile Close Button */}
            {isMobileView && (
              <button
                onClick={onCloseMobile}
                className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer transition-colors"
                title="Fechar menu"
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Sections (Área Rolável com Contenção de Scroll) */}
        <div className={cn(
          "flex-1 min-h-0 overflow-y-auto overscroll-y-contain overflow-x-hidden touch-pan-y space-y-5 py-3",
          collapsed ? "px-2" : "px-3"
        )}>
          {navSections.map((section, idx) => {
            const filteredItems = section.items.filter(
              (item) => !item.roles || item.roles.includes(userRole)
            );

            if (filteredItems.length === 0) return null;

            return (
              <div key={idx} className="space-y-1">
                {!collapsed ? (
                  <p className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                    {section.title}
                  </p>
                ) : (
                  <div className="h-px bg-border/60 mx-2 my-2" />
                )}
                
                <nav className="space-y-1">
                  {filteredItems.map((item) => {
                    const Icon = item.icon;
                    const groupKey = item.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(" ")[0];
                    const isGroupOpen = openGroups[groupKey] ?? false;

                    // Se for item simples com link direto
                    if (item.href) {
                      const isActive =
                        item.href === "/dashboard"
                          ? pathname === "/dashboard"
                          : pathname.startsWith(item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onCloseMobile}
                          title={collapsed ? item.title : undefined}
                          className={cn(
                            "group flex items-center rounded-xl text-sm font-medium transition-all duration-150 relative",
                            collapsed
                              ? "justify-center h-10 w-10 mx-auto px-0"
                              : "gap-3 px-3 py-2 w-full",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                              isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                            )}
                          />
                          {!collapsed && (
                            <span className="truncate flex-1 text-sm">{item.title}</span>
                          )}
                          {!collapsed && item.badge && (
                            <span className={cn(
                              "rounded-full px-2 py-0.5 text-[11px] font-bold",
                              isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"
                            )}>
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    }

                    // Se for grupo de submenu
                    if (item.subItems) {
                      const filteredSubItems = item.subItems.filter(
                        (sub) => !sub.roles || sub.roles.includes(userRole)
                      );
                      if (filteredSubItems.length === 0) return null;

                      const isAnySubActive = filteredSubItems.some((sub) => pathname.startsWith(sub.href));

                      if (collapsed) {
                        return (
                          <Link
                            key={item.title}
                            href={filteredSubItems[0].href}
                            onClick={onCloseMobile}
                            title={`${item.title}: ${filteredSubItems.map((s) => s.title).join(", ")}`}
                            className={cn(
                              "group flex items-center justify-center rounded-xl h-10 w-10 mx-auto px-0 transition-all duration-150 relative",
                              isAnySubActive
                                ? "bg-primary/15 text-primary font-semibold border border-primary/30"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                            )}
                          >
                            <Icon className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                          </Link>
                        );
                      }

                      return (
                        <div key={item.title} className="space-y-0.5">
                          <button
                            type="button"
                            onClick={() => toggleGroup(groupKey)}
                            className={cn(
                              "flex w-full items-center justify-between gap-3 px-3 py-2 text-sm font-medium rounded-xl transition-all cursor-pointer",
                              isAnySubActive
                                ? "text-primary font-semibold bg-primary/10"
                                : "text-muted-foreground hover:bg-accent/80 hover:text-foreground"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <Icon className={cn("h-4 w-4", isAnySubActive ? "text-primary" : "text-muted-foreground")} />
                              <span className="text-sm">{item.title}</span>
                            </div>
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                                isGroupOpen ? "rotate-180" : "rotate-0"
                              )}
                            />
                          </button>

                          {isGroupOpen && (
                            <div className="ml-4 pl-3 border-l-2 border-border/70 space-y-0.5 pt-0.5 pb-1 animate-in fade-in-50 duration-150">
                              {filteredSubItems.map((sub) => {
                                const isSubActive = pathname === sub.href || pathname.startsWith(sub.href + "/");

                                return (
                                  <Link
                                    key={sub.href}
                                    href={sub.href}
                                    onClick={onCloseMobile}
                                    className={cn(
                                      "flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                                      isSubActive
                                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                                        : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                                    )}
                                  >
                                    <span className="truncate text-xs">{sub.title}</span>
                                    {sub.badge && (
                                      <span className="rounded-full bg-primary/20 px-1.5 py-0.2 text-[10px] font-bold">
                                        {sub.badge}
                                      </span>
                                    )}
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }

                    return null;
                  })}
                </nav>
              </div>
            );
          })}
        </div>

        {/* Desktop Collapse Button (Fixo no Rodapé apenas para Desktop) */}
        {!isMobileView && (
          <div className={cn("shrink-0 border-t border-border/80", collapsed ? "p-2" : "p-3")}>
            <button
              onClick={onToggleCollapse}
              className={cn(
                "flex items-center justify-center rounded-xl text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-all cursor-pointer",
                collapsed ? "h-9 w-9 mx-auto" : "w-full gap-2 py-2 px-3 border border-border/40 hover:border-border/80"
              )}
              title={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4" />
                  <span className="text-xs font-medium">Recolher Menu</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40 border-r border-border/80 bg-card/95 backdrop-blur-xl transition-all duration-300 overscroll-contain shadow-xs",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden animate-in fade-in-0 duration-200 touch-none"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile Drawer Sheet */}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 z-50 w-72 max-w-[85vw] bg-card border-r border-border shadow-2xl md:hidden transition-transform duration-300 ease-in-out overscroll-contain touch-pan-y",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {renderSidebarContent(true)}
      </aside>
    </>
  );
}
