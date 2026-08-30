# Guia Oficial de Implantação e Operação em Produção — UniFAP Estoque & Multimídia

Este documento estabelece o padrão operacional, diretrizes de segurança, rotinas de deploy contínuo, backup, restore e troubleshooting para o ambiente de produção do sistema institucional **UniFAP Estoque & Multimídia**.

---

## 1. Requisitos de Infraestrutura

### Hardware Recomendado (Servidor / VPS)
- **CPU**: 4 vCPUs ou superior.
- **Memória RAM**: 8 GB (mínimo 4 GB dedicados aos containers).
- **Armazenamento**: 80 GB SSD NVMe com sistema de arquivos ext4/xfs.
- **Sistema Operacional**: Ubuntu Server 22.04 LTS ou 24.04 LTS (64-bit).
- **Docker Engine**: versão 24.0+ ou superior com Docker Compose v2+.

### Blindagem de Rede e Portas
| Serviço | Porta Interna | Exposição no Host | Finalidade |
| :--- | :--- | :--- | :--- |
| **PostgreSQL + pgvector** | `5432` | `127.0.0.1:5432` (Loopback) | Banco de dados relacional e vetorial |
| **Biometric API (FastAPI)** | `8000` | `127.0.0.1:8000` (Loopback) | Extração e inferência facial dlib |
| **App Web (Next.js)** | `3000` | `127.0.0.1:3000` (Loopback) | Aplicação web principal |
| **Cloudflared Tunnel** | — | Saída HTTPS 443 | Túnel seguro para tráfego externo |

> [!IMPORTANT]
> Nenhuma porta dos containers deve ser exposta diretamente para `0.0.0.0`. Todo o tráfego de entrada público passa obrigatoriamente pela rede protegida da Cloudflare via **Cloudflare Tunnel**.

---

## 2. Variáveis de Ambiente e Secrets

As variáveis de produção devem ser injetadas exclusivamente através do gerenciador de variáveis do **Coolify** ou arquivo `.env` protegido com permissão `chmod 600 .env` no servidor. **Nunca versione credenciais reais no Git.**

| Variável | Exemplo / Descrição | Obrigatório |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Sim |
| `DATABASE_URL` | `postgresql://postgres:<SENHA_SEGURA>@postgres:5432/estoque_multimidia` | Sim |
| `POSTGRES_USER` | `postgres` | Sim |
| `POSTGRES_PASSWORD` | `<HASH_ALFANUMERICO_32_CHARS>` | Sim |
| `POSTGRES_DB` | `estoque_multimidia` | Sim |
| `NEXTAUTH_URL` | `https://estoque.unifapce.edu.br` | Sim |
| `NEXTAUTH_SECRET` | `<CHAVE_BASE64_64_BYTES>` (gerada via `openssl rand -base64 64`) | Sim |
| `BIOMETRIC_INTERNAL_TOKEN` | `<CHAVE_BASE64_32_BYTES>` para autenticação mútua interna | Sim |
| `CLOUDFLARE_TUNNEL_TOKEN` | Token do Cloudflare Zero Trust Tunnel | Sim |
| `FACE_DISTANCE_THRESHOLD` | `0.60` (limiar de distância euclidiana da biometria) | Não (default: 0.60) |
| `MIN_CONFIDENCE_THRESHOLD` | `0.80` (confiança mínima de reconhecimento) | Não (default: 0.80) |

---

## 3. Deploy Contínuo com Coolify (PaaS Auto-hospedado)

O **Coolify** funciona como o seu próprio "Vercel / Heroku" auto-hospedado no PC do trabalho (24/7), automatizando compilações e deploys a cada `git push`.

### 3.1. Instalação do Coolify no Servidor

