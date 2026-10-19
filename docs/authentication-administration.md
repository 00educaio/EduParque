# Administração da autenticação

O EduParque não possui cadastro público, senha padrão, provider externo ou recuperação por e-mail. Toda criação e recuperação de conta é feita por alguém com acesso autorizado ao terminal e ao banco do ambiente.

## Criar a primeira conta

Execute após aplicar as migrations:

```bash
npm run auth:user -- create --name "Professor" --email professor@example.com --username professor --role ADMIN
```

O comando pede a senha e a confirmação em modo oculto. Não passe a senha como argumento, variável de ambiente, redirecionamento ou texto em arquivo. Ela deve ter pelo menos 14 caracteres e no máximo 72 bytes.

## Redefinir ou recuperar uma senha

```bash
npm run auth:user -- reset --identifier professor@example.com
```

Também é possível informar o nome de usuário. A operação substitui o hash, limpa bloqueios e incrementa a versão de autenticação, invalidando cookies de sessão emitidos anteriormente.

## Bloqueio temporário

Cinco falhas dentro de 15 minutos bloqueiam a conta e o identificador por 15 minutos. O desbloqueio é automático depois do prazo. Uma redefinição administrativa também limpa o bloqueio.

As mensagens da tela são deliberadamente genéricas: usuário inexistente, senha incorreta e bloqueio retornam a mesma resposta para reduzir enumeração de contas.
