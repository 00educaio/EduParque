"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateActivityButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function create() {
    setPending(true);
    const response = await fetch("/api/activities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    if (response.ok) { const activity = await response.json() as { id: string }; router.push(`/editor/${activity.id}`); return; }
    setPending(false);
  }
  return <button className="button" onClick={create} disabled={pending}>{pending ? "Criando…" : "Criar atividade"}</button>;
}
