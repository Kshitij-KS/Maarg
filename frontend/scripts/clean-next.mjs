/**
 * Remove build/cache dirs so webpack chunk paths (e.g. "./611.js") cannot get out of sync
 * after interrupted builds, branch switches, or mixed dev/prod output.
 */
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");

function removeDir(name) {
  const p = join(root, name);
  if (existsSync(p)) {
    rmSync(p, { recursive: true, force: true });
    console.log(`Removed ${name}`);
    return true;
  }
  return false;
}

const did = [
  removeDir(".next"),
  removeDir(".turbo"),
  removeDir(join("node_modules", ".cache")),
].some(Boolean);

if (did) {
  console.log("Done. Run `npm run dev` or `npm run build` to regenerate a clean build.");
} else {
  console.log("Nothing to remove (.next, .turbo, node_modules/.cache already absent).");
}