#### No Linux (Ubuntu Server ou Desktop):
Execute no terminal da máquina:
```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

#### No Windows (via WSL2 Ubuntu):
1. No PowerShell como Administrador, instale o WSL2:
   ```powershell
   wsl --install -d Ubuntu
   ```
2. Abra o terminal do **Ubuntu** recém-instalado e execute:
   ```bash
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
   ```

*(O Coolify iniciará seus containers e abrirá o painel web em `http://localhost:8000` ou `http://<IP-DO-SERVIDOR>:8000`).*

---

### 3.2. Configuração do Projeto no Coolify

1. **Criar Conta**: Acesse `http://localhost:8000` e cadastre suas credenciais de Administrador.
2. **Conectar GitHub**:
   - Vá em **Sources > GitHub > Add New**.
   - Conecte o **Coolify GitHub App** à sua conta do GitHub para sincronização de repositórios e webhooks automáticos.
3. **Adicionar o Recurso**:
   - Vá em **Projects > Default Project > + New Resource**.
   - Selecione **Git Repository (via Docker Compose)**.
   - Escolha o repositório `RivaldoMascarenhas/EstoqueMultimidia` e o branch `main`.
4. **Configurar Variáveis de Ambiente**:
   - Acesse a aba **Environment Variables** no Coolify e cole as variáveis do arquivo `.env` (ex: `POSTGRES_PASSWORD`, `NEXTAUTH_SECRET`, `BIOMETRIC_INTERNAL_TOKEN`, `CLOUDFLARE_TUNNEL_TOKEN`, `NEXTAUTH_URL=https://multimidia.rivaldo.uk`).
5. **Ativar Deploy Automático**:
   - Ative a opção **Auto Deploy on Push to Branch: `main`**.
   - Clique em **Deploy**.

---

### 3.3. Fluxo de Trabalho Automatizado no Dia a Dia

```text
1. Você programa no computador de desenvolvimento (casa)
2. git add . && git commit -m "feat: nova funcionalidade" && git push origin main
3. GitHub aciona o Webhook do Coolify no PC do trabalho
4. Coolify faz git pull, compila as imagens Docker e roda o init-db
5. O Cloudflare Tunnel roteia o tráfego com zero downtime para https://multimidia.rivaldo.uk
```

---

## 4. Estratégia de Rollback

Em caso de necessidade de reversão imediata:
1. **Pelo Painel do Coolify**:
   - Acesse a aba **Deployments**, localize a última versão estável anterior e clique em **Rollback / Redeploy**.
2. **Via Linha de Comando (CLI)**:
   ```bash
   # Checkout para o commit anterior desejado
   git checkout <COMMIT_HASH_ANTERIOR>
   
   # Rebuild e reinício dos containers
   docker compose down
   docker compose up -d --build
   ```

---

## 5. Rotina de Backup Automatizado

