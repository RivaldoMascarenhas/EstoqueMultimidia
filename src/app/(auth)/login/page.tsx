"use client";

import React, { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { 
  Package, 
  Lock, 
  Mail, 
  ArrowRight, 
  Loader2, 
  ShieldCheck, 
  Server, 
  Moon, 
  Sun, 
  Eye, 
  EyeOff,
  UserCheck
} from "lucide-react";
import { useTheme } from "next-themes";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await signIn("credentials", {
        redirect: false,
        email: email.trim(),
        password,
        callbackUrl,
      });

      if (res?.error) {
        toast.error("Acesso negado: " + (res.error === "CredentialsSignin" ? "E-mail ou senha incorretos" : res.error));
        setIsLoading(false);
      } else if (res?.ok) {
        toast.success("Autenticação realizada com sucesso! Redirecionando...");
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      toast.error("Erro inesperado ao realizar login. Tente novamente.");
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (userEmail: string) => {
    setEmail(userEmail);
    setPassword("UniFAP@2026");
    toast.info(`Credenciais preenchidas para ${userEmail.split("@")[0].toUpperCase()}`);
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Acesse sua conta</h2>
        <p className="text-xs text-muted-foreground">
          Entre com suas credenciais institucionais do setor de TI.
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-primary" />
            E-mail Institucional
          </label>
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@unifap.br"
              required
              autoComplete="email"
              className="w-full px-4 py-2.5 text-sm bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-primary" />
              Senha de Acesso
            </label>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              autoComplete="current-password"
              className="w-full px-4 py-2.5 pr-10 text-sm bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-primary-foreground font-medium text-sm shadow-lg shadow-primary/30 flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Autenticando...</span>
            </>
          ) : (
            <>
              <span>Entrar no Sistema</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </button>
      </form>

      {/* Atalhos Rápidos para Teste de Perfis da Equipe */}
      <div className="pt-4 border-t border-border/80 space-y-3">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
          <span className="flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
            Acesso Rápido - Equipe TI:
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">Senha: UniFAP@2026</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleQuickLogin("rivaldo@unifap.br")}
            className="p-2 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted/80 text-left transition-all group"
          >
            <div className="text-xs font-semibold text-foreground group-hover:text-primary">Rivaldo</div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">ADMIN</div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin("rodrigo@unifap.br")}
            className="p-2 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted/80 text-left transition-all group"
          >
            <div className="text-xs font-semibold text-foreground group-hover:text-primary">Rodrigo</div>
            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-bold">GESTOR</div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin("thomas@unifap.br")}
            className="p-2 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted/80 text-left transition-all group"
          >
            <div className="text-xs font-semibold text-foreground group-hover:text-primary">Thomas</div>
            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-bold">OPERADOR</div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin("pedro@unifap.br")}
            className="p-2 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted/80 text-left transition-all group"
          >
            <div className="text-xs font-semibold text-foreground group-hover:text-primary">Pedro</div>
            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-bold">OPERADOR</div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const isDark = (resolvedTheme || theme) === "dark";
    setTheme(isDark ? "light" : "dark");
  };

  const isDarkMode = mounted && (resolvedTheme || theme) === "dark";

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center relative overflow-hidden bg-background text-foreground p-4 sm:p-6 transition-colors duration-300">
      {/* Dynamic Background Glow / Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--muted-foreground)/0.07)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--muted-foreground)/0.07)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-primary/20 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[250px] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Top Bar with Theme Toggle */}
      <div className="absolute top-5 right-6 z-20 flex items-center gap-3">
        <button
          onClick={toggleTheme}
          aria-label="Alternar tema"
          className="p-2.5 rounded-xl border border-border bg-card/80 hover:bg-accent text-foreground transition-all backdrop-blur-md shadow-sm"
        >
          {mounted ? (
            isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500" />
            )
          ) : (
            <span className="w-4 h-4" />
          )}
        </button>
      </div>

      <div className="w-full max-w-md z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center">
            {isDarkMode ? (
              <img
                src="/brand/logo-unifap-negativa.png"
                alt="UniFAP - Centro Universitário Paraíso"
                className="h-14 w-auto object-contain drop-shadow-md"
              />
            ) : (
              <img
                src="/brand/logo-unifap.png"
                alt="UniFAP - Centro Universitário Paraíso"
                className="h-14 w-auto object-contain drop-shadow-sm"
              />
            )}
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-bold text-primary mb-1">
              Suporte de TI & Multimídia
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
              Estoque, Patrimônio & Empréstimos
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Centro Universitário Paraíso • Juazeiro do Norte - CE
            </p>
          </div>
        </div>

        {/* Form wrapped in Suspense for Next.js App Router static optimization */}
        <Suspense fallback={
          <div className="rounded-2xl border border-border bg-card/80 p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        }>
          <LoginForm />
        </Suspense>

        {/* Footer info */}
        <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-4">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Auditoria Ativa
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Server className="w-3.5 h-3.5 text-primary" />
            SSOT PostgreSQL
          </span>
        </div>
      </div>
    </div>
  );
}
