# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: professional-admin.spec.js >> [professional-shell] exibe dobra e expande subnavegacao sem ocupar layout
- Location: tests/ui/professional-admin.spec.js:10:1

# Error details

```
Error: expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= -1
Received:    -215
```

# Page snapshot

```yaml
- main [ref=e3]:
  - link "Ir para o conteúdo" [ref=e4] [cursor=pointer]:
    - /url: "#main-workspace"
  - generic [ref=e5]:
    - button "Abrir painel" [ref=e6] [cursor=pointer]:
      - img "Maximus Empreendimentos" [ref=e8]
      - generic [ref=e9]:
        - strong [ref=e10]: ERP da construção Maximus Empreendimentos
        - generic [ref=e11]: Gestão operacional da construção
    - navigation "Navegação principal" [ref=e12]:
      - button "Painel" [ref=e13] [cursor=pointer]:
        - img [ref=e15]
        - generic [ref=e17]: Painel
      - button "Obras" [ref=e18] [cursor=pointer]:
        - img [ref=e20]
        - generic [ref=e22]: Obras
      - button "Compras" [ref=e23] [cursor=pointer]:
        - img [ref=e25]
        - generic [ref=e27]: Compras
      - button "Visitas" [ref=e28] [cursor=pointer]:
        - img [ref=e30]
        - generic [ref=e32]: Visitas
      - button "RH" [ref=e33] [cursor=pointer]:
        - img [ref=e35]
        - generic [ref=e37]: RH
    - generic [ref=e38]:
      - button [ref=e39] [cursor=pointer]:
        - img [ref=e40]
      - button [ref=e42] [cursor=pointer]:
        - img [ref=e43]
    - button "A ⌄" [ref=e46] [cursor=pointer]:
      - generic [ref=e47]: A
      - generic [ref=e48]: ⌄
  - generic [ref=e49]:
    - complementary "Subnavegação da seção" [ref=e50] [cursor=pointer]:
      - button "Fixar subnavegação aberta" [ref=e51]:
        - img [ref=e53]
      - generic [ref=e55]:
        - generic [ref=e56]:
          - generic [ref=e57]: Subnavegação
          - strong [ref=e58]: Painel
        - button "Fixar subnavegação" [ref=e59]:
          - img [ref=e60]
      - navigation [ref=e62]:
        - button "Painel executivo" [ref=e63]:
          - generic [ref=e64]: Painel executivo
          - img [ref=e65]
    - generic [ref=e67]:
      - generic [ref=e68]:
        - generic [ref=e69]:
          - generic [ref=e70]: ERP da construção Maximus Empreendimentos · Controle operacional
          - heading "Painel" [level=1] [ref=e71]
          - paragraph [ref=e72]: Resumo de medições, visitas, obras e diários de campo.
        - button "Adicionar obra" [ref=e74] [cursor=pointer]
      - generic [ref=e75]:
        - article [ref=e76] [cursor=pointer]:
          - generic [ref=e77]:
            - generic [ref=e78]:
              - generic [ref=e79]: Medições
              - heading "Balanço das medições" [level=2] [ref=e80]
            - generic [ref=e81]: ›
          - generic [ref=e82]:
            - strong [ref=e83]: 33%
            - generic [ref=e84]: R$ 1.692.582,35 medidos de R$ 5.185.784,79
          - generic [ref=e85]:
            - button "REFORMA DO ESTÁDIO MUNICIPAL EM BUERAREMA-BA R$ 991.040,52 medidos 24%" [ref=e86]:
              - generic [ref=e87]:
                - strong [ref=e88]: REFORMA DO ESTÁDIO MUNICIPAL EM BUERAREMA-BA
                - generic [ref=e89]: R$ 991.040,52 medidos
              - generic [ref=e90]: 24%
            - button "Construção de quadra poliesportiva — América Dourada R$ 478.549,58 medidos 61%" [ref=e91]:
              - generic [ref=e92]:
                - strong [ref=e93]: Construção de quadra poliesportiva — América Dourada
                - generic [ref=e94]: R$ 478.549,58 medidos
              - generic [ref=e95]: 61%
            - button "Ampliação da iluminação em LED — São Felipe R$ 222.992,25 medidos 82%" [ref=e96]:
              - generic [ref=e97]:
                - strong [ref=e98]: Ampliação da iluminação em LED — São Felipe
                - generic [ref=e99]: R$ 222.992,25 medidos
              - generic [ref=e100]: 82%
        - article [ref=e101] [cursor=pointer]:
          - generic [ref=e102]:
            - generic [ref=e103]:
              - generic [ref=e104]: Agenda
              - heading "Visitas programadas" [level=2] [ref=e105]
            - generic [ref=e106]: ›
          - generic [ref=e107]:
            - strong [ref=e108]: "1"
            - generic [ref=e109]: roteiro salvo
          - button "Rota Sul — 26 de julho 26/07/2026 · 8 h previstas Agenda" [ref=e111]:
            - generic [ref=e112]:
              - strong [ref=e113]: Rota Sul — 26 de julho
              - generic [ref=e114]: 26/07/2026 · 8 h previstas
            - generic [ref=e115]: Agenda
        - article [ref=e116] [cursor=pointer]:
          - generic [ref=e117]:
            - generic [ref=e118]:
              - generic [ref=e119]: Obras
              - heading "Obras cadastradas" [level=2] [ref=e120]
            - generic [ref=e121]: ›
          - generic [ref=e122]:
            - strong [ref=e123]: "3"
            - generic [ref=e124]: obras com medição ativa
          - generic [ref=e125]:
            - button "REFORMA DO ESTÁDIO MUNICIPAL EM BUERAREMA-BA Estádio Municipal, Buerarema, Bahia 24%" [ref=e126]:
              - generic [ref=e127]:
                - strong [ref=e128]: REFORMA DO ESTÁDIO MUNICIPAL EM BUERAREMA-BA
                - generic [ref=e129]: Estádio Municipal, Buerarema, Bahia
              - generic [ref=e130]: 24%
            - button "Construção de quadra poliesportiva — América Dourada América Dourada, Bahia 61%" [ref=e131]:
              - generic [ref=e132]:
                - strong [ref=e133]: Construção de quadra poliesportiva — América Dourada
                - generic [ref=e134]: América Dourada, Bahia
              - generic [ref=e135]: 61%
            - button "Ampliação da iluminação em LED — São Felipe Estádio Municipal, São Felipe, Bahia 82%" [ref=e136]:
              - generic [ref=e137]:
                - strong [ref=e138]: Ampliação da iluminação em LED — São Felipe
                - generic [ref=e139]: Estádio Municipal, São Felipe, Bahia
              - generic [ref=e140]: 82%
        - article [ref=e141] [cursor=pointer]:
          - generic [ref=e142]:
            - generic [ref=e143]:
              - generic [ref=e144]: Campo
              - heading "Diários de obras" [level=2] [ref=e145]
            - generic [ref=e146]: ›
          - generic [ref=e147]:
            - strong [ref=e148]: "3"
            - generic [ref=e149]: obras com registros recentes
          - generic [ref=e150]:
            - button "22 JUL Preparação da base para grama sintética REFORMA DO ESTÁDIO MUNICIPAL EM BUERAREMA-BA · Registro diário atualizado pela equipe de campo ›" [ref=e151]:
              - generic [ref=e152]:
                - generic [ref=e153]: "22"
                - generic [ref=e154]: JUL
              - generic [ref=e155]:
                - strong [ref=e156]: Preparação da base para grama sintética
                - generic [ref=e157]: REFORMA DO ESTÁDIO MUNICIPAL EM BUERAREMA-BA · Registro diário atualizado pela equipe de campo
              - emphasis [ref=e158]: ›
            - button "21 JUL Movimentação de terra e regularização Construção de quadra poliesportiva — América Dourada · Registro diário atualizado pela equipe de campo ›" [ref=e159]:
              - generic [ref=e160]:
                - generic [ref=e161]: "21"
                - generic [ref=e162]: JUL
              - generic [ref=e163]:
                - strong [ref=e164]: Movimentação de terra e regularização
                - generic [ref=e165]: Construção de quadra poliesportiva — América Dourada · Registro diário atualizado pela equipe de campo
              - emphasis [ref=e166]: ›
            - button "20 JUL Instalação e conferência dos refletores Ampliação da iluminação em LED — São Felipe · Registro com evidência fotográfica ›" [ref=e167]:
              - generic [ref=e168]:
                - generic [ref=e169]: "20"
                - generic [ref=e170]: JUL
              - generic [ref=e171]:
                - strong [ref=e172]: Instalação e conferência dos refletores
                - generic [ref=e173]: Ampliação da iluminação em LED — São Felipe · Registro com evidência fotográfica
              - emphasis [ref=e174]: ›
```

