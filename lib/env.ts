import { getCloudflareContext } from "@opennextjs/cloudflare";

// Reads a secret or variable. In `next dev` it comes from the environment (.dev.vars / .env.local). In the Worker
// it comes from the Cloudflare bindings. The value is never logged or returned to a client.
export async function secret(name: string): Promise<string | undefined> {
  if (process.env[name]) return process.env[name];
  try {
    const { env } = await getCloudflareContext({ async: true });
    return (env as unknown as Record<string, string | undefined>)[name];
  } catch {
    return undefined;
  }
}
