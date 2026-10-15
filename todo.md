# Deploy do protótipo EduParque na Cloudflare

## Premissas deste plano

- [ ] Confirmar que o protótipo será **teacher-led**: somente o professor opera a aplicação.
- [ ] Confirmar que não haverá alunos conectados simultaneamente em dispositivos próprios.
- [ ] Aceitar o *scale-to-zero* do Neon gratuito e a possível demora no primeiro acesso após inatividade.
- [ ] Usar o PostgreSQL também para os arquivos do protótipo, sem R2, S3 ou outro serviço de storage.
- [ ] Manter o limite atual de 3 MB para imagens de equipes e definir um limite máximo de 5 MB para os demais arquivos do protótipo.
- [ ] Definir uma cota total de arquivos compatível com o plano gratuito do banco.

## 1. Preparar contas e credenciais

- [x] Criar ou confirmar a conta gratuita da Cloudflare.
- [x] Criar o projeto PostgreSQL gratuito no Neon.
- [x] Copiar a string de conexão do Neon para um gerenciador seguro de senhas; não colocá-la no Git.
- [x] Gerar valores fortes para `AUTH_SECRET` e para os demais segredos internos da aplicação.
- [x] Definir o e-mail da primeira conta de professor: `00cegaf@gmail.com`.
- [x] Registrar em local seguro Caio como responsável pelas contas Cloudflare e Neon.

**Concluído quando:** as contas Cloudflare e Neon estão acessíveis, os segredos necessários existem e nenhum deles foi adicionado ao repositório.

## 2. Criar uma base segura para o trabalho

- [x] Criar uma branch dedicada ao deploy Cloudflare.
- [x] Fazer backup/exportação do banco local antes de testar migrações no Neon.
- [x] Documentar as variáveis de ambiente necessárias em um arquivo de exemplo, somente com nomes e valores fictícios.
- [x] Separar claramente as configurações de desenvolvimento local, preview e produção.
- [x] Confirmar que `.env*`, arquivos do Wrangler com segredos e dumps do banco estão ignorados pelo Git.

**Concluído quando:** o trabalho pode ser revertido sem perder o banco local nem expor credenciais.

## 3. Integrar Next.js 16 com Cloudflare Workers

- [x] Instalar e fixar versões compatíveis de `@opennextjs/cloudflare` e `wrangler`.
- [x] Criar `open-next.config.ts`.
- [x] Criar `wrangler.jsonc` com uma data de compatibilidade validada e a flag `nodejs_compat`.
- [x] Configurar os assets estáticos gerados pelo OpenNext.
- [x] Habilitar o contexto Cloudflare no desenvolvimento local conforme a documentação da versão instalada.
- [x] Adicionar scripts para gerar tipos, criar o build Cloudflare, executar preview e fazer deploy.
- [x] Gerar os tipos dos bindings do Cloudflare e incluí-los no TypeScript.
- [x] Verificar se `postgres` precisa permanecer em `serverExternalPackages` para o runtime do Worker. Confirmado: deve permanecer empacotado para usar sua exportação `workerd`.
- [x] Executar `lint`, `typecheck`, testes e o build OpenNext.

**Estado do preview:** a página inicial responde `200` no runtime local do Worker. A rota `/api/health` ainda responde `503` porque a conexão TLS direta do Neon usa uma opção não implementada pelo `workerd`; a troca para Hyperdrive faz parte da etapa 4.

**Concluído quando:** a aplicação abre no preview local do Worker sem erro de runtime ou importação de módulos Node incompatíveis.

## 4. Adaptar PostgreSQL e Hyperdrive

- [ ] Criar a configuração Hyperdrive apontando para o banco Neon.
- [ ] Adicionar o binding Hyperdrive ao `wrangler.jsonc`.
- [ ] Refatorar `src/shared/infrastructure/database/client.ts` para criar o cliente por requisição no Worker.
- [ ] Remover `prepare: false` da configuração usada com Hyperdrive.
- [ ] Eliminar o pool global no runtime Cloudflare.
- [ ] Preservar um caminho simples para desenvolvimento local e execução das migrações fora do Worker.
- [ ] Atualizar os serviços e rotas que importam `db` ou `sql` globalmente para receber ou obter a conexão da requisição.
- [ ] Definir limites conservadores de conexão para não exceder o plano gratuito.
- [ ] Rodar a suíte de testes de integração com um banco temporário.
- [ ] Criar o schema vazio no Neon usando as migrações existentes.
- [ ] Executar uma leitura e uma escrita reais através do Hyperdrive em preview.

