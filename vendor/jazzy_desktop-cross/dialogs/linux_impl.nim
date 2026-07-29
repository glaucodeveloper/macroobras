import types
import std/[osproc, strutils]

proc selectFileDialog*(title: string, filters: seq[DialogFilter] = @[], multiSelect: bool = false, forSave: bool = false): string =
  var cmd = "zenity --file-selection --title=\"" & title & "\""
  if forSave:
    cmd.add(" --save")
  if multiSelect:
    cmd.add(" --multiple --separator='\n'")
  
  for filter in filters:
    # Zenity filter format: --file-filter="Images | *.png *.jpg"
    let exts = filter.extensions.replace(";", " ")
    cmd.add(" --file-filter=\"" & filter.name & " | " & exts & "\"")
    
  let (outp, exitCode) = execCmdEx(cmd)
  if exitCode == 0:
    return outp.strip()
  return ""

proc showMessageBox*(title: string, message: string, msgType: MsgBoxType = mbInfo) =
  var zType = "--info"
  case msgType
  of mbWarning: zType = "--warning"
  of mbError: zType = "--error"
  of mbQuestion: zType = "--question"
  of mbInfo: zType = "--info"
  
  discard execCmdEx("zenity " & zType & " --title=\"" & title & "\" --text=\"" & message & "\"")
