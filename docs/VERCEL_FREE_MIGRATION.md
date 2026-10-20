# Migração do EduParque para Vercel Hobby + Neon Free

Status em 20/10/2026: implementação local concluída e separada na branch `migration/vercel-free`. Nenhum projeto, bucket ou recurso pago foi criado; nenhuma credencial externa foi usada; nenhum Preview ou deploy de produção foi publicado.

## Gate de viabilidade

Antes de qualquer deploy, o responsável pelo projeto deve confirmar que o uso se enquadra no Vercel Hobby. A documentação e os termos atuais limitam Hobby a uso pessoal e não comercial. A própria diretriz considera comercial, entre outros casos, trabalho feito para ganho financeiro por empregado ou consultor. Se o EduParque for operado institucional ou comercialmente, a arquitetura Vercel Hobby não pode ser aprovada sob a regra de custo zero. Não iniciar trial, não cadastrar cartão e não migrar produção até resolver esse gate.

Fontes oficiais consultadas em 20/10/2026:

- [Vercel Hobby](https://vercel.com/docs/plans/hobby) e [Fair Use](https://vercel.com/docs/limits/fair-use-guidelines): Hobby é gratuito, pessoal/não comercial e pausa recursos ao esgotar a franquia.
- [Limites de Functions](https://vercel.com/docs/functions/limitations), [regiões](https://vercel.com/docs/functions/configuring-functions/region) e [Node.js](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions): Node 22 é suportado e `gru1` é configurável. O cron do projeto limita explicitamente sua Function a 60 segundos.
- [Cron no Hobby](https://vercel.com/docs/cron-jobs/usage-and-pricing) e [segurança do cron](https://vercel.com/docs/cron-jobs/manage-cron-jobs): no Hobby a menor frequência é diária, com precisão horária; `CRON_SECRET` é enviado automaticamente como `Authorization: Bearer ...`.
- [Plano gratuito Neon](https://neon.com/blog/neon-free-plan-1-gb-per-project): 100 projetos, 1 GB de Postgres, 100 CU-h/mês, autoscaling até 2 CU, 10 branches, restore de 6 horas e 5 GB de Object Storage por projeto.
- [Neon Object Storage GA](https://neon.com/blog/neon-backend-is-ga) e [exemplo oficial com bucket privado](https://neon.com/blog/building-a-private-searchable-photo-library-on-the-neon-backend): S3 compatível, bucket privado, URLs assinadas curtas e isolamento por branch.
- [Compute e pooling Neon](https://neon.com/docs/manage/endpoints/): usar a conexão pooled para aplicações serverless; ela suporta até 10.000 conexões de usuário concorrentes.

Os limites podem mudar. Reabrir essas fontes imediatamente antes do Preview e da produção.

## Arquitetura final

| Componente | Destino | Decisão |
|---|---|---|
| Next.js 16 | Vercel Hobby, Node 22, `gru1` | `vercel.json` fixa `gru1`, Fluid Compute e cron diário. A região prioriza a latência do banco principal em São Paulo. |
| PostgreSQL principal | Projeto Neon atual em São Paulo | Preservar exatamente o projeto e a `DATABASE_URL` de produção. Confirmar manualmente que o hostname é pooled (`-pooler`). Pool da aplicação limitado a 3 conexões, sem prepared statements. |
| Autenticação e sessões | Auth.js + tabelas atuais no Postgres | Nenhuma migração de identidade. Produção continua com sessão em banco; login local permanece bloqueado em produção. |
| Object Storage | Segundo projeto Neon Free em `aws-us-east-1` | Projeto independente, bucket privado e interface S3 existente. Produção e Preview não podem compartilhar branch/credenciais de escrita. |
| Mídia própria | Browser direto para S3 | Function autentica, registra `pending`, assina PUT de 5 minutos e finaliza após validar HEAD, metadado, tamanho, MIME e assinatura do arquivo. |
| Leitura privada | Redirect 307 para GET assinado | URL de leitura dura 15 minutos por padrão. A Function não devolve binário na Vercel. |
| URLs externas | HTTPS direto no navegador | Persistir URL, tipo e nome; o servidor não busca o recurso. URLs locais, privadas, com credenciais, fragmentos ou protocolos não HTTPS são rejeitadas. |
| Imagens temporárias de equipes | Mesmo bucket privado + tabela durável | Nunca usar `/tmp`. Remover ao finalizar a sessão; cron diário idempotente tenta novamente itens expirados. |

O banco guarda somente URL externa ou `objectKey`/metadados. URLs assinadas nunca são persistidas.

## Persistência, upload e segurança

O limite único para imagem ou áudio é 5 MiB (`5 * 1024 * 1024`). Tipos aceitos:

- imagens: JPEG, PNG, WebP e GIF; imagens de equipe: JPEG, PNG e WebP;
- áudio: MP3, Ogg, WAV, MP4/M4A e FLAC.

O fluxo S3 é:

1. cliente envia apenas nome, MIME e tamanho para a API;
2. API autentica e autoriza, cria registro `pending`, gera chave aleatória por proprietário/sessão e assina PUT curto com `If-None-Match: *`;
3. navegador envia bytes diretamente ao bucket privado;
4. cliente solicita finalização;
5. API confere tamanho, `Content-Type`, `upload-id` e magic bytes antes de marcar `ready`;
6. leitura autorizada redireciona para GET assinado curto.

Checksums automáticos do AWS SDK foram desativados no presign (`WHEN_REQUIRED`), pois seriam calculados antes de o navegador fornecer o corpo. Credenciais S3 permanecem exclusivamente no servidor. Quando `VERCEL=1`, os fallbacks locais que transportam binários respondem 503 se S3 não estiver configurado.

A CSP permite imagem/áudio HTTPS externo, mas `connect-src` fica restrito ao próprio app e à origem de `S3_ENDPOINT`. O bucket deve aceitar CORS somente dos domínios conhecidos. Exemplo a adaptar com os domínios exatos de produção e do alias estável de Preview:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "https://eduparque.example.org",
        "https://eduparque-preview.example.org"
      ],
      "AllowedMethods": ["GET", "HEAD", "PUT"],
      "AllowedHeaders": ["content-type", "if-none-match"],
      "ExposeHeaders": ["etag"],
      "MaxAgeSeconds": 300
    }
  ]
}
```

Não usar `*` em `AllowedOrigins` ou `AllowedHeaders`. O Preview deve ter alias estável para permitir origem exata.

## Migrations e migração de mídia

As migrations são aditivas:

- `0004_flawless_wrecker.sql`: adiciona status `pending/ready`, expiração e data de verificação; mídias existentes recebem `ready` por padrão;
- `0005_fluffy_the_spike.sql`: cria `temporary_team_images`, vinculada à sessão, com índices de estado/expiração.

Procedimento seguro para as mídias antigas:

1. Fazer backup lógico do banco e preservar integralmente o storage de origem.
2. Executar `npm run media:inventory` apontando para a origem e arquivar o JSON.
3. Configurar `S3_*` para o destino e `LEGACY_*` para a origem.
4. Executar `npm run media:migrate` sem `--apply`; conferir total, tamanho e conflitos.
5. Executar `npm run media:migrate -- --apply` somente depois da conferência.
6. Executar `npm run media:inventory` com `STORAGE_DRIVER=s3` e comparar total, bytes, ausentes e divergentes.
7. Validar amostra de imagens e áudios pelo app em Preview.
8. Manter a origem intacta durante todo o período de observação. O script nunca apaga o objeto antigo.

O script preserva as chaves existentes, recusa origem/destino S3 iguais, reconhece objetos já copiados e valida tamanho, MIME e assinatura antes/depois da cópia.

## Variáveis necessárias

Definir separadamente nos ambientes Preview e Production. Nunca versionar valores.

| Variável | Obrigatória | Uso |
|---|---:|---|
| `DATABASE_URL` | sim | URL pooled do Neon. Em Production é a URL atual de São Paulo, sem substituição; Preview usa branch isolada. |
| `AUTH_SECRET` | sim | Segredo Auth.js aleatório com pelo menos 32 bytes. |
| `AUTH_TRUST_HOST` | sim | `true` na Vercel. |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | sim | Chave AES compartilhada entre réplicas/builds. |
| `DEV_AUTH_ENABLED` | sim | `false` em Preview e Production. |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | conforme uso | OAuth existente; configurar callback do domínio correto. |
| `EMAIL_SERVER_HOST`, `EMAIL_SERVER_PORT`, `EMAIL_SERVER_USER`, `EMAIL_SERVER_PASSWORD`, `EMAIL_FROM` | conforme uso | Magic Link existente. Ver risco de Nodemailer abaixo antes de habilitar. |
| `CRON_SECRET` | sim | Segredo independente, aleatório, mínimo 16 caracteres. |
| `STORAGE_DRIVER` | sim | Obrigatoriamente `s3` na Vercel. |
| `S3_ENDPOINT` | sim | Valor equivalente a `AWS_ENDPOINT_URL_S3` do projeto Neon de storage, sempre HTTPS. |
| `S3_REGION` | sim | `us-east-1` para o projeto decidido. |
| `S3_BUCKET` | sim | Nome do bucket privado. |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | sim | Credencial S3 da branch/ambiente, somente server-side. |
| `S3_FORCE_PATH_STYLE` | sim | `true` para o endpoint Neon. |
| `MEDIA_UPLOAD_URL_TTL_SECONDS` | não | Padrão 300; permitido 60–900. |
| `MEDIA_READ_URL_TTL_SECONDS` | não | Padrão 900; permitido 60–3600. |
| `MEDIA_PENDING_TTL_MINUTES` | não | Padrão 60. |
| `TEAM_IMAGE_TTL_HOURS` | não | Padrão 24. |

`LEGACY_STORAGE_DRIVER`, `LEGACY_LOCAL_STORAGE_PATH` e `LEGACY_S3_*` são usados somente no terminal durante a migração; não cadastrá-los na Vercel.

Para validar Preview, `PREVIEW_BASE_URL` é obrigatória localmente. `VERCEL_AUTOMATION_BYPASS_SECRET`, `PREVIEW_COOKIE` e `PREVIEW_PROBE_PATHS` são opcionais e nunca devem ser commitidas.

## Passos manuais no Neon

1. No projeto principal atual, confirmar região São Paulo, capacidade Free e endpoint pooled. Não alterar o endpoint de produção.
2. Criar backup lógico antes das migrations. O restore instantâneo Free é de apenas 6 horas e não substitui o backup.
3. Criar manualmente um segundo projeto Free em `aws-us-east-1`, sem trial, cartão, upgrade ou cobrança por excedente.
4. Criar bucket privado; confirmar que leitura pública está desativada.
5. Criar branch de Preview no projeto de storage e manter objetos/credenciais isolados da branch de produção.
6. Obter endpoint, região, bucket e credenciais S3 de cada branch. Não usar chave administrativa no cliente.
7. Aplicar CORS com origens exatas e testar preflight de PUT.
8. Aplicar migrations primeiro na branch de banco de Preview com `npm run db:migrate`.
9. Executar inventário, dry-run, cópia e inventário pós-cópia conforme a seção anterior.
10. Monitorar os limites: 1 GB do banco principal e 5 GB no projeto de storage. Cinco GiB comportam, no máximo teórico, 1024 objetos de 5 MiB, antes de considerar demais arquivos.

## Passos manuais na Vercel

1. Confirmar por escrito a elegibilidade ao Hobby. Usar conta pessoal; repositório de organização Git não é aceito pelo Hobby.
2. Importar o repositório sem publicar Production. Não iniciar Pro trial e não cadastrar método de pagamento.
3. Confirmar Framework Preset Next.js, Node 22 e configurações de `vercel.json` (`gru1`, Fluid e cron diário às 03:17 UTC).
4. Configurar todas as variáveis de Preview com branches isoladas de banco e storage.
5. Configurar Production separadamente, preservando a `DATABASE_URL` atual. Nunca copiar credenciais de Production para Preview.
6. Registrar callbacks OAuth e domínios autorizados de cada ambiente.
7. Criar alias estável de Preview e aplicar CORS exato ao bucket da branch de Preview.
8. Gerar um Preview somente após autorização e executar o checklist abaixo.
9. Só promover Production após autorização explícita e todos os gates verdes.

## Testes executados

| Validação | Resultado local |
|---|---|
| Baseline antes das mudanças | 122 passaram, 3 ignorados (125 coletados). |
| Unitários + integração com PostgreSQL Docker e migrations novas | 135/135 passaram em 25 arquivos. |
| Limite de upload | 5 MiB aceito e 5 MiB + 1 byte rejeitado por teste unitário. |
| Assinatura S3 | PUT de 300 s, metadado vinculado, segredo ausente da URL e checksum antecipado ausente: passou. |
| TypeScript | `npm run typecheck`: passou. |
| ESLint | `npm run lint`: passou. |
| Build Next.js | `npm run build:webpack`: passou. O build Turbopack não pôde abrir o socket auxiliar no sandbox local (`Operation not permitted`); precisa ser repetido no Preview. |
| E2E Chromium | 9/9 passaram no banco Docker isolado; o cenário multiparte antes flakey também passou 3/3 repetições. |
| Auditoria de produção | `npm audit --omit=dev`: 4 alertas high em Nodemailer 8.0.11 via Auth.js; sem correção compatível automática. |

Testes ainda dependentes de acesso externo e, portanto, não foram simulados como sucesso:

- PUT e GET reais no Neon Object Storage, incluindo arquivo válido de exatamente 5 MiB, CORS e expiração das URLs;
- cold start de Function + retomada do Neon após pelo menos 6 minutos sem tráfego;
- soak de 50 minutos com sessão/jogo real e observação de cronômetros;
- OAuth/Magic Link e callback nos domínios finais;
- build Turbopack e métricas no Preview.

Com Preview autorizado:

```bash
PREVIEW_BASE_URL=https://preview.example.org npm run preview:verify
PREVIEW_BASE_URL=https://preview.example.org npm run preview:verify -- --cold-start
PREVIEW_BASE_URL=https://preview.example.org PREVIEW_PROBE_PATHS=/api/health,/api/game-sessions/ID npm run preview:verify -- --soak
```

O modo `--cold-start` aguarda 360 segundos por padrão. O modo `--soak` dura 50 minutos e consulta a cada 30 segundos. Para o endpoint de sessão, passar `PREVIEW_COOKIE` somente pelo ambiente local. Em paralelo ao soak, manter uma tela de jogo ativa e registrar drift/pausa/retomada do cronômetro no início, aos 25 minutos e ao final.

## Checklist de Preview e deploy

- [ ] Uso do Vercel Hobby confirmado como pessoal/não comercial.
- [ ] Conta permanece Hobby, sem trial, cartão ou cobrança por excedente.
- [ ] Backup lógico criado e restauração ensaiada.
- [ ] `DATABASE_URL` de Production é exatamente a atual, pooled e em São Paulo.
- [ ] Preview usa branch de banco separada.
- [ ] Projeto de Object Storage é Free, separado e em `aws-us-east-1`.
- [ ] Bucket é privado; Preview e Production usam branches/credenciais diferentes.
- [ ] CORS contém somente os dois domínios aprovados; CSP contém somente a origem S3 necessária em `connect-src`.
- [ ] `STORAGE_DRIVER=s3`; nenhuma credencial S3 aparece em HTML, JS, logs ou respostas.
- [ ] `DEV_AUTH_ENABLED=false`; Auth.js e sessões existentes foram exercitados.
- [ ] Migrations foram aplicadas primeiro no Preview e as contagens conferidas.
- [ ] Inventário anterior, dry-run, cópia, inventário posterior e amostragem concluídos; origem preservada.
- [ ] Upload de 5 MiB e rejeição de 5 MiB + 1 byte confirmados no bucket real.
- [ ] URLs PUT/GET expiram e não são persistidas no banco.
- [ ] Encerrar sessão remove temporários; cron pode ser repetido sem erro e recusa segredo incorreto.
- [ ] Suíte unitária/integração/E2E, build Turbopack, cold start e soak de 50 minutos passaram no Preview.
- [ ] Uso de banco, Object Storage, CPU/memória, invocações, erros 4xx/5xx, p95 e logs estão abaixo de 70% das franquias.
- [ ] Riscos de Nodemailer resolvidos ou Magic Link comprovadamente desabilitado com Google OAuth validado.
- [ ] Autorização explícita para Production registrada.

## Métricas mínimas

Revisar semanalmente no Vercel: invocações, CPU ativa, memória provisionada, duração, falhas, transferência, builds e retenção de logs. Revisar no Neon: tamanho do banco, CU-h, conexões, suspensões/retomadas, tamanho do bucket e erros S3. Alertar operacionalmente em 70%, congelar novos uploads em 85% e nunca habilitar overage/upgrade automático.

Registrar no app/monitoramento, sem segredos ou URLs assinadas: contagem de autorização/finalização, falha de HEAD, divergência de tamanho/MIME/assinatura, pendências expiradas, temporários removidos e duração/resultado do cron.

## Riscos residuais

1. **Elegibilidade Vercel Hobby:** é gate de go/no-go. Se o uso for institucional/comercial, não há deploy compatível com a arquitetura decidida e a regra de custo zero.
2. **Nodemailer/Auth.js:** a versão compatível com `next-auth@5.0.0-beta.32` é afetada por advisories high; `npm audit` não oferece correção compatível. Deixar todas as variáveis `EMAIL_*` vazias desabilita Magic Link. Se ele for obrigatório, atualizar Auth.js/Nodemailer em mudança separada e repetir toda a autenticação antes de produção.
3. **Capacidade:** o Free pode pausar ao exceder limites. Não existe overage gratuito; acompanhar crescimento e impedir uploads antes de 5 GB.
4. **Latência:** Functions/banco ficam em São Paulo e objetos em US East; upload/leitura podem ter maior latência, deliberadamente sem mover o banco.
5. **URLs externas:** podem expirar, rastrear usuários ou mudar conteúdo. O servidor evita SSRF porque não faz fetch, mas disponibilidade e privacidade do host externo continuam fora do controle do EduParque.
6. **Cron Hobby:** execução diária tem precisão horária e não substitui exclusão síncrona no encerramento.
7. **Validação externa pendente:** Object Storage, cold start e soak só podem ser aprovados com credenciais/Preview reais.

## Rollback

Rollback da aplicação:

1. impedir novos uploads;
2. promover o deployment Vercel anterior;
3. restaurar as variáveis do storage anterior, sem alterar a `DATABASE_URL`;
4. verificar login, sessões, leitura das mídias e jogos;
5. manter os objetos dos dois storages até reconciliação.

As migrations são aditivas e o app anterior ignora as novas colunas/tabela. O rollback preferido é reverter primeiro a aplicação e manter o schema. Não remover `media_upload_status`, colunas ou `temporary_team_images` enquanto houver uploads `pending`, referências novas ou temporários. Uma remoção posterior exige backup, consulta de dependências e migration reversa separada.

Como a migração preserva `objectKey` e não apaga a origem, reverter a configuração para o provider antigo recupera a leitura sem reescrever metadados. Se alguma validação de contagem, tamanho, MIME ou amostra falhar, interromper o processo; não apagar nem promover.

## Arquivos modificados

Infraestrutura e configuração:

```text
.dockerignore
.env.example
.gitignore
.nvmrc
eslint.config.mjs
next.config.ts
package.json
package-lock.json
playwright.config.ts
vercel.json
```

Banco e scripts:

```text
drizzle/0004_flawless_wrecker.sql
drizzle/0005_fluffy_the_spike.sql
drizzle/meta/0004_snapshot.json
drizzle/meta/0005_snapshot.json
drizzle/meta/_journal.json
scripts/media-inventory.ts
scripts/migrate-media-to-s3.ts
scripts/verify-preview.ts
src/shared/infrastructure/config/env.ts
src/shared/infrastructure/database/client.ts
src/shared/infrastructure/database/schema.ts
```

Mídia, editor e storage:

```text
src/app/api/media/route.ts
src/app/api/media/[id]/route.ts
src/app/api/media/[id]/complete/route.ts
src/app/globals.css
src/modules/activities/ui/content-visual-editor.tsx
src/modules/game-templates/ui/content-media.tsx
src/modules/media/application/media-service.ts
src/modules/media/domain/media-validation.ts
src/modules/media/domain/media-validation.test.ts
src/modules/media/domain/storage-provider.ts
src/modules/media/infrastructure/local-storage-provider.ts
src/modules/media/infrastructure/s3-compatible-storage-provider.ts
src/modules/media/infrastructure/s3-compatible-storage-provider.test.ts
src/shared/domain/content-blocks.ts
src/shared/domain/content-blocks.test.ts
```

Temporários, limpeza e E2E:

```text
src/app/api/cron/cleanup-media/route.ts
src/app/api/game-sessions/[id]/team-images/[teamId]/route.ts
src/modules/game-sessions/application/game-session-service.ts
src/modules/game-sessions/infrastructure/temporary-team-image-store.ts
src/modules/game-sessions/infrastructure/temporary-team-image-store.test.ts
src/modules/game-sessions/ui/start-session-panel.tsx
e2e/task-04.spec.ts
docs/VERCEL_FREE_MIGRATION.md
```

`todo.md` já continha alterações do usuário e não faz parte desta migração nem de seus commits.
