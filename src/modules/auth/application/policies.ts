export class UnauthorizedError extends Error {
  readonly status = 401;

  constructor(message = "Autenticacao obrigatoria.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  readonly status = 403;

  constructor(message = "Voce nao tem permissao para esta acao.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export interface AuthorizedUser {
  id: string;
  role: "USER" | "ADMIN";
}

export function assertUser(user: { id?: string; role?: "USER" | "ADMIN" } | null | undefined): AuthorizedUser {
  if (!user?.id) throw new UnauthorizedError();
  return { id: user.id, role: user.role ?? "USER" };
}

export function assertOwner(user: AuthorizedUser, resource: { ownerId: string }): void {
  if (resource.ownerId !== user.id && user.role !== "ADMIN") throw new ForbiddenError();
}

export function assertAdmin(user: AuthorizedUser): void {
  if (user.role !== "ADMIN") throw new ForbiddenError("Acesso restrito a administradores.");
}
