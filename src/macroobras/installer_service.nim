import std/[exitprocs, httpclient, json, net, os, osproc, strutils, times]

import ./config
var ftpProcess {.threadvar.}: Process

proc configDir(): string = userConfigDir()
proc installationStatePath(): string = configDir() / "installation-state.json"
proc usersPath(): string = configDir() / "users.json"
proc machineAccessPath(): string = configDir() / "machine-access.env"
proc ftpStatePath(): string = configDir() / "ftp-state.json"
proc lanFlagPath(): string = configDir() / "lan-collaborator.enabled"

proc jsonOr(path: string; fallback: JsonNode): JsonNode =
  if not fileExists(path):
    return fallback
  try:
    parseJson(readFile(path))
  except CatchableError:
    fallback

proc writeJson(path: string; value: JsonNode) =
  createDir(path.parentDir)
  writeFile(path, pretty(value))

proc chmodPrivate(path: string) =
  when defined(posix):
    discard execShellCmd("chmod 600 " & quoteShell(path))

proc machineAccess(): JsonNode = readSimpleEnvFile(machineAccessPath())

proc installationCompleted*(): bool =
  let state = jsonOr(installationStatePath(), %*{})
  let users = jsonOr(usersPath(), %*[])
  state{"completed"}.getBool(false) and users.kind == JArray and users.len > 0

proc machineAuthorized(): bool =
  machineAccess(){"GITHUB_MACHINE_TOKEN"}.getStr("").len > 0


proc githubRepositorySlug(): string =
  let configured = getEnv(
    "MACROOBRAS_GITHUB_REPOSITORY",
    "glaucodeveloper/macroobras"
  ).strip()

  if configured.len == 0 or configured == "glaucodeveloper/macroobras":
    return "glaucodeveloper/macroobras"

  result = configured

proc selectedInstallDir(): string =
  let state = jsonOr(installationStatePath(), %*{})
  state{"installDir"}.getStr(getEnv("MACROOBRAS_INSTALL_DIR", appRootDir()))

proc ftpPortNumber(): int =
  try:
    parseInt(getEnv("MACROOBRAS_FTP_PORT", "2121"))
  except ValueError:
    2121

proc lanIp*(): string =
  let explicit = getEnv("MACROOBRAS_LAN_IP", "").strip()
  if explicit.len > 0:
    return explicit
  when defined(windows):
    let commandResult = execCmdEx("powershell -NoProfile -Command \"(Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown'} | Select-Object -First 1 -ExpandProperty IPAddress)\"")
    if commandResult.exitCode == 0 and commandResult.output.strip().len > 0:
      return commandResult.output.strip()
  else:
    for command in ["hostname -I", "ip route get 1.1.1.1"]:
      let commandResult = execCmdEx(command)
      if commandResult.exitCode != 0:
        continue
      if command.startsWith("hostname"):
        for candidate in commandResult.output.splitWhitespace():
          if candidate.len > 0 and not candidate.startsWith("127."):
            return candidate
      else:
        let parts = commandResult.output.splitWhitespace()
        for index, value in parts:
          if value == "src" and index + 1 < parts.len:
            return parts[index + 1]
  "127.0.0.1"

proc portReachable(host: string; port: int): bool =
  var socket = newSocket()
  try:
    socket.connect(host, Port(port))
    result = true
  except CatchableError:
    result = false
  finally:
    socket.close()

proc stopFtpProcess() {.noconv.} =
  if ftpProcess != nil:
    if ftpProcess.running:
      ftpProcess.terminate()
    ftpProcess.close()
    ftpProcess = nil

# O encerramento é registrado uma única vez na inicialização do módulo.
# Mantê-lo fora de startFtp evita propagar addExitProc para handlers RPC async.
addExitProc(stopFtpProcess)

proc verifyFtpTransfer(folder, password: string; port: int): bool =
  let verifier = appRootDir() / "tools" / "verify_ftp.py"
  if not fileExists(verifier):
    return false
  let markerName = ".macroobras-ftp-check"
  let expected = "macroobras-ftp-transfer-ok-" & $epochTime()
  let markerPath = folder / markerName
  try:
    writeFile(markerPath, expected)
    let command = "python3 " & quoteShell(verifier) &
      " --host 127.0.0.1 --port " & $port &
      " --user macroobras --password " & quoteShell(password) &
      " --filename " & quoteShell(markerName) &
      " --expected " & quoteShell(expected)
    result = execShellCmd(command) == 0
  finally:
    if fileExists(markerPath):
      removeFile(markerPath)

