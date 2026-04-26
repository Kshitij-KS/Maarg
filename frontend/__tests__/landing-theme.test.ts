import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("landing page theme contrast", () => {
  it("does not use pale warning text as the default light-theme color", () => {
    const source = readFileSync(join(process.cwd(), "app/page.tsx"), "utf8");

    expect(source).not.toMatch(/(?<!dark:)text-warn-200/);
    expect(source).toContain("text-warn-600 dark:text-warn-200");
  });
});
