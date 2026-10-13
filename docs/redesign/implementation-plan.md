# EduParque — Plano de implementação da repaginação

## 1. Objetivo

Executar uma migração visual completa e incremental, baseada em `visual-audit.md` e `design-spec.md`, preservando integralmente funcionalidades e contratos. Cada fase deve terminar funcional, revisável e validada antes do início da seguinte.

## 2. Restrições permanentes

- Não alterar APIs, payloads, schemas Zod, tabelas ou migrations.
- Não alterar autenticação, autorização, ownership, cookies ou políticas.
- Não alterar modelos, snapshots, persistência ou storage.
- Não alterar lógica de jogos, pontuação, turnos, timers, áudio, undo ou polling.
- Não substituir dados reais por mocks.
- Não remover handlers, estados ou ações para simplificar a interface.
- Não copiar fotos ou logotipos externos sem autorização.
- Preservar textos, roles e seletores usados pelos testes quando não houver uma necessidade semântica documentada.

## 3. Fases

### Fase 1 — Documentação de base

**Arquivos:**

- `docs/redesign/visual-audit.md`
- `docs/redesign/design-spec.md`
- `docs/redesign/implementation-plan.md`

**Resultado:** auditoria, decisões visuais, riscos, etapas e aceite registrados como fonte obrigatória para as fases seguintes. Nenhum arquivo funcional é modificado.

### Fase 2 — Design System e estrutura global

**Áreas principais:** `src/app/layout.tsx`, `src/app/globals.css` e `src/shared/ui/`.

**Mudanças:**

- carregar Montserrat e Source Sans 3 via `next/font` e expor variáveis tipográficas;
- centralizar tokens de cor, superfície, texto, borda, raio, spacing, sombra e motion;
- mapear tokens para Tailwind 4 e para classes estruturais existentes;
- consolidar `Button` e criar os primitives definidos em `design-spec.md`;
- criar `BrandMark`, `AppShell` e `AppHeader` responsivo;
- substituir headers duplicados preservando links e permissões reais;
- manter editor e sessão fora do shell padrão;
- garantir foco, reduced motion e estados de loading/erro.

**Fora do escopo:** reestruturar conteúdo específico das páginas.

**Aceite:** primitives coerentes, navegação desktop/mobile funcional, nenhum contrato alterado e páginas existentes ainda operacionais.

### Fase 3 — Home `/`

**Arquivos principais:** `src/app/page.tsx` e componentes compartilhados de shell/identidade.

**Mudanças:**

- hero editorial assimétrico e responsivo;
- CTA principal evidente para visitante e autenticado;
- identidade do usuário com menor hierarquia;
- geometria própria no lugar de fotografia não autorizada;
- preservação de Biblioteca, Minhas atividades, Admin, Criar, Entrar e Sair.

**Aceite:** conexão visual imediata com o Parque Biblioteca, composição expressiva sem área ociosa excessiva e todos os fluxos de autenticação intactos.

### Fase 4 — Biblioteca e Minhas atividades

**Arquivos principais:** `src/app/library/page.tsx`, `src/app/my-activities/page.tsx` e componentes de ações de atividade.

**Mudanças em `/library`:**

- cabeçalho e busca com hierarquia clara;
- cards editoriais com metadados reais e acento estável por template;
- favorito/remix com estados default, pressed, pending e guest;
- empty state integrado ao Design System.

**Mudanças em `/my-activities`:**

- distinção inequívoca entre rascunho e publicação;
- melhor escaneabilidade e retomada do editor;
- criação como ação primária e empty state orientado à tarefa.

**Aceite:** busca, redirecionamentos, criação, favorito e remix preservados; grids funcionais em mobile e desktop.

### Fase 5 — Editor de atividades

**Arquivos principais:** `src/modules/activities/ui/activity-editor.tsx`, `content-visual-editor.tsx` e estilos associados.

**Mudanças:**

- stepper acessível para Jogo, Conteúdo e Aparência;
- agrupamento visual de metadados, regras, apresentações e conteúdo;
- preview com maior prioridade e comportamento sticky seguro;
- barra de ações com autosave visível e destruição separada;
- adaptação dos cinco editores de conteúdo e uploads aos fields compartilhados;
- responsividade para formulários, categorias, respostas e mídia;
- preservação da área JSON exclusiva de desenvolvimento.

**Aceite:** autosave de 900 ms, publicação, despublicação, exclusão, apresentações, conversões, upload e preview funcionam sem mudança de payload ou schema.

### Fase 6 — Atividade publicada e preparação

**Arquivos principais:** `src/app/activity/[slug]/page.tsx`, `public-activity.tsx` e `start-session-panel.tsx`.

**Mudanças:**

- cabeçalho editorial compacto com informações e ações próximas;
- presentations como tabs acessíveis;
- setup integrado à jornada, com expansão clara e responsiva;
- aviso de preview e `GameRenderer` tratados como uma única experiência;
- estados pending/error e configuração de 1–8 equipes claramente comunicados.

**Aceite:** preview, favorito, remix, sessão autenticada/anônima, timers, bomba, som e nomes das equipes preservados.

### Fase 7 — Sessão preparada e ativa

**Arquivos principais:** `src/modules/game-sessions/ui/game-session-shell.tsx`, timer e estilos dos templates.

**Mudanças na preparação:**

- abertura imersiva de viewport inteiro;
- título, equipes, etapas e CTA com leitura imediata;
- estado de espectador “aguardando” claramente distinto.