proc startFtp(folder: string): JsonNode =
  if not envEnabled("MACROOBRAS_ENABLE_FTP", true):
    return %*{"ftpReady": false, "ftpVerified": false, "mensagem": "FTP desativado nesta estação."}
  if folder.len == 0 or not dirExists(folder):
    return %*{"ftpReady": false, "ftpVerified": false, "mensagem": "A pasta selecionada não existe."}
  stopFtpProcess()
  let port = ftpPortNumber()
  let script = appRootDir() / "tools" / "ftp_share.py"
  if not fileExists(script):
    return %*{"ftpReady": false, "ftpVerified": false, "mensagem": "Servidor FTP do MacroObras não foi encontrado."}

  let password = getEnv("MACROOBRAS_FTP_PASSWORD", "macroobras-local")
  try:
    ftpProcess = startProcess(
      "python3",
      args = @[script, "--root", folder, "--host", "0.0.0.0", "--port", $port, "--user", "macroobras", "--password", password],
      options = {poUsePath, poParentStreams}
    )
    sleep(800)
  except OSError as error:
    return %*{"ftpReady": false, "ftpVerified": false, "mensagem": "Falha ao iniciar FTP: " & error.msg}

  let socketReady = ftpProcess != nil and ftpProcess.running and portReachable("127.0.0.1", port)
  let verified = socketReady and verifyFtpTransfer(folder, password, port)
  let endpoint = "ftp://" & lanIp() & ":" & $port & "/"
  let state = %*{
    "installDir": folder,
    "ftpHost": lanIp(),
    "ftpPort": $port,
    "ftpEndpoint": endpoint,
    "ftpUser": "macroobras",
    "ftpPassword": password,
    "ftpReady": ftpProcess != nil and ftpProcess.running,
    "ftpVerified": verified,
    "verifiedAt": now().format("yyyy-MM-dd HH:mm:ss")
  }
  writeJson(ftpStatePath(), state)
  result = state
  result["mensagem"] = %(if verified: "Transmissão FTP iniciada e verificada na rede local." else: "O processo FTP iniciou, mas a porta ainda não respondeu.")

proc verifyGithubToken(token: string): JsonNode =
  if token.strip().len < 20:
    return %*{"autorizado": false, "mensagem": "Token GitHub inválido ou incompleto."}
  let client = newHttpClient(timeout = 7000)
  defer: client.close()
  client.headers = newHttpHeaders()
  client.headers["Authorization"] = "Bearer " & token.strip()
  client.headers["Accept"] = "application/vnd.github+json"
  client.headers["X-GitHub-Api-Version"] = "2022-11-28"
  client.headers["User-Agent"] = "MacroObras-Installer"
  try:
    let user = parseJson(client.getContent("https://api.github.com/user"))
    discard client.getContent("https://api.github.com/repos/" & githubRepositorySlug())
    let login = user{"login"}.getStr("")
    if login.len == 0:
      return %*{"autorizado": false, "mensagem": "O GitHub não retornou a identidade do token."}
    createDir(configDir())
    writeFile(machineAccessPath(), "GITHUB_MACHINE_TOKEN=" & token.strip() & "\nGITHUB_MACHINE_LOGIN=" & login & "\n")
    chmodPrivate(machineAccessPath())
    %*{"autorizado": true, "githubAuthorized": true, "githubLogin": login, "login": login, "mensagem": "Máquina autorizada pelo GitHub."}
  except CatchableError as error:
    %*{
      "autorizado": false,
      "mensagem":
        "Falha na autorização GitHub para o repositório " &
        githubRepositorySlug() & ": " & error.msg
    }

