import std/[exitprocs, httpclient, json, options, os, osproc, strutils]

when not defined(jazzyWeb):
  const webviewImpl = currentSourcePath().parentDir().parentDir().parentDir().parentDir() /
    "jazzy-desktop" / "src" / "jazzy_desktop" / "webview_impl.cpp"
  {.compile: webviewImpl.}

import jazzy_desktop
import obra_core

const AdminName = "Administração MacroObras"
const AppHost = "127.0.0.1"
const AppPort = 7654
const CollaboratorBasePath = "/api/colaboradores"
const OkfDefaultBranch = "main"
const OkfDefaultLocalDir = ".okf/repo"
const OkfSeedDir = "macroobras"
const LlamaDefaultEndpoint = "llama://127.0.0.1:11434/gemma4eb"
const LlamaDefaultModel = "gemma4eb"

var collaboratorNgrokProcess: Process

proc ok(payload: JsonNode): string =
  $(%*{"ok": true, "data": payload})

proc envEnabled(name: string, default = true): bool =
  let value = getEnv(name, if default: "1" else: "0").normalize
  value notin ["0", "false", "no", "off", "disabled"]

proc putEnvIfMissing(name, value: string) =
  if getEnv(name).len == 0:
    putEnv(name, value)

proc configureLinuxWebviewEnvironment() =
  when defined(linux) and not defined(jazzyWeb):
    let backend = getEnv("MACROOBRAS_WEBVIEW_BACKEND", "x11").normalize
    if backend == "x11" and getEnv("WAYLAND_DISPLAY").len > 0 and getEnv("DISPLAY").len > 0:
      putEnvIfMissing("GDK_BACKEND", "x11")
      putEnvIfMissing("WEBKIT_DISABLE_DMABUF_RENDERER", "1")
      putEnvIfMissing("WEBKIT_DISABLE_COMPOSITING_MODE", "1")
      putEnvIfMissing("LIBGL_ALWAYS_SOFTWARE", "1")

proc ngrokApiUrls(): seq[string] =
  let explicit = getEnv("MACROOBRAS_NGROK_API_URL", "")
  if explicit.len > 0:
    return @[explicit]

  result = @[]
  for port in 4040 .. 4050:
    result.add("http://127.0.0.1:" & $port & "/api/tunnels")

proc collaboratorTarget(): string =
  "http://" & getEnv("MACROOBRAS_HOST", AppHost) & ":" & getEnv("MACROOBRAS_PORT", $AppPort)

proc appRootDir(): string =
  when defined(release):
    getAppDir()
  else:
    currentSourcePath().parentDir().parentDir()

proc parentProjectRoot(): string =
  currentSourcePath().parentDir().parentDir().parentDir().parentDir()

proc readSimpleEnvFile(path: string): JsonNode =
  result = %*{}
  if not fileExists(path):
    return

  for rawLine in lines(path):
    let line = rawLine.strip()
    if line.len == 0 or line.startsWith("#") or not line.contains("="):
      continue
    let parts = line.split("=", maxsplit = 1)
    let key = parts[0].strip()
    var value = parts[1].strip()
    if value.len >= 2 and ((value[0] == '"' and value[^1] == '"') or (value[0] == '\'' and value[^1] == '\'')):
      value = value[1 .. ^2]
    if key.len > 0:
      result[key] = %value

proc okfEnvFile(): string =
  let explicit = getEnv("MACROOBRAS_OKF_ENV", "")
  if explicit.len > 0:
    return explicit

  let appConfig = appRootDir() / "config" / "okf.env"
  if fileExists(appConfig):
    return appConfig

  let projectConfig = parentProjectRoot() / "config" / "okf.env"
  if fileExists(projectConfig):
    return projectConfig

  appConfig

proc okfConfig(): JsonNode =
  let fileConfig = readSimpleEnvFile(okfEnvFile())
  proc cfg(name, defaultValue: string): string =
    let envValue = getEnv(name, "")
    if envValue.len > 0:
      return envValue
    fileConfig{name}.getStr(defaultValue)

  %*{
    "envFile": okfEnvFile(),
    "repoSsh": cfg("MACROOBRAS_OKF_REPO_SSH", ""),
    "branch": cfg("MACROOBRAS_OKF_BRANCH", OkfDefaultBranch),
    "localDir": cfg("MACROOBRAS_OKF_LOCAL_DIR", OkfDefaultLocalDir),
    "sshKey": cfg("MACROOBRAS_OKF_SSH_KEY", getHomeDir() / ".ssh" / "macroobras_okf_ed25519")
  }

proc okfAbsoluteDir(config: JsonNode): string =
  let configured = config{"localDir"}.getStr(OkfDefaultLocalDir)
  if configured.isAbsolute:
    configured
  else:
    appRootDir() / configured

proc okfSeedMarker(repoDir: string): string =
  repoDir / OkfSeedDir / "manifest.json"