**Mudanças na sessão ativa:**

- regiões claras para cabeçalho/progresso, placar, timer/turno, palco e controles;
- pontuação e nomes de equipe legíveis em projeção;
- controles sem sobreposição em viewport baixo;
- estados pausado, finalizado, resposta revelada e erro visualmente inequívocos;
- suporte a 1–8 equipes e timer normal, desligado ou bomba;
- revisão visual dos seis templates sem alterar suas mecânicas.

**Aceite:** controlador e espectador mantêm permissões; polling, comandos, pontuação, turno, undo, áudio, timer e finalização permanecem idênticos funcionalmente.

### Fase 8 — Rotas de apoio, QA e regressão

**Áreas:** `/login`, `/admin/users`, `/admin/activities`, not-found, configuração Playwright e correções responsivas.

**Mudanças:**

- aplicar tokens e primitives às rotas de apoio sem reestruturar seus fluxos;
- validar todos os providers e o estado sem provider;
- validar administração e ações destrutivas;
- corrigir contraste, overflow, foco, touch targets e reduced motion;
- adicionar projetos/cenários visuais para mobile, desktop e projetor;
- registrar arquivos alterados, pois o diretório atual não possui metadados Git.

**Aceite:** nenhuma tela visualmente isolada, nenhum scroll horizontal indevido e suíte completa aprovada.

## 4. Interfaces e contratos

### Sem mudanças públicas

Não haverá alteração em:

- rotas ou métodos HTTP;
- tipos de domínio ou schemas;
- modelos e migrations;
- propriedades serializadas entre Server e Client Components;
- comandos e eventos de sessão;
- configuração ou estado dos templates;
- URLs de navegação e autenticação.

### Componentes internos novos ou ampliados

- `Button`: variantes primary, secondary, outline, ghost e danger; tamanhos small/default/large/icon; estado loading.
- `AppHeader`: brand, links e ações fornecidos pela página, com menu mobile.
- `AppShell`: container e regiões padrão.
- `PageHeader`/`SectionHeader`: título, eyebrow, descrição e actions.
- `Card`/`Badge`: composição e estados semânticos.
- `Field`, `Input`, `Textarea`, `Select`, `Checkbox`: labels, ajuda e erro.
- `Tabs`: API controlada e semântica WAI-ARIA.
- `Progress`, `Alert`, `EmptyState`, `Skeleton`, dialog e menu de overflow.

Esses contratos são exclusivamente de UI interna. Componentes clientes continuam recebendo dados serializáveis, e nenhum carregamento de banco ou autenticação será movido para o navegador.

## 5. Estratégia de testes

### Verificação obrigatória por fase

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Executar `npm run test:e2e` com PostgreSQL migrado e ambiente de teste preparado nas fases que alterarem fluxos cobertos.

### Cenários funcionais

- visitante e usuário autenticado na home;
- login local, Google, magic link e nenhum provider;
- busca com e sem resultados;
- favorito, desfavorito e rollback em erro;
- remix e criação pendentes;
- lista vazia, rascunho e publicação;
- editor vazio, incompleto, incompatível, válido e com erro de save;
- upload de imagem e áudio;
- publicação, despublicação e exclusão;
- preview e múltiplas apresentações;
- setup com 1 e 8 equipes, nomes longos, timers e som;
- sessão criada, ativa, pausada e finalizada;
- controlador, espectador e sessão indisponível;
- pontuação, remoção de pontos, rename, reveal, next, undo e finish;
- Quiz, Combinar, Memória, Roleta, Separar grupos, Desembaralhar e Grade de equipes.

### Cenários visuais e responsivos

- capturas estáveis em 390×844, 768×1024, 1440×900 e 1920×1080;
- conteúdo curto e longo;
- 1, 2, 4 e 8 equipes;
- viewport baixo com headers/preview/controles sticky ou fixed;
- zoom de 200%;
- reduced motion;
- tema padrão e overrides de apresentação.

### Acessibilidade

- ordem de foco e operação por teclado;
- tabs e menu móvel com roles/estados corretos;
- labels e descrições de fields;
- anúncios de erro, save e feedback;
- contraste WCAG AA;
- alvos de toque de pelo menos 44px;
- progresso, placar, turno e respostas não dependem somente de cor.

## 6. Critérios de aceite final

- A mudança é radical e reconhecivelmente conectada ao Parque Biblioteca.
- A interface não parece uma cópia institucional nem um dashboard SaaS genérico.
- A área do professor permanece produtiva e a área de jogo é legível em projeção.
- Home, biblioteca, atividades, editor, página pública e sessão formam uma família visual coerente.
- Mobile, tablet, desktop e projetor estão cobertos.
- Autenticação, autorização, backend, dados, publicação, favorito, remix, sessões e jogos permanecem intactos.
- Todos os comandos obrigatórios e E2E pertinentes passam.
- Não há assets externos sem autorização nem conteúdo fictício introduzido pelo redesign.

## 7. Premissas operacionais

- Português do Brasil permanece como idioma.
- Esta documentação é a fonte obrigatória para as próximas fases.
- Login, administração e not-found recebem harmonização na fase final; as seis rotas prioritárias vêm primeiro.
- Não inicializar Git automaticamente. Enquanto não houver metadados Git, cada entrega deve listar seus arquivos modificados e os comandos realmente executados.
- Qualquer necessidade de mudar um contrato funcional interrompe a fase e exige autorização explícita antes da alteração.
