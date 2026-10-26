"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { activityContentSchema, editableActivityContentSchema, externalMediaUrlSchema, mediaReferenceUrl, type EditableActivityContent, type EditableContentBlock, type MediaReference } from "@/shared/domain/content-blocks";
import { contentAdapterRegistry } from "@/modules/game-templates/content-adapters";
import { sequenceUnitMode } from "@/modules/game-templates/domain/gameplay";
import { getGameTemplate } from "@/modules/game-templates";

type PromptBlock = Extract<EditableContentBlock, { type: "prompt-answer" }>;
type PairBlock = Extract<EditableContentBlock, { type: "pair" }>;
type ListBlock = Extract<EditableContentBlock, { type: "item-list" }>;
type CategoryBlock = Extract<EditableContentBlock, { type: "categorized-item" }>;
type SequenceBlock = Extract<EditableContentBlock, { type: "sequence" }>;
type LibraryAsset = { id: string; kind: "image" | "audio"; filename: string; byteSize: number };

const blockInfo = {
  "prompt-answer": { label: "Perguntas e respostas", description: "Quiz e Grade de equipes" },
  pair: { label: "Pares", description: "Combinar e memória" },
  "item-list": { label: "Lista de itens", description: "Roleta" },
  "categorized-item": { label: "Itens por categoria", description: "Separar grupos" },
  sequence: { label: "Palavras ou frases", description: "Desembaralhar" },
} as const;

function uid() { return crypto.randomUUID(); }

function newBlock(type: EditableContentBlock["type"]): EditableContentBlock {
  if (type === "prompt-answer") return { type, id: uid(), items: [{ id: uid(), prompt: "", answers: [{ id: uid(), text: "", isCorrect: true }, { id: uid(), text: "", isCorrect: false }], explanation: "" }] };
  if (type === "pair") return { type, id: uid(), pairs: [{ id: uid(), left: "", right: "" }, { id: uid(), left: "", right: "" }] };
  if (type === "item-list") return { type, id: uid(), items: [{ id: uid(), text: "", prompt: "", answer: "" }] };
  if (type === "categorized-item") return { type, id: uid(), categories: [{ id: uid(), name: "Categoria 1", items: [{ id: uid(), text: "" }] }, { id: uid(), name: "Categoria 2", items: [{ id: uid(), text: "" }] }] };
  return { type, id: uid(), sequences: [{ id: uid(), prompt: "", tokens: [], splitMode: "word", unitMode: "token" }] };
}

function cloneBlock(block: EditableContentBlock): EditableContentBlock {
  if (block.type === "prompt-answer") return { ...structuredClone(block), id: uid(), items: block.items.map((item) => ({ ...structuredClone(item), id: uid(), answers: item.answers.map((answer) => ({ ...answer, id: uid() })) })) };
  if (block.type === "pair") return { ...structuredClone(block), id: uid(), pairs: block.pairs.map((item) => ({ ...structuredClone(item), id: uid() })) };
  if (block.type === "item-list") return { ...structuredClone(block), id: uid(), items: block.items.map((item) => ({ ...structuredClone(item), id: uid() })) };
  if (block.type === "categorized-item") return { ...structuredClone(block), id: uid(), categories: block.categories.map((category) => ({ ...structuredClone(category), id: uid(), items: category.items.map((item) => ({ ...structuredClone(item), id: uid() })) })) };
  return { ...structuredClone(block), id: uid(), sequences: block.sequences.map((item) => ({ ...structuredClone(item), id: uid() })) };
}

function move<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length) return items;
  const copy = [...items]; const [item] = copy.splice(from, 1); copy.splice(to, 0, item!); return copy;
}

function ItemActions({ index, total, onMove, onDuplicate, onDelete }: { index: number; total: number; onMove: (to: number) => void; onDuplicate: () => void; onDelete: () => void }) {
  return <div className="item-actions"><button type="button" onClick={() => onMove(index - 1)} disabled={index === 0} aria-label="Mover para cima">↑</button><button type="button" onClick={() => onMove(index + 1)} disabled={index === total - 1} aria-label="Mover para baixo">↓</button><button type="button" onClick={onDuplicate}>Duplicar</button><button type="button" className="danger-link" onClick={onDelete}>Excluir</button></div>;
}

