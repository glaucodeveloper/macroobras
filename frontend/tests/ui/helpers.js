export async function clearMacroObrasSession(page) {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

function shouldMockBackend() {
  return ["1", "true", "yes"].includes(String(process.env.MOCK_MACROOBRAS_BACKEND || "").toLowerCase());
}

export async function mockBackend(page) {
  if (!shouldMockBackend()) return;

  await page.route("http://127.0.0.1:7654/rpc/**", async (route) => {
    const method = new URL(route.request().url()).pathname.split("/").pop();
    const responses = {
      obterRotaPublicaColaborador: {
        data: {
          disponivel: true,
          localAtivo: true,
          localBaseUrl: "http://127.0.0.1:5173",
          baseUrl: "https://macroobras.example.test",
          mensagem: "Colaborador publicado para teste",
        },
      },
      obterStatusOkf: {
        data: {
          configurado: true,
          pronto: true,
          repoSsh: "git@example.test:macroobras/okf.git",
          branch: "main",
          localDir: ".okf/repo",
          knowledgeDir: "macroobras",
          envFile: ".env",
          sshKey: "id_macroobras",
          sshKeyExiste: true,
          mensagem: "OKF pronto para teste",
        },
      },
      obterStatusInstalador: {
        data: {
          installDir: "/opt/macroobras",
          ftpHost: "192.168.0.24",
          ftpPort: "2121",
          collaboratorEndpoint: "https://colaboradores.macroobras.local/twa",
          archiveEndpoint: "file:///opt/macroobras/archive",
          pathReady: true,
          ftpReady: true,
          endpointReady: true,
          archiveReady: true,
          needsAdmin: true,
          message: "Instalador pronto para teste",
          commands: [],
        },
      },
      prepararOkf: {
        data: {
          mensagem: "OKF processado no teste",
          status: {
            configurado: true,
            pronto: true,
            localDir: ".okf/repo",
            knowledgeDir: "macroobras",
            mensagem: "OKF preparado",
          },
        },
      },
      executarInstalador: {
        data: {
          mensagem: "Instalação processada no teste",
          status: {
            endpointReady: true,
            ftpReady: true,
            archiveReady: true,
            pathReady: true,
            message: "Introdução concluída",
          },
        },
      },
    };

    if (responses[method]) {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(responses[method]),
      });
      return;
    }

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ data: { message: `mock sem resposta para ${method}` } }),
    });
  });
}
