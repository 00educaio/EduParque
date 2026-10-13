"use client";

import { Copy, Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LibraryActions({ activityId, initialFavorite, authenticated }: { activityId: string; initialFavorite: boolean; authenticated: boolean }) {
  const router = useRouter();
  const [favorite, setFavoriteState] = useState(initialFavorite);
  const [pending, setPending] = useState(false);
  const [favoritePending, setFavoritePending] = useState(false);
  const [error, setError] = useState("");
  async function setFavorite() {
    if (!authenticated) { router.push("/login"); return; }
    setError("");
    setFavoritePending(true);
    const next = !favorite; setFavoriteState(next);
    try {
      const response = await fetch(`/api/activities/${activityId}/favorite`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: next }) });
      if (!response.ok) { setFavoriteState(!next); setError("Não foi possível atualizar o favorito."); }
    } catch {
      setFavoriteState(!next);
      setError("Não foi possível atualizar o favorito.");
    } finally { setFavoritePending(false); }
  }
  async function remix() {
    if (!authenticated) { router.push("/login"); return; }
    setError("");
    setPending(true);
    try {
      const response = await fetch(`/api/activities/${activityId}/remix`, { method: "POST" });
      if (response.ok) { const copy = await response.json() as { id: string }; router.push(`/editor/${copy.id}`); return; }
      setError("Não foi possível remixar esta atividade.");
    } catch { setError("Não foi possível remixar esta atividade."); }
    finally { setPending(false); }
  }
  return <div className="library-actions"><div className="inline-actions"><button className="button button--ghost" onClick={setFavorite} aria-pressed={favorite} disabled={favoritePending}><Heart aria-hidden="true" fill={favorite ? "currentColor" : "none"} />{favoritePending ? "Salvando…" : favorite ? "Favorito" : "Favoritar"}</button><button className="button button--secondary" onClick={remix} disabled={pending}><Copy aria-hidden="true" />{pending ? "Copiando…" : "Remixar"}</button></div>{error && <p className="library-actions__error" role="status">{error}</p>}</div>;
}
