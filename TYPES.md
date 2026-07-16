# MacroObras - Especificação de Tipos e Gramática Formal (EBNF)

Este documento descreve formalmente o modelo de conhecimento (OKF), as entidades operacionais locais e as assinaturas de funções de serviços do projeto **MacroObras**. 

A especificação está escrita em **EBNF (Extended Backus-Naur Form)**, acompanhada de notas explicativas simplificadas e exemplos estruturados em formato JSON para garantir facilidade de leitura para desenvolvedores e leigos.

---

## Como ler esta gramática (Guia para Leigos)
* `=` define os componentes de uma estrutura.
* `,` (vírgula) representa a sequência direta dos campos.
* `|` (barra vertical) significa "OU" (alternativas).
* `[` e `]` (colchetes) marcam campos **opcionais**.
* `{` e `}` (chaves) representam repetições ou listas (coleções de elementos).
* `(* ... *)` são anotações de comentários explicativos.

---

## 1. Gramática das Entidades de Domínio (OKF & SQLite)

### A. Obra
Representa a unidade operacional administrada (projeto ou canteiro).

```ebnf
Obra = "{" , IdProperty , "," , NomeProperty , "," , CodigoProperty , "," , ClienteProperty , "}" ;

IdProperty      = '"id"' , ":" , StringOrInteger ;   (* Identificador único da obra *)
NomeProperty    = '"nome"' , ":" , String ;          (* Nome do canteiro de obras ou projeto *)
CodigoProperty  = '"codigo"' , ":" , String ;        (* Código de registro técnico (ex: "OBRA-ABC") *)
ClienteProperty = '"cliente"' , ":" , String ;       (* Nome do cliente contratante *)
```

#### Exemplo Prático (JSON)
```json
{
  "id": "obra_402",
  "nome": "Residencial Viver Bem - Torre A",
  "codigo": "RVB-TA",
  "cliente": "Construtora Vida Nova"
}
```

---

### B. Elemento de Obra (ElementoObra)
Representa uma parte física da estrutura ou uma etapa construtiva, com dependências de outros elementos e materiais vinculados.

```ebnf
ElementoObra = "{" , IdProperty , "," , NomeProperty , "," , DescricaoProperty , "," , MateriaisProperty , "," , DependenciasProperty , "," , LiberacoesProperty , "}" ;

DescricaoProperty    = '"descricao"' , ":" , String ;
MateriaisProperty    = '"materiais"' , ":" , "[" , { String , [ "," ] } , "]" ;    (* Lista de insumos requeridos *)
DependenciasProperty = '"dependencias"' , ":" , "[" , { String , [ "," ] } , "]" ; (* IDs de outros elementos que devem terminar antes *)
LiberacoesProperty   = '"liberacoes"' , ":" , "[" , { String , [ "," ] } , "]" ;   (* IDs de elementos liberados após a conclusão deste *)
```

#### Exemplo Prático (JSON)
```json
{
  "id": "elem_fundacao_01",
  "nome": "Concretagem de Sapatas - Setor Norte",
  "descricao": "Etapa de preenchimento estrutural de sapatas com concreto usinado.",
  "materiais": ["Concreto Fck 30MPa", "Aço CA-50 10mm"],
  "dependencias": ["elem_escavacao_01"],
  "liberacoes": ["elem_alvenaria_subsolo"]
}
```

---

### C. Item de Medição (ItemMedicao)
Uma linha importada da planilha de orçamento e medição, vinculada à evolução física e financeira da obra.

```ebnf
ItemMedicao = "{" , IdProperty , "," , ObraIdProperty , "," , DescricaoProperty , "," , NivelProperty , "," , PercentualAdminProperty , "}" ;

ObraIdProperty        = '"obraId"' , ":" , StringOrInteger ;
NivelProperty         = '"nivel"' , ":" , String ;        (* Nível hierárquico na planilha (ex: "1.1.2") *)
PercentualAdminProperty= '"percentualAdministrativo"' , ":" , Decimal ; (* Progresso acumulado homologado pela fiscalização *)
```

#### Exemplo Prático (JSON)
```json
{
  "id": "item_120",
  "obraId": "obra_402",
  "descricao": "Superestrutura de concreto armado",
  "nivel": "2.1",
  "percentualAdministrativo": 45.5
}
```

