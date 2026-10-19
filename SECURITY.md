# Segurança

## Controles do MVP

- Toda mutação de Activity, Presentation, mídia e sessão valida autenticação e ownership no servidor.
- Rotas administrativas exigem `ADMIN` em cada handler; um admin não pode remover ou rebaixar a própria conta pelo painel.
- Revisões publicadas não têm operação de update e um trigger do PostgreSQL bloqueia alterações diretas.
- Remix lê exclusivamente o snapshot publicado e cria conteúdo/configuração independentes.
- Activities privadas não são expostas; não listadas funcionam apenas por link e não entram na biblioteca.
- Uploads têm limite antecipado, allowlist de formatos, inspeção dos bytes, ownership e `nosniff` na resposta.
- Sessões anônimas usam token de controle de 256 bits em cookie HttpOnly/SameSite=Lax; somente o hash é persistido.
- Senhas usam bcrypt com custo 12 no PostgreSQL (`pgcrypto`); somente o hash salgado é persistido.
- Cinco falhas em 15 minutos bloqueiam conta e identificador por 15 minutos, inclusive para identificadores inexistentes.
- Sessões autenticadas usam cookie HttpOnly, SameSite=Lax e Secure em produção; troca de senha invalida tokens anteriores.
- Respostas recebem CSP, proteção contra framing, política de referrer, restrição de permissões e `nosniff`.

Em produção, use um reverse proxy para limites de corpo/tempo, rate limiting e proteção contra slow requests. Rotacione segredos, restrinja credenciais S3 ao bucket necessário e use TLS.

## Dependências e risco aceito

O EduParque não importa nem configura o provider Nodemailer. O pacote ainda pode aparecer transitivamente na árvore do Auth.js, mas nenhum fluxo da aplicação envia e-mail ou aceita configuração SMTP.

Advisories restritos a ferramentas de desenvolvimento não entram na imagem standalone de runtime. O Vitest foi atualizado para a linha 5 para eliminar os advisories corrigidos em `@vitest/mocker` e `tinypool`.
