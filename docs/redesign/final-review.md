# EduParque — Revisão final do redesign

**Data:** 09/10/2026  
**Escopo:** QA visual, responsividade, acessibilidade e regressão funcional da repaginação

## 1. Resultado

A revisão final foi concluída com correções restritas à apresentação e à acessibilidade. Não foram alterados contratos, APIs, schemas, persistência, autenticação, pontuação, turnos, timers ou regras dos jogos.

As oito telas/estados centrais foram verificadas em `375x812`, `768x1024`, `1366x768` e `1920x1080`:

- Home `/`;
- Biblioteca `/library`;
- Minhas atividades `/my-activities`;
- Editor `/editor/[id]`;
- atividade publicada em modo de prévia `/activity/[slug]`;
- configuração da sessão em `/activity/[slug]`;
- sessão preparada `/session/[id]`;
- sessão ativa `/session/[id]`.

Também foram revisados `/login`, `/admin/users`, `/admin/activities`, os estados not-found de atividade e sessão e o 404 global. Não foi detectado overflow horizontal nas rotas verificadas.

## 2. Problemas encontrados e corrigidos

### Contraste

- metadados do hero da atividade publicada tinham contraste de `4.42:1`, abaixo de AA para o tamanho usado;
- texto auxiliar da prévia tinha contraste de `4.33:1`;
- rótulos de progresso e timer da sessão tinham contraste entre `4.30:1` e `4.33:1`;
- descrições vazias do catálogo perdiam contraste por transparência adicional;
- badges das telas administrativas herdavam a cor muted de `.admin-row span`, anulando a cor semântica do badge;
- números das etapas do Editor usavam opacidade e chegavam a `2.64:1` no estado inativo e `3.79:1` no ativo.

As regras foram ajustadas para usar tokens de texto com contraste AA e para evitar opacidade em informação textual essencial.

### Editor responsivo e semântica

- `aria-controls` apontava para painéis não montados nas etapas inativas, produzindo duas violações críticas de ARIA;
- em `375px`, ações de publicação e exclusão ficavam fora da área visível do topo;
- em `768px`, o rótulo “Aparência” sofria corte;
- o stepper dependia de rolagem horizontal no mobile, ocultando etapas.

Os controles agora usam a semântica de navegação por etapas com `aria-current`, sem referências ARIA inválidas. No mobile, as ações formam uma grade visível e as três etapas cabem lado a lado. No tablet, a distribuição interna foi compactada sem truncar rótulos.

### Toque, movimento e navegação

- ações do catálogo foram elevadas para alvo mínimo de `44px`;
- controles de pontuação e renomeação usam `44x44px` em telas de toque;
- o layout raiz declara `data-scroll-behavior="smooth"`, conforme a convenção do Next.js 16 para transições de rota;
- o menu mobile foi validado por teclado, com foco visível de `3px`, `aria-expanded` atualizado e links acessíveis;
- com `prefers-reduced-motion: reduce`, transições e animações foram reduzidas para `0.01ms`.

## 3. Responsividade e estresse de conteúdo

Foram geradas 32 capturas finais, correspondentes aos oito estados centrais nas quatro resoluções. Elas estão em `artifacts/redesign-qa/final/`.

Também foi criada uma sessão com oito equipes e nomes extensos. Em todas as quatro resoluções:

- oito cards de placar permaneceram disponíveis;
- não houve overflow horizontal;
- os nomes não foram cortados por largura;
- pergunta, alternativas, painel lateral e controles continuaram separados.

As capturas das rotas de apoio estão em `artifacts/redesign-qa/support/`.

## 4. Acessibilidade

O axe-core foi executado com as regras `wcag2a`, `wcag2aa`, `wcag21aa` e `wcag22aa`. Após as correções, não restaram violações automatizadas nas páginas verificadas:

- login, Home, Biblioteca, Minhas atividades, atividade, Editor e sessão;
- Administração de usuários e atividades;
- not-found de atividade e sessão e 404 global.

Também foram verificados foco visível, navegação por teclado, alvos de toque, labels, estados que combinam cor com texto/ícone e redução de movimento.

## 5. Regressão funcional

Validado com dados reais do PostgreSQL local:

- autenticação local e navegação autenticada/anônima;
- busca por título;
- favoritar e desfavoritar, com leitura de `aria-pressed`;
- remixagem, abertura do Editor e limpeza posterior da cópia;
- criação, edição, upload, autosave, recarga e exclusão;
- publicação e acesso anônimo à atividade publicada;
- prévia e configuração de sessão;
- criação e início de sessão;
- seleção e verificação de resposta;
- pontuação, undo, pausa/retomada, revelar, avançar e finalizar;
- Quiz, Matching, Memória, Roleta, Separar grupos, Ordenar e Grade de equipes;
- timer-bomba e resposta revelada nos fluxos E2E existentes.

O primeiro `npm run test:e2e`, com quatro workers, terminou com 5/6 testes aprovados: a exclusão ao fim do teste do Editor não concluiu a navegação dentro do timeout enquanto outros fluxos gravavam no banco em paralelo. O mesmo cenário passou isoladamente e a suíte completa passou com um worker (`6/6`). Isso caracteriza contenção/flutuação do ambiente paralelo, não uma falha funcional reproduzível.

## 6. Comandos executados

| Comando | Resultado |
| --- | --- |
| `npm run db:seed` | aprovado; seis apresentações demonstrativas disponíveis |
| `npm run lint` | aprovado |
| `npm run typecheck` | aprovado |
| `RUN_DB_TESTS=1 npm test` | aprovado; 12 arquivos e 57 testes |
| `npm run test:e2e` | 5/6 no modo paralelo; uma flutuação de exclusão/redirect |
| `npx playwright test e2e/smoke.spec.ts --grep 'professor cria e reabre' --workers=1` | aprovado; 1/1 |
| `npx playwright test --workers=1` | aprovado; 6/6 |
| `npm run build` | aprovado com Next.js 16.3.8 e Turbopack |

O Vitest continua emitindo o aviso preexistente sobre sintaxe ESM em `vitest.config.ts` carregada como CommonJS. O aviso não afeta os testes e não foi alterado por estar fora do escopo visual.

## 7. Comparação visual

Em relação aos oito prints originais do briefing, a interface final apresenta:

- hierarquia editorial forte em vez de grandes áreas vazias;
- CTAs e estados de publicação mais evidentes;
- catálogo com busca, metadados e ações organizados;
- Editor com etapas reconhecíveis, preview valorizado e uso móvel viável;
- jornada contínua entre atividade, prévia, configuração e sessão;
- sessão preparada ocupando o viewport e sessão ativa priorizando pergunta, alternativas e placar;
- identidade coerente entre azul, amarelo, navy, geometria modular e tipografia de display.

A referência oficial foi recapturada em desktop e mobile em `artifacts/redesign-qa/reference/`. A comparação confirma a aproximação intencional em header claro, campo azul de alta presença, amarelo como contraste, títulos densos, assimetria e empilhamento mobile. O EduParque preserva linguagem própria e funcional, sem copiar logotipo, fotografia ou conteúdo institucional. O conteúdo de mídia à direita do hero oficial foi bloqueado pela política de segurança do ambiente nesta captura; a comparação dessa área usa também as observações confirmadas em `visual-audit.md`.

## 8. Arquivos alterados nesta fase

- `src/app/globals.css`;
- `src/app/layout.tsx`;
- `src/modules/activities/ui/activity-editor.tsx`;
- `docs/redesign/final-review.md`;
- `artifacts/redesign-qa/final/`;
- `artifacts/redesign-qa/support/`;
- `artifacts/redesign-qa/reference/`.

## 9. Lacunas e riscos restantes

- não existe baseline de regressão visual por pixel no repositório; a comparação foi manual e apoiada por medições de overflow e axe-core;
- OAuth Google e Magic Link não foram exercitados por falta de credenciais externas; o provider local e as políticas de autorização foram testados;
- nem toda combinação extrema de conteúdo de todos os seis jogos foi capturada nas quatro resoluções, embora os fluxos E2E cubram os seis templates;
- as capturas locais foram feitas no servidor de desenvolvimento e podem exibir o indicador do Next.js no canto inferior esquerdo; ele não pertence à interface do produto;
- a suíte E2E paralela pode sofrer contenção no banco/autosave. Para CI determinística, recomenda-se isolamento de dados por worker ou execução serial do grupo que cria e exclui atividades.

## 10. Recomendações futuras

1. Adicionar snapshots visuais estáveis dos oito estados principais em Chromium, com mascaramento de dados dinâmicos.
2. Isolar usuários e dados E2E por worker antes de reativar paralelismo irrestrito.
3. Executar uma rodada assistiva manual com leitor de tela e navegação somente por teclado nos seis templates.
4. Repetir a validação OAuth/Magic Link em um ambiente de staging com credenciais próprias.