---

### D. Serviço
Trabalho individual e executável no canteiro de obras, com estimativa de tempo de alocação.

```ebnf
Servico = "{" , IdProperty , "," , ObraIdProperty , "," , ElementoObraIdProperty , "," , DescricaoProperty , "," , TempoNecessarioProperty , "}" ;

ElementoObraIdProperty  = '"elementoObraId"' , ":" , String ;
TempoNecessarioProperty = '"tempoNecessario"' , ":" , ( Integer | "null" ) ; (* Tempo estimado em horas *)
```

#### Exemplo Prático (JSON)
```json
{
  "id": "serv_armação_05",
  "obraId": "obra_402",
  "elementoObraId": "elem_fundacao_01",
  "descricao": "Corte e dobra de armações para estribos",
  "tempoNecessario": 8
}
```

---

### E. Rotina
Agrupamento recorrente de serviços atribuídos às equipes do mestre de obras.

```ebnf
Rotina = "{" , IdProperty , "," , ObraIdProperty , "," , NomeProperty , "," , ServicosProperty , "," , RotativaProperty , "}" ;

ServicosProperty = '"servicos"' , ":" , "[" , { String , [ "," ] } , "]" ; (* Lista de IDs de serviços associados *)
RotativaProperty = '"rotativa"' , ":" , Boolean ;                          (* Se reinicia periodicamente *)
```

#### Exemplo Prático (JSON)
```json
{
  "id": "rot_manutencao_diaria",
  "obraId": "obra_402",
  "nome": "Rotina de Organização e Segurança Matinal",
  "servicos": ["serv_limpeza_ferramentas", "serv_dds_seguranca"],
  "rotativa": true
}
```

---

### F. Cronograma
Alocação temporal e turnos de trabalho definidos para serviços e rotinas.

```ebnf
Cronograma = "{" , IdProperty , "," , ObraIdProperty , "," , DataProperty , "," , TurnoProperty , "," , AlocacoesProperty , "}" ;

DataProperty       = '"data"' , ":" , String ;         (* Data agendada (ex: "YYYY-MM-DD") *)
TurnoProperty      = '"turno"' , ":" , TurnoValue ;    (* Turno da alocação *)
AlocacoesProperty  = '"alocacoes"' , ":" , "[" , { AlocacaoItem , [ "," ] } , "]" ;

TurnoValue         = '"manha"' | '"tarde"' | '"integral"' ;
AlocacaoItem       = "{" , '"tipo"' , ":" , ( '"servico"' | '"rotina"' ) , "," , '"idTarget"' , ":" , String , "}" ;
```

#### Exemplo Prático (JSON)
```json
{
  "id": "cron_2026_07_16",
  "obraId": "obra_402",
  "data": "2026-07-16",
  "turno": "manha",
  "alocacoes": [
    { "tipo": "rotina", "idTarget": "rot_manutencao_diaria" },
    { "tipo": "servico", "idTarget": "serv_armação_05" }
  ]
}
```

---

### G. Diário de Obra (DiarioObra)
Registro diário de progresso, ocorrências e confirmações feito pela equipe de campo.

```ebnf
DiarioObra = "{" , IdProperty , "," , ObraIdProperty , "," , DataProperty , "," , DescricaoProperty , "," , ServicosExecutadosProperty , "," , ConfirmacoesProperty , "," , EvidenciasProperty , "," , CompletoProperty , "}" ;

ServicosExecutadosProperty = '"servicosExecutados"' , ":" , "[" , { String , [ "," ] } , "]" ; (* IDs de serviços feitos *)
ConfirmacoesProperty       = '"confirmacoesServico"' , ":" , "[" , { String , [ "," ] } , "]" ; (* IDs das confirmações por foto *)
EvidenciasProperty         = '"evidencias"' , ":" , "[" , { String , [ "," ] } , "]" ;          (* Caminhos de imagens extras *)
CompletoProperty           = '"completo"' , ":" , Boolean ;                                     (* Diário concluído e fechado *)
```

#### Exemplo Prático (JSON)
```json
{
  "id": "diario_2026_07_16",
  "obraId": "obra_402",
  "data": "2026-07-16",
  "descricao": "Fundação concluída no setor norte. Chuva rápida no final do turno sem prejuízos.",
  "servicosExecutados": ["serv_armação_05"],
  "confirmacoesServico": ["conf_sapata_01"],
  "evidencias": ["evidence-sapata-concluida.jpg"],
  "completo": true
}
```

