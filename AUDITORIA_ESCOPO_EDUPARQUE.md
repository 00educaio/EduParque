# Auditoria completa do EduParque — escopo e limitações do deploy gratuito

**Data da auditoria:** 26/10/2026  
**Branch/commit auditado:** `migration/vercel-free` / `7b23b70`  
**Escopo:** código, documentação, testes e histórico Git locais; documentação oficial vigente da Vercel e da Neon.  
**Restrições respeitadas:** nenhum deploy, migration, acesso a Production, leitura de segredos, teste de carga ou alteração de código. O único arquivo criado é este relatório.

> **Atualização pós-auditoria (26/10/2026):** após a entrega deste diagnóstico, foi autorizada uma rodada de correções. Foram tratados no código F-01, F-04, F-05, F-06, F-07 (bloqueio explícito e limpeza de objetos quando a exclusão é possível), F-08, F-09, F-10, F-11, F-12, F-14, F-15, F-17 e F-18. F-13 foi mitigado com respostas condicionais por ETag e polling reduzido em abas ocultas. A mídia voltou aos limites de 10 MiB para imagens e 25 MiB para áudio e ganhou biblioteca/reuso/DELETE protegido por referências. Os gates externos F-02, F-03, F-13 (medição de capacidade), F-16, F-19 e F-20 continuam exigindo validação operacional; este relatório preserva abaixo o retrato do estado originalmente auditado.

## Critério e confiabilidade das conclusões

As classificações usadas neste relatório são:

- **Confirmado:** comportamento determinado diretamente pelo código, histórico ou por teste local reproduzível.
- **Limitação documentada:** regra atual do provedor, confirmada em fonte oficial.
- **Risco provável:** consequência tecnicamente sustentada pelo código/arquitetura, mas ainda não observada em carga ou ambiente real.
- **Exige validação:** depende do estado atual dos painéis, credenciais ou execução no Preview/Production.
- **Não verificável:** o histórico disponível não permite reconstituir o comportamento anterior com segurança.

Fontes principais do escopo original: `entendimento_consolidado_produto.md:12-20`, `entendimento_consolidado_produto.md:41-70`, `entendimento_consolidado_produto.md:157-166` e `entendimento_consolidado_produto.md:277-443`. O documento está marcado como “entendimento aprovado” (`entendimento_consolidado_produto.md:8-10`). O histórico relevante é formado principalmente pelos commits `3ce6b04` (Cloudflare/OpenNext), `7cbba19` (runtime Vercel), `abe6252` (URLs externas), `c01339f` (upload S3 direto), `7bbd79f` (imagens temporárias duráveis) e `a77796e` (autenticação convencional).

### Verificações locais realizadas nesta auditoria

| Verificação | Resultado em 26/10/2026 | Observação |
|---|---|---|
| `npm run lint` | **Passou** | Sem erros. |
| `npm run typecheck` | **Passou** | Sem erros. |
| `npm test` | **Passou parcialmente** | 23 arquivos/136 testes passaram; 5 arquivos/11 testes de integração foram ignorados porque exigem `RUN_DB_TESTS=1` (`src/modules/*/application/*.integration.test.ts`). |
| `npm run build` | **Passou** | Next.js 16.3.8/Turbopack; compilação, TypeScript e 11 páginas estáticas concluídos. |
| Integração com PostgreSQL e E2E | **Não reexecutados** | Esses testes escrevem no banco. O Playwright usa um banco compartilhado e um worker (`playwright.config.ts:3-22`); não seria uma verificação não destrutiva sem preparar infraestrutura descartável. O registro anterior declara 135/135 integrações/unitários e 9/9 E2E em banco Docker isolado (`docs/VERCEL_FREE_MIGRATION.md:146-158`). |
| Preview/Production, Object Storage real, cold start e soak | **Não executados** | A solicitação proíbe deploy/operações de produção. O próprio checklist mantém esses gates pendentes (`todo.md:155-185`). |

Compilar não prova funcionamento real. Os resultados acima sustentam apenas consistência estática, testes unitários e capacidade de gerar o artefato local.

# A. Diagnóstico executivo

O EduParque preserva a maior parte do núcleo do MVP: criação e publicação versionada de atividades, seis templates, biblioteca pública, favoritos, remix, sessões teacher-led, equipes, pontuação, timer, undo, controle anônimo e recuperação de estado pelo PostgreSQL. A arquitetura atual é compatível com Vercel Hobby + Neon Free **para um MVP pequeno e pessoal/não comercial**, desde que os gates de configuração e uso real sejam aprovados.

A migração não substituiu uploads por URLs externas. O editor mantém as duas opções: arquivo enviado diretamente do navegador ao bucket S3 e URL HTTPS externa (`src/modules/activities/ui/content-visual-editor.tsx:51-102`). O fluxo direto evita o limite de 4,5 MB do corpo das Vercel Functions, pois a Function recebe metadados e o bucket recebe os bytes (`src/modules/media/application/media-service.ts:64-124`). Também houve uma melhoria importante: imagens de equipes deixaram o `/tmp` efêmero e passaram a usar banco + storage durável (`git show babb06d:src/modules/game-sessions/infrastructure/temporary-team-image-store.ts`, linhas 3-10 e 28-30; implementação atual em `src/modules/game-sessions/infrastructure/temporary-team-image-store.ts:69-141`).

As perdas comprovadas ligadas à adaptação foram:

1. Google OAuth e Magic Link foram removidos e substituídos por usuário/e-mail + senha e cadastro por convite. O histórico anterior possuía Google e Nodemailer; a decisão foi registrada como escolha do protótipo, não como exigência técnica da Vercel (`todo.md:35-49`; `git show babb06d:src/modules/auth/infrastructure/auth.ts`, linhas 3-5 e 47-61).
2. Imagens de até 10 MB e áudios de até 25 MB foram reduzidos a um limite uniforme de 5 MiB. O limite de 4,5 MB da Function justificaria upload direto, mas **não** exige limitar o objeto S3 a 5 MiB. Portanto, a redução é uma concessão de capacidade/produto, não uma obrigação técnica da Vercel (`git show babb06d:src/modules/media/domain/media-validation.ts`, linhas 6-7 e 34-41; atual em `src/modules/media/domain/media-validation.ts:3-29`).
3. A recuperação de conta por e-mail deixou de existir; hoje depende de operador com terminal/DB (`README.md:30-34`; `docs/VERCEL_FREE_MIGRATION.md:206-214`).

Não houve perda comprovada de persistência das sessões: o estado completo fica em JSONB e cada comando é transacionado com bloqueio de linha e evento (`src/shared/infrastructure/database/schema.ts:215-264`; `src/modules/game-sessions/application/game-session-service.ts:113-126`). O cronômetro usa prazo absoluto e é recalculado ao restaurar (`src/modules/game-sessions/domain/session-reducer.ts:8-24,63-71`). Porém, essa capacidade ainda não foi validada depois de cold start real ou em sessão de 50 minutos (`todo.md:165-185`).

