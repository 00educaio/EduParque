# Ambientes e segredos de deploy

Este documento define onde cada configuração do EduParque deve existir. Valores reais nunca devem ser adicionados ao Git.

## Desenvolvimento local

- Arquivo local: `.env`, ignorado pelo Git.
- Modelo versionado: `.env.example`.
- Banco padrão: PostgreSQL do `docker-compose.yml` em `localhost:5432`.
- O mesmo login por credenciais da produção é usado localmente; não existe bypass de desenvolvimento.
- Storage local: `STORAGE_DRIVER=local`, com arquivos em `./storage`.

Para recriar o ambiente local, copie `.env.example` para `.env` e substitua somente os valores fictícios necessários. Não reutilize segredos de preview ou produção.

## Preview Cloudflare

- Configurações públicas e nomes de bindings ficam no bloco `previews` do `wrangler.jsonc`.
- `AUTH_SECRET` e `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` devem ser cadastrados na configuração-base de Previews, nunca em arquivo versionado.
- O banco chega exclusivamente pelo binding `HYPERDRIVE`; não envie `DATABASE_URL` ao Worker.
- O protótipo usa o mesmo Hyperdrive/Neon em Preview e produção, mas segredos de autenticação diferentes.
- `AUTH_TRUST_HOST=true`.
- O driver `STORAGE_DRIVER=postgres` é definido como variável pública do Worker.

## Produção Cloudflare

- Configurações públicas e nomes de bindings ficarão no ambiente de produção do `wrangler.jsonc`.
- `AUTH_SECRET` e `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` devem ser cadastrados como segredos do Wrangler.
- O banco chega exclusivamente pelo binding `HYPERDRIVE`; `DATABASE_URL` permanece apenas em comandos Node de administração e migrations.
- Use segredos de autenticação exclusivos de produção; não reutilize os de preview ou desenvolvimento.
- `AUTH_TRUST_HOST=true`.
- Providers externos e login por e-mail não existem nesta primeira versão.

## Inventário de variáveis

| Variável | Sensível | Desenvolvimento | Preview/produção |
| --- | --- | --- | --- |
| `DATABASE_URL` | Sim | PostgreSQL local ou Neon para comandos administrativos | Não é enviado ao Worker; substituído por Hyperdrive |
| `AUTH_SECRET` | Sim | Valor local aleatório | Segredo Wrangler exclusivo por ambiente |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | Sim | Base64 de 32 bytes | Segredo Wrangler estável e exclusivo por ambiente |
| `AUTH_TRUST_HOST` | Não | `true` | `true` |
| `STORAGE_DRIVER` | Não | `local` | `postgres` |
| `LOCAL_STORAGE_PATH` | Não | `./storage` | Não usado no Worker |
| `S3_*` | Sim em parte | Somente se o driver local for trocado | Não usados no protótipo |

## Regras operacionais

1. Guarde a URL do Neon e os segredos de autenticação no gerenciador de senhas.
2. Use um conjunto diferente de segredos em cada ambiente.
3. Nunca coloque valores reais em `.env.example`, `wrangler.jsonc`, documentação, issues ou mensagens de commit.
4. Antes de cada commit, revise `git diff --cached` e confirme que nenhum segredo foi incluído.
5. Backups locais devem ficar em `backups/`, que é ignorado pelo Git, e também em armazenamento externo seguro quando forem importantes.

## Fluxo Cloudflare

- Preview: os segredos compartilhados ficam na configuração-base de Worker Previews e `npm run cf:preview:remote` cria uma URL isolada da branch.
- Produção: `npm run cf:upload` cria uma versão sem tráfego. Use `wrangler versions secret put` para rotacionar segredos sem implantar e `wrangler versions deploy` somente após a validação.
- Evite `wrangler secret put` neste projeto: esse comando cria uma versão e a implanta imediatamente.
- Os valores remotos não ficam em arquivos do repositório. Uma rotação de `AUTH_SECRET` encerra sessões existentes; uma rotação de `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` pode invalidar Server Actions abertas em abas antigas.

**Estado em 15/10/2026:** os dois nomes de segredo estão cadastrados tanto na configuração-base de Previews quanto na versão de produção não implantada. Nenhum deployment de produção foi criado.