---

### H. Confirmação de Serviço (ConfirmacaoServico)
Evidência fotográfica capturada via aplicativo mobile para comprovar a conclusão de um serviço específico.

```ebnf
ConfirmacaoServico = "{" , IdProperty , "," , ObraIdProperty , "," , ServicoIdProperty , "," , DiarioObraIdProperty , "," , FotoProperty , "," , CapturadaEmProperty , "," , StatusConfirmacaoProperty , "}" ;

ServicoIdProperty          = '"servicoId"' , ":" , String ;
DiarioObraIdProperty       = '"diarioObraId"' , ":" , String ;
FotoProperty               = '"foto"' , ":" , String ;                  (* Caminho ou hash da foto salva *)
CapturadaEmProperty        = '"capturadaEm"' , ":" , Date ;             (* Data e hora da captura *)
StatusConfirmacaoProperty  = '"statusConfirmacao"' , ":" , StatusValue ;(* Aprovação da fiscalização *)

StatusValue                = '"pendente"' | '"aprovado"' | '"rejeitado"' ;
```

#### Exemplo Prático (JSON)
```json
{
  "id": "conf_sapata_01",
  "obraId": "obra_402",
  "servicoId": "serv_armação_05",
  "diarioObraId": "diario_2026_07_16",
  "foto": "archive/evidence-sapata-concluida.jpg",
  "capturadaEm": "2026-07-16T11:45:00.000Z",
  "statusConfirmacao": "aprovado"
}
```

---

### I. Colaborador
Usuário habilitado a utilizar o aplicativo de medição de campo.

```ebnf
Colaborador = "{" , IdProperty , "," , NomeProperty , "," , EmailProperty , "," , CpfProperty , "," , ObrasPermitidasProperty , "}" ;

EmailProperty           = '"email"' , ":" , String ;
CpfProperty             = '"cpf"' , ":" , String ;
ObrasPermitidasProperty = '"obrasPermitidas"' , ":" , "[" , { String , [ "," ] } , "]" ; (* IDs de obras que pode acessar *)
```

#### Exemplo Prático (JSON)
```json
{
  "id": "colab_001",
  "nome": "João Mestre",
  "email": "joao.mestre@macroobras.com",
  "cpf": "123.456.789-00",
  "obrasPermitidas": ["obra_402"]
}
```

---

## 2. Funções de Serviços do Sistema (Lógica em Nim)

Abaixo estão especificadas as assinaturas formais das funções expostas nos principais módulos de serviço da estação MacroObras.

