# MacroObras - Especificação Técnica de Tipos e Gramática Formal

Este documento descreve as especificações técnicas de dados, o modelo de conhecimento e as assinaturas lógicas de processamento da estação de trabalho **MacroObras**. A especificação utiliza a notação **EBNF (Extended Backus-Naur Form)** para formalizar as entidades de domínio e as interfaces funcionais.

---

## 1. Descrição do Sistema

A estação de trabalho MacroObras é um sistema desktop e web baseado em Nim (usando Jazzy Framework) com suporte a banco de dados SQLite local, comunicação assíncrona baseada em Git/SSH e integração de modelos locais de Inteligência Artificial. Seus componentes operam sob a seguinte arquitetura:
1. **Gravação Local Resiliente**: Operações de canteiro (serviços, diários de obra, alocações, compras) gravadas localmente no banco de dados SQLite, eliminando dependência direta de redes externas para operação em campo.
2. **Base de Conhecimento OKF**: Sincronização em segundo plano dos registros locais consolidados em formato Markdown com cabeçalhos estruturados para repositórios GitHub via conexões SSH.
3. **Módulo de Comprovação por Câmera**: Registro físico de andamento de obras através de fotos anexadas aos diários diários de obra, servindo como auditoria para medições administrativas.
4. **Assistente de Leitura Local**: Integração com servidor Llama local executando modelo focado na leitura do histórico de evidências arquivadas para sugestão automática de rotinas.

---

## 2. Gramática de Estruturação (Modelagem de Dados)

Esta seção especifica a estrutura formal de dados das entidades de domínio utilizadas na persistência e no ecossistema OKF do sistema.

### A. Definição Formal em EBNF