function MediaAttachment({ value, imageOnly = false, onChange }: { value?: MediaReference; imageOnly?: boolean; onChange: (media?: MediaReference) => void }) {
  const id = useId(); const [uploading, setUploading] = useState(false); const [error, setError] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [externalKind, setExternalKind] = useState<"image" | "audio">("image");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryAssets, setLibraryAssets] = useState<LibraryAsset[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  async function upload(file?: File) {
    if (!file) return;
    const maximum = file.type.startsWith("audio/") ? 25 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maximum) { setError(file.type.startsWith("audio/") ? "O áudio pode ter no máximo 25 MiB." : "A imagem pode ter no máximo 10 MiB."); return; }
    if (imageOnly && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Selecione uma imagem PNG, JPG ou WebP."); return; }
    setUploading(true); setError("");
    try {
      const preparedResponse = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, mimeType: file.type, byteSize: file.size }),
      });
      if (preparedResponse.status === 501) {
        const data = new FormData(); data.set("file", file);
        const localResponse = await fetch("/api/media", { method: "POST", body: data });
        if (!localResponse.ok) { const result = await localResponse.json().catch(() => ({})) as { error?: string }; throw new Error(result.error ?? "Não foi possível enviar o arquivo."); }
        const asset = await localResponse.json() as { id: string; kind: "image" | "audio"; filename: string };
        onChange({ source: "stored", assetId: asset.id, kind: asset.kind, filename: asset.filename });
        return;
      }
      if (!preparedResponse.ok) { const result = await preparedResponse.json().catch(() => ({})) as { error?: string }; throw new Error(result.error ?? "Não foi possível autorizar o upload."); }
      const prepared = await preparedResponse.json() as { id: string; uploadUrl: string; uploadHeaders: Record<string, string> };
      const uploadedResponse = await fetch(prepared.uploadUrl, { method: "PUT", headers: prepared.uploadHeaders, body: file });
      if (!uploadedResponse.ok) throw new Error("O bucket recusou o upload direto. Confira CORS, tamanho e tipo.");
      const completedResponse = await fetch(`/api/media/${prepared.id}/complete`, { method: "POST" });
      if (!completedResponse.ok) { const result = await completedResponse.json().catch(() => ({})) as { error?: string }; throw new Error(result.error ?? "Não foi possível validar o arquivo enviado."); }
      const asset = await completedResponse.json() as { id: string; kind: "image" | "audio"; filename: string };
      onChange({ source: "stored", assetId: asset.id, kind: asset.kind, filename: asset.filename });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Não foi possível enviar o arquivo.");
    } finally {
      setUploading(false);
    }
  }
  function addExternal() {
    setError("");
    const parsed = externalMediaUrlSchema.safeParse(externalUrl);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "URL externa inválida."); return; }
    const url = new URL(parsed.data);
    const pathName = url.pathname.split("/").filter(Boolean).at(-1);
    let filename = pathName || url.hostname;
    try { filename = decodeURIComponent(filename); } catch { /* Mantem o nome codificado se a URL for malformada. */ }
    onChange({ source: "external", externalUrl: parsed.data, kind: imageOnly ? "image" : externalKind, filename: filename.slice(0, 255) });
  }
  async function toggleLibrary() {
    const nextOpen = !libraryOpen;
    setLibraryOpen(nextOpen);
    if (!nextOpen || libraryAssets.length) return;
    setLibraryLoading(true); setError("");
    try {
      const response = await fetch("/api/media", { cache: "no-store" });
      if (!response.ok) throw new Error("Não foi possível abrir a biblioteca.");
      setLibraryAssets(await response.json() as LibraryAsset[]);
    } catch (libraryError) {
      setError(libraryError instanceof Error ? libraryError.message : "Não foi possível abrir a biblioteca.");
    } finally {
      setLibraryLoading(false);
    }
  }
  async function deleteLibraryAsset(asset: LibraryAsset) {
    if (!window.confirm(`Excluir definitivamente "${asset.filename}"?`)) return;
    const response = await fetch(`/api/media/${asset.id}`, { method: "DELETE" });
    if (response.ok) { setLibraryAssets((items) => items.filter((item) => item.id !== asset.id)); return; }
    const result = await response.json().catch(() => ({})) as { error?: string };
    setError(result.error ?? "Não foi possível excluir a mídia.");
  }
  if (value) {
    const source = mediaReferenceUrl(value);
    return <div className="media-attachment">{value.kind === "image" ? <div className="media-attachment__image"><Image src={source} alt={value.filename} fill sizes="160px" unoptimized /></div> : <audio controls src={source}>Seu navegador não suporta áudio.</audio>}<span>{value.filename}{value.source === "external" ? " (URL externa)" : ""}</span><button type="button" onClick={() => onChange(undefined)}>Remover mídia</button></div>;
  }
  const availableAssets = libraryAssets.filter((asset) => !imageOnly || asset.kind === "image");
  return <div className="media-buttons">
    <label htmlFor={`${id}-image`}>{uploading ? "Enviando…" : "+ Imagem"}<input id={`${id}-image`} hidden type="file" accept={imageOnly ? "image/jpeg,image/png,image/webp" : "image/jpeg,image/png,image/webp,image/gif"} disabled={uploading} onChange={(event) => void upload(event.target.files?.[0])} /></label>
    {!imageOnly && <label htmlFor={`${id}-audio`}>{uploading ? "Enviando…" : "+ Áudio"}<input id={`${id}-audio`} hidden type="file" accept="audio/mpeg,audio/ogg,audio/wav,audio/mp4,audio/flac" disabled={uploading} onChange={(event) => void upload(event.target.files?.[0])} /></label>}
    <button type="button" onClick={() => void toggleLibrary()}>{libraryOpen ? "Fechar biblioteca" : "Usar da biblioteca"}</button>
    {libraryOpen && <div className="media-library">
      {libraryLoading && <span>Carregando…</span>}
      {!libraryLoading && !availableAssets.length && <span>Nenhuma mídia salva.</span>}
      {availableAssets.map((asset) => <div key={asset.id} className="media-library__item"><button type="button" onClick={() => onChange({ source: "stored", assetId: asset.id, kind: asset.kind, filename: asset.filename })}>{asset.filename} ({Math.ceil(asset.byteSize / 1024)} KiB)</button><button type="button" className="danger-link" aria-label={`Excluir ${asset.filename}`} onClick={() => void deleteLibraryAsset(asset)}>Excluir</button></div>)}
    </div>}
    <div className="external-media-form"><input type="url" inputMode="url" placeholder="https://…" aria-label="URL HTTPS externa da mídia" value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} />{!imageOnly && <select aria-label="Tipo da mídia externa" value={externalKind} onChange={(event) => setExternalKind(event.target.value as "image" | "audio")}><option value="image">Imagem</option><option value="audio">Áudio</option></select>}<button type="button" disabled={!externalUrl.trim()} onClick={addExternal}>Usar URL</button></div>
    {error && <span className="field-error">{error}</span>}
  </div>;
}

