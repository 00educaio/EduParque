import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// O protótipo não usa R2. O cache incremental permanece no modo padrão
// até que uma estratégia persistente seja escolhida explicitamente.
export default defineCloudflareConfig({});