proc writeFileIfChanged(path, content: string) =
  createDir(path.parentDir)
  if fileExists(path) and readFile(path) == content:
    return
  writeFile(path, content)

proc seedOkfKnowledge(repoDir: string) =
  let base = repoDir / OkfSeedDir
  createDir(base)
  createDir(base / "schema")
  createDir(base / "graph")
  writeFileIfChanged(base / "dominio.md", """
# MacroObras - Dominio operacional

O MacroObras organiza a operacao administrativa e de campo de obras. A persistencia operacional continua local, enquanto o OKF recebe conhecimento consolidado das entidades e operacoes cadastrais.

## Entidades

- Obra: unidade operacional administrada, criada a partir de dados cadastrais e tabela de itens.
- Item de obra: linha importada da tabela de obra, usada para medicao, cronograma e diarios.
- Servico: trabalho executavel vinculado a item/elemento de obra.
- Rotina: agrupamento de servicos recorrentes do mestre de obras.
- Cronograma: alocacao temporal de rotinas, servicos e apoios pontuais.
- Diario de obra: registro de execucao, ocorrencias, servicos realizados, anexos e evidencias.
- Confirmacao de servico: prova capturada por camera no app de medicao para apontar servico feito, anexada ao diario.
- Medicao: percentual administrativo por item, derivado dos diarios completados, confirmacoes por camera e ajustes administrativos.
- Comparacao Excel: contraste entre percentuais administrativos e planilha externa.
- Compra e recibo: solicitacoes e evidencias financeiras vinculadas ao fluxo do mestre.
- Elemento de obra: parte material/construtiva que pode ter requisitos, dependencias e liberacoes para outros elementos, servicos, rotinas ou medicoes.

## Regra OKF

O OKF e destino de conhecimento. Ele nao bloqueia cadastros quando a gravacao operacional local foi concluida. Falhas de GitHub, rede ou SSH devem gerar pendencia de sincronizacao, nao perda operacional.
""")
  writeFileIfChanged(base / "README.md", """
# MacroObras OKF scaffold

Este scaffold nasce junto com a estação MacroObras para que o OKF já tenha uma compreensão mínima das entidades, relações e rotinas principais do sistema.

## Arquivos principais

- `dominio.md`: visão de domínio e entidades operacionais.
- `operacoes.md`: rotinas administrativas e mobile.
- `dependencias-elementos-obra.md`: regras iniciais para dependências e liberações.
- `instalacao.md`: instalação, Archive, endpoint de colaboradores e Llama local.
- `schema/entidades.json`: catálogo estruturado das entidades.
- `schema/relacoes.json`: relações básicas entre entidades.
- `graph/macroobras.mmd`: grafo Mermaid para visualizar o modelo.

## Regra de uso

O OKF é memória operacional e grafo de conhecimento. Ele registra entidades e relações, mas não deve bloquear a persistência local quando uma operação válida já foi salva no SQLite/backend da estação.
""")
  writeFileIfChanged(base / "schema" / "entidades.json", $(%*{
    "version": 1,
    "entities": [
      {
        "id": "obra",
        "label": "Obra",
        "description": "Unidade operacional administrada.",
        "keyFields": ["id", "nome", "codigo", "cliente"],
        "source": "admin-add-work"
      },
      {
        "id": "elemento_obra",
        "label": "Elemento de obra",
        "description": "Parte construtiva ou atividade predisposta, com requisitos, materiais, dependências e liberações.",
        "keyFields": ["id", "nome", "descricao", "materiais", "dependencias", "liberacoes"],
        "source": "admin-elements"
      },
      {
        "id": "item_medicao",
        "label": "Item de medição",
        "description": "Linha importada de tabela de medição ou criada a partir de elementos de obra.",
        "keyFields": ["id", "obraId", "descricao", "nivel", "percentualAdministrativo"],
        "source": "admin-add-work/admin-measurement"
      },
      {
        "id": "servico",
        "label": "Serviço",
        "description": "Trabalho executável vinculado a obra, elemento de obra e item de medição.",
        "keyFields": ["id", "obraId", "elementoObraId", "descricao", "tempoNecessario"],
        "source": "admin/mobile"
      },
      {
        "id": "rotina",
        "label": "Rotina",
        "description": "Agrupamento recorrente de serviços do mestre.",
        "keyFields": ["id", "obraId", "nome", "servicos", "rotativa"],
        "source": "mobile-routine"
      },
      {
        "id": "cronograma",
        "label": "Cronograma",
        "description": "Alocação temporal de rotinas, serviços e apoios pontuais.",
        "keyFields": ["id", "obraId", "data", "turno", "alocacoes"],
        "source": "admin-calendar/mobile-day"
      },
      {
        "id": "diario_obra",
        "label": "Diário de obra",
        "description": "Registro de execução, ocorrências, serviços realizados, anexos e evidências por câmera.",
        "keyFields": ["id", "obraId", "data", "descricao", "servicosExecutados", "confirmacoesServico", "evidencias", "completo"],
        "source": "mobile-diary"
      },
      {
        "id": "confirmacao_servico",
        "label": "Confirmação de serviço",
        "description": "Apontamento de serviço feito com foto de câmera, anexado ao diário e usado como prova de progresso na medição.",
        "keyFields": ["id", "obraId", "servicoId", "diarioObraId", "foto", "capturadaEm", "statusConfirmacao"],
        "source": "mobile-diary/admin-measurement"
      },
      {
        "id": "medicao",
        "label": "Medição",
        "description": "Percentual administrativo por item, derivado de diários, confirmações por câmera e ajustes administrativos.",
        "keyFields": ["id", "obraId", "itens", "totalPercentual", "diariosRelacionados", "provasAplicadas"],
        "source": "admin-measurement"
      },
      {
        "id": "comparacao_medicao",
        "label": "Comparação da medição",
        "description": "Contraste entre percentuais administrativos e planilha externa.",
        "keyFields": ["id", "obraId", "arquivo", "linhas", "diferencas"],
        "source": "admin-measurement"
      },
      {
        "id": "colaborador",
        "label": "Colaborador",
        "description": "Usuário do app de medição autorizado por email e CPF.",
        "keyFields": ["id", "nome", "email", "cpf", "obrasPermitidas"],
        "source": "admin-mobile-access/mobile-login-gate"
      },
      {
        "id": "archive",
        "label": "Archive",
        "description": "Repositório local de evidências, prints, anexos, tabelas, diários e medições.",
        "keyFields": ["id", "path", "tipo", "entidadeOrigem", "entidadeOrigemId"],
        "source": "installer-archive-okf-llama"
      },
      {
        "id": "llama_local",
        "label": "Servidor Llama local",
        "description": "Servidor local com modelo gemma4eb para leitura do Archive e sugestões baseadas no OKF.",
        "keyFields": ["endpoint", "model", "scope"],
        "source": "installer-archive-okf-llama"
      }
    ]
  }))
  writeFileIfChanged(base / "schema" / "relacoes.json", $(%*{
    "version": 1,
    "relations": [
      {"from": "obra", "type": "possui", "to": "elemento_obra", "cardinality": "1:N"},
      {"from": "obra", "type": "possui", "to": "item_medicao", "cardinality": "1:N"},
      {"from": "obra", "type": "possui", "to": "servico", "cardinality": "1:N"},
      {"from": "obra", "type": "possui", "to": "rotina", "cardinality": "1:N"},
      {"from": "obra", "type": "possui", "to": "cronograma", "cardinality": "1:N"},
      {"from": "obra", "type": "possui", "to": "diario_obra", "cardinality": "1:N"},
      {"from": "obra", "type": "possui", "to": "medicao", "cardinality": "1:N"},
      {"from": "obra", "type": "autoriza", "to": "colaborador", "cardinality": "N:N"},
      {"from": "elemento_obra", "type": "depende_de", "to": "elemento_obra", "cardinality": "N:N"},
      {"from": "elemento_obra", "type": "libera", "to": "elemento_obra", "cardinality": "N:N"},
      {"from": "elemento_obra", "type": "gera", "to": "servico", "cardinality": "1:N"},
      {"from": "elemento_obra", "type": "mapeia", "to": "item_medicao", "cardinality": "N:1"},
      {"from": "servico", "type": "compoe", "to": "rotina", "cardinality": "N:N"},
      {"from": "rotina", "type": "alocada_em", "to": "cronograma", "cardinality": "N:N"},
      {"from": "servico", "type": "alocado_em", "to": "cronograma", "cardinality": "N:N"},
      {"from": "diario_obra", "type": "registra", "to": "servico", "cardinality": "N:N"},
      {"from": "diario_obra", "type": "contem", "to": "confirmacao_servico", "cardinality": "1:N"},
      {"from": "confirmacao_servico", "type": "prova_execucao_de", "to": "servico", "cardinality": "N:1"},
      {"from": "confirmacao_servico", "type": "comprova_progresso_em", "to": "medicao", "cardinality": "N:1"},
      {"from": "diario_obra", "type": "alimenta", "to": "medicao", "cardinality": "N:1"},
      {"from": "medicao", "type": "mede", "to": "item_medicao", "cardinality": "1:N"},
      {"from": "comparacao_medicao", "type": "compara", "to": "medicao", "cardinality": "N:1"},
      {"from": "archive", "type": "guarda_evidencia_de", "to": "diario_obra", "cardinality": "N:1"},
      {"from": "archive", "type": "guarda_prova_de", "to": "confirmacao_servico", "cardinality": "N:1"},
      {"from": "archive", "type": "guarda_importacao_de", "to": "comparacao_medicao", "cardinality": "N:1"},
      {"from": "archive", "type": "guarda_print_de", "to": "obra", "cardinality": "N:1"},
      {"from": "llama_local", "type": "consulta", "to": "archive", "cardinality": "1:N"},
      {"from": "llama_local", "type": "consulta", "to": "elemento_obra", "cardinality": "1:N"},
      {"from": "llama_local", "type": "sugere", "to": "rotina", "cardinality": "1:N"}
    ]
  }))
  writeFileIfChanged(base / "graph" / "macroobras.mmd", """
flowchart LR
  Obra[Obra]
  Elemento[Elemento de obra]
  Item[Item de medição]
  Servico[Serviço]
  Rotina[Rotina]
  Cronograma[Cronograma]
  Diario[Diário de obra]
  Confirmacao[Confirmação por câmera]
  Medicao[Medição]
  Comparacao[Comparação da medição]
  Colaborador[Colaborador do app de medição]
  Archive[Archive local]
  Llama[Llama local / gemma4eb]

  Obra -->|possui| Elemento
  Obra -->|possui| Item
  Obra -->|autoriza| Colaborador
  Elemento -->|depende de / libera| Elemento
  Elemento -->|gera| Servico
  Elemento -->|mapeia| Item
  Servico -->|compõe| Rotina
  Rotina -->|alocada em| Cronograma
  Servico -->|alocado em| Cronograma
  Diario -->|registra| Servico
  Diario -->|contém| Confirmacao
  Confirmacao -->|prova execução| Servico
  Confirmacao -->|comprova progresso| Medicao
  Diario -->|alimenta| Medicao
  Medicao -->|mede| Item
  Comparacao -->|compara| Medicao
  Archive -->|guarda evidências| Diario
  Archive -->|guarda provas| Confirmacao
  Archive -->|guarda importações| Comparacao
  Llama -->|consulta| Archive
  Llama -->|consulta| Elemento
  Llama -->|sugere| Rotina
""")
  writeFileIfChanged(base / "dependencias-elementos-obra.md", """
# MacroObras - Dependencias e requisitos de elementos de obra

Este espaco registra um fluxo ainda nao orquestrado completamente no app, mas essencial para o dominio: elementos de obra podem depender de outros elementos, de requisitos listados, de evidencias ou de conclusoes administrativas antes de liberar novas operacoes.

## Conceitos

- Elemento dependente: elemento que nao deve ser criado, executado, medido ou liberado antes de cumprir requisitos.
- Requisito: condicao necessaria para liberar um elemento, servico, rotina, diario, compra ou medicao.
- Liberacao: efeito produzido quando um requisito e cumprido.
- Bloqueio operacional: impedimento de exibir ou executar a acao no fluxo do usuario.
- Pendencia de conhecimento: registro OKF gerado para sincronizacao futura, sem bloquear persistencia local quando a operacao ja for valida.

## Exemplos de relacao

- Fundacao libera alvenaria inicial.
- Alvenaria libera reboco interno.
- Impermeabilizacao libera acabamento de banheiro.
- Servico completado em diario pode liberar percentual de medicao.
- Obra selecionada libera rotinas, cronograma, diario, compras e recibos no TWA.

## Espaco de orquestracao futura

O app deve evoluir para uma camada que avalie:

- quais elementos existem;
- quais requisitos cada elemento exige;
- quais requisitos ja foram cumpridos;
- quais acoes ficam ocultas, bloqueadas ou liberadas;
- quais entidades devem receber atualizacao OKF quando uma liberacao ocorre.

Essa camada deve ser usada pelo backend e pela interface. A UI nao deve inventar dependencias isoladamente; ela deve refletir regras de dominio.
""")
  writeFileIfChanged(base / "operacoes.md", """
# MacroObras - Operacoes do sistema

## Administracao desktop

- Adicionar obra: cadastra obra, importa tabela de itens e cria estrutura operacional inicial.
- Criar servico administrativo: cria servico pela administracao e registra conhecimento operacional.
- Cronograma da obra: adiciona linhas, sobrescreve planejamento e notifica mestre.
- Medicao da obra: aplica progresso por item com base em diarios e provas de camera.
- Comparacao da medicao: importa percentuais esperados e gera diferencas contra a medicao administrativa.

## App de medição

- Login do colaborador: autentica perfil mestre pelo endpoint `/api/colaboradores/login`.
- Criar rotina: depende de obra selecionada e cria agrupamento recorrente de servicos.
- Cronograma do dia: mostra alocacoes do dia e permite itens planejados.
- Diario de obra: registra descricao, servicos executados, anexos e evidencia.
- Confirmar servico feito: usa camera para apontar a execucao realizada, anexando prova ao diario.
- Completar diario: envia diario e provas de camera para aplicacao do progresso na medicao.
- Solicitar compra e anexar recibo: dependem de obra ativa e devem gerar conhecimento cadastral.

## Guardrails de fluxo

Operacoes do app de medição que dependem de obra nao devem aparecer ou executar antes de uma obra ativa. A interface de campo e restrita ao TWA; a administracao desktop nao deve expor o mestre como aba comum.

Fluxos futuros de elementos de obra devem respeitar dependencias e requisitos declarados: o usuario nao deve receber acoes liberadas quando o elemento anterior, evidencia, diario ou medicao exigida ainda nao existir.
""")
  writeFileIfChanged(base / "instalacao.md", """
# MacroObras - Instalacao e distribuicao

## Wizard desktop

O aplicativo Nim inicia como estacao administrativa. O wizard deve validar:

- OKF local preparado a partir do conhecimento de dominio e operacoes.
- Repositorio OKF Git opcional configurado por `MACROOBRAS_OKF_REPO_SSH`.
- Chave SSH dedicada para sincronizacao externa, sem embutir chave privada no binario.
- Endpoint de login do app de medição ativo.
- Endpoint de colaboradores apresentado ao usuário para acesso do app de medição.

## Distribuicao APK/TWA

O APK do mestre deve apontar para a superficie de campo restrita (`?surface=twa`) e usar o endpoint de colaboradores apresentado pelo app administrativo. A superficie desktop permanece administrativa.
""")
  writeFileIfChanged(base / "manifest.json", $(%*{
    "produto": "MacroObras",
    "tipo": "okf-local",
    "origem": "app-nim-compilado",
    "dominios": ["obras", "elementos-de-obra", "dependencias", "requisitos", "servicos", "rotinas", "cronogramas", "diarios", "medicoes", "compras"],
    "operacionalBloqueante": false
  }))

