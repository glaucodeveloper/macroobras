import std/[exitprocs, httpclient, json, os, osproc, strutils]

import jazzy_desktop

import ./config
import ./installer_service

var collaboratorNgrokProcess: Process
var collaboratorLanProcess: Process

proc publicAppPath(): string = "/?surface=twa"
proc lanPort(): string = getEnv("MACROOBRAS_LAN_PROXY_PORT", "7655")
proc lanFlagPath(): string = appRootDir() / "config" / "lan-collaborator.enabled"

proc tunnelMatchesCollaborator(tunnel: JsonNode): bool =
  let tunnelAddr = tunnel{"config"}{"addr"}.getStr("")
  let target = collaboratorTarget()
  tunnelAddr == target or tunnelAddr == target.replace("127.0.0.1", "localhost")

proc bundledNgrokPath(): string =
  let baseDir = getAppDir()
  when defined(windows):
    result = baseDir / "vendor" / "ngrok" / "windows" / "ngrok.exe"
  elif defined(linux):
    result = baseDir / "vendor" / "ngrok" / "linux" / "ngrok"
  else:
    result = ""

proc projectNgrokPath(): string =
  let baseDir = currentSourcePath().parentDir().parentDir().parentDir()
  when defined(windows):
    result = baseDir / "vendor" / "ngrok" / "windows" / "ngrok.exe"
  elif defined(linux):
    result = baseDir / "vendor" / "ngrok" / "linux" / "ngrok"
  else:
    result = ""

proc embeddedNgrokPath(): string =
  when defined(macroobrasEmbedNgrok):
    when defined(windows):
      const embeddedNgrok = staticRead("../../vendor/ngrok/windows/ngrok.exe")
      let filename = "macroobras-ngrok.exe"
    elif defined(linux):
      const embeddedNgrok = staticRead("../../vendor/ngrok/linux/ngrok")
      let filename = "macroobras-ngrok"
    else:
      return ""
    let path = getTempDir() / filename
    if not fileExists(path) or getFileSize(path) != embeddedNgrok.len:
      writeFile(path, embeddedNgrok)
      when not defined(windows):
        discard execShellCmd("chmod 700 " & quoteShell(path))
    path
  else:
    ""

proc ngrokExecutable*(): string =
  let explicit = getEnv("MACROOBRAS_NGROK_BIN", "")
  if explicit.len > 0:
    return explicit
  let embedded = embeddedNgrokPath()
  if embedded.len > 0 and fileExists(embedded):
    return embedded
  let appBundled = bundledNgrokPath()
  if appBundled.len > 0 and fileExists(appBundled):
    return appBundled
  let projectBundled = projectNgrokPath()
  if projectBundled.len > 0 and fileExists(projectBundled):
    return projectBundled
  "ngrok"

proc ngrokInstalled*(): bool =
  let executable = ngrokExecutable()
  if executable == "ngrok":
    return findExe("ngrok").len > 0
  fileExists(executable)

proc collaboratorPublicOrigin*(): string =
  let client = newHttpClient(timeout = 900)
  defer: client.close()
  for apiUrl in ngrokApiUrls():
    try:
      let tunnels = parseJson(client.getContent(apiUrl))["tunnels"]
      for preferHttps in [true, false]:
        for tunnel in tunnels:
          if not tunnelMatchesCollaborator(tunnel):
            continue
          let publicUrl = tunnel{"public_url"}.getStr("")
          if publicUrl.len == 0:
            continue
          if preferHttps and not publicUrl.startsWith("https://"):
            continue
          return publicUrl.strip(chars = {'/'})
    except CatchableError:
      discard
  ""

proc collaboratorPublicBaseUrl*(): string =
  let origin = collaboratorPublicOrigin()
  if origin.len == 0: "" else: origin & CollaboratorBasePath

proc collaboratorPublicAppUrl*(): string =
  let origin = collaboratorPublicOrigin()
  if origin.len == 0: "" else: origin & publicAppPath()

proc collaboratorNgrokRunning*(): bool =
  collaboratorNgrokProcess != nil and collaboratorNgrokProcess.running

proc collaboratorLanRunning*(): bool =
  collaboratorLanProcess != nil and collaboratorLanProcess.running

proc stopCollaboratorProcesses() {.noconv.} =
  if collaboratorNgrokProcess != nil:
    if collaboratorNgrokProcess.running:
      collaboratorNgrokProcess.terminate()
    collaboratorNgrokProcess.close()
    collaboratorNgrokProcess = nil
  if collaboratorLanProcess != nil:
    if collaboratorLanProcess.running:
      collaboratorLanProcess.terminate()
    collaboratorLanProcess.close()
    collaboratorLanProcess = nil

proc stopCollaboratorNgrok*() =
  if collaboratorNgrokProcess != nil:
    if collaboratorNgrokProcess.running:
      collaboratorNgrokProcess.terminate()
    collaboratorNgrokProcess.close()
    collaboratorNgrokProcess = nil

