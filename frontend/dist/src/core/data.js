export const routes = [
  { route: "admin-add-work", label: "Adicionar obra", group: "Obras", mode: "admin" },
  { route: "admin-elements", label: "Elementos de obra", group: "Elementos", mode: "admin" },
  { route: "admin-mobile-access", label: "Acessos do app de medição", group: "Equipe", mode: "admin" },
  { route: "admin-calendar", label: "Cronograma", group: "Planejamento", mode: "admin" },
  { route: "admin-measurement", label: "Medição", group: "Medições", mode: "admin" },
];

export const mobileRoutes = [
  { route: "mobile-home", label: "Painel do mestre", shortLabel: "Painel", group: "Painel", mode: "mobile" },
  { route: "mobile-routine", label: "Criar rotina", shortLabel: "Rotina", group: "Rotinas", mode: "mobile" },
  { route: "mobile-day", label: "Cronograma do dia", shortLabel: "Hoje", group: "Cronograma", mode: "mobile" },
  { route: "mobile-diary", label: "Diário de obra", shortLabel: "Diário", group: "Medições", mode: "mobile" },
];

export const items = [
  { description: "fundação", level: 1 },
  { description: "alvenaria térreo", level: 1 },
  { description: "reboco interno", level: 1 },
  { description: "impermeabilização banheiro", level: 1 },
  { description: "instalação hidráulica", level: 1 },
];

export const availableWorks = [
  { id: "obra-vila-arvores", name: "Residencial Vila das Árvores", code: "OBRA-001" },
];

export const initialCollaboratorStatus = {
  available: false,
  localActive: false,
  localBaseUrl: "",
  baseUrl: "",
  message: "Preparando endpoint de colaboradores",
};

export const initialOkfStatus = {
  configurado: false,
  pronto: false,
  repoSsh: "",
  branch: "main",
  localDir: "",
  knowledgeDir: "",
  envFile: "",
  sshKey: "",
  sshKeyExiste: false,
  mensagem: "Verificando OKF",
};

export const initialInstallerStatus = {
  installDir: "",
  ftpHost: "192.168.0.24",
  ftpPort: "2121",
  collaboratorEndpoint: "",
  archiveEndpoint: "",
  pathReady: false,
  ftpReady: false,
  endpointReady: false,
  archiveReady: false,
  needsAdmin: true,
  message: "Aguardando configuração",
  commands: [],
};

export const workElements = [];

export const mobileUsers = [
  { name: "Mestre Antônio", email: "antonio@macroobras.local", cpf: "123.456.789-09", workId: "obra-vila-arvores" },
  { name: "Encarregada Carla", email: "carla@macroobras.local", cpf: "987.654.321-00", workId: "obra-vila-arvores" },
];
