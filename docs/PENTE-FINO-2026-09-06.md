# Atualização após autorização dos ajustes

- Histórico paginado em blocos de 50, filtros mantidos, total e navegação. CSV identificado como página atual; indicadores identificados como referentes à página.
- Upload facial alinhado a 10 MB em Next e Python, preservando validações de tipo, pixels e descompactação.
- Check-in usa relógio do servidor explicitamente em America/Fortaleza. Dockerfiles configuram o fuso; Python instala tzdata. Instantes persistidos em UTC permanecem em UTC.
- Horários de telas, relatórios, empréstimos e sugestões de agenda ajustados para Fortaleza. A mudança não sincroniza o relógio físico de dispositivos; a autorização de check-in é calculada no servidor.
- Câmera exige o maior rosto da cena inteiramente dentro dos limites do guia visível, com projeção do vídeo espelhado/object-cover. Rostos menores ao fundo continuam permitidos e contados.
- Indisponibilidade do motor facial passa a ERROR, distinguindo-a de pessoa não reconhecida.
- Novos testes verificam página após os 200 primeiros registros, filtros no fuso correto, limites da moldura, upload de 10 MB e abertura de check-in em Fortaleza.
- Validação: 405 testes JavaScript e oito Python aprovados; TypeScript aprovado. Testes de câmera e banco usam simulações; homologação presencial com câmera/pgvector e acompanhamento do Coolify continuam necessários.
- O stream realtime já aberto ainda não tem revogação periódica; novas conexões revalidam a conta. Avisos existentes de lint/Redis devem ser avaliados conforme a implantação.

O registro abaixo descreve a primeira rodada, anterior às alterações autorizadas acima. As pendências de paginação, limite de upload, fuso e classificação de erro técnico foram tratadas nesta atualização.

---

# Revisão do aplicativo — 06/09/2026

## Base e escopo

Revisão realizada na pasta principal `Desktop/PROJETOS/EstoqueMultimidia`, em HEAD `9e7eb711362861dd43cf03d458cbb725a57002a6`, incluindo suas alterações pendentes. O worktree `bb34` contém mudanças de uma revisão anterior e não foi usado como fonte para reaplicação automática. Nenhum commit, push, migração ou deploy foi executado nesta rodada.

Foram verificadas a suíte existente (estoque, empréstimos, manutenção, agenda, eventos, permissões e importação), compilação, tipos, lint, esquema Prisma e dependências de produção. A inspeção manual concentrou-se nas regressões dos commits recentes, controle de acesso, importação e biometria. Isso não equivale a testar todas as telas e integrações com dados reais.

## Correções desta rodada

- `src/lib/zip-limits.ts`: leitura ZIP por eventos compatíveis com o stream do JSZip, preservando o limite de bytes descompactados. Corrige três testes e o erro de TypeScript, sem retirar a proteção contra expansão excessiva.
- `src/__tests__/request-e2e-workflow.test.ts`: domingo futuro calculado dinamicamente. Corrige o teste que envelheceu; não altera regras de agendamento.
- `biometric-api/app/services/face_service.py`: quando o recorte contém vários rostos, codifica somente o de maior área. Não rejeita a cena por haver pessoas ao fundo. Preserva o fallback do recorte e o fluxo de cadastro existentes.
- `biometric-api/app/services/recognition_service.py`: após conflito de gravação, consulta a presença antes de responder que já foi confirmada. Uma falha sem registro retorna erro; uma duplicidade real retorna os dados do registro existente.
- `src/app/api/v1/search/route.ts`: restringe EVENTOS aos eventos vinculados e seleciona apenas os campos usados pela busca, excluindo o token de apresentação.
- `src/app/api/v1/events/[id]/realtime/route.ts`: revalida a conta ao abrir conexão por sessão. A autenticação por token de apresentação permanece disponível.
- `src/app/api/v1/inventory/availability/route.ts`: permite ao apoio acadêmico consultar disponibilidade no agendamento, preservando o bloqueio das rotas de estoque e do perfil EVENTOS.
- Testes de regressão cobrem maior rosto, falhas de gravação, busca vinculada, disponibilidade acadêmica e nova conexão realtime com conta revogada.

