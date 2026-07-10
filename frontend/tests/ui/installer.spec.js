import { expect, test } from "./fixtures.js";
import { clearMacroObrasSession, mockBackend } from "./helpers.js";

test.beforeEach(async ({ page }) => {
  await clearMacroObrasSession(page);
  await mockBackend(page);
});

test("[installer-install-folder] valida pasta de instalacao e FTP local", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("MacroObras Installer")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pasta de instalação e FTP local" })).toBeVisible();
  await expect(page.locator('[data-installer-field="installDir"]')).toHaveValue("/opt/macroobras");
  await expect(page.getByText("ftp://192.168.0.24:2121/macroobras")).toBeVisible();
});

test("[installer-collaborator-endpoint] apresenta endpoint de colaboradores", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Endpoint de colaboradores" })).toBeVisible();
  await expect(page.getByText("https://colaboradores.macroobras.local/twa")).toBeVisible();
});

test("[installer-archive-okf-llama] apresenta Archive, OKF e servidor Llama", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Archive e OKF" })).toBeVisible();
  await expect(page.getByText("llama://127.0.0.1:11434/gemma4eb")).toBeVisible();
  await page.getByRole("button", { name: "Introduzir Archive/OKF" }).click();
  await expect(page.getByText("OKF preparado")).toBeVisible();
});

test("[installer-admin-mobile-intro] introduz admin e app de medição", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Introdução administrativa" })).toBeVisible();
  await expect(page.getByText("Cadastre nomes de obras")).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Introdução do app de medição" })).toBeVisible();
  await expect(page.getByText("Cadastrar login")).toBeVisible();
  await page.getByRole("button", { name: "Concluir" }).click();
  await expect(page.getByText("Introdução concluída")).toBeVisible();
});