function PasteImport({ hint, onImport }: { hint: string; onImport: (lines: string[]) => void }) {
  const [open, setOpen] = useState(false); const [text, setText] = useState("");
  if (!open) return <button type="button" className="text-button" onClick={() => setOpen(true)}>Colar vários</button>;
  return <div className="paste-import"><label>Colagem em lote<textarea rows={5} placeholder={hint} value={text} onChange={(event) => setText(event.target.value)} /></label><p className="paste-import__ai-hint">Peça para a i.a. criar nesse formato: <code>{hint}</code></p><div className="inline-actions"><button type="button" className="button button--secondary" onClick={() => { onImport(text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)); setText(""); setOpen(false); }}>Importar linhas</button><button type="button" className="text-button" onClick={() => setOpen(false)}>Cancelar</button></div></div>;
}

function PromptEditor({ block, onChange }: { block: PromptBlock; onChange: (block: PromptBlock) => void }) {
  function updateItem(index: number, item: PromptBlock["items"][number]) { onChange({ ...block, items: block.items.map((current, itemIndex) => itemIndex === index ? item : current) }); }
  return <div className="content-items">{block.items.map((item, index) => <article className="content-item-card" key={item.id}><div className="content-item-card__heading"><strong>Pergunta {index + 1}</strong><ItemActions index={index} total={block.items.length} onMove={(to) => onChange({ ...block, items: move(block.items, index, to) })} onDuplicate={() => onChange({ ...block, items: [...block.items.slice(0, index + 1), { ...structuredClone(item), id: uid(), answers: item.answers.map((answer) => ({ ...answer, id: uid() })) }, ...block.items.slice(index + 1)] })} onDelete={() => window.confirm("Excluir esta pergunta?") && onChange({ ...block, items: block.items.filter((_, itemIndex) => itemIndex !== index) })} /></div><label>Enunciado<textarea rows={3} value={item.prompt} placeholder="Digite a pergunta" onChange={(event) => updateItem(index, { ...item, prompt: event.target.value })} /></label><MediaAttachment value={item.media} onChange={(media) => updateItem(index, { ...item, media })} /><fieldset><legend>Respostas</legend>{item.answers.map((answer, answerIndex) => <div className="answer-row" key={answer.id}><label className="correct-toggle"><input type="checkbox" checked={answer.isCorrect} onChange={(event) => updateItem(index, { ...item, answers: item.answers.map((current, currentIndex) => currentIndex === answerIndex ? { ...current, isCorrect: event.target.checked } : current) })} /><span>Correta</span></label><input value={answer.text} placeholder={`Resposta ${answerIndex + 1}`} onChange={(event) => updateItem(index, { ...item, answers: item.answers.map((current, currentIndex) => currentIndex === answerIndex ? { ...current, text: event.target.value } : current) })} /><button type="button" aria-label={`Excluir resposta ${answerIndex + 1}`} onClick={() => updateItem(index, { ...item, answers: item.answers.filter((_, currentIndex) => currentIndex !== answerIndex) })}>×</button></div>)}<button type="button" className="text-button" onClick={() => updateItem(index, { ...item, answers: [...item.answers, { id: uid(), text: "", isCorrect: false }] })}>+ Adicionar resposta</button>{item.answers.length > 0 && !item.answers.some((answer) => answer.isCorrect) && <p className="validation-message">Marque pelo menos uma resposta correta.</p>}</fieldset><details><summary>Explicação opcional</summary><textarea rows={2} value={item.explanation ?? ""} placeholder="Explique a resposta após revelar" onChange={(event) => updateItem(index, { ...item, explanation: event.target.value })} /></details></article>)}<div className="content-add-row"><button type="button" className="button button--secondary" onClick={() => onChange({ ...block, items: [...block.items, { id: uid(), prompt: "", answers: [{ id: uid(), text: "", isCorrect: true }, { id: uid(), text: "", isCorrect: false }], explanation: "" }] })}>+ Pergunta</button><PasteImport hint={'Pergunta | Resposta correta | Alternativa 1 | Alternativa 2'} onImport={(lines) => onChange({ ...block, items: [...block.items, ...lines.map((line) => { const [prompt = "", correct = "", ...others] = line.split("|").map((part) => part.trim()); return { id: uid(), prompt, answers: [{ id: uid(), text: correct, isCorrect: true }, ...others.filter(Boolean).map((text) => ({ id: uid(), text, isCorrect: false }))] }; })] })} /></div></div>;
}