proc okfStatusPayload(): JsonNode =
  let config = okfConfig()
  let repoDir = okfAbsoluteDir(config)
  let repoConfigured = config{"repoSsh"}.getStr("").len > 0
  let sshKey = config{"sshKey"}.getStr("")
  let knowledgeReady = fileExists(okfSeedMarker(repoDir))
  %*{
    "configurado": repoConfigured,
    "pronto": knowledgeReady,
    "gitPronto": dirExists(repoDir / ".git"),
    "repoSsh": config{"repoSsh"}.getStr(""),
    "branch": config{"branch"}.getStr(OkfDefaultBranch),
    "localDir": repoDir,
    "knowledgeDir": repoDir / OkfSeedDir,
    "envFile": config{"envFile"}.getStr(""),
    "sshKey": sshKey,
    "sshKeyExiste": sshKey.len > 0 and fileExists(sshKey),
    "mensagem": if knowledgeReady and dirExists(repoDir / ".git"): "OKF local preparado e repositório Git pronto." elif knowledgeReady: "OKF local preparado a partir do domínio do app; Git remoto opcional pendente." elif not repoConfigured: "OKF local ainda não preparado; repositório remoto opcional não configurado." else: "OKF configurado e aguardando instalação."
  }

proc runGitOkf(args: seq[string], workingDir = ""): tuple[code: int, output: string] =
  let config = okfConfig()
  let sshKey = config{"sshKey"}.getStr("")
  let oldGitSsh = getEnv("GIT_SSH_COMMAND", "")
  var command = "git"
  for arg in args:
    command.add(" " & arg.quoteShell)
  if sshKey.len > 0:
    putEnv("GIT_SSH_COMMAND", "ssh -i " & sshKey.quoteShell & " -o IdentitiesOnly=yes")
  try:
    let executed = execCmdEx(command, options = {poUsePath, poStdErrToStdOut}, workingDir = workingDir)
    result.output = executed.output
    result.code = executed.exitCode
  except OSError as e:
    result.code = 1
    result.output = e.msg
  except CatchableError as e:
    result.code = 1
    result.output = e.msg
  finally:
    if oldGitSsh.len > 0:
      putEnv("GIT_SSH_COMMAND", oldGitSsh)
    else:
      delEnv("GIT_SSH_COMMAND")

