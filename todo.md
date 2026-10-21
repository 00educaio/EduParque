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

1. `VOCÊ` Responder aos dois gates da seção 1: elegibilidade ao Hobby e login necessário.
2. `VOCÊ` Fornecer somente as informações não secretas da seção 2.
3. `EU` Revisar suas respostas e conduzir uma etapa por vez, atualizando este checklist com a evidência obtida.

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

- [ ] `VOCÊ` Confirmar se o EduParque é estritamente pessoal e não comercial, condição obrigatória do Vercel Hobby.
  - Evidência: registrar “Hobby elegível: sim” com a justificativa.
  - Se a resposta for não ou incerta: parar; Vercel Hobby não pode ser usado nesta arquitetura gratuita.
- [ ] `VOCÊ` Informar qual login precisa existir em produção:
  - [ ] somente Google OAuth;
  - [ ] Magic Link por e-mail também é obrigatório.
- [ ] `EU` Se Magic Link for obrigatório, preparar uma atualização isolada de Auth.js/Nodemailer e repetir todos os testes de autenticação.
  - Motivo: a versão atual tem quatro alertas `high` sem correção automática compatível.
- [ ] `JUNTOS` Confirmar a decisão de autenticação antes do Preview.

## 2. Reunir informações sem compartilhar segredos

- [ ] `VOCÊ` Informar os nomes/domínios, sem tokens:
  - domínio definitivo de produção;
  - alias estável de Preview;
  - provider de mídia atual: `local` ou S3 compatível;
  - localização lógica das mídias antigas;
  - provider de login usado hoje.
- [ ] `VOCÊ` Confirmar que possui acesso de administrador ao Neon atual, ao novo projeto Neon, à Vercel e ao OAuth/SMTP aplicável.
- [ ] `VOCÊ` Configurar segredos diretamente nos painéis ou em arquivo local ignorado pelo Git quando chegarmos às etapas correspondentes.
- [ ] `EU` Conferir apenas nomes de variáveis, origens e permissões; nunca imprimir ou versionar seus valores.

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

- [ ] `VOCÊ` Criar manualmente um segundo projeto Neon Free em `aws-us-east-1`.
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
  - variáveis do provider de autenticação escolhido;
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
