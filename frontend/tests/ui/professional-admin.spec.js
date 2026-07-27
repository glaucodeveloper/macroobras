import { expect, test } from "./fixtures.js";
import { clearMacroObrasSession } from "./helpers.js";

test.beforeEach(async ({ page }) => {
  await clearMacroObrasSession(page);
  await page.goto("/?surface=admin&demo=1");
  await expect(page.locator("#main-workspace")).toBeVisible();
});

test("[professional-shell] exibe dobra e expande subnavegacao sem ocupar layout", async ({ page }) => {
  const sidebar = page.locator(".drill-sidebar");
  const handle = page.locator(".sidebar-fold-handle");

  await expect(handle).toBeVisible();
  const handleBox = await handle.boundingBox();
  expect(handleBox?.x).toBeGreaterThanOrEqual(-1);
  expect(handleBox?.y).toBeGreaterThanOrEqual(72);

  const workspaceBefore = await page.locator("#main-workspace").boundingBox();
  await handle.hover();
  await expect.poll(async () => sidebar.evaluate((element) => getComputedStyle(element).transform))
    .toBe("matrix(1, 0, 0, 1, 0, 0)");
  await expect(sidebar.getByRole("button", { name: "Painel executivo" })).toBeVisible();

  const workspaceAfter = await page.locator("#main-workspace").boundingBox();
  expect(workspaceAfter?.x).toBe(workspaceBefore?.x);
  expect(workspaceAfter?.width).toBe(workspaceBefore?.width);
});

test("[professional-settings] persiste tema densidade e comportamento", async ({ page }) => {
  await page.locator('[data-route="admin-settings"]').first().click();
  await expect(page.getByRole("heading", { name: "Configurações" })).toBeVisible();

  await page.locator('[data-setting-field="theme"]').selectOption("dark");
  await page.locator('[data-setting-field="density"]').selectOption("compact");
  await page.locator('[data-setting-field="sidebarBehavior"]').selectOption("pinned");
  await page.locator('[data-setting-field="primaryColor"]').evaluate((element) => {
    element.value = "#146c55";
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.getByRole("button", { name: "Aplicar e salvar" }).click();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-density", "compact");
  await expect(page.locator(".desktop-layout")).toHaveClass(/sidebar-pinned-mode/);
  const customization = await page.evaluate(() => JSON.parse(localStorage.getItem("macroobras.customization")));
  expect(customization).toMatchObject({
    theme: "dark",
    density: "compact",
    sidebarBehavior: "pinned",
    primaryColor: "#146c55",
  });
});

test("[professional-glossary] enquadra todos os servicos e materializa card fantasma", async ({ page }) => {
  await page.locator('[data-route="admin-settings"]').first().click();
  const handle = page.locator(".sidebar-fold-handle");
  await handle.hover();
  await page.locator('.drill-sidebar [data-route="admin-diagram-library"]').click();

  const canvas = page.locator('[data-interactive-diagram="all-work-elements"]');
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute("data-hydrated", "true");
  await expect.poll(async () => Number(await canvas.getAttribute("data-diagram-zoom"))).toBeLessThan(1);

  const nodes = canvas.locator("[data-diagram-node]");
  const nodeCount = await nodes.count();
  const handleBox = await nodes.first().locator("[data-edge-handle]").boundingBox();
  const canvasBox = await canvas.boundingBox();
  expect(handleBox).not.toBeNull();
  expect(canvasBox).not.toBeNull();

  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + canvasBox.width - 54, canvasBox.y + canvasBox.height - 54, { steps: 8 });
  await expect(canvas.locator(".diagram-node-ghost")).toBeVisible();
  await page.mouse.up();

  await expect(canvas.locator(".diagram-node-ghost")).toHaveCount(0);
  await expect(canvas.locator("[data-diagram-node]")).toHaveCount(nodeCount + 1);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("macroobras.diagramModels")));
  expect(saved["all-work-elements"].nodes).toHaveLength(nodeCount + 1);
  expect(saved["all-work-elements"].edges.length).toBeGreaterThan(0);
});

test("[professional-rh] edita ficha vinculada ao card do organograma", async ({ page }) => {
  await page.locator('[data-route="admin-rh"]').first().click();
  const person = page.locator('[data-interactive-diagram="rh-main"] [data-node-id="rh-person-1"]');
  await expect(person).toBeVisible();
  await person.click({ position: { x: 80, y: 54 } });

  const form = page.locator('[data-diagram-record-form][data-diagram-id="rh-main"]');
  await expect(form).toBeVisible();
  await form.locator('[data-diagram-record-field="title"]').fill("Marina de Campo");
  await form.getByRole("button", { name: "Salvar registro" }).click();

  await expect(page.locator('[data-interactive-diagram="rh-main"]')).toContainText("Marina de Campo");
  const savedTitle = await page.evaluate(() => {
    const models = JSON.parse(localStorage.getItem("macroobras.diagramModels"));
    return models["rh-main"].nodes.find((node) => node.id === "rh-person-1")?.title;
  });
  expect(savedTitle).toBe("Marina de Campo");
});

test("[professional-diary] navega timeline folha diaria detalhes e notas", async ({ page }) => {
  await page.locator('[data-route="admin-works"]').first().click();
  await expect(page.getByRole("heading", { name: "Obras" })).toBeVisible();
  await page.locator('.work-horizontal-actions [data-route="admin-work-diary"]').click();

  await expect(page.getByRole("heading", { name: "Diário de obras" })).toBeVisible();
  await expect(page.locator(".diary-day-timeline")).toBeVisible();
  await expect(page.locator(".diary-day-sheet")).toBeVisible();
  await expect(page.locator(".diary-floating-detail")).toBeVisible();
  await expect(page.locator(".diary-sheet-table tbody tr").first()).toBeVisible();

  const rows = page.locator(".diary-row-action");
  if (await rows.count() > 1) await rows.nth(1).click();
  else await rows.first().click();

  const note = page.locator("[data-diary-note]");
  await expect(note).toBeVisible();
  await note.fill("Equipe liberada após inspeção de qualidade.");
  const detailId = await note.getAttribute("data-diary-note");
  const savedNote = await page.evaluate((id) => {
    const notes = JSON.parse(localStorage.getItem("macroobras.diaryNotes"));
    return notes[id];
  }, detailId);
  expect(savedNote).toBe("Equipe liberada após inspeção de qualidade.");
  await expect(page.getByText("Total das compras deste dia")).toBeVisible();
});

test("[professional-visits] comunica o novo gesto de rota inteligente", async ({ page }) => {
  await page.locator('[data-route="admin-visits"]').first().click();
  await expect(page.getByRole("heading", { name: "Visitas" })).toBeVisible();
  await expect(page.getByText("Rota inteligente por estradas")).toBeVisible();
  await expect(page.getByText("Pressione por 0,6 s para iniciar o cálculo.")).toBeVisible();
  await expect(page.getByText(/rota viária mais curta acompanha o destino/i)).toBeVisible();
});
