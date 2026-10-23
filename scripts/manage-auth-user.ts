import { createCredentialUser, resetCredentialPassword } from "@/modules/auth/application/credential-administration";
import { createRegistrationInvite, revokeRegistrationInvite } from "@/modules/auth/application/registration-invites";
import { getDatabase } from "@/shared/infrastructure/database/client";

function option(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function requiredOption(name: string) {
  const value = option(name);
  if (!value) throw new Error(`Informe --${name}.`);
  return value;
}

async function readHidden(prompt: string) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error("Este comando exige um terminal interativo para ocultar a senha.");
  }

  process.stdout.write(prompt);
  process.stdin.setEncoding("utf8");
  process.stdin.setRawMode(true);
  process.stdin.resume();

  return new Promise<string>((resolve, reject) => {
    let value = "";
    const cleanup = () => {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
    };
    const onData = (chunk: string) => {
      for (const character of chunk) {
        if (character === "\u0003") {
          cleanup();
          reject(new Error("Operação cancelada."));
          return;
        }
        if (character === "\r" || character === "\n") {
          cleanup();
          resolve(value);
          return;
        }
        if (character === "\u007f" || character === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        value += character;
      }
    };
    process.stdin.on("data", onData);
  });
}

async function confirmedPassword() {
  const password = await readHidden("Nova senha (oculta): ");
  const confirmation = await readHidden("Repita a senha: ");
  if (password !== confirmation) throw new Error("As senhas não coincidem.");
  return password;
}

async function main() {
  const command = process.argv[2];

  if (command === "create") {
    const password = await confirmedPassword();
    const user = await createCredentialUser({
      name: requiredOption("name"),
      email: requiredOption("email"),
      username: requiredOption("username"),
      role: option("role") ?? "USER",
      password,
    });
    console.info(`Conta criada: ${user.email} (${user.username}).`);
    return;
  }

  if (command === "reset") {
    const password = await confirmedPassword();
    const user = await resetCredentialPassword(requiredOption("identifier"), password);
    console.info(`Senha redefinida para ${user.email ?? user.username}. Sessões anteriores foram invalidadas.`);
    return;
  }

  if (command === "invite") {
    const invite = await createRegistrationInvite({
      email: requiredOption("email"),
      baseUrl: requiredOption("base-url"),
    });
    console.info(`Convite ${invite.id} criado para ${invite.email}.`);
    console.info(`Valido ate ${invite.expiresAt.toISOString()}.`);
    console.info(`Link (exibido somente agora): ${invite.url}`);
    return;
  }

  if (command === "revoke-invite") {
    const id = requiredOption("id");
    const revoked = await revokeRegistrationInvite(id);
    if (!revoked) throw new Error("Convite não encontrado, já utilizado ou já revogado.");
    console.info(`Convite ${id} revogado.`);
    return;
  }

  throw new Error("Use 'create', 'reset', 'invite' ou 'revoke-invite'.");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Falha ao administrar a conta.");
    process.exitCode = 1;
  })
  .finally(() => getDatabase().sql.end());
