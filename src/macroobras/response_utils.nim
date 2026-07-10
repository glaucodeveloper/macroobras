import std/json

proc ok*(payload: JsonNode): string =
  $(%*{"ok": true, "data": payload})
