# EduParque — Auditoria visual e técnica

**Data da auditoria:** 08/10/2026  
**Referência principal:** [Parque Biblioteca Benedito Bentes — Rede Areté](https://redearete.com/parque-biblioteca)  
**Evidências locais:** `EduParque_Redesign_Codex_MD_e_Prints/EduParque_Redesign_Codex/assets/`

## 1. Objetivo e limites

Esta auditoria fundamenta uma repaginação visual completa do EduParque para que o produto seja reconhecido como uma extensão digital do Parque Biblioteca. A interface deve combinar cultura, educação, comunidade, produtividade docente e experiência interativa sem copiar literalmente o site institucional nem assumir uma estética infantil ou de dashboard SaaS genérico.

Nesta etapa, nenhum componente, estilo, contrato ou comportamento funcional da aplicação é alterado.

Devem permanecer intactos durante toda a migração:

- autenticação, autorização e permissões;
- backend, APIs, schemas, banco de dados e persistência;
- criação, edição, publicação, despublicação e exclusão de atividades;
- favoritos, remixagem, apresentações e uploads de mídia;
- criação, controle e consulta de sessões;
- jogos, pontuação, turnos, timers, sons, undo e estados de sessão;
- URLs, handlers, payloads e dados reais existentes.

## 2. Referência visual confirmada

A página oficial foi inspecionada em desktop e mobile. As observações abaixo são confirmadas pela interface publicada e por seus estilos carregados em 08/10/2026.

### Tipografia

- Montserrat é usada como família de display, com pesos 600, 700 e 900.
- Source Sans 3 é usada no texto e na interface, com pesos 400, 600 e 700.
- Títulos têm peso elevado, entrelinha compacta e contraste forte com o fundo.
- Textos corridos têm entrelinha confortável e largura controlada.

### Cores

- Azul elétrico: `#183EFF`.
- Azul forte: `#1330CC`.
- Amarelo: `#FFDA00`.
- Navy: `#103050`.
- Navy escuro/ink: `#001020`.
- Branco: `#FFFFFF`.
- Superfície neutra: `#FAFCFE`.
- Texto atenuado: `#69727D`.
- Verde e vermelho aparecem como cores de apoio, não como base dominante da composição.

A referência usa grandes campos de branco e superfícies neutras, blocos azuis de alta presença e amarelo como contraste. A cor não é distribuída aleatoriamente entre elementos equivalentes.

### Composição, imagem e formas

- Hero desktop dividido assimetricamente entre conteúdo azul e mídia.
- Hero mobile empilhado, com conteúdo prioritário antes da mídia.
- Fotografias ocupam áreas amplas, têm corte editorial e aparecem em mosaicos de proporções diferentes.
- Cards possuem cantos arredondados, mas não são usados como solução universal para todo conteúdo.
- Estrelas, arcos, círculos e módulos geométricos criam ritmo e reconhecimento.
- A composição alterna seções claras e blocos saturados, preservando bastante espaço de respiro.
- Header branco, navegação horizontal no desktop e menu compacto no mobile.
- Movimento é discreto, com transições e entradas suaves, além de tratamento para `prefers-reduced-motion`.

### Limites de uso

Não há fotografias, logotipos ou pacote oficial de marca autorizado em `public/`. Portanto:

- imagens do site da Rede Areté não serão copiadas;
- o logotipo da Rede Areté não será reproduzido;
- a primeira implementação usará o nome textual EduParque e geometria própria em CSS/SVG;
- fotografia só será incorporada após o fornecimento explícito de assets autorizados.

## 3. Stack e arquitetura confirmadas

- Next.js 16.3.8, App Router e Turbopack.
- React e React DOM 19.3.
- Tailwind CSS 4.1 com `@tailwindcss/postcss`.
- TypeScript 5.9 em modo strict.
- Auth.js/NextAuth 5 beta, com autenticação local de desenvolvimento, Google e magic link.
- Drizzle ORM e PostgreSQL.
- Zod 4 para validação dos contratos.
- Lucide React disponível, ainda não utilizado na interface auditada.
- `class-variance-authority`, `tailwind-merge`, `clsx` e Radix Slot presentes.
- Playwright para E2E e Vitest para testes unitários e de integração.

O projeto usa Server Components nas páginas e Client Components somente nas áreas interativas. Essa fronteira deve ser preservada: autenticação e carregamento permanecem no servidor; edição, favorito, remix, configuração e controle de sessão permanecem em componentes clientes especializados.

## 4. Estrutura visual atual

### Tokens e CSS

`src/app/globals.css` concentra tokens básicos, layout, editor, jogos, sessão e responsividade em um único arquivo. Os tokens atuais se limitam principalmente a fundo, texto, verde primário, borda e muted.

Há duas abordagens paralelas:

- classes globais como `.button`, `.activity-card`, `.site-header` e `.session-shell`;
- utilitários Tailwind e um componente React `Button` com variantes próprias.

Isso cria divergências visuais e de estados. O redesign deve estabelecer uma única fonte de tokens, sem eliminar de uma vez as classes estruturais usadas por jogos e testes.

### Componentes compartilhados

- `Button` é o único primitive visual React consolidado.
- Headers, cards, badges, inputs, alertas, empty states, tabs e progressos são repetidos como marcação e classes.
- O header principal é duplicado entre páginas e varia sem uma regra única.
- Editor e sessão possuem shells próprios, o que é apropriado e deve ser mantido.
- `GameRenderer` e os seis templates compartilham contratos e tokens `--game-*`; esses temas pertencem às apresentações e não podem ser sobrescritos pelo novo shell global.

### Rotas e estados descobertos

Além das seis rotas prioritárias, existem `/login`, `/admin/users`, `/admin/activities`, estados `not-found` de atividade e sessão e rotas de API para atividades, apresentações, publicação, favorito, remix, mídia, administração e sessões.

## 5. Diagnóstico por tela

### Home `/`

**Usuários:** visitante, professor autenticado e administrador.  
**Objetivo:** entender o produto e chegar rapidamente à biblioteca ou à criação.

**Ação principal:** criar uma atividade quando autenticado; entrar quando visitante.  
**Ações secundárias:** biblioteca, minhas atividades, administração e sair.

**Problemas observados:**

- hero ocupa quase todo o viewport sem conteúdo visual proporcional;
- título e botões ficam isolados à esquerda;
- CTAs são pequenos diante da escala do título;
- o verde atual não estabelece conexão com o Parque Biblioteca;
- identificação do usuário compete com a mensagem principal;
- navegação móvel não possui estrutura dedicada.

**Riscos:** ocultar links condicionais, modificar o server action de logout ou alterar o fluxo visitante/autenticado.

### Biblioteca `/library`

**Usuário:** visitante ou professor buscando material publicado.  
**Objetivo:** localizar, avaliar, favoritar, remixar ou abrir uma atividade.

**Estados:** busca vazia ou preenchida, resultados, nenhum resultado, favorito ativo/inativo, remix pendente, visitante e autenticado.

**Problemas observados:**

- cards têm exatamente a mesma forma e peso visual;
- título, descrição, tags e quantidade de apresentações têm baixa diferenciação;
- favorito e remix disputam atenção com o acesso ao conteúdo;
- falta uma leitura rápida do tipo de experiência disponível;
- o grid perde personalidade e se aproxima de um catálogo SaaS genérico.

**Riscos:** alterar a query `q`, os redirecionamentos de visitante, o comportamento otimista do favorito ou os endpoints de remix.

### Minhas atividades `/my-activities`

**Usuário:** professor autenticado.  
**Objetivo:** retomar um rascunho, editar uma publicação ou criar conteúdo.

**Estados:** redirect de visitante, lista, vazio, rascunho, publicada e criação pendente.

**Problemas observados:**

- rascunhos e publicações diferem quase somente pelo texto do badge;
- cards oferecem pouca informação para decisão rápida;
- a ação “Abrir editor” tem o mesmo tratamento em todos os itens;
- a composição deixa grande área vazia sem criar ritmo editorial.

**Riscos:** quebrar ownership, redirect de autenticação ou criação e abertura do editor.

### Editor `/editor/[id]`

**Usuário:** proprietário autenticado da atividade.  
**Objetivo:** configurar jogo, editar conteúdo, personalizar aparência e publicar.

**Estados e ações:**

- etapas Jogo, Conteúdo e Aparência;
- autosave `Nao salvo`, `Salvando`, `Salvo` e `Erro`;
- publicação, despublicação, exclusão e erro de ação;
- uma ou várias apresentações, troca, criação, remoção e definição de padrão;
- seis tipos de jogo e cinco estruturas de conteúdo;
- conteúdo vazio, incompleto, incompatível e conversível;
- uploads de imagem/áudio, erro e mídia anexada;
- preview válido, incompleto e customizado por tema.

**Problemas observados:**

- stepper tem pouca presença e baixa clareza de progresso;
- muitos campos equivalentes dificultam escaneabilidade;
- ações permanentes e destrutivas ficam próximas;
- preview é visualmente secundário apesar de ser essencial;
- formulário e preview competem por largura no desktop;
- mobile empilha conteúdo, mas pode afastar o preview e esconder ação crítica.

**Riscos:** é a maior área de regressão. Devem ser preservados autosave de 900 ms, schemas, upload, conversão, publicação, múltiplas apresentações e todos os handlers.

### Atividade `/activity/[slug]`

**Usuário:** visitante ou usuário autenticado consumindo uma revisão publicada.  
**Objetivo:** conhecer a atividade, testar apresentações e iniciar uma sessão.

**Estados:** atividade disponível ou indisponível, apresentação selecionada, favorito, remix, setup fechado/aberto, erro/pending de criação e preview interativo.

**Problemas observados:**

- título, ações e configuração ficam afastados;
- o setup aberto parece um formulário lateral desconectado;
- a prévia principal aparece abaixo da dobra;
- o seletor de apresentações não comunica suficientemente a troca de experiência;
- há excesso de espaço vazio entre etapas da jornada.

**Riscos:** impedir sessões anônimas, alterar snapshots publicados ou misturar preview com estado persistido da sessão.

### Sessão `/session/[id]`

**Usuários:** controlador e espectador.  
**Objetivo:** preparar, apresentar e acompanhar uma partida.

**Estados:** criada, ativa, pausada e finalizada; controlador/espectador; polling; 1–8 equipes; timer desligado, padrão ou bomba; som; resposta oculta/revelada; erro; undo.

**Problemas da sessão preparada:**

- conteúdo central ocupa uma pequena fração do viewport;
- não existe sensação de abertura de jogo;
- fatos da sessão e CTA têm pouco impacto.

**Problemas da sessão ativa:**

- título, progresso, placar, timer, jogo e controles competem entre si;
- nomes e pontuações são pequenos para projeção;
- controles fixos podem comprimir ou sobrepor o palco;
- estados de turno e resposta têm baixa proeminência;
- layout com muitas equipes ou conteúdo longo tende a ficar denso.

**Riscos:** qualquer reorganização deve preservar polling, token de controle, permissões, reducer, pontuação, turnos, timer, áudio, undo e comandos.

### Telas de apoio

- `/login`: funcional, mas estilisticamente desconectada; possui estados para desenvolvimento, Google, magic link e nenhum provedor.
- `/admin/users` e `/admin/activities`: usam o shell atual e devem receber tokens/primitives sem mudança no fluxo de moderação.
- Not-found de atividade e sessão: devem compartilhar a nova identidade e manter textos e destinos.

## 6. Riscos transversais

- colisão entre tokens globais e temas configuráveis dos jogos;
- regressões em textos, roles e classes usados pelos testes E2E;
- headers sticky, preview sticky e controles fixed se sobrepondo em viewports baixos;
- contraste insuficiente ao usar amarelo ou cores de equipe;
- excesso de animação em contexto educacional ou em projetores;
- navegação móvel com links condicionais por autenticação;
- ausência de metadados Git no diretório atual, impedindo revisão convencional por diff.

## 7. Baseline de qualidade

Executado em 08/10/2026:

- `npm run lint`: aprovado;
- `npm run typecheck`: aprovado;
- `npm test`: 55 testes aprovados e 2 ignorados;
- `npm run build`: aprovado, incluindo todas as rotas App Router.

Os testes E2E completos devem ser executados nas fases de implementação com PostgreSQL preparado, pois criam e manipulam dados de teste.
