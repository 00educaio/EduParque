# Segurança

## Controles do MVP

- Toda mutação de Activity, Presentation, mídia e sessão valida autenticação e ownership no servidor.
- Rotas administrativas exigem `ADMIN` em cada handler; um admin não pode remover ou rebaixar a própria conta pelo painel.
- Revisões publicadas não têm operação de update e um trigger do PostgreSQL bloqueia alterações diretas.
- Remix lê exclusivamente o snapshot publicado e cria conteúdo/configuração independentes.
- Activities privadas não são expostas; não listadas funcionam apenas por link e não entram na biblioteca.
- Uploads têm limite antecipado, allowlist de formatos, inspeção dos bytes, ownership e `nosniff` na resposta.
- Sessões anônimas usam token de controle de 256 bits em cookie HttpOnly/SameSite=Lax; somente o hash é persistido.
- Senhas têm hash bcrypt gerado pelo PostgreSQL; cinco falhas em 15 minutos bloqueiam a conta e o identificador por 15 minutos.
- Login retorna erro genérico para usuário inexistente, senha incorreta ou bloqueio; redefinir a senha invalida as sessões anteriores.
- Cadastros exigem convite de 256 bits vinculado ao e-mail, armazenado somente como hash, válido por sete dias e consumido de forma transacional uma única vez.
- Respostas recebem CSP, proteção contra framing, política de referrer, restrição de permissões e `nosniff`.

Em produção, use um reverse proxy para limites de corpo/tempo, rate limiting e proteção contra slow requests. Rotacione segredos, restrinja credenciais S3 ao bucket necessário e use TLS.

## Dependências

Google OAuth e Magic Link por SMTP estão fora do escopo do protótipo. O aplicativo não importa o provider Nodemailer nem declara Nodemailer como dependência direta.

Advisories restritos a ferramentas de desenvolvimento não entram na imagem standalone de runtime. O Vitest foi atualizado para a linha 5 para eliminar os advisories corrigidos em `@vitest/mocker` e `tinypool`.