**Concluído quando:** autenticação, CRUD de atividades e sessões funcionam pelo Hyperdrive sem cliente ou pool global.

## 5. Armazenar os arquivos no PostgreSQL

- [ ] Criar uma migração para uma tabela de objetos binários contendo, no mínimo: chave, conteúdo `bytea`, MIME type, tamanho e datas de criação/expiração.
- [ ] Manter metadados funcionais em `media_assets` e relacioná-los à chave do objeto armazenado.
- [ ] Implementar um `PostgresStorageProvider` compatível com a interface `StorageProvider` atual.
- [ ] Adicionar o driver `postgres` à seleção feita em `src/modules/media/infrastructure/storage.ts`.
- [ ] Criar ou adaptar uma rota autenticada para servir arquivos salvos no banco com `Content-Type`, `Content-Length` e cache adequados.
- [ ] Substituir `getPublicUrl()` por uma URL da própria aplicação para os objetos do banco.
- [ ] Reutilizar a validação atual de tipo real do arquivo e bloquear arquivos acima do limite definido.
- [ ] Substituir `src/modules/game-sessions/infrastructure/temporary-team-image-store.ts` por armazenamento no PostgreSQL.
- [ ] Remover a dependência de `node:fs`, `node:os`, `/tmp` e caminhos locais das rotas executadas no Worker.
- [ ] Excluir imagens temporárias quando a sessão terminar.
- [ ] Implementar limpeza oportunista de objetos expirados, sem depender de um processo permanente.
- [ ] Adicionar testes de salvar, ler, substituir, apagar, expirar e rejeitar arquivos inválidos ou grandes.
- [ ] Verificar o consumo do banco após inserir arquivos representativos do protótipo.

**Concluído quando:** imagens e demais mídias continuam disponíveis após reiniciar o preview e nenhum fluxo depende do filesystem local.

## 6. Configurar autenticação de produção

- [ ] Definir o login tradicional com e-mail ou nome de usuário e senha.
- [ ] Criar uma migração para armazenar somente o hash da senha e os dados necessários de bloqueio/rotação; nunca armazenar a senha original.
- [ ] Escolher uma função de derivação de senha segura e compatível com Cloudflare Workers e medir seu custo de CPU no plano gratuito.
- [ ] Habilitar o provider de credenciais do Auth.js em produção com validação exclusivamente no servidor.
- [ ] Remover qualquer senha fixa, atalho ou bypass usado pelo login de desenvolvimento.
- [ ] Criar um comando administrativo para cadastrar a primeira conta e redefinir sua senha sem expor o valor no histórico do shell ou no Git.
- [ ] Manter o cadastro público desabilitado; novas contas de professor devem ser criadas administrativamente.
- [ ] Usar mensagens de erro genéricas para não revelar se um usuário existe.
- [ ] Implementar limitação de tentativas e bloqueio temporário de login usando o PostgreSQL.
- [ ] Testar senha correta, senha incorreta, usuário inexistente, bloqueio temporário e reativação da conta.
- [ ] Configurar `AUTH_SECRET` e `AUTH_TRUST_HOST` como segredos do Worker.
- [ ] Confirmar atributos `Secure`, `HttpOnly` e `SameSite` dos cookies de autenticação e controle de sessão.
- [ ] Não habilitar providers externos nem login por link de e-mail/Nodemailer nesta primeira versão.
- [ ] Documentar o procedimento administrativo de troca ou recuperação de senha.

**Concluído quando:** o professor entra com usuário e senha, permanece autenticado e tentativas inválidas ou excessivas são bloqueadas com segurança.

## 7. Configurar ambientes e segredos