```ebnf
(* Assinatura dos serviços do módulo okf_service.nim *)
OkfService = OkfEnvFileFn | OkfConfigFn | OkfAbsoluteDirFn | SeedOkfKnowledgeFn | WriteFileIfChangedFn | PrepareOkfPayloadFn ;

OkfEnvFileFn         = "okfEnvFile() -> String" ;
OkfConfigFn          = "okfConfig() -> JsonNode" ;                  (* Retorna chaves e branch configurados *)
OkfAbsoluteDirFn     = "okfAbsoluteDir(config: JsonNode) -> String" ;
SeedOkfKnowledgeFn   = "seedOkfKnowledge(repoDir: String) -> void" ; (* Inicializa arquivos padrão do OKF *)
WriteFileIfChangedFn = "writeFileIfChanged(path: String, content: String) -> void" ;
PrepareOkfPayloadFn  = "prepareOkfPayload() -> JsonNode" ;          (* Sincroniza e prepara repositório de conhecimento *)

(* Assinatura dos serviços do módulo collaborator_service.nim *)
CollaboratorService = StartNgrokFn | StopNgrokFn | PublicUrlFn | ColaboradorLoginFn | ColaboradorStatusFn ;

StartNgrokFn         = "startCollaboratorNgrok() -> void" ;
StopNgrokFn          = "stopCollaboratorNgrok() -> void" ;
PublicUrlFn          = "collaboratorPublicBaseUrl() -> String" ;     (* Retorna endereço público HTTPS do Ngrok *)
ColaboradorLoginFn   = "colaboradorLogin(ctx: Context) -> void" ;    (* Retorna token e perfil de login *)
ColaboradorStatusFn  = "colaboradorStatus(ctx: Context) -> void" ;   (* Lista endpoints HTTP públicos ativos *)

(* Assinatura dos serviços do módulo admin_service.nim *)
AdminService = CriarServicoFn | AdicionarCronogramaFn | SobrescreverCronogramaFn | AlterarMedicaoFn | GerarComparacaoFn ;

CriarServicoFn         = "criarServicoAdministrativoPayload(payload: JsonNode) -> JsonNode" ;
AdicionarCronogramaFn  = "adicionarLinhaCronogramaPayload(payload: JsonNode) -> JsonNode" ;
SobrescreverCronogramaFn= "sobrescreverCronogramaPayload(payload: JsonNode) -> JsonNode" ;
AlterarMedicaoFn       = "alterarPercentualItemMedicaoPayload(payload: JsonNode) -> JsonNode" ;
GerarComparacaoFn      = "gerarComparacaoPercentuaisMedicaoPayload(payload: JsonNode) -> JsonNode" ;

(* Assinatura dos serviços do módulo installer_service.nim *)
InstallerService = DefaultInstallDirFn | ArchiveDirFn | InstallerStatusFn | ExecuteInstallerFn ;

DefaultInstallDirFn  = "defaultInstallAppDir() -> String" ;
ArchiveDirFn         = "archiveDir() -> String" ;
InstallerStatusFn    = "installerStatusPayload() -> JsonNode" ;     (* Verifica se caminhos de rede e FTP estão prontos *)
ExecuteInstallerFn   = "executeInstallerPayload() -> JsonNode" ;    (* Realiza a instalação local de pastas, FTP e Llama *)
```

---

## 3. Endpoints da API Externa de Colaboradores

O aplicativo mobile e sistemas autorizados interagem através do endpoint de API externa configurado:

```ebnf
(* Endpoints acessíveis via tunelamento público Ngrok ou rede local *)
CollaboratorAPI = LoginEndpoint | ServicesEndpoint | RoutinesEndpoint | AllocateCalendarEndpoint
                 | RegisterDiaryEndpoint | CompleteDiaryEndpoint | RequestPurchaseEndpoint | AttachReceiptEndpoint ;

LoginEndpoint            = "POST /api/colaboradores/login -> { token: String, nome: String, perfil: String }" ;
ServicesEndpoint         = "POST /api/colaboradores/servicos -> JsonNode" ;
RoutinesEndpoint         = "POST /api/colaboradores/rotinas -> JsonNode" ;
AllocateCalendarEndpoint = "POST /api/colaboradores/cronogramas/alocar -> JsonNode" ;
RegisterDiaryEndpoint    = "POST /api/colaboradores/diarios/registrar -> JsonNode" ;
CompleteDiaryEndpoint    = "POST /api/colaboradores/diarios/completar -> JsonNode" ;
RequestPurchaseEndpoint  = "POST /api/colaboradores/compras/solicitar -> JsonNode" ;
AttachReceiptEndpoint    = "POST /api/colaboradores/compras/anexar-recibo -> JsonNode" ;
```

---

## 4. Tipos Primitivos Comuns

Definições dos tipos fundamentais utilizados no sistema:

```ebnf
Digit           = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" ;
Letter          = "a" | "b" | ... | "z" | "A" | "B" | ... | "Z" ;
Character       = Letter | Digit | "_" | "-" | "." | "/" | "@" | " " | ":" | "," | "?" | "!" | "(" | ")" | "[" | "]" | '"' | "'" ;
Integer         = Digit , { Digit } ;
Decimal         = Integer , "." , Integer ;
StringOrInteger = String | Integer ;
Boolean         = "true" | "false" ;
String          = '"' , { Character } , '"' ;
Date            = '"' , Year , "-" , Month , "-" , Day , "T" , Hour , ":" , Minute , ":" , Second , "." , Millisecond , "Z" , '"' ;

Year            = Digit , Digit , Digit , Digit ;
Month           = Digit , Digit ;
Day             = Digit , Digit ;
Hour            = Digit , Digit ;
Minute          = Digit , Digit ;
Second          = Digit , Digit ;
Millisecond     = Digit , Digit , Digit ;
```
