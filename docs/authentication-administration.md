# Administração da autenticação

O EduParque usa login convencional com usuário ou e-mail e senha. O cadastro é liberado somente por convite individual, vinculado a um e-mail, válido por sete dias e de uso único. Não há senha padrão, Google OAuth ou recuperação por e-mail. A emissão de convites, a criação direta e a recuperação de contas são feitas por alguém com acesso autorizado ao terminal e ao banco do ambiente.

## Convidar um professor

Execute após aplicar as migrations, informando o e-mail do destinatário e a origem pública da aplicação:

```bash
npm run auth:user -- invite --email professor@example.com --base-url https://eduparque.example
```

O comando mostra o ID, a validade e o link completo uma única vez. Entregue o link ao destinatário por um canal seguro. O segredo não é armazenado; se o link for perdido, gere outro convite.

Para revogar um convite ainda não utilizado:

```bash
npm run auth:user -- revoke-invite --id 00000000-0000-4000-8000-000000000000
```

## Criar a primeira conta

Execute após aplicar as migrations, usando a `DATABASE_URL` do ambiente desejado:

```bash
npm run auth:user -- create --name "Professor" --email professor@example.com --username professor --role ADMIN
```

O comando pede a senha e a confirmação em modo oculto. Não passe a senha como argumento, variável de ambiente ou texto em arquivo. Ela deve ter pelo menos 14 caracteres e no máximo 72 bytes.

## Redefinir uma senha

```bash
npm run auth:user -- reset --identifier professor@example.com
```

Também é possível informar o nome de usuário. A operação substitui o hash, limpa bloqueios e invalida cookies de sessão emitidos anteriormente.

## Bloqueio temporário

Cinco falhas dentro de 15 minutos bloqueiam a conta e o identificador por 15 minutos. O desbloqueio é automático. Uma redefinição administrativa também limpa o bloqueio.

As mensagens da tela são deliberadamente genéricas: usuário inexistente, senha incorreta e bloqueio retornam a mesma resposta para reduzir a enumeração de contas.
