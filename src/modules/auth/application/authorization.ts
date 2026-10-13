import { auth } from "@/modules/auth/infrastructure/auth";
import { assertAdmin, assertOwner, assertUser } from "./policies";

export { ForbiddenError, UnauthorizedError } from "./policies";

export async function requireUser() {
  const session = await auth();
  return assertUser(session?.user);
}

export async function requireOwner(resource: { ownerId: string }) {
  const user = await requireUser();
  assertOwner(user, resource);
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  assertAdmin(user);
  return user;
}