proc chooseFolder(): string =
  when defined(windows):
    let command = "powershell -NoProfile -STA -Command \"Add-Type -AssemblyName System.Windows.Forms; $d=New-Object System.Windows.Forms.FolderBrowserDialog; if($d.ShowDialog() -eq 'OK'){Write-Output $d.SelectedPath}\""
    let commandResult = execCmdEx(command)
    if commandResult.exitCode == 0:
      return commandResult.output.strip()
  elif defined(macosx):
    let commandResult = execCmdEx("osascript -e 'POSIX path of (choose folder with prompt \"Selecione a pasta do MacroObras\")'")
    if commandResult.exitCode == 0:
      return commandResult.output.strip()
  else:
    if findExe("zenity").len > 0:
      let commandResult = execCmdEx("zenity --file-selection --directory --title='Selecione a pasta do MacroObras'")
      if commandResult.exitCode == 0:
        return commandResult.output.strip()
    if findExe("kdialog").len > 0:
      let commandResult = execCmdEx("kdialog --getexistingdirectory " & quoteShell(getHomeDir()))
      if commandResult.exitCode == 0:
        return commandResult.output.strip()
    let tkinterCommand = "python3 -c " & quoteShell("import tkinter as tk; from tkinter import filedialog; root=tk.Tk(); root.withdraw(); print(filedialog.askdirectory(title='Selecione a pasta do MacroObras')); root.destroy()")
    let tkinterResult = execCmdEx(tkinterCommand)
    if tkinterResult.exitCode == 0 and tkinterResult.output.strip().len > 0:
      return tkinterResult.output.strip()
  ""

proc ftpStatus(): JsonNode =
  let saved = jsonOr(ftpStatePath(), %*{})
  let port = saved{"ftpPort"}.getStr($ftpPortNumber())
  var portInt = ftpPortNumber()
  try:
    portInt = parseInt(port)
  except ValueError:
    discard
  result = saved
  result["ftpReady"] = %(ftpProcess != nil and ftpProcess.running)
  result["ftpVerified"] = %portReachable("127.0.0.1", portInt)

proc restoreConfiguredFtp*() =
  if not envEnabled("MACROOBRAS_ENABLE_FTP", true):
    return
  if installationCompleted() and ftpProcess == nil:
    let folder = selectedInstallDir()
    if dirExists(folder):
      discard startFtp(folder)

proc installerStatusBasePayload(): JsonNode {.gcsafe.} =
  let access = machineAccess()
  let folder = selectedInstallDir()
  let ftp = ftpStatus()
  let ip = lanIp()
  let lanEnabled = fileExists(lanFlagPath())
  %*{
    "installDir": folder,
    "pathReady": dirExists(folder),
    "ftpHost": ftp{"ftpHost"}.getStr(ip),
    "ftpPort": ftp{"ftpPort"}.getStr($ftpPortNumber()),
    "ftpEndpoint": ftp{"ftpEndpoint"}.getStr("ftp://" & ip & ":" & $ftpPortNumber() & "/"),
    "ftpReady": ftp{"ftpReady"}.getBool(false),
    "ftpVerified": ftp{"ftpVerified"}.getBool(false),
    "githubAuthorized": machineAuthorized(),
    "githubLogin": access{"GITHUB_MACHINE_LOGIN"}.getStr(""),
    "firstAccess": not installationCompleted(),
    "installationCompleted": installationCompleted(),
    "endpointReady": lanEnabled,
    "collaboratorEndpoint": (if lanEnabled: "http://" & ip & ":7655/?surface=twa" else: ""),
    "endpointMessage": (if lanEnabled: "Acesso do encarregado disponível na rede local." else: "A administração ainda não solicitou a distribuição local."),
    "archiveEndpoint": "file://" & (folder / "archive"),
    "message": (if machineAuthorized(): "Máquina autorizada. Continue a configuração inicial." else: "Autorize a máquina com um token GitHub para iniciar."),
    "commands": []
  }

proc installerStatusPayload*(): JsonNode {.gcsafe.}

proc bootstrapStatusPayload*(): JsonNode {.gcsafe.} =
  %*{
    "primeiroAcesso": not installationCompleted(),
    "instalacaoConcluida": installationCompleted(),
    "usuarios": jsonOr(usersPath(), %*[]).len,
    "statusInstalador": installerStatusPayload()
  }

proc authorizeInstallerGithubPayload*(payload: JsonNode): JsonNode =
  verifyGithubToken(payload{"token"}.getStr(""))

proc updateMachineTokenPayload*(payload: JsonNode): JsonNode =
  verifyGithubToken(payload{"token"}.getStr(""))

