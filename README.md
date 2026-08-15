# UniFAP - Sistema de Gestão de Estoque, Patrimônio & Armário Físico de TI

Sistema oficial para controle de materiais a granel, equipamentos patrimoniais, empréstimos, manutenção e organização física do setor de **Suporte de TI e Multimídia da UniFAP**.

---

## 🚀 Tecnologias Utilizadas

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server Components & Route Handlers)
- **Linguagem**: [TypeScript](https://www.typescriptlang.org/)
- **Estilização**: [Tailwind CSS](https://tailwindcss.com/) (Design System customizado com suporte a Dark/Light Mode)
- **Banco de Dados**: [PostgreSQL 16](https://www.postgresql.org/) via Docker
- **ORM**: [Prisma ORM](https://www.prisma.io/) (13 tabelas relacionais)
- **Autenticação**: [NextAuth.js](https://next-auth.js.org/) com RBAC (`ADMIN`, `GESTOR`, `OPERADOR`, `CONSULTA`)
- **Validação**: [Zod](https://zod.dev/)
- **QR Code & Scanner**: `qrcode` + `html5-qrcode` (leitura via câmera do celular ou webcam)
- **Ícones**: [Lucide React](https://lucide.dev/)

---

## 📌 Funcionalidades Concluídas (Fases 1 a 5)

- [x] **FASE 1: Fundação & Banco Relacional**:
  - Modelagem completa de 13 tabelas com integridade referencial;
  - Docker Compose para PostgreSQL;
  - Autenticação e proteção de rotas com 4 perfis de acesso.
- [x] **FASE 2: Design System & Layout Shell**:
  - Sidebar responsiva, Header com alternador Dark/Light e busca;
  - Dashboard principal com métricas em tempo real.
- [x] **FASE 3: Armário Físico & QR Code**:
  - Visualização gráfica das 3 portas do armário e caixas numeradas;
  - Rota direta da caixa (`/caixas/[code]`) para leitura por QR Code;
  - Leitor de câmera integrado (`html5-qrcode`);
  - Gerador e impressor de etiquetas adesivas padronizadas (`window.print()`).
- [x] **FASE 4: Gestão Completa de Estoque & Baixa Anti-Negativo**:
  - Catálogo de materiais e insumos com cálculo dinâmico de status (🟢 Normal, 🟡 Baixo, 🔴 Crítico);
  - **Fluxo de Dar Baixa** com validação estrita anti-estoque negativo e justificativa obrigatória;
  - Registro de Entrada e Transferência atômica entre caixas;
  - Cadastro de novos itens no catálogo.
- [x] **FASE 5: Patrimônio & Equipamentos Rastreáveis**:
  - Tombamento individual por número de patrimônio (ex: `#PAT-004128`) e número de série;
  - **Linha do Tempo Inalterável (`AssetHistory`)** com auditoria de cada evento;
  - Regra de bloqueio contra empréstimo se o item estiver danificado ou em manutenção;
  - QR Code individual de patrimônio e etiquetas adesivas institucionais;
  - Atalho de criação rápida de modelo de catálogo.
- [x] **FASE 6: Módulo Completo de Empréstimos & Devoluções**:
  - **Checkout de Empréstimo**: Seleção de equipamentos disponíveis, bloqueio anti-duplo empréstimo, dados do solicitante, destino e atalhos rápidos de prazo;
  - **Triagem de Devolução (Check-in)**: Conferência de conservação física (🟢 *Perfeito Estado* vs 🔴 *Com Avaria*), alocação na caixa física e bloqueio de itens danificados para manutenção;
  - **Controle de Prazos & Alerta de Atraso**: Cálculo dinâmico em tempo real de itens vencidos (`OVERDUE`) com contadores de horas/dias de atraso;
  - **Prorrogação de Prazo (Renovação)**: Extensão de data prevista com registro de justificativa no histórico;
  - **Termo Oficial de Responsabilidade & Cautela UniFAP**: Layout institucional formatado para impressão (`window.print()` e `@media print` A4) com QR Code de autenticidade e assinaturas formais;
  - **Notificação WhatsApp**: Gerador de mensagem personalizada e link direto `wa.me` para cobrança e alinhamento com solicitantes.

---

## 📋 Como Rodar o Projeto

### 1. Clonar o repositório e instalar dependências
```bash
git clone <URL_DO_REPOSITORIO>
cd unifap-estoque
npm install
```

### 2. Configurar Variáveis de Ambiente
Crie o arquivo `.env` a partir do `.env.example`:
```bash
cp .env.example .env
```

### 3. Subir o Banco de Dados PostgreSQL (Docker)
```bash
docker compose up -d
```

### 4. Sincronizar o Esquema e Popular o Banco (Seed)
```bash
npm run prisma:push
npm run prisma:seed
```

### 5. Iniciar o Servidor de Desenvolvimento
```bash
npm run dev
```
Acesse: **[http://localhost:3000](http://localhost:3000)**

---

## 🔑 Usuários para Teste (Seed)

| Nome | E-mail | Senha | Perfil |
| :--- | :--- | :--- | :--- |
| **Rivaldo** | `rivaldo@unifap.br` | `UniFAP@2026` | **ADMIN** |
| **Rodrigo** | `rodrigo@unifap.br` | `UniFAP@2026` | **GESTOR** |
| **Thomas** | `thomas@unifap.br` | `UniFAP@2026` | **OPERADOR** |
| **Pedro** | `pedro@unifap.br` | `UniFAP@2026` | **OPERADOR** |

---

## 🔮 Próximas Fases Planejadas (Fases 7 a 13)

- **FASE 7**: Manutenção & Chamados Técnicos (Orçamentos, Laudos, Troca de Lâmpadas, Peças e Fornecedores)
- **FASE 8**: Dashboard Consolidado com Métricas Reais & Busca Global
- **FASE 9**: Scanner Mobile Dedicado com Câmera
- **FASE 10**: Relatórios, Inventário Periódico & Exportação PDF/Excel
- **FASE 11**: API REST para n8n, WhatsApp e Agentes IA
- **FASE 12**: Auditoria, Segurança & RBAC
- **FASE 13**: Produção, Docker Final & Backup Automatizado