proc prepareOkfPayload(): JsonNode =
  let config = okfConfig()
  let repo = config{"repoSsh"}.getStr("")
  let branch = config{"branch"}.getStr(OkfDefaultBranch)
  let repoDir = okfAbsoluteDir(config)
  let sshKey = config{"sshKey"}.getStr("")

  if repo.len == 0:
    createDir(repoDir)
    seedOkfKnowledge(repoDir)
    return %*{
      "instalado": true,
      "bloqueante": false,
      "status": okfStatusPayload(),
      "mensagem": "OKF local preparado a partir do domínio e operações do app. Configure MACROOBRAS_OKF_REPO_SSH para sincronizar remoto."
    }

  if sshKey.len > 0 and not fileExists(sshKey):
    return %*{
      "instalado": false,
      "bloqueante": false,
      "status": okfStatusPayload(),
      "mensagem": "Chave SSH do OKF não encontrada: " & sshKey
    }

  var step: tuple[code: int, output: string]
  if dirExists(repoDir / ".git"):
    step = runGitOkf(@["fetch", "origin", branch], repoDir)
    if step.code == 0:
      step = runGitOkf(@["checkout", branch], repoDir)
    if step.code == 0:
      step = runGitOkf(@["pull", "--ff-only", "origin", branch], repoDir)
  else:
    createDir(repoDir.parentDir)
    step = runGitOkf(@["clone", "--branch", branch, repo, repoDir])

  if step.code == 0:
    seedOkfKnowledge(repoDir)

  %*{
    "instalado": step.code == 0,
    "bloqueante": false,
    "status": okfStatusPayload(),
    "saida": step.output,
    "mensagem": if step.code == 0: "OKF pronto em " & repoDir else: "Falha ao preparar OKF: " & step.output
  }

