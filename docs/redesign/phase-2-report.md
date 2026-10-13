# EduParque — Relatório da Fase 2

## 1. Status

A Fase 2 — Design System e estrutura global foi concluída. O trabalho ficou restrito à fundação visual, aos componentes compartilhados e ao App Shell. Não houve redesenho do conteúdo específico das páginas, nem alteração de regras de negócio, contratos, dados, autenticação ou mecânicas dos jogos.

## 2. Arquivos modificados

### Fundação global

- `src/app/layout.tsx`: carregamento centralizado de Montserrat e Source Sans 3 com `next/font` e exposição das variáveis tipográficas.
- `src/app/globals.css`: tokens de cor, tipografia, superfície, borda, raio, espaçamento, sombra e movimento; integração com Tailwind 4; estilos estruturais do shell e dos primitives; estados responsivos, de foco e de movimento reduzido.

### Design System compartilhado

- `src/shared/ui/components/button.tsx`: variantes primary, secondary, outline, ghost e danger; tamanhos small, default, large e icon; estado de loading; compatibilidade com `asChild` preservada.
- `src/shared/ui/components/brand-mark.tsx`: marca geométrica própria, sem uso de asset externo.
- `src/shared/ui/components/app-shell.tsx`: container e regiões globais da aplicação.
- `src/shared/ui/components/app-header.tsx`: navegação compartilhada, indicação da rota atual e menu responsivo acessível.
- `src/shared/ui/components/page-header.tsx`: `PageHeader` e `SectionHeader`.
- `src/shared/ui/components/card.tsx`: composição de card, header, conteúdo e footer.
- `src/shared/ui/components/badge.tsx`: badges e estados semânticos.
- `src/shared/ui/components/alert.tsx`: feedback informativo, de sucesso, atenção e erro.
- `src/shared/ui/components/form-controls.tsx`: `Field`, `Input`, `Textarea`, `Select` e `Checkbox` com suporte a ajuda, erro e atributos ARIA.
- `src/shared/ui/components/feedback.tsx`: `Progress`, `EmptyState` e `Skeleton`.
- `src/shared/ui/components/tabs.tsx`: tabs controladas com semântica WAI-ARIA e navegação por teclado.
- `src/shared/ui/components/dialog.tsx`: dialog controlado baseado no elemento nativo.
- `src/shared/ui/components/dropdown-menu.tsx`: menu de overflow com fechamento por clique externo e `Escape`.
- `src/shared/ui/components/index.ts`: exports públicos dos componentes compartilhados.

### Integração do App Shell

- `src/app/page.tsx`
- `src/app/library/page.tsx`
- `src/app/my-activities/page.tsx`
- `src/app/activity/[slug]/page.tsx`
- `src/app/admin/users/page.tsx`
- `src/app/admin/activities/page.tsx`

Nessas rotas, somente o shell e o cabeçalho duplicado foram consolidados. Links, permissões, ações e estruturas específicas de conteúdo foram preservados.

## 3. Decisões aplicadas

- Montserrat é a família de display e Source Sans 3 é a família de interface e leitura.
- A paleta de marca foi centralizada em tokens, com azul, amarelo, verde e vermelho apoiados por superfícies neutras e estados semânticos de contraste adequado.
- Tokens são a fonte única para CSS global e utilitários Tailwind; aliases de compatibilidade mantêm componentes existentes operacionais durante a migração incremental.
- O `BrandMark` usa geometria criada no próprio código, evitando copiar logotipos ou imagens externas.
- O App Shell atende páginas institucionais e de gestão. Editor e sessão de jogo continuam fora do shell padrão, conforme o plano aprovado.
- Componentes interativos mantêm alvo mínimo de toque, foco visível, estados ARIA e suporte a `prefers-reduced-motion`.
- O `Button` existente foi ampliado, em vez de substituído, para preservar seus consumidores atuais.
- Rotas tipadas do Next.js foram respeitadas nos links do cabeçalho e da marca.

## 4. Verificações

- `npm run lint`: aprovado, sem erros.
- `npm run typecheck`: aprovado, sem erros.
- `npm test`: aprovado; 10 arquivos e 55 testes passaram, com 2 arquivos e 2 testes previamente marcados como ignorados.
- `npm run build`: aprovado com Next.js 16.3.8 e Turbopack; todas as rotas foram compiladas.
- `npx playwright test e2e/smoke.spec.ts --grep 'visitante'`: aprovado no Chromium; o fluxo anônimo e o acesso à entrada permanecem disponíveis.
- verificação de execução da Home: resposta HTTP 200.
- inspeção manual do App Shell em desktop e mobile: aprovada.
- validação do menu mobile: `aria-expanded`, abertura, fechamento e layout responsivo aprovados.

O runner de testes continua exibindo um aviso preexistente sobre sintaxe ESM em `vitest.config.ts`, carregado atualmente como CommonJS. O aviso não causou falha na suíte e não foi alterado por estar fora do escopo visual desta fase.

## 5. Pendências deliberadamente fora da Fase 2

- Fase 3: composição editorial e conteúdo específico da Home.
- Fase 4: Biblioteca e Minhas atividades.
- Fase 5: editor de atividades.
- Fase 6: atividade publicada e preparação da sessão.
- Fase 7: sessão preparada e ativa e revisão visual dos templates.
- Fase 8: login, rotas de apoio restantes, not-found, QA visual completo e regressão E2E com ambiente PostgreSQL preparado.

Nenhuma dessas pendências deve ser iniciada sem aprovação explícita da Fase 2.
