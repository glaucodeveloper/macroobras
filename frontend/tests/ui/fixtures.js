import fs from "node:fs";
import path from "node:path";
import { expect, test as base } from "@playwright/test";

function slug(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export const test = base;

test.afterEach(async ({ page }, testInfo) => {
  if (page.isClosed()) return;

  const match = testInfo.title.match(/\[([^\]]+)\]/);
  const routineId = match?.[1] || slug(testInfo.title);
  const fileName = `${routineId}-${slug(testInfo.project.name)}.png`;
  const screenshotDir = path.join(process.cwd(), "output/ui-screens");
  const screenshotPath = path.join(screenshotDir, fileName);

  fs.mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await testInfo.attach("print-final", {
    path: screenshotPath,
    contentType: "image/png",
  });
});

export { expect };
