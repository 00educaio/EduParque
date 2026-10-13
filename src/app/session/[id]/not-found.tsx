import Link from "next/link";
export default function SessionNotFound() { return <main className="centered-state"><h1>Sessão indisponível</h1><p>Ela não existe ou é privada.</p><Link className="button" href="/library">Ir para a biblioteca</Link></main>; }