As alterações que já estavam pendentes nas quatro rotas de biometria, `presentation-guard.ts`, `import.service.ts`, `biometric-upload.ts` e seus testes foram preservadas. Elas devem ser incluídas na revisão do diff dos commits; não são todas alterações desta rodada.

## Evidências

- Antes das correções: 389 testes JavaScript passaram e quatro falharam; TypeScript falhou na chamada `destroy` do stream ZIP.
- Depois: suíte completa com 395 testes passou. Foi acrescentado depois um teste de revogação realtime; o arquivo correspondente passou com seus 40 testes. Total atual: 396 testes, com o último acréscimo validado de forma direcionada.
- Python: cinco testes passaram, usando motor facial e banco simulados; nenhum banco real foi utilizado pelos testes.
- `next build`: passou, com 82 páginas estáticas geradas.
- `tsc --noEmit`: passou após o build. Uma execução simultânea ao build encontrou arquivos gerados transitórios ausentes; a execução sequencial final passou.
- `next lint`: passou com avisos de imagens e dependências de hooks, entre outros avisos existentes. Não foram silenciados indiscriminadamente.
- `prisma validate`: passou. Não foram aplicadas migrações.
- `npm audit --omit=dev --audit-level=high`: zero vulnerabilidades reportadas. Esta checagem não cobre pacotes Python nem dependências exclusivamente de desenvolvimento.
- `git diff --check`: passou.

## Pendências encontradas e limites da validação

1. **Histórico de movimentações:** a API retorna por padrão até 200 registros, enquanto a tela não oferece paginação e exporta somente o conjunto carregado. Históricos maiores ficam incompletos. Planejar paginação e deixar explícito o alcance da exportação antes de considerar esse fluxo validado.
2. **Upload biométrico:** a validação Next aceita até 10 MB; a API Python limita a 5 MB. Arquivos nesse intervalo podem ser aceitos inicialmente e recusados no serviço. Limites não foram alterados nesta rodada.
3. **Horário do check-in:** o serviço Python usa horário local do servidor na janela de abertura. Validar alinhamento com o fuso usado pelo aplicativo no ambiente de implantação.
4. **Motor facial indisponível:** a extração recusa a operação, mas o serviço de reconhecimento converte HTTPException em NOT_RECOGNIZED. Não confirma presença, porém pode apresentar indisponibilidade técnica como falha de detecção.
5. **Conexões realtime já abertas:** a correção revalida novas conexões; não implementa revogação periódica de um stream já aberto.
6. O build avisou sobre Redis não configurado. Verificar a configuração do ambiente se houver múltiplas réplicas. Não foi alterada a infraestrutura.
7. A contagem representa rostos detectados, não uma garantia de contagem de todas as pessoas. Maior área é a aproximação de proximidade usada pelo sistema, não medição física de distância. Testes simulados não medem acurácia nem comprovam resistência a fotos ou vídeos.

## Validação prática antes da publicação

- Câmera: uma pessoa à frente e várias ao fundo; alternar quem se aproxima, testar maior rosto fora do centro, iluminação ruim e rosto não cadastrado. Conferir contador, destaque e identidade registrada.
- Presença: dois dispositivos registrando a mesma pessoa; falha temporária de serviço/banco; confirmar que sucesso sempre corresponde a registro persistido.
- Permissões: apoio acadêmico agenda e consulta disponibilidade; EVENTOS busca somente seus eventos; conta desativada não abre nova conexão autenticada.
- Importação: planilha e ZIP reais pequenos, pacote acima do limite e imagem inválida.
- Fluxos operacionais: empréstimo/devolução, manutenção, agendamento conflitante, sorteio e apresentação em ambiente de teste com banco PostgreSQL/pgvector.
- Rodar o CI do GitHub e revisar as pendências acima. Build e testes locais aprovados não substituem essa homologação.

## Organização sugerida dos commits

1. Correção do ZIP e teste de agenda, incluindo os arquivos novos dos quais a importação depende.
2. Correções de acesso e respectivos testes.
3. Seleção do maior rosto e confirmação segura de presença, com testes Python.
4. Relatório e demais alterações pendentes revisadas pelo responsável.

Revisar o diff a partir da pasta principal; não misturar o conjunto antigo do worktree `bb34`.
