import Link from "next/link";
export default function NotFound() { return <main className="centered-state"><h1>Atividade indisponível</h1><p>Ela pode ser privada, ter sido despublicada ou removida.</p><Link className="button" href="/library">Voltar à biblioteca</Link></main>; }
