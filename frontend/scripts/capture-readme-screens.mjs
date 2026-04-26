/**
 * Headless captures for docs/submission/screenshots (README).
 * Run: backend (8000) + `npm run dev` (3000) first, then:
 *   npx playwright install chromium
 *   node scripts/capture-readme-screens.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");
const out = join(root, "docs", "submission", "screenshots");
const base = process.env.README_SHOT_BASE_URL ?? "http://127.0.0.1:3000";

await mkdir(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
page.setDefaultTimeout(60_000);

try {
  await page.goto(base + "/", { waitUntil: "load" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(out, "01-home.png"), fullPage: true });

  await page.goto(base + "/search", { waitUntil: "load" });
  await page.getByLabel("Healthcare facility query").fill("C-section near Madhepura");
  await page.getByLabel("Healthcare facility query").press("Enter");
  await page.getByRole("heading", { name: /Maarg verdict/ }).first().waitFor({ state: "visible" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(out, "02-search.png"), fullPage: true });

  await page.getByRole("button", { name: /Reasoning timeline/i }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(out, "05-mlflow.png"), fullPage: true });

  await page.goto(base + "/audit/F00042", { waitUntil: "load" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(out, "03-audit.png"), fullPage: true });

  await page.goto(base + "/map", { waitUntil: "load" });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(out, "04-map.png"), fullPage: true });

  await page.goto(base + "/portal/login", { waitUntil: "load" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, "06-portal.png"), fullPage: true });

  await page.goto(base + "/search", { waitUntil: "load" });
  await page.getByLabel("Healthcare facility query").fill("C-section near Madhepura");
  await page.getByLabel("Healthcare facility query").press("Enter");
  await page.getByRole("heading", { name: /Maarg verdict/ }).first().waitFor({ state: "visible" });
  await page.waitForTimeout(500);
  await page.getByLabel("Request emergency ambulance").click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(out, "07-emergency.png"), fullPage: true });
} finally {
  await browser.close();
}

// eslint-disable-next-line no-undef
console.log("Wrote PNGs to", out);
