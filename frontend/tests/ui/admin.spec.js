import { expect, test } from "./fixtures.js";
import { clearMacroObrasSession, mockBackend } from "./helpers.js";

test.beforeEach(async ({ page }) => {
  await clearMacroObrasSession(page);
  await mockBackend(page);
});

test("[admin-add-work] cadastra obra", async ({ page }) => {
  await page.goto("/?surface=admin");

  await expect(page.getByRole("heading", { name: "Adicionar obra" })).toBeVisible();
  await page.getByPlaceholder("Ex.: Residencial Vila das Árvores").fill("Residencial Teste UI");
  await page.getByPlaceholder("Ex.: OBRA-001").fill("OBRA-UI");
  await page.getByPlaceholder("Digite o cliente").fill("Cliente Playwright");
  await page.getByRole("button", { name: "Salvar obra →" }).click();
  await expect(page.getByText("Obra salva")).toBeVisible();
});

test("[admin-calendar] cria agendamento no cronograma", async ({ page }) => {
  await page.goto("/?surface=admin");

  await page.locator('[data-route="admin-calendar"]').first().click();
  await expect(page.getByRole("heading", { name: "Cronograma da obra" })).toBeVisible();
  await expect(page.locator(".calendar").getByText("Rotina de fundação").first()).toBeVisible();
  await page.getByRole("button", { name: "Novo agendamento +" }).click();
  await expect(page.getByText("Cronograma cadastral salvo")).toBeVisible();
});

test("[admin-elements] adiciona elemento de obra com dependencias e liberacoes", async ({ page }) => {
  await page.goto("/?surface=admin");

  await page.locator('[data-route="admin-elements"]').first().click();
  await expect(page.getByRole("heading", { name: "Elementos de obra" })).toBeVisible();
  await page.locator('[data-element-field="name"]').fill("Contrapiso");
  await page.locator('[data-element-field="description"]').fill("Regularização de piso para receber acabamento.");
  await page.locator('[data-element-field="materials"]').fill("argamassa, nível, desempenadeira");
  await page.locator('[data-element-field="dependencies"]').fill("Base aprovada");
  await page.locator('[data-element-field="unlocks"]').fill("Acabamento");
  await page.getByRole("button", { name: "Adicionar elemento de obra" }).click();
  await expect(page.getByText("Elemento de obra adicionado: Contrapiso")).toBeVisible();
  await expect(page.locator(".element-canvas").getByText("Contrapiso")).toBeVisible();
});

test("[admin-mobile-access] cadastra login do app de medição vinculado a obra", async ({ page }) => {
  await page.goto("/?surface=admin");

  await page.locator('[data-route="admin-mobile-access"]').first().click();
  await expect(page.getByRole("heading", { name: "Acessos do app de medição" })).toBeVisible();
  await page.getByPlaceholder("Nome do colaborador").fill("Mestre Teste");
  await page.getByPlaceholder("CPF").fill("111.222.333-44");
  await page.getByPlaceholder("email@empresa.com").fill("mestre.teste@macroobras.local");
  await page.getByRole("button", { name: "Salvar acesso" }).click();
  await expect(page.getByText("Acesso do app de medição salvo para obra")).toBeVisible();
});

test("[admin-measurement] altera percentual da medição administrativa", async ({ page }) => {
  await page.goto("/?surface=admin");

  await page.locator('[data-route="admin-measurement"]').first().click();
  await expect(page.getByRole("heading", { name: "Medição da obra" })).toBeVisible();
  await expect(page.getByText("Tabela de medição espelhada da planilha")).toBeVisible();
  await expect(page.locator("table.measurement thead")).toContainText("Cód.");
  await expect(page.locator("table.measurement thead")).toContainText("No período");
  await page.locator("table.measurement tbody tr").filter({ hasText: "fundação" }).getByRole("textbox").fill("42");
  await expect(page.getByText("Lista longa de provas correlacionadas ao serviço")).toBeVisible();
  await expect(page.getByText("Fundação executada parcialmente")).toBeVisible();
  await expect(page.getByText("Foto por câmera").first()).toBeVisible();
  await page.locator("table.measurement tbody tr").filter({ hasText: "fundação" }).getByRole("button", { name: "Aplicar progresso" }).click();
  await expect(page.getByText("Medição atualizada com prova de serviço")).toBeVisible();
});

test("[admin-measurement-comparison] gera comparacao da medição com planilha importada", async ({ page }) => {
  await page.goto("/?surface=admin");

  await page.locator('[data-route="admin-measurement"]').first().click();
  await expect(page.getByRole("heading", { name: "Medição da obra" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Comparação da medição" })).toBeVisible();
  await expect(page.getByText("fundação 45%")).toBeVisible();
  await page.getByRole("button", { name: "Gerar comparação da medição" }).click();
  await expect(page.getByText("Comparação da medição registrada")).toBeVisible();
});