## Parecer de liberação

**No-go para disponibilização a outros professores no estado auditado.** A arquitetura é adequada ao MVP, mas há bloqueadores antes da liberação:

- **P0 confirmado — autorização:** rebaixar um ADMIN não revoga o papel no JWT atual. A alteração grava apenas `role` (`src/modules/admin/application/admin-service.ts:22-25`), enquanto o callback relê somente `authVersion` e `lockedUntil` e reutiliza `token.role` (`src/modules/auth/infrastructure/auth.ts:41-64`). Um administrador rebaixado pode manter acesso administrativo até renovar a sessão.
- **P0 de operação — elegibilidade:** Vercel Hobby é restrito a uso pessoal e não comercial; uso institucional/comercial precisa ser resolvido sem presumir que Hobby é permitido. A confirmação de 21/10 registrada em `todo.md:35-40` deve continuar válida para a forma concreta de operação.
- **P0 de release — validação incompleta:** o fluxo funcional completo, cold start, sessão longa, cron e mídia real ainda não têm aceite no Preview atual (`todo.md:155-185,200-218`). A documentação de 23/10 também informa que não havia Production (`docs/CADASTRO_E_DEPLOY.md:5-15`); o estado de 26/10 não foi consultado por restrição desta auditoria.
- **P1 confirmado — jogo:** o modo Board de Separar Grupos permite clicar repetidamente em “Verificar grupos” e ganhar pontos novamente (`src/modules/game-templates/group-sort/ui/group-sort-template.tsx:43-50,75-82`).
- **P1 confirmado — capacidade:** não existe exclusão/garbage collection de mídia pronta não referenciada. A API de mídia só oferece POST, GET e finalização (`src/app/api/media/route.ts:14-56`; `src/app/api/media/[id]/route.ts:7-35`), e o cron remove somente uploads `pending` vencidos (`src/modules/media/application/media-service.ts:127-137`).

# B. Inventário funcional

