import { expect, test } from "./fixtures.js";
import { clearMacroObrasSession, mockBackend } from "./helpers.js";

test.beforeEach(async ({ page }) => {
  await clearMacroObrasSession(page);
  await mockBackend(page);
});

async function selectWork(page) {
  await page.goto("/?surface=twa");
  await page.getByPlaceholder("email@empresa.com").fill("antonio@macroobras.local");
  await page.getByPlaceholder("000.000.000-00").fill("123.456.789-09");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Login autorizado. Selecione a obra vinculada a este colaborador.")).toBeVisible();
  await page.getByRole("button", { name: /Residencial Vila das Árvores/ }).click();
  await expect(page.getByText("Obra selecionada. Fluxos do mestre liberados para esta obra.")).toBeVisible();
}

test("[mobile-login-gate] exige email e CPF autorizados", async ({ page }) => {
  await page.goto("/?surface=twa");

  await expect(page.getByText("Cadastro do colaborador")).toBeVisible();
  await page.getByPlaceholder("email@empresa.com").fill("antonio@macroobras.local");
  await page.getByPlaceholder("000.000.000-00").fill("123.456.789-09");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Login autorizado. Selecione a obra vinculada a este colaborador.")).toBeVisible();
});

test("[mobile-work-lock] bloqueia fluxos ate selecionar uma obra", async ({ page }) => {
  await page.goto("/?surface=twa");
  await page.getByPlaceholder("email@empresa.com").fill("antonio@macroobras.local");
  await page.getByPlaceholder("000.000.000-00").fill("123.456.789-09");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByText("Fluxos bloqueados")).toBeVisible();
  await expect(page.getByText("Serviços, rotinas, cronograma, diário, compras e recibos dependem de uma obra ativa.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Residencial Vila das Árvores/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Rotina/ })).toHaveCount(0);
});

test("[mobile-select-work] seleciona obra e libera rotinas", async ({ page }) => {
  await selectWork(page);
  await expect(page.getByRole("button", { name: /Criar rotina/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Cronograma do dia/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Registrar diário/ })).toBeVisible();
});

test("[mobile-routine] cria rotina do mestre", async ({ page }) => {
  await selectWork(page);

  await page.getByRole("button", { name: /Criar rotina/ }).click();
  await expect(page.getByRole("heading", { name: "Criar rotina" })).toBeVisible();
  await page.getByPlaceholder("Ex.: Rotina de estrutura e alvenaria").fill("Rotina UI");
  await page.getByPlaceholder("Ex.: Observações, detalhes importantes, restrições, etc.").fill("Validação por evento do front");
  await page.getByRole("button", { name: "Salvar rotina" }).click();
  await expect(page.getByText("Rotina cadastrada")).toBeVisible();
});

test("[mobile-day] adiciona item ao cronograma do dia", async ({ page }) => {
  await selectWork(page);

  await page.getByRole("button", { name: /Hoje/ }).click();
  await expect(page.getByRole("heading", { name: "Cronograma do dia" })).toBeVisible();
  await page.getByRole("button", { name: /Rotina de fundação/ }).click();
  await expect(page.getByRole("heading", { name: "Rotinas aplicadas neste período" })).toBeVisible();
  await expect(page.getByText("Concretar sapatas da frente norte")).toBeVisible();
  await page.getByRole("button", { name: "Nova rotina aplicada" }).click();
  await expect(page.getByText("Rotina aplicada criada")).toBeVisible();
  await page.getByRole("button", { name: "Editar rotina aplicada" }).first().click({ force: true });
  await expect(page.getByText("Rotina aplicada atualizada")).toBeVisible();
  await page.getByRole("button", { name: "Remover rotina aplicada" }).first().click({ force: true });
  await expect(page.getByText("Rotina aplicada removida")).toBeVisible();
  await page.getByRole("button", { name: "Adicionar item ao cronograma" }).click({ force: true });
  await expect(page.getByText("Item de cronograma cadastrado")).toBeVisible();
});

test("[mobile-diary] completa diario de obra", async ({ page }) => {
  await selectWork(page);

  await page.getByRole("button", { name: /Diário/ }).click();
  await expect(page.getByRole("heading", { name: "Diário de obra" })).toBeVisible();
  await page.getByPlaceholder("Descreva as atividades realizadas hoje, ocorrências e condições gerais da obra...").fill("Serviços conferidos no teste UI.");
  await expect(page.getByText("Confirmação do serviço feito")).toBeVisible();
  await expect(page.getByLabel("Foto de confirmação do serviço")).toHaveAttribute("capture", "environment");
  await page.getByRole("button", { name: "Anexar foto de confirmação" }).click();
  await expect(page.getByText("Confirmação com câmera anexada ao diário")).toBeVisible();
  await page.getByRole("button", { name: "Completar diário" }).click();
  await expect(page.getByText("Diário completado com prova para medição")).toBeVisible();
});
