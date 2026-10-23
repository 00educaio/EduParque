# Migração gratuita do EduParque — passo a passo

Atualizado em 23/10/2026. O runbook detalhado está em [docs/VERCEL_FREE_MIGRATION.md](docs/VERCEL_FREE_MIGRATION.md).

## Como usar este checklist

- `VOCÊ`: ação que depende do responsável pelas contas, domínios, decisões ou autorizações.
- `EU`: ação técnica que posso executar no código, terminal ou ambiente autorizado.
- `JUNTOS`: validação que precisa de evidência técnica e confirmação funcional.
- Nunca colocar senhas, tokens, `DATABASE_URL`, credenciais S3 ou cookies neste arquivo ou no chat.
- Nenhum deploy de produção pode ser feito sem sua autorização explícita.
- Se uma conferência falhar, paramos; nenhuma mídia antiga será apagada.

## Próxima ação

1. `JUNTOS` Validar CRUD, publicação, remix, favoritos e jogos no Preview.
2. `JUNTOS` Validar imagem e áudio por URL HTTPS externa.
3. `JUNTOS` Validar uploads reais de imagem e áudio pelas telas do Preview.

## 0. Estado atual — concluído localmente

- [x] `EU` Criei a branch `migration/vercel-free`.
- [x] `EU` Preparei Next.js 16 para Node 22, Vercel Hobby e região `gru1`.
- [x] `EU` Preservei o PostgreSQL atual e configurei o cliente para endpoint pooled/serverless.
- [x] `EU` Implementei URLs HTTPS externas sem fetch no servidor.
- [x] `EU` Implementei upload direto por PUT pré-assinado, bucket privado e limite de 5 MiB.
- [x] `EU` Implementei validação de autorização, tamanho, MIME, metadado e assinatura do arquivo.
- [x] `EU` Substituí `/tmp` das equipes por persistência durável e limpeza diária.
- [x] `EU` Criei migrations aditivas, inventário e migração de mídias sem exclusão da origem.
- [x] `EU` Criei roteiro de rollback e verificação de Preview/cold start/soak.
- [x] `EU` Substituí Google OAuth/SMTP pelo login convencional do protótipo, com senha protegida, bloqueio temporário e administração sem expor a senha.
- [x] `EU` Executei 135/135 testes unitários/integração, 9/9 E2E, lint, typecheck e build Webpack.
- [x] `EU` Não provisionei serviços, não usei segredos externos e não publiquei Preview ou produção.

## 1. Resolver os dois gates antes de criar infraestrutura

- [x] `VOCÊ` Confirmou que o EduParque é elegível ao Vercel Hobby: “Hobby elegível: sim” em 21/10/2026.
- [x] `VOCÊ` Retirou Google OAuth do escopo porque a configuração exigiria forma de pagamento no Google Cloud Console.
- [x] `JUNTOS` Decisão de autenticação revisada em 23/10/2026: login convencional por usuário/e-mail e senha para o protótipo.
- [x] `EU` Removeu Google OAuth, Magic Link e o acesso de desenvolvimento sem senha; o protótipo não terá cadastro público.

## 2. Reunir informações sem compartilhar segredos

- [x] `VOCÊ` Confirmou que ainda não possui domínio personalizado nem alias de Preview.
  - Produção e Preview usarão inicialmente os hostnames `*.vercel.app` gerados pela Vercel.
  - Os nomes exatos serão registrados somente depois que o projeto e o Preview existirem.
  - Login convencional não exige callback nem configuração no Google Cloud.
- [x] `VOCÊ` Confirmou que Google OAuth e SMTP não serão usados no protótipo.
- [x] `VOCÊ` Confirmou acesso ao novo projeto Neon e à Vercel; acesso ao Google Cloud deixou de ser necessário.
- [x] `VOCÊ` Confirmou acesso administrativo ao projeto Neon atual em São Paulo, que não pode ser substituído.
- [x] `VOCÊ` Identificou a situação das mídias no ambiente atual, sem compartilhar credenciais:
  - o provider de mídia de produção não é aplicável, pois o EduParque não está publicado;
  - não existem mídias de produção antigas para migrar.