# Test source

```ts
  1   | import { expect, test } from "./fixtures.js";
  2   | import { clearMacroObrasSession } from "./helpers.js";
  3   | 
  4   | test.beforeEach(async ({ page }) => {
  5   |   await clearMacroObrasSession(page);
  6   |   await page.goto("/?surface=admin&demo=1");
  7   |   await expect(page.locator("#main-workspace")).toBeVisible();
  8   | });
  9   | 
  10  | test("[professional-shell] exibe dobra e expande subnavegacao sem ocupar layout", async ({ page }) => {
  11  |   const sidebar = page.locator(".drill-sidebar");
  12  |   const handle = page.locator(".sidebar-fold-handle");
  13  | 
  14  |   await expect(handle).toBeVisible();
  15  |   const handleBox = await handle.boundingBox();
> 16  |   expect(handleBox?.x).toBeGreaterThanOrEqual(-1);
      |                        ^ Error: expect(received).toBeGreaterThanOrEqual(expected)
  17  |   expect(handleBox?.y).toBeGreaterThanOrEqual(72);
  18  | 
  19  |   const workspaceBefore = await page.locator("#main-workspace").boundingBox();
  20  |   await handle.hover();
  21  |   await expect.poll(async () => sidebar.evaluate((element) => getComputedStyle(element).transform))
  22  |     .toBe("matrix(1, 0, 0, 1, 0, 0)");
  23  |   await expect(sidebar.getByRole("button", { name: "Painel executivo" })).toBeVisible();
  24  | 
  25  |   const workspaceAfter = await page.locator("#main-workspace").boundingBox();
  26  |   expect(workspaceAfter?.x).toBe(workspaceBefore?.x);
  27  |   expect(workspaceAfter?.width).toBe(workspaceBefore?.width);
  28  | });
  29  | 
  30  | test("[professional-settings] persiste tema densidade e comportamento", async ({ page }) => {
  31  |   await page.locator('[data-route="admin-settings"]').first().click();
  32  |   await expect(page.getByRole("heading", { name: "Configurações" })).toBeVisible();
  33  | 
  34  |   await page.locator('[data-setting-field="theme"]').selectOption("dark");
  35  |   await page.locator('[data-setting-field="density"]').selectOption("compact");
  36  |   await page.locator('[data-setting-field="sidebarBehavior"]').selectOption("pinned");
  37  |   await page.locator('[data-setting-field="primaryColor"]').evaluate((element) => {
  38  |     element.value = "#146c55";
  39  |     element.dispatchEvent(new Event("input", { bubbles: true }));
  40  |   });
  41  |   await page.getByRole("button", { name: "Aplicar e salvar" }).click();
  42  | 
  43  |   await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  44  |   await expect(page.locator("html")).toHaveAttribute("data-density", "compact");
  45  |   await expect(page.locator(".desktop-layout")).toHaveClass(/sidebar-pinned-mode/);
  46  |   const customization = await page.evaluate(() => JSON.parse(localStorage.getItem("macroobras.customization")));
  47  |   expect(customization).toMatchObject({
  48  |     theme: "dark",
  49  |     density: "compact",
  50  |     sidebarBehavior: "pinned",
  51  |     primaryColor: "#146c55",
  52  |   });
  53  | });
  54  | 
  55  | test("[professional-glossary] enquadra todos os servicos e materializa card fantasma", async ({ page }) => {
  56  |   await page.locator('[data-route="admin-settings"]').first().click();
  57  |   const handle = page.locator(".sidebar-fold-handle");
  58  |   await handle.hover();
  59  |   await page.locator('.drill-sidebar [data-route="admin-diagram-library"]').click();
  60  | 
  61  |   const canvas = page.locator('[data-interactive-diagram="all-work-elements"]');
  62  |   await expect(canvas).toBeVisible();
  63  |   await expect(canvas).toHaveAttribute("data-hydrated", "true");
  64  |   await expect.poll(async () => Number(await canvas.getAttribute("data-diagram-zoom"))).toBeLessThan(1);
  65  | 
  66  |   const nodes = canvas.locator("[data-diagram-node]");
  67  |   const nodeCount = await nodes.count();
  68  |   const handleBox = await nodes.first().locator("[data-edge-handle]").boundingBox();
  69  |   const canvasBox = await canvas.boundingBox();
  70  |   expect(handleBox).not.toBeNull();
  71  |   expect(canvasBox).not.toBeNull();
  72  | 
  73  |   await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  74  |   await page.mouse.down();
  75  |   await page.mouse.move(canvasBox.x + canvasBox.width - 54, canvasBox.y + canvasBox.height - 54, { steps: 8 });
  76  |   await expect(canvas.locator(".diagram-node-ghost")).toBeVisible();
  77  |   await page.mouse.up();
  78  | 
  79  |   await expect(canvas.locator(".diagram-node-ghost")).toHaveCount(0);
  80  |   await expect(canvas.locator("[data-diagram-node]")).toHaveCount(nodeCount + 1);
  81  |   const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("macroobras.diagramModels")));
  82  |   expect(saved["all-work-elements"].nodes).toHaveLength(nodeCount + 1);
  83  |   expect(saved["all-work-elements"].edges.length).toBeGreaterThan(0);
  84  | });
  85  | 
  86  | test("[professional-rh] edita ficha vinculada ao card do organograma", async ({ page }) => {
  87  |   await page.locator('[data-route="admin-rh"]').first().click();
  88  |   const person = page.locator('[data-interactive-diagram="rh-main"] [data-node-id="rh-person-1"]');
  89  |   await expect(person).toBeVisible();
  90  |   await person.click({ position: { x: 80, y: 54 } });
  91  | 
  92  |   const form = page.locator('[data-diagram-record-form][data-diagram-id="rh-main"]');
  93  |   await expect(form).toBeVisible();
  94  |   await form.locator('[data-diagram-record-field="title"]').fill("Marina de Campo");
  95  |   await form.getByRole("button", { name: "Salvar registro" }).click();
  96  | 
  97  |   await expect(page.locator('[data-interactive-diagram="rh-main"]')).toContainText("Marina de Campo");
  98  |   const savedTitle = await page.evaluate(() => {
  99  |     const models = JSON.parse(localStorage.getItem("macroobras.diagramModels"));
  100 |     return models["rh-main"].nodes.find((node) => node.id === "rh-person-1")?.title;
  101 |   });
  102 |   expect(savedTitle).toBe("Marina de Campo");
  103 | });
  104 | 
  105 | test("[professional-diary] navega timeline folha diaria detalhes e notas", async ({ page }) => {
  106 |   await page.locator('[data-route="admin-works"]').first().click();
  107 |   await expect(page.getByRole("heading", { name: "Obras" })).toBeVisible();
  108 |   await page.locator('.work-horizontal-actions [data-route="admin-work-diary"]').click();
  109 | 
  110 |   await expect(page.getByRole("heading", { name: "Diário de obras" })).toBeVisible();
  111 |   await expect(page.locator(".diary-day-timeline")).toBeVisible();
  112 |   await expect(page.locator(".diary-day-sheet")).toBeVisible();
  113 |   await expect(page.locator(".diary-floating-detail")).toBeVisible();
  114 |   await expect(page.locator(".diary-sheet-table tbody tr").first()).toBeVisible();
  115 | 
  116 |   const rows = page.locator(".diary-row-action");
```