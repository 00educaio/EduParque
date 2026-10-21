# Migração gratuita do EduParque — passo a passo

Atualizado em 21/10/2026. O runbook detalhado está em [docs/VERCEL_FREE_MIGRATION.md](docs/VERCEL_FREE_MIGRATION.md).

## Como usar este checklist

- `VOCÊ`: ação que depende do responsável pelas contas, domínios, decisões ou autorizações.
- `EU`: ação técnica que posso executar no código, terminal ou ambiente autorizado.
- `JUNTOS`: validação que precisa de evidência técnica e confirmação funcional.
- Nunca colocar senhas, tokens, `DATABASE_URL`, credenciais S3 ou cookies neste arquivo ou no chat.
- Nenhum deploy de produção pode ser feito sem sua autorização explícita.
- Se uma conferência falhar, paramos; nenhuma mídia antiga será apagada.

## Próxima ação

1. `VOCÊ` Confirmar se também possui acesso administrativo ao projeto Neon atual em São Paulo, que contém o banco principal.
2. `VOCÊ` Conferir no painel desse projeto os quatro itens da seção 3, sem compartilhar segredos.
3. `EU` Revisar essa evidência e conduzir a preparação do Neon de Preview e do Object Storage, uma etapa por vez.

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
- [x] `EU` Executei 135/135 testes unitários/integração, 9/9 E2E, lint, typecheck e build Webpack.
- [x] `EU` Não provisionei serviços, não usei segredos externos e não publiquei Preview ou produção.

## 1. Resolver os dois gates antes de criar infraestrutura

- [x] `VOCÊ` Confirmou que o EduParque é elegível ao Vercel Hobby: “Hobby elegível: sim” em 21/10/2026.
- [x] `VOCÊ` Confirmou que somente Google OAuth precisa existir em produção.
  - Magic Link por e-mail não será usado; as variáveis `EMAIL_*` devem permanecer ausentes.
- [x] `EU` Registrei que a atualização de Auth.js/Nodemailer não faz parte do escopo atual porque Magic Link ficará desabilitado.
  - Os quatro alertas `high` transitivos continuam documentados como risco residual e serão reavaliados antes da produção.
- [x] `JUNTOS` Decisão de autenticação definida para o Preview: somente Google OAuth.

## 2. Reunir informações sem compartilhar segredos

- [x] `VOCÊ` Confirmou que ainda não possui domínio personalizado nem alias de Preview.
  - Produção e Preview usarão inicialmente os hostnames `*.vercel.app` gerados pela Vercel.
  - Os nomes exatos serão registrados somente depois que o projeto e o Preview existirem.
  - Depois disso, o callback Google será configurado como `https://<hostname-exato>/api/auth/callback/google`.
- [x] `VOCÊ` Confirmou que o provider de login será Google OAuth; SMTP não é aplicável.
- [x] `VOCÊ` Confirmou acesso ao novo projeto Neon, à Vercel e à configuração Google OAuth.
- [ ] `VOCÊ` Confirmar acesso administrativo ao projeto Neon atual em São Paulo, que não pode ser substituído.
- [ ] `VOCÊ` Identificar no ambiente atual, sem compartilhar credenciais:
  - provider de mídia de produção: `local` ou S3 compatível;
  - localização lógica das mídias antigas.
- [x] `EU` Conferi o estado local sem ler segredos:
  - desenvolvimento e Docker usam `STORAGE_DRIVER=local` por padrão;
  - `storage/` contém artefatos locais de desenvolvimento/teste, o que não comprova o provider usado em produção;
  - o provider e a localização das mídias de produção continuam pendentes até a conferência do ambiente atual;
  - o repositório ainda não está vinculado localmente à Vercel e as CLIs Vercel/Neon não estão instaladas.
- [ ] `VOCÊ` Configurar segredos diretamente nos painéis ou em arquivo local ignorado pelo Git quando chegarmos às etapas correspondentes.
- [x] `EU` Até aqui, conferi somente nomes de variáveis, origens e permissões; nenhum valor secreto foi lido, impresso ou versionado.

## 3. Proteger o PostgreSQL atual