- [x] `EU` Conferi o estado local sem ler segredos:
  - desenvolvimento e Docker usam `STORAGE_DRIVER=local` por padrão;
  - `storage/` contém somente artefatos locais de desenvolvimento/teste e não há storage de produção a migrar;
  - naquele momento, o repositório ainda não estava vinculado localmente à Vercel; o vínculo foi concluído depois, na seção 5.
- [ ] `VOCÊ` Configurar segredos diretamente nos painéis ou em arquivo local ignorado pelo Git quando chegarmos às etapas correspondentes.
- [x] `EU` Até aqui, conferi somente nomes de variáveis, origens e permissões; nenhum valor secreto foi lido, impresso ou versionado.

## 3. Proteger o PostgreSQL atual

- [x] `VOCÊ` No Neon atual, confirmou visualmente em 21/10/2026:
  - região São Paulo;
  - plano sem cobrança;
  - endpoint de produção pooled, com `-pooler` no hostname;
  - uso atual de armazenamento e compute dentro da franquia.
  - compute: 0,52 CU-hours;
  - armazenamento: 33,14 MB;
  - histórico: 672,81 kB;
  - transferência de rede: 3,1 MB.
- [x] `VOCÊ` Fez backup lógico do banco em 21/10/2026 e guardou fora do repositório.
  - formato custom do PostgreSQL 18, leitura validada com `pg_restore` e integridade SHA-256 conferida;
  - arquivo e checksum protegidos com permissão `600` em `/home/caio/Documents/EduParque-backups/`.
- [x] `VOCÊ` Criou a branch isolada `preview` a partir da branch `production` em 21/10/2026.
  - o diálogo `Connect` oferece endpoint pooled com `-pooler`; a interface não exibiu detalhes separados do compute.
- [x] `VOCÊ` Configurou a URL pooled dessa branch somente no ambiente Preview.
- [x] `EU` Validou em modo somente leitura a conexão, o schema e o estado das migrations na branch de Preview em 23/10/2026.
  - conexão pooled em São Paulo e endpoint distinto de produção;
  - 16 tabelas públicas; migrations `0000` a `0003` registradas;
  - migrations `0004` e `0005` pendentes, com todo o histórico existente anterior a `0004`.
- [x] `EU` Confirmou que a `DATABASE_URL` local de produção não foi trocada e continua pooled em São Paulo.
- [ ] `JUNTOS` Ensaiar a restauração do backup antes de qualquer alteração em produção.

## 4. Criar o Object Storage gratuito e isolado

- [x] `VOCÊ` Confirmou em 21/10/2026 que o novo projeto Neon é independente do banco principal, está no plano Free e usa `aws-us-east-1`.
  - Se qualquer item não conferir: parar antes de criar bucket ou credenciais; não criar um projeto duplicado sem revisar a situação.
- [x] `VOCÊ` Confirmou que não há trial, cartão, upgrade ou cobrança por excedente habilitada.
- [x] `VOCÊ` Criou o bucket privado `eduparque-media` em 21/10/2026; acesso público/anônimo permanece desativado pelo nível `Private`.
- [x] `VOCÊ` Criou a branch de storage `preview` a partir de `production` em 21/10/2026.
  - o bucket `eduparque-media` aparece na branch `preview` e permanece `Private`.
- [x] `JUNTOS` Criou em 23/10/2026 o bucket privado `eduparque-media-preview`, exclusivo da branch `preview`.
  - o bucket herdado `eduparque-media` foi preservado sem alterações depois que o Neon recusou `PutBucketCors` nele;
  - o bucket exclusivo evita alterar qualquer configuração de `production`.