function PairEditor({ block, onChange }: { block: PairBlock; onChange: (block: PairBlock) => void }) {
  function updatePair(index: number, updates: Partial<PairBlock["pairs"][number]>) {
    onChange({ ...block, pairs: block.pairs.map((pair, itemIndex) => itemIndex === index ? { ...pair, ...updates } : pair) });
  }
  return <div className="content-items">{block.pairs.map((pair, index) => {
    const leftMedia = pair.leftMedia ?? pair.media;
    return <article className="content-item-card compact" key={pair.id}>
      <div className="content-item-card__heading"><strong>Par {index + 1}</strong><ItemActions index={index} total={block.pairs.length} onMove={(to) => onChange({ ...block, pairs: move(block.pairs, index, to) })} onDuplicate={() => onChange({ ...block, pairs: [...block.pairs.slice(0, index + 1), { ...structuredClone(pair), id: uid() }, ...block.pairs.slice(index + 1)] })} onDelete={() => window.confirm("Excluir este par?") && onChange({ ...block, pairs: block.pairs.filter((_, itemIndex) => itemIndex !== index) })} /></div>
      <div className="pair-fields">
        <div className="pair-side"><label>Item <small>Texto opcional com imagem</small><input value={pair.left} placeholder="Ex.: Brasil" onChange={(event) => updatePair(index, { left: event.target.value })} /></label><MediaAttachment value={leftMedia} onChange={(leftMedia) => updatePair(index, { leftMedia, media: undefined })} />{!pair.left.trim() && !leftMedia && <p className="validation-message">Adicione texto ou imagem.</p>}</div>
        <span aria-hidden="true">↔</span>
        <div className="pair-side"><label>Correspondência <small>Texto opcional com imagem</small><input value={pair.right} placeholder="Ex.: Brasília" onChange={(event) => updatePair(index, { right: event.target.value })} /></label><MediaAttachment value={pair.rightMedia} onChange={(rightMedia) => updatePair(index, { rightMedia })} />{!pair.right.trim() && !pair.rightMedia && <p className="validation-message">Adicione texto ou imagem.</p>}</div>
      </div>
    </article>;
  })}{block.pairs.length < 2 && <p className="validation-message">Adicione pelo menos dois pares para publicar.</p>}<div className="content-add-row"><button type="button" className="button button--secondary" onClick={() => onChange({ ...block, pairs: [...block.pairs, { id: uid(), left: "", right: "" }] })}>+ Par</button><PasteImport hint={'Brasil | Brasília\nFrança | Paris'} onImport={(lines) => onChange({ ...block, pairs: [...block.pairs, ...lines.map((line) => { const [left = "", right = ""] = line.split(/[|;\t]/).map((part) => part.trim()); return { id: uid(), left, right }; })] })} /></div></div>;
}