| Funcionalidade | Estado atual | Comportamento original conhecido | Impacto da migração | Evidência e testes adicionais |
|---|---|---|---|---|
| Criar, editar e excluir Activity | **Implementada**, com exclusão lógica | Obrigatória no MVP | Preservada | Criação transacional e draft em `src/modules/activities/application/activity-service.ts:25-61`; exclusão lógica em `:134-137`. Validar CRUD no Preview (`todo.md:165-167`). |
| Autosave do editor | **Parcial / risco provável** | Debounce e estados Não salvo/Salvando/Salvo/Erro | Preservado, sem relação direta com a migração | Debounce de 900 ms em `src/modules/activities/ui/activity-editor.tsx:68-84`. Draft e presentations são requisições separadas; saves sobrepostos podem terminar fora de ordem e um save pode ser parcial. Necessita teste de rede lenta/concorrência. |
| Publicação e revisões imutáveis | **Implementada** | Draft separado de snapshot publicado | Preservada | Validação e snapshot em transação em `src/modules/activities/application/activity-service.ts:107-127`; schema em `src/shared/infrastructure/database/schema.ts:141-168`. Integração existe, mas foi ignorada nesta execução. |
| Múltiplas Presentations por Activity | **Implementada** | Conteúdo separado de jogo/configuração/aparência | Preservada | CRUD e default em `src/modules/activities/application/activity-service.ts:64-100`; modelo original em `entendimento_consolidado_produto.md:72-102,359-371`. |
| Visibilidade private/unlisted/public | **Implementada** | As três visibilidades; visitante acessa public/unlisted por link | Preservada | Biblioteca lista apenas public e acesso por slug permite unlisted (`src/modules/activities/application/activity-service.ts:167-190`); sessão privada verifica dono/admin (`src/modules/game-sessions/application/game-session-service.ts:56-60,88-98`). |
| Biblioteca, busca e “Minhas atividades” | **Implementada** | Busca por título, descrição e tags; públicas entram automaticamente | Preservada | Busca nas três fontes e limite 60 em `src/modules/activities/application/activity-service.ts:175-190`; escopo em `entendimento_consolidado_produto.md:383-393`. |
| Favoritos | **Implementada** | Prevista | Preservada | `src/modules/activities/application/activity-service.ts:186-202`. Validar no Preview. |
| Remix | **Implementada** | Cópia independente de conteúdo e Presentations | Preservada | Copia snapshot, configurações, temas e origem em `src/modules/activities/application/activity-service.ts:147-164`. Validar no Preview. |
| Upload de imagem e áudio | **Implementada com limite reduzido** | 10 MB imagem/25 MB áudio antes da migração | **Prejudicada**: 5 MiB para ambos | UI e PUT direto em `src/modules/activities/ui/content-visual-editor.tsx:55-81`; limite em `src/modules/media/domain/media-validation.ts:3-29`; fluxo real de 5 MiB passou em Preview segundo `todo.md:168-170`. Rejeições e GET/expiração ainda pendentes (`todo.md:171-173`). |
| URLs externas de mídia | **Implementada como opção adicional** | Não identificada no escopo inicial | Capacidade adicionada; não substituiu upload | Validação HTTPS em `src/shared/domain/content-blocks.ts:14-45`; UI em `src/modules/activities/ui/content-visual-editor.tsx:88-102`; CSP permite HTTPS em `next.config.ts:18-29`. Disponibilidade do host é externa. |
| My Media pessoal/reutilizável | **Não implementada como produto** | Prevista explicitamente | Não é perda da migração; lacuna anterior/atual do MVP | Tabela existe (`src/shared/infrastructure/database/schema.ts:184-203`), mas não há GET de coleção nem DELETE de mídia (`src/app/api/media/route.ts:14-56`; `src/app/api/media/[id]/route.ts:7-35`). Original em `entendimento_consolidado_produto.md:410-421`. |
| Temas salvos/reutilizáveis | **Parcial** | SystemTheme, UserTheme e overrides reutilizáveis | Não há evidência de remoção durante a migração; implementação incompleta | Schema e leitura do último UserTheme existem (`src/shared/infrastructure/database/schema.ts:170-182`; `src/modules/activities/application/activity-service.ts:102-105`), mas não há UI/API de CRUD de temas. Overrides por Presentation funcionam. |
| Quiz | **Implementado com defeito de configuração** | Uma/múltiplas corretas, shuffle, timer, pontos, reveal | Preservado, porém `allowMultiple` não tem efeito | Config é persistida (`src/modules/game-templates/index.ts:24-29`), mas seleção múltipla depende apenas da quantidade de respostas corretas (`src/modules/game-templates/quiz/ui/quiz-template.tsx:19-43`). Testar correção após ajuste. |
| Matching Connect/Memory | **Implementado** | Ambos os modos previstos | Preservado | Registro em `src/modules/game-templates/index.ts:30-34`; persistência/pontuação em `src/modules/game-templates/matching/ui/matching-template.tsx:143-243`. Há testes de shuffle, layout e turno; requer smoke real em mobile. |
| Random Wheel | **Implementado** | Repetição/remoção configurável | Preservado | Config em `src/modules/game-templates/index.ts:35-39`; estado persistido e regras em `src/modules/game-templates/wheel/ui/wheel-template.tsx:26-51`. Avanço/pontuação são conduzidos pelo professor, consistente com teacher-led. |
| Group Sort Board/One by One | **Implementado, Board com defeito de pontuação** | Board drag-and-drop e One by One | Preservado; defeito não é exigência de infraestrutura | Modos em `src/modules/game-templates/index.ts:40-44`; Board pontua novamente a cada verificação correta (`src/modules/game-templates/group-sort/ui/group-sort-template.tsx:43-50,82`). |
| Unscramble | **Implementado** | Caracteres ou tokens/palavras | Preservado e ampliado | Config e compatibilidade em `src/modules/game-templates/index.ts:45-52`; verificação/progressão em `src/modules/game-templates/unscramble/ui/unscramble-template.tsx:25-131`; testes específicos existem. |
| Team Grid | **Implementado** | Grade, pergunta, bomba, resposta, pontos, próximo time | Preservado | Config em `src/modules/game-templates/index.ts:54-57`; persistência, pontuação e avanço em `src/modules/game-templates/team-grid/ui/team-grid-template.tsx:15-58`. |
| Sessão a partir de revisão publicada | **Implementada** | Partida não deve mudar com edição posterior | Preservada | Criação guarda `revisionId` e `presentationId` (`src/modules/game-sessions/application/game-session-service.ts:48-74`); schema em `src/shared/infrastructure/database/schema.ts:215-230`. |
| Equipes, turnos, placar, timer, undo | **Implementada** | 1–8 equipes; pontos manuais/automáticos; undo; timer | Preservada | Limites/config em `src/modules/game-templates/index.ts:4-10`; reducer em `src/modules/game-sessions/domain/session-reducer.ts:27-178`; undo limita 20 frames (`:36-38`). |
| Refresh e recuperação de sessão | **Implementada por desenho; validação externa pendente** | Restaurar placar, etapa, equipes e estado | Sem perda comprovada | Estado JSONB + eventos em `src/shared/infrastructure/database/schema.ts:215-264`; prazo do timer em `src/modules/game-sessions/domain/session-reducer.ts:63-71`; cold start/soak pendentes em `todo.md:177-185`. |
| Controle anônimo/visitante | **Implementado** | Aluno/visitante sem conta em public/unlisted | Preservado | Token aleatório com hash em `src/modules/game-sessions/application/game-session-service.ts:22-30,56-74`; cookie HttpOnly de 24 h em `src/app/api/game-sessions/route.ts:6-13`. Link compartilhado não concede controle. |
| Visualização simultânea por alunos | **Implementada por polling; escala não validada** | Teacher-led, sem multiplayer realtime | Compatível com escopo; risco de consumo | Espectadores consultam a API a cada 2,5 s (`src/modules/game-sessions/ui/game-session-shell.tsx:136-149`). Cada espectador gera cerca de 24 invocações/minuto e leituras no banco. Não há teste de concorrência. |
| Imagens de equipes | **Implementada e arquiteturalmente melhorada** | Temporárias | Migração necessária e positiva: `/tmp` → S3 + DB | Upload/validação em `src/modules/game-sessions/infrastructure/temporary-team-image-store.ts:69-141`; exclusão ao finalizar em `src/modules/game-sessions/application/game-session-service.ts:113-126`; TTL padrão 24 h em `src/shared/infrastructure/config/env.ts:22-25`. Ciclo real ainda pendente (`todo.md:174-175`). |
| Cadastro/autenticação de professor | **Implementada com perda de conveniência** | Google OAuth principal; Magic Link quando gratuito | Substituída por credenciais + convite | Provider atual em `src/modules/auth/infrastructure/auth.ts:13-39`; convite de sete dias em `src/modules/auth/application/registration-invites.ts:7-16`; bloqueio 5/15 min em `src/modules/auth/application/password-authentication.ts:5-7`. Sem recuperação por e-mail. |
| Roles e autorização | **Implementada com falha crítica de revogação** | USER/ADMIN e ownership | Falha introduzida/manifestada no JWT atual | Ownership em `src/modules/auth/application/policies.ts:19-35`; papel fica no token em `src/modules/auth/infrastructure/auth.ts:41-64`; alteração não invalida token em `src/modules/admin/application/admin-service.ts:22-25`. |
| Administração de usuários/atividades | **Parcialmente funcional** | Busca, ocultar/remover e gerenciar usuários | Preservada | `src/modules/admin/application/admin-service.ts:12-55`. Remover usuário pode violar FKs `restrict`/sem cascade de publicações e SAC (`src/shared/infrastructure/database/schema.ts:141-149,266-295`). |
| Ajuda/tutoriais | **Implementada conforme PRD enxuto** | PRD posterior deliberadamente removeu tour engine/progresso | Sem relação negativa com migração | Escopo enxuto em `docs/PRD_EduParque_Guia_MVP_Enxuto.md:10-37,72-105`; painel fecha por teclado em `src/modules/help/guide-panel.tsx:21-61`; testes unitários passaram. |
| SAC/dúvidas/sugestões | **Implementado** | Módulo adicional ao escopo inicial | Preservado | Criação, thread, resposta, fechamento e rate limit no DB em `src/modules/support/application/support-service.ts:41-140`; schema em `src/shared/infrastructure/database/schema.ts:266-295`. Exige autenticação. |
| Responsividade | **Evidência de implementação; aceite insuficiente** | Jogos responsivos; editor desktop | Sem perda comprovada | Breakpoints em `src/app/globals.css:909-945,1001-1145`; artefatos visuais incluem 375/768/1366/1920. E2E automatizado usa somente Desktop Chrome (`playwright.config.ts:22`). Teste manual em aparelhos reais necessário. |
| Acessibilidade | **Parcial / exige auditoria** | Teclado, foco, ARIA, contraste, reduced motion | Sem perda comprovada | Foco visível e reduced motion em `src/app/globals.css:107,1144-1174`; ARIA aparece nos templates. Não há axe/Lighthouse ou matriz de leitor de tela. |
| Offline-first | **Fora de escopo** | Explicitamente fora do MVP | Não é perda da migração | `entendimento_consolidado_produto.md:532-554`. Após perda de rede, o prazo do timer permite recomposição, mas comandos falham até reconectar; não há fila offline. |
| Vídeo, aluno com conta, coedição, analytics avançado, realtime multiplayer | **Fora de escopo** | Explicitamente excluídos | Não são perdas | `entendimento_consolidado_produto.md:532-554`. |

