import std/osproc

proc openBrowser*(url: string): bool =
  let (_, exitCode) = execCmdEx("xdg-open \"" & url & "\"")
  return exitCode == 0
