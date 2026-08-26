"use client";

import React, { useState, useEffect } from "react";
import { Camera, Search, UserCheck, Sparkles, AlertCircle, ArrowRight } from "lucide-react";
import { BiometricEnrollModal } from "@/components/biometria/BiometricEnrollModal";
import { toast } from "sonner";

export default function BiometriaCadastroPage() {
  const [search, setSearch] = useState("");
  const [persons, setPersons] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);

  const handleSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/biometrics/persons?query=${encodeURIComponent(search.trim())}&limit=10`);
      const data = await res.json();
      if (data.success) {
        setPersons(data.items);
      }
    } catch {
      toast.error("Erro ao buscar pessoas.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Camera className="h-6 w-6 text-primary" />
          Cadastro de Biometria Facial
        </h1>
        <p className="text-xs text-muted-foreground">
          Selecione uma pessoa cadastrada no sistema para realizar a captura e vinculação do embedding facial 128D.
        </p>
      </div>

      {/* Step 1: Search Person */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">
            1
          </span>
          <h2 className="text-sm font-bold text-foreground">Localizar Pessoa / Participante</h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Digite o nome completo, matrícula institucional ou CPF..."
              className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </div>

        {/* Results List */}
        {persons.length > 0 && (
          <div className="divide-y divide-border/60 rounded-xl border border-border/80 bg-muted/10 overflow-hidden">
            {persons.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  setSelectedPerson(p);
                  setIsEnrollModalOpen(true);
                }}
                className="flex items-center justify-between p-3.5 hover:bg-primary/5 cursor-pointer transition-colors"
              >
                <div>
                  <p className="text-xs font-bold text-foreground">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Matrícula: {p.registration || "—"} • CPF: {p.cpf || "—"} • {p.category || "Geral"}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {p.hasFaceEnrolled ? (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Face Cadastrada
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      Pendente
                    </span>
                  )}
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 2: Information callout */}
      <div className="rounded-2xl border border-border/80 bg-muted/20 p-5 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-bold text-foreground">Diretrizes para Captura Biométrica</p>
          <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
            <li>Ambiente bem iluminado, sem sombras fortes no rosto.</li>
            <li>Rosto sem óculos escuros, bonés ou elementos que cubram sobrancelhas e queixo.</li>
            <li>A câmera utilizará o MediaPipe para validar enquadramento e recortar a face automaticamente.</li>
          </ul>
        </div>
      </div>

      <BiometricEnrollModal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        person={selectedPerson}
        onSuccess={() => {
          handleSearch();
        }}
      />
    </div>
  );
}
