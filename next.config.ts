// next.config.ts: Next.js 16 on Cloudflare through OpenNext. Copy to the project root.
import path from "node:path";
import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Pin the tracing root to this project. A parent folder with its own lockfile otherwise confuses the build.
const projectRoot = path.resolve(import.meta.dirname);

// Makes the wrangler.jsonc bindings (R2, vars) available to `next dev`.
if (process.env.NODE_ENV === "development") {
  void initOpenNextCloudflareForDev();
}

// Cloudflare Tunnel hostnames (README.md, "Cloudflare Tunnel"). Quick tunnels get a random *.trycloudflare.com name;
// a named tunnel's hostname comes from TUNNEL_HOSTNAMES in .env.local, comma-separated, without https:// or a port.
// .env files are loaded before this file is read, so the variable is available here.
const tunnelHosts = [
  "*.trycloudflare.com",
  ...(process.env.TUNNEL_HOSTNAMES ?? "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean),
];

const nextConfig: NextConfig = {
  // Lets the dev server serve its assets and HMR to a page opened through a tunnel. Development only.
  allowedDevOrigins: tunnelHosts,
  // Cache Components: pages are dynamic unless they opt in with "use cache". See architecture.md section 9.
  cacheComponents: true,
  // Images are served as-is from public/ and R2. No Cloudflare Images binding.
  images: { unoptimized: true },
  // Hides the route indicator at the bottom-left in dev. Compile and runtime errors still show.
  devIndicators: false,
  // Raise this only for uploads that go through Server Actions. Route handlers have their own limits.
  // allowedOrigins: Server Actions (sign-in, sales, settings) are accepted from the tunnel hosts as well. The CSRF
  // check compares Origin with the forwarded host; this covers a tunnel that forwards its own host instead.
  experimental: {
    serverActions: { bodySizeLimit: "10mb", allowedOrigins: tunnelHosts },
  },
  // PostgreSQL engines: pg loads pg-cloudflare inside a try block, so file tracing misses it and the Worker
  // bundle fails with `Could not resolve "pg-cloudflare"`. Harmless for MySQL, where the folder does not exist.
  outputFileTracingIncludes: { "/**": ["./node_modules/pg-cloudflare/**"] },
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
    rules: {
      // Tailwind v4 under Turbopack (needs @tailwindcss/turbopack). Matches the Khumrod app.
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
