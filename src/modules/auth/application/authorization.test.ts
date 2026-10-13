import { describe, expect, it } from "vitest";
import { assertAdmin, assertOwner, assertUser, ForbiddenError, UnauthorizedError } from "./policies";

describe("authorization", () => {
  it("distingue visitante anonimo", () => {
    expect(() => assertUser(undefined)).toThrow(UnauthorizedError);
  });

  it("normaliza usuario autenticado com role USER", () => {
    expect(assertUser({ id: "user-1" })).toEqual({ id: "user-1", role: "USER" });
  });

  it("permite dono e bloqueia outro usuario", () => {
    expect(() => assertOwner({ id: "owner", role: "USER" }, { ownerId: "owner" })).not.toThrow();
    expect(() => assertOwner({ id: "other", role: "USER" }, { ownerId: "owner" })).toThrow(ForbiddenError);
  });

  it("permite que ADMIN gerencie recurso e bloqueia USER em rota admin", () => {
    const admin = { id: "admin", role: "ADMIN" } as const;
    expect(() => assertOwner(admin, { ownerId: "owner" })).not.toThrow();
    expect(() => assertAdmin(admin)).not.toThrow();
    expect(() => assertAdmin({ id: "user", role: "USER" })).toThrow(ForbiddenError);
  });
});
