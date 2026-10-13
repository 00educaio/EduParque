"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

async function mutate(url: string, method: "PATCH" | "DELETE", body: object) {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error((await response.json().catch(() => ({})) as { error?: string }).error ?? "Acao recusada.");
}

export function UserAdminActions({ id, role, isCurrent }: { id: string; role: "USER" | "ADMIN"; isCurrent: boolean }) {
  const router = useRouter(); const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  async function run(action: () => Promise<void>) { setPending(true); setError(""); try { await action(); router.refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Erro inesperado."); } finally { setPending(false); } }
  return <div className="admin-actions"><button className="button button--secondary" disabled={pending || isCurrent} onClick={() => run(() => mutate("/api/admin/users", "PATCH", { id, role: role === "ADMIN" ? "USER" : "ADMIN" }))}>{role === "ADMIN" ? "Tornar usuário" : "Tornar admin"}</button><button className="button button--danger" disabled={pending || isCurrent || role === "ADMIN"} onClick={() => { if (confirm("Remover este usuário e todas as atividades dele?")) void run(() => mutate("/api/admin/users", "DELETE", { id })); }}>Remover</button>{error && <small role="alert">{error}</small>}</div>;
}

export function ActivityAdminActions({ id, hidden }: { id: string; hidden: boolean }) {
  const router = useRouter(); const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  async function change() { setPending(true); setError(""); try { await mutate("/api/admin/activities", "PATCH", { id, hidden: !hidden }); router.refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Erro inesperado."); } finally { setPending(false); } }
  return <div className="admin-actions"><button className={hidden ? "button button--secondary" : "button button--danger"} disabled={pending} onClick={change}>{hidden ? "Restaurar" : "Ocultar"}</button>{error && <small role="alert">{error}</small>}</div>;
}
