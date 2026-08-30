"use client";

import React, { useState, useEffect } from "react";
import { 
  Archive, 
  Loader2, 
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PhysicalCabinetView } from "@/components/cabinet/physical-cabinet-view";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

export default function ArmarioPage() {
  const [doors, setDoors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDoors = async (isInitial: boolean | unknown = false) => {
    try {
      if (isInitial === true) {
        setIsLoading(true);
        setError(null);
      }
      const res = await fetch("/api/v1/doors");
      const json = await res.json();

      if (!res.ok || !json.success) {
        if (isInitial === true) setError(json.error || "Erro ao carregar estrutura do armário.");
        return;
      }

      setDoors(json.data);
    } catch (err: any) {
      if (isInitial === true) setError("Erro de conexão ao carregar portas do armário.");
    } finally {
      if (isInitial === true) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoors(true);
  }, []);

  // Sincronização automática em segundo plano a cada 10s
  useAutoRefresh(() => fetchDoors(false), {
    intervalMs: 10000,
  });

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Archive className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
            <span>Armário Físico & Caixas</span>
          </h1>
          <Badge variant="normal" className="text-[11px] font-semibold px-2 py-0.5">
            {doors.length} Portas Ativas
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Organização física dos materiais e equipamentos divididos entre portas e caixas numeradas com QR Code.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Carregando armário e caixas do banco de dados...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center space-y-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400">
          <AlertCircle className="w-8 h-8 mx-auto" />
          <p className="text-sm font-semibold">{error}</p>
          <Button size="sm" variant="outline" onClick={fetchDoors} className="rounded-xl">
            Tentar Novamente
          </Button>
        </div>
      ) : (
        <PhysicalCabinetView doors={doors} onRefresh={fetchDoors} />
      )}
    </div>
  );
}
