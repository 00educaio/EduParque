**Entendimento Consolidado do Produto**

Plataforma educacional customizavel inspirada em Wordwall e Baamboozle

|     |
|-----|

**Status: entendimento aprovado**

Versao 1.0 \| 5 de outubro de 2026

# 1. Resumo executivo

O produto sera uma plataforma educacional para criacao, customizacao,
publicacao e execucao de atividades interativas. O MVP prioriza
professores e pessoas proximas ao criador do projeto, com foco em baixo
atrito, alta reutilizacao de conteudo e customizacao visual e de regras.
A arquitetura separa o conteudo educacional da mecanica de jogo,
permitindo que uma mesma Activity tenha varias formas de jogar sem
duplicar o conteudo.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>Principio central</strong></p>
<p>Conteudo != Jogo != Configuracao != Aparencia</p>
<p>Uma Activity pode ter varias Presentations.</p>
<p>O professor conduz a partida; o aluno nao precisa de conta para
jogar.</p>
<p>O MVP deve ser extensivel sem virar um sistema de plugins
externos.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 2. Visao do produto

- Permitir que professores criem atividades reutilizaveis e altamente
  customizaveis.

- Permitir que o mesmo conteudo seja apresentado em diferentes templates
  de jogo.

- Oferecer experiencia teacher-led, adequada a projetor, notebook e sala
  de aula.

- Permitir compartilhamento publico, favoritos e remix de atividades de
  outros usuarios.

- Manter o MVP gratuito para o usuario final e tecnicamente preparado
  para deploy gratuito/provider-agnostic.

- Evitar complexidade prematura: sem IA generativa, multiplayer em tempo
  real ou editor Canva-like no MVP.

# 3. Publico e contexto de uso

| **Aspecto**      | **Decisao**                                                                     |
|------------------|---------------------------------------------------------------------------------|
| Publico inicial  | Amigos, colegas e professores proximos ao criador do projeto.                   |
| Modo principal   | Teacher-led: um professor conduz a atividade em notebook/projetor.              |
| Conta para jogar | Nao obrigatoria para visitantes em atividades publicas/unlisted.                |
| Conta para criar | Obrigatoria para criar, editar, salvar, favoritar, publicar e remixar.          |
| Dispositivos     | Editor otimizado para desktop; jogos responsivos para desktop, tablet e mobile. |
| Idioma inicial   | Interface pt-BR, com estrutura preparada para i18n.                             |

# 4. Modelo conceitual

Activity

\|- Content

\|- Draft

\|- PublishedRevision

\|- Presentation: Quiz

\| \|- GameConfig

