"use client";

import React, { createContext, useContext, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { LogOut, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";

interface LogoutContextType {
  isLoggingOut: boolean;
  triggerLogout: () => void;
}

const LogoutContext = createContext<LogoutContextType>({
  isLoggingOut: false,
  triggerLogout: () => {},
});

export function useLogout() {
  return useContext(LogoutContext);
}

export function LogoutProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const userName = session?.user?.name || "Usuário";
  const userFirstName = userName.split(" ")[0];
  const userAvatar = session?.user?.avatarUrl;

  const triggerLogout = () => {
    setIsLoggingOut(true);
    // Aguarda a animação visual fluida antes de efetivar o signOut do NextAuth
    setTimeout(() => {
      signOut({ callbackUrl: "/login" });
    }, 1300);
  };

  return (
    <LogoutContext.Provider value={{ isLoggingOut, triggerLogout }}>
      {children}

      {/* Overlay de Animação de Logout */}
      {isLoggingOut && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-background/85 backdrop-blur-2xl animate-in fade-in duration-300 select-none">
          {/* Efeitos de Luz de Fundo */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 blur-[140px] rounded-full pointer-events-none animate-pulse" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none" />

          {/* Card Central */}
          <div className="relative z-10 w-full max-w-sm mx-4 p-8 rounded-3xl bg-card/95 border border-border/80 shadow-2xl backdrop-blur-xl text-center space-y-6 animate-in zoom-in-95 duration-400 ease-out">
            
            {/* Ícone / Avatar Animado com Pulso */}
            <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
              {/* Anéis de Pulso */}
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping duration-1000" />
              <div className="absolute -inset-2 rounded-full border border-primary/30 animate-spin [animation-duration:6s]" />

              {/* Avatar ou Ícone Central */}
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-indigo-600 p-0.5 shadow-xl flex items-center justify-center overflow-hidden">
                <div className="w-full h-full rounded-full bg-card flex items-center justify-center overflow-hidden">
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt={userName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-indigo-500/20 flex items-center justify-center text-primary font-black text-2xl">
                      {userFirstName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Badge de Logout Sobreposta */}
                <div className="absolute bottom-0 right-0 p-1.5 rounded-full bg-rose-600 text-white shadow-lg">
                  <LogOut className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Mensagem de Despedida */}
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                <span>Encerrando Sessão</span>
              </div>
              <h3 className="text-xl font-black tracking-tight text-foreground">
                Até logo, {userFirstName}! 👋
              </h3>
              <p className="text-xs text-muted-foreground">
                Limpando credenciais de acesso e desconectando com segurança...
              </p>
            </div>

            {/* Barra de Progresso Animada */}
            <div className="space-y-2">
              <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden p-0.5 border border-border/60">
                <div className="h-full bg-gradient-to-r from-primary via-indigo-500 to-emerald-500 rounded-full animate-[progress_1.2s_ease-in-out_forwards] shadow-sm shadow-primary/50" />
              </div>
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Chaves criptográficas removidas</span>
              </div>
            </div>

          </div>
        </div>
      )}
    </LogoutContext.Provider>
  );
}
