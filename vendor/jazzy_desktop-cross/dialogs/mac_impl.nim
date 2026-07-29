import types
import std/[osproc, strutils]

proc selectFileDialog*(title: string, filters: seq[DialogFilter] = @[], forSave: bool = false): string =
  var script = ""
  if forSave:
    script = "POSIX path of (choose file name with prompt \"" & title & "\")"
  else:
    script = "POSIX path of (choose file with prompt \"" & title & "\")"
    
  let (outp, exitCode) = execCmdEx("osascript -e '" & script & "'")
  if exitCode == 0: return outp.strip()
  return ""

proc showMessageBox*(title: string, message: string, msgType: MsgBoxType = mbInfo) =
  var alertType = "informational"
  case msgType
  of mbWarning: alertType = "warning"
  of mbError: alertType = "critical"
  of mbQuestion: alertType = "informational"
  of mbInfo: alertType = "informational"
  
  discard execCmdEx("osascript -e 'display alert \"" & title & "\" message \"" & message & "\" as " & alertType & "'")