proc authenticateAdminTokenPayload*(payload: JsonNode): JsonNode =
  let supplied = payload{"token"}.getStr("").strip()
  let access = machineAccess()
  let stored = access{"GITHUB_MACHINE_TOKEN"}.getStr("")
  if stored.len > 0 and supplied == stored:
    %*{"autorizado": true, "login": access{"GITHUB_MACHINE_LOGIN"}.getStr("Administrador"), "nome": access{"GITHUB_MACHINE_LOGIN"}.getStr("Administrador")}
  else:
    %*{"autorizado": false, "mensagem": "Token diferente da autorização desta máquina."}

proc somenteDigitos(value: string): string =
  for character in value:
    if character in {'0'..'9'}:
      result.add(character)

proc emailInstaladorValido(value: string): bool =
  let normalized = value.strip().toLowerAscii()
  let atIndex = normalized.find('@')

  if atIndex <= 0 or atIndex >= normalized.high:
    return false

  let dotIndex = normalized.find('.', atIndex + 2)
  result = dotIndex > atIndex + 1 and dotIndex < normalized.high

proc cpfInstaladorValido(value: string): bool =
  let digits = somenteDigitos(value)

  if digits.len != 11:
    return false

  var allEqual = true

  for index in 1 ..< digits.len:
    if digits[index] != digits[0]:
      allEqual = false
      break

  if allEqual:
    return false

  var firstSum = 0

  for index in 0 ..< 9:
    firstSum += (
      ord(digits[index]) - ord('0')
    ) * (10 - index)

  var firstDigit = (firstSum * 10) mod 11

  if firstDigit == 10:
    firstDigit = 0

  if firstDigit != ord(digits[9]) - ord('0'):
    return false

  var secondSum = 0

  for index in 0 ..< 10:
    secondSum += (
      ord(digits[index]) - ord('0')
    ) * (11 - index)

  var secondDigit = (secondSum * 10) mod 11

  if secondDigit == 10:
    secondDigit = 0

  result =
    secondDigit == ord(digits[10]) - ord('0')

proc authenticateAdminContactPayload*(payload: JsonNode): JsonNode =
  let email = payload{"email"}.getStr("").strip().toLowerAscii()
  let cpf = somenteDigitos(payload{"cpf"}.getStr(payload{"telefone"}.getStr("")))
  if email.len == 0 or cpf.len < 11:
    return %*{"autorizado": false, "mensagem": "Informe email e CPF válidos."}

  var users = jsonOr(usersPath(), %*[])
  if users.kind != JArray:
    return %*{"autorizado": false, "mensagem": "Cadastro administrativo indisponível."}

  for index in 0 ..< users.len:
    let user = users[index]
    let userEmail = user{"email"}.getStr("").strip().toLowerAscii()
    if userEmail != email:
      continue
    let storedCpf = somenteDigitos(user{"cpf"}.getStr(user{"telefone"}.getStr("")))
    if storedCpf.len > 0 and storedCpf != cpf:
      return %*{"autorizado": false, "mensagem": "CPF diferente do cadastro administrativo."}
    if storedCpf.len == 0:
      user["cpf"] = %payload{"cpf"}.getStr(payload{"telefone"}.getStr("")).strip()
      writeJson(usersPath(), users)
    return %*{
      "autorizado": true,
      "nome": user{"nome"}.getStr("Administrador"),
      "email": user{"email"}.getStr(email),
      "cpf": user{"cpf"}.getStr(payload{"cpf"}.getStr(payload{"telefone"}.getStr(""))),
      "telefone": user{"telefone"}.getStr(payload{"telefone"}.getStr("")),
      "mensagem": "Acesso autorizado por email e CPF."
    }

  %*{"autorizado": false, "mensagem": "Email não cadastrado para acesso administrativo."}

