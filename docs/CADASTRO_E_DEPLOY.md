# Cadastro por convite e deploy

Este documento descreve como preparar o banco, criar e revogar convites e publicar o EduParque na Vercel. Para decisões de infraestrutura, limites do plano gratuito, storage e checklist completo, consulte também [VERCEL_FREE_MIGRATION.md](./VERCEL_FREE_MIGRATION.md).

## Status atual

Auditoria realizada em **23/10/2026**:

- a feature está commitada e enviada para `origin/migration/vercel-free` no commit `a77796e`;
- o diretório local está vinculado ao projeto Vercel `caio-dev4/eduparque`;
- existem dois deployments `Preview` com estado `Ready`;
- nenhum desses Previews contém `/register`: a inspeção dos artefatos mostra `/login` e `/api/health`, mas não `register`, e a rota responde 404;
- não há deployment `Production` listado.

Portanto, **o cadastro por convite ainda não está deployado**. Consulte novamente o estado antes de operar:

```bash
git status --short
git log -1 --oneline
vercel ls eduparque --yes
```

## Pré-requisitos e segurança

1. Use Node.js 22 e instale as dependências com `npm ci`.
2. Confirme a autenticação da CLI com `vercel whoami`.
3. Confirme o vínculo em `.vercel/project.json`; se estiver ausente, execute `vercel link` e selecione o projeto correto.
4. Confirme a elegibilidade do plano Vercel descrita no runbook de migração antes de qualquer produção.
5. Preview e Production devem usar bancos e storages separados. Nunca aplique uma migration de teste no banco de produção.
6. Faça backup do banco antes de aplicar migrations em Production.
7. Arquivos `.env*.local` contêm segredos e já estão ignorados pelo Git. Nunca os versione nem cole seus valores em tickets ou logs.

