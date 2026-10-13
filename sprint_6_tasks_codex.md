**Sprint de Execucao - MVP**

6 tasks para delegacao ao Codex com reasoning recomendado

|     |
|-----|

**Status: pronto para execucao sequencial**

Versao 1.0 \| 5 de outubro de 2026

# 1. Estrategia do sprint

O sprint foi intencionalmente limitado a seis tasks. O objetivo e
reduzir o reasoning necessario sem fragmentar demais o projeto. A
TASK-03 concentra o maior risco arquitetural e deve usar High. As demais
podem ser executadas em Medium; se o Game Engine estiver estavel, partes
mecanicas das TASK-04 e TASK-05 podem ser tentadas em Low, mas Medium e
a recomendacao padrao.

| **Task** | **Escopo**                                   | **Reasoning** |
|----------|----------------------------------------------|---------------|
| TASK-01  | Fundacao, dominio, Auth e Storage            | MEDIUM        |
| TASK-02  | Activity, Presentations, Editor e Biblioteca | MEDIUM        |
| TASK-03  | Game Engine + SessionShell                   | HIGH          |
| TASK-04  | Quiz + Matching + Random Wheel               | MEDIUM        |
| TASK-05  | Group Sort + Unscramble + Team Grid          | MEDIUM        |
| TASK-06  | Testes, Admin, seguranca e Deploy            | MEDIUM        |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>Ordem obrigatoria</strong></p>
<p>TASK-01 -&gt; TASK-02 -&gt; TASK-03 -&gt; TASK-04 -&gt; TASK-05 -&gt;
TASK-06</p>
<p>Nao iniciar templates antes de estabilizar o Game Engine e o
SessionShell.</p>
<p>Cada task deve terminar com build, lint, typecheck e testes
relevantes passando.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# **TASK-01 - Fundacao, dominio, Auth e Storage**

**Status de execucao: CONCLUIDA em 5 de outubro de 2026.**

| **Reasoning** | **MEDIUM** |
|---------------|------------|

**Objetivo:** Entregar a infraestrutura e os contratos que todo o
restante do sistema utilizara.

## Escopo

- Inicializar Next.js com TypeScript strict, Tailwind, shadcn/ui,
  Drizzle ORM, Zod, Vitest e Playwright.

- Preparar estrutura modular por feature, com separacao interna de
  domain, application, infrastructure e ui quando aplicavel.

- Configurar PostgreSQL local, Drizzle migrations, .env.example e Docker
  Compose de desenvolvimento.

- Criar entidades-base: User, Activity, ActivityRevision, Presentation,
  Theme, MediaAsset, Favorite, GameSession e SessionEvent.

- Criar ContentBlocks: PromptAnswerBlock, PairBlock, ItemListBlock,
  CategorizedItemBlock e SequenceBlock como discriminated unions Zod.

- Implementar Auth.js com Google OAuth e Magic Link configuravel por
  SMTP.

- Criar roles USER e ADMIN e helpers requireUser(), requireOwner() e
  requireAdmin().

- Criar StorageProvider com LocalStorageProvider e
  S3CompatibleStorageProvider.

- Permitir apenas upload de imagem e audio, com validacao de MIME,
  tamanho e ownership.

- Preparar estrutura de i18n com pt-BR inicial.

## Estrutura esperada

src/

\|- app/

\|- modules/

\| \|- auth/

\| \|- activities/

\| \|- presentations/

\| \|- themes/

\| \|- media/