```ebnf
(* Conjunto de Entidades de Domínio *)
DomainModel = Obra | ElementoObra | ItemMedicao | Servico | Rotina | Cronograma | DiarioObra | ConfirmacaoServico | Colaborador ;

(* Estrutura de Obra *)
Obra = "{" , IdProp , "," , NomeProp , "," , CodigoProp , "," , ClienteProp , "}" ;
IdProp      = '"id"' , ":" , StringOrInteger ;   (* Identificador exclusivo da obra *)
NomeProp    = '"nome"' , ":" , String ;          (* Nome descritivo da obra ou canteiro *)
CodigoProp  = '"codigo"' , ":" , String ;        (* Código de controle do canteiro (ex: "OBRA-402") *)
ClienteProp = '"cliente"' , ":" , String ;       (* Nome do cliente contratante *)

(* Estrutura de Elemento de Obra *)
ElementoObra = "{" , IdProp , "," , NomeProp , "," , DescricaoProp , "," , MateriaisProp , "," , DependenciasProp , "," , LiberacoesProp , "}" ;
DescricaoProp    = '"descricao"' , ":" , String ;
MateriaisProp    = '"materiais"' , ":" , "[" , { String , [ "," ] } , "]" ;    (* Lista de insumos vinculados *)
DependenciasProp = '"dependencias"' , ":" , "[" , { String , [ "," ] } , "]" ; (* IDs de elementos de obra antecedentes *)
LiberacoesProp   = '"liberacoes"' , ":" , "[" , { String , [ "," ] } , "]" ;   (* IDs de elementos de obra liberados *)

(* Estrutura de Item de Medição *)
ItemMedicao = "{" , IdProp , "," , ObraIdProp , "," , DescricaoProp , "," , NivelProp , "," , PercentualAdminProp , "}" ;
ObraIdProp          = '"obraId"' , ":" , StringOrInteger ;
NivelProp           = '"nivel"' , ":" , String ;             (* Nível estrutural da planilha (ex: "1.2.3") *)
PercentualAdminProp = '"percentualAdministrativo"' , ":" , Decimal ; (* Progresso acumulado homologado *)

(* Estrutura de Serviço *)
Servico = "{" , IdProp , "," , ObraIdProp , "," , ElementoObraIdProp , "," , DescricaoProp , "," , TempoNecessarioProp , "}" ;
ElementoObraIdProp  = '"elementoObraId"' , ":" , String ;
TempoNecessarioProp = '"tempoNecessario"' , ":" , ( Integer | "null" ) ; (* Tempo estimado em horas *)

(* Estrutura de Rotina *)
Rotina = "{" , IdProp , "," , ObraIdProp , "," , NomeProp , "," , ServicosProp , "," , RotativaProp , "}" ;
ServicosProp = '"servicos"' , ":" , "[" , { String , [ "," ] } , "]" ; (* Coleção de IDs de serviços associados *)
RotativaProp = '"rotativa"' , ":" , Boolean ;                          (* Indicador de repetição periódica *)

(* Estrutura de Cronograma *)
Cronograma = "{" , IdProp , "," , ObraIdProp , "," , DataProp , "," , TurnoProp , "," , AlocacoesProp , "}" ;
DataProp         = '"data"' , ":" , String ;          (* Data no formato AAAA-MM-DD *)
TurnoProp        = '"turno"' , ":" , TurnoValue ;     (* Período de execução programado *)
AlocacoesProp    = '"alocacoes"' , ":" , "[" , { AlocacaoItem , [ "," ] } , "]" ;
TurnoValue       = '"manha"' | '"tarde"' | '"integral"' ;
AlocacaoItem     = "{" , '"tipo"' , ":" , ( '"servico"' | '"rotina"' ) , "," , '"idTarget"' , ":" , String , "}" ;

(* Estrutura de Diário de Obra *)
DiarioObra = "{" , IdProp , "," , ObraIdProp , "," , DataProp , "," , DescricaoProp , "," , ServicosExecutadosProp , "," , ConfirmacoesProp , "," , EvidenciasProp , "," , CompletoProp , "}" ;
ServicosExecutadosProp = '"servicosExecutados"' , ":" , "[" , { String , [ "," ] } , "]" ; (* IDs de serviços realizados *)
ConfirmacoesProp       = '"confirmacoesServico"' , ":" , "[" , { String , [ "," ] } , "]" ; (* IDs de fotos de confirmação *)
EvidenciasProp         = '"evidencias"' , ":" , "[" , { String , [ "," ] } , "]" ;          (* Imagens extras de canteiro *)
CompletoProp           = '"completo"' , ":" , Boolean ;                                     (* Status de fechamento do diário *)

(* Estrutura de Confirmação de Serviço *)
ConfirmacaoServico = "{" , IdProp , "," , ObraIdProp , "," , ServicoIdProp , "," , DiarioObraIdProp , "," , FotoProp , "," , CapturadaEmProp , "," , StatusConfirmacaoProp , "}" ;
ServicoIdProp          = '"servicoId"' , ":" , String ;
DiarioObraIdProp       = '"diarioObraId"' , ":" , String ;
FotoProp               = '"foto"' , ":" , String ;                  (* Caminho lógico do arquivo de imagem *)
CapturadaEmProp        = '"capturadaEm"' , ":" , Date ;             (* Data e hora de captura *)
StatusConfirmacaoProp  = '"statusConfirmacao"' , ":" , StatusValue ;(* Estado da homologação pela fiscalização *)
StatusValue            = '"pendente"' | '"aprovado"' | '"rejeitado"' ;

(* Estrutura de Colaborador *)
Colaborador = "{" , IdProp , "," , NomeProp , "," , EmailProp , "," , CpfProp , "," , ObrasPermitidasProp , "}" ;
EmailProp           = '"email"' , ":" , String ;
CpfProp             = '"cpf"' , ":" , String ;
ObrasPermitidasProp = '"obrasPermitidas"' , ":" , "[" , { String , [ "," ] } , "]" ; (* IDs de obras autorizadas *)
```

### B. Especificação de Tipos Primitivos

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

---