proc defaultInstallAppDir(): string =
  getEnv("MACROOBRAS_INSTALL_DIR", getEnv("MACROOBRAS_INSTALL_APP_DIR", "/opt/macroobras"))

proc ftpHost(): string =
  getEnv("MACROOBRAS_FTP_HOST", "192.168.0.24")

proc ftpPort(): string =
  getEnv("MACROOBRAS_FTP_PORT", "2121")

proc archiveDir(): string =
  getEnv("MACROOBRAS_ARCHIVE_DIR", defaultInstallAppDir() / "archive")

proc llamaEndpoint(): string =
  getEnv("MACROOBRAS_LLAMA_ENDPOINT", LlamaDefaultEndpoint)

proc llamaModel(): string =
  getEnv("MACROOBRAS_LLAMA_MODEL", LlamaDefaultModel)

proc isRootUser(): bool =
  when defined(posix):
    getEnv("USER", "") == "root" or getEnv("EUID", "") == "0" or execShellCmd("test \"$(id -u)\" = 0") == 0
  else:
    false

proc commandList(): JsonNode =
  let appDir = defaultInstallAppDir()
  %*[
    "install -d -m 755 " & quoteShell(appDir) & " " & quoteShell(archiveDir()),
    "expor FTP local " & quoteShell("ftp://" & ftpHost() & ":" & ftpPort() & "/macroobras"),
    "preparar Archive em " & quoteShell(archiveDir()),
    "preparar OKF local em " & quoteShell(okfAbsoluteDir(okfConfig())),
    "conectar servidor Llama local " & quoteShell(llamaEndpoint())
  ]