function ListEditor({ block, onChange }: { block: ListBlock; onChange: (block: ListBlock) => void }) {
  return <div className="content-items">{block.items.map((item, index) => <article className="content-item-card compact" key={item.id}><div className="content-item-card__heading"><strong>Item {index + 1}</strong><ItemActions index={index} total={block.items.length} onMove={(to) => onChange({ ...block, items: move(block.items, index, to) })} onDuplicate={() => onChange({ ...block, items: [...block.items.slice(0, index + 1), { ...structuredClone(item), id: uid() }, ...block.items.slice(index + 1)] })} onDelete={() => window.confirm("Excluir este item?") && onChange({ ...block, items: block.items.filter((_, itemIndex) => itemIndex !== index) })} /></div><label>Texto<input value={item.text} placeholder="Digite o item da roleta" onChange={(event) => onChange({ ...block, items: block.items.map((current, itemIndex) => itemIndex === index ? { ...current, text: event.target.value } : current) })} /></label><MediaAttachment value={item.media} onChange={(media) => onChange({ ...block, items: block.items.map((current, itemIndex) => itemIndex === index ? { ...current, media } : current) })} /><details><summary>Pergunta e resposta opcionais</summary><label>Pergunta<input value={item.prompt ?? ""} onChange={(event) => onChange({ ...block, items: block.items.map((current, itemIndex) => itemIndex === index ? { ...current, prompt: event.target.value } : current) })} /></label><label>Resposta<input value={item.answer ?? ""} onChange={(event) => onChange({ ...block, items: block.items.map((current, itemIndex) => itemIndex === index ? { ...current, answer: event.target.value } : current) })} /></label></details></article>)}<div className="content-add-row"><button type="button" className="button button--secondary" onClick={() => onChange({ ...block, items: [...block.items, { id: uid(), text: "", prompt: "", answer: "" }] })}>+ Item</button><PasteImport hint={'Fotossíntese\nSistema Solar\nRevolução Francesa'} onImport={(lines) => onChange({ ...block, items: [...block.items, ...lines.map((text) => ({ id: uid(), text }))] })} /></div></div>;
}