- [x] `VOCÊ` Guardou em arquivos privados separados as configurações S3 de Preview e produção.
  - o Neon forneceu endpoints distintos e herdou a mesma credencial na branch filha, conforme seu modelo de lineage;
  - os arquivos estão fora do repositório e protegidos com permissão `600`.
- [x] `EU` Conferi endpoint HTTPS, região configurada, path-style e privacidade sem expor credenciais.
- [x] `EU` Validou em 23/10/2026 que Preview e produção não compartilham a visão de escrita.
  - um objeto temporário gravado em `preview` ficou ausente em `production` e foi removido após o teste.

## 5. Preparar o projeto Vercel sem publicar produção

- [x] `VOCÊ` Criou e vinculou em 23/10/2026 o projeto vazio `eduparque` na conta pessoal Hobby `caio-dev4`, sem iniciar Pro trial, cadastrar cobrança ou criar deployment.
  - vínculo local feito por Vercel CLI; `.vercel/` permanece ignorado pelo Git;
  - `.env.local` gerado pela CLI está ignorado e protegido com permissão `600`.
  - Se a interface exigir um deploy de produção para concluir a importação: parar e não confirmar.
- [ ] `VOCÊ` Dar autorização explícita somente para gerar um Preview.
- [x] `EU` Configurou em 23/10/2026, diretamente no ambiente Preview da Vercel e após autorização explícita:
  - `DATABASE_URL` da branch pooled de Preview;
  - `AUTH_SECRET`;
  - `AUTH_TRUST_HOST=true`;
  - `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`;
  - nenhuma variável de Google OAuth, SMTP ou senha de usuário;
  - `CRON_SECRET`;
  - `STORAGE_DRIVER=s3`;
  - `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET` e credenciais da branch de Preview;
  - TTLs opcionais descritos em `.env.example`.
  - 12 variáveis confirmadas por nome, ambiente e tipo; nenhum valor foi exibido ou cadastrado em Production.
- [x] `EU` Revisou e corrigiu em 23/10/2026 as configurações antes de qualquer deployment:
  - projeto Vercel alterado de Node `24.x` para `22.x` e de Framework `Other` para `Next.js`;
  - `vercel.json` confirmado com região `gru1`, Fluid Compute e cron diário às 03:17 UTC.
- [x] `EU` Gerou em 23/10/2026 o primeiro Preview após autorização explícita, sem `--prod`.
  - deployment `dpl_DS6JZRXLzSpR6DDgn94exDk3ep1c` confirmado com alvo `preview` e estado `Ready`;
  - hostname: `https://eduparque-cg8wcuyc3-caio-dev4.vercel.app`;
  - build Turbopack e TypeScript passaram; Functions foram geradas em `gru1`;
  - `/api/health` retornou `{"status":"ok"}` e `/login` retornou HTTP 200 usando o bypass autenticado da Vercel.
  - um deployment manual separado com alvo `production`, sem variáveis de Production e `/api/health` 503, foi identificado e não foi tratado como Preview válido;
  - esse deployment de Production foi removido com autorização em 23/10/2026; o alias de Production passou a responder 404 e o Preview permaneceu `Ready` com health `ok`.
- [x] `EU` Criou o alias estável `https://eduparque-preview-caio-dev4.vercel.app` apontando para o deployment válido de Preview.
- [x] `VOCÊ` Criou uma credencial com `storage:read` e `storage:write` diretamente na branch de storage `preview` em 23/10/2026.
  - a nova credencial foi confirmada como diferente da credencial de `production`, sem exibir seus valores;
  - ela lista, localiza e lê o CORS do bucket herdado, mas `PutBucketCors` ainda responde `NoSuchBucket` somente ao alterar o CORS;
  - três tentativas compatíveis com S3 falharam sem modificar a regra atual, que permanece com curingas;
  - não rotacionar nem substituir a credencial de `production`.