# C. Funcionalidades perdidas ou prejudicadas

## C.1 Perdas comprovadas, ordenadas por impacto ao usuário

| Mudança | Por que mudou | Era necessária? | Impacto | Alternativa totalmente gratuita | Esforço |
|---|---|---|---|---|---|
| **Google OAuth e Magic Link → senha + convite** | O responsável decidiu não usar Google Cloud/SMTP e registrou exigência percebida de forma de pagamento (`todo.md:35-49`). | **Não foi exigência da Vercel.** Foi uma decisão operacional válida para o protótipo. | Mais atrito no cadastro; operador precisa emitir convite e redefinir senha; professor deve guardar mais uma senha. | Manter o login atual e adicionar token de recuperação de uso único gerado pelo operador, sem e-mail; ou reavaliar OAuth apenas se existir configuração oficialmente gratuita e sem cobrança para a conta concreta. Não depender de promessa genérica de gratuidade. | Baixo para reset por link; médio/alto para reintroduzir provider e migrar/ligar contas. |
| **Imagem 10 MB / áudio 25 MB → ambos 5 MiB** | Reduzir consumo do bucket gratuito e padronizar validação no upload direto. | **Parcialmente desnecessária.** O upload direto elimina o teto de 4,5 MB da Function; o limite restante é uma política de capacidade. | Áudios longos/alta qualidade e imagens pesadas podem ser recusados, exigindo compressão externa. | Depois de implementar exclusão/quotas, restaurar limites separados (por exemplo, os originais), continuando com PUT direto. Continua gratuito enquanto o bucket permanecer dentro de 5 GB. | Baixo no código; médio considerando UX, quota e testes reais. |
| **Recuperação por e-mail indisponível** | Magic Link/SMTP removidos junto da autenticação anterior. | Não é imposta pela Vercel, mas evita serviço de e-mail. | Bloqueio prolongado se o operador não estiver disponível; maior carga administrativa. | Link de reset de uso único criado por CLI/admin e entregue fora do sistema; códigos de recuperação gerados no cadastro. | Médio. |

## C.2 Funcionalidades prejudicadas pela arquitetura atual, mas não removidas

1. **Mídias próprias têm teto e ciclo de vida incompleto.** O upload funciona, porém não há biblioteca My Media, exclusão pelo usuário nem coleta de objetos `ready`. Remover a mídia do item apenas remove a referência visual (`src/modules/activities/ui/content-visual-editor.tsx:98-102`). Isso prejudica reuso e capacidade. É uma lacuna do produto, não uma exigência da Vercel.
2. **Visualização simultânea usa polling.** É suficiente para o teacher-led pequeno, mas 24 GET/min por espectador pode consumir invocações e compute. Realtime era explicitamente fora do MVP; portanto não houve perda, apenas um risco de escala (`entendimento_consolidado_produto.md:58-59,532-540`; `src/modules/game-sessions/ui/game-session-shell.tsx:145-149`).
3. **URLs externas trazem dependência do host.** São opção adicional e economizam storage, mas podem expirar, trocar conteúdo, bloquear hotlink ou rastrear usuários. A CSP permite qualquer host HTTPS para imagem/áudio (`next.config.ts:18-29`).
4. **Imagens de equipe expiram após 24 horas mesmo se a sessão continuar aberta.** O vencimento é calculado no momento em que o upload fica pronto (`src/modules/game-sessions/infrastructure/temporary-team-image-store.ts:65-67,130-137`), não a partir do encerramento/inatividade da sessão.

## C.3 Capacidades originais que nunca ficaram completas

- **My Media pessoal:** previsto em `entendimento_consolidado_produto.md:410-421`, mas não há tela/listagem/reuso nem DELETE. Não deve ser chamado de “removido pela Vercel”.
- **Temas de usuário salvos:** previstos em `entendimento_consolidado_produto.md:423-443`; tabela e resolução existem, mas falta CRUD/UI.
- **Compartilhamento guiado:** links public/unlisted funcionam, porém não há evidência de botão dedicado de copiar/gerenciar link. O acesso técnico existe.

## C.4 Mudanças necessárias ou benéficas

- **Upload direto ao S3:** necessário para arquivos acima de 4,5 MB sem trafegar pela Function e tecnicamente adequado ao gratuito.
- **Bucket privado + GET assinado:** preserva controle de acesso e evita servir binário pela Function (`src/app/api/media/[id]/route.ts:7-24`).
- **Imagens temporárias fora do `/tmp`:** necessário em ambiente serverless sem disco persistente e uma melhoria real de durabilidade.
- **Pool pequeno, endpoint pooled e `prepare:false`:** apropriados para Vercel/Neon (`src/shared/infrastructure/database/client.ts:6-12`).

# D. Limitações da infraestrutura

## D.1 Vercel Hobby — o que afeta de fato