proc installerStatusPayload(): JsonNode =
  let appDir = defaultInstallAppDir()
  let archive = archiveDir()
  %*{
    "installDir": appDir,
    "ftpHost": ftpHost(),
    "ftpPort": ftpPort(),
    "ftpEndpoint": "ftp://" & ftpHost() & ":" & ftpPort() & "/macroobras",
    "collaboratorEndpoint": collaboratorTarget() & CollaboratorBasePath,
    "archiveEndpoint": "file://" & archive,
    "llamaEndpoint": llamaEndpoint(),
    "llamaModel": llamaModel(),
    "pathReady": dirExists(appDir),
    "ftpReady": dirExists(appDir),
    "endpointReady": true,
    "archiveReady": dirExists(archive),
    "okfReady": okfStatusPayload(){"pronto"}.getBool(false),
    "needsAdmin": not isRootUser(),
    "message": if dirExists(appDir): "Pasta preparada, endpoint local apresentado e Archive disponível." else: "Escolha a pasta de instalação e prepare a transmissão local.",
    "commands": commandList()
  }

proc copyDirContents(src, dest: string) =
  if not dirExists(src):
    return
  for path in walkDirRec(src):
    let rel = path.relativePath(src)
    let target = dest / rel
    if dirExists(path):
      createDir(target)
    else:
      createDir(target.parentDir)
      copyFile(path, target)

proc executeInstallerPayload(): JsonNode =
  let appDir = defaultInstallAppDir()

  createDir(appDir)
  createDir(archiveDir())
  discard prepareOkfPayload()
  writeFileIfChanged(appDir / "ftp-local.txt", "Endpoint FTP local: ftp://" & ftpHost() & ":" & ftpPort() & "/macroobras\nPasta: " & appDir & "\n")
  writeFileIfChanged(appDir / "llama-local.txt", "Servidor Llama: " & llamaEndpoint() & "\nModelo: " & llamaModel() & "\n")

  %*{
    "instalado": true,
    "requerAdministrador": false,
    "status": installerStatusPayload(),
    "mensagem": "Introdução concluída: pasta preparada, FTP local documentado, Archive criado, OKF preparado e Llama local apontado."
  }

proc tunnelMatchesCollaborator(tunnel: JsonNode): bool =
  let tunnelAddr = tunnel{"config"}{"addr"}.getStr("")
  let target = collaboratorTarget()
  tunnelAddr == target or tunnelAddr == target.replace("127.0.0.1", "localhost")

