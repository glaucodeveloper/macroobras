import std/[times, os, strutils]

type
  LogLevel* = enum
    lvlInfo, lvlWarn, lvlError, lvlDebug

var gLogFile: string = ""

proc initLogger*(filePath: string = "jazzy.log") =
  gLogFile = filePath
  if not fileExists(gLogFile):
    writeFile(gLogFile, "--- Jazzy Desktop Log Started at " & $now() & " ---\n")

proc log*(level: LogLevel, message: string) =
  if gLogFile == "": return
  
  let timeStr = format(now(), "yyyy-MM-dd HH:mm:ss")
  let levelStr = case level
    of lvlInfo: "[INFO]"
    of lvlWarn: "[WARN]"
    of lvlError: "[ERROR]"
    of lvlDebug: "[DEBUG]"
    
  let logLine = "$1 $2 $3\n" % [timeStr, levelStr, message]
  
  # Also print to terminal if running in dev mode
  echo logLine
  
  var f: File
  if open(f, gLogFile, fmAppend):
    f.write(logLine)
    f.close()

# Convenience procs
proc logInfo*(msg: string) = log(lvlInfo, msg)
proc logWarn*(msg: string) = log(lvlWarn, msg)
proc logError*(msg: string) = log(lvlError, msg)
proc logDebug*(msg: string) = log(lvlDebug, msg)