proc startCollaboratorNgrok*(force = false) =
  if not force and not envEnabled("MACROOBRAS_ENABLE_NGROK", false):
    return
  if collaboratorNgrokRunning() or not ngrokInstalled():
    return
  var args = @["http", collaboratorTarget()]
  let domain = getEnv("MACROOBRAS_NGROK_DOMAIN", "")
  if domain.len > 0:
    args.add("--url")
    args.add(domain)
  try:
    let ngrokBin = ngrokExecutable()
    collaboratorNgrokProcess = startProcess(ngrokBin, args = args, options = (if ngrokBin == "ngrok": {poUsePath, poParentStreams} else: {poParentStreams}))
    addExitProc(stopCollaboratorProcesses)
  except OSError as error:
    echo "MacroObras ngrok: " & error.msg

proc startCollaboratorLan*(): bool =
  if collaboratorLanRunning():
    return true
  let script = appRootDir() / "tools" / "lan_proxy.py"
  if not fileExists(script):
    return false
  try:
    collaboratorLanProcess = startProcess(
      "python3",
      args = @[script, "--listen-host", "0.0.0.0", "--listen-port", lanPort(), "--target", collaboratorTarget()],
      options = {poUsePath, poParentStreams}
    )
    createDir(lanFlagPath().parentDir)
    writeFile(lanFlagPath(), "enabled\n")
    addExitProc(stopCollaboratorProcesses)
    sleep(500)
    result = collaboratorLanRunning()
  except OSError:
    result = false

proc restoreRequestedCollaboratorLan*() =
  if fileExists(lanFlagPath()):
    discard startCollaboratorLan()

proc lanAppUrl(): string =
  if collaboratorLanRunning() or fileExists(lanFlagPath()):
    "http://" & lanIp() & ":" & lanPort() & publicAppPath()
  else:
    ""

proc lanApiUrl(): string =
  if collaboratorLanRunning() or fileExists(lanFlagPath()):
    "http://" & lanIp() & ":" & lanPort() & CollaboratorBasePath
  else:
    ""

proc collaboratorPlatformStatusPayload*(): JsonNode =
  let localOrigin = collaboratorTarget().strip(chars = {'/'})
  let publicOrigin = collaboratorPublicOrigin()
  let publicReady = publicOrigin.len > 0
  let lanReady = collaboratorLanRunning()
  var message = "Plataforma do encarregado disponível na própria máquina."
  if collaboratorNgrokRunning() and publicReady:
    message = "Plataforma do encarregado publicada automaticamente pelo ngrok."
  elif collaboratorNgrokRunning():
    message = "ngrok iniciado; aguardando a URL pública."
  elif lanReady:
    message = "Plataforma do encarregado disponível na rede local."
  %*{
    "disponivel": publicReady,
    "habilitado": envEnabled("MACROOBRAS_ENABLE_NGROK", false) or collaboratorNgrokRunning(),
    "processoAtivo": collaboratorNgrokRunning(),
    "ngrokInstalado": ngrokInstalled(),
    "localAtivo": true,
    "redeLocalAtiva": lanReady,
    "localAppUrl": localOrigin & publicAppPath(),
    "lanAppUrl": lanAppUrl(),
    "publicAppUrl": (if publicReady: publicOrigin & publicAppPath() else: ""),
    "localApiUrl": localOrigin & CollaboratorBasePath,
    "lanApiUrl": lanApiUrl(),
    "publicApiUrl": (if publicReady: publicOrigin & CollaboratorBasePath else: ""),
    "mensagem": message
  }

proc iniciarPlataformaMobilePayload*(): JsonNode =
  startCollaboratorNgrok(true)
  sleep(650)
  collaboratorPlatformStatusPayload()

proc ativarDistribuicaoLocalPayload*(): JsonNode =
  let started = startCollaboratorLan()
  result = collaboratorPlatformStatusPayload()
  result["mensagem"] = %(if started: "Endpoint do encarregado distribuído automaticamente na rede local." else: "Não foi possível iniciar a distribuição local.")

proc pararPlataformaMobilePayload*(): JsonNode =
  stopCollaboratorNgrok()
  collaboratorPlatformStatusPayload()

proc colaboradorLogin*(ctx: Context) {.async.} =
  ctx.json(%*{"token": "dev-encarregado", "nome": "Encarregado de obra", "perfil": "encarregado"})

proc colaboradorStatus*(ctx: Context) {.async.} =
  ctx.json(%*{
    "ok": true,
    "servico": "macroobras-encarregado",
    "descricao": "Plataforma externa do encarregado de obra e API operacional.",
    "plataforma": collaboratorPlatformStatusPayload(),
    "endpoints": [
      {"method": "POST", "path": "/api/colaboradores/login"},
      {"method": "POST", "path": "/api/colaboradores/servicos"},
      {"method": "POST", "path": "/api/colaboradores/rotinas"},
      {"method": "POST", "path": "/api/colaboradores/cronogramas/alocar"},
      {"method": "POST", "path": "/api/colaboradores/diarios/registrar"},
      {"method": "POST", "path": "/api/colaboradores/diarios/completar"},
      {"method": "POST", "path": "/api/colaboradores/compras/solicitar"},
      {"method": "POST", "path": "/api/colaboradores/compras/anexar-recibo"},
      {"method": "POST", "path": "/api/colaboradores/compras/comprovar-entrega"}
    ],
    "conhecimentoOkf": {
      "papel": "grafo dos elementos, materiais e relações da obra",
      "fonte": "cronograma-grafico"
    }
  })

proc colaboradorOk*(ctx: Context) {.async.} =
  ctx.json(%*{"ok": true, "conhecimentoOkfPendente": true})