\| \`- game-templates/

\`- shared/

## Critérios de aceite

- Projeto sobe localmente com banco limpo.

- Migrations executam sem erro.

- Login Google e fluxo de Magic Link estao integrados/configuraveis.

- Usuario autenticado e usuario anonimo sao distinguidos corretamente.

- Uploads de imagem/audio funcionam via abstracao de storage.

- Schemas Zod dos ContentBlocks possuem testes.

- npm run lint, npm run typecheck e testes relevantes passam.

**Fora do escopo:** UI completa de Activity, gameplay, biblioteca
publica e templates jogaveis.

**Dependencias:** Nenhuma.

# **TASK-02 - Activity, Presentations, Editor e Biblioteca**

**Status de execucao: CONCLUIDA em 5 de outubro de 2026.**

Implementacao validada com lint, typecheck, testes unitarios, teste de
integracao PostgreSQL do lifecycle completo, build de producao e smoke
E2E. O gameplay permanece representado pelo contrato de preview, conforme
o escopo desta task.

**Aprimoramento de UX em 6 de outubro de 2026:** o JSON foi removido do
fluxo principal e substituido por editor visual para os cinco tipos de
ContentBlock, com drafts incompletos autosalvaveis, validacao antes da
publicacao, anexos de imagem/audio, colagem em lote, duplicacao,
reordenacao e conversoes seguras. A inspecao JSON ficou restrita ao modo
de desenvolvimento.

| **Reasoning** | **MEDIUM** |
|---------------|------------|

**Objetivo:** Entregar todo o produto fora do gameplay: criar, editar,
publicar, compartilhar, favoritar e remixar.

## Escopo

- Implementar lifecycle: Create Activity, Edit Draft, Autosave, Publish,
  Unpublish, Delete e Remix.

- Separar Draft mutavel de PublishedRevision imutavel.

- Publish cria snapshot suficiente para preservar conteudo,
  Presentations, configs e temas publicados.

- Activity pode ter varias Presentations e uma Presentation padrao.

- Remix copia conteudo, Presentations, configs e tema e preserva
  remixedFromActivityId/remixedFromRevision.

- Criar Template Registry com quiz, matching, wheel, group-sort,
  unscramble e team-grid.

- Criar GameTemplateDefinition com key, name, supportedContentTypes,
  configSchema e defaultConfig.

- Criar ContentAdapterRegistry para conversoes deterministicas e
  seguras; sem IA.

- Construir editor com abas CONTEUDO, JOGO e APARENCIA.

- Autosave com debounce e estados Nao salvo, Salvando, Salvo e Erro.

- Criar SystemTheme, UserTheme e ActivityThemeOverride.

- Permitir cores, gradiente, background, imagem, fontes predefinidas,
  border radius, cards, botoes, intensidade de animacao e sons.

- Criar GameRenderer(mode="preview") como contrato de preview; pode usar
  placeholders ate a TASK-04.

- Implementar visibilidade private, unlisted e public.

- Criar biblioteca publica com busca por titulo, descricao e tags,
  favoritos e pagina /activity/\[slug\].

- Visitante anonimo pode visualizar Activity publica e alternar entre
  Presentations publicadas.

## Critérios de aceite

- Usuario cria Activity, edita e reabre sem perder o draft.

- Publicar gera revision imutavel; editar o draft depois nao altera a
  versao publicada.

- Activity suporta varias Presentations e defaultPresentation.

- Outro usuario consegue remixar e editar sua copia sem alterar o
  original.

- Biblioteca lista somente Activities publicas.

- Favoritos e busca funcionam.

- Activity privada nao e acessivel publicamente.

- Editor e preview estao integrados ao contrato de GameRenderer.

**Fora do escopo:** Gameplay real, WebSockets, IA, comentarios, likes,
seguidores e analytics avancado.

**Dependencias:** TASK-01 concluida.

# **TASK-03 - Game Engine + SessionShell**

**Status de execucao: CONCLUIDA em 5 de outubro de 2026.**

Engine validada com reducer puro, comandos e eventos transacionais,
restauracao por snapshot persistido, undo limitado, timer padrao e
timer-bomba, SessionShell e template mock. A migration desacopla a
sessao da Presentation mutavel e preserva a referencia a revisao
publicada imutavel.

| **Reasoning** | **HIGH** |
|---------------|----------|

**Objetivo:** Construir uma unica engine capaz de executar todos os
templates sem duplicar equipes, score, timer, undo ou persistencia.

## Escopo

- Criar GameSession, SessionState, SessionCommand, SessionEvent e
  GameSessionService.

- Implementar fluxo UI -\> Command -\> GameSessionService -\> Reducer
  -\> State -\> SessionEvent -\> Persistence.

- Criar commands compartilhados: startSession, next, reveal,
  awardPoints, removePoints, pause, resume, undo e finish.

- Persistir estado relevante e restaurar sessao apos refresh.

- Suportar 1 a 8 equipes com nome, cor, score e turno.

- Implementar pontuacao automatica sugerida pelo template e ajuste
  manual do professor.

- Criar timer opcional: desativado, por item, por questao ou por
  partida.

- Implementar timer-bomba com pavio, contagem regressiva, tensao
  progressiva, som opcional e explosao ao zerar.

- Respeitar prefers-reduced-motion e sound disabled.

- Criar GameSessionShell responsavel por equipes, turnos, pontuacao,
  timer, progresso, pause, undo e finalizacao.

- Templates nao podem reimplementar capacidades do SessionShell.

- Implementar mock template para validar o motor antes dos jogos reais.

## Contrato arquitetural

UI

\|

v

SessionCommand

\|

v

GameSessionService

\|

v

Reducer -\> SessionState

\|

v

SessionEvent -\> Persistence

## Critérios de aceite

- Sessao mock consegue iniciar, pontuar, avancar, revelar, pausar,
  desfazer e finalizar.

- Refresh recupera placar, equipes, etapa e estado do template mock.

- Undo reverte a ultima acao relevante.

- Timer-bomba funciona com e sem som e com reduced-motion.

- Nao existem condicionais especificas de quiz/matching/etc. espalhadas
  pelo core.

- Motor possui testes unitarios de reducers, scoring, undo e restore.

**Fora do escopo:** Templates reais, WebSockets, multiplayer remoto e
Event Sourcing completo.

**Dependencias:** TASK-01 e TASK-02 concluidas.

# **TASK-04 - Quiz + Matching + Random Wheel**

**Status de execucao: CONCLUIDA em 6 de outubro de 2026.**

Quiz, Matching (connect e memory) e Random Wheel foram integrados ao
GameRenderer e ao SessionShell compartilhados. Estado especifico,
pontuacao automatica, avancos e reinicio de timer sao persistidos por um
unico comando transacional, permitindo undo atomico da jogada. Preview e
sessao usam os mesmos renderers; configuracoes especificas estao expostas
no editor. A implementacao foi validada com lint, typecheck, testes
unitarios e de integracao PostgreSQL, build de producao e E2E dos tres
templates em uma unica Activity.

| **Reasoning** | **MEDIUM** |
|---------------|------------|

**Objetivo:** Implementar os tres primeiros templates sobre os contratos
da TASK-03, sem duplicar infraestrutura transversal.

## Quiz

- Uma ou multiplas respostas corretas.

- Texto, imagem e audio opcionais.

- Shuffle de perguntas e respostas.

- Timer por questao quando configurado.

- Pontuacao automatica sugerida e Reveal.

## Matching

- Usar PairBlock.

- Modo connect.

- Modo memory.

- Feedback de acerto/erro integrado ao SessionShell.

## Random Wheel

- Usar ItemListBlock.

- Item simples ou item enriquecido com prompt e resposta opcional.

- removeAfterSpin, allowRepeat e timerAfterSpin.

- Animacao da roleta deve respeitar reduced-motion.

## Regra arquitetural

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>Nao duplicar</strong></p>
<p>Nenhum template implementa seu proprio sistema de equipes, score,
timer, undo ou persistencia.</p>
<p>Todos usam o GameSessionShell e os commands da TASK-03.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## Critérios de aceite

- Os tres templates sao jogaveis do inicio ao fim.

- Uma unica Activity pode ter Quiz, Matching e Wheel como Presentations
  diferentes quando o conteudo for compativel.

- Preview e session usam o mesmo renderer de cada template.

- Refresh, score manual, undo e timer continuam funcionando sem
  implementacoes paralelas.

**Dependencias:** TASK-03 concluida e estavel.

# **TASK-05 - Group Sort + Unscramble + Team Grid**

**Status de execucao: CONCLUIDA em 6 de outubro de 2026.**

Implementacao validada nos modos board e oneByOne do Group Sort, por
caracteres e tokens do Unscramble e no fluxo completo do Team Grid com
1 a 8 equipes, timer-bomba, Reveal, pontuacao, troca de turno,
persistencia e undo compartilhados pelo SessionShell. Lint, typecheck,
testes unitarios, E2E completo e build de producao passaram.

| **Reasoning** | **MEDIUM** |
|---------------|------------|

**Objetivo:** Completar os seis templates do MVP reutilizando o Game
Engine e o SessionShell existentes.

## Group Sort

- Usar CategorizedItemBlock.

- Modo board com drag-and-drop.

- Modo oneByOne com escolha de categoria e feedback.

## Unscramble

- Usar SequenceBlock.

- Modo character para letras.

- Modo token para palavras/segmentos.

- Check, feedback e Reveal.

## Team Grid

- Grid de cards numerados.

- Fluxo: turno -\> escolher card -\> pergunta -\> timer-bomba -\>
  resposta -\> correto/incorreto/reveal -\> pontos -\> proximo time.

- Somente GridCard.type="question" no MVP.

- Modelar o tipo para permitir "effect" no futuro, sem implementar
  power-ups agora.

## Critérios de aceite

- Os tres templates funcionam integralmente dentro do SessionShell.

- Group Sort suporta ambos os modos.

- Unscramble suporta caracteres e tokens.

- Team Grid suporta 1 a 8 equipes, pontuacao, timer-bomba e Reveal.

- Nenhum template duplica score, timer, undo ou persistencia.

**Dependencias:** TASK-03 concluida; pode ser executada depois ou em
paralelo controlado com a TASK-04 se os contratos estiverem congelados.

# **TASK-06 - Testes, Admin, seguranca e Deploy**

**Status de execucao: CONCLUIDA em 6 de outubro de 2026.**

Painel administrativo, hardening de ownership/uploads/revisoes, partidas
anonimas protegidas por token, acessibilidade, seed com seis Presentations,
healthcheck e deploy Docker provider-agnostic implementados. Validacao final
com lint, typecheck, 44 testes unitarios/integracao PostgreSQL, build de
producao, 6 E2Es e smoke test do container standalone.

| **Reasoning** | **MEDIUM** |
|---------------|------------|

**Objetivo:** Transformar a implementacao funcional em um MVP seguro,
reproduzivel, testado e implantavel em infraestrutura
gratuita/provider-agnostic.

## Admin

- Criar /admin/users e /admin/activities.

- Permitir busca, ocultacao/remocao de Activity e acoes basicas de
  usuario.

- Sem dashboard analitico avancado.

## Hardening

- Revisar ownership em edit, delete, publish, media e remix.

- Proteger recursos private/unlisted conforme politica definida.

- Validar MIME, tamanho e autorizacao de uploads.

- Revisar e atualizar a cadeia Auth.js/Nodemailer identificada na
  TASK-01: eliminar advisories de seguranca quando houver versoes
  compativeis, ou documentar uma mitigacao/decisao tecnica caso a
  compatibilidade do provider bloqueie a atualizacao.

- Garantir imutabilidade de PublishedRevision.

- Garantir isolamento entre original e remix.

## Acessibilidade

- Keyboard navigation.

- Focus states.

- ARIA labels.

- Contraste adequado.

- prefers-reduced-motion.

- Feedback nao dependente apenas de cor.

## Testes

- Unit: ContentBlocks, ContentAdapters, template validation, reducers,
  scoring, undo, revision snapshot, remix e permissoes.

- Integration: Publish, Remix e Session persistence.

- Um E2E completo: login -\> criar Activity -\> conteudo -\>
  Presentation -\> tema -\> publicar -\> abrir publicamente -\> jogar
  -\> pontuar -\> finalizar.

## Deploy

- Finalizar Dockerfile, docker-compose.yml, .env.example, healthcheck,
  migrations, seed e README.

- Contrato de infraestrutura: Node container + PostgreSQL + storage
  S3-compatible + SMTP/OAuth.

- Nao acoplar o codigo a Oracle, Google Cloud, Vercel, Supabase, Render
  ou outro provedor.

- Escolher o provedor gratuito apenas no momento real do deploy.

## Critérios de aceite

- Ambiente limpo sobe com Docker e migrations.

- Seed cria SystemThemes e uma Activity demonstrativa com seis
  Presentations.

- Suite unit/integration passa.

- E2E principal passa.

- Nenhum segredo versionado.

- Usuario anonimo consegue completar uma partida publica.

- README descreve arquitetura, setup, variaveis e deploy
  provider-agnostic.

**Dependencias:** TASK-01 a TASK-05 concluidas.

# 2. Configuracao de reasoning recomendada

| **Task** | **Reasoning** | **Observacao**                                                              |
|----------|---------------|-----------------------------------------------------------------------------|
| 01       | MEDIUM        | Fundacao e contratos; exige coerencia, mas sem motor de jogo.               |
| 02       | MEDIUM        | Lifecycle e editor possuem dependencias, mas sao bem delimitados.           |
| 03       | HIGH          | Unica task que define o core do runtime; nao economizar reasoning.          |
| 04       | MEDIUM        | Implementa contratos ja estabilizados.                                      |
| 05       | MEDIUM        | Implementa contratos ja estabilizados; Team Grid merece atencao.            |
| 06       | MEDIUM        | Hardening e testes; subir para High somente se surgirem falhas estruturais. |

# 3. Regra de handoff entre tasks

1.  Antes de iniciar a proxima task, garantir que build, lint, typecheck
    e testes da task atual passam.

2.  Nao corrigir uma task posterior contornando um contrato ruim da
    anterior; voltar e ajustar o contrato na origem.

3.  Apos a TASK-03, tratar Game Engine e SessionShell como API interna
    estabilizada.

4.  Templates podem adicionar estado proprio, mas nao podem duplicar
    capacidades transversais.

5.  TASK-06 deve revisar regressao do produto inteiro, nao apenas
    adicionar Docker.

# 4. Resultado esperado do sprint

TASK-01 -\> TASK-02 -\> TASK-03

TASK-03 -\> TASK-04 (Quiz + Matching + Wheel)

TASK-03 -\> TASK-05 (Group Sort + Unscramble + Team Grid)

TASK-04 + TASK-05 -\> TASK-06 (Tests + Admin + Security + Deploy)