- [x] `EU` Atualizou somente as variáveis de Preview da Vercel para a credencial própria e o bucket `eduparque-media-preview`.
- [x] `EU` Configurou no bucket exclusivo de Preview o CORS somente para o hostname estável:
  - métodos `GET`, `HEAD` e `PUT`;
  - headers `content-type` e `if-none-match`;
  - sem curingas `*`.
- [x] `EU` Conferiu o CORS por preflight sem expor credenciais.
  - origem autorizada recebeu HTTP 200 e o hostname exato;
  - origem externa recebeu HTTP 403 sem `Access-Control-Allow-Origin`;
  - acesso anônimo ao objeto recebeu HTTP 403.
- [x] `EU` Confirmou pelo fluxo implementado que as Functions geram URLs pré-assinadas e não recebem nem devolvem os binários de mídia.

## 6. Aplicar e validar o Preview

- [x] `EU` Executou as migrations `0004`, `0005` e `0006` somente na branch de banco `preview` em 23/10/2026, após autorização explícita.
  - os hashes das três migrations aparecem no histórico da branch;
  - `temporary_team_images`, `media_assets.upload_status`, `auth_login_attempts`, `users.password_hash` e `users.auth_version` foram confirmados em leitura somente;
  - nenhuma migration foi aplicada na branch `production`.
- [x] `JUNTOS` Criou a primeira conta administradora na branch `preview` em 23/10/2026, com senha digitada de forma oculta no terminal e nunca compartilhada no chat.
- [ ] `EU` Executar novamente no Preview:
  - lint e typecheck;
  - testes unitários e de integração;
  - E2E;
  - build Turbopack da Vercel.
- [x] `JUNTOS` Validou em 23/10/2026 no Preview o login convencional, o acesso a `/admin/users` e o logout.
- [x] `EU` Publicou em 23/10/2026 um novo deployment somente de Preview após a troca do bucket.
  - deployment `dpl_7Zk6Yo6Qzyvsni8eHdNGgn8DsNt6`, alvo `preview`, estado `Ready`;
  - build Turbopack e TypeScript passaram e as Functions foram geradas em `gru1`;
  - o alias estável foi atualizado e `/api/health` retornou `{"status":"ok"}`.
- [ ] `JUNTOS` Validar a persistência da sessão após nova Function/cold start.
- [ ] `JUNTOS` Validar CRUD, publicação, remix, favoritos e os jogos existentes.
- [ ] `JUNTOS` Adicionar imagem e áudio por URL HTTPS externa e confirmar que o servidor não faz fetch.
- [x] `EU` Testou upload direto válido de exatamente 5 MiB por URL pré-assinada em 23/10/2026.
  - PUT retornou HTTP 200, tamanho de 5.242.880 bytes e MIME foram confirmados;
  - a resposta CORS trouxe o hostname exato do Preview e o objeto temporário foi removido.
- [ ] `EU` Confirmar rejeição de 5 MiB + 1 byte, MIME falso e arquivo com assinatura inválida.
- [ ] `EU` Confirmar PUT direto para o bucket e GET por redirect para URL assinada curta.
- [ ] `EU` Confirmar expiração da URL e ausência de URL assinada persistida no banco.
- [ ] `JUNTOS` Testar imagem temporária de equipe, troca, encerramento da sessão e remoção.
- [ ] `EU` Executar o cron duas vezes e confirmar idempotência e recusa de segredo incorreto.

## 7. Validar cold start e sessão longa

- [ ] `EU` Executar health check inicial com `npm run preview:verify`.
- [ ] `JUNTOS` Garantir pelo menos 6 minutos sem tráfego no Preview.
- [ ] `EU` Executar `npm run preview:verify -- --cold-start` e registrar duração/resultado.
- [ ] `JUNTOS` Criar uma sessão real com cronômetro e mantê-la aberta por 50 minutos.
- [ ] `EU` Executar `npm run preview:verify -- --soak` durante a sessão.
- [ ] `JUNTOS` Conferir cronômetro, pausa, retomada, troca de equipe e placar no início, aos 25 minutos e ao final.
- [ ] `EU` Registrar p95, erros, invocações, CPU, memória, banco e storage, sem registrar segredos ou URLs assinadas.