- [ ] `VOCÊ` No Neon atual, confirmar visualmente:
  - região São Paulo;
  - plano sem cobrança;
  - endpoint de produção pooled, com `-pooler` no hostname;
  - uso atual de armazenamento e compute dentro da franquia.
- [ ] `VOCÊ` Fazer backup lógico do banco e guardar fora do repositório.
- [ ] `VOCÊ` Criar uma branch isolada do banco para Preview.
- [ ] `VOCÊ` Configurar a URL pooled dessa branch somente no ambiente Preview.
- [ ] `EU` Validar conexão, schema e migrations na branch de Preview.
- [ ] `EU` Confirmar que a `DATABASE_URL` de produção não foi trocada nem teve sua região alterada.
- [ ] `JUNTOS` Ensaiar a restauração do backup antes de qualquer alteração em produção.

## 4. Criar o Object Storage gratuito e isolado

- [ ] `VOCÊ` No novo projeto Neon ao qual já possui acesso, confirmar que ele é independente do banco principal, está no plano Free e usa `aws-us-east-1`.
  - Se qualquer item não conferir: parar antes de criar bucket ou credenciais; não criar um projeto duplicado sem revisar a situação.
- [ ] `VOCÊ` Confirmar que não há trial, cartão, upgrade ou cobrança por excedente habilitada.
- [ ] `VOCÊ` Criar o bucket privado de mídias; leitura pública deve permanecer desativada.
- [ ] `VOCÊ` Criar uma branch de storage para Preview, separada da produção.
- [ ] `VOCÊ` Gerar credenciais S3 distintas para Preview e produção.
- [ ] `EU` Conferir endpoint HTTPS, região, path-style e privacidade sem expor credenciais.
- [ ] `EU` Validar que Preview e produção não compartilham permissão de escrita.

## 5. Preparar o projeto Vercel sem publicar produção

- [ ] `VOCÊ` Criar ou vincular o projeto em uma conta Hobby elegível, sem iniciar Pro trial e sem cadastrar cobrança.
  - Se a interface exigir um deploy de produção para concluir a importação: parar e não confirmar.
- [ ] `VOCÊ` Dar autorização explícita somente para gerar um Preview.
- [ ] `VOCÊ` Configurar no Preview, diretamente na Vercel:
  - `DATABASE_URL` da branch pooled de Preview;
  - `AUTH_SECRET`;
  - `AUTH_TRUST_HOST=true`;
  - `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`;
  - `DEV_AUTH_ENABLED=false`;
  - `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET`;
  - nenhuma variável `EMAIL_*`;
  - `CRON_SECRET`;
  - `STORAGE_DRIVER=s3`;
  - `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET` e credenciais da branch de Preview;
  - TTLs opcionais descritos em `.env.example`.
- [ ] `EU` Revisar as configurações Node 22, `gru1`, Fluid Compute e cron diário.
- [ ] `EU` Gerar o Preview sem `--prod`, somente depois da autorização acima.
- [ ] `VOCÊ` Depois que o alias estável existir, configurar CORS somente para os domínios exatos de Preview e produção:
  - métodos `GET`, `HEAD` e `PUT`;
  - headers `content-type` e `if-none-match`;
  - sem curingas `*`.
- [ ] `EU` Conferir o CORS por preflight sem expor credenciais.
- [ ] `EU` Confirmar que nenhuma Function na Vercel recebe ou devolve binários de mídia.

## 6. Aplicar e validar o Preview

- [ ] `EU` Executar as migrations `0004` e `0005` somente na branch de Preview.
- [ ] `EU` Executar novamente no Preview:
  - lint e typecheck;
  - testes unitários e de integração;
  - E2E;
  - build Turbopack da Vercel.
- [ ] `JUNTOS` Validar login, logout e persistência da sessão após nova Function/cold start.
- [ ] `JUNTOS` Validar CRUD, publicação, remix, favoritos e os jogos existentes.
- [ ] `JUNTOS` Adicionar imagem e áudio por URL HTTPS externa e confirmar que o servidor não faz fetch.
- [ ] `EU` Testar upload real válido de exatamente 5 MiB.
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
- [ ] `JUNTOS` Confirmar que o risco do Nodemailer foi resolvido ou que Magic Link está desabilitado e Google OAuth validado.
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