As variáveis obrigatórias de cada ambiente estão listadas em [VERCEL_FREE_MIGRATION.md](./VERCEL_FREE_MIGRATION.md#variáveis-necessárias). Para o cadastro, a variável decisiva é `DATABASE_URL`, que precisa apontar para o banco correto e já migrado.

## Desenvolvimento local

Suba o PostgreSQL, aplique as migrations e execute a aplicação:

```bash
docker compose up -d postgres
npm ci
npm run db:migrate
npm run dev
```

O cadastro fica disponível somente por um link de convite. Acessar `/register` sem um convite válido mostra o estado de erro esperado.

## Administração de contas e convites

Os comandos abaixo usam a `DATABASE_URL` do arquivo `.env`. A senha dos comandos `create` e `reset` é solicitada de forma oculta.

### Gerar convite

```bash
npm run auth:user -- invite \
  --email professor@example.com \
  --base-url http://localhost:3000
```

O comando mostra:

- o UUID do convite, usado para revogação;
- a validade de sete dias;
- o link completo, exibido apenas naquele momento.

O convite é vinculado ao e-mail, tem uso único e guarda somente o hash do segredo no banco. Entregue o link por um canal privado. Se ele for perdido ou exposto, revogue-o e gere outro.

### Revogar convite

```bash
npm run auth:user -- revoke-invite --id <uuid-do-convite>
```

Somente convites ainda não utilizados podem ser revogados.

### Criar conta diretamente

```bash
npm run auth:user -- create \
  --name "Professor" \
  --email professor@example.com \
  --username professor \
  --role USER
```

Use `--role ADMIN` somente quando a pessoa realmente precisar do painel administrativo.

### Redefinir senha

```bash
npm run auth:user -- reset --identifier professor@example.com
```

A redefinição limpa bloqueios e invalida sessões emitidas anteriormente.

## Deploy de Preview

### 1. Validar o código que será publicado

```bash
git status --short
git rev-parse HEAD
npm run lint
npm run typecheck
npm test
RUN_DB_TESTS=1 npm test
npm run build
```

O worktree deve estar limpo e o SHA deve ser o commit que você pretende validar.

### 2. Baixar as variáveis do Preview

```bash
vercel env pull .env.preview.local \
  --environment=preview \
  --git-branch=migration/vercel-free \
  --yes
```

Confira no painel da Vercel e do Neon que `DATABASE_URL` pertence à branch de Preview. Não imprima o arquivo no terminal.

### 3. Aplicar a migration no banco de Preview

A migration `0007_harsh_human_fly.sql` cria `registration_invites`. Ela precisa ser aplicada antes de testar `/register`:

```bash
node --env-file=.env.preview.local \
  --import tsx \
  src/shared/infrastructure/database/migrate.ts
```

As migrations desta entrega são aditivas. Ainda assim, confira o banco correto antes de executar o comando.

### 4. Criar o deployment

```bash
vercel deploy --environment=preview --verify
```

A CLI imprime a URL imutável do deployment. Guarde-a em uma variável apenas para os comandos seguintes:

```bash
EDUPARQUE_PREVIEW_URL=https://eduparque-xxxxxxxx-caio-dev4.vercel.app
vercel inspect "$EDUPARQUE_PREVIEW_URL" --wait
```

Se o projeto estiver conectado ao GitHub, um `git push origin migration/vercel-free` também pode criar o Preview automaticamente. Mesmo nesse caso, confirme com `vercel ls`; um push não deve ser tratado como prova de deploy.

### 5. Verificar o Preview

```bash
vercel curl /api/health --deployment "$EDUPARQUE_PREVIEW_URL"
vercel curl /register --deployment "$EDUPARQUE_PREVIEW_URL"
PREVIEW_BASE_URL="$EDUPARQUE_PREVIEW_URL" npm run preview:verify
```

O primeiro comando deve retornar `{"status":"ok"}`. `/register` deve retornar a página de convite inválido, e não 404 ou 500. A CLI `vercel curl` autentica a requisição quando o Preview está protegido.

Gere então um convite no banco de Preview usando a URL do deployment:

```bash
node --env-file=.env.preview.local \
  --conditions react-server \
  --import tsx \
  scripts/manage-auth-user.ts invite \
  --email professor@example.com \
  --base-url "$EDUPARQUE_PREVIEW_URL"
```

Abra o link e confirme:

1. e-mail preenchido e não editável;
2. validações de nome, usuário, senha e confirmação;
3. criação da conta;
4. redirecionamento para `/my-activities` com sessão válida;
5. recusa ao tentar reutilizar o mesmo convite.

Um Preview protegido pela Vercel exige que o destinatário tenha acesso ao projeto ou um bypass autorizado. Não use esse link como convite público.

## Deploy de Production

Production exige autorização explícita e todos os gates do Preview aprovados.

### 1. Baixar e conferir as variáveis de Production

```bash
vercel env pull .env.production.local \
  --environment=production \
  --yes
```

Confirme que `DATABASE_URL` é o endpoint pooled de Production e que storage, `AUTH_SECRET`, `CRON_SECRET` e `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` são os valores de Production. Faça o backup do banco antes de continuar.

### 2. Aplicar migrations em Production

```bash
node --env-file=.env.production.local \
  --import tsx \
  src/shared/infrastructure/database/migrate.ts
```

### 3. Publicar

```bash
vercel deploy --prod --verify
```

Prefira um novo deploy de Production em vez de promover um Preview quando os ambientes usam variáveis diferentes: o deployment de Preview foi construído com a configuração de Preview.

### 4. Verificar e emitir o primeiro convite

```bash
vercel ls eduparque --yes
vercel curl /api/health --deployment https://<dominio-producao>
vercel curl /register --deployment https://<dominio-producao>
```

Depois da verificação, gere o convite com a URL pública definitiva:

```bash
node --env-file=.env.production.local \
  --conditions react-server \
  --import tsx \
  scripts/manage-auth-user.ts invite \
  --email professor@example.com \
  --base-url https://<dominio-producao>
```

Não use a URL imutável de Preview em convites de Production.

## Rollback

Se o deployment novo falhar, identifique o deployment de Production anterior e reverta o tráfego:

```bash
vercel ls eduparque --yes
vercel rollback https://<deployment-anterior>.vercel.app --yes
vercel rollback status eduparque
```

Em seguida, valide `/api/health`, login, atividades e mídias.

Não remova imediatamente a tabela `registration_invites`. A migration é aditiva e versões anteriores da aplicação ignoram essa tabela. Excluir schema durante uma emergência aumenta o risco e exige uma migration reversa separada, backup e análise de dependências.

## Diagnóstico rápido

| Sintoma | Verificação |
|---|---|
| `/register` retorna 404 | O deployment não contém a feature; confira o SHA e publique novamente. |
| `/register` retorna 500 para um token bem formatado | A migration `0007` provavelmente não foi aplicada no banco daquele ambiente. |
| Convite sempre aparece inválido | Confira ambiente do banco, validade, revogação, uso anterior e e-mail vinculado. |
| Conta é criada, mas não entra automaticamente | Teste `/login`, confira `AUTH_SECRET`, host confiável e logs do Auth.js. |
| CLI altera o ambiente errado | Pare e confira qual arquivo foi passado a `--env-file` e a origem de `DATABASE_URL`. |
| Preview responde 302 para autenticação Vercel | Use `vercel curl` ou obtenha acesso/bypass aprovado para o navegador. |

## Checklist final

- [ ] Worktree limpo e SHA conferido.
- [ ] Variáveis do ambiente correto baixadas sem exposição de segredos.
- [ ] Backup criado antes de Production.
- [ ] Migration `0007` aplicada primeiro no Preview e depois em Production.
- [ ] `/api/health` retorna 200.
- [ ] `/register` existe e não retorna 404/500.
- [ ] Convite válido cadastra e autentica.
- [ ] Convites usados, expirados, revogados ou adulterados são recusados.
- [ ] Deployment anterior identificado para rollback.