## 8. Inventariar e copiar as mídias antigas

- [ ] `VOCÊ` Disponibilizar localmente as credenciais da origem e do destino por variáveis ignoradas pelo Git.
- [ ] `EU` Executar `npm run media:inventory` na origem e salvar contagem, bytes, ausentes e divergentes.
- [ ] `EU` Executar `npm run media:migrate` em dry-run.
- [ ] `JUNTOS` Comparar o dry-run com o inventário e interromper se existir qualquer divergência não explicada.
- [ ] `VOCÊ` Autorizar explicitamente a cópia das mídias para o novo bucket.
- [ ] `EU` Executar `npm run media:migrate -- --apply`.
- [ ] `EU` Inventariar o destino e validar uma amostra de imagens e áudios pelo Preview.
- [ ] `JUNTOS` Confirmar que contagem, tamanho, MIME e reprodução conferem.
- [ ] `VOCÊ` Manter toda a origem intacta durante o período de observação.
- [ ] `EU` Não executar nenhuma exclusão das mídias antigas.

## 9. Go/no-go para produção

- [ ] `EU` Entregar relatório com testes, métricas, riscos e comparação dos inventários.
- [ ] `JUNTOS` Confirmar que banco e Object Storage estão abaixo de 70% das franquias.
- [ ] `JUNTOS` Confirmar o login convencional, o bloqueio por tentativas e a invalidação após redefinição de senha.
- [ ] `JUNTOS` Revisar o rollback completo em [docs/VERCEL_FREE_MIGRATION.md](docs/VERCEL_FREE_MIGRATION.md).
- [ ] `VOCÊ` Registrar decisão final de go/no-go.
- [ ] `VOCÊ` Se for go, dar autorização explícita e inequívoca para deploy de produção.

## 10. Produção — executar somente após autorização

- [ ] `VOCÊ` Fazer um novo backup lógico imediatamente antes da janela de mudança.
- [ ] `EU` Conferir novamente que a `DATABASE_URL` é a atual, pooled e em São Paulo.
- [ ] `EU` Aplicar migrations reversíveis em produção e validar o schema.
- [ ] `EU` Repetir inventário/dry-run e copiar somente o que foi aprovado.
- [ ] `EU` Publicar exatamente o commit validado no Preview.
- [ ] `JUNTOS` Testar domínio definitivo: Auth.js, sessões, CRUD, publicação, mídias, jogos, cronômetros e imagens de equipes.
- [ ] `EU` Conferir cron, logs e métricas sem expor dados sensíveis.
- [ ] `VOCÊ` Confirmar aceite funcional.

## 11. Rollback, se qualquer validação falhar

- [ ] `VOCÊ` Autorizar o rollback e suspender novos uploads.
- [ ] `EU` Promover o deployment anterior.
- [ ] `EU` Restaurar a configuração do storage anterior sem alterar a `DATABASE_URL`.
- [ ] `EU` Manter as migrations aditivas até confirmar que nenhuma mídia nova depende delas.
- [ ] `JUNTOS` Validar login, sessões, jogos e leitura das mídias antigas.
- [ ] `EU` Reconciliar objetos e registros; não apagar nenhuma origem durante o incidente.

## 12. Acompanhamento após produção

- [ ] `VOCÊ` Revisar semanalmente as franquias da Vercel e do Neon.
- [ ] `EU` Alertar em 70% de uso e preparar bloqueio de novos uploads em 85%.
- [ ] `JUNTOS` Revisar erros 4xx/5xx, p95, cold starts, falhas de upload e execução do cron.
- [ ] `VOCÊ` Nunca habilitar upgrade, trial ou cobrança por excedente para contornar limite.
- [ ] `JUNTOS` Só considerar a migração encerrada após o período de observação sem perda de mídia ou regressão funcional.
