# UniFAP - Sistema de Gestão de Estoque, Patrimônio & Armário Físico de TI

Sistema oficial para controle de materiais a granel, equipamentos patrimoniais, empréstimos, manutenção e organização física do setor de **Suporte de TI e Multimídia do Centro Universitário Paraíso (UniFAP - Juazeiro do Norte/CE)** • [unifapce.edu.br](https://unifapce.edu.br/).

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

## 📌 Funcionalidades Concluídas (Fases 1 a 7)

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
- [x] **FASE 7: Manutenção & Chamados Técnicos (Ordens de Serviço)**:
  - **Abertura de Chamado & Protocolo Sequencial**: Numeração padronizada (ex: `#OS-2026-0001`), catálogo de sintomas e defeitos frequentes em 1 clique, níveis de prioridade e tipos de manutenção;
  - **Bloqueio Automático & Transição de Estado**: Equipamento transiciona automaticamente para `IN_MAINTENANCE` com auditoria inalterável (`AssetHistory`) e bloqueio preventivo contra novos empréstimos;
  - **Orçamentos, Prestadores & Assistência Externa**: Registro de parceiros de assistência autorizada (Epson, Eletrônica), dados de contato, estimativas financeiras e custos aprovados;
  - **Controle Específico para Projetores & Multimídia**: Rastreio de troca de lâmpadas originais, registro de horímetro (horas de uso) e peças substituídas;
  - **Conclusão de OS & Reintegração Física ao Armário**: Registro de laudo técnico final, solução aplicada e seletor inteligente de Porta/Caixa para retorno imediato do item a `AVAILABLE` ou Baixa Definitiva (`WRITTEN_OFF`);
  - **Ordem de Serviço Institucional UniFAP (A4)**: Emissão de OS formatada para impressão oficial com QR Code de autenticidade, histórico técnico e campo de assinaturas do técnico e gestor;
  - **Notificação WhatsApp**: Gerador de mensagem profissional com status e laudo técnico para envio ágil via WhatsApp.
- [x] **FASE 8: Dashboard Consolidado, Busca Global (Ctrl+K) & Métricas em Tempo Real**:
  - **Busca Global Instantânea (Spotlight `Ctrl+K` / `⌘K`)**: Modal inteligente acessível em qualquer rota pesquisando simultaneamente em Materiais, Patrimônios, Caixas do Armário, Empréstimos e Ordens de Serviço com navegação ágil por teclado;
  - **Métricas Reais & Indicadores Integrados**: Painel unificado com total de ativos, taxa de disponibilidade (%), estoque físico, chamados de manutenção e controle de pontualidade;
  - **Gráficos Visuais de Distribuição & Saúde de Estoque**: Barra segmentada com distribuição de status de patrimônio e níveis de estoque por gravidade (Normal, Baixo, Crítico);
  - **Central de Alertas Prioritários**: Cards inteligentes de ação imediata para empréstimos em atraso, itens com estoque zerado e OS críticas > 7 dias;
  - **Feed de Atividades em Tempo Real**: Timeline com histórico de auditoria ao vivo e links diretos para cada registro.
- [x] **FASE 9: Scanner Mobile Dedicado com Câmera (QR Code & Código de Barras)**:
  - **Interface Fullscreen de Leitura (`/scanner`)**: Viewfinder responsivo otimizado para celulares e desktop com animação de laser de foco, troca de câmera e alternador de modo contínuo;
  - **Feedback Multissensorial**: Som sintetizado nativo (*beep*) via Web Audio API e vibração háptica (`navigator.vibrate`) ao detectar QR Codes com sucesso;
  - **Decodificador Inteligente Multi-Alvo**: Identificação instantânea de **Patrimônios**, **Caixas do Armário**, **Insumos/SKU**, **Termos de Empréstimo** e **Ordens de Serviço** a partir de QR Code, URL ou digitação manual;
  - **Card de Ação Contextual (Action Sheet)**: Apresentação flutuante dos dados do ativo escaneado com botões de ação em 1 toque (*Emprestar*, *Devolver*, *Abrir OS*, *Ver Caixa*) e botão de *Escanear Próximo*;
  - **Modos de Operação Expressa**: *Consulta Geral*, *Empréstimo Rápido*, *Devolução Expressa*, *Auditoria de Caixa* e *Abertura de Manutenção*;
  - **Histórico da Sessão**: Lista inferior com os últimos itens bipados na sessão para conferência ágil.
- [x] **FASE 10: Relatórios Gerenciais, Inventário Físico & Exportação PDF/Excel**:
  - **5 Relatórios Gerenciais Especializados (`/relatorios`)**:
    - 📊 *1. Inventário Físico do Armário*: Mapeamento detalhado por portas e caixas;
    - 🚨 *2. Estoque Crítico & Sugestão de Compra*: Itens com saldo zero/baixo e cálculo automático de unidades para reposição ideal;
    - 🤝 *3. Histórico de Empréstimos, Devoluções & Atrasos*: Taxa de pontualidade e avarias;
    - 🔧 *4. Custos de Manutenção & Horímetro de Lâmpadas*: Gastos em reais e histórico de peças trocadas;
    - 📦 *5. Extrato Cronológico de Movimentações*: Trilha inalterável com datas e operadores;
  - **Módulo de Auditoria e Checklist de Caixa**: Ferramenta interativa de conferência física periódica;
  - **Exportação Dupla de Alta Performance**: Download imediato em **Excel / CSV (UTF-8 BOM)** e emissão de **Relatório Oficial A4 (`window.print()`)** com cabeçalho institucional e campo para assinaturas formais.
- [x] **FASE 11: Integrações Externas, Webhooks & API REST para n8n / WhatsApp / Agentes IA**:
  - **Autenticação Segura por API Keys (`src/lib/api-auth.ts`)**: Validação via `Authorization: Bearer <key>` ou cabeçalho `x-api-key`;
  - **Endpoint de Consulta NLP para WhatsApp (`GET /api/v1/external/query`)**: Retorna saldo, localização física de caixas e disponibilidade com mensagens já formatadas para o WhatsApp (*negrito*, emojis);
  - **Endpoints Automatizados de Checkout e Devolução**: `POST /api/v1/external/loans` e `POST /api/v1/external/returns` para automação via chatbot;
  - **Abertura de Chamados Técnicos (`POST /api/v1/external/maintenance`)**: Criação de OS técnica a partir de mensagens de professores no WhatsApp;
  - **Simulador e Testador de Webhooks (`POST /api/v1/external/webhooks/test`)**: Disparo de eventos reais de teste para validar o n8n;
  - **Painel Interativo de Integrações em `/configuracoes`**: Playground de testes, documentação de rotas e cópia de chaves de API.
- [x] **FASE 12: Gestão de Usuários, Controle de Acesso (RBAC) & Trilha de Auditoria**:
  - **CRUD Completo de Usuários da Equipe (`/usuarios` & `/api/v1/users`)**: Cadastro, edição, listagem e desativação segura preservando histórico;
  - **Troca Obrigatória de Senha no Próximo Acesso (`mustChangePassword`)**: Opção administrativa para forçar o usuário a redefinir sua senha pessoal no primeiro login com modal bloqueante até a conclusão;
  - **Redefinição Segura de Senhas (`PATCH /api/v1/users/[id]/password`)**: Criptografia de senhas institucionais via `bcryptjs`;
  - **Contadores de Produtividade por Usuário**: Métricas individuais de empréstimos, movimentações e chamados de manutenção executados;
  - **Matriz Visual de Permissões RBAC**: Painel com os papéis `ADMIN`, `GESTOR`, `OPERADOR` e `CONSULTA`.

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

## 🔮 Próximas Fases Planejadas (Fases 8 a 13)

- **FASE 8**: Dashboard Consolidado com Métricas Reais & Busca Global
- **FASE 9**: Scanner Mobile Dedicado com Câmera
- **FASE 10**: Relatórios, Inventário Periódico & Exportação PDF/Excel
- **FASE 11**: API REST para n8n, WhatsApp e Agentes IA
- **FASE 12**: Auditoria, Segurança & RBAC
- **FASE 13**: Produção, Docker Final & Backup Automatizado

