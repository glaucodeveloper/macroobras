import std/[osproc, strutils, streams]

proc writeClipboard*(text: string): bool =
  let p = startProcess("pbcopy", options={poUsePath})
  p.inputStream.write(text)
  p.inputStream.close()
  discard p.waitForExit()
  p.close()
  return true

proc readClipboard*(): string =
  let (outp, exitCode) = execCmdEx("pbpaste")
  if exitCode == 0: return outp
  return ""
