# Segurança

## Controles do MVP

- Toda mutação de Activity, Presentation, mídia e sessão valida autenticação e ownership no servidor.
- Rotas administrativas exigem `ADMIN` em cada handler; um admin não pode remover ou rebaixar a própria conta pelo painel.
- Revisões publicadas não têm operação de update e um trigger do PostgreSQL bloqueia alterações diretas.
- Remix lê exclusivamente o snapshot publicado e cria conteúdo/configuração independentes.
- Activities privadas não são expostas; não listadas funcionam apenas por link e não entram na biblioteca.
- Uploads têm limite antecipado, allowlist de formatos, inspeção dos bytes, ownership e `nosniff` na resposta.
- Sessões anônimas usam token de controle de 256 bits em cookie HttpOnly/SameSite=Lax; somente o hash é persistido.
- Respostas recebem CSP, proteção contra framing, política de referrer, restrição de permissões e `nosniff`.

Em produção, use um reverse proxy para limites de corpo/tempo, rate limiting e proteção contra slow requests. Rotacione segredos, restrinja credenciais S3 ao bucket necessário e use TLS.

## Dependências e risco aceito

Em 6 de outubro de 2026, `npm audit` ainda reporta advisories do Nodemailer. A versão corrente do `@auth/core` declara compatibilidade somente com Nodemailer `^7.0.7 || ^8.0.5`, enquanto as correções mais recentes estão fora dessa faixa. Forçar uma versão incompatível comprometeria o provider Magic Link.

Mitigação temporária: o provider SMTP fica completamente desabilitado quando as quatro variáveis necessárias não estão presentes; a aplicação não aceita envelope, headers, URLs, anexos ou conteúdo bruto controlados pelo usuário, e só envia o e-mail de verificação construído pelo Auth.js para o endereço validado. Deploys que não precisam de Magic Link devem manter `EMAIL_SERVER_*` vazias e usar Google OAuth. Esta decisão deve ser revista quando `@auth/core` ampliar a faixa suportada.

Advisories restritos a ferramentas de desenvolvimento não entram na imagem standalone de runtime. O Vitest foi atualizado para a linha 5 para eliminar os advisories corrigidos em `@vitest/mocker` e `tinypool`.
