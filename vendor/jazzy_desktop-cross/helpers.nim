import std/[os, osproc, strutils]

proc getAppDir*(appName: string): string =
  ## Returns the standard app data directory and creates it if it doesn't exist
  result = getConfigDir() / appName
  if not dirExists(result):
    createDir(result)

proc getCacheDir*(appName: string): string =
  ## Returns a temporary directory for caching files and creates it if it doesn't exist
  result = getTempDir() / appName
  if not dirExists(result):
    createDir(result)

proc getLogDir*(appName: string): string =
  ## Returns a directory suitable for storing log files
  result = getAppDir(appName) / "logs"
  if not dirExists(result):
    createDir(result)

proc showInFolder*(path: string) =
  ## Opens the file manager and highlights the specified path
  when defined(windows):
    let fixedPath = path.replace("/", "\\")
    discard execCmd("explorer /select,\"" & fixedPath & "\"")
  elif defined(macosx):
    discard execCmd("open -R \"" & path & "\"")
  else:
    # Linux doesn't have a universal 'select' flag, so we just open the parent folder
    discard execCmd("xdg-open \"" & path.parentDir() & "\"")

proc isProduction*(): bool =
  ## Returns true if the application is built in release mode
  return defined(release)
