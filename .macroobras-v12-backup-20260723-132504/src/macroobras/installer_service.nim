import std/[json, os]

import ./config
import ./okf_service

proc defaultInstallAppDir*(): string =
  getEnv("MACROOBRAS_INSTALL_DIR", getEnv("MACROOBRAS_INSTALL_APP_DIR", "/opt/macroobras"))

proc ftpHost*(): string =
  getEnv("MACROOBRAS_FTP_HOST", "192.168.0.24")

proc ftpPort*(): string =
  getEnv("MACROOBRAS_FTP_PORT", "2121")

proc archiveDir*(): string =
  getEnv("MACROOBRAS_ARCHIVE_DIR", defaultInstallAppDir() / "archive")

proc llamaEndpoint*(): string =
  getEnv("MACROOBRAS_LLAMA_ENDPOINT", LlamaDefaultEndpoint)

proc llamaModel*(): string =
  getEnv("MACROOBRAS_LLAMA_MODEL", LlamaDefaultModel)

proc isRootUser*(): bool =
  when defined(posix):
    getEnv("USER", "") == "root" or getEnv("EUID", "") == "0" or execShellCmd("test \"$(id -u)\" = 0") == 0
  else:
    false

proc commandList*(): JsonNode =
  let appDir = defaultInstallAppDir()
  %*[
    "install -d -m 755 " & quoteShell(appDir) & " " & quoteShell(archiveDir()),
    "expor FTP local " & quoteShell("ftp://" & ftpHost() & ":" & ftpPort() & "/macroobras"),
    "preparar Archive em " & quoteShell(archiveDir()),
    "preparar OKF local em " & quoteShell(okfAbsoluteDir(okfConfig())),
    "conectar servidor Llama local " & quoteShell(llamaEndpoint())
  ]

proc installerStatusPayload*(): JsonNode =
  let appDir = defaultInstallAppDir()
  let archive = archiveDir()
  %*{
    "installDir": appDir,
    "ftpHost": ftpHost(),
    "ftpPort": ftpPort(),
    "ftpEndpoint": "ftp://" & ftpHost() & ":" & ftpPort() & "/macroobras",
    "collaboratorEndpoint": collaboratorTarget() & CollaboratorBasePath,
    "archiveEndpoint": "file://" & archive,
    "llamaEndpoint": llamaEndpoint(),
    "llamaModel": llamaModel(),
    "pathReady": dirExists(appDir),
    "ftpReady": dirExists(appDir),
    "endpointReady": true,
    "archiveReady": dirExists(archive),
    "okfReady": okfStatusPayload(){"pronto"}.getBool(false),
    "needsAdmin": not isRootUser(),
    "message": if dirExists(appDir): "Pasta preparada, endpoint local apresentado e Archive disponível." else: "Escolha a pasta de instalação e prepare a transmissão local.",
    "commands": commandList()
  }

proc executeInstallerPayload*(): JsonNode =
  let appDir = defaultInstallAppDir()

  createDir(appDir)
  createDir(archiveDir())
  discard prepareOkfPayload()
  writeFileIfChanged(appDir / "ftp-local.txt", "Endpoint FTP local: ftp://" & ftpHost() & ":" & ftpPort() & "/macroobras\nPasta: " & appDir & "\n")
  writeFileIfChanged(appDir / "llama-local.txt", "Servidor Llama: " & llamaEndpoint() & "\nModelo: " & llamaModel() & "\n")

  %*{
    "instalado": true,
    "requerAdministrador": false,
    "status": installerStatusPayload(),
    "mensagem": "Introdução concluída: pasta preparada, FTP local documentado, Archive criado, OKF preparado e Llama local apontado."
  }