function CategoryEditor({ block, onChange }: { block: CategoryBlock; onChange: (block: CategoryBlock) => void }) {
  return <div className="category-grid">{block.categories.map((category, categoryIndex) => <article className="category-card" key={category.id}><div className="content-item-card__heading"><input aria-label={`Nome da categoria ${categoryIndex + 1}`} value={category.name} onChange={(event) => onChange({ ...block, categories: block.categories.map((current, index) => index === categoryIndex ? { ...current, name: event.target.value } : current) })} /><ItemActions index={categoryIndex} total={block.categories.length} onMove={(to) => onChange({ ...block, categories: move(block.categories, categoryIndex, to) })} onDuplicate={() => onChange({ ...block, categories: [...block.categories.slice(0, categoryIndex + 1), { ...structuredClone(category), id: uid(), items: category.items.map((item) => ({ ...item, id: uid() })) }, ...block.categories.slice(categoryIndex + 1)] })} onDelete={() => window.confirm("Excluir esta categoria e seus itens?") && onChange({ ...block, categories: block.categories.filter((_, index) => index !== categoryIndex) })} /></div><div className="category-card__image"><span>Imagem da categoria <small>(opcional)</small></span><MediaAttachment imageOnly value={category.media} onChange={(media) => onChange({ ...block, categories: block.categories.map((current, index) => index === categoryIndex ? { ...current, media } : current) })} /></div>{category.items.map((item, itemIndex) => <div className="category-item" key={item.id}><input value={item.text} placeholder="Item" onChange={(event) => onChange({ ...block, categories: block.categories.map((current, index) => index === categoryIndex ? { ...current, items: current.items.map((currentItem, indexItem) => indexItem === itemIndex ? { ...currentItem, text: event.target.value } : currentItem) } : current) })} /><button type="button" aria-label="Excluir item" onClick={() => onChange({ ...block, categories: block.categories.map((current, index) => index === categoryIndex ? { ...current, items: current.items.filter((_, indexItem) => indexItem !== itemIndex) } : current) })}>×</button><MediaAttachment value={item.media} onChange={(media) => onChange({ ...block, categories: block.categories.map((current, index) => index === categoryIndex ? { ...current, items: current.items.map((currentItem, indexItem) => indexItem === itemIndex ? { ...currentItem, media } : currentItem) } : current) })} /></div>)}<button type="button" className="text-button" onClick={() => onChange({ ...block, categories: block.categories.map((current, index) => index === categoryIndex ? { ...current, items: [...current.items, { id: uid(), text: "" }] } : current) })}>+ Item</button><PasteImport hint="Cole um item por linha" onImport={(lines) => onChange({ ...block, categories: block.categories.map((current, index) => index === categoryIndex ? { ...current, items: [...current.items, ...lines.map((text) => ({ id: uid(), text }))] } : current) })} /></article>)}{block.categories.length < 2 && <p className="validation-message">Adicione pelo menos duas categorias para publicar.</p>}<button type="button" className="button button--secondary" onClick={() => onChange({ ...block, categories: [...block.categories, { id: uid(), name: `Categoria ${block.categories.length + 1}`, items: [{ id: uid(), text: "" }] }] })}>+ Categoria</button></div>;
}