\| \`- ThemeOverride

\|- Presentation: Matching

\| \|- GameConfig

\| \`- ThemeOverride

\`- Presentation: Wheel

\|- GameConfig

\`- ThemeOverride

A Activity e o agregado principal do produto. O conteudo e independente
do template. Cada Presentation representa uma forma de jogar aquele
conteudo e possui configuracao e overrides visuais proprios.

# 5. Conteudo semantico

O conteudo nao sera modelado como um schema unico de quiz. O dominio usa
blocos semanticos, permitindo que diferentes templates consumam
estruturas adequadas e que conversoes seguras sejam implementadas por
adapters.

| **ContentBlock**     | **Uso principal**                                                |
|----------------------|------------------------------------------------------------------|
| PromptAnswerBlock    | Perguntas, respostas e alternativas; base para Quiz e Team Grid. |
| PairBlock            | Pares semanticos; base para Matching e conversoes.               |
| ItemListBlock        | Listas simples/enriquecidas; base para Random Wheel.             |
| CategorizedItemBlock | Itens associados a categorias; base para Group Sort.             |
| SequenceBlock        | Sequencias de caracteres ou tokens; base para Unscramble.        |

ContentBlock =

\| PromptAnswerBlock

\| PairBlock

\| ItemListBlock

\| CategorizedItemBlock

\| SequenceBlock

# 6. ContentAdapter

Conversoes entre estruturas devem existir somente quando forem
deterministicas e seguras. IA nao participa do processo no MVP.

Content

\|

v

ContentAdapterRegistry

\|

v

GameTemplate

- Cada adapter declara sourceType, targetType, canConvert() e convert().

- Nao realizar conversoes arbitrarias ou destrutivas.

- O visitante pode alternar entre Presentations ja configuradas; criar
  novas configuracoes exige remix/edicao pelo dono.

# 7. Templates do MVP

| **Template** | **Modos / comportamento**                                                                       |
|--------------|-------------------------------------------------------------------------------------------------|
| Quiz         | Uma ou multiplas respostas corretas; shuffle; timer; pontuacao; Reveal.                         |
| Matching     | Connect e Memory usando PairBlock.                                                              |
| Random Wheel | Item simples ou item com prompt/resposta; repeticao/remocao configuravel.                       |
| Group Sort   | Board drag-and-drop e One by One.                                                               |
| Unscramble   | Reordenacao por caractere ou token/palavra.                                                     |
| Team Grid    | Grid por equipes; pergunta, timer-bomba, resposta, pontos e proximo time. Sem power-ups no MVP. |

# 8. Arquitetura dos templates

modules/game-templates/

quiz/

domain/

application/

ui/

index.ts

matching/

wheel/

group-sort/

unscramble/

team-grid/

Templates sao modulos internos registrados em codigo. Adicionar um novo
template exige codigo e deploy, mas nao deve exigir alterar os demais
templates nem espalhar condicionais pelo sistema.

interface GameTemplateDefinition {

key: string

name: string

supportedContentTypes: ContentBlockType\[\]

configSchema: ZodSchema

defaultConfig: unknown

}

# 9. Configuracao de jogo

Configuracoes compartilhadas e especificas devem ser separadas para
evitar um GameConfig universal com dezenas de campos opcionais.

GameConfig\<T\> = {

base: BaseGameConfig

template: T

}

BaseGameConfig = {

teams

scoring

timer

shuffle

sound

}

# 10. GameSession e SessionShell

Todos os templates rodam dentro do mesmo GameSessionShell. O shell
controla capacidades transversais; o template controla somente sua
mecanica.

| **SessionShell**         | **Responsabilidade do template**   |
|--------------------------|------------------------------------|
| Equipes, turnos e placar | Estado/mecanica especifica do jogo |
| Timer e pause            | Validacao da jogada                |
| Progresso global         | Transicao interna de itens/cards   |
| Undo e finalizacao       | Renderizacao especifica            |
| Sons globais             | Feedback especifico da mecanica    |

UI

\| command

v

GameSessionService

\|

v

SessionState

\|

v

SessionEvent

\|

v

Persistence

# 11. Estado e persistencia da partida

- Frontend mantem estado efemero para responsividade e animacoes.

- Eventos/estado relevante sao persistidos no backend.

- Refresh deve restaurar placar, etapa atual, equipes e estado do
  template.

- Undo desfaz a ultima acao relevante; nao existe historico navegavel
  completo no MVP.

- Reveal Answer e capacidade compartilhada para templates com resposta
  correta.

- Nao sera implementado Event Sourcing completo.

# 12. Pontuacao, equipes e timer

## 12.1 Pontuacao

- Avaliacao automatica quando o template consegue determinar
  acerto/erro.

- Template pode sugerir pontos, por exemplo suggestedPoints: 100.

- Professor sempre pode adicionar/remover pontos manualmente.

- Undo deve reverter a ultima acao relevante de pontuacao/avanco.

## 12.2 Equipes

- De 1 a 8 equipes.

- Cada equipe possui nome, cor e score.

- Sem cadastro individual de alunos no MVP.

## 12.3 Timer-bomba

- Timer opcional e configuravel por template/item.

- Modos: desativado, por item, por questao ou partida inteira.

- Visual tematico de bomba com pavio, contagem regressiva, tensao
  progressiva e explosao ao zerar.

- Som opcional e alternativa para prefers-reduced-motion.

# 13. Editor

\[ CONTEUDO \] \[ JOGO \] \[ APARENCIA \]

Editor -\> GameRenderer(mode="preview")

Jogo -\> GameRenderer(mode="session")

- Editor universal orientado a conteudo, nao um editor diferente por
  jogo.

- Autosave com debounce e estados Nao salvo / Salvando / Salvo / Erro.

- Preview usa o mesmo renderer real do jogo para evitar duplicacao.

- Publish e acao explicita e cria nova revision.

# 14. Draft, publicacao e versionamento

Activity

\|- Draft mutavel

\`- PublishedRevision imutavel

- Alteracoes no draft nao alteram a ultima versao publicada.

- Publish cria snapshot suficiente de conteudo, presentations,
  configuracoes e temas resolvidos.

- Versionamento e leve: nao e um Git interno; revisions surgem em
  eventos de publicacao.

# 15. Presentations

- Uma Activity pode salvar varias formas de jogar.

- Cada Presentation possui templateKey, GameConfig, ThemeOverride e
  isDefault.

- O criador escolhe a Presentation padrao.

- Visitante pode alternar entre Presentations publicadas ja
  configuradas.

- Visitante nao cria configuracoes no original; para isso deve remixar.

# 16. Remix

- Remix cria copia independente da Activity.

- Copia conteudo, todas as Presentations, configuracoes e tema.

- Preserva remixedFromActivityId e remixedFromRevision.

- Nao existe sincronizacao futura com a Activity original.

# 17. Biblioteca e compartilhamento

| **Recurso**                       | **MVP**                                      |
|-----------------------------------|----------------------------------------------|
| Visibilidade                      | private, unlisted, public                    |
| Biblioteca publica                | Toda Activity publica entra automaticamente. |
| Busca                             | Titulo, descricao e tags.                    |
| Favoritos                         | Sim.                                         |
| Remix                             | Sim.                                         |
| Likes / comentarios / seguidores  | Nao.                                         |
| Taxonomia formal de materia/serie | Nao; apenas tags livres.                     |

# 18. Autenticacao e permissoes

- Conta obrigatoria apenas para criar, editar, salvar, favoritar,
  publicar, gerenciar midia e remixar.

- Google OAuth como caminho principal; Magic Link como fallback quando o
  provedor gratuito permitir.

- Roles basicas USER e ADMIN.

- Ownership obrigatorio para editar, excluir e publicar recursos
  proprios.

- Visitante anonimo pode abrir e jogar Activity publica.

# 19. Midia

- Biblioteca pessoal My Media.

- Tipos do MVP: imagem e audio.

- Assets pertencem ao usuario e podem ser reutilizados entre Activities.

- Video fica fora do MVP.

- Storage abstraido por StorageProvider; implementacoes Local e
  S3-compatible.

# 20. Temas e customizacao

SystemTheme

UserTheme

ActivityThemeOverride

\|

v

Resolved Theme

| **Permitido no MVP**                     | **Fora do MVP**       |
|------------------------------------------|-----------------------|
| Cores, texto, gradiente, imagem de fundo | CSS arbitrario        |
| Fontes predefinidas e escala tipografica | Upload de fontes      |
| Border radius, cards e botoes            | Editor pixel-a-pixel  |
| Intensidade de animacao e sons           | JavaScript arbitrario |
| Temas salvos e reutilizaveis             | Editor estilo Canva   |

# 21. Persistencia

A estrategia e relacional para entidades consultaveis e JSONB para
conteudo/configuracoes flexiveis, sempre validados pelo dominio antes de
persistir.

users

activities

activity_revisions

presentations

themes

media_assets

favorites

game_sessions

session_events

JSONB:

\- content_data

\- game_config

\- theme_override

\- revision_snapshot

# 22. Stack e deploy

| **Camada** | **Escolha**                                                      |
|------------|------------------------------------------------------------------|
| Aplicacao  | Next.js + TypeScript strict                                      |
| UI         | Tailwind + shadcn/ui                                             |
| Banco      | PostgreSQL                                                       |
| ORM        | Drizzle ORM                                                      |
| Validacao  | Zod                                                              |
| Auth       | Auth.js                                                          |
| Storage    | Abstracao S3-compatible + local em desenvolvimento               |
| Deploy     | Provider-agnostic com Docker                                     |
| Infra alvo | Node container + PostgreSQL + storage S3-compatible + SMTP/OAuth |

A escolha do provedor gratuito fica para o momento do deploy. O codigo
nao deve depender de Oracle, Google Cloud, Vercel, Supabase, Render ou
qualquer outro fornecedor especifico.

# 23. Acessibilidade

- Navegacao por teclado.

- Focus states visiveis.

- ARIA labels quando aplicavel.

- Contraste adequado.

- prefers-reduced-motion.

- Feedback de acerto/erro nao dependente somente de cor.

# 24. Testes

- Unit tests para dominio, schemas, adapters, reducers, scoring, undo,
  revisions e permissoes.

- Integration tests para Publish, Remix e persistencia de GameSession.

- Um unico E2E principal: login -\> criar Activity -\> Presentation -\>
  customizar -\> publicar -\> abrir publicamente -\> jogar -\> pontuar
  -\> finalizar.

# 25. Admin

- /admin/users

- /admin/activities

- Busca basica e acoes de ocultar/remover Activity e gerenciar usuarios.

- Sem dashboard analitico sofisticado no MVP.

# 26. Explicitamente fora do MVP

- IA generativa.

- WebSockets e multiplayer realtime.

- Contas individuais de alunos.

- Workspaces e coedicao.

- Comentarios, seguidores e ranking social.

- Analytics avancado.

- Power-ups/effects do Team Grid.

- PDF, CSV e XLSX.

- Importacao de Wordwall/Baamboozle.

- Offline-first.

- Video.

- Plugins externos.

- CSS/JS arbitrario.

# 27. Fluxo principal do MVP

CREATE -\> CONTENT -\> PRESENTATIONS -\> CUSTOMIZE -\> PUBLISH -\> PLAY
-\> SESSION RESULTS

PUBLISH -\> SHARE -\> REMIX

# 28. Decisoes aprovadas

| **Area**         | **Decisao consolidada**                                                    |
|------------------|----------------------------------------------------------------------------|
| Objeto central   | Conteudo independente do template; Activity pode ter varias Presentations. |
| Modo de sala     | Teacher-led no MVP.                                                        |
| Templates        | Quiz, Matching, Wheel, Group Sort, Unscramble e Team Grid.                 |
| Customizacao     | Visual + regras, sem editor arbitrario.                                    |
| Compartilhamento | Biblioteca publica, favoritos e remix.                                     |
| Arquitetura      | Monolito modular com templates internos registrados em codigo.             |
| Infra            | Provider-agnostic e Docker; provedor gratuito escolhido somente no deploy. |
