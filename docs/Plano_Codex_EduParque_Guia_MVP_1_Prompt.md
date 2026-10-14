# EduParque — implementação do guia essencial em 1 prompt

**Documento de referência:** `PRD_EduParque_Guia_MVP_Enxuto.md` (versão 1.1)  
**Reasoning recomendado:** High  
**Execução:** enviar o prompt abaixo uma única vez ao Codex, dentro do repositório do EduParque.  
**Observação:** se o PRD estiver em `docs/` ou outro diretório, o Codex deve localizá-lo. O PRD antigo não deve ser tratado como fonte de escopo.

## Prompt único — auditar, implementar e validar

```text
Você está no repositório do EduParque. Sua tarefa é implementar o MVP de
ajuda descrito em "PRD_EduParque_Guia_MVP_Enxuto.md" (versão 1.1).
Localize e leia esse documento por completo. Se estiver disponível,
consulte "entendimento_consolidado_produto.md" como contexto, mas use
EXCLUSIVAMENTE o PRD enxuto para definir o escopo da ajuda. Não implemente
as funcionalidades adicionais do PRD antigo de tutoriais.

OBJETIVO
Permitir que um professor iniciante (1) encontre e jogue uma atividade
pronta, (2) crie e publique sua primeira atividade e (3) consulte
instruções sobre o jogo durante uma sessão, sem alterar a lógica existente.

TRABALHE EM TRÊS FASES, NA MESMA EXECUÇÃO:

FASE 1 — AUDITORIA RÁPIDA (ANTES DE EDITAR)
1. Inspecione o roteamento, layout compartilhado, autenticação, biblioteca,
   editor, publicação, pré-visualização, sessão e componentes visuais.
2. Identifique rotas e ações REAIS para jogar atividade pública e para
   criar/publicar; identifique onde cabe um link global "Ajuda".
3. Verifique quais jogos e modos estão efetivamente disponíveis. Considere
   Quiz, Matching/Connect/Memory, Random Wheel, Group Sort/Board/One by One,
   Unscramble e Team Grid apenas quando comprovados no código.
4. Localize onde adicionar "Como jogar?" durante a sessão sem interferir
   em timer, pontuação, equipes, turnos, controles ou projeção.
5. Defina a menor implementação compatível com os padrões do projeto.
   Não crie relatório de auditoria extenso. Registre ao final as principais
   evidências e divergências entre o PRD e a interface existente.

FASE 2 — IMPLEMENTAÇÃO DO MVP
Implemente somente estas quatro entregas:

A. AJUDA GLOBAL
- Adicione um link/botão "Ajuda" na navegação principal existente.
- Crie uma página simples de ajuda (use /ajuda apenas se for coerente
  com o roteamento), com acesso aos dois guias e à seção "Como funcionam
  os jogos?".
- Use linguagem clara em pt-BR; sem pesquisa, filtros, artigos complexos
  ou painel administrativo.

B. DOIS GUIAS PASSO A PASSO
- Crie UM componente reutilizável e discreto de painel de guia, com:
  título, instrução curta, "Passo N de M", "Voltar", "Próximo", "Fechar"
  e, quando fizer sentido, "Ir para esta tela" apontando para rota real.
- Guia 1: encontrar atividade pública → abrir → escolher forma de jogar,
  se disponível → iniciar partida → localizar ajuda durante a sessão.
- Guia 2: autenticar-se quando necessário → abrir criação → preencher
  conteúdo → configurar jogo/aparência → pré-visualizar, se disponível →
  publicar EXPLICITAMENTE → visualizar/compartilhar, se disponível.
- Ajuste passos e nomenclatura à interface REAL. O usuário avança
  MANUALMENTE; nunca afirme que uma operação foi concluída só porque
  ele clicou em "Próximo". O guia jamais salva ou publica pelo usuário.
- Se for fácil manter o painel entre rotas usando o layout existente,
  faça-o com estado em memória. Caso exija arquitetura nova ou grande
  acoplamento, mantenha os passos na página de ajuda com links para
  telas reais. Reabrir pode reiniciar o guia; sessionStorage é opcional,
  não é requisito para lançar.

C. EXPLICAÇÕES POR JOGO
- Em arquivo estático local, escreva no máximo quatro tópicos curtos
  para cada jogo REALMENTE existente: objetivo, como iniciar, como jogar
  uma rodada e como encerrar.
- Descreva variantes somente quando presentes. Não crie novos jogos,
  modos, configurações ou fluxos para corresponder ao texto do guia.

D. AJUDA DURANTE A PARTIDA
- Reutilize ou adicione um controle discreto "Como jogar?"/"?" na
  interface de sessão, acionado SOMENTE pelo professor.
- Mostre as instruções do jogo atual quando identificar seu tipo por
  integração simples; caso contrário, ofereça link direto à seção
  pertinente da ajuda. Não construa mecanismo complexo para descobrir
  o contexto.
- Fechar a ajuda deve devolver o usuário à sessão sem alterar estado.

RESTRIÇÕES INEGOCIÁVEIS
- Não criar tour engine, spotlight, âncoras data-tour-id, verificação
  automática de ações, máquinas de estados ou checkpoints.
- Não criar tabelas, migrações, endpoints, sincronização de progresso,
  analytics, feedback persistente, flags novas ou serviço externo.
- Não criar demo isolada, mecanismo de reset ou função nova de remix.
- Não adicionar bibliotecas salvo necessidade técnica incontornável;
  prefira componentes e padrões já presentes.
- Não alterar domínio central, autenticação, ownership, regras de
  publicação, GameSession, timer, placar, turnos ou lógica dos jogos.
- Não inventar rotas, controles ou funcionalidades inexistentes.
- Não abrir nenhum guia automaticamente durante uma partida.
- Manter acesso por teclado, foco visível, fechamento acessível,
  layout responsivo e controles essenciais desobstruídos.
- Não executar migrations ou ações destrutivas. Preserve dados reais.
- Quando um detalhe do PRD exigir mudanças desproporcionais, escolha
  o fallback mais simples previsto nele e registre a limitação.

FASE 3 — QUALIDADE E ENTREGA
1. Execute lint, typecheck, testes pertinentes e build conforme os scripts
   reais do repositório. Registre qualquer teste que não pôde executar.
2. Cubra com testes proporcionais, se houver infraestrutura existente:
   navegação dos guias, links válidos, fechar/teclado, acesso de visitante
   a conteúdo público e ausência de mutações do estado do jogo pela ajuda.
3. Faça uma verificação manual ou E2E, quando possível, dos três caminhos:
   jogar atividade pública; criar e publicar com ações explícitas;
   abrir/fechar ajuda durante uma partida.
4. Evite refatorações gerais e correções não relacionadas ao módulo.
5. Entregue um resumo FINAL contendo:
   - Rotas/componentes reais identificados e eventuais divergências;
   - Funcionalidades implementadas e arquivos alterados;
   - Comandos de verificação e resultados (inclusive falhas);
   - Checklist de teste manual reproduzível dos 3 caminhos;
   - Limitações que permaneceram e melhorias adiadas.

CRITÉRIO DE SUCESSO
O EduParque deve oferecer ajuda clara e utilizável para jogar, criar e
publicar atividades, além de instruções sob demanda durante sessões,
SEM transformar a ajuda em um subsistema complexo. Execute auditoria,
implementação e validação nesta mesma solicitação; não pare entre fases
para pedir novos prompts. Se houver impeditivo real, documente-o e
conclua as partes independentes com segurança.
```

## Validação humana após a execução

Peça a 3–5 professores para realizar, sem sua orientação oral: (1) encontrar e iniciar atividade pública, (2) criar e publicar uma atividade de teste, (3) abrir instruções no meio de uma partida. Observe hesitações e pedidos de ajuda. Corrija problemas recorrentes da própria interface antes de ampliar os tutoriais.
