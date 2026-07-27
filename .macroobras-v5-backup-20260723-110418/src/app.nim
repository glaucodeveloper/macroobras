import std/[json, os]

when not defined(jazzyWeb):
  const webviewImpl = currentSourcePath().parentDir().parentDir().parentDir().parentDir() /
    "jazzy-desktop" / "src" / "jazzy_desktop" / "webview_impl.cpp"
  {.compile: webviewImpl.}

import jazzy_desktop
import macroobras/[admin_service, collaborator_service, config, installer_service, okf_service, operations_service, response_utils]

proc criarServicoAdministrativo(payloadJson: string): string {.expose.} =
  ok(criarServicoAdministrativoPayload(parseJson(payloadJson)))
proc adicionarLinhaCronograma(payloadJson: string): string {.expose.} =
  ok(adicionarLinhaCronogramaPayload(parseJson(payloadJson)))
proc sobrescreverCronograma(payloadJson: string): string {.expose.} =
  ok(sobrescreverCronogramaPayload(parseJson(payloadJson)))
proc alterarPercentualItemMedicao(payloadJson: string): string {.expose.} =
  ok(alterarPercentualItemMedicaoPayload(parseJson(payloadJson)))
proc gerarComparacaoPercentuaisMedicao(payloadJson: string): string {.expose.} =
  ok(gerarComparacaoPercentuaisMedicaoPayload(parseJson(payloadJson)))

proc criarObraPorPlanilha(payloadJson: string): string {.expose.} =
  ok(criarObraPorPlanilhaPayload(parseJson(payloadJson)))
proc iniciarFluxoCompra(payloadJson: string): string {.expose.} =
  ok(iniciarFluxoCompraPayload(parseJson(payloadJson)))
proc autorizarCompra(payloadJson: string): string {.expose.} =
  ok(autorizarCompraPayload(parseJson(payloadJson)))
proc comprovarEntrega(payloadJson: string): string {.expose.} =
  ok(comprovarEntregaPayload(parseJson(payloadJson)))
proc salvarPlanejamentoNos(payloadJson: string): string {.expose.} =
  ok(salvarPlanejamentoNosPayload(parseJson(payloadJson)))
proc salvarRotaVisitas(payloadJson: string): string {.expose.} =
  ok(salvarRotaVisitasPayload(parseJson(payloadJson)))
proc salvarOrganograma(payloadJson: string): string {.expose.} =
  ok(salvarOrganogramaPayload(parseJson(payloadJson)))

proc obterRotaPublicaColaborador(): string {.expose.} =
  ok(collaboratorPlatformStatusPayload())

proc obterStatusPlataformaMobile(): string {.expose.} =
  ok(collaboratorPlatformStatusPayload())

proc iniciarPlataformaMobile(): string {.expose.} =
  ok(iniciarPlataformaMobilePayload())

proc pararPlataformaMobile(): string {.expose.} =
  ok(pararPlataformaMobilePayload())

proc obterStatusOkf(): string {.expose.} = ok(okfStatusPayload())
proc prepararOkf(): string {.expose.} = ok(prepareOkfPayload())
proc obterStatusInstalador(): string {.expose.} = ok(installerStatusPayload())
proc executarInstalador(): string {.expose.} = ok(executeInstallerPayload())

Route.get("/api/colaboradores", colaboradorStatus)
Route.post("/api/colaboradores/login", colaboradorLogin)
Route.post("/api/colaboradores/servicos", colaboradorOk)
Route.post("/api/colaboradores/rotinas", colaboradorOk)
Route.post("/api/colaboradores/cronogramas/alocar", colaboradorOk)
Route.post("/api/colaboradores/diarios/registrar", colaboradorOk)
Route.post("/api/colaboradores/diarios/completar", colaboradorOk)
Route.post("/api/colaboradores/compras/solicitar", colaboradorOk)
Route.post("/api/colaboradores/compras/anexar-recibo", colaboradorOk)
Route.post("/api/colaboradores/compras/comprovar-entrega", colaboradorOk)

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