O script [`scripts/backup.sh`](file:///c:/Users/Rivaldo/.gemini/antigravity-ide/scratch/unifap-estoque/scripts/backup.sh) executa o dump comprimido do PostgreSQL com pgvector e gerencia a retenção automática de 14 dias.

### Configurando no Cron do Servidor Host (Diário às 03:00)
```bash
# Adicionar no crontab do host (crontab -e)
0 3 * * * /bin/bash /opt/unifap-estoque/scripts/backup.sh >> /var/log/unifap_backup.log 2>&1
```

---

## 6. Procedimento de Restauração (Disaster Recovery)

Para restaurar um backup existente em caso de falha ou desastre:
```bash
# 1. Localizar o arquivo de backup desejado
ls -lh /backups/unifap_estoque_backup_*.sql.gz

# 2. Descompactar e restaurar no container PostgreSQL
gunzip -c /backups/unifap_estoque_backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i unifap-postgres psql -U postgres -d estoque_multimidia

# 3. Validar a integridade das tabelas e índices
docker exec -i unifap-postgres psql -U postgres -d estoque_multimidia -c "SELECT count(*) FROM \"User\";"
docker exec -i unifap-postgres psql -U postgres -d estoque_multimidia -c "SELECT count(*) FROM \"Event\";"
```

---

## 7. Healthchecks da Aplicação

O sistema possui rotas de monitoramento de saúde ativas:

- **Liveness Probe**: `GET /api/v1/health/live`
  - Responde com `HTTP 200` confirmando que o processo Node.js está ativo e respondendo a requisições.
- **Readiness Probe**: `GET /api/v1/health/ready`
  - Valida a conectividade ativa com o PostgreSQL via Prisma (`SELECT 1`) e a saúde do serviço biométrico.

---

## 8. Monitoramento e Logs de Containers

Comandos úteis para monitoramento em tempo real:
```bash
# Visualizar logs da aplicação web
docker logs -f unifap-web-app --tail 100

# Visualizar logs da API biométrica
docker logs -f unifap-biometric-api --tail 100

# Visualizar logs do banco de dados
docker logs -f unifap-postgres --tail 100

# Visualizar consumo de CPU e Memória
docker stats
```

---

## 9. Configuração do Túnel Cloudflare (Zero Trust)

O container `cloudflared` estabelece uma conexão criptografada de saída para a rede Anycast da Cloudflare.

1. No painel **Cloudflare Zero Trust** (`one.dash.cloudflare.com`):
   - Acesse **Networks > Tunnels > Create a Tunnel**.
   - Nomeie o túnel como `unifap-estoque-prod`.
2. Copie o **Tunnel Token** e atribua à variável `CLOUDFLARE_TUNNEL_TOKEN` no Coolify.
3. Configure o **Public Hostname**:
   - Subdomínio: `estoque`
   - Domínio: `unifapce.edu.br`
   - Serviço: `HTTP` para `app:3000` (ou `http://127.0.0.1:3000`).

---

## 10. Limites de Recursos dos Containers

Definidos em `docker-compose.yml`:
- **`app` (Next.js)**: 2.0 CPUs, 2.0 GB RAM.
- **`biometric-api` (FastAPI + dlib)**: 2.0 CPUs, 2.0 GB RAM.
- **`postgres` (pgvector)**: 2.0 CPUs, 1.5 GB RAM.
- **`cloudflared`**: 0.5 CPUs, 256 MB RAM.

---

## 11. Execução de Prisma Migrations

Durante o processo de inicialização de uma nova versão em produção, execute as migrações automáticas:
```bash
docker exec -it unifap-web-app npx prisma migrate deploy
```

---

## 12. Rotação Segura de Secrets e Chaves

Ao rotacionar credenciais:
1. **`NEXTAUTH_SECRET`**:
   - Gerar nova chave: `openssl rand -base64 64`
   - Atualizar a variável no Coolify e reiniciar o container `app` (`docker compose restart app`). As sessões ativas serão invalidadas e exigirão novo login.
2. **`BIOMETRIC_INTERNAL_TOKEN`**:
   - Atualizar simultaneamente no container `app` e no container `biometric-api`.
3. **Senhas de Usuários**:
   - O sistema possui política estrita de senha (mínimo 8 caracteres, maiúscula, minúscula, número e símbolo) e hash criptográfico via bcrypt com salt cost 12.

---

## 13. Guia de Troubleshooting

### Problema: "Não foi possível conectar ao banco de dados"
- Verifique o status do container: `docker ps -a | grep postgres`.
- Teste a conectividade: `docker exec -it unifap-postgres pg_isready -U postgres`.
- Verifique os logs: `docker logs unifap-postgres`.

### Problema: "Biometria facial não reconhece"
- Verifique se a API biométrica está saudável: `curl http://127.0.0.1:8000/api/v1/health/live`.
- Confirme se o token `BIOMETRIC_INTERNAL_TOKEN` é idêntico no `app` e `biometric-api`.
- Verifique os embeddings cadastrados: `SELECT count(*) FROM "FaceEmbedding" WHERE active = true;`.

### Problema: "CSS não carrega ou tela em branco"
- Limpe o cache do Next.js: `docker exec -it unifap-web-app rm -rf .next/cache`.
- Reinicie o container da aplicação: `docker compose restart app`.
