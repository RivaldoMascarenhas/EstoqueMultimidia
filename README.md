# 🎓 UniFAP — Sistema Integrado de Gestão de Estoque, Patrimônio & Armário Físico de TI

[![Next.js 14](https://img.shields.io/badge/Next.js-14.2.5-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16_Alpine-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-5.18-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![NextAuth.js](https://img.shields.io/badge/NextAuth.js-RBAC_4_Níveis-purple?style=for-the-badge&logo=auth0)](https://next-auth.js.org/)
[![Status](https://img.shields.io/badge/Status-100%25_Concluído-success?style=for-the-badge)]()

Sistema oficial desenvolvido para o setor de **Suporte de TI e Multimídia do Centro Universitário Paraíso (UniFAP - Juazeiro do Norte/CE)** • [unifapce.edu.br](https://unifapce.edu.br/).

Uma solução completa e integrada para controle de materiais a granel, rastreabilidade individual de equipamentos patrimoniais, fluxo de empréstimos com emissão de cautelas A4, ordens de serviço para manutenção, scanner mobile de QR Code via câmera, mapeamento físico do armário por portas e caixas, além de relatórios analíticos e API REST para integrações externas (n8n, WhatsApp e agentes IA).

---

## 📑 Sumário

- [Visão Geral e Objetivos](#-visão-geral-e-objetivos)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Funcionalidades e Módulos](#-funcionalidades-e-módulos)
- [Estrutura do Armário Físico](#-estrutura-do-armário-físico)
- [Estrutura de Pastas do Projeto](#-estrutura-de-pastas-do-projeto)
- [Modelo de Dados (Prisma ORM)](#-modelo-de-dados-prisma-orm)
- [Como Rodar o Projeto Localmente](#-como-rodar-o-projeto-localmente)
- [Usuários Pré-Configurados (Seed)](#-usuários-pré-configurados-seed)
- [Perfis de Acesso (RBAC)](#-perfis-de-acesso-rbac)
- [Documentação da API Externa (n8n / WhatsApp)](#-documentação-da-api-externa-n8n--whatsapp)
- [Impressão Oficial de Documentos (A4)](#-impressão-oficial-de-documentos-a4)
- [Scripts NPM Disponíveis](#-scripts-npm-disponíveis)

---

## 🎯 Visão Geral e Objetivos

O setor de Suporte de TI & Multimídia da UniFAP atende diariamente dezenas de salas de aula, auditórios, laboratórios e eventos acadêmicos. Este sistema foi concebido para sanar gargalos operacionais críticos:

1. **Fim do extravio de insumos**: Rastreamento milimétrico de cabos HDMI, adaptadores, conectores e pilhas por caixa física.
2. **Rastreabilidade de Ativos Nobres**: Histórico vitalício e inalterável (`AssetHistory`) para projetores, notebooks, caixas acústicas e microfones.
3. **Prazos e Responsabilidade**: Emissão instantânea do **Termo Oficial de Cautela UniFAP** com assinatura formal e envio de lembretes automáticos via WhatsApp.
4. **Ciclo de Manutenção & Horímetro**: Controle de lâmpadas de projetores (horas de uso), histórico de peças trocadas e encaminhamento a assistências autorizadas.
5. **Agilidade em Campo**: Scanner mobile fullscreen para celular (`/scanner`) com feedback tátil e sonoro, permitindo bipar caixas e patrimônios diretamente no armário.
6. **Automação Inteligente**: Endpoints REST dedicados para integração com agentes de IA e workflows do n8n para responder professores no WhatsApp.

---

## 🚀 Tecnologias Utilizadas

### Frontend & Interface
- **[Next.js 14](https://nextjs.org/)** — App Router, Server Actions, Server Components e API Route Handlers.
- **[TypeScript 5](https://www.typescriptlang.org/)** — Tipagem estrita de ponta a ponta.
- **[Tailwind CSS](https://tailwindcss.com/)** — Design System institucional responsivo com alternador dinâmico **Dark / Light Mode** (`next-themes`).
- **[Radix UI](https://www.radix-ui.com/)** — Primitivos acessíveis (Dialogs, Dropdowns, Tooltips, Tabs, Alerts).
- **[Lucide React](https://lucide.dev/)** — Conjunto de ícones consistentes.
- **[Recharts](https://recharts.org/)** — Gráficos vetoriais interativos no Dashboard e Relatórios.
- **[Sonner](https://sonner.emilkowal.ski/)** — Notificações toast fluidas e não-bloqueantes.

### Backend, Banco & Validação
- **[PostgreSQL 16](https://www.postgresql.org/)** — Banco de dados relacional executado em container Docker.
- **[Prisma ORM 5.18](https://www.prisma.io/)** — Modelagem tipada de 13 entidades relacionais com integridade referencial estrita.
- **[NextAuth.js](https://next-auth.js.org/)** — Autenticação segura por sessão JWT com controle de papéis (RBAC).
- **[Bcrypt.js](https://github.com/dcodeIO/bcrypt.js)** — Hashing criptográfico de senhas e tokens de API.
- **[Zod](https://zod.dev/)** + **[React Hook Form](https://react-hook-form.com/)** — Validação estrita de esquemas no cliente e servidor.

### Scanner, Mídia & Impressão
- **[html5-qrcode](https://github.com/mebjas/html5-qrcode)** — Leitura de QR Codes e Códigos de Barras em tempo real via câmera traseira ou webcam.
- **[qrcode](https://github.com/soldair/node-qrcode)** — Geração de vetores QR Code de alta precisão para etiquetas e termos.
- **Web Audio API & Vibration API** — Feedback multissensorial nativo (*beep* sonoro sintetizado e vibração háptica).
- **CSS Paged Media (`@media print`)** — Layouts vetoriais padronizados em papel A4 institucional para impressão de Cautelas, Ordens de Serviço, Etiquetas e Inventários.

---

## ✨ Funcionalidades e Módulos

### 1. 🗄️ Armário Físico & Mapeamento de Caixas
- **Visualização Gráfica do Armário**: Representação visual intuitiva das 3 portas do armário de TI com suas respectivas caixas organizadoras.
- **Página Dedicada da Caixa (`/caixas/[code]`)**: Acesso instantâneo via QR Code colado fisicamente na caixa, exibindo materiais armazenados e patrimônios alocados.
- **Impressão de Etiquetas com QR Code**: Emissão de etiquetas adesivas padronizadas para identificação física das caixas.
- **Gestão de Caixas e Portas**: Adição, edição e reordenação de portas e caixas através do painel de configurações.

### 2. 📦 Gestão de Estoque & Baixa Anti-Estoque Negativo
- **Catálogo de Insumos e Materiais**: Cadastro completo por SKU, categoria, fabricante, modelo, estoque mínimo e ideal.
- **Indicadores de Nível em Tempo Real**: Status dinâmico visual (🟢 *Normal*, 🟡 *Estoque Baixo*, 🔴 *Estoque Crítico / Zerado*).
- **Movimentações Atômicas Seguras**:
  - **Entrada**: Adição de quantidade com registro de fornecedor/origem.
  - **Baixa / Saída**: Validação estrita contra saldo negativo com motivo padronizado e justificativa obrigatória.
  - **Transferência**: Movimentação entre caixas físicas com validação de saldo de origem.
- **Histórico Inalterável (`StockMovement`)**: Trilha completa com saldo anterior, saldo posterior, usuário responsável e carimbo de data/hora.

### 3. 🏷️ Gestão de Patrimônio & Equipamentos Rastreáveis
- **Tombamento Individual**: Cadastro por número de patrimônio (ex: `#PAT-004128`), número de série, valor de aquisição e data.
- **Linha do Tempo Inalterável (`AssetHistory`)**: Trilha de auditoria perpétua registrando cada evento de vida útil do ativo (*Cadastrado*, *Emprestado*, *Devolvido*, *Enviado para Manutenção*, *Baixado*).
- **Trava de Segurança**: Bloqueio automático de ativos danificados ou em manutenção contra tentativas indevidas de empréstimo.
- **Etiquetas de Patrimônio A4**: Emissão de etiquetas adesivas individuais contendo QR Code direto para a ficha do item.

### 4. 🤝 Módulo de Empréstimos & Devoluções
- **Checkout de Empréstimo**:
  - Seleção de múltiplos equipamentos disponíveis com busca instantânea.
  - Dados completos do solicitante (Nome, E-mail, WhatsApp, Departamento/Curso, Destino/Sala).
  - Atalhos de devolução rápida (*Fim do dia*, *Amanhã*, *7 dias*, *Personalizado*).
- **Triagem de Devolução (Check-in)**:
  - Conferência de integridade física (🟢 *Perfeito Estado* vs 🔴 *Com Avaria*).
  - Seleção da caixa física de retorno.
  - Encaminhamento automático de itens avariados para manutenção.
- **Controle de Atrasos (`OVERDUE`)**: Detecção dinâmica de devoluções vencidas com contadores de horas/dias em atraso.
- **Renovação / Prorrogação de Prazo**: Extensão de prazo com justificativa registrada no histórico.
- **Termo Oficial de Cautela UniFAP**: Layout institucional formatado em folha A4 com QR Code de validação e campos para assinaturas formais.
- **Notificação WhatsApp**: Gerador de mensagem personalizada com link direto `wa.me` para cobrança cordial e confirmação com solicitantes.

### 5. 🔧 Manutenção & Ordens de Serviço (OS)
- **Abertura de Chamado com Protocolo Sequencial**: Numeração padronizada (ex: `#OS-2026-0001`), níveis de prioridade (*Baixa*, *Média*, *Alta*, *Crítica*) e tipo (*Corretiva*, *Preventiva*, *Externa*, *Interna*).
- **Catálogo de Sintomas Rápidos**: Preenchimento ágil de defeitos recorrentes (ex: *Lâmpada queimada*, *Sem sinal HDMI*, *Superaquecimento*).
- **Transição Automática de Estado**: O ativo passa imediatamente para `IN_MAINTENANCE` com bloqueio no módulo de empréstimos.
- **Controle Especial para Projetores & Multimídia**:
  - Horímetro da lâmpada de projeção.
  - Rastreamento de peças e componentes substituídos.
- **Prestadores & Custos**: Registro de assistências externas, contatos, orçamentos estimados e custos finais aprovados.
- **Conclusão com Reintegração Física**: Laudo técnico de encerramento e seletor da caixa física do armário para retorno imediato do item a `AVAILABLE` ou `WRITTEN_OFF`.
- **Emissão da OS UniFAP (A4)**: Ordem de serviço formatada para impressão com assinaturas do técnico e gestor.

### 6. 📊 Dashboard em Tempo Real, Métricas & Busca Global
- **Busca Global Instantânea (Spotlight `Ctrl+K` / `⌘K`)**: Modal inteligente acessível em qualquer rota que pesquisa simultaneamente em Materiais, Patrimônios, Caixas, Empréstimos e OS com navegação por setas e teclado.
- **Métricas & Indicadores em Tempo Real**: Total de ativos, taxa de disponibilidade (%), total de itens em estoque, chamados abertos e taxa de pontualidade.
- **Gráficos Visuais com Recharts**: Distribuição percentual de status dos ativos e saúde das categorias de materiais.
- **Central de Alertas Prioritários**: Cards com atalhos de ação imediata para empréstimos em atraso, itens zerados e OS críticas abertas há mais de 7 dias.
- **Feed de Atividades Recentes**: Linha do tempo ao vivo das últimas movimentações com links diretos.

### 7. 📱 Scanner Mobile Dedicado com Câmera (`/scanner`)
- **Interface Fullscreen Otimizada**: Viewfinder responsivo para smartphones e desktops com laser animado de mira e seleção de câmeras.
- **Feedback Multissensorial**: *Beep* sonoro sintetizado via Web Audio API e vibração física (`navigator.vibrate`) ao detectar códigos.
- **Decodificador Inteligente Multi-Alvo**: Identifica automaticamente:
  - 🏷️ **Patrimônio** (abre detalhes, empréstimo ou OS)
  - 🗄️ **Caixa do Armário** (abre visualização do conteúdo e auditoria)
  - 📦 **Insumo / SKU** (abre ficha de material e movimentação)
  - 🤝 **Termo de Empréstimo** (abre checkout de devolução)
  - 🔧 **Ordem de Serviço** (abre acompanhamento técnico)
- **Card de Ação Contextual (Action Sheet)**: Apresentação flutuante dos dados escaneados com botões de ação em 1 toque e opção de *Escanear Próximo*.
- **Modos de Operação Expressa**: *Consulta Geral*, *Empréstimo Rápido*, *Devolução Expressa*, *Auditoria de Caixa* e *Abertura de OS*.

### 8. 📑 Relatórios Gerenciais, Checklist & Exportação
- **5 Relatórios Gerenciais Especializados (`/relatorios`)**:
  1. 📊 **Inventário Físico do Armário**: Mapeamento completo distribuído por portas e caixas.
  2. 🚨 **Estoque Crítico & Sugestão de Compra**: Itens zerados/baixos com cálculo automático de unidades para reposição ideal.
  3. 🤝 **Histórico de Empréstimos, Devoluções & Atrasos**: Análise de pontualidade e controle de avarias por departamento.
  4. 🔧 **Custos de Manutenção & Horímetro de Projetores**: Consolidação financeira de reparos e histórico de lâmpadas.
  5. 📦 **Extrato Cronológico de Movimentações**: Trilha auditável completa com datas, tipos e operadores.
- **Módulo de Auditoria e Checklist de Caixa**: Interface interativa para conferência física periódica dos itens armazenados.
- **Exportação Dupla**: Download em planilha **Excel / CSV (com UTF-8 BOM)** e emissão de **Relatório Oficial em PDF/A4 (`window.print()`)** com cabeçalho institucional.

### 9. 🤖 API REST Externa, Webhooks & Integração n8n / WhatsApp
- **Autenticação por Chaves de API (`ApiKey`)**: Suporte a tokens seguros via cabeçalho `Authorization: Bearer <token>` ou `x-api-key`.
- **Endpoint NLP para WhatsApp (`GET /api/v1/external/query`)**: Processamento de consultas em linguagem natural com retorno formatado em negrito e emojis para disparo via bot.
- **Checkout e Devolução Automatizados**: Endpoints `POST /api/v1/external/loans` e `POST /api/v1/external/returns` para fluxos de autoatendimento.
- **Abertura de Chamados Técnicos**: `POST /api/v1/external/maintenance` para integração com formulários e mensagens de suporte.
- **Playground & Simulador de Webhooks (`/configuracoes`)**: Ferramenta interativa para disparar eventos reais de teste e validar workflows no n8n.

### 10. 👥 Gestão de Equipe, Segurança & Trilha de Auditoria
- **Controle de Usuários (`/usuarios`)**: Gestão de colaboradores com perfis RBAC (`ADMIN`, `GESTOR`, `OPERADOR`, `CONSULTA`).
- **Troca Obrigatória de Senha (`mustChangePassword`)**: Opção administrativa para forçar o primeiro acesso com modal bloqueante.
- **Página de Perfil do Usuário (`/perfil`)**: Troca de senha pessoal, personalização de avatar e métricas individuais de produtividade.
- **Trilha de Auditoria Geral (`AuditLog`)**: Registro de ações críticas com payload de alterações antes/depois.

---

## 🚪 Estrutura do Armário Físico

O armário principal de TI e Multimídia está organizado fisicamente em 3 portas e 18 caixas padronizadas:

```
┌─────────────────────────┬─────────────────────────┬─────────────────────────┐
│         PORTA 1         │         PORTA 2         │         PORTA 3         │
│     (Lado Esquerdo)     │        (Centro)         │     (Lado Direito)      │
├─────────────────────────┼─────────────────────────┼─────────────────────────┤
│ [C001] Cabos HDMI 2m/3m │ [C007] Cabos HDMI 10m   │ [C013] Projetores Epson │
│ [C002] Cabos VGA & DVI  │ [C008] Cabos HDMI 15m   │ [C014] Projetores BenQ  │
│ [C003] Cabos Rede CAT6  │ [C009] Adaptadores Mac  │ [C015] Caixas de Som    │
│ [C004] Mouses USB/Sem F │ [C010] Microfones Lapela│ [C016] Microfones S/ Fio│
│ [C005] Teclados ABNT2   │ [C011] Microfones Pedest│ [C017] Extensões & Filt │
│ [C006] Cabos de Força   │ [C012] Passadores Slides│ [C018] Pilhas & Baterias│
└─────────────────────────┴─────────────────────────┴─────────────────────────┘
```

---

## 📁 Estrutura de Pastas do Projeto

```
unifap-estoque/
├── docker-compose.yml              # Configuração do PostgreSQL 16 Alpine
├── package.json                    # Dependências e scripts do projeto
├── start-db.ps1                    # Script PowerShell para inicialização rápida do DB
├── prisma/
│   ├── schema.prisma               # Modelagem completa do banco de dados (13 tabelas)
│   └── seed.ts                     # Script de população idempotente inicial
├── public/
│   └── favicon.ico                 # Favicon institucional
└── src/
    ├── middleware.ts               # Proteção de rotas autenticadas e regras de RBAC
    ├── app/
    │   ├── layout.tsx              # Root layout com ThemeProvider e Toaster
    │   ├── globals.css             # Estilização global, tokens HSL e regras @media print
    │   ├── (auth)/
    │   │   └── login/              # Página de login com credenciais institucionais
    │   ├── (dashboard)/
    │   │   ├── layout.tsx          # Shell com Sidebar retrátil, Header e Spotlight
    │   │   ├── dashboard/          # Painel principal com KPIs, gráficos e alertas
    │   │   ├── armario/            # Visualização interativa das portas e caixas
    │   │   ├── caixas/             # Ficha de caixa individual com leitura QR Code
    │   │   ├── estoque/            # Gestão de materiais, entradas, baixas e transferências
    │   │   ├── patrimonio/         # Tombamento, etiquetas e linha do tempo de ativos
    │   │   ├── emprestimos/        # Checkout de empréstimo, devoluções e cautelas A4
    │   │   ├── manutencao/         # Ordens de serviço, horímetro de projetores e laudos
    │   │   ├── scanner/            # Scanner mobile fullscreen com câmera e vibração
    │   │   ├── relatorios/         # 5 relatórios analíticos, checklist e exportações
    │   │   ├── usuarios/           # Gestão de operadores, troca de senhas e RBAC
    │   │   ├── configuracoes/      # Portas, caixas, categorias, chaves de API e n8n
    │   │   ├── movimentacoes/      # Extrato cronológico geral de movimentações
    │   │   └── perfil/             # Perfil do operador, avatar e estatísticas
    │   └── api/
    │       ├── auth/               # Endpoint do NextAuth.js
    │       └── v1/                 # Endpoints REST internos e externos
    ├── components/
    │   ├── ui/                     # Componentes primitivos do Design System
    │   ├── layout/                 # Sidebar, Header, Breadcrumbs e Spotlight
    │   ├── cabinet/                # Componentes das Portas, Caixas e Etiquetas
    │   ├── inventory/              # Modais de Entrada, Baixa e Criação de Item
    │   ├── assets/                 # Modais de Tombamento, Histórico e Etiquetas
    │   ├── loans/                  # Modais de Devolução, Cautela A4 e WhatsApp
    │   ├── maintenance/            # Modais de Abertura, Conclusão de OS e Termo A4
    │   ├── scanner/                # Viewfinder da câmera, feedback sonoro e action sheet
    │   ├── reports/                # Visualizadores de relatórios e checklist de caixa
    │   ├── categories/             # Modais de gestão de categorias
    │   ├── users/                  # Modais de cadastro e redefinição de senha
    │   └── auth/                   # Modal bloqueante para primeiro acesso obrigatório
    ├── lib/
    │   ├── prisma.ts               # Singleton do cliente Prisma
    │   ├── auth.ts                 # Configurações do NextAuth.js
    │   ├── api-auth.ts             # Validador de chaves de API externa
    │   └── utils.ts                # Formatadores de data, moeda, SKU e classes CSS
    ├── schemas/                    # Esquemas Zod para formulários e APIs
    ├── services/                   # Camada de regras de negócio e serviços
    └── types/                      # Definições TypeScript complementares
```

---

## 🗄️ Modelo de Dados (Prisma ORM)

O banco de dados relacional é composto por 13 entidades principais:

```mermaid
erDiagram
    User ||--o{ StockMovement : "realiza"
    User ||--o{ Loan : "cria/recebe"
    User ||--o{ Maintenance : "abre/encerra"
    User ||--o{ AuditLog : "gera"
    User ||--o{ ApiKey : "possui"

    Door ||--o{ Box : "contém"
    Box ||--o{ Inventory : "armazena"
    Box ||--o{ Asset : "guarda"

    Category ||--o{ Item : "classifica"
    Item ||--o{ Inventory : "saldo"
    Item ||--o{ Asset : "tombamentos"
    Item ||--o{ StockMovement : "movimenta"

    Asset ||--o{ AssetHistory : "trilha"
    Asset ||--o{ Loan : "emprestado"
    Asset ||--o{ Maintenance : "manutenções"
```

| Modelo | Finalidade Principal |
| :--- | :--- |
| **`User`** | Operadores do sistema, papéis de acesso e senhas criptografadas. |
| **`ApiKey`** | Tokens de autenticação para automação externa (n8n / WhatsApp). |
| **`Door`** | As 3 portas físicas do armário de TI. |
| **`Box`** | As caixas organizadoras identificadas por código e QR Code. |
| **`Category`** | Agrupamento de itens (*Cabos*, *Adaptadores*, *Projetores*, etc.). |
| **`Item`** | Catálogo geral com SKU, dados técnicos, estoque mínimo e ideal. |
| **`Inventory`** | Tabela associativa com a quantidade física de cada item por caixa. |
| **`Asset`** | Equipamento individual com tombamento de patrimônio e número de série. |
| **`AssetHistory`** | Linha do tempo inalterável de todos os eventos de vida do patrimônio. |
| **`Loan`** | Registro de empréstimos com dados do solicitante, destino e datas. |
| **`Maintenance`** | Ordens de serviço, sintomas, horímetro de lâmpadas e laudos. |
| **`StockMovement`**| Extrato cronológico perpétuo de entradas, saídas e transferências. |
| **`AuditLog`** | Registro de segurança com diff de payloads e IPs de requisição. |

---

## 🛠️ Como Rodar o Projeto Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18.18+ ou 20+)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) ou serviço PostgreSQL local
- [Git](https://git-scm.com/)

### Passo 1: Clonar o Repositório e Instalar Dependências
```bash
git clone https://github.com/RivaldoMascarenhas/EstoqueMultimidia.git
cd EstoqueMultimidia
npm install
```

### Passo 2: Configurar as Variáveis de Ambiente
Copie o arquivo de exemplo para criar seu `.env`:
```bash
cp .env.example .env
```
Gere uma chave secreta criptograficamente segura para a sessão JWT do NextAuth:
```bash
openssl rand -base64 32
```
Configure as variáveis no seu `.env`:
```env
DATABASE_URL="postgresql://postgres:unifap_secure_password_2026@localhost:5433/unifap_estoque?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<gere_com_openssl_rand_-base64_32>"

# (Opcional) Chave mestre de integração externa para bots
EXTERNAL_API_MASTER_KEY="<gere_com_openssl_rand_-base64_32>"
```

### Passo 3: Iniciar o Banco de Dados PostgreSQL (Docker)
```bash
# Via Docker Compose diretamente:
docker compose up -d

# Ou via script PowerShell (Windows):
.\start-db.ps1
```

### Passo 4: Sincronizar o Esquema e Popular o Banco (Seed)
```bash
# Cria as tabelas no PostgreSQL
npm run prisma:push

# Popula o banco com portas, caixas, itens, patrimônios e usuários de teste
npm run prisma:seed
```

### Passo 5: Iniciar o Servidor de Desenvolvimento
```bash
npm run dev
```
Acesse no navegador: **[http://localhost:3000](http://localhost:3000)**

---

## 🔑 Usuários Pré-Configurados (Seed)

O script de seed (`prisma/seed.ts`) cria automaticamente as credenciais para testes de todos os perfis de acesso:

| Nome | E-mail | Senha Padrão | Perfil de Acesso | Permissões |
| :--- | :--- | :--- | :--- | :--- |
| **Rivaldo** | `rivaldo@unifap.br` | `UniFAP@2026` | **`ADMIN`** | Acesso irrestrito a todo o sistema, usuários e chaves de API. |
| **Rodrigo** | `rodrigo@unifap.br` | `UniFAP@2026` | **`GESTOR`** | Gestão de estoque, patrimônios, OS, relatórios e auditoria. |
| **Thomas** | `thomas@unifap.br` | `UniFAP@2026` | **`OPERADOR`** | Empréstimos, devoluções, baixas, entradas e scanner mobile. |
| **Pedro** | `pedro@unifap.br` | `UniFAP@2026` | **`OPERADOR`** | Empréstimos, devoluções, baixas, entradas e scanner mobile. |

---

## 🛡️ Perfis de Acesso (RBAC)

| Funcionalidade / Rota | `ADMIN` | `GESTOR` | `OPERADOR` | `CONSULTA` |
| :--- | :---: | :---: | :---: | :---: |
| **Dashboard & Indicadores** | ✅ | ✅ | ✅ | ✅ |
| **Scanner Mobile de QR Code** | ✅ | ✅ | ✅ | ✅ (Somente Leitura) |
| **Consultar Armário & Caixas** | ✅ | ✅ | ✅ | ✅ |
| **Realizar Empréstimos & Devoluções** | ✅ | ✅ | ✅ | ❌ |
| **Dar Baixa e Dar Entrada no Estoque**| ✅ | ✅ | ✅ | ❌ |
| **Abrir e Encerrar Ordens de Serviço**| ✅ | ✅ | ✅ | ❌ |
| **Cadastrar Patrimônios & Materiais**| ✅ | ✅ | ❌ | ❌ |
| **Exportar Relatórios & Checklist** | ✅ | ✅ | ❌ | ❌ |
| **Gerenciar Usuários & Redefinir Senhas**| ✅ | ❌ | ❌ | ❌ |
| **Configurar Chaves de API & Webhooks**| ✅ | ❌ | ❌ | ❌ |

---

## 🔌 Documentação da API Externa (n8n / WhatsApp)

A API REST externa permite integrar o sistema com automações no **n8n**, chatbots do **WhatsApp** (Evolution API, Z-API, Baileys) e agentes de IA.

### Autenticação & Chaves de API
Você pode gerar chaves de API individuais (`unifap_live_...`) diretamente no painel em **Configurações → Chaves de API & Integrações**. As chaves são protegidas com hash SHA-256 no banco de dados e contam com controle de permissão por Role (`OPERADOR`, `GESTOR`, `ADMIN`, `CONSULTA`) e data de expiração opcional.

Envie o token no cabeçalho HTTP:
```http
Authorization: Bearer <sua_chave_ou_token_de_api>
```
*ou*
```http
x-api-key: <sua_chave_ou_token_de_api>
```

---

### Endpoints Principais

#### 1. Consulta em Linguagem Natural (NLP para WhatsApp)
- **Método**: `GET`
- **Rota**: `/api/v1/external/query?q=cabo+hdmi`
- **Descrição**: Retorna o saldo, a localização exata no armário e uma mensagem pronta em markdown do WhatsApp.
- **Exemplo de Resposta**:
```json
{
  "success": true,
  "found": true,
  "type": "MATERIAL",
  "data": {
    "name": "Cabo HDMI 10m",
    "sku": "CAB-HDMI-10M",
    "totalStock": 12,
    "status": "NORMAL",
    "locations": [
      {
        "boxCode": "C007",
        "boxName": "Caixa 007",
        "door": "Porta 2",
        "quantity": 12
      }
    ]
  },
  "whatsappMessage": "📦 *Cabo HDMI 10m* (SKU: `CAB-HDMI-10M`)\n🟢 *Status*: Normal\n📊 *Total em Estoque*: 12 UN\n\n📍 *Localização*: Porta 2 → *Caixa 007* (12 UN)"
}
```

---

#### 2. Checkout de Empréstimo via Bot
- **Método**: `POST`
- **Rota**: `/api/v1/external/loans`
- **Payload**:
```json
{
  "assetTag": "PAT-004128",
  "borrowerName": "Prof. Carlos Eduardo",
  "borrowerEmail": "carlos.eduardo@unifap.br",
  "borrowerPhone": "88999887766",
  "borrowerDepartment": "Medicina",
  "destination": "Auditório Central",
  "expectedReturnHours": 4
}
```

---

#### 3. Devolução de Equipamento via Bot
- **Método**: `POST`
- **Rota**: `/api/v1/external/returns`
- **Payload**:
```json
{
  "assetTag": "PAT-004128",
  "returnBoxCode": "C013",
  "condition": "Perfeito estado",
  "isDamaged": false
}
```

---

#### 4. Abertura de Ordem de Serviço (Chamado Técnico)
- **Método**: `POST`
- **Rota**: `/api/v1/external/maintenance`
- **Payload**:
```json
{
  "assetTag": "PAT-004128",
  "issueDescription": "Projetor desliga após 15 minutos com aviso de lâmpada",
  "priority": "HIGH",
  "contactName": "Prof. Carlos Eduardo",
  "contactPhone": "88999887766"
}
```

---

#### 5. Simulador de Disparo de Webhook
- **Método**: `POST`
- **Rota**: `/api/v1/external/webhooks/test`
- **Payload**:
```json
{
  "targetUrl": "https://n8n.unifap.br/webhook/loans-alert",
  "eventType": "LOAN_OVERDUE_ALERT"
}
```

---

## 🖨️ Impressão Oficial de Documentos (A4)

O sistema conta com folhas de estilo `@media print` otimizadas para gerar documentos em folha A4 com identidade visual institucional:

1. **Termo Oficial de Cautela e Responsabilidade**: Gerado na tela de empréstimos, contendo os dados do solicitante, equipamento tombado, prazo de devolução, termos legais de uso, QR Code de validação e campo de assinaturas.
2. **Ordem de Serviço Institucional**: Ficha completa da OS com número de protocolo, sintomas relatados, laudo técnico, componentes substituídos e assinaturas do técnico e gestor.
3. **Etiquetas Adesivas com QR Code**: Emissão de etiquetas para caixas físicas do armário e selos adesivos de patrimônio individual.
4. **Relatórios Gerenciais de Inventário**: Impressão de relatórios analíticos para auditorias institucionais e prestações de contas.

---

## ⌨️ Atalhos Rápidos de Teclado

| Atalho | Ação |
| :--- | :--- |
| `Ctrl + K` / `⌘ + K` | Abre a **Busca Global Instantânea (Spotlight)** em qualquer tela do sistema. |
| `Esc` | Fecha modais, janelas de diálogo e a busca global. |
| `Enter` | Confirma seleção no Spotlight ou executa a busca rápida. |

---

## 📜 Scripts NPM Disponíveis

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o servidor de desenvolvimento Next.js com suporte a headers estendidos. |
| `npm run build` | Compila o projeto e gera o bundle de produção otimizado. |
| `npm run start` | Inicia o servidor em modo de produção. |
| `npm run lint` | Executa a verificação estática do código com ESLint. |
| `npm run prisma:push` | Sincroniza o schema do Prisma com o banco PostgreSQL sem gerar arquivos de migração. |
| `npm run prisma:migrate`| Cria e aplica migrações relacionais versionadas no Prisma. |
| `npm run prisma:seed` | Executa o script de população (`prisma/seed.ts`) com dados iniciais da UniFAP. |
| `npm run prisma:studio`| Abre a interface web visual do Prisma Studio para inspeção direta do banco. |
| `npm run docker:up` | Sobe o container do banco de dados PostgreSQL via Docker Compose. |
| `npm run docker:down` | Encerra os containers do Docker. |
| `npm run docker:logs` | Exibe os logs em tempo real do container PostgreSQL. |

---

## 🏢 Instituição & Autoria

- **Instituição**: [Centro Universitário Paraíso (UniFAP)](https://unifapce.edu.br/)
- **Campus**: Juazeiro do Norte — Ceará / Brasil
- **Setor**: Suporte de Tecnologia da Informação & Multimídia
- **Ano**: 2026

---

<p align="center">
  <b>UniFAP — Tecnologia e Excelência a Serviço da Educação</b>
</p>
