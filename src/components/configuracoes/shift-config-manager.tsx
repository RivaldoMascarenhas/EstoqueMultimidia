"use client";

import React, { useState, useEffect } from "react";
import { 
  Save, 
  RefreshCw, 
  CalendarDays
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function ShiftConfigManager() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchConfigs = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/v1/shift-config");
      const data = await res.json();
      if (data.success) {
        setConfigs(data.data.configs);
      }
    } catch {
      toast.error("Erro ao carregar configurações de turno.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleChange = (index: number, field: string, value: string) => {
    setConfigs((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const payload = {
        configs: configs.map((c, index) => ({
          shift: c.shift,
          startTime: c.startTime,
          endTime: c.endTime,
          label: c.label,
          emoji: c.emoji,
          orderIndex: index + 1,
        })),
      };

      const res = await fetch("/api/v1/shift-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Horários dos turnos atualizados com sucesso!");
        fetchConfigs();
      } else {
        toast.error(data.error || "Erro ao salvar horários.");
      }
    } catch {
      toast.error("Erro na comunicação com o servidor.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="shadow-sm rounded-3xl border-border/80 overflow-hidden">
      <CardHeader className="p-6 pb-4 border-b border-border/60 bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              <span>Configuração dos Horários dos Turnos Operacionais</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Edite as faixas de horário (formato HH:mm) que definem automaticamente a organização da agenda em Manhã, Tarde e Noite.
            </CardDescription>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchConfigs}
            className="rounded-xl text-xs h-8"
            title="Recarregar"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
            Carregando horários dos turnos...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {configs.map((c, index) => {
                const shiftColor =
                  c.shift === "MORNING"
                    ? "border-amber-500/30 bg-amber-500/5"
                    : c.shift === "AFTERNOON"
                    ? "border-orange-500/30 bg-orange-500/5"
                    : "border-indigo-500/30 bg-indigo-500/5";

                return (
                  <div
                    key={c.shift}
                    className={`p-4 rounded-2xl border ${shiftColor} space-y-3`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{c.emoji}</span>
                        <div>
                          <span className="text-xs font-bold text-foreground">
                            {c.label || (c.shift === "MORNING" ? "Manhã" : c.shift === "AFTERNOON" ? "Tarde" : "Noite")}
                          </span>
                          <p className="text-[10px] text-muted-foreground">
                            Turno {index + 1}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-semibold">
                        {c.shift === "MORNING" ? "Matutino" : c.shift === "AFTERNOON" ? "Vespertino" : "Noturno"}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                          Nome de Exibição
                        </label>
                        <input
                          type="text"
                          required
                          value={c.label}
                          onChange={(e) => handleChange(index, "label", e.target.value)}
                          className="w-full h-8 text-xs rounded-xl border border-border bg-background px-2.5 text-foreground"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                            Início (HH:mm)
                          </label>
                          <input
                            type="text"
                            required
                            pattern="^([01]\d|2[0-3]):[0-5]\d$"
                            placeholder="07:00"
                            value={c.startTime}
                            onChange={(e) => handleChange(index, "startTime", e.target.value)}
                            className="w-full h-8 text-xs font-mono rounded-xl border border-border bg-background px-2.5 text-foreground"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                            Término (HH:mm)
                          </label>
                          <input
                            type="text"
                            required
                            pattern="^([01]\d|2[0-3]):[0-5]\d$"
                            placeholder="12:00"
                            value={c.endTime}
                            onChange={(e) => handleChange(index, "endTime", e.target.value)}
                            className="w-full h-8 text-xs font-mono rounded-xl border border-border bg-background px-2.5 text-foreground"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <span className="text-[11px] text-muted-foreground">
                * As alterações afetam imediatamente os novos agendamentos e o agrupamento visual da agenda.
              </span>

              <Button
                type="submit"
                disabled={isSaving}
                className="rounded-xl text-xs font-bold h-9 px-4 bg-primary text-primary-foreground gap-1.5 shadow-md shadow-primary/20"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? "Salvando..." : "Salvar Horários"}</span>
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
