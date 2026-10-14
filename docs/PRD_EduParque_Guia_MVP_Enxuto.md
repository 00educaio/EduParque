# PRD — EduParque | Guia Interativo Essencial (MVP Enxuto)

**Versão:** 1.1 — proposta de redução de escopo  
**Base:** `PRD_EduParque_Tutoriais_v1(1).md`, de 13/10/2026  
**Status:** proposta para validação após inspeção do código  
**Produto:** EduParque

## 1. Decisão de produto

O MVP do módulo de ajuda **não será uma plataforma de onboarding**. Será uma camada leve de orientação, integrada às telas existentes, para que professores consigam: (a) encontrar e jogar uma atividade; (b) criar e publicar uma atividade; e (c) consultar instruções rápidas durante a aula.

A ajuda deve explicar **ações reais que a interface já permite**, não criar novos modos de jogo, fluxos de demonstração, permissões ou mecanismos de publicação.

### Resultado esperado

Um professor iniciante consegue seguir instruções curtas enquanto usa a aplicação e retornar ao guia sempre que quiser. Um professor experiente consegue ignorar a ajuda completamente.

## 2. Escopo incluído — apenas quatro entregas

### E1. Ponto de entrada e página de ajuda

- Um botão/link visível **Ajuda** na navegação principal, conforme layout existente.
- Uma página simples (sugestão: `/ajuda`, condicionada ao roteamento real) com **dois caminhos principais**:
  - **Quero jogar uma atividade pronta**.
  - **Quero criar minha primeira atividade**.
- Na mesma página, uma seção compacta **Como funcionam os jogos?**, com explicações curtas dos tipos realmente implementados.
- Textos em português claro, sem exigir familiaridade com termos internos como `Activity`, `Presentation` ou `GameConfig`.
- Sem barra de pesquisa, sem filtros, sem base de artigos, sem editor administrativo.

### E2. Dois guias passo a passo, usando a UI existente

Criar **um único componente reutilizável** de guia: um painel pequeno, não bloqueante, com título, instrução, contador `Passo N de M`, botões **Voltar**, **Próximo** e **Fechar**, e, quando útil, um botão/link **Ir para esta tela**.

- O painel deve continuar acessível ao navegar entre telas do fluxo, se a estrutura de layout existente permitir isso sem acoplamento complexo.
- O professor avança **manualmente**. Não monitorar cliques, não inferir ações concluídas e não chamar “tarefa concluída” o simples avanço de etapa.
- O guia deve poder ser fechado a qualquer momento. Uma reabertura pode iniciar do começo; opcionalmente guardar **somente guia ativo e índice do passo** em `sessionStorage`, com fallback em memória. Não salvar conta, histórico nem métricas.
- Não implementar `spotlight`, máscaras, âncoras `data-tour-id`, detecção automática de rotas/alvos, checkpoints, estados de recuperação ou tour engine.
- Se um fluxo atravessar uma tela em que o painel não possa permanecer sem mudanças relevantes, usar a página `/ajuda` como passo a passo com links para os pontos existentes, **em vez de criar infraestrutura para sustentá-lo**.

**Guia A — Jogar atividade pronta (prioridade máxima)**

1. Acesse a biblioteca de atividades disponíveis.
2. Escolha uma atividade pública e abra seus detalhes.
3. Selecione a forma de jogar, quando a aplicação oferecer opções.
4. Use a ação de iniciar partida existente.
5. Consulte “Como jogar” caso tenha dúvidas durante a sessão.

**Guia B — Criar minha primeira atividade**

1. Faça login/cadastro, apenas se ainda não estiver autenticado.
2. Entre no fluxo de criação e selecione o tipo de atividade suportado.
3. Adicione o conteúdo solicitado pelo editor.
4. Configure o jogo e sua aparência, caso deseje.
5. Utilize a pré-visualização, se a interface existente oferecer essa ação.
6. Publique explicitamente e encontre a opção de visualizar/compartilhar.

> Os textos acima são intenções de fluxo, não afirmações de que botões ou URLs específicos existem. O Codex deverá conferir a interface real antes de escrever as instruções definitivas.

### E3. Ajuda curta por jogo

Manter um catálogo **estático** em código, com **até quatro informações por tipo**: objetivo do jogo, como iniciar, como realizar uma jogada e como encerrar. Incluir apenas os tipos/modos comprovadamente presentes no repositório.

A lista de referência do PRD original é: Quiz, Matching (incluindo Connect/Memory quando existentes), Random Wheel, Group Sort (Board/One by One quando existentes), Unscramble e Team Grid. Esse catálogo **não** cria tutoriais individuais interativos, nem promete configurações não implementadas.

### E4. Ajuda disponível durante uma partida

- Exibir um controle **Como jogar / ?** em local compatível com a tela de sessão existente ou reaproveitar controle de ajuda já existente.
- Ao acioná-lo, exibir somente as instruções curtas correspondentes ao tipo atual, ou um link claro para a seção relevante se a identificação contextual demandar integração excessiva.
- Não abrir automaticamente. Não pausar, reiniciar ou alterar timer, placar, equipes, turnos, respostas ou estado da partida.
- O painel deve poder ser fechado facilmente, funcionar por teclado e não ocultar controles essenciais.

## 3. O que deliberadamente sai do MVP