Fontes oficiais consultadas em 26/10/2026: [Hobby Plan](https://vercel.com/docs/plans/hobby), [Fair Use](https://vercel.com/docs/limits/fair-use-guidelines), [Functions Limits](https://vercel.com/docs/functions/limitations), [WebSockets](https://vercel.com/docs/functions/websockets) e [Cron usage](https://vercel.com/docs/cron-jobs/usage-and-pricing).

| Tema | Limite atual/documentado | Efeito real no EduParque | Classificação |
|---|---|---|---|
| Elegibilidade | Hobby é pessoal e não comercial; a definição inclui trabalho feito por empregado/consultor para ganho financeiro. | É gate jurídico/operacional. Se o uso concreto não for elegível, não existe aprovação honesta da arquitetura Vercel Hobby sob a regra de custo zero. | **Limitação documentada / exige confirmação contínua** |
| Franquias | 1 milhão de invocações, 4 CPU-h, 360 GB-h de memória, 100 GB de Fast Data Transfer e 10 GB de Fast Origin Transfer por ciclo. Em geral, o recurso pausa quando a franquia gratuita acaba. | Polling de espectadores e todas as páginas dinâmicas consomem invocações. Não há telemetria de uso real suficiente para estimar lotação segura. | **Risco provável** |
| Duração/memória | Com Fluid Compute: Hobby até 300 s e 2 GB/1 vCPU. | Rotas são curtas; cleanup está limitado. Não há processamento de mídia na Function. Não é gargalo imediato. | **Compatível** |
| Corpo de request/response | 4,5 MB. | Upload S3 direto contorna corretamente. O fallback multipart é bloqueado na Vercel (`src/app/api/media/route.ts:30-39`). | **Compatível por arquitetura** |
| Disco temporário | Não é armazenamento persistente da aplicação. | Código atual não depende de `/tmp` para as equipes; usa S3+DB. | **Compatível** |
| Processos persistentes | Functions escalam e podem encerrar/reiniciar. | Estado relevante está no Postgres; não depende de memória de processo. | **Compatível por desenho; validar cold start** |
| WebSockets | Desde 2026, disponíveis em todos os planos com Fluid Compute, ainda com conexões encerradas no máximo da Function e estado durável externo. Next.js usa `upgradeWebSocket`. | O runbook antigo que tratasse WebSocket como impossível estaria desatualizado. O produto não precisa dele no MVP e atualmente usa polling. Migrar agora seria expansão desnecessária. | **Disponível em beta, não necessário** |
| Cron | Até 100 crons, frequência mínima diária e precisão de ±59 min no Hobby. | O cron diário de 03:17 é válido (`vercel.json:5-9`), mas não garante minuto exato. Limpeza não pode depender de prazo curto. | **Limitação documentada** |
| Build/runtime | Node 22 e Next.js são suportados; build local passou. | `package.json:5-17` e `vercel.json:1-10` estão coerentes. | **Compatível** |
| Região | Uma região por padrão no Hobby; projeto fixa `gru1`. | Aproxima Functions do banco em São Paulo, mas mídia em US East terá latência adicional. | **Decisão adequada com trade-off** |
| Deployment Protection | Vercel Authentication está disponível no Hobby. | Preview protegido não é link público de convite; destinatário precisa acesso/bypass (`docs/CADASTRO_E_DEPLOY.md:150-179`). Production pública precisa ser validada separadamente. | **Limitação operacional** |
| Logs | Hobby retém runtime logs por 1 hora. | Diagnóstico de falhas esporádicas e cron diário fica difícil sem revisão imediata/telemetria própria mínima. | **Risco operacional** |

### Problemas de configuração do app

- `AUTH_SECRET` e `CRON_SECRET` são opcionais no schema, `STORAGE_DRIVER` cai para `local`, e `DATABASE_URL` tem default local (`src/shared/infrastructure/config/env.ts:7-25`). Em um ambiente Vercel incompleto, o build pode passar e falhas aparecerem apenas em runtime. O runbook os declara obrigatórios (`docs/VERCEL_FREE_MIGRATION.md:95-115`), mas o código não aplica esse gate.
- `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` aparece no `.env.example` e no runbook (`.env.example:6-16`), porém não é validada por `envSchema`.
- O storage local na Vercel responde 503 para upload/leitura, o que é melhor que corromper silenciosamente, mas ainda permite publicar um deployment mal configurado (`src/app/api/media/route.ts:30-39`; `src/app/api/media/[id]/route.ts:13-18`).

## D.2 Neon Free — o que afeta de fato

Fontes oficiais consultadas em 26/10/2026: [Neon Pricing](https://neon.com/pricing), [Free plan update de 02/10/2026](https://neon.com/blog/neon-free-plan-1-gb-per-project), [Manage computes](https://neon.com/docs/manage/computes) e [Object Storage GA](https://neon.com/blog/building-neon-object-storage).

| Tema | Estado oficial atual | Efeito real no EduParque | Classificação |
|---|---|---|---|
| Postgres | Free: 1 GB por projeto, 100 CU-h/mês por projeto, até 2 CU, 10 branches. | Suficiente para MVP pequeno, mas snapshots JSONB e `session_events` crescem sem retenção. | **Compatível com risco de crescimento** |
| Object Storage | 5 GB incluídos por projeto; S3-compatible e branch-aware. | Funciona com o provider atual. A 5 MiB por arquivo, teto teórico é 1.024 objetos, antes de temporários/outros tamanhos. Sem DELETE/GC de mídia pronta, o teto será alcançado. | **Compatível, capacidade finita** |
| Scale to zero | Compute fica idle após 5 min por padrão; retomada acrescenta algumas centenas de ms. | Primeiro login/página após inatividade pode ser mais lento. `connect_timeout` é 10 s (`src/shared/infrastructure/database/client.ts:6-12`), aparentemente razoável, mas precisa medição real. | **Risco provável / validação pendente** |
| Conexões | Endpoint pooled suporta até 10.000 conexões de usuário; compute 0,25 CU tem limite direto bem menor. | App usa no máximo 3 conexões por instância e `prepare:false`, mas muitas instâncias podem multiplicar pools. Confirmar hostname `-pooler`. | **Adequado se configuração correta** |
| Compatibilidade serverless | Pooler + conexões curtas são recomendados. | Implementação atual é adequada. | **Compatível** |
| Região | Banco principal documentado em São Paulo; storage em projeto separado US East. | DB perto da Function; uploads/leituras podem ter latência maior. Não impede funcionalidade. | **Trade-off documentado** |
| Disponibilidade real do storage | O checklist registra projeto/bucket Free, privado, branches isoladas, CORS e PUT de Preview válidos em 23/10 (`todo.md:85-101,132-170`). | Preview tem boa evidência histórica. Bucket/credencial/CORS de Production e franquias atuais não foram lidos nesta auditoria. | **Preview documentado; Production exige validação** |

## D.3 Arquitetura e dependências antigas

- Não há dependência runtime atual de Cloudflare Workers, OpenNext, Wrangler ou Hyperdrive. Busca no código atual não encontrou referências nem dependências top-level.
- O commit `3ce6b04` criou `.dev.vars.example`, `cloudflare-env.d.ts`, `open-next.config.ts`, `wrangler.jsonc` e `public/_headers`; todos aparecem removidos no diff `3ce6b04..7cbba19`.
- `output: "standalone"` em `next.config.ts:13-16` é útil para Docker e não obriga Cloudflare.
- Permanecem decisões específicas da Vercel (`vercel.json`, `VERCEL=1`, cron e região), mas banco/storage continuam abstraídos. A afirmação de “nenhum provedor específico” em `README.md:13` ficou apenas parcialmente verdadeira.

## D.4 Diferenças entre Local, Preview e Production

| Ambiente | Diferença relevante | Risco |
|---|---|---|
| Local | Default `STORAGE_DRIVER=local`, disco persistente local e PostgreSQL Docker (`src/shared/infrastructure/config/env.ts:9-25`). | Pode mascarar CORS, URLs assinadas, cold start e falhas do S3. |
| Preview | Branches separadas e Vercel Authentication; documentação registra build/health/login e PUT 5 MiB em 23/10 (`todo.md:124-170`). | Estado atual não foi reconfirmado; rota `/register` nos Previews antigos estava ausente segundo `docs/CADASTRO_E_DEPLOY.md:5-15`. |
| Production | Variáveis, banco e storage próprios; documentação registrava ausência de deployment em 23/10. | Não há evidência atual de migrations, CORS, bucket, domínio, cron ou smoke em Production. Não presumir funcionamento. |

### Conferências manuais ainda obrigatórias

1. **Vercel:** plano continua Hobby sem trial/cartão; uso é elegível; deployment Production atual; commit implantado; Node 22, `gru1` e Fluid; todas as variáveis por ambiente; Deployment Protection; cron ativo; invocações/CPU/memória/transferência/logs abaixo dos gates.
2. **Neon DB:** projeto Free, região São Paulo, 1 GB/100 CU-h vigentes na conta, endpoint `-pooler`, branches corretas, tamanho/compute/conexões atuais e migrations por ambiente.
3. **Neon Storage:** entitlement de 5 GB no projeto concreto, região, bucket Production privado, CORS exato, credencial com menor privilégio, endpoints distintos, isolamento de branch, uso atual e expiração de PUT/GET.
4. **Aplicação:** domínio definitivo público, Auth.js, convite, CRUD, todos os jogos, refresh/cold start, sessão de 50 min, encerramento/limpeza de imagens e duas execuções idempotentes do cron.

# E. Funcionalidades recuperáveis gratuitamente

| Prioridade | Recuperação | Solução gratuita e sustentável | Pré-condição | Esforço |
|---|---|---|---|---|
| 1 | Limites originais de mídia | Manter PUT direto e voltar a limites separados por tipo. Pode-se restaurar 10 MB de imagem e 25 MB de áudio ou adotar limites medidos. | Implementar exclusão/GC, quota por usuário e alerta de capacidade primeiro. | Baixo/médio |
| 2 | My Media | Criar listagem paginada, seleção/reuso e exclusão segura; impedir exclusão enquanto referenciada ou oferecer remoção explícita das referências. | Definir política para revisões publicadas e objetos órfãos. | Médio |
| 3 | Temas salvos | Expor CRUD sobre a tabela existente e seleção no editor. | Definir se alteração de tema afeta apenas drafts futuros ou snapshots. | Médio |
| 4 | Recuperação de conta | Gerar token de reset de uso único por CLI/admin, com hash, validade curta e incremento de `authVersion`; entregar por canal privado. | Processo operacional e auditoria básica. | Médio |
| 5 | Uso simultâneo mais econômico | Reduzir polling quando aba estiver oculta, usar backoff e `ETag`/sequence para evitar resposta completa sem mudança. | Medir invocações antes/depois. | Baixo/médio |
| 6 | Realtime, se futuramente necessário | WebSocket da Vercel agora existe em beta e é gratuito dentro das franquias, mas exige reconexão e estado/pub-sub externo; SSE também é opção. | Só após dados mostrarem que polling prejudica UX/cota. Não faz parte do MVP atual. | Alto |
| 7 | Resiliência a URL externa | Permitir ao professor copiar uma mídia externa para o bucket próprio, sujeito à autorização/direitos, ou exibir diagnóstico de recurso indisponível. | Avaliar copyright, privacidade e segurança; evitar fetch arbitrário pelo servidor. | Médio/alto |

Reintroduzir Google OAuth ou Magic Link não deve ser apresentado como automaticamente gratuito: depende da conta/provedor e de operação de e-mail. A alternativa de menor risco e custo é melhorar o fluxo convencional já implementado.

# F. Riscos e problemas técnicos

| ID | Severidade | Achado | Probabilidade | Impacto | Classificação e evidência |
|---|---|---|---|---|---|
| F-01 | **P0** | ADMIN rebaixado conserva papel no JWT até nova sessão | Alta quando houver rebaixamento | Acesso administrativo indevido | **Confirmado.** `src/modules/admin/application/admin-service.ts:22-25`; `src/modules/auth/infrastructure/auth.ts:41-64`; autorização confia na sessão em `src/modules/auth/application/authorization.ts:17-20`. |
| F-02 | **P0** | Uso institucional/comercial pode violar Hobby | Desconhecida; depende da operação | Serviço pode ficar inelegível ao plano escolhido | **Limitação documentada.** [Fair Use](https://vercel.com/docs/limits/fair-use-guidelines); decisão anterior em `todo.md:35-40`. |
| F-03 | **P0 release gate** | Production e validação externa completa não comprovadas | Alta: itens estão marcados pendentes | Falhas só aparecerem para professores reais | **Exige validação.** `todo.md:155-185,200-218`; `docs/CADASTRO_E_DEPLOY.md:5-15`. |
| F-04 | **P1** | Separar Grupos/Board dá pontos repetidamente | Alta; basta clicar novamente | Placar incorreto em aula | **Confirmado.** `src/modules/game-templates/group-sort/ui/group-sort-template.tsx:43-50,75-82`. |
| F-05 | **P1** | `allowMultiple=false` no Quiz não altera comportamento | Alta em pergunta com múltiplas corretas | Configuração mente ao professor | **Confirmado.** Config em `src/modules/game-templates/index.ts:24-29`; UI ignora a propriedade em `src/modules/game-templates/quiz/ui/quiz-template.tsx:19-43`. |
| F-06 | **P1** | Mídia pronta/orfã nunca é coletada | Alta com uso contínuo | Esgota 5 GB; objetos ficam sem gestão | **Confirmado.** APIs sem DELETE e cleanup apenas de `pending`: `src/modules/media/application/media-service.ts:127-137`; `src/app/api/media/[id]/route.ts:7-35`. |
| F-07 | **P1** | Exclusão de usuário pode falhar por FKs e pode orfanar objetos | Média | Painel retorna erro; conta não é removida; storage diverge do DB | **Confirmado pelo schema/código.** DELETE simples em `src/modules/admin/application/admin-service.ts:29-35`; revisões e SAC têm FKs sem cascade/restrict (`src/shared/infrastructure/database/schema.ts:141-149,266-295`); media DB tem cascade mas objeto S3 não é apagado (`:184-203`). |
| F-08 | **P1** | Variáveis críticas não são validadas como obrigatórias em produção | Média | Deployment “verde” com auth/cron/storage quebrados | **Confirmado.** Defaults/opcionais em `src/shared/infrastructure/config/env.ts:7-34`, contra runbook `docs/VERCEL_FREE_MIGRATION.md:95-115`. |
| F-09 | **P1** | Autosaves sobrepostos e não atômicos | Média sob edição/rede lenta | Draft ou Presentation mais nova pode ser sobrescrita; estado “Salvo” enganoso | **Risco provável.** Requisições independentes/concorrentes em `src/modules/activities/ui/activity-editor.tsx:68-84`; sem version/abort/ETag. |
| F-10 | **P1** | Registros de sessões/eventos não têm retenção | Alta ao longo do tempo | Consome 1 GB de Postgres | **Confirmado como ausência de rotina.** Tabelas em `src/shared/infrastructure/database/schema.ts:215-264`; cron só chama limpeza de mídia em `src/app/api/cron/cleanup-media/route.ts:16-25`. |
| F-11 | **P1** | Cleanup limitado a 100/dia e uma falha de delete aborta o laço | Média em backlog/erro S3 | Lixo acumula mais rápido que a limpeza | **Risco provável.** `src/modules/media/application/media-service.ts:127-137`; `src/modules/game-sessions/infrastructure/temporary-team-image-store.ts:191-200`; cron diário `vercel.json:5-9`. |
| F-12 | **P1** | Imagem de equipe pronta expira em 24 h mesmo com sessão ativa | Baixa/média | Avatar desaparece em sessão prolongada/reaberta | **Confirmado por regra.** `src/shared/infrastructure/config/env.ts:22-25`; `src/modules/game-sessions/infrastructure/temporary-team-image-store.ts:65-67,136-137`. |
| F-13 | **P1** | Polling cresce linearmente com espectadores | Média em várias turmas | Invocações/DB/compute e latência; possível pausa por franquia | **Risco provável.** `src/modules/game-sessions/ui/game-session-shell.tsx:136-149`; sem teste de carga. |
| F-14 | **P1** | Comandos duplicados por duas abas/controladores podem ser aplicados duas vezes | Baixa/média | Pontos/avanços duplicados | **Risco provável.** Lock serializa, mas só rejeita sequência esperada quando ela é enviada; campo é opcional (`src/modules/game-sessions/domain/session.ts:73-81`; `src/modules/game-sessions/domain/session-reducer.ts:139-168`). |
| F-15 | **P2** | Tema aceita qualquer URL sintaticamente válida, mas produção só permite conteúdo HTTPS | Média | Fundo salvo não carrega; mixed content/CSP | **Confirmado.** `src/modules/themes/domain/theme-values.ts:5-18`; uso em `src/modules/game-templates/ui/game-renderer.tsx:26-40`; CSP em `next.config.ts:18-29`. |
| F-16 | **P2** | URL externa pode expirar, bloquear hotlink, mudar ou rastrear | Média | Conteúdo quebrado/privacidade em aula | **Risco inerente.** Browser acessa o host diretamente; `src/shared/domain/content-blocks.ts:14-45`; `next.config.ts:24`. |
| F-17 | **P2** | README informa limites antigos de 10/25 MB | Alta para operadores/desenvolvedores | Expectativa e suporte incorretos | **Confirmado.** `README.md:30-35` contradiz `src/modules/media/domain/media-validation.ts:3-29`. |
| F-18 | **P2** | Login attempts de identificadores inexistentes não têm retenção | Média sob abuso | Crescimento de DB e ausência de rate limit por origem | **Confirmado como ausência de limpeza.** Tabela em `src/shared/infrastructure/database/schema.ts:50-61`; upsert em `src/modules/auth/application/password-authentication.ts:70-85,138-165`; cron não inclui auth. |
| F-19 | **P2** | Mobile/acessibilidade não têm suíte automatizada nem aparelhos reais | Média | Barreiras em celulares/leitores de tela não detectadas | **Exige validação.** Apenas Desktop Chrome em `playwright.config.ts:22`; CSS fornece indícios, não prova aceite. |
| F-20 | **P2** | Cold start e sessão longa ainda sem evidência atual | Média | Primeiro acesso lento/timeout; drift ou perda de UX | **Exige validação.** `todo.md:165-185`; scale-to-zero Neon e timeout local de 10 s em `src/shared/infrastructure/database/client.ts:6-12`. |

Não foram executados testes de desempenho. Nenhum número de professores/sessões simultâneas deve ser tratado como capacidade comprovada.

# G. Plano de ação priorizado

## P0 — Crítico

| Ação | Esforço | Dependências | Critério de aceite |
|---|---|---|---|
| Corrigir revogação/atualização de role em sessões JWT | Baixo | Decidir entre reler `role` a cada callback e incrementar `authVersion` ao trocar role; adicionar teste de integração | ADMIN autenticado é rebaixado; na requisição seguinte recebe 403 em todas as rotas/páginas admin sem precisar logout. Promoção também se reflete conforme política definida. |
| Reconfirmar e registrar elegibilidade real ao Hobby antes de Production | Baixo, operacional | Descrever operador, finalidade, eventual remuneração/instituição; consultar suporte Vercel se houver dúvida | Registro atual e inequívoco de que o deployment concreto atende Fair Use. Se não atender, **não publicar no Hobby** e reavaliar hospedagem gratuita compatível, sem iniciar plano pago. |
| Fechar gate de Preview/Production | Médio | P0 de role corrigido; ambientes isolados; autorização explícita | Commit exato em Preview; integração/E2E, CRUD, seis jogos, convite/login/logout, mídia válida/inválida, GET/expiração, cron idempotente, cold start e soak aprovados; métricas <70%; go/no-go registrado. Só então considerar Production. |

## P1 — Importante

| Ação | Esforço | Dependências | Critério de aceite |
|---|---|---|---|
| Impedir pontuação repetida no Group Sort Board | Baixo | Definir se acerto encerra board ou apenas bloqueia verificação | Segundo clique/reenvio não altera score; teste de componente/domínio cobre repetição e concorrência. |
| Fazer `allowMultiple` refletir a regra real ou remover a opção | Baixo | Definir comportamento quando conteúdo tem várias corretas e config desliga múltiplas | Preview e sessão respeitam config; schema/UI impedem estado impossível; testes cobrem ambas as opções. |
| Implementar ciclo de vida de mídia pronta | Médio/alto | Política para snapshots/revisões, soft delete e retenção | Usuário lista/reusa/exclui com segurança; objetos não referenciados são removidos; reconciliação DB↔bucket é idempotente; nenhum snapshot publicado quebra silenciosamente. |
| Tornar configuração de produção fail-fast | Baixo | Mapear `VERCEL`, Preview e Production | Build/start ou health falha claramente quando `AUTH_SECRET`, `CRON_SECRET`, `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`, S3 ou URL pooled obrigatórios faltam; segredos não são logados. |
| Serializar autosave e detectar conflito | Médio | Escolher revision/version ou fila client-side | Só um save ativo por Activity; resposta antiga não marca nova edição como salva; falha de uma Presentation é visível e recuperável; teste com latência/reordenação. |
| Corrigir exclusão de usuário | Médio | Política de retenção/autoria de revisões e SAC; storage cleanup | UI explica/bloqueia dependências ou reassocia/anônimiza em transação; sessões são invalidadas; objetos S3 correspondentes têm destino definido; sem 500 genérico. |
| Criar retenção para sessões, eventos e tentativas de login | Médio | Política de prazo; backup/observabilidade | Job idempotente e paginado; sessão ativa nunca é apagada; volume estabiliza; execução cabe no cron diário e pode continuar em lotes. |
| Tornar cleanup tolerante a falhas/backlog | Médio | Métricas mínimas e política de retries | Falha em um objeto não impede os demais; cursor/lotes drenam >100 itens em execuções sucessivas; divergências ficam observáveis; duas execuções são seguras. |
| Vincular TTL de imagem à sessão | Baixo/médio | Política para sessões abandonadas | Imagem não expira enquanto sessão está ativa/pausada dentro do prazo suportado; finalizar remove síncronamente; abandonadas são limpas. |
| Validar concorrência sem teste de carga em Production | Médio | Banco/Preview descartável; limite seguro de tráfego | Teste controlado e autorizado em ambiente isolado mede 2, 5, 10 professores/sessões/espectadores; registra p95, erros, invocações e conexões. Interrompe antes de franquias definidas. |

## P2 — Melhoria

| Ação | Esforço | Dependências | Critério de aceite |
|---|---|---|---|
| Corrigir documentação de limites e estado de deploy | Baixo | Nenhuma | README, runbook e UI mostram os mesmos limites e distinguem Preview histórico de estado atual. |
| Reavaliar/restaurar limites de mídia | Baixo/médio | Lifecycle/quota P1 concluídos; teste real | Limite por tipo documentado, validado no cliente/API/bucket; uso estimado e alerta definidos. |
| Implementar My Media e temas reutilizáveis | Médio | APIs/lifecycle e decisão de escopo | Professor encontra e reutiliza asset/tema sem novo upload; ownership e snapshots permanecem corretos. |
| Restringir/validar URL de fundo e melhorar URLs externas | Baixo/médio | Política de origem | Apenas HTTPS público aceito; erro aparece antes de publicar; recursos quebrados têm fallback acessível. |
| Matriz mobile e acessibilidade | Médio | Aparelhos/navegadores e ferramenta automatizada local | Chrome/Safari/Firefox mobile, teclado, foco, contraste, reduced motion e ao menos um leitor de tela aprovados nos fluxos críticos. |
| Otimizar polling | Baixo/médio | Medição de baseline | Pausa em aba oculta, backoff/sequence, nenhuma regressão de atualização e redução mensurável de invocações. |

## P3 — Futuro

| Ação | Esforço | Dependências | Critério de aceite |
|---|---|---|---|
| Avaliar SSE/WebSocket somente com necessidade comprovada | Alto | Métricas mostrarem limite do polling; beta da Vercel aceitável | Reconnect/resync, estado durável, limite de 300 s e consumo gratuito testados; fallback funcional. |
| Reavaliar OAuth/Magic Link | Médio/alto | Provedor realmente gratuito, sem cartão/cobrança, e política de recuperação | Login e vínculo de conta sem duplicidade; fallback convencional preservado; nenhum custo oculto. |
| Observabilidade mínima própria | Médio | Política de privacidade e retenção | Contadores de falha/latência/cleanup sem segredos/URLs assinadas, úteis apesar de logs Vercel de 1 hora. |

# H. Conclusão

## 1. O EduParque perdeu funcionalidades importantes por causa da migração?

**Sim, mas menos do que a preocupação inicial sugere.** A perda mais perceptível foi autenticação conveniente (Google/Magic Link e recuperação por e-mail) e a redução de 10/25 MB para 5 MiB. Upload de arquivo, persistência de sessão, seis jogos, biblioteca, favoritos e remix não foram removidos. URLs externas são uma opção adicional. Imagens de equipes ficaram mais robustas ao migrar de `/tmp` para storage durável.

My Media e temas reutilizáveis continuam incompletos, mas as evidências não mostram que tenham sido removidos pela migração; eram capacidades previstas que nunca chegaram ao fluxo completo.

## 2. Existem limitações que ainda não percebemos?

**Sim.** As principais são: papel ADMIN não revogado no JWT, pontuação repetida no Group Sort, configuração `allowMultiple` ineficaz, falta de exclusão/GC de mídia pronta, crescimento sem retenção de sessões/eventos/login attempts, TTL de imagem de equipe independente da sessão, cron diário impreciso e com lote pequeno, autosave não atômico, Preview protegido não servir como link público e elegibilidade estrita do Hobby.

## 3. Fizemos alguma concessão desnecessária?

**Sim.** O teto uniforme de 5 MiB não é imposto pelo limite de 4,5 MB da Vercel porque os bytes vão direto ao bucket. Ele pode ser revisto depois de corrigir o ciclo de vida/capacidade. Remover OAuth/Magic Link também não foi tecnicamente imposto pela Vercel; foi uma decisão operacional para evitar Google Cloud/SMTP. Já abandonar `/tmp` e adotar upload direto eram mudanças necessárias e corretas.

## 4. O que podemos recuperar sem gastar dinheiro?

É possível restaurar limites maiores por tipo, My Media, temas reutilizáveis, reset por token operado sem e-mail, melhor retenção/cleanup, otimização de polling e validação mobile/a11y sem contratar plano. OAuth/Magic Link só devem voltar se o provedor concreto for comprovadamente gratuito e operacionalmente aceitável.

## 5. A arquitetura atual suporta adequadamente o MVP?

**Sim, em arquitetura e para escala inicial pequena**, com Vercel em `gru1`, Neon pooled, upload direto S3 e estado no Postgres. Ela não depende de computador local ligado. Porém, capacidade simultânea e longa duração ainda são **não verificadas**; o polling e o crescimento de dados exigem medição e retenção. A resposta é condicional à elegibilidade do Hobby e aos gates de Preview.

## 6. O que deve ser corrigido antes de disponibilizar para outros professores?

Na ordem:

1. corrigir a revogação de ADMIN;
2. confirmar por escrito a elegibilidade Hobby;
3. corrigir pontuação repetida e `allowMultiple`;
4. tornar configuração de produção fail-fast;
5. definir/executar ciclo de vida de mídia e dados;
6. fechar o checklist real de Preview: integrações/E2E, seis jogos, mídia negativa/expiração, cron, cold start, sessão de 50 min, mobile e acessibilidade;
7. confirmar banco/bucket/variáveis/CORS/quotas de Production e registrar go/no-go;
8. publicar somente após autorização explícita e executar smoke no domínio definitivo.

Até esses itens serem concluídos, o EduParque é um **MVP tecnicamente promissor e localmente consistente, mas ainda não aprovado para uso compartilhado em produção**.