function SequenceEditor({ block: sourceBlock, legacyTokenMode, onChange }: { block: SequenceBlock; legacyTokenMode: "character" | "token"; onChange: (block: SequenceBlock) => void }) {
  function phrase(item: SequenceBlock["sequences"][number]) { return item.splitMode === "character" ? item.tokens.join("") : item.tokens.join(" "); }
  function split(value: string, mode: "word" | "character") { return mode === "character" ? Array.from(value.replace(/\s/g, "")) : value.split(/\s+/).filter(Boolean); }
  function units(item: SequenceBlock["sequences"][number]) { return sequenceUnitMode(item, legacyTokenMode) === "character" ? Array.from(phrase(item).replace(/\s/g, "")) : item.tokens; }
  const block = { ...sourceBlock, sequences: sourceBlock.sequences.map((item) => item.unitMode ? item : { ...item, unitMode: sequenceUnitMode(item, legacyTokenMode) }) };
  return <div className="content-items">{block.sequences.map((item, index) => { const previewUnits = units(item); const unitMode = sequenceUnitMode(item, "token"); return <article className="content-item-card" key={item.id}><div className="content-item-card__heading"><strong>Palavra ou frase {index + 1}</strong><ItemActions index={index} total={block.sequences.length} onMove={(to) => onChange({ ...block, sequences: move(block.sequences, index, to) })} onDuplicate={() => onChange({ ...block, sequences: [...block.sequences.slice(0, index + 1), { ...structuredClone(item), id: uid() }, ...block.sequences.slice(index + 1)] })} onDelete={() => window.confirm("Excluir esta sequência?") && onChange({ ...block, sequences: block.sequences.filter((_, itemIndex) => itemIndex !== index) })} /></div><label>Dica opcional<input value={item.prompt ?? ""} placeholder="Ex.: Processo usado pelas plantas" onChange={(event) => onChange({ ...block, sequences: block.sequences.map((current, itemIndex) => itemIndex === index ? { ...current, prompt: event.target.value } : current) })} /></label><label>Resposta<input value={phrase(item)} placeholder="Digite a palavra ou frase" onChange={(event) => onChange({ ...block, sequences: block.sequences.map((current, itemIndex) => itemIndex === index ? { ...current, tokens: split(event.target.value, current.splitMode ?? "word") } : current) })} /></label><label>Unidades para ordenar<select value={unitMode} onChange={(event) => onChange({ ...block, sequences: block.sequences.map((current, itemIndex) => itemIndex === index ? { ...current, unitMode: event.target.value as "character" | "token" } : current) })}><option value="character">Caracteres</option><option value="token">Segmentos</option></select></label><small className="field-hint">Prévia das unidades</small><div className="token-preview">{previewUnits.map((unit, unitIndex) => <span key={`${unit}-${unitIndex}`}>{unit}</span>)}</div>{previewUnits.length < 2 && <p className="validation-message">A resposta precisa gerar ao menos duas unidades.</p>}<MediaAttachment value={item.media} onChange={(media) => onChange({ ...block, sequences: block.sequences.map((current, itemIndex) => itemIndex === index ? { ...current, media } : current) })} /></article>; })}<div className="content-add-row"><button type="button" className="button button--secondary" onClick={() => onChange({ ...block, sequences: [...block.sequences, { id: uid(), prompt: "", tokens: [], splitMode: "word", unitMode: "token" }] })}>+ Palavra ou frase</button><PasteImport hint={'fotossíntese\nsistema solar'} onImport={(lines) => onChange({ ...block, sequences: [...block.sequences, ...lines.map((line) => ({ id: uid(), prompt: "", tokens: split(line, "word"), splitMode: "word" as const, unitMode: "token" as const }))] })} /></div></div>;
}

function BlockEditor({ block, unscrambleLegacyTokenMode, onChange }: { block: EditableContentBlock; unscrambleLegacyTokenMode: "character" | "token"; onChange: (block: EditableContentBlock) => void }) {
  if (block.type === "prompt-answer") return <PromptEditor block={block} onChange={onChange} />;
  if (block.type === "pair") return <PairEditor block={block} onChange={onChange} />;
  if (block.type === "item-list") return <ListEditor block={block} onChange={onChange} />;
  if (block.type === "categorized-item") return <CategoryEditor block={block} onChange={onChange} />;
  return <SequenceEditor block={block} legacyTokenMode={unscrambleLegacyTokenMode} onChange={onChange} />;
}

function AdvancedJsonEditor({ content, onChange }: { content: EditableActivityContent; onChange: (content: EditableActivityContent) => void }) {
  const [error, setError] = useState("");
  return <details className="advanced-json"><summary>Avançado: inspecionar JSON</summary><p>Área técnica disponível apenas em desenvolvimento.</p><textarea className="code-editor" rows={14} defaultValue={JSON.stringify(content, null, 2)} onBlur={(event) => { try { onChange(editableActivityContentSchema.parse(JSON.parse(event.target.value))); setError(""); } catch { setError("JSON inválido. As alterações não foram aplicadas."); } }} spellCheck={false} />{error && <p className="field-error">{error}</p>}</details>;
}

