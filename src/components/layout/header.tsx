"use client";

import React, { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { 
  Menu, 
  Search, 
  Sun, 
  Moon, 
  Bell, 
  LogOut, 
  Shield, 
  CheckCircle2, 
  AlertTriangle,
} from "lucide-react";
import { Breadcrumbs } from "./breadcrumbs";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onToggleMobileSidebar: () => void;
  onOpenSearch?: () => void;
}

export function Header({ onToggleMobileSidebar, onOpenSearch }: HeaderProps) {
  const { data: session } = useSession();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const isDark = (resolvedTheme || theme) === "dark";
    setTheme(isDark ? "light" : "dark");
  };

  const userRole = session?.user?.role || "OPERADOR";
  const userName = session?.user?.name || "Usuário";
  const userEmail = session?.user?.email || "usuario@unifap.br";

  const getRoleVariant = (role: string) => {
    switch (role) {
      case "ADMIN": return "admin";
      case "GESTOR": return "gestor";
      case "OPERADOR": return "operador";
      default: return "consulta";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const isDarkMode = mounted && (resolvedTheme || theme) === "dark";

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border/80 bg-background/80 px-4 sm:px-6 backdrop-blur-md transition-all">
      {/* Left: Hamburger (Mobile) + Breadcrumbs */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onToggleMobileSidebar}
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <Breadcrumbs />
      </div>

      {/* Right: Search, Notifications, Theme, User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Global Quick Search Button */}
        <button
          onClick={onOpenSearch}
          className="hidden sm:flex items-center gap-2 rounded-xl border border-input bg-card/60 px-3 py-1.5 text-xs text-muted-foreground shadow-sm hover:border-border hover:bg-card/90 transition-all"
        >
          <Search className="h-3.5 w-3.5 text-primary" />
          <span>Buscar itens, patrimônio, caixas...</span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>

        {/* Mobile Search Icon */}
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          onClick={onOpenSearch}
          aria-label="Buscar"
        >
          <Search className="h-4 w-4" />
        </Button>

        {/* Theme Switcher */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Alternar tema"
          className="rounded-xl"
        >
          {mounted ? (
            isDarkMode ? (
              <Sun className="h-4 w-4 text-amber-400 transition-transform duration-200 rotate-0 scale-100" />
            ) : (
              <Moon className="h-4 w-4 text-indigo-500 transition-transform duration-200 rotate-0 scale-100" />
            )
          ) : (
            <span className="h-4 w-4" />
          )}
        </Button>

        {/* Notification Bell Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-xl"
              aria-label="Notificações"
            >
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="absolute top-2 right-2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-2">
            <DropdownMenuLabel className="flex items-center justify-between py-1.5">
              <span className="font-semibold text-foreground">Alertas do Setor</span>
              <span className="text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full font-medium">
                2 pendentes
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="space-y-1 py-1">
              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-rose-700 dark:text-rose-400">
                    Estoque Crítico
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Adaptador USB-C para HDMI: restam 2 (mín: 5)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-700 dark:text-amber-400">
                    Empréstimo Vencendo Hoje
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Projetor Epson X49 (Prof. João - Sala 203)
                  </p>
                </div>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-5 w-px bg-border mx-0.5" />

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-xl p-1.5 hover:bg-accent/60 transition-colors focus:outline-none focus:ring-2 focus:ring-ring">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-500 text-xs font-bold text-white shadow-sm">
                {getInitials(userName)}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-semibold text-foreground leading-none">
                  {userName}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5 capitalize">
                  {userRole.toLowerCase()}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-1.5">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground leading-none">
                    {userName}
                  </p>
                  <Badge variant={getRoleVariant(userRole)} className="text-[10px] px-1.5 py-0">
                    {userRole}
                  </Badge>
                </div>
                <p className="text-[11px] leading-none text-muted-foreground truncate">
                  {userEmail}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 text-xs">
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
              <span>Nível de Acesso: {userRole}</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              <span>Sessão Ativa & Segura</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="gap-2 text-xs text-rose-600 dark:text-rose-400 focus:text-rose-600 focus:bg-rose-500/10 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Encerrar Sessão</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
