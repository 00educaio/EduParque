"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";

export function CatalogError({ reset }: { reset: () => void }) {
  return (
    <main className="catalog-route-error">
      <div className="catalog-route-error__icon"><AlertCircle aria-hidden="true" /></div>
      <span className="eyebrow">Algo saiu do caminho</span>
      <h1>Não foi possível carregar as atividades</h1>
      <p>Tente novamente. Se o problema continuar, volte ao início e retome a navegação.</p>
      <div className="inline-actions"><button className="button" type="button" onClick={reset}>Tentar novamente</button><Link className="button button--secondary" href="/">Voltar ao início</Link></div>
    </main>
  );
}
