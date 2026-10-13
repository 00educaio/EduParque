# EduParque — Especificação de design

**Direção:** Parque digital em movimento  
**Referência:** Parque Biblioteca Benedito Bentes / Rede Areté  
**Escopo:** identidade visual, tokens, componentes, layout, responsividade e acessibilidade

## 1. Princípio visual

O EduParque deve transmitir que cultura, educação e tecnologia pertencem ao mesmo espaço público vivo. A interface será institucional e contemporânea, mas manterá energia suficiente para experiências de jogo. A área produtiva do professor deve ser clara e eficiente; a área apresentada aos alunos deve ser expressiva e legível à distância.

O sistema não deve parecer:

- uma cópia da landing page institucional;
- um dashboard SaaS composto apenas por cards cinza;
- uma interface infantilizada;
- um mosaico de cores aleatórias sem função;
- uma campanha publicitária que prejudique tarefas recorrentes.

## 2. Identidade e assets

- Usar “EduParque” como wordmark textual.
- Criar um símbolo próprio e simples com módulos geométricos em CSS ou SVG, sem reproduzir o logotipo da Rede Areté.
- Empregar estrelas, arcos, círculos e recortes modulares como elementos de ritmo.
- Reservar fotografia para assets expressamente fornecidos e autorizados.
- Não copiar imagens do site oficial nem inventar estatísticas, depoimentos ou conteúdo institucional.

## 3. Tokens

Os tokens serão declarados como CSS custom properties e mapeados ao tema do Tailwind 4, formando uma única fonte para primitives React, utilitários e classes estruturais existentes.

### Marca

| Token | Valor | Uso |
| --- | --- | --- |
| `--brand-blue` | `#183EFF` | ação primária, seções de marca e foco visual |
| `--brand-blue-strong` | `#1330CC` | hover/active sobre azul |
| `--brand-yellow` | `#FFDA00` | CTA, marcador editorial e contraste sobre navy/azul |
| `--brand-navy` | `#103050` | títulos, superfícies escuras e navegação |
| `--brand-ink` | `#001020` | texto de alto contraste e fundos imersivos |
| `--brand-green` | `#00D000` | detalhe de marca, nunca texto pequeno sobre branco |
| `--brand-red` | `#FF0000` | detalhe de marca, sem substituir automaticamente erro semântico |

### Superfícies e texto

| Token | Valor inicial |
| --- | --- |
| `--background` | `#FFFFFF` |
| `--surface` | `#FFFFFF` |
| `--surface-subtle` | `#FAFCFE` |
| `--foreground` | `#001020` |
| `--foreground-secondary` | `#103050` |
| `--foreground-muted` | `#69727D` |
| `--border` | `rgba(16, 48, 80, 0.12)` |
| `--focus` | `#183EFF` |

Cores de sucesso, alerta e erro serão tokens funcionais próprios, escolhidos e validados para WCAG AA. Elas não serão apresentadas como cores oficiais da Rede Areté.

### Espaçamento, forma e sombra

- Escala base de 4px.
- Espaçamentos preferenciais: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80 e 96px.
- `--container-max: 1200px`.
- Gutters: 20px no mobile, 24px no tablet e 32px no desktop.
- Raios: 8px para campos, 10px para botões, 20px para cards e `999px` para pills.
- Sombras discretas, reservadas para elevação real, preview e sobreposições.
- Bordas e contraste de superfície devem continuar legíveis sem sombra.

### Movimento

- 150ms para feedback direto.
- 300ms para menus, mudanças de estado e hover editorial.
- Até 500ms para entradas pontuais e mídia.
- Curva principal: `cubic-bezier(0.16, 1, 0.3, 1)`.
- `prefers-reduced-motion` deve remover transformações e reduzir animações a mudanças instantâneas.
- Não animar pontuação, timer ou conteúdo de forma que prejudique leitura ou cause ambiguidade.

## 4. Tipografia

Usar `next/font`, conforme as convenções locais do Next.js 16, para que as fontes sejam self-hosted e não gerem requisições do navegador a terceiros.

- Display: Montserrat 600, 700 e 900.
- Interface/corpo: Source Sans 3 400, 600 e 700.
- Números do timer podem permanecer tabulares/monoespaçados quando isso melhora estabilidade visual.

Escala semântica:

- display: `clamp(3rem, 7vw, 6rem)`, entrelinha 0.95–1.0;
- h1: `clamp(2.5rem, 5vw, 4.5rem)`, entrelinha próxima de 1.0;
- h2: `clamp(2rem, 3.5vw, 3rem)`;
- h3: 1.25–1.5rem;
- body: 1rem, entrelinha 1.5;
- body-large: 1.125rem, entrelinha 1.55;
- label: 0.875rem, peso 600/700;
- caption/eyebrow: 0.75rem, peso 700, tracking controlado.

Títulos podem usar azul, navy, branco ou amarelo conforme o fundo. Amarelo sobre branco não é combinação válida para texto essencial.

## 5. Layout global

### App shell

