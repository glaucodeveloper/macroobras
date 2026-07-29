import std/[json, macros, os, asyncdispatch, tables, strutils, mimetypes]
import jazzy

# ─── EXPOSE MACRO ───────────────────────────────────────────────────────────────
macro expose*(prc: untyped): untyped =
  prc.expectKind(nnkProcDef)
  let procName = prc[0]
  let procNameStr = $procName
  let params = prc[3]

  let wrapperName = genSym(nskProc, "handler_" & procNameStr)

  var extractStmts = newStmtList()
  var callArgs = newSeq[NimNode]()
  var argIdx = 0
  let argsIdent = ident("args")
  let ctxIdent = ident("ctx")

  for i in 1 ..< params.len:
    let paramDefs = params[i]
    let paramType = paramDefs[^2]

    for j in 0 ..< paramDefs.len - 2:
      let paramName = paramDefs[j]
      let typeStr = $paramType

      if typeStr == "Context":
        callArgs.add(ctxIdent)
      else:
        let extractStmt = case typeStr:
          of "string":
            quote do:
              let `paramName` = `argsIdent`[`argIdx`].getStr()
          of "int":
            quote do:
              let `paramName` = `argsIdent`[`argIdx`].getInt()
          of "float":
            quote do:
              let `paramName` = `argsIdent`[`argIdx`].getFloat()
          of "bool":
            quote do:
              let `paramName` = `argsIdent`[`argIdx`].getBool()
          else:
            quote do:
              let `paramName` = to(`argsIdent`[`argIdx`], `paramType`)

        extractStmts.add(extractStmt)
        callArgs.add(paramName)
        inc argIdx

  var callExpr = newCall(procName)
  for arg in callArgs:
    callExpr.add(arg)

  result = quote do:
    `prc`

    proc `wrapperName`(`ctxIdent`: Context) {.async, gcsafe.} =
      try:
        let body = parseJson(`ctxIdent`.request.body)
        let `argsIdent` = body["args"]
        `extractStmts`
        let res = `callExpr`
        `ctxIdent`.json(%*{"result": res})
      except KeyError as e:
        `ctxIdent`.status(400).json(%*{"error": "Missing argument: " & e.msg})
      except JsonParsingError:
        `ctxIdent`.status(400).json(%*{"error": "Invalid JSON body"})
      except Exception as e:
        `ctxIdent`.status(500).json(%*{"error": e.msg})

    Route.post("/rpc/" & `procNameStr`, `wrapperName`)

# ─── VFS MACRO ───────────────────────────────────────────────────────────────
macro embedDir*(dir: static[system.string]): untyped =
  var tblAssigns = newStmtList()
  let vfsIdent = ident("vfs")
  
  let targetDir = getProjectPath() / dir
  
  for path in walkDirRec(targetDir):
    let relPath = "/" & path.relativePath(targetDir).replace('\\', '/')
    let content = slurp(path)
    let pathLit = newLit(relPath)
    let contentLit = newLit(content)
    tblAssigns.add quote do:
      `vfsIdent`[`pathLit`] = `contentLit`

  result = quote do:
    block:
      var `vfsIdent` = newTable[system.string, system.string]()
      `tblAssigns`
      `vfsIdent`
