import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import type { PutObjectInput, StorageProvider, StoredObject } from "../domain/storage-provider";

export class LocalStorageProvider implements StorageProvider {
  private readonly root: string;

  constructor(rootPath: string) {
    this.root = resolve(rootPath);
  }

  private resolveKey(key: string): string {
    const target = resolve(this.root, key);
    if (!target.startsWith(`${this.root}${sep}`)) throw new Error("Chave de storage invalida.");
    return target;
  }

  async put(input: PutObjectInput): Promise<void> {
    const target = this.resolveKey(input.key);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, input.body);
    await writeFile(`${target}.meta`, JSON.stringify({ contentType: input.contentType }));
  }

  async get(key: string): Promise<StoredObject> {
    const target = this.resolveKey(key);
    const [body, metadata] = await Promise.all([
      readFile(target),
      readFile(`${target}.meta`, "utf8").then((value) => JSON.parse(value) as { contentType: string }),
    ]);
    return { body, contentType: metadata.contentType, contentLength: body.byteLength };
  }

  async delete(key: string): Promise<void> {
    const target = this.resolveKey(key);
    await Promise.all([unlink(target).catch(() => undefined), unlink(`${target}.meta`).catch(() => undefined)]);
  }

  getPublicUrl(key: string): string {
    return `/api/storage/${encodeURIComponent(key)}`;
  }
}
