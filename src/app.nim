import std/[json, os]

when not defined(jazzyWeb):
  const webviewImpl = currentSourcePath().parentDir().parentDir().parentDir().parentDir() /
    "jazzy-desktop" / "src" / "jazzy_desktop" / "webview_impl.cpp"
  {.compile: webviewImpl.}

import jazzy_desktop
import macroobras/[admin_service, collaborator_service, config, installer_service, okf_service, response_utils]

proc criarServicoAdministrativo(payloadJson: string): string {.expose.} =
  let payload = parseJson(payloadJson)
  ok(criarServicoAdministrativoPayload(payload))

proc adicionarLinhaCronograma(payloadJson: string): string {.expose.} =
  let payload = parseJson(payloadJson)
  ok(adicionarLinhaCronogramaPayload(payload))

proc sobrescreverCronograma(payloadJson: string): string {.expose.} =
  let payload = parseJson(payloadJson)
  ok(sobrescreverCronogramaPayload(payload))

proc alterarPercentualItemMedicao(payloadJson: string): string {.expose.} =
  let payload = parseJson(payloadJson)
  ok(alterarPercentualItemMedicaoPayload(payload))

proc gerarComparacaoPercentuaisMedicao(payloadJson: string): string {.expose.} =
  let payload = parseJson(payloadJson)
  ok(gerarComparacaoPercentuaisMedicaoPayload(payload))

proc obterRotaPublicaColaborador(): string {.expose.} =
  let localBaseUrl = collaboratorTarget() & CollaboratorBasePath
  try:
    let publicUrl = collaboratorPublicBaseUrl()
    if publicUrl.len == 0:
      return ok(%*{
        "disponivel": false,
        "localAtivo": true,
        "localBaseUrl": localBaseUrl,
        "baseUrl": "",
        "mensagem": "Porta local ativa; URL pública ngrok aguardando ou bloqueada."
      })
    ok(%*{
      "disponivel": true,
      "localAtivo": true,
      "localBaseUrl": localBaseUrl,
      "baseUrl": publicUrl
    })
  except CatchableError as e:
    ok(%*{
      "disponivel": false,
      "localAtivo": true,
      "localBaseUrl": localBaseUrl,
      "baseUrl": "",
      "mensagem": e.msg
    })

proc obterStatusOkf(): string {.expose.} =
  ok(okfStatusPayload())

proc prepararOkf(): string {.expose.} =
  ok(prepareOkfPayload())

proc obterStatusInstalador(): string {.expose.} =
  ok(installerStatusPayload())

proc executarInstalador(): string {.expose.} =
  ok(executeInstallerPayload())

Route.get("/api/colaboradores", colaboradorStatus)
Route.post("/api/colaboradores/login", colaboradorLogin)
Route.post("/api/colaboradores/servicos", colaboradorOk)
Route.post("/api/colaboradores/rotinas", colaboradorOk)
Route.post("/api/colaboradores/cronogramas/alocar", colaboradorOk)
Route.post("/api/colaboradores/diarios/registrar", colaboradorOk)
Route.post("/api/colaboradores/diarios/completar", colaboradorOk)
Route.post("/api/colaboradores/compras/solicitar", colaboradorOk)
Route.post("/api/colaboradores/compras/anexar-recibo", colaboradorOk)

configureLinuxWebviewEnvironment()
startCollaboratorNgrok()

startDesktopApp(
  title = "MacroObras",
  width = 1448,
  height = 1086,
  devUrl = "http://localhost:5173",
  prodDir = "../frontend/dist",
  corsOrigins = "*",
  port = AppPort,
  address = AppHost
)
