# Ambientes e segredos de deploy

Este documento define onde cada configuração do EduParque deve existir. Valores reais nunca devem ser adicionados ao Git.

## Desenvolvimento local

- Arquivo local: `.env`, ignorado pelo Git.
- Modelo versionado: `.env.example`.
- Banco padrão: PostgreSQL do `docker-compose.yml` em `localhost:5432`.
- `DEV_AUTH_ENABLED=true` é permitido somente neste ambiente.
- Storage atual: `STORAGE_DRIVER=local`, com arquivos em `./storage`.

Para recriar o ambiente local, copie `.env.example` para `.env` e substitua somente os valores fictícios necessários. Não reutilize segredos de preview ou produção.

## Preview Cloudflare

- Configurações públicas e nomes de bindings ficarão no ambiente `preview` do `wrangler.jsonc`.
- `DATABASE_URL`, `AUTH_SECRET` e `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` devem ser cadastrados como segredos do Wrangler, nunca em arquivo versionado.
- Use banco/branch Neon e segredos diferentes dos usados em produção.
- `AUTH_TRUST_HOST=true` e `DEV_AUTH_ENABLED=false`.
- O driver de storage PostgreSQL será habilitado após a etapa 5 do plano.

## Produção Cloudflare

- Configurações públicas e nomes de bindings ficarão no ambiente de produção do `wrangler.jsonc`.
- `DATABASE_URL`, `AUTH_SECRET` e `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` devem ser cadastrados como segredos do Wrangler.
- Use credenciais exclusivas de produção; não reutilize as de preview ou desenvolvimento.
- `AUTH_TRUST_HOST=true` e `DEV_AUTH_ENABLED=false`.
- Providers Google e Nodemailer permanecem desabilitados nesta primeira versão.

## Inventário de variáveis

| Variável | Sensível | Desenvolvimento | Preview/produção |
| --- | --- | --- | --- |
| `DATABASE_URL` | Sim | PostgreSQL local | Segredo Wrangler; Neon/Hyperdrive |
| `AUTH_SECRET` | Sim | Valor local aleatório | Segredo Wrangler exclusivo por ambiente |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | Sim | Base64 de 32 bytes | Segredo Wrangler estável e exclusivo por ambiente |
| `AUTH_TRUST_HOST` | Não | `true` | `true` |
| `DEV_AUTH_ENABLED` | Não | `true` | Sempre `false` |
| `STORAGE_DRIVER` | Não | `local` | `postgres` após implementação da etapa 5 |
| `LOCAL_STORAGE_PATH` | Não | `./storage` | Não usado no Worker |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Sim em parte | Opcionais | Não usados no protótipo |
| `EMAIL_SERVER_*` / `EMAIL_FROM` | Sim em parte | Opcionais | Não usados no protótipo |
| `S3_*` | Sim em parte | Somente se o driver local for trocado | Não usados no protótipo |

## Regras operacionais

1. Guarde a URL do Neon e os segredos de autenticação no gerenciador de senhas.
2. Use um conjunto diferente de segredos em cada ambiente.
3. Nunca coloque valores reais em `.env.example`, `wrangler.jsonc`, documentação, issues ou mensagens de commit.
4. Antes de cada commit, revise `git diff --cached` e confirme que nenhum segredo foi incluído.
5. Backups locais devem ficar em `backups/`, que é ignorado pelo Git, e também em armazenamento externo seguro quando forem importantes.
