import std/[exitprocs, httpclient, json, os, osproc]

import jazzy_desktop

import ./config

var collaboratorNgrokProcess: Process

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

proc ngrokExecutable(): string =
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

proc collaboratorPublicBaseUrl*(): string =
  let client = newHttpClient(timeout = 800)
  defer: client.close()

  for apiUrl in ngrokApiUrls():
    try:
      let tunnels = parseJson(client.getContent(apiUrl))["tunnels"]
      for tunnel in tunnels:
        if not tunnelMatchesCollaborator(tunnel):
          continue
        let publicUrl = tunnel{"public_url"}.getStr("")
        if publicUrl.startsWith("https://"):
          return publicUrl & CollaboratorBasePath
      for tunnel in tunnels:
        if not tunnelMatchesCollaborator(tunnel):
          continue
        let publicUrl = tunnel{"public_url"}.getStr("")
        if publicUrl.len > 0:
          return publicUrl & CollaboratorBasePath
    except CatchableError:
      discard

  ""

proc stopCollaboratorNgrok() {.noconv.} =
  if collaboratorNgrokProcess != nil and collaboratorNgrokProcess.running:
    collaboratorNgrokProcess.terminate()
    collaboratorNgrokProcess.close()

proc startCollaboratorNgrok*() =
  if not envEnabled("MACROOBRAS_ENABLE_NGROK", false):
    echo "MacroObras collaborator public tunnel disabled by default; showing local collaborator endpoint only."
    return

  if collaboratorNgrokProcess != nil and collaboratorNgrokProcess.running:
    return

  var args = @["http", collaboratorTarget()]
  let domain = getEnv("MACROOBRAS_NGROK_DOMAIN", "")
  if domain.len > 0:
    args.add("--url")
    args.add(domain)
  if envEnabled("MACROOBRAS_NGROK_POOLING", true):
    args.add("--pooling-enabled")

  try:
    let ngrokBin = ngrokExecutable()
    collaboratorNgrokProcess = startProcess(
      ngrokBin,
      args = args,
      options = (if ngrokBin == "ngrok": {poUsePath, poParentStreams} else: {poParentStreams})
    )
    addExitProc(stopCollaboratorNgrok)
    echo "MacroObras collaborator ngrok started for " & collaboratorTarget() & CollaboratorBasePath
  except OSError as e:
    echo "MacroObras collaborator ngrok failed to start: " & e.msg

proc colaboradorLogin*(ctx: Context) {.async.} =
  ctx.json(%*{"token": "dev-colaborador", "nome": "João Mestre", "perfil": "mestre"})

proc colaboradorStatus*(ctx: Context) {.async.} =
  ctx.json(%*{
    "ok": true,
    "servico": "macroobras-colaborador",
    "descricao": "API externa para ações cadastrais do colaborador e atualização operacional.",
    "localBaseUrl": collaboratorTarget() & CollaboratorBasePath,
    "publicBaseUrl": collaboratorPublicBaseUrl(),
    "endpoints": [
      {"method": "POST", "path": "/api/colaboradores/login"},
      {"method": "POST", "path": "/api/colaboradores/servicos"},
      {"method": "POST", "path": "/api/colaboradores/rotinas"},
      {"method": "POST", "path": "/api/colaboradores/cronogramas/alocar"},
      {"method": "POST", "path": "/api/colaboradores/diarios/registrar"},
      {"method": "POST", "path": "/api/colaboradores/diarios/completar"},
      {"method": "POST", "path": "/api/colaboradores/compras/solicitar"},
      {"method": "POST", "path": "/api/colaboradores/compras/anexar-recibo"}
    ],
    "conhecimentoOkf": {
      "papel": "base de conhecimento das entidades do sistema",
      "atualizadoEmAcoesCadastrais": true
    }
  })

proc colaboradorOk*(ctx: Context) {.async.} =
  ctx.json(%*{"ok": true, "conhecimentoOkfPendente": true})
