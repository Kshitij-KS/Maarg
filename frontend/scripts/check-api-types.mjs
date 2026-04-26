import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const frontendDir = join(scriptDir, "..");
const generatedFiles = ["openapi.json", "lib/types.generated.ts"];

const before = new Map(
  generatedFiles.map((file) => [
    file,
    readFileSync(join(frontendDir, file), "utf8"),
  ]),
);

const result = spawnSync("npm", ["run", "types:api"], {
  cwd: frontendDir,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const staleFiles = generatedFiles.filter(
  (file) => readFileSync(join(frontendDir, file), "utf8") !== before.get(file),
);

if (staleFiles.length > 0) {
  console.error(
    `Generated API contract files were stale: ${staleFiles.join(", ")}. ` +
      "Run `npm run types:api` and commit the refreshed files.",
  );
  process.exit(1);
}