## 3. Gramática de Funcionamento (Módulos & APIs)

Esta seção especifica o comportamento operacional e interfaces de rede descritos através das funções do sistema em Nim e contratos HTTP da API de integração.

### A. Assinaturas de Funções dos Serviços (Estação Local)

```ebnf
(* Operações do Módulo okf_service.nim *)
OkfMethods = OkfEnvFile | OkfConfig | OkfAbsoluteDir | SeedOkfKnowledge | WriteFileIfChanged | PrepareOkfPayload ;
OkfEnvFile         = "okfEnvFile() -> String" ;
OkfConfig          = "okfConfig() -> JsonNode" ;
OkfAbsoluteDir     = "okfAbsoluteDir(config: JsonNode) -> String" ;
SeedOkfKnowledge   = "seedOkfKnowledge(repoDir: String) -> void" ;
WriteFileIfChanged = "writeFileIfChanged(path: String, content: String) -> void" ;
PrepareOkfPayload  = "prepareOkfPayload() -> JsonNode" ;

(* Operações do Módulo collaborator_service.nim *)
CollaboratorMethods = StartNgrok | StopNgrok | PublicUrl | ColaboradorLogin | ColaboradorStatus ;
StartNgrok         = "startCollaboratorNgrok() -> void" ;
StopNgrok          = "stopCollaboratorNgrok() -> void" ;
PublicUrl          = "collaboratorPublicBaseUrl() -> String" ;
ColaboradorLogin   = "colaboradorLogin(ctx: Context) -> void" ;
ColaboradorStatus  = "colaboradorStatus(ctx: Context) -> void" ;

(* Operações do Módulo admin_service.nim *)
AdminMethods = CriarServico | AdicionarCronograma | SobrescreverCronograma | AlterarMedicao | GerarComparacao ;
CriarServico         = "criarServicoAdministrativoPayload(payload: JsonNode) -> JsonNode" ;
AdicionarCronograma  = "adicionarLinhaCronogramaPayload(payload: JsonNode) -> JsonNode" ;
SobrescreverCronograma = "sobrescreverCronogramaPayload(payload: JsonNode) -> JsonNode" ;
AlterarMedicao       = "alterarPercentualItemMedicaoPayload(payload: JsonNode) -> JsonNode" ;
GerarComparacao      = "gerarComparacaoPercentuaisMedicaoPayload(payload: JsonNode) -> JsonNode" ;

(* Operações do Módulo installer_service.nim *)
InstallerMethods = DefaultInstallDir | ArchiveDir | InstallerStatus | ExecuteInstaller ;
DefaultInstallDir  = "defaultInstallAppDir() -> String" ;
ArchiveDir         = "archiveDir() -> String" ;
InstallerStatus    = "installerStatusPayload() -> JsonNode" ;
ExecuteInstaller   = "executeInstallerPayload() -> JsonNode" ;
```

### B. Contratos da API de Integração Externa

```ebnf
(* Contratos de Entrada/Saída da API REST de Colaboradores *)
CollaboratorAPI = Login | GetServices | GetRoutines | AllocateCalendar | RegisterDiary | CompleteDiary | RequestPurchase | AttachReceipt ;

Login            = "POST /api/colaboradores/login -> { token: String, nome: String, perfil: String }" ;
GetServices      = "POST /api/colaboradores/servicos -> JsonNode" ;
GetRoutines      = "POST /api/colaboradores/rotinas -> JsonNode" ;
AllocateCalendar = "POST /api/colaboradores/cronogramas/alocar -> JsonNode" ;
RegisterDiary    = "POST /api/colaboradores/diarios/registrar -> JsonNode" ;
CompleteDiary    = "POST /api/colaboradores/diarios/completar -> JsonNode" ;
RequestPurchase  = "POST /api/colaboradores/compras/solicitar -> JsonNode" ;
AttachReceipt    = "POST /api/colaboradores/compras/anexar-recibo -> JsonNode" ;
```