- [ ] Definir no Wrangler apenas configurações públicas e nomes de bindings.
- [ ] Cadastrar segredos de preview e produção com `wrangler secret put`.
- [ ] Incluir, conforme necessário: conexão do banco, `AUTH_SECRET` e chaves internas da aplicação.
- [ ] Não cadastrar variáveis de S3/R2 no protótipo.
- [ ] Configurar explicitamente o novo driver de storage PostgreSQL.
- [ ] Conferir que nenhuma configuração de produção ativa bypasses ou credenciais fixas de desenvolvimento.
- [ ] Executar uma varredura no diff e no histórico da branch para detectar segredos acidentalmente adicionados.

**Concluído quando:** preview e produção recebem todas as configurações sem armazenar valores secretos no Git.

## 8. Validar o protótipo em preview

- [ ] Executar `npm run lint`.
- [ ] Executar `npm run typecheck`.
- [ ] Executar `npm test`.
- [ ] Executar os testes de integração com PostgreSQL.
- [ ] Gerar o build OpenNext e iniciar o preview com Wrangler.
- [ ] Testar login, logout e persistência da sessão.
- [ ] Criar, editar, revisar, publicar e excluir uma atividade.
- [ ] Enviar, visualizar e excluir uma imagem e um áudio dentro dos limites.
- [ ] Criar uma sessão de jogo, configurar equipes, enviar imagens e percorrer a sessão até o encerramento.
- [ ] Confirmar que cronômetros continuam corretos após atualizar a página.
- [ ] Confirmar que arquivos temporários são eliminados ao encerrar ou expirar uma sessão.
- [ ] Simular o Neon adormecido e medir o primeiro acesso após a reativação.
- [ ] Executar uma sessão completa de 50 minutos no fluxo real do professor.
- [ ] Verificar nos logs erros, tempo de CPU, quantidade de requisições e consultas ao banco.

**Concluído quando:** o fluxo completo do professor funciona em preview e o primeiro acesso após inatividade tem atraso aceitável para o protótipo.

## 9. Publicar

- [ ] Fazer um backup do banco antes da migração final.
- [ ] Aplicar as migrações no Neon antes de publicar o Worker que depende delas.
- [ ] Fazer o primeiro deploy manual com Wrangler.
- [ ] Verificar a URL `workers.dev` e HTTPS.
- [ ] Repetir o teste rápido de login, atividade, mídia e sessão de jogo em produção.
- [ ] Conectar o repositório ao Cloudflare Workers Builds somente depois que o deploy manual estiver estável.
- [ ] Configurar o comando de build/deploy e a branch de produção.
- [ ] Se necessário, configurar um domínio personalizado e repetir os testes de cookies e sessão.

**Concluído quando:** uma alteração pequena passa pelo pipeline, chega à produção e o fluxo principal continua funcionando.

## 10. Preparar rollback e operação

- [ ] Registrar a versão estável do Worker e o comando de rollback do Wrangler.
- [ ] Tratar migrações futuras como aditivas; não depender do rollback do Worker para desfazer dados.
- [ ] Documentar como restaurar um backup do Neon.
- [ ] Documentar como executar migrações e renovar cada segredo.
- [ ] Configurar alertas ou uma rotina manual para acompanhar limites da Cloudflare, Hyperdrive e Neon.
- [ ] Acompanhar tamanho total do banco e tamanho ocupado por arquivos.
- [ ] Definir uma rotina para excluir atividades, sessões e arquivos de demonstração antigos.
- [ ] Registrar a limitação conhecida: o Neon gratuito pode entrar em *scale-to-zero*.

**Concluído quando:** outra pessoa consegue publicar, diagnosticar e reverter uma versão seguindo apenas a documentação do projeto.

## Fora do escopo deste protótipo

- Durable Objects e WebSockets.
- Acesso simultâneo dos alunos em seus próprios dispositivos.
- R2, S3 ou outro serviço externo de arquivos.
- Alta disponibilidade e banco garantidamente sempre ativo.
- Escala de produção para várias escolas ou muitos professores simultâneos.

## Critério final de aceite

- [ ] Um professor consegue entrar, preparar uma atividade, incluir mídia, iniciar e concluir uma sessão em produção usando somente Cloudflare Workers, Hyperdrive e PostgreSQL/Neon.
- [ ] A aplicação sobrevive a novo deploy e reativação do banco sem perder dados ou arquivos.
- [ ] Não existem segredos no Git nem dependência de filesystem persistente.
- [ ] O uso medido permanece dentro dos limites gratuitos adotados para o protótipo.