- Header claro e compacto, sticky somente quando isso não conflitar com editor ou sessão.
- Desktop: wordmark, navegação principal e ações alinhadas horizontalmente.
- Mobile: wordmark, botão de menu com `aria-expanded` e painel de navegação com alvos de 44px.
- Não introduzir sidebar global.
- Editor e sessão mantêm shells específicos por terem requisitos de uso diferentes.

### Composição editorial

- Alternar áreas claras com blocos de cor de alta presença.
- Usar assimetria para hero, destaques e catálogo, sem comprometer alinhamento dos formulários.
- Evitar que todo conteúdo seja encapsulado em cards idênticos.
- Limitar largura de texto longo e manter áreas de ação próximas ao contexto.

## 6. Componentes compartilhados

### Fundação

- `BrandMark`: wordmark e símbolo geométrico próprio.
- `AppShell`: container, background e regiões semânticas.
- `AppHeader`: links e ações recebidos por props; variante desktop e mobile.
- `PageHeader` e `SectionHeader`: eyebrow, título, descrição e slot de ações.

### Ação e navegação

- `Button`: variantes primary, secondary, outline, ghost e danger; tamanhos small, default, large e icon; estados default, hover, active, focus-visible, disabled e loading.
- `Tabs`: modo controlado, `tablist/tab/tabpanel`, foco visível e navegação por teclado.
- Dropdown/menu de overflow: apenas para ações secundárias em espaços compactos.
- Dialog nativo: confirmações destrutivas com título, descrição, cancelar e confirmar.

### Conteúdo e feedback

- `Card`: estrutura base com slots e acento opcional derivado de dados reais.
- `Badge`: neutral, info, success, warning e error.
- `Alert`: info, success, warning e error, com `role` adequado.
- `EmptyState`: título, descrição e ação opcional.
- `Skeleton`: carregamento visual sem simular conteúdo real.
- `Progress`: valor, label acessível e contraste suficiente.

### Formulários

- `Field`: label, ajuda, erro e associação por `id`/`aria-describedby`.
- `Input`, `Textarea`, `Select` e `Checkbox`: tamanhos e estados consistentes.
- Erro não pode depender somente de cor.
- Controles devem manter nomes, limites, valores e handlers existentes.

Lucide será a fonte de ícones. Emojis funcionais existentes só permanecerão quando fizerem parte da experiência do jogo; não serão a linguagem padrão da interface administrativa.

## 7. Regras por contexto

### Home

- Hero assimétrico com campo azul/navy e composição geométrica própria.
- Título e CTA principal aparecem primeiro no mobile.
- Identificação autenticada vira metadado secundário.
- Nenhuma seção ou estatística sem função real será inventada.

### Biblioteca e atividades do professor

- Cards usam título, descrição, tags, número de apresentações e template real.
- Acento visual pode ser derivado de forma estável do template padrão, usando apenas a paleta definida.
- Rascunho e publicação devem ser distinguíveis por texto, ícone, badge e estrutura, não apenas por cor.

### Editor

- Stepper de três etapas com progresso e labels legíveis.
- Conteúdo dividido em grupos com hierarquia clara.
- Preview sticky e valorizado no desktop; empilhado de forma previsível no mobile.
- Ações destrutivas separadas das ações primárias.
- Autosave e erros sempre visíveis e anunciados adequadamente.

### Atividade publicada

- Cabeçalho, apresentações, setup e preview formam uma jornada contínua.
- Setup aberto não pode empurrar a experiência para uma área desconectada.
- Modo de prévia continua claramente identificado.

### Sessão

- Preparação ocupa o viewport e cria uma abertura imersiva.
- Sessão ativa separa visualmente progresso, placar, timer/turno, jogo e controles.
- Conteúdo essencial deve ser legível a 1920×1080 e a distância.
- Cores de equipe continuam dinâmicas, mas não podem ser a única indicação de turno.
- Estado de espectador deve ser inequívoco e não exibir controles funcionais.

## 8. Responsividade e acessibilidade

Viewports mínimos de validação:

- mobile: 390×844;
- tablet: 768×1024;
- desktop: 1440×900;
- projetor: 1920×1080.

Critérios obrigatórios:

- contraste preferencialmente WCAG AA;
- navegação integral por teclado;
- foco visível em links, botões, campos, tabs e menus;
- landmarks, headings e labels semanticamente corretos;
- alvos de toque de pelo menos 44px;
- sem scroll horizontal nas rotas principais;
- conteúdo funcional utilizável com zoom de 200%;
- suporte a `prefers-reduced-motion`;
- placar, timer e feedback não dependem exclusivamente de cor.

## 9. Compatibilidade funcional

Os tokens do shell não substituem os tokens `--game-*` resolvidos pelos temas de apresentação. Não haverá mudança em schemas de tema, configurações de jogos, conteúdo, snapshots ou dados persistidos.

A nova camada visual deve envolver os handlers existentes. Não serão criados mocks, rotas alternativas ou formatos intermediários para facilitar o redesign.
