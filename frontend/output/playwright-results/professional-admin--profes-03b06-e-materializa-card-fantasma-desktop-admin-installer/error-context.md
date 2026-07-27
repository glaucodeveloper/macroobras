# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: professional-admin.spec.js >> [professional-glossary] enquadra todos os servicos e materializa card fantasma
- Location: tests/ui/professional-admin.spec.js:55:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.hover: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('.sidebar-fold-handle')
    - locator resolved to <button aria-expanded="false" title="Fixar menu aberto" class="sidebar-fold-handle" data-message="toggle-sidebar" aria-controls="carbon-subnavigation" aria-label="Fixar subnavegação aberta">…</button>
  - attempting hover action
    - waiting for element to be visible and stable
    - element is visible and stable
    - scrolling into view if needed
    - done scrolling
    - performing hover action
    - <section tabindex="-1" id="main-workspace" class="workspace maximus-workspace">…</section> intercepts pointer events
  - retrying hover action
    - waiting for element to be visible and stable
    - element is not stable
  - retrying hover action
    - waiting 20ms
    2 × waiting for element to be visible and stable
      - element is not stable
    - retrying hover action
      - waiting 100ms
    56 × waiting for element to be visible and stable
       - element is not stable
     - retrying hover action
       - waiting 500ms

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
    - complementary "Subnavegação da seção" [ref=e50]:
      - button "Fixar subnavegação aberta" [ref=e51] [cursor=pointer]:
        - img [ref=e53]
      - generic [ref=e55]:
        - generic [ref=e56]:
          - generic [ref=e57]: Subnavegação
          - strong [ref=e58]: Configurações
        - button "Fixar subnavegação" [ref=e59] [cursor=pointer]:
          - img [ref=e60]
      - navigation [ref=e62]:
        - button "Central administrativa" [ref=e63] [cursor=pointer]:
          - generic [ref=e64]: Central administrativa
          - img [ref=e65]
        - button "Plataforma mobile" [ref=e67] [cursor=pointer]:
          - generic [ref=e68]: Plataforma mobile
          - img [ref=e69]
        - button "Acessos de campo" [ref=e71] [cursor=pointer]:
          - generic [ref=e72]: Acessos de campo
          - img [ref=e73]
        - button "Modelos de diagramas" [ref=e75] [cursor=pointer]:
          - generic [ref=e76]: Modelos de diagramas
          - img [ref=e77]
        - button "Manual" [ref=e79] [cursor=pointer]:
          - generic [ref=e80]: Manual
          - img [ref=e81]
        - button "Importar e exportar" [ref=e83] [cursor=pointer]:
          - generic [ref=e84]: Importar e exportar
          - img [ref=e85]
        - button "Configuração de login" [ref=e87] [cursor=pointer]:
          - generic [ref=e88]: Configuração de login
          - img [ref=e89]
    - generic [ref=e91]:
      - generic [ref=e92]:
        - generic [ref=e93]:
          - generic [ref=e94]: ERP da construção Maximus Empreendimentos · Controle operacional
          - heading "Configurações" [level=1] [ref=e95]
          - paragraph [ref=e96]: Personalize a experiência e administre os serviços desta estação em um único lugar.
        - generic [ref=e97]:
          - button "Login e segurança" [ref=e98] [cursor=pointer]
          - button "Administrar instalação" [ref=e99] [cursor=pointer]
      - generic [ref=e100]:
        - article [ref=e101]:
          - generic [ref=e102]:
            - generic [ref=e103]: Central administrativa da estação
            - heading "Uma interface ajustada à sua operação" [level=2] [ref=e104]
            - paragraph [ref=e105]: Marca, aparência, acesso, dados e serviços locais são persistidos no computador. As alterações visuais entram em vigor imediatamente após salvar.
            - generic [ref=e106]:
              - generic [ref=e107]: Tema claro e escuro
              - generic [ref=e108]: Dados persistentes
              - generic [ref=e109]: Operação local
          - generic [ref=e110]:
            - generic [ref=e111]:
              - generic [ref=e112]: Usuário atual
              - strong [ref=e113]: Administrador
            - generic [ref=e114]:
              - generic [ref=e115]: Email
              - strong [ref=e116]: icaroglaucooliveira@gmail.com
            - generic [ref=e117]:
              - generic [ref=e118]: CPF
              - strong [ref=e119]: 123.456.789-09
            - generic [ref=e120]:
              - generic [ref=e121]: Última personalização
              - strong [ref=e122]: Configuração padrão
        - region "Saúde dos serviços" [ref=e123]:
          - article [ref=e124]:
            - generic [ref=e126]:
              - generic [ref=e127]: Autorização da máquina
              - strong [ref=e128]: Atenção necessária
              - paragraph [ref=e129]: Valide o token uma única vez no instalador.
          - article [ref=e130]:
            - generic [ref=e132]:
              - generic [ref=e133]: Base de conhecimento OKF
              - strong [ref=e134]: Operacional
              - paragraph [ref=e135]: OKF preparado no modo frontend-only.
          - article [ref=e136]:
            - generic [ref=e138]:
              - generic [ref=e139]: Aplicação de campo
              - strong [ref=e140]: Online
              - paragraph [ref=e141]: http://127.0.0.1:7654/?surface=twa
          - article [ref=e142]:
            - generic [ref=e144]:
              - generic [ref=e145]: Persistência da interface
              - strong [ref=e146]: Ativa
              - paragraph [ref=e147]: Tema, diagramas, organograma e notas de diário salvos nesta estação.
        - generic [ref=e148]:
          - article [ref=e149]:
            - heading "Aparência e comportamento" [level=2] [ref=e150]
            - generic [ref=e151]:
              - generic [ref=e152]:
                - generic [ref=e153]:
                  - generic [ref=e154]: Nome da estação
                  - textbox "Nome da estação" [ref=e155]: ERP da construção Maximus Empreendimentos
                - generic [ref=e156]:
                  - generic [ref=e157]: Descrição operacional
                  - textbox "Descrição operacional" [ref=e158]: Gestão operacional da construção
                - generic [ref=e159]:
                  - generic [ref=e160]: Cor principal
                  - generic [ref=e161]:
                    - 'textbox "Cor principal #0a61d8" [ref=e162]': "#0a61d8"
                    - code [ref=e163]: "#0a61d8"
                - generic [ref=e164]:
                  - generic [ref=e165]: Tema
                  - combobox "Tema" [ref=e166]:
                    - option "Seguir o sistema" [selected]
                    - option "Claro"
                    - option "Escuro"
                - generic [ref=e167]:
                  - generic [ref=e168]: Densidade
                  - combobox "Densidade" [ref=e169]:
                    - option "Confortável" [selected]
                    - option "Compacta"
                - generic [ref=e170]:
                  - generic [ref=e171]: Subnavegação
                  - combobox "Subnavegação" [ref=e172]:
                    - option "Abrir ao passar o mouse" [selected]
                    - option "Manter fixada"
              - generic [ref=e173]:
                - generic [ref=e174]: Configurações aplicadas a todas as páginas deste navegador.
                - button "Aplicar e salvar" [ref=e175] [cursor=pointer]
          - article [ref=e176]:
            - heading "Acesso e identidade" [level=2] [ref=e177]
            - paragraph [ref=e178]: O login administrativo usa email e CPF. A autorização GitHub pertence à máquina e não bloqueia novamente o usuário após a instalação.
            - generic [ref=e179]:
              - generic [ref=e180]: AD
              - generic [ref=e181]:
                - strong [ref=e182]: Administrador
                - generic [ref=e183]: icaroglaucooliveira@gmail.com
            - generic [ref=e184]:
              - button "Editar login administrativo Nome, email, CPF e token da máquina" [ref=e185] [cursor=pointer]:
                - strong [ref=e186]: Editar login administrativo
                - generic [ref=e187]: Nome, email, CPF e token da máquina
              - button "Gerenciar acessos de campo Encarregados vinculados por obra" [ref=e188] [cursor=pointer]:
                - strong [ref=e189]: Gerenciar acessos de campo
                - generic [ref=e190]: Encarregados vinculados por obra
              - button "Encerrar sessão Sair com segurança desta estação" [ref=e191] [cursor=pointer]:
                - strong [ref=e192]: Encerrar sessão
                - generic [ref=e193]: Sair com segurança desta estação
        - generic [ref=e194]:
          - generic [ref=e195]:
            - generic [ref=e196]:
              - text: Administração do computador
              - heading "Serviços e manutenção" [level=2] [ref=e197]
            - paragraph [ref=e198]: Atalhos para as rotinas técnicas sem exigir uso do terminal.
          - generic [ref=e199]:
            - button "01 Instalação da estação Token GitHub, pasta local, FTP e comandos de inicialização. Configurar" [ref=e200] [cursor=pointer]:
              - generic [ref=e201]: "01"
              - strong [ref=e202]: Instalação da estação
              - generic [ref=e203]: Token GitHub, pasta local, FTP e comandos de inicialização.
              - emphasis [ref=e204]: Configurar
            - button "02 Conhecimento e OKF Baixar, preparar e verificar a base operacional da aplicação. main" [ref=e205] [cursor=pointer]:
              - generic [ref=e206]: "02"
              - strong [ref=e207]: Conhecimento e OKF
              - generic [ref=e208]: Baixar, preparar e verificar a base operacional da aplicação.
              - emphasis [ref=e209]: main
            - button "03 Plataforma de campo Publicação local, rede e acesso externo para encarregados. Online" [ref=e210] [cursor=pointer]:
              - generic [ref=e211]: "03"
              - strong [ref=e212]: Plataforma de campo
              - generic [ref=e213]: Publicação local, rede e acesso externo para encarregados.
              - emphasis [ref=e214]: Online
            - button "04 Modelos de dados Glossário de serviços, requisitos e fluxos persistidos em OKF. Diagramas" [ref=e215] [cursor=pointer]:
              - generic [ref=e216]: "04"
              - strong [ref=e217]: Modelos de dados
              - generic [ref=e218]: Glossário de serviços, requisitos e fluxos persistidos em OKF.
              - emphasis [ref=e219]: Diagramas
            - button "05 Importar e exportar Backup operacional em CSV e entrada controlada de registros. Dados" [ref=e220] [cursor=pointer]:
              - generic [ref=e221]: "05"
              - strong [ref=e222]: Importar e exportar
              - generic [ref=e223]: Backup operacional em CSV e entrada controlada de registros.
              - emphasis [ref=e224]: Dados
            - button "06 Manual e diagnóstico Fluxos guiados, suporte à operação e informações da estação. Ajuda" [ref=e225] [cursor=pointer]:
              - generic [ref=e226]: "06"
              - strong [ref=e227]: Manual e diagnóstico
              - generic [ref=e228]: Fluxos guiados, suporte à operação e informações da estação.
              - emphasis [ref=e229]: Ajuda
        - generic [ref=e230]:
          - article [ref=e231]:
            - heading "Instalação local" [level=2] [ref=e232]
            - generic [ref=e233]:
              - generic [ref=e234]:
                - generic [ref=e235]: Token GitHub
                - strong [ref=e236]: Não validado
              - generic [ref=e237]:
                - generic [ref=e238]: Pasta de instalação
                - strong [ref=e239]: Não escolhida
              - generic [ref=e240]:
                - generic [ref=e241]: Servidor FTP
                - strong [ref=e242]: Pendente
            - button "Abrir administração da instalação" [ref=e243] [cursor=pointer]
          - article [ref=e244]:
            - heading "Operação e dados" [level=2] [ref=e245]
            - generic [ref=e246]:
              - generic [ref=e247]:
                - generic [ref=e248]: Repositório OKF
                - strong [ref=e249]: Não configurado
              - generic [ref=e250]:
                - generic [ref=e251]: Diretório de conhecimento
                - strong [ref=e252]: Aguardando backend
              - generic [ref=e253]:
                - generic [ref=e254]: Aplicação de campo
                - strong [ref=e255]: http://127.0.0.1:7654/?surface=twa
            - generic [ref=e256]:
              - button "Atualizar serviços" [ref=e257] [cursor=pointer]
              - button "Exportar backup CSV" [ref=e258] [cursor=pointer]
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
  16  |   expect(handleBox?.x).toBeGreaterThanOrEqual(-1);
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
> 58  |   await handle.hover();
      |                ^ Error: locator.hover: Test timeout of 30000ms exceeded.
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
  117 |   if (await rows.count() > 1) await rows.nth(1).click();
  118 |   else await rows.first().click();
  119 | 
  120 |   const note = page.locator("[data-diary-note]");
  121 |   await expect(note).toBeVisible();
  122 |   await note.fill("Equipe liberada após inspeção de qualidade.");
  123 |   const detailId = await note.getAttribute("data-diary-note");
  124 |   const savedNote = await page.evaluate((id) => {
  125 |     const notes = JSON.parse(localStorage.getItem("macroobras.diaryNotes"));
  126 |     return notes[id];
  127 |   }, detailId);
  128 |   expect(savedNote).toBe("Equipe liberada após inspeção de qualidade.");
  129 |   await expect(page.getByText("Total das compras deste dia")).toBeVisible();
  130 | });
  131 | 
  132 | test("[professional-visits] comunica o novo gesto de rota inteligente", async ({ page }) => {
  133 |   await page.locator('[data-route="admin-visits"]').first().click();
  134 |   await expect(page.getByRole("heading", { name: "Visitas" })).toBeVisible();
  135 |   await expect(page.getByText("Rota inteligente por estradas")).toBeVisible();
  136 |   await expect(page.getByText("Pressione por 0,6 s para iniciar o cálculo.")).toBeVisible();
  137 |   await expect(page.getByText(/rota viária mais curta acompanha o destino/i)).toBeVisible();
  138 | });
  139 | 
```