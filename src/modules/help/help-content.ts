export type GuideStep = {
  title: string;
  description: string;
  href?: "/library" | "/login" | "/my-activities" | "/ajuda#como-funcionam-os-jogos";
  actionLabel?: string;
};

export type HelpGuide = {
  id: "play" | "create";
  title: string;
  summary: string;
  steps: readonly GuideStep[];
};

export const helpGuides: readonly HelpGuide[] = [
  {
    id: "play",
    title: "Quero jogar uma atividade pronta",
    summary: "Encontre uma atividade pública, prepare a turma e abra a sessão.",
    steps: [
      {
        title: "Abra a Biblioteca pública",
        description: "Explore as atividades disponíveis ou use a busca por título, descrição ou tag.",
        href: "/library",
        actionLabel: "Ir para a Biblioteca",
      },
      {
        title: "Escolha uma atividade",
        description: "Use “Ver atividade” para abrir os detalhes e experimentar a prévia sem alterar placar ou pontuação.",
        href: "/library",
        actionLabel: "Ver atividades",
      },
      {
        title: "Escolha como jogar",
        description: "Se houver mais de uma apresentação, selecione a desejada acima da prévia. Depois, use “Configurar” ou “Iniciar sessão”.",
      },
      {
        title: "Prepare e inicie a sessão",
        description: "Defina equipes, timer e sons, escolha “Criar sessão” e, na tela de espera, confirme em “Iniciar sessão”.",
      },
      {
        title: "Consulte as regras quando precisar",
        description: "Durante a sessão, quem estiver apresentando pode abrir “Como jogar?” sem pausar nem alterar a partida.",
        href: "/ajuda#como-funcionam-os-jogos",
        actionLabel: "Ver todos os jogos",
      },
    ],
  },
  {
    id: "create",
    title: "Quero criar minha primeira atividade",
    summary: "Entre, monte o conteúdo, confira a prévia e publique por decisão explícita.",
    steps: [
      {
        title: "Entre na sua conta",
        description: "A criação exige autenticação. Se você já entrou, siga direto para “Minhas atividades”.",
        href: "/login",
        actionLabel: "Ir para Entrar",
      },
      {
        title: "Crie a atividade",
        description: "Em “Minhas atividades”, escolha “Criar atividade”. Um rascunho será aberto no editor.",
        href: "/my-activities",
        actionLabel: "Ir para Minhas atividades",
      },
      {
        title: "Escolha o jogo e adicione o conteúdo",
        description: "Na etapa “Jogo”, escolha o tipo e ajuste as regras. Depois abra “Conteúdo” e preencha os campos pedidos.",
      },
      {
        title: "Ajuste a aparência",
        description: "Em “Aparência”, personalize cores e estilo se desejar. O editor salva o rascunho automaticamente.",
      },
      {
        title: "Confira a Prévia ao vivo",
        description: "Use a prévia do próprio editor para conferir a experiência. Ela não publica nem inicia uma sessão.",
      },
      {
        title: "Publique de forma explícita",
        description: "Em “Conteúdo”, escolha a visibilidade adequada e use “Publicar”. Depois da publicação, “Ver atividade” abre a página publicada.",
      },
    ],
  },
] as const;

export type GameHelpTopic = {
  label: "Objetivo" | "Como iniciar" | "Como jogar uma rodada" | "Como encerrar";
  text: string;
};

export type GameHelpEntry = {
  key: "quiz" | "matching" | "wheel" | "group-sort" | "unscramble" | "team-grid";
  name: string;
  topics: readonly GameHelpTopic[];
};

export const gameHelpEntries: readonly GameHelpEntry[] = [
  {
    key: "quiz",
    name: "Quiz",
    topics: [
      { label: "Objetivo", text: "Responder às perguntas e somar pontos para a equipe." },
      { label: "Como iniciar", text: "Prepare as equipes e inicie a sessão para abrir a primeira pergunta." },
      { label: "Como jogar uma rodada", text: "Marque uma ou mais alternativas e use “Verificar resposta”; o apresentador também pode revelar a resposta e avançar." },
      { label: "Como encerrar", text: "Depois da última questão, ou quando desejar, o apresentador usa “Finalizar”." },
    ],
  },
  {
    key: "matching",
    name: "Combinar",
    topics: [
      { label: "Objetivo", text: "Encontrar todos os pares correspondentes." },
      { label: "Como iniciar", text: "Inicie a sessão; a apresentação define o modo “Conectar pares” ou “Jogo da memória”." },
      { label: "Como jogar uma rodada", text: "Em Conectar, selecione um item de cada lado. Em Memória, vire duas cartas e tente formar um par." },
      { label: "Como encerrar", text: "Complete os pares e use “Finalizar” para mostrar o resultado da sessão." },
    ],
  },
  {
    key: "wheel",
    name: "Roleta",
    topics: [
      { label: "Objetivo", text: "Sortear itens da atividade para orientar perguntas, falas ou desafios." },
      { label: "Como iniciar", text: "Inicie a sessão e confirme que a roleta está pronta para girar." },
      { label: "Como jogar uma rodada", text: "Use “Girar roleta” e conduza o item sorteado; a configuração pode permitir repetição ou remover itens já escolhidos." },
      { label: "Como encerrar", text: "Quando os itens desejados tiverem sido sorteados, use “Finalizar”." },
    ],
  },
  {
    key: "group-sort",
    name: "Separar grupos",
    topics: [
      { label: "Objetivo", text: "Classificar cada item na categoria correta." },
      { label: "Como iniciar", text: "Inicie a sessão; a apresentação abre em Board ou em “Um por vez”." },
      { label: "Como jogar uma rodada", text: "No Board, arraste ou selecione o item e a categoria, depois verifique. Em “Um por vez”, escolha a categoria do item exibido." },
      { label: "Como encerrar", text: "Depois de classificar os itens, use “Finalizar” para encerrar a sessão." },
    ],
  },
  {
    key: "unscramble",
    name: "Desembaralhar",
    topics: [
      { label: "Objetivo", text: "Reorganizar letras ou segmentos até formar a sequência correta." },
      { label: "Como iniciar", text: "Inicie a sessão para exibir a primeira sequência embaralhada." },
      { label: "Como jogar uma rodada", text: "Selecione as peças na ordem correta e verifique quando o botão estiver disponível; revelar e passar a vez dependem da configuração." },
      { label: "Como encerrar", text: "Avance pelas sequências e use “Finalizar” ao concluir a atividade." },
    ],
  },
  {
    key: "team-grid",
    name: "Grade de equipes",
    topics: [
      { label: "Objetivo", text: "As equipes escolhem cards, respondem às perguntas e acumulam pontos." },
      { label: "Como iniciar", text: "Prepare as equipes e inicie a sessão para abrir a grade de cards." },
      { label: "Como jogar uma rodada", text: "Escolha um card, mostre a resposta quando necessário e marque “Correto” ou “Incorreto · próximo time”." },
      { label: "Como encerrar", text: "Após usar os cards desejados, use “Finalizar” para ver a classificação." },
    ],
  },
] as const;

export function getGameHelp(templateKey: string) {
  return gameHelpEntries.find((entry) => entry.key === templateKey);
}
