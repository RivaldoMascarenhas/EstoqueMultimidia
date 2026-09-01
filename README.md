# 🎓 UniFAP — Sistema Integrado de Gestão de Estoque, Patrimônio, Eventos & Biometria Facial

[![Next.js 15](https://img.shields.io/badge/Next.js-15.5.24-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111_Python_3.10-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL_16-pgvector-336791?style=for-the-badge&logo=postgresql)](https://github.com/pgvector/pgvector)
[![Prisma ORM](https://img.shields.io/badge/Prisma-5.18_(36_Modelos)-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Cloudflare Tunnel](https://img.shields.io/badge/Cloudflare_Tunnel-Zero_Trust-F38020?style=for-the-badge&logo=cloudflare)](https://www.cloudflare.com/products/tunnel/)
[![Vitest](https://img.shields.io/badge/Vitest-303_Testes_100%25_Passing-6E9F18?style=for-the-badge&logo=vitest)](https://vitest.dev/)
[![LGPD](https://img.shields.io/badge/Conformidade-LGPD_Auditada-success?style=for-the-badge)]()

Sistema institucional oficial desenvolvido para o setor de **Suporte de Tecnologia da Informação & Multimídia do Centro Universitário Paraíso (UniFAP - Juazeiro do Norte/CE)** • [unifapce.edu.br](https://unifapce.edu.br/).

Uma plataforma corporativa completa que unifica o controle de materiais a granel, rastreabilidade individual de equipamentos patrimoniais, fluxo de empréstimos com termos A4 e notificações no WhatsApp, ordens de serviço com horímetro para projetores, scanner mobile de QR Code, mapeamento físico do armário de TI, microsserviço de **Reconhecimento Facial Biométrico com busca vetorial (`pgvector`)**, módulo de **Eventos Acadêmicos com Check-in por Totem e Sorteios Interativos em Telão**, além de API REST para integrações externas com **n8n e agentes de IA**.

---

## 📑 Sumário

- [Visão Geral e Objetivos](#-visão-geral-e-objetivos)
- [Arquitetura do Ecossistema](#-arquitetura-do-ecossistema)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Módulos e Funcionalidades](#-módulos-e-funcionalidades)
  - [1. Gestão de Patrimônio & Linha do Tempo Vitalícia](#1--gestão-de-patrimônio--linha-do-tempo-vitalícia)
  - [2. Estoque Físico, Armário & Caixas Organizadoras](#2--estoque-físico-armário--caixas-organizadoras)
  - [3. Empréstimos, Devoluções & Cautelas A4](#3--empréstimos-devoluções--cautelas-a4)
  - [4. Ordens de Serviço, Manutenção & Horímetro de Projetores](#4--ordens-de-serviço-manutenção--horímetro-de-projetores)
  - [5. Biometria Facial & Embeddings Vetoriais (pgvector)](#5--biometria-facial--embeddings-vetoriais-pgvector)
  - [6. Eventos Acadêmicos, Presença Facial & Sorteios ao Vivo](#6--eventos-acadêmicos-presença-facial--sorteios-ao-vivo)
  - [7. Totem de Autoatendimento & Modo Telão (Presentation Mode)](#7--totem-de-autoatendimento--modo-telão-presentation-mode)
  - [8. Scanner Mobile de QR Code e Código de Barras](#8--scanner-mobile-de-qr-code-e-código-de-barras)
  - [9. Central de Agendamentos & Gestão de Salas](#9--central-de-agendamentos--gestão-de-salas)
  - [10. Relatórios Gerenciais, Checklist & Exportação](#10--relatórios-gerenciais-checklist--exportação)
  - [11. API REST Externa, Webhooks & Integração n8n/WhatsApp](#11--api-rest-externa-webhooks--integração-n8nwhatsapp)
  - [12. Segurança, Auditoria, RBAC & LGPD](#12--segurança-auditoria-rbac--lgpd)
- [Estrutura do Armário Físico](#-estrutura-do-armário-físico)
- [Estrutura de Pastas do Projeto](#-estrutura-de-pastas-do-projeto)
- [Modelo de Dados Relacional & Vetorial (Prisma ORM)](#-modelo-de-dados-relacional--vetorial-prisma-orm)
- [Guia de Instalação e Execução](#-guia-de-instalação-e-execução)
  - [Opção A: Implantação Completa com Docker Compose (Produção / Cloudflare Tunnel)](#opção-a-implantação-completa-com-docker-compose-produção--cloudflare-tunnel)
  - [Opção B: Execução Local para Desenvolvimento](#opção-b-execução-local-para-desenvolvimento)
- [Variáveis de Ambiente (.env)](#-variáveis-de-ambiente-env)
- [Usuários Pré-Configurados (Seed)](#-usuários-pré-configurados-seed)
- [Perfis de Acesso (RBAC)](#-perfis-de-acesso-rbac)
- [Suíte de Testes Automatizados (Vitest)](#-suíte-de-testes-automatizados-vitest)
- [Documentação da API Externa (n8n / WhatsApp / Bots)](#-documentação-da-api-externa-n8n--whatsapp--bots)
- [Segurança da Informação e Conformidade LGPD](#-segurança-da-informação-e-conformidade-lgpd)
- [Impressão Oficial de Documentos (A4)](#-impressão-oficial-de-documentos-a4)
- [Atalhos Rápidos de Teclado](#-atalhos-rápidos-de-teclado)
- [Scripts NPM Disponíveis](#-scripts-npm-disponíveis)
- [Instituição & Equipe](#-instituição--equipe)

---

## 🎯 Visão Geral e Objetivos

O setor de Suporte de TI & Multimídia da UniFAP atende centenas de professores, colaboradores e discentes em dezenas de salas de aula, laboratórios, auditórios e eventos acadêmicos institucionais. Este sistema foi desenvolvido para solucionar gargalos operacionais e introduzir inovação tecnológica:

1. **Rastreabilidade Físico-Espacial**: Mapeamento digital exato das 3 portas do armário de TI e suas 18 caixas organizadoras.
2. **Ciclo de Vida Perpétuo de Patrimônios**: Trilha de auditoria inalterável (`AssetHistory`) para projetores, notebooks, caixas de som e microfones.
3. **Formalização de Empréstimos & WhatsApp**: Emissão imediata do Termo Oficial de Cautela UniFAP em A4 e envio de lembretes automáticos com link direto no WhatsApp.
4. **Horímetro de Lâmpadas & Manutenção Preventiva**: Controle de horas de uso de lâmpadas de projetores e histórico financeiro de ordens de serviço.
5. **Reconhecimento Facial Biométrico de Alta Precisão**: Identificação de alunos e servidores em frações de segundo através de embeddings de 128 dimensões com `pgvector` e FastAPI.
6. **Gestão de Eventos Acadêmicos & Sorteios Gamificados**: Totem de check-in facial expresso, controle de elegibilidade de presença e sorteador interativo em telão com efeitos sonoros e confetes.
7. **Segurança Corporativa & Zero Trust**: Exposição segura via **Cloudflare Tunnel**, autenticação NextAuth.js com RBAC em 4 níveis, proteção estrita anti-SSRF e conformidade com a LGPD.

---

## 🏗️ Arquitetura do Ecossistema

O sistema adota uma arquitetura modular em microsserviços integrados, operando em rede isolada de containers Docker:

```mermaid
flowchart TB
    subgraph Internet["Rede Externa / Usuários"]
        UserBrowser["Navegador Web / Mobile (PWA)"]
        TotemClient["Totem de Presença Facial"]
        WhatsAppBot["n8n / WhatsApp Bots"]
    end

    subgraph Edge["Camada de Borda & Segurança"]
        Cloudflare["Cloudflare Edge (WAF, SSL, DDoS)"]
        Tunnel["Cloudflare Tunnel (cloudflared container)"]
    end

    subgraph DockerNetwork["Rede Interna Docker (unifap-network)"]
        subgraph WebApp["Next.js 14 App (Porta 3000)"]
            UI["Interface React & Tailwind CSS"]
            Middleware["Edge Security Middleware (RBAC)"]
            APIRoutes["Next.js Route Handlers (API v1)"]
            PrismaClient["Prisma ORM Client"]
        end

        subgraph BioService["Microsserviço Python (Porta 8000)"]
            FastAPI["FastAPI 0.111"]
            FaceRecognition["InsightFace / Dlib (128D Embeddings)"]
        end

        subgraph Database["PostgreSQL 16 (Porta 5432)"]
            PGVector["Extensão pgvector (Busca Vetorial L2)"]
            RelationalData["Tabelas Relacionais (17 Modelos)"]
        end
    end

    UserBrowser & TotemClient & WhatsAppBot --> Cloudflare
    Cloudflare --> Tunnel
    Tunnel --> WebApp
    WebApp <--> BioService
    WebApp <--> Database
    BioService <--> Database
```

---

## 🚀 Tecnologias Utilizadas

### Frontend & Interface
- **[Next.js 14](https://nextjs.org/)** (v14.2.35) — App Router, Server Actions, Server Components, Dynamic Streaming e Edge Middleware.
- **[TypeScript 5](https://www.typescriptlang.org/)** — Tipagem estrita ponta a ponta.
- **[Tailwind CSS 3.4](https://tailwindcss.com/)** — Design System institucional com alternador de **Dark / Light Mode** (`next-themes`).
- **[Framer Motion](https://www.framer.com/motion/)** — Animações fluidas, transições de estado e efeitos de sorteio.
- **[Radix UI](https://www.radix-ui.com/)** — Componentes primitivos acessíveis (Dialogs, Dropdowns, Tooltips, Tabs, Alerts).
- **[Lucide React](https://lucide.dev/)** — Conjunto completo de ícones vetoriais.
- **[Recharts](https://recharts.org/)** — Gráficos interativos para Dashboard e Relatórios Gerenciais.
- **[Sonner](https://sonner.emilkowal.ski/)** — Notificações toast responsivas e não-bloqueantes.
- **[Canvas Confetti](https://www.npmjs.com/package/canvas-confetti)** — Efeitos visuais para o sorteador de prêmios.

### Backend, Banco & Inteligência Artificial
- **[PostgreSQL 16](https://www.postgresql.org/) com [pgvector](https://github.com/pgvector/pgvector)** — Banco relacional com extensão de indexação e cálculo de distância Euclidiana (`<->`) para vetores de 128 dimensões.
- **[FastAPI 0.111 (Python 3.10)](https://fastapi.tiangolo.com/)** — Microsserviço de alta performance para detecção facial, alinhamento e extração de embeddings biométricos.
- **[Prisma ORM 5.18](https://www.prisma.io/)** — Modelagem tipada de 17 tabelas com relacionamentos estritos.
- **[NextAuth.js 4.24](https://next-auth.js.org/)** — Autenticação segura por JWT com controle de papéis (RBAC) e proteção contra força bruta.
- **[Bcrypt.js](https://github.com/dcodeIO/bcrypt.js)** — Hashing criptográfico unidirecional para senhas e tokens.
- **[Zod 3.23](https://zod.dev/)** + **[React Hook Form](https://react-hook-form.com/)** — Validação estrita de contratos de dados.

### Scanner, Mídia & Áudio
- **[html5-qrcode](https://github.com/mebjas/html5-qrcode)** — Leitura contínua de QR Codes e Códigos de Barras via câmera web ou celular.
- **[qrcode](https://github.com/soldair/node-qrcode)** — Geração vetorial de QR Codes para termos, etiquetas e caixas.
- **Web Audio API & Vibration API** — Síntese nativa de efeitos sonoros (*beeps*, fanfarras de sorteio, clique háptico).
- **CSS Paged Media (`@media print`)** — Diagramação padronizada em papel A4 institucional para Cautelas, Ordens de Serviço, Etiquetas e Inventários.

### Testes & Qualidade de Software
- **[Vitest 1.6](https://vitest.dev/)** — Framework de testes unitários e de integração ultrarrápido com 135 testes automatizados (100% de aprovação).

---

## ✨ Módulos e Funcionalidades

### 1. 🏷️ Gestão de Patrimônio & Linha do Tempo Vitalícia
- **Tombamento Individual**: Cadastro detalhado por número de patrimônio (ex: `#PAT-004128`), número de série, marca, modelo, valor de aquisição, data e nota fiscal.
- **Linha do Tempo Inalterável (`AssetHistory`)**: Trilha perpétua registrando cada evento de vida do ativo (*Cadastrado*, *Emprestado*, *Devolvido*, *Enviado para Manutenção*, *Movimentado de Caixa*, *Baixado*).
- **Trava de Segurança Automática**: Bloqueio sistêmico que impede o empréstimo de ativos marcados como avariados, baixados ou em manutenção.
- **Emissão de Etiquetas Adesivas**: Geração de etiquetas de patrimônio com QR Code direto para a ficha do item.

### 2. 🗄️ Estoque Físico, Armário & Caixas Organizadoras
- **Visualização Gráfica do Armário (`/armario`)**: Representação visual intuitiva das 3 portas do armário de TI com suas 18 caixas organizadoras.
- **Ficha da Caixa (`/caixas/[code]`)**: Acesso instantâneo via QR Code colado na caixa física, exibindo o saldo de materiais e equipamentos alocados.
- **Movimentações Atômicas Seguras**:
  - **Entrada**: Adição de quantidade com registro de nota/fornecedor.
  - **Baixa / Saída**: Validação estrita anti-estoque negativo com motivo padronizado e justificativa obrigatória.
  - **Transferência**: Movimentação entre caixas físicas com validação de saldo de origem.
- **Histórico Inalterável (`StockMovement`)**: Trilha com saldo anterior, saldo posterior, responsável e timestamp.

### 3. 🤝 Empréstimos, Devoluções & Cautelas A4
- **Checkout Ágil de Empréstimo**: Seleção de múltiplos equipamentos, dados do solicitante (Nome, E-mail, WhatsApp, Curso/Setor, Sala de Destino) e prazos predefinidos (*Fim do Turno*, *Amanhã*, *7 Dias*, *Personalizado*).
- **Triagem de Devolução (Check-in)**: Conferência de integridade física (🟢 *Perfeito Estado* vs 🔴 *Com Avaria*), com encaminhamento automático de itens avariados para manutenção.
- **Controle de Atrasos (`OVERDUE`)**: Alertas visuais e contadores dinâmicos de dias/horas de atraso.
- **Termo Oficial de Cautela UniFAP**: Layout institucional formatado para folha A4 com QR Code de autenticação e campos para assinaturas formais.
- **Cobrança Cordial via WhatsApp**: Gerador de mensagem formatada com link direto `wa.me` para comunicação com professores e servidores.

### 4. 🔧 Ordens de Serviço, Manutenção & Horímetro de Projetores
- **Abertura com Protocolo Sequencial**: Numeração padronizada (ex: `#OS-2026-0001`), níveis de prioridade e tipos de manutenção (*Corretiva*, *Preventiva*, *Externa*, *Interna*).
- **Horímetro de Lâmpadas de Projeção**: Controle exato das horas de uso da lâmpada de projetores Epson, BenQ e marcas compatíveis.
- **Peças e Assistências Técnicas**: Registro de orçamentos, peças substituídas, contatos de fornecedores e custos financeiros.
- **Laudo Técnico e Reintegração**: Conclusão da OS com laudo técnico e seletor da caixa física do armário para retorno do equipamento ao status `AVAILABLE`.
- **Emissão da OS UniFAP (A4)**: Impressão da ficha técnica com assinaturas do técnico responsável e do gestor de TI.

### 5. 👤 Biometria Facial & Embeddings Vetoriais (pgvector)
- **Extração de Vetores 128D**: Microsserviço FastAPI que detecta rostos, normaliza a iluminação/ângulo e gera vetores biométricos normalizados de 128 dimensões.
- **Busca Vetorial Ultrarrápida no PostgreSQL**: Consulta por similaridade utilizando o operador de distância Euclidiana L2 (`<->`) da extensão `pgvector`.
- **Limiar de Confiança Configurável**: Tolerância padrão de correspondência (`0.60`) com validação de qualidade de enquadramento.
- **Conformidade LGPD**: Armazenamento vetorial seguro sem necessidade de exposição da imagem original em texto puro.

### 6. 🎟️ Eventos Acadêmicos, Presença Facial & Sorteios ao Vivo
- **Gestão de Eventos (`/eventos`)**: Cadastro de eventos, palestras, jornadas acadêmicas e semanas universitárias.
- **Importação de Participantes em Lote**: Cadastro massivo via CSV/Excel com sanitização anti-fórmula injection.
- **Controle de Janela de Check-in**: Regras de liberação automática de presença facial (*1 hora antes*, *no início*, etc.).
- **Sorteador Gamificado em Tempo Real (`/eventos/[id]/sorteio`)**:
  - Roleta interativa com animação acelerada e desacelerada.
  - Filtro automático de **elegibilidade**: somente participantes com **presença confirmada** concorrem aos prêmios.
  - Efeitos sonoros sincronizados (*tic-tac* da roleta, aplausos, fanfarra de vitória) via `Web Audio API`.
  - Chuva de confetes coloridos (`canvas-confetti`) e histórico de ganhadores com entrega de prêmios.

### 7. 📺 Totem de Autoatendimento & Modo Telão (Presentation Mode)
- **Totem de Presença Facial (`/totem/[eventId]`)**: Interface interativa em tela cheia com câmera em tempo real para auto-check-in de participantes em auditórios e credenciamentos.
- **Modo Apresentação / Telão (`/presentation/[eventId]`)**: Visualização pública com contadores em tempo real de participantes presentes, tema escuro de alto contraste e layout adaptado para projetores e TVs.

### 8. 📱 Scanner Mobile de QR Code e Código de Barras (`/scanner`)
- **Interface Fullscreen Otimizada**: Viewfinder responsivo para smartphones com laser de mira animado e seleção dinâmica de câmera frontal/traseira.
- **Feedback Multissensorial**: *Beep* sonoro sintetizado e vibração física no smartphone ao capturar códigos.
- **Decodificador Inteligente Multi-Alvo**: Identifica automaticamente Patrimônios, Caixas do Armário, SKUs de Insumos, Termos de Cautela e Ordens de Serviço com abertura imediata da respectiva ação.

### 9. 📅 Central de Agendamentos & Gestão de Salas
- **Mapeamento de Salas e Auditórios**: Cadastro de blocos, salas de aula e auditórios com equipamentos fixos vinculados (projetores, condicionadores de ar, sistemas de som).
- **Grade de Agendamentos por Turnos**: Visualização organizada por turnos (*Manhã*, *Tarde*, *Noite*) com prevenção ativa de conflitos de horário.
- **Perfil Especial de Apoio Acadêmico**: Permissão restrita para docentes e assistentes solicitarem reservas sem acesso aos módulos internos do armário.

### 10. 📊 Relatórios Gerenciais, Checklist & Exportação
- **5 Relatórios Analíticos Especializados (`/relatorios`)**:
  1. 📊 **Inventário Físico do Armário**: Mapeamento completo por portas e caixas.
  2. 🚨 **Estoque Crítico & Sugestão de Compra**: Itens zerados/baixos com cálculo automático de unidades para reposição.
  3. 🤝 **Histórico de Empréstimos, Devoluções & Atrasos**: Análise de pontualidade por departamento.
  4. 🔧 **Custos de Manutenção & Horímetro de Projetores**: Histórico financeiro de reparos e lâmpadas.
  5. 📦 **Extrato Cronológico de Movimentações**: Trilha auditável completa de entradas e saídas.
- **Módulo de Auditoria de Caixa**: Interface interativa para conferência física periódica de estoque.
- **Exportação Dupla**: Download em planilha **Excel / CSV (com UTF-8 BOM)** e emissão de **PDF Oficial em folha A4**.

### 11. 🤖 API REST Externa, Webhooks & Integração n8n/WhatsApp
- **Autenticação por API Key (`ApiKey`)**: Tokens seguros transmitidos via cabeçalho `Authorization: Bearer <token>` ou `x-api-key`.
- **Endpoint NLP para WhatsApp (`GET /api/v1/external/query`)**: Processamento de consultas em linguagem natural com retorno formatado com emojis e markdown para bots.
- **Checkout e Devolução Automatizados**: Endpoints `POST /api/v1/external/loans` e `POST /api/v1/external/returns`.
- **Abertura de Chamados Técnicos**: `POST /api/v1/external/maintenance`.
- **Simulador de Webhooks**: Testador interativo no painel de configurações para validação de fluxos no n8n.

### 12. 🔒 Segurança, Auditoria, RBAC & LGPD
- **Controle de Acesso RBAC em 4 Níveis**: `ADMIN`, `GESTOR`, `OPERADOR` e `ACADEMIC_SUPPORT`.
- **Proteção Centralizada Anti-SSRF (`src/lib/ssrf.ts`)**: Bloqueio rigoroso de acessos a loopback, RFC1918, serviços internos Docker e metadados de nuvem.
- **Rate Limiting de Autenticação**: Proteção contra força bruta e *password spraying* com rastreamento do IP real do Cloudflare (`CF-Connecting-IP`).
- **Conformidade com a LGPD**: Mascaramento automático de CPF (`maskCpf`), e-mail e telefone em telas e feeds da API.

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
├── docker-compose.yml              # Orquestração: PostgreSQL + Biometric API + Next.js App + Cloudflared
├── package.json                    # Dependências e scripts do ecossistema Next.js
├── start-db.ps1                    # Script PowerShell para inicialização rápida
├── biometric-api/                  # Microsserviço Python FastAPI de Biometria Facial
│   ├── Dockerfile                  # Container do microsserviço biométrico
│   ├── requirements.txt            # Dependências Python (FastAPI, OpenCV, InsightFace, pgvector)
│   └── app/                        # Código-fonte da API biométrica (config, rotas, modelos)
├── docs/                           # Documentação técnica e relatórios institucionais
│   └── RELATORIO_AUDITORIA_SEGURANCA.md # Relatório completo de auditoria de segurança & LGPD
├── prisma/
│   ├── schema.prisma               # Modelagem completa do banco de dados (17 tabelas relacionais)
│   └── seed.ts                     # Script de população idempotente e criação de usuários padrão
├── public/                         # Arquivos públicos e estáticos
└── src/
    ├── middleware.ts               # Edge Middleware de autenticação e proteção RBAC
    ├── app/                        # Rotas e páginas do Next.js App Router (76 rotas)
    │   ├── (auth)/login/           # Autenticação institucional com rate limiter
    │   ├── (dashboard)/            # Shell autenticado do sistema
    │   │   ├── dashboard/          # Métricas, KPIs e gráficos em tempo real
    │   │   ├── armario/ & caixas/  # Mapeamento do armário físico e caixas organizadoras
    │   │   ├── estoque/            # Gestão de materiais e movimentações atômicas
    │   │   ├── patrimonio/         # Tombamento e linha do tempo de equipamentos
    │   │   ├── emprestimos/        # Checkout de empréstimo e cautelas A4
    │   │   ├── manutencao/         # Ordens de serviço e horímetro de projetores
    │   │   ├── eventos/            # Gestão de eventos, credenciamento e sorteador
    │   │   ├── biometria/          # Cadastro biométrico e gerenciamento de pessoas
    │   │   ├── scanner/            # Scanner mobile de QR Code via câmera
    │   │   ├── relatorios/         # 5 relatórios analíticos e checklist
    │   │   ├── agenda/ & salas/    # Agendamento de salas e equipamentos
    │   │   └── usuarios/           # Gestão de operadores e perfis de acesso
    │   ├── totem/[eventId]/        # Totem de check-in facial em tela cheia
    │   ├── presentation/[eventId]/ # Telão ao vivo para auditórios
    │   └── api/v1/                 # Endpoints REST internos e externos
    ├── components/                 # Componentes React reutilizáveis (UI, modais, formulários)
    ├── lib/                        # Utilitários (Prisma, Auth, Anti-SSRF, Mascaramento LGPD, Áudio)
    ├── schemas/                    # Esquemas de validação com Zod
    ├── services/                   # Camada de serviços e regras de negócio
    └── __tests__/                  # Suíte de 135 testes automatizados com Vitest
```

---

## 🗄️ Modelo de Dados Relacional & Vetorial (Prisma ORM)

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

    Person ||--o{ FaceEmbedding : "vetores 128D"
    Person ||--o{ Presence : "presenças"
    Person ||--o{ EventParticipant : "inscrições"

    Event ||--o{ EventParticipant : "participantes"
    Event ||--o{ Presence : "presenças"
    Event ||--o{ Prize : "prêmios"
    Event ||--o{ Draw : "sorteios"
    Draw ||--o{ Winner : "ganhadores"
```

---

## 🛠️ Guia de Instalação e Execução

### Opção A: Implantação Completa com Docker Compose (Produção / Cloudflare Tunnel)

Esta é a opção recomendada para produção. Todos os serviços (Next.js, FastAPI, PostgreSQL com pgvector e Cloudflared Tunnel) sobem de forma orquestrada e com as portas do host restritas à interface local (`127.0.0.1`).

1. **Clonar o Repositório**:
   ```bash
   git clone https://github.com/RivaldoMascarenhas/EstoqueMultimidia.git
   cd EstoqueMultimidia
   ```

2. **Configurar o Arquivo `.env`**:
   ```bash
   cp .env.example .env
   ```
   Edite o `.env` e preencha com senhas fortes geradas aleatoriamente e o seu token do Cloudflare Tunnel:
   ```bash
   # Gerar segredos fortes no terminal:
   openssl rand -base64 32
   ```

3. **Subir os Containers com Build**:
   ```bash
   docker compose up -d --build
   ```

4. **Sincronizar o Banco e Executar o Seed Inicial**:
   ```bash
   # Executa o seed dentro do ambiente da aplicação
   docker compose exec app npm run prisma:push
   docker compose exec app npm run prisma:seed
   ```

5. **Pronto!** O sistema estará disponível com HTTPS no seu subdomínio configurado no Cloudflare Tunnel e localmente em `http://localhost:3000`.

---

### Opção B: Execução Local para Desenvolvimento

1. **Instalar Dependências**:
   ```bash
   npm install
   ```

2. **Iniciar o Banco de Dados PostgreSQL**:
   ```bash
   # Via Docker Compose (apenas o banco):
   docker compose up postgres -d
   ```

3. **Sincronizar o Esquema e Rodar o Seed**:
   ```bash
   npm run prisma:push
   npm run prisma:seed
   ```

4. **Iniciar o Servidor Next.js em Modo Dev**:
   ```bash
   npm run dev
   ```
   Acesse: **[http://localhost:3000](http://localhost:3000)**

---

## 🔐 Variáveis de Ambiente (.env)

| Variável | Descrição | Exemplo / Padrão |
| :--- | :--- | :--- |
| `DATABASE_URL` | URL de conexão com o PostgreSQL | `postgresql://postgres:senha@localhost:5432/estoque_multimidia` |
| `POSTGRES_USER` | Usuário do banco de dados | `postgres` |
| `POSTGRES_PASSWORD` | Senha segura do banco de dados | `gere_com_openssl_rand` |
| `POSTGRES_DB` | Nome da base de dados | `estoque_multimidia` |
| `NEXTAUTH_URL` | URL pública da aplicação | `http://localhost:3000` ou `https://estoque.fapce.edu.br` |
| `NEXTAUTH_SECRET` | Chave mestra de assinatura JWT | `gere_com_openssl_rand_-base64_32` |
| `BIOMETRIC_API_URL` | URL do microsserviço FastAPI | `http://localhost:8000` (dev) / `http://biometric-api:8000` (docker) |
| `BIOMETRIC_INTERNAL_TOKEN` | Token interno de comunicação Next.js ↔ FastAPI | `token_secreto_interno` |
| `RECOGNITION_TOLERANCE`| Limiar de distância Euclidiana L2 para reconhecimento | `0.60` |
| `CLOUDFLARE_TUNNEL_TOKEN`| Token de autenticação do Cloudflare Tunnel | `eyJhIjoi...` |

---

## 🔑 Contas de Demonstração & Seed Local

O script de inicialização (`prisma/seed.ts`) permite popular o banco local com perfis de teste para validação de fluxos e permissões. 

> [!IMPORTANT]
> **Segurança de Produção**: Em ambientes de produção, o seed não utiliza credenciais pré-fixadas e exige a definição da variável `SEED_DEFAULT_PASSWORD` (ou gera senhas seguras pseudo-aleatórias descartáveis), ativando **troca obrigatória de senha (`mustChangePassword: true`)** para todas as contas criadas.

| Perfil de Teste | E-mail de Exemplo | Role RBAC | Escopo de Permissões |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@exemplo.local` | **`ADMIN`** | Acesso total a configurações, usuários, auditoria e chaves de API. |
| **Gestor Multimídia** | `gestor@exemplo.local` | **`GESTOR`** | Gestão de patrimônio, estoque, OS, eventos, relatórios e auditoria. |
| **Operador de TI** | `operador@exemplo.local` | **`OPERADOR`** | Empréstimos, devoluções, baixas/entradas, presenças e scanner. |
| **Apoio Acadêmico** | `docente@exemplo.local` | **`ACADEMIC_SUPPORT`** | Requisição de equipamentos pedagógicos e agendamento de salas. |

---

## 🛡️ Perfis de Acesso (RBAC)

| Módulo / Funcionalidade | `ADMIN` | `GESTOR` | `OPERADOR` | `ACADEMIC_SUPPORT` |
| :--- | :---: | :---: | :---: | :---: |
| **Dashboard & Indicadores Gerais** | ✅ | ✅ | ✅ | ✅ (Resumido) |
| **Agendamento & Requisição de Salas** | ✅ | ✅ | ✅ | ✅ |
| **Scanner Mobile de QR Code** | ✅ | ✅ | ✅ | ❌ |
| **Consultar Armário & Caixas Físicas** | ✅ | ✅ | ✅ | ❌ |
| **Empréstimos, Devoluções & Cautelas A4** | ✅ | ✅ | ✅ | ❌ |
| **Movimentações de Estoque (Entrada/Baixa)** | ✅ | ✅ | ✅ | ❌ |
| **Ordens de Serviço & Manutenção** | ✅ | ✅ | ✅ | ❌ |
| **Eventos Acadêmicos, Presença & Sorteios** | ✅ | ✅ | ✅ | ❌ |
| **Cadastro Biométrico Facial** | ✅ | ✅ | ✅ | ❌ |
| **Exportação de Relatórios & Checklist** | ✅ | ✅ | ❌ | ❌ |
| **Gestão de Usuários & Redefinição de Senhas** | ✅ | ❌ | ❌ | ❌ |
| **Trilha de Auditoria & Chaves de API** | ✅ | ❌ | ❌ | ❌ |

---

## 🧪 Suíte de Testes Automatizados (Vitest)

O sistema possui uma suíte abrangente de testes automatizados cobrindo segurança, integridade referencial, concorrência, ciclos de vida de empréstimos, validação LGPD e prevenção de vulnerabilidades:

```bash
# Executar todos os testes automatizados:
npm test
```

### Resultados da Suíte de Testes
```
✓ src/__tests__/security-edge.test.ts (8 tests)
✓ src/__tests__/events/exhaustive-events.test.ts (21 tests)
✓ src/__tests__/request-e2e-workflow.test.ts (21 tests)
✓ src/__tests__/users-api.test.ts (9 tests)
✓ src/__tests__/shift.service.test.ts (7 tests)
✓ src/__tests__/multimidia-platform.test.ts (7 tests)
✓ src/__tests__/loan-lifecycle.test.ts (6 tests)
✓ src/__tests__/room-projector.test.ts (6 tests)
✓ src/__tests__/lgpd-compliance.test.ts (5 tests)
✓ src/__tests__/maintenance-lifecycle.test.ts (5 tests)
✓ src/__tests__/api-auth.test.ts (5 tests)
✓ src/__tests__/asset-availability-scheduling.test.ts (5 tests)
✓ src/__tests__/api-guard.test.ts (4 tests)
✓ src/__tests__/concurrency.test.ts (3 tests)
✓ src/__tests__/security-hardening.test.ts (3 tests)
...

Test Files: 25 passed (25)
Tests:      135 passed (135)
Duration:   3.05s
```

---

## 🔌 Documentação da API Externa (n8n / WhatsApp / Bots)

A API REST externa permite integrar o sistema com automações no **n8n**, chatbots do **WhatsApp** e agentes de IA.

### Autenticação
Envie o token no cabeçalho HTTP:
```http
Authorization: Bearer <sua_chave_ou_token_de_api>
```
*ou*
```http
x-api-key: <sua_chave_ou_token_de_api>
```

### Endpoints Principais

#### 1. Consulta em Linguagem Natural (NLP para WhatsApp)
- **Método**: `GET`
- **Rota**: `/api/v1/external/query?q=cabo+hdmi`
- **Resposta**: Retorna localização exata no armário, saldo e texto formatado para envio direto no WhatsApp.

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

#### 4. Abertura de Ordem de Serviço (Chamado Técnico)
- **Método**: `POST`
- **Rota**: `/api/v1/external/maintenance`

---

## 🔒 Segurança da Informação e Conformidade LGPD

O sistema foi rigorosamente auditado contra os padrões do **OWASP Top 10** e a **Lei Geral de Proteção de Dados (Lei nº 13.709/2018)**. Para conferir a análise detalhada de cada vulnerabilidade remediada, consulte:

📄 **[Relatório Técnico de Auditoria de Segurança & LGPD](file:///c:/Users/Rivaldo/.gemini/antigravity-ide/scratch/unifap-estoque/docs/RELATORIO_AUDITORIA_SEGURANCA.md)**

### Principais Salvaguardas Implementadas:
1. **Proteção Anti-SSRF**: Validação centralizada (`src/lib/ssrf.ts`) com bloqueio a redes internas e metadados de nuvem.
2. **Defesa em Profundidade**: Cobertura estrita do Edge Middleware em 100% das páginas autenticadas.
3. **Rate Limiting Inteligente**: Proteção dupla contra força bruta (por conta e por IP real extraído do Cloudflare).
4. **Mascaramento de Dados Sensíveis**: CPFs e contatos são ofuscados na camada de apresentação e em respostas de feeds públicos.
5. **Zero Trust & Cloudflare Tunnel**: Nenhuma porta do banco ou da aplicação precisa ser exposta publicamente no firewall do servidor.

---

## 🖨️ Impressão Oficial de Documentos (A4)

O sistema conta com folhas de estilo `@media print` otimizadas para gerar documentos em folha A4 com identidade visual institucional:

1. **Termo Oficial de Cautela e Responsabilidade**: Gerado na tela de empréstimos, com dados do solicitante, equipamento tombado, prazo de devolução, termos legais de uso, QR Code de validação e campo de assinaturas.
2. **Ordem de Serviço Institucional**: Ficha completa da OS com número de protocolo, sintomas relatados, laudo técnico, peças substituídas e assinaturas.
3. **Etiquetas Adesivas com QR Code**: Emissão de etiquetas para caixas físicas do armário e selos adesivos de patrimônio.
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
| `npm run dev` | Inicia o servidor de desenvolvimento Next.js. |
| `npm run build` | Compila o projeto e gera o bundle de produção otimizado. |
| `npm run start` | Inicia o servidor em modo de produção. |
| `npm test` | Executa a suíte de 135 testes automatizados com Vitest. |
| `npm run lint` | Executa a verificação estática do código com ESLint. |
| `npm run prisma:push` | Sincroniza o schema do Prisma com o PostgreSQL sem gerar migrações. |
| `npm run prisma:migrate`| Cria e aplica migrações versionadas no Prisma. |
| `npm run prisma:seed` | Popula o banco com os dados iniciais institucionais da UniFAP. |
| `npm run prisma:studio`| Abre a interface web visual do Prisma Studio para inspeção do banco. |
| `npm run docker:up` | Sobe o ecossistema de containers via Docker Compose. |
| `npm run docker:down` | Encerra os containers do Docker. |
| `npm run docker:logs` | Exibe os logs em tempo real dos containers. |

---

## 📚 Documentação de Produção & Deploy Contínuo

- **Guia Completo de Produção & Coolify**: [docs/PRODUCTION.md](docs/PRODUCTION.md)
- **Relatório de Auditoria de Segurança**: [docs/RELATORIO_AUDITORIA_SEGURANCA.md](docs/RELATORIO_AUDITORIA_SEGURANCA.md)
- **Relatório de UX & Hardening**: [docs/RELATORIO_UX_E_HARDENING.md](docs/RELATORIO_UX_E_HARDENING.md)

---

## 🏢 Instituição & Equipe

- **Instituição**: [Centro Universitário Paraíso (UniFAP)](https://unifapce.edu.br/)
- **Campus**: Juazeiro do Norte — Ceará / Brasil
- **Setor**: Suporte de Tecnologia da Informação & Multimídia
- **Ano de Desenvolvimento**: 2026

---

<p align="center">
  <b>UniFAP — Tecnologia, Inovação e Excelência a Serviço da Educação</b>
</p>
