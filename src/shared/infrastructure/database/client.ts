import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { cache } from "react";
import { getEnv } from "@/shared/infrastructure/config/env";
import * as schema from "./schema";

export function createDatabase(connectionString: string) {
  const sql = postgres(connectionString, {
    // Hyperdrive já mantém o pool de origem. Uma conexão por requisição evita
    // exceder o limite de conexões externas do Worker e do plano gratuito.
    max: 1,
    idle_timeout: 20,
    max_lifetime: 60,
    prepare: true,
  });
  return { db: drizzle(sql, { schema }), sql };
}

export type DatabaseContext = ReturnType<typeof createDatabase>;

let nodeDatabase: DatabaseContext | undefined;

function getHyperdriveConnectionString() {
  try {
    return getCloudflareContext().env.HYPERDRIVE?.connectionString;
  } catch (error) {
    // Fora de uma requisição Worker (migrações, seed, testes e Node local),
    // o contexto Cloudflare não existe e DATABASE_URL é o caminho esperado.
    if ("Cloudflare" in globalThis) {
      throw new Error("O binding HYPERDRIVE não está disponível nesta requisição Cloudflare.", { cause: error });
    }
    return undefined;
  }
}

const getRequestDatabase = cache((connectionString: string) => createDatabase(connectionString));

export function getDatabase(): DatabaseContext {
  const hyperdriveConnectionString = getHyperdriveConnectionString();
  if (hyperdriveConnectionString) return getRequestDatabase(hyperdriveConnectionString);

  // O singleton existe somente no runtime Node. Nunca é usado dentro do Worker.
  nodeDatabase ??= createDatabase(getEnv().DATABASE_URL);
  return nodeDatabase;
}