proc salvarConfiguracaoLoginPayload*(payload: JsonNode): JsonNode =
  let email = payload{"email"}.getStr("").strip().toLowerAscii()
  let cpf = payload{"cpf"}.getStr("").strip()
  let name = payload{"name"}.getStr("Administrador").strip()
  if email.len == 0 or somenteDigitos(cpf).len < 11:
    return %*{"salvo": false, "mensagem": "Informe email e CPF válidos para salvar o login administrativo."}

  var users = jsonOr(usersPath(), %*[])
  if users.kind != JArray:
    users = newJArray()

  var updated = false
  if users.len == 0:
    users.add(%*{
      "id": "admin-1",
      "nome": name,
      "email": email,
      "cpf": cpf,
      "telefone": "",
      "githubLogin": "Administrador",
      "papel": "administrador",
      "criadoEm": now().format("yyyy-MM-dd'T'HH:mm:sszzz")
    })
    updated = true
  else:
    for index in 0 ..< users.len:
      let user = users[index]
      if user{"papel"}.getStr("administrador") == "administrador" or index == 0:
        user["nome"] = %name
        user["email"] = %email
        user["cpf"] = %cpf
        if user{"telefone"}.getStr("").len == 0:
          user["telefone"] = %payload{"telefone"}.getStr("").strip()
        user["updatedAt"] = %now().format("yyyy-MM-dd'T'HH:mm:sszzz")
        updated = true
        break

  if not updated:
    users.add(%*{
      "id": "admin-1",
      "nome": name,
      "email": email,
      "cpf": cpf,
      "telefone": payload{"telefone"}.getStr("").strip(),
      "githubLogin": "Administrador",
      "papel": "administrador",
      "criadoEm": now().format("yyyy-MM-dd'T'HH:mm:sszzz")
    })

  writeJson(usersPath(), users)
  %*{
    "salvo": true,
    "email": email,
    "cpf": cpf,
    "mensagem": "Login administrativo atualizado."
  }

proc selectInstallFolderPayload*(): JsonNode =
  let folder = chooseFolder()
  if folder.len == 0:
    return %*{"mensagem": "Seleção cancelada."}
  let current = jsonOr(installationStatePath(), %*{})
  current["installDir"] = %folder
  writeJson(installationStatePath(), current)
  %*{"installDir": folder, "pathReady": dirExists(folder), "mensagem": "Pasta selecionada no explorador."}

proc startAndVerifyFtpPayload*(payload: JsonNode): JsonNode =
  let folder = payload{"installDir"}.getStr(selectedInstallDir())
  startFtp(folder)

proc installerStatusPayload*(): JsonNode {.gcsafe.} =
  installerStatusBasePayload()



proc executeInstallerPayload*(payload: JsonNode): JsonNode =
  if installationCompleted():
    return %*{
      "instalado": true,
      "status": installerStatusPayload(),
      "mensagem": "A estação já possui um administrador e não executará o instalador novamente."
    }

  if not machineAuthorized():
    return %*{
      "instalado": false,
      "status": installerStatusPayload(),
      "mensagem": "Autorize a máquina pelo GitHub antes de concluir."
    }

  let access = machineAccess()
  let adminName = payload{"adminName"}.getStr(
    access{"GITHUB_MACHINE_LOGIN"}.getStr("Administrador")
  ).strip()
  let adminEmail = payload{"adminEmail"}.getStr("").strip().toLowerAscii()
  let adminCpf = payload{"adminCpf"}.getStr("").strip()

  if adminName.len < 2:
    return %*{
      "instalado": false,
      "status": installerStatusPayload(),
      "mensagem": "Informe o nome do primeiro administrador."
    }

  if not emailInstaladorValido(adminEmail):
    return %*{
      "instalado": false,
      "status": installerStatusPayload(),
      "mensagem": "Informe um email administrativo válido."
    }

  if not cpfInstaladorValido(adminCpf):
    return %*{
      "instalado": false,
      "status": installerStatusPayload(),
      "mensagem": "Informe um CPF administrativo válido."
    }

  let folder = getEnv(
    "MACROOBRAS_INSTALL_DIR",
    appRootDir()
  )

  createDir(folder)
  createDir(folder / "archive")

  let user = %*{
    "id": "admin-1",
    "nome": adminName,
    "email": adminEmail,
    "cpf": adminCpf,
    "telefone": "",
    "githubLogin": access{"GITHUB_MACHINE_LOGIN"}.getStr(""),
    "papel": "administrador",
    "criadoEm": now().format("yyyy-MM-dd'T'HH:mm:sszzz")
  }

  writeJson(usersPath(), %*[user])
  writeJson(
    installationStatePath(),
    %*{
      "completed": true,
      "installDir": folder,
      "completedAt": now().format("yyyy-MM-dd'T'HH:mm:sszzz")
    }
  )

  %*{
    "instalado": true,
    "status": installerStatusPayload(),
    "mensagem": "Primeiro administrador criado. A instalação não será exibida nos próximos acessos."
  }
