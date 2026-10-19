# EduParque

MVP provider-agnostic para criar, publicar e conduzir atividades educacionais. Conteúdo, apresentação, regras e aparência são modelados separadamente; uma Activity pode ter várias Presentations e cada publicação gera uma revisão imutável.

## Arquitetura

- Next.js 16 (App Router) e React 19, com TypeScript strict e Tailwind.
- PostgreSQL e Drizzle ORM para entidades consultáveis; conteúdo, configuração e snapshots validados com Zod em JSONB.
- Auth.js com login administrativo por e-mail ou usuário e senha.
- Storage por contrato, com implementações PostgreSQL, local e S3-compatible.
- Um único GameSession/SessionShell para equipes, placar, timer, undo e persistência; os seis templates mantêm apenas sua mecânica própria.

O contrato de produção é: container Node + PostgreSQL + storage S3-compatible + OAuth e/ou SMTP. O código não depende de um provedor de nuvem específico.

## Desenvolvimento local

Requisitos: Node.js 22.12+, npm e Docker com Compose.

```bash
cp .env.example .env
docker compose up -d postgres
npm ci
npm run db:migrate
npm run db:seed
npm run dev
```

A aplicação fica em `http://localhost:3000`; a saúde do processo e do banco pode ser verificada em `GET /api/health`. O seed é idempotente e cria três SystemThemes, um proprietário técnico sem senha e a Activity pública “Desafio EduParque” com seis Presentations. Crie uma conta administrativa separada com o comando documentado abaixo para acessar `/admin/users` e `/admin/activities`.

## Autenticação e storage

Não há cadastro público, OAuth, link por e-mail ou senha fixa de desenvolvimento. Para criar a primeira conta, use um terminal interativo; a senha é solicitada duas vezes sem aparecer na tela nem no histórico:

```bash
npm run auth:user -- create --name "Professor" --email professor@example.com --username professor --role ADMIN
```

Para redefinir uma senha e invalidar as sessões anteriores:

```bash
npm run auth:user -- reset --identifier professor@example.com
```

A senha deve ter pelo menos 14 caracteres e no máximo 72 bytes. Cinco falhas dentro de 15 minutos bloqueiam temporariamente a conta e o identificador por 15 minutos.

`STORAGE_DRIVER=local` grava sob `LOCAL_STORAGE_PATH`; `postgres` mantém os bytes no PostgreSQL e é o driver do protótipo na Cloudflare. Uploads exigem autenticação e ownership, conferem o MIME declarado contra os bytes e aceitam JPEG/PNG/WebP/GIF ou MP3/Ogg/WAV/M4A/FLAC até 5 MB. O storage PostgreSQL aplica uma cota total de 250 MiB.

Visitantes anônimos podem abrir e controlar uma partida pública ou não listada. O controle é protegido por um token aleatório em cookie HttpOnly, vinculado apenas àquela sessão; URLs compartilhadas não concedem controle. Activities privadas continuam restritas ao dono e a administradores.

## Qualidade

```bash
npm run lint
npm run typecheck
npm test
RUN_DB_TESTS=1 npm test
npm run build
npm run test:e2e
```

Os testes com `RUN_DB_TESTS=1` requerem PostgreSQL migrado. A suíte cobre schemas, adapters, templates, reducer/scoring/undo, permissões, revisão/remix e persistência. O Playwright cobre também o fluxo principal e gameplay anônimo.

## Docker e deploy

Para validar o ambiente completo localmente:

```bash
cp .env.example .env
# Troque AUTH_SECRET antes de qualquer ambiente compartilhado.
docker compose up --build -d
docker compose run --rm migrate npm run db:seed
docker compose ps
```

O Dockerfile possui targets separados para migrations e runtime standalone. Em outro orquestrador, execute o target `migration` como job antes de iniciar o target `runner`, monte storage persistente apenas se usar o driver local e configure healthcheck em `/api/health`. Para múltiplas réplicas, forneça o mesmo `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` no build e use storage/cache compartilhados conforme a infraestrutura escolhida.

Nunca reutilize os valores de exemplo em produção. Injete segredos pelo mecanismo do provedor e mantenha `.env` fora da imagem e do controle de versão.

## Segurança conhecida

Consulte [SECURITY.md](./SECURITY.md) para o modelo de autorização, autenticação, cabeçalhos e uploads.
# EduParque
