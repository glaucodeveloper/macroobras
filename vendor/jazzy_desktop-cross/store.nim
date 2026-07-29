import std/[os, json]
import helpers

var storeFilePath = ""
var storeData = newJObject()

proc initStore*(appName: string) =
  let configDir = getAppDir(appName)
  storeFilePath = configDir / "config.json"

  
  if fileExists(storeFilePath):
    try:
      storeData = parseFile(storeFilePath)
    except:
      storeData = newJObject()
  else:
    storeData = newJObject()
    writeFile(storeFilePath, $storeData)

proc storeSet*(key: string, value: JsonNode) =
  storeData[key] = value
  if storeFilePath.len > 0:
    writeFile(storeFilePath, $storeData)

proc storeGet*(key: string): JsonNode =
  if storeData.hasKey(key):
    return storeData[key]
  return newJNull()

proc storeHas*(key: string): bool =
  return storeData.hasKey(key)

proc storeDelete*(key: string) =
  if storeData.hasKey(key):
    storeData.delete(key)
    if storeFilePath.len > 0:
      writeFile(storeFilePath, $storeData)
