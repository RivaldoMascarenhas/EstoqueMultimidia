"use client";

import React, { useState, useEffect } from "react";
import { 
  Settings, 
  Key, 
  Archive, 
  Package, 
  Plus, 
  Layers, 
  ShieldCheck, 
  Server, 
  CheckCircle2,
  Trash2,
  Lock,
  Copy
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { BoxFormModal } from "@/components/cabinet/box-form-modal";
import { DoorFormModal } from "@/components/cabinet/door-form-modal";
import { toast } from "sonner";

export default function ConfiguracoesPage() {
  const [doors, setDoors] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isBoxModalOpen, setIsBoxModalOpen] = useState(false);
  const [isDoorModalOpen, setIsDoorModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [doorsRes, catRes] = await Promise.all([
        fetch("/api/v1/doors"),
        fetch("/api/v1/categories"),
      ]);

      const doorsJson = await doorsRes.json();
      const catJson = await catRes.json();

      if (doorsJson.success) setDoors(doorsJson.data);
      if (catJson.success) setCategories(catJson.data);
      setIsLoading(false);
    } catch (err: any) {
      toast.error("Erro ao carregar configurações.");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const doorOptions = doors.map((d) => ({
    id: d.id,
    code: d.code,
    name: d.name,
  }));

  const allBoxes = doors.flatMap((d) =>
    d.boxes.map((b: any) => ({
      ...b,
      doorName: d.name,
    }))
  );

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Settings className="w-6 h-6 text-primary" />
              <span>Configurações do Sistema</span>
            </h1>
            <Badge variant="admin" className="text-xs">
              ADMINISTRATIVO
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gerenciamento da estrutura física do armário (Portas e Caixas), Categorias do Catálogo e Chaves de API para integrações.
          </p>
        </div>
      </div>

      <Tabs defaultValue="armario" className="w-full">
        <TabsList className="grid grid-cols-3 max-w-md">
          <TabsTrigger value="armario" className="text-xs font-semibold gap-1.5">
            <Archive className="w-3.5 h-3.5" />
            <span>Portas & Caixas</span>
          </TabsTrigger>
          <TabsTrigger value="categorias" className="text-xs font-semibold gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            <span>Categorias</span>
          </TabsTrigger>
          <TabsTrigger value="api" className="text-xs font-semibold gap-1.5">
            <Key className="w-3.5 h-3.5" />
            <span>Chaves n8n</span>
          </TabsTrigger>
        </TabsList>

        {/* ABA: Portas e Caixas */}
        <TabsContent value="armario" className="space-y-6 pt-4">
          {/* Seção de Portas */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  Portas do Armário ({doors.length})
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Grandes divisões físicas do armário de TI da UniFAP
                </CardDescription>
              </div>
              <Button
                onClick={() => setIsDoorModalOpen(true)}
                size="sm"
                className="gap-1.5 rounded-xl"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Porta</span>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Qtd Caixas</TableHead>
                    <TableHead>Posição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doors.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono font-bold text-xs text-primary">
                        {d.code}
                      </TableCell>
                      <TableCell className="font-bold text-xs text-foreground">
                        {d.name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {d.description || "-"}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold">
                        {d.boxes.length} caixas
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        #{d.orderIndex}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Seção de Caixas */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  Caixas Físicas Cadastradas ({allBoxes.length})
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Caixas numeradas com identificador único e QR Code
                </CardDescription>
              </div>
              <Button
                onClick={() => setIsBoxModalOpen(true)}
                size="sm"
                variant="emerald"
                className="gap-1.5 rounded-xl"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Caixa</span>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome da Caixa</TableHead>
                    <TableHead>Porta Alocada</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allBoxes.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono font-bold text-xs text-primary">
                        {b.code}
                      </TableCell>
                      <TableCell className="font-bold text-xs text-foreground">
                        {b.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {b.doorName}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {b.description || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.location.href = `/caixas/${b.code}`}
                          className="h-8 text-xs rounded-xl"
                        >
                          Ver Caixa
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA: Categorias */}
        <TabsContent value="categorias" className="space-y-4 pt-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-foreground">
                Categorias do Catálogo ({categories.length})
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Agrupamento dos materiais e equipamentos do setor de TI
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome da Categoria</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Itens Vinculados</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-bold text-xs text-foreground">
                        {c.name}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {c.slug}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.description || "-"}
                      </TableCell>
                      <TableCell className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                        {c._count?.items || 0} itens
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA: Chaves de API para n8n */}
        <TabsContent value="api" className="space-y-4 pt-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">
                    Chaves de API para Automações (n8n / WhatsApp)
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Chaves de serviço para consulta e disparo de alertas externos
                  </CardDescription>
                </div>
                <Badge variant="available" dot className="text-xs">
                  API v1 Ativa
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Chave de Serviço Mestre (n8n)</span>
                  <Badge variant="outline" className="font-mono text-[10px]">Ativa</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 rounded-xl bg-background border border-input font-mono text-xs text-muted-foreground">
                    unifap_sec_n8n_master_integration_key_2026
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText("unifap_sec_n8n_master_integration_key_2026");
                      toast.success("Chave de API copiada para a área de transferência!");
                    }}
                    className="rounded-xl gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Utilize esta chave no cabeçalho <code className="font-mono text-primary font-bold">Authorization: Bearer unifap_sec_...</code> para conectar seus workflows no n8n.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modais */}
      <BoxFormModal
        isOpen={isBoxModalOpen}
        onClose={() => setIsBoxModalOpen(false)}
        doors={doorOptions}
        onSuccess={fetchData}
      />

      <DoorFormModal
        isOpen={isDoorModalOpen}
        onClose={() => setIsDoorModalOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
