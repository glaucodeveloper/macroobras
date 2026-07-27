import std/[json, os, strutils, times]

import ./config

proc accessesPath(): string =
  appRootDir() / ".macroobras" / "encarregado-accesses.json"

proc normalizeDigits(value: string): string =
  for character in value:
    if character in {'0'..'9'}:
      result.add(character)

proc normalizeEmail(value: string): string =
  value.strip().toLowerAscii()

proc defaultAccesses(): JsonNode =
  %*[
    {
      "id": "acesso-buerarema-encarregado",
      "personId": "rh-person-1",
      "name": "Encarregado da obra",
      "email": "encarregado@macroobras.local",
      "cpf": "123.456.789-09",
      "workId": "obra-buerarema-estadio",
      "workName": "REFORMA DO ESTÁDIO MUNICIPAL EM BUERAREMA-BA",
      "status": "Ativo"
    },
    {
      "id": "acesso-sao-felipe-carla",
      "personId": "rh-person-2",
      "name": "Encarregada Carla",
      "email": "carla@macroobras.local",
      "cpf": "987.654.321-00",
      "workId": "obra-sao-felipe-led",
      "workName": "Ampliação da iluminação em LED — São Felipe",
      "status": "Ativo"
    }
  ]

proc loadAccesses(): JsonNode =
  let path = accessesPath()
  if not fileExists(path):
    return defaultAccesses()
  try:
    let parsed = parseJson(readFile(path))
    if parsed.kind == JArray:
      return parsed
  except CatchableError:
    discard
  newJArray()

proc persistAccesses(accesses: JsonNode) =
  let path = accessesPath()
  createDir(path.parentDir)
  writeFile(path, pretty(accesses))

proc generatedAccessId(personId, workId: string): string =
  let stamp = $toUnix(getTime())
  let person = personId.replace(" ", "-").replace("/", "-")
  let work = workId.replace(" ", "-").replace("/", "-")
  "access-" & person & "-" & work & "-" & stamp

proc salvarAcessoEncarregadoPayload*(payload: JsonNode): JsonNode =
  let personId = payload{"personId"}.getStr("")
  let workId = payload{"workId"}.getStr("")
  let name = payload{"name"}.getStr("Encarregado")
  let email = normalizeEmail(payload{"email"}.getStr(""))
  let cpf = payload{"cpf"}.getStr("")
  let workName = payload{"workName"}.getStr(workId)

  if personId.len == 0 or workId.len == 0 or email.len == 0 or normalizeDigits(cpf).len < 11:
    return %*{
      "salvo": false,
      "mensagem": "Pessoa, obra, email e CPF são obrigatórios para gerar o acesso."
    }

  let accesses = loadAccesses()
  var next = newJArray()
  var preservedId = ""
  for access in accesses:
    let sameLink = access{"personId"}.getStr("") == personId and access{"workId"}.getStr("") == workId
    if sameLink:
      preservedId = access{"id"}.getStr("")
    else:
      next.add(access)

  let access = %*{
    "id": (if preservedId.len > 0: preservedId else: generatedAccessId(personId, workId)),
    "personId": personId,
    "name": name,
    "email": email,
    "cpf": cpf,
    "workId": workId,
    "workName": workName,
    "status": "Ativo",
    "updatedAt": now().utc.format("yyyy-MM-dd'T'HH:mm:ss'Z'")
  }
  next.add(access)
  persistAccesses(next)
  %*{
    "salvo": true,
    "acesso": access,
    "mensagem": "Acesso individual do encarregado gerado para a obra."
  }

proc listarAcessosEncarregadoPayload*(payload: JsonNode): JsonNode =
  let workId = payload{"workId"}.getStr("")
  let accesses = loadAccesses()
  var filtered = newJArray()
  for access in accesses:
    if workId.len == 0 or access{"workId"}.getStr("") == workId:
      filtered.add(access)
  %*{
    "acessos": filtered,
    "quantidade": filtered.len
  }

proc removerAcessoEncarregadoPayload*(payload: JsonNode): JsonNode =
  let id = payload{"id"}.getStr("")
  let accesses = loadAccesses()
  var next = newJArray()
  var removed = false
  for access in accesses:
    if access{"id"}.getStr("") == id:
      removed = true
    else:
      next.add(access)
  if removed:
    persistAccesses(next)
  %*{
    "removido": removed,
    "id": id,
    "mensagem": (if removed: "Vínculo do encarregado removido da obra." else: "Acesso não localizado.")
  }

proc autenticarAcessoEncarregadoPayload*(payload: JsonNode): JsonNode =
  let id = payload{"id"}.getStr("")
  let workId = payload{"workId"}.getStr("")
  let email = normalizeEmail(payload{"email"}.getStr(""))
  let cpf = normalizeDigits(payload{"cpf"}.getStr(""))

  for access in loadAccesses():
    let authorized = access{"id"}.getStr("") == id and
      access{"workId"}.getStr("") == workId and
      normalizeEmail(access{"email"}.getStr("")) == email and
      normalizeDigits(access{"cpf"}.getStr("")) == cpf and
      access{"status"}.getStr("Ativo") == "Ativo"
    if authorized:
      return %*{
        "autorizado": true,
        "token": "encarregado-" & id,
        "acesso": access,
        "mensagem": "Identificação autorizada para a obra vinculada."
      }

  %*{
    "autorizado": false,
    "mensagem": "Email ou CPF não correspondem ao acesso emitido pela administração da obra."
  }
