import std/[json, os, strutils]

const AdminName* = "Administração MacroObras"
const AppHost* = "127.0.0.1"
const AppPort* = 7654
const CollaboratorBasePath* = "/api/colaboradores"
const OkfDefaultBranch* = "main"
const OkfDefaultLocalDir* = ".okf/repo"
const OkfSeedDir* = "macroobras"
const LlamaDefaultEndpoint* = "llama://127.0.0.1:11434/gemma4eb"
const LlamaDefaultModel* = "gemma4eb"

proc envEnabled*(name: string, default = true): bool =
  let value = getEnv(name, if default: "1" else: "0").normalize
  value notin ["0", "false", "no", "off", "disabled"]

proc putEnvIfMissing*(name, value: string) =
  if getEnv(name).len == 0:
    putEnv(name, value)

proc configureLinuxWebviewEnvironment*() =
  when defined(linux) and not defined(jazzyWeb):
    let backend = getEnv("MACROOBRAS_WEBVIEW_BACKEND", "x11").normalize
    if backend == "x11" and getEnv("WAYLAND_DISPLAY").len > 0 and getEnv("DISPLAY").len > 0:
      putEnvIfMissing("GDK_BACKEND", "x11")
      putEnvIfMissing("WEBKIT_DISABLE_DMABUF_RENDERER", "1")
      putEnvIfMissing("WEBKIT_DISABLE_COMPOSITING_MODE", "1")
      putEnvIfMissing("LIBGL_ALWAYS_SOFTWARE", "1")

proc ngrokApiUrls*(): seq[string] =
  let explicit = getEnv("MACROOBRAS_NGROK_API_URL", "")
  if explicit.len > 0:
    return @[explicit]

  result = @[]
  for port in 4040 .. 4050:
    result.add("http://127.0.0.1:" & $port & "/api/tunnels")

proc collaboratorTarget*(): string =
  "http://" & getEnv("MACROOBRAS_HOST", AppHost) & ":" & getEnv("MACROOBRAS_PORT", $AppPort)

proc appRootDir*(): string =
  when defined(release):
    getAppDir()
  else:
    currentSourcePath().parentDir().parentDir().parentDir()

proc parentProjectRoot*(): string =
  currentSourcePath().parentDir().parentDir().parentDir().parentDir()

proc readSimpleEnvFile*(path: string): JsonNode =
  result = %*{}
  if not fileExists(path):
    return

  for rawLine in lines(path):
    let line = rawLine.strip()
    if line.len == 0 or line.startsWith("#") or not line.contains("="):
      continue
    let parts = line.split("=", maxsplit = 1)
    let key = parts[0].strip()
    var value = parts[1].strip()
    if value.len >= 2 and ((value[0] == '"' and value[^1] == '"') or (value[0] == '\'' and value[^1] == '\'')):
      value = value[1 .. ^2]
    if key.len > 0:
      result[key] = %value

proc userConfigDir*(): string =
  let explicit = getEnv(
    "MACROOBRAS_USER_CONFIG_DIR",
    ""
  ).strip()

  if explicit.len > 0:
    return explicit

  when defined(windows):
    result = getEnv(
      "APPDATA",
      getHomeDir() / "AppData" / "Roaming"
    ) / "MacroObras"
  elif defined(macosx):
    result = (
      getHomeDir()
      / "Library"
      / "Application Support"
      / "MacroObras"
    )
  else:
    let xdg = getEnv(
      "XDG_CONFIG_HOME",
      ""
    ).strip()

    if xdg.len > 0:
      result = xdg / "macroobras"
    else:
      result = (
        getHomeDir()
        / ".config"
        / "macroobras"
      )
