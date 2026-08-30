"use client";

import { useEffect, useRef, useCallback } from "react";

export interface UseAutoRefreshOptions {
  /**
   * Intervalo em milissegundos entre as sincronizações em segundo plano.
   * Padrão: 12000 ms (12 segundos).
   */
  intervalMs?: number;

  /**
   * Flag para habilitar ou pausar a sincronização automática (ex: pausar quando um modal/formulário está aberto).
   * Padrão: true.
   */
  enabled?: boolean;

  /**
   * Se verdadeiro, dispara uma sincronização silenciosa imediata quando o usuário volta o foco para a aba do navegador.
   * Padrão: true.
   */
  refreshOnFocus?: boolean;

  /**
   * Tempo mínimo (ms) entre sincronizações ao focar na janela para evitar chamadas redundantes imediatas.
   * Padrão: 3000 ms (3 segundos).
   */
  focusThrottleMs?: number;
}

/**
 * Hook universal de auto-sincronização silenciosa em segundo plano.
 * Permite manter múltiplas telas/computadores sincronizados automaticamente sem recarregar a página e sem travar a interface.
 */
export function useAutoRefresh(
  refreshFn: () => void | Promise<void>,
  options: UseAutoRefreshOptions = {}
) {
  const {
    intervalMs = 12000,
    enabled = true,
    refreshOnFocus = true,
    focusThrottleMs = 3000,
  } = options;

  const savedCallback = useRef(refreshFn);
  const lastRefreshTimeRef = useRef(Date.now());
  const isExecutingRef = useRef(false);

  useEffect(() => {
    savedCallback.current = refreshFn;
  }, [refreshFn]);

  const executeRefresh = useCallback(async () => {
    if (isExecutingRef.current || !enabled) return;
    if (typeof document !== "undefined" && document.hidden) return;

    try {
      isExecutingRef.current = true;
      lastRefreshTimeRef.current = Date.now();
      await savedCallback.current();
    } catch (err) {
      console.debug("[useAutoRefresh] Background sync error:", err);
    } finally {
      isExecutingRef.current = false;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;

    const intervalId = setInterval(() => {
      executeRefresh();
    }, intervalMs);

    const handleVisibilityOrFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible" && refreshOnFocus) {
        const now = Date.now();
        if (now - lastRefreshTimeRef.current >= focusThrottleMs) {
          executeRefresh();
        }
      }
    };

    if (typeof window !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityOrFocus);
      window.addEventListener("focus", handleVisibilityOrFocus);
    }

    return () => {
      clearInterval(intervalId);
      if (typeof window !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
        window.removeEventListener("focus", handleVisibilityOrFocus);
      }
    };
  }, [intervalMs, enabled, refreshOnFocus, focusThrottleMs, executeRefresh]);
}
