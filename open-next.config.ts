// open-next.config.ts: OpenNext for Cloudflare. Copy to the project root.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

// Prerendered pages are stored in R2 (binding NEXT_INC_CACHE_R2_BUCKET).
// Run `opennextjs-cloudflare populateCache` before preview or deploy, or the Worker hangs on those pages.
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
});