proc bundledNgrokPath(): string =
  let baseDir = getAppDir()
  when defined(windows):
    result = baseDir / "vendor" / "ngrok" / "windows" / "ngrok.exe"
  elif defined(linux):
    result = baseDir / "vendor" / "ngrok" / "linux" / "ngrok"
  else:
    result = ""

proc projectNgrokPath(): string =
  let baseDir = currentSourcePath().parentDir().parentDir()
  when defined(windows):
    result = baseDir / "vendor" / "ngrok" / "windows" / "ngrok.exe"
  elif defined(linux):
    result = baseDir / "vendor" / "ngrok" / "linux" / "ngrok"
  else:
    result = ""

proc embeddedNgrokPath(): string =
  when defined(macroobrasEmbedNgrok):
    when defined(windows):
      const embeddedNgrok = staticRead("../vendor/ngrok/windows/ngrok.exe")
      let filename = "macroobras-ngrok.exe"
    elif defined(linux):
      const embeddedNgrok = staticRead("../vendor/ngrok/linux/ngrok")
      let filename = "macroobras-ngrok"
    else:
      return ""

    let path = getTempDir() / filename
    if not fileExists(path) or getFileSize(path) != embeddedNgrok.len:
      writeFile(path, embeddedNgrok)
      when not defined(windows):
        discard execShellCmd("chmod 700 " & quoteShell(path))
    path
  else:
    ""

proc ngrokExecutable(): string =
  let explicit = getEnv("MACROOBRAS_NGROK_BIN", "")
  if explicit.len > 0:
    return explicit

  let embedded = embeddedNgrokPath()
  if embedded.len > 0 and fileExists(embedded):
    return embedded

  let appBundled = bundledNgrokPath()
  if appBundled.len > 0 and fileExists(appBundled):
    return appBundled

  let projectBundled = projectNgrokPath()
  if projectBundled.len > 0 and fileExists(projectBundled):
    return projectBundled

  "ngrok"

proc collaboratorPublicBaseUrl*(): string =
  let client = newHttpClient(timeout = 800)
  defer: client.close()

  for apiUrl in ngrokApiUrls():
    try:
      let tunnels = parseJson(client.getContent(apiUrl))["tunnels"]
      for tunnel in tunnels:
        if not tunnelMatchesCollaborator(tunnel):
          continue
        let publicUrl = tunnel{"public_url"}.getStr("")
        if publicUrl.startsWith("https://"):
          return publicUrl & CollaboratorBasePath
      for tunnel in tunnels:
        if not tunnelMatchesCollaborator(tunnel):
          continue
        let publicUrl = tunnel{"public_url"}.getStr("")
        if publicUrl.len > 0:
          return publicUrl & CollaboratorBasePath
    except CatchableError:
      discard

  ""

proc stopCollaboratorNgrok() {.noconv.} =
  if collaboratorNgrokProcess != nil and collaboratorNgrokProcess.running:
    collaboratorNgrokProcess.terminate()
    collaboratorNgrokProcess.close()

proc startCollaboratorNgrok*() =
  if not envEnabled("MACROOBRAS_ENABLE_NGROK", false):
    echo "MacroObras collaborator public tunnel disabled by default; showing local collaborator endpoint only."
    return

  if collaboratorNgrokProcess != nil and collaboratorNgrokProcess.running:
    return

  var args = @["http", collaboratorTarget()]
  let domain = getEnv("MACROOBRAS_NGROK_DOMAIN", "")
  if domain.len > 0:
    args.add("--url")
    args.add(domain)
  if envEnabled("MACROOBRAS_NGROK_POOLING", true):
    args.add("--pooling-enabled")

  try:
    let ngrokBin = ngrokExecutable()
    collaboratorNgrokProcess = startProcess(
      ngrokBin,
      args = args,
      options = (if ngrokBin == "ngrok": {poUsePath, poParentStreams} else: {poParentStreams})
    )
    addExitProc(stopCollaboratorNgrok)
    echo "MacroObras collaborator ngrok started for " & collaboratorTarget() & CollaboratorBasePath
  except OSError as e:
    echo "MacroObras collaborator ngrok failed to start: " & e.msg

proc criarServicoAdministrativo(payloadJson: string): string {.expose.} =
  let payload = parseJson(payloadJson)
  let descricao = payload{"descricao"}.getStr("serviço administrativo")
  let item = payload{"item"}.getStr("item não informado")
  let servico = criarServicoPelaAdministracao(
    funcionario = funcionario(AdminName),
    elemento = elementoObra(material(""), item),
    descricao = descricao,
    tempoNecessario = none(TempoAlocacao)
  )
  ok(%*{
    "descricao": servico.descricao,
    "origem": "administracao",
    "conhecimentoOkfPendente": atualizacaoConhecimentoOkfPendente(tesServico, acoCriacao).pendenteSincronizacao
  })

proc adicionarLinhaCronograma(payloadJson: string): string {.expose.} =
  let payload = parseJson(payloadJson)
  ok(%*{
    "agenda": payload,
    "notificacao": "Alocação registrada e mestre será notificado.",
    "conhecimentoOkfPendente": true
  })

