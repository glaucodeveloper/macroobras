import std/[osproc, os, streams]

proc writeClipboard*(text: string): bool =
  if findExe("wl-copy") != "":
    let p = startProcess("wl-copy", options={poUsePath})
    p.inputStream.write(text)
    p.inputStream.close()
    discard p.waitForExit()
    p.close()
    return true
  elif findExe("xclip") != "":
    let p = startProcess("xclip", args=["-selection", "clipboard"], options={poUsePath})
    p.inputStream.write(text)
    p.inputStream.close()
    discard p.waitForExit()
    p.close()
    return true
  return false

proc readClipboard*(): string =
  if findExe("wl-paste") != "":
    let (outp, exitCode) = execCmdEx("wl-paste -n")
    if exitCode == 0: return outp
  elif findExe("xclip") != "":
    let (outp, exitCode) = execCmdEx("xclip -selection clipboard -o")
    if exitCode == 0: return outp
  return ""