export function ContentVisualEditor({ content, activeTemplateKey, unscrambleLegacyTokenMode, allowAdvanced, onChange }: { content: EditableActivityContent; activeTemplateKey: string; unscrambleLegacyTokenMode: "character" | "token"; allowAdvanced: boolean; onChange: (content: EditableActivityContent) => void }) {
  const template = getGameTemplate(activeTemplateKey);
  const orderedBlockTypes = (Object.keys(blockInfo) as EditableContentBlock["type"][]).sort((left, right) => Number(template.supportedContentTypes.includes(right)) - Number(template.supportedContentTypes.includes(left)));
  function isCompatibleType(type: EditableContentBlock["type"]) { return template.supportedContentTypes.includes(type); }
  const compatible = content.some((block) => template.supportedContentTypes.includes(block.type));
  const conversions = content.flatMap((block, blockIndex) => template.supportedContentTypes.flatMap((targetType) => {
    const strict = activityContentSchema.element.safeParse(block);
    const adapter = strict.success ? contentAdapterRegistry.find(strict.data.type, targetType) : undefined;
    return strict.success && adapter?.canConvert(strict.data) ? [{ blockIndex, block: strict.data, targetType }] : [];
  }));
  function updateBlock(index: number, block: EditableContentBlock) { onChange(content.map((current, currentIndex) => currentIndex === index ? block : current)); }

  return <div className="visual-content-editor">{content.length > 0 && !compatible && <div className="conversion-notice"><strong>Este conteúdo ainda não é compatível com {template.name}.</strong>{conversions.length ? <>{conversions.map((conversion) => <button type="button" className="button button--secondary" key={`${conversion.block.id}-${conversion.targetType}`} onClick={() => onChange([...content, contentAdapterRegistry.convert(conversion.block, conversion.targetType)])}>Criar cópia compatível</button>)}</> : <span>Adicione um bloco compatível: {template.supportedContentTypes.map((type) => blockInfo[type].label).join(" ou ")}.</span>}</div>}
    {!content.length && <div className="content-empty"><span className="eyebrow">Etapa 2 · conteúdo para {template.name}</span><h2>O que seus alunos vão trabalhar?</h2><p>As opções recomendadas para o jogo escolhido aparecem primeiro.</p><div className="content-type-grid">{orderedBlockTypes.map((type) => { const info = blockInfo[type]; const compatibleType = isCompatibleType(type); return <button type="button" className={compatibleType ? "is-recommended" : ""} key={type} disabled={!compatibleType} title={compatibleType ? undefined : `Incompatível com ${template.name}`} onClick={() => onChange([newBlock(type)])}>{compatibleType && <small>RECOMENDADO</small>}<strong>{info.label}</strong><span>{info.description}</span></button>; })}</div></div>}
    {content.map((block, index) => <section className="content-block" key={block.id}><header><div><span>Bloco {index + 1}</span><h2>{blockInfo[block.type].label}</h2></div><ItemActions index={index} total={content.length} onMove={(to) => onChange(move(content, index, to))} onDuplicate={() => onChange([...content.slice(0, index + 1), cloneBlock(block), ...content.slice(index + 1)])} onDelete={() => window.confirm("Excluir este bloco e todo o conteúdo dentro dele?") && onChange(content.filter((_, blockIndex) => blockIndex !== index))} /></header>{!activityContentSchema.element.safeParse(block).success && <p className="validation-message">Complete os campos obrigatórios deste bloco antes de publicar.</p>}<BlockEditor block={block} unscrambleLegacyTokenMode={unscrambleLegacyTokenMode} onChange={(updated) => updateBlock(index, updated)} /></section>)}
    {content.length > 0 && <div className="add-block"><strong>Adicionar outro tipo de conteúdo</strong><div>{Object.entries(blockInfo).map(([type, info]) => { const blockType = type as EditableContentBlock["type"]; const compatibleType = isCompatibleType(blockType); return <button type="button" key={type} disabled={!compatibleType} title={compatibleType ? undefined : `Incompatível com ${template.name}`} onClick={() => onChange([...content, newBlock(blockType)])}>+ {info.label}</button>; })}</div></div>}
    {allowAdvanced && <AdvancedJsonEditor key={JSON.stringify(content)} content={content} onChange={onChange} />}
  </div>;
}