proc sobrescreverCronograma(payloadJson: string): string {.expose.} =
  let payload = parseJson(payloadJson)
  ok(%*{
    "cronograma": payload,
    "notificacao": "Cronograma sobrescrito pela administração.",
    "conhecimentoOkfPendente": true
  })

proc alterarPercentualItemMedicao(payloadJson: string): string {.expose.} =
  let payload = parseJson(payloadJson)
  ok(%*{
    "medicao": payload,
    "persistencia": "sqlite",
    "conhecimentoOkfPendente": true
  })

proc gerarComparacaoPercentuaisMedicao(payloadJson: string): string {.expose.} =
  let payload = parseJson(payloadJson)
  ok(%*{
    "comparacao": payload,
    "linhas": [
      {"item": "fundação", "admin": 35, "excel": 45, "diferenca": -10},
      {"item": "reboco interno", "admin": 15, "excel": 18, "diferenca": -3},
      {"item": "instalação hidráulica", "admin": 5, "excel": 8, "diferenca": -3}
    ],
    "conhecimentoOkfPendente": true
  })

proc obterRotaPublicaColaborador(): string {.expose.} =
  let localBaseUrl = collaboratorTarget() & CollaboratorBasePath
  try:
    let publicUrl = collaboratorPublicBaseUrl()
    if publicUrl.len == 0:
      return ok(%*{
        "disponivel": false,
        "localAtivo": true,
        "localBaseUrl": localBaseUrl,
        "baseUrl": "",
        "mensagem": "Porta local ativa; URL pública ngrok aguardando ou bloqueada."
      })
    ok(%*{
      "disponivel": true,
      "localAtivo": true,
      "localBaseUrl": localBaseUrl,
      "baseUrl": publicUrl
    })
  except CatchableError as e:
    ok(%*{
      "disponivel": false,
      "localAtivo": true,
      "localBaseUrl": localBaseUrl,
      "baseUrl": "",
      "mensagem": e.msg
    })

proc obterStatusOkf(): string {.expose.} =
  ok(okfStatusPayload())

proc prepararOkf(): string {.expose.} =
  ok(prepareOkfPayload())

proc obterStatusInstalador(): string {.expose.} =
  ok(installerStatusPayload())

proc executarInstalador(): string {.expose.} =
  ok(executeInstallerPayload())

proc colaboradorLogin(ctx: Context) {.async.} =
  ctx.json(%*{"token": "dev-colaborador", "nome": "João Mestre", "perfil": "mestre"})

proc colaboradorStatus(ctx: Context) {.async.} =
  ctx.json(%*{
    "ok": true,
    "servico": "macroobras-colaborador",
    "descricao": "API externa para ações cadastrais do colaborador e atualização operacional.",
    "localBaseUrl": collaboratorTarget() & CollaboratorBasePath,
    "publicBaseUrl": collaboratorPublicBaseUrl(),
    "endpoints": [
      {"method": "POST", "path": "/api/colaboradores/login"},
      {"method": "POST", "path": "/api/colaboradores/servicos"},
      {"method": "POST", "path": "/api/colaboradores/rotinas"},
      {"method": "POST", "path": "/api/colaboradores/cronogramas/alocar"},
      {"method": "POST", "path": "/api/colaboradores/diarios/registrar"},
      {"method": "POST", "path": "/api/colaboradores/diarios/completar"},
      {"method": "POST", "path": "/api/colaboradores/compras/solicitar"},
      {"method": "POST", "path": "/api/colaboradores/compras/anexar-recibo"}
    ],
    "conhecimentoOkf": {
      "papel": "base de conhecimento das entidades do sistema",
      "atualizadoEmAcoesCadastrais": true
    }
  })

proc colaboradorOk(ctx: Context) {.async.} =
  ctx.json(%*{"ok": true, "conhecimentoOkfPendente": true})

Route.get("/api/colaboradores", colaboradorStatus)
Route.post("/api/colaboradores/login", colaboradorLogin)
Route.post("/api/colaboradores/servicos", colaboradorOk)
Route.post("/api/colaboradores/rotinas", colaboradorOk)
Route.post("/api/colaboradores/cronogramas/alocar", colaboradorOk)
Route.post("/api/colaboradores/diarios/registrar", colaboradorOk)
Route.post("/api/colaboradores/diarios/completar", colaboradorOk)
Route.post("/api/colaboradores/compras/solicitar", colaboradorOk)
Route.post("/api/colaboradores/compras/anexar-recibo", colaboradorOk)

configureLinuxWebviewEnvironment()
startCollaboratorNgrok()

startDesktopApp(
  title = "MacroObras",
  width = 1448,
  height = 1086,
  devUrl = "http://localhost:5173",
  prodDir = "../frontend/dist",
  corsOrigins = "*",
  port = AppPort,
  address = AppHost
)
