import std/[exitprocs, httpclient, json, os, osproc, strutils]

import jazzy_desktop

import ./config

var collaboratorNgrokProcess: Process

proc publicAppPath(): string = "/?surface=twa"

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

proc stopCollaboratorNgrokProcess() {.noconv.} =
  if collaboratorNgrokProcess != nil:
    if collaboratorNgrokProcess.running:
      collaboratorNgrokProcess.terminate()
    collaboratorNgrokProcess.close()
    collaboratorNgrokProcess = nil

proc stopCollaboratorNgrok*() =
  stopCollaboratorNgrokProcess()

proc startCollaboratorNgrok*(force = false) =
  if not force and not envEnabled("MACROOBRAS_ENABLE_NGROK", false):
    echo "MacroObras mobile tunnel disabled; local mobile platform remains available."
    return

  if collaboratorNgrokRunning():
    return

  if not ngrokInstalled():
    echo "MacroObras mobile tunnel could not start: ngrok executable not found."
    return

  var args = @["http", collaboratorTarget()]
  let domain = getEnv("MACROOBRAS_NGROK_DOMAIN", "")
  if domain.len > 0:
    args.add("--url")
    args.add(domain)

  try:
    let ngrokBin = ngrokExecutable()
    collaboratorNgrokProcess = startProcess(
      ngrokBin,
      args = args,
      options = (if ngrokBin == "ngrok": {poUsePath, poParentStreams} else: {poParentStreams})
    )
    addExitProc(stopCollaboratorNgrokProcess)
    echo "MacroObras mobile ngrok started for " & collaboratorTarget()
  except OSError as error:
    echo "MacroObras mobile ngrok failed to start: " & error.msg

proc collaboratorPlatformStatusPayload*(): JsonNode =
  let localOrigin = collaboratorTarget().strip(chars = {'/'})
  let publicOrigin = collaboratorPublicOrigin()
  let running = collaboratorNgrokRunning()
  let installed = ngrokInstalled()
  let enabled = envEnabled("MACROOBRAS_ENABLE_NGROK", false) or running
  let publicReady = publicOrigin.len > 0

  var message = "Plataforma mobile disponível apenas no endereço local."
  if not installed:
    message = "ngrok não foi localizado. Instale-o ou configure MACROOBRAS_NGROK_BIN."
  elif running and publicReady:
    message = "Plataforma do mestre publicada pelo ngrok."
  elif running:
    message = "ngrok iniciado; aguardando a URL pública."
  elif enabled:
    message = "Publicação habilitada; use Iniciar plataforma mobile."
  else:
    message = "Túnel desativado. A plataforma local continua acessível."

  %*{
    "disponivel": publicReady,
    "habilitado": enabled,
    "processoAtivo": running,
    "ngrokInstalado": installed,
    "localAtivo": true,
    "localAppUrl": localOrigin & publicAppPath(),
    "publicAppUrl": (if publicReady: publicOrigin & publicAppPath() else: ""),
    "localApiUrl": localOrigin & CollaboratorBasePath,
    "publicApiUrl": (if publicReady: publicOrigin & CollaboratorBasePath else: ""),
    "mensagem": message
  }

proc iniciarPlataformaMobilePayload*(): JsonNode =
  startCollaboratorNgrok(true)
  sleep(650)
  collaboratorPlatformStatusPayload()

proc pararPlataformaMobilePayload*(): JsonNode =
  stopCollaboratorNgrok()
  collaboratorPlatformStatusPayload()

proc colaboradorLogin*(ctx: Context) {.async.} =
  ctx.json(%*{
    "token": "dev-colaborador",
    "nome": "Mestre de obras",
    "perfil": "mestre"
  })

proc colaboradorStatus*(ctx: Context) {.async.} =
  ctx.json(%*{
    "ok": true,
    "servico": "macroobras-colaborador",
    "descricao": "Plataforma externa do mestre de obras e API operacional.",
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
      "papel": "base de conhecimento das entidades do sistema",
      "atualizadoEmAcoesCadastrais": true
    }
  })

proc colaboradorOk*(ctx: Context) {.async.} =
  ctx.json(%*{"ok": true, "conhecimentoOkfPendente": true})