| Recurso do PRD original | Decisão | Justificativa |
|---|---|---|
| Tour engine com `data-tour-id`, verificações automáticas, máquina de estados e fallbacks extensos | **Remover** | É a principal fonte de complexidade, manutenção e acoplamento com a UI. |
| Banco de progresso e sincronização local/servidor | **Remover** | Não é preciso saber onde o usuário parou para orientar dois fluxos curtos. |
| Demo isolada, reset e cópia/remix da demo | **Remover** | Priorizar atividade pública real já disponível, sem criar outro ambiente. |
| Busca textual, sinônimos, filtros e dezenas de artigos | **Remover** | Poucos tópicos cabem em uma página organizada. |
| Telemetria, comentários, votos útil/não útil e relatórios | **Remover** | Validar primeiro com observação direta de professores. |
| Convite/modal na primeira visita | **Adiar** | O botão de Ajuda deve ser descoberto sem interromper navegação; convite só se testes indicarem baixa descoberta. |
| Capturas de tela, animações e vídeos | **Adiar** | Incluir imagens reais apenas se reduzirem dúvidas observadas. |
| Seis tours interativos específicos por jogo | **Remover** | Substituir por seis resumos curtos, quando os seis tipos existirem. |
| Feature-flag própria, rollout avançado e editor de conteúdo | **Remover** | Usar práticas de deploy e rollback já adotadas pelo projeto. |
| IA, chatbot, gamificação, certificados e novas permissões | **Fora de escopo** | Não contribuem para executar as tarefas fundamentais. |

## 4. Comportamento e UX

- **Sob demanda:** nada abre sozinho durante a partida. Fora dela, nenhuma etapa pode impedir o uso normal.
- **Aprender fazendo:** o guia explica o próximo passo e leva à tela real; não simula ações nem altera os dados para o usuário.
- **Linguagem:** uma instrução curta por passo e nomes dos controles tal como aparecem na UI verificada.
- **Acessibilidade básica obrigatória:** botões nomeados, foco visível, Escape/Fechar quando aplicável, retorno de foco e painel utilizável por teclado.
- **Mobile/desktop:** não encobrir controles; reutilizar componentes responsivos existentes.
- **Privacidade e segurança:** nenhuma coleta nova de dados; não registrar conteúdo de atividades, alunos ou respostas. Autoria e publicação continuam protegidas pelos mecanismos atuais.

## 5. Implementação técnica mínima

A implementação deve **reutilizar o framework, layout, roteador e componentes de UI do repositório**. Espera-se, em termos conceituais:

- Uma página de ajuda ou seção equivalente.
- Um componente de guia com poucos estados em memória (guia selecionado + índice do passo + aberto/fechado).
- Um arquivo TypeScript/JSON local contendo os passos e resumos por jogo.
- Um link global de ajuda e uma entrada contextual simples na sessão.

**Não adicionar** migração de banco, tabela, endpoint de API, biblioteca de tour, analytics, filas, serviço externo ou refatoração do domínio. Se um recurso do guia exigir qualquer um desses itens, simplificar o guia antes de implementar.

### Exemplo conceitual de dados (não é contrato definitivo)

```ts
type GuideStep = {
  title: string;
  description: string;
  href?: string;      // Somente rota real e autorizada
  actionLabel?: string;
};

type Guide = {
  id: 'play' | 'create';
  title: string;
  steps: GuideStep[];
};
```

Não interpretar o índice do passo como prova de que uma operação foi executada. A **verificação do resultado** fica para o teste de usabilidade e para os fluxos existentes da aplicação.

## 6. Critérios de aceite

- [ ] O repositório foi inspecionado e as instruções foram alinhadas a rotas, nomes e ações realmente existentes.
- [ ] Ajuda pode ser aberta e fechada a partir da navegação principal.
- [ ] A pessoa acessa os dois guias, avança e volta manualmente, e consegue seguir os links para telas reais.
- [ ] Os guias não se apresentam como verificadores automáticos de conclusão.
- [ ] Visitante pode seguir a orientação para jogar conteúdo público sem criar conta, respeitando as regras atuais.
- [ ] Professor autenticado consegue usar o guia de autoria sem que ele salve ou publique dados automaticamente.
- [ ] Os jogos existentes têm descrições curtas e corretas, sem funcionalidades fictícias.
- [ ] A ajuda em sessão é solicitada pelo professor e não afeta estado, timer, pontuação ou turnos.
- [ ] O guia funciona em desktop e mobile, pode ser fechado por teclado e não bloqueia controles essenciais.
- [ ] Nenhuma tabela, API, serviço, tour engine ou dependência externa nova é introduzida apenas para a ajuda.

## 7. Validação enxuta

Convidar de **3 a 5 professores** com diferentes níveis de familiaridade tecnológica e observar três tarefas, sem explicar o sistema verbalmente:

1. Encontrar uma atividade e iniciar a partida.
2. Criar, pré-visualizar (se houver) e publicar uma atividade de teste.
3. Durante uma partida, descobrir onde encontrar instruções.

Registrar se houve sucesso, onde a pessoa hesitou e se pediu ajuda humana. Se vários professores tropeçarem no mesmo botão, **priorizar corrigir a interface**, não adicionar mais camadas ao guia.

## 8. Limites de decisão para o Codex

Antes de editar, listar brevemente rotas, componentes, tipos de jogo e ações confirmados no código. Se houver divergências em relação a este documento, seguir o **comportamento real**, apontar a divergência e manter a solução mais simples possível. Não inventar botão, rota ou operação, não contornar permissões e não modificar a lógica de jogo para acomodar um tutorial.

### Definição de pronto

O MVP está pronto quando um professor consegue abrir um guia curto, seguir ações existentes no EduParque, fechar/retomar a consulta à ajuda e obter explicações durante uma partida **sem qualquer impacto na funcionalidade principal**. Não depende de motor de tours, sincronização, demo isolada ou analytics.
