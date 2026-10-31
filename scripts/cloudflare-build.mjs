// Builds the Worker bundle with OpenNext, then applies one fix the adapter misses. Copy to scripts/.
//
// OpenNext inlines Next.js manifests into the Worker (workerd has no fs), but only files named *-manifest.json.
// Next 16.4 also reads `.next/server/preview-props.json` when the server starts, so every request fails with
// "Unexpected loadManifest(.../preview-props.json) call!". This script inlines that one file into the bundle.
// Remove this step once the adapter inlines preview-props.json itself. Check after every adapter upgrade.

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const previewPropsPath = join(root, ".next/server/preview-props.json");
const marker = /throw new Error\(`Unexpected loadManifest\(\$\{(\w+)\}\) call!`\)/;

function run(cmd, args) {
  execFileSync(cmd, args, { cwd: root, stdio: "inherit" });
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (/\.(m?js|cjs)$/.test(name)) yield full;
  }
}

run("npx", ["opennextjs-cloudflare", "build"]);

const previewProps = JSON.parse(readFileSync(previewPropsPath, "utf8"));
const literal = JSON.stringify(previewProps);

let patched = 0;
for (const file of walk(join(root, ".open-next"))) {
  const source = readFileSync(file, "utf8");
  const match = source.match(marker);
  if (!match || source.includes("/server/preview-props.json\"))return")) continue;

  const variable = match[1];
  const branch = `if(${variable}.endsWith("/server/preview-props.json"))return ${literal};`;
  writeFileSync(file, source.replace(marker, (thrown) => branch + thrown));
  patched++;
  console.log(`patched preview-props manifest in ${file.replace(root + "/", "")}`);
}

if (patched === 0) {
  console.log("No loadManifest bundle needed the preview-props fix (already patched or adapter updated).");
}
