export const topNavigation = [
  { route: "admin-dashboard", label: "Painel", icon: "dashboard" },
  { route: "admin-works", label: "Obras", icon: "works" },
  { route: "admin-purchases", label: "Compras", icon: "purchases" },
  { route: "admin-visits", label: "Visitas", icon: "visits" },
  { route: "admin-rh", label: "RH", icon: "people" },
];

export const routes = [
  ...topNavigation.map((item) => ({ ...item, mode: "admin", parent: item.route })),
  { route: "admin-settings", label: "Configurações", mode: "admin", parent: "admin-settings" },
  { route: "admin-add-work", label: "Adicionar obra", mode: "admin", parent: "admin-works" },
  { route: "admin-work-overview", label: "Visão geral", mode: "admin", parent: "admin-works", workRoute: true },
  { route: "admin-work-access", label: "Acessos do encarregado", mode: "admin", parent: "admin-works", workRoute: true },
  { route: "admin-work-items", label: "Itens de execução", mode: "admin", parent: "admin-works", workRoute: true },
  { route: "admin-work-planning", label: "Cronograma", mode: "admin", parent: "admin-works", workRoute: true },
  { route: "admin-work-calendar", label: "Calendário", mode: "admin", parent: "admin-works", workRoute: true },
  { route: "admin-work-purchases", label: "Compras", mode: "admin", parent: "admin-works", workRoute: true },
  { route: "admin-work-diary", label: "Diário de obras", mode: "admin", parent: "admin-works", workRoute: true },
  { route: "admin-work-measurement", label: "Medição", mode: "admin", parent: "admin-works", workRoute: true },
  { route: "admin-mobile-platform", label: "Plataforma mobile", mode: "admin", parent: "admin-settings" },
  { route: "admin-access", label: "Acessos do encarregado", mode: "admin", parent: "admin-settings" },
  { route: "admin-diagram-library", label: "Modelos de diagramas", mode: "admin", parent: "admin-settings" },
  { route: "admin-help", label: "Manual", mode: "admin", parent: "admin-settings" },
  { route: "admin-data-transfer", label: "Importar e exportar", mode: "admin", parent: "admin-settings" },
  { route: "admin-access-config", label: "Configuração de login", mode: "admin", parent: "admin-settings" },
  { route: "admin-login", label: "Acesso", mode: "admin", parent: "admin-login" },
];

export const subNavigation = {
  "admin-dashboard": [
    { route: "admin-dashboard", label: "Painel executivo" },
  ],
  "admin-works": [
    { route: "admin-works", label: "Mapa e obras" },
    { route: "admin-add-work", label: "Adicionar obra" },
  ],
  "admin-work": [
    { route: "admin-work-overview", label: "Visão geral" },
    { route: "admin-work-access", label: "Acessos do encarregado" },
    { route: "admin-work-items", label: "Itens de execução" },
    { route: "admin-work-planning", label: "Cronograma" },
    { route: "admin-work-calendar", label: "Calendário" },
    { route: "admin-work-purchases", label: "Compras" },
    { route: "admin-work-diary", label: "Diário de obras" },
    { route: "admin-work-measurement", label: "Medição" },
  ],
  "admin-settings": [
    { route: "admin-settings", label: "Central administrativa" },
    { route: "admin-mobile-platform", label: "Plataforma mobile" },
    { route: "admin-access", label: "Acessos de campo" },
    { route: "admin-diagram-library", label: "Modelos de diagramas" },
    { route: "admin-help", label: "Manual" },
    { route: "admin-data-transfer", label: "Importar e exportar" },
    { route: "admin-access-config", label: "Configuração de login" },
  ],
  "admin-purchases": [
    { route: "admin-purchases", label: "Fluxo de compras" },
  ],
  "admin-visits": [
    { route: "admin-visits", label: "Rotas e visitas" },
  ],
  "admin-rh": [
    { route: "admin-rh", label: "Organograma" },
  ],
};

export const mobileRoutes = [
  { route: "mobile-home", label: "Painel", shortLabel: "Painel" },
  { route: "mobile-routine", label: "Rotina", shortLabel: "Rotina" },
  { route: "mobile-day", label: "Cronograma", shortLabel: "Hoje" },
  { route: "mobile-deliveries", label: "Entregas", shortLabel: "Entregas" },
  { route: "mobile-diary", label: "Diário", shortLabel: "Diário" },
];

const bueraremaItems = [
  ["bue-01", "ADMINISTRAÇÃO DA OBRA", 101025.90],
  ["bue-02", "SERVIÇOS PRELIMINARES", 7079.66],
  ["bue-03", "REFORMA DE CAMPO EXISTENTE 107X70m (IMPLANTAÇÃO DE GRAMA SINTÉTICA)", 3067348.92],
  ["bue-04", "IMPLANTAÇÃO DO SISTEMA DE ILUMINAÇÃO EM LED PARA ESTÁDIO DE FUTEBOL 127/220V", 350422.29],
  ["bue-05", "REFORMA DE ALAMBRADO COM MURETA EXISTENTE", 102941.92],
  ["bue-06", "REFORMA DA BILHETERIA EXISTENTE", 31802.05],
  ["bue-07", "REFORMA DE ARQUIBANCADAS EXISTENTES", 135096.48],
  ["bue-08", "REFORMA DOS SANITÁRIOS E VESTIÁRIOS EXISTENTES", 104840.65],
  ["bue-09", "IMPLANTAÇÃO DOS BANCOS DE RESERVAS", 27967.82],
  ["bue-10", "PAVIMENTAÇÃO (PISO INTERTRAVADO)", 190073.57],
  ["bue-11", "INSTALAÇÃO DO TOTEM INSTITUCIONAL EXTERNO — PADRÃO SUDESB", 3314.21],
  ["bue-12", "LIMPEZA GERAL E DESMOBILIZAÇÃO DA OBRA", 7422.04],
].map(([id, description, budget], index) => ({
  id,
  description,
  budget,
  committed: index < 4 ? budget * 0.34 : 0,
  purchased: index < 3 ? budget * 0.25 : 0,
  paid: index < 2 ? budget * 0.17 : 0,
  progress: index === 0 ? 38 : index === 1 ? 65 : index === 2 ? 22 : index === 3 ? 8 : 0,
}));

export const availableWorks = [
  {
    id: "obra-buerarema-estadio",
    name: "REFORMA DO ESTÁDIO MUNICIPAL EM BUERAREMA-BA",
    code: "BUE-EST-REF",
    client: "A confirmar na planilha-fonte",
    address: "Estádio Municipal, Buerarema, Bahia",
    coordinates: { lat: -14.9595, lng: -39.2997 },
    progress: 24,
    budget: 4129335.51,
    paid: 242000,
    status: "Em execução",
    includedAt: "12/05/2026",
    progressHistory: [
      { date: "12/05/2026", progress: 0 },
      { date: "03/06/2026", progress: 8 },
      { date: "29/06/2026", progress: 16 },
      { date: "21/07/2026", progress: 24 },
    ],
    nextMilestone: "Preparação da base para grama sintética",
    source: "Orçamento sintético: itens de primeiro nível, descrição e coluna Total",
    items: bueraremaItems,
  },
  {
    id: "obra-america-quadra",
    name: "Construção de quadra poliesportiva — América Dourada",
    code: "B10-AD-Q01",
    client: "SUDESB",
    address: "América Dourada, Bahia",
    coordinates: { lat: -11.4552, lng: -41.4368 },
    progress: 61,
    budget: 784507.51,
    paid: 329480,
    status: "Em execução",
    includedAt: "18/02/2026",
    progressHistory: [
      { date: "18/02/2026", progress: 0 },
      { date: "17/03/2026", progress: 18 },
      { date: "08/05/2026", progress: 39 },
      { date: "18/07/2026", progress: 61 },
    ],
    nextMilestone: "Concluir movimentação de terra",
    items: [
      { id: "ad-admin", description: "ADMINISTRAÇÃO DA OBRA", budget: 96679.53, committed: 75237.36, purchased: 75237.36, paid: 60200, progress: 72 },
      { id: "ad-quadra", description: "CONSTRUÇÃO DE QUADRA POLIESPORTIVA DESCOBERTA", budget: 412258.57, committed: 213880, purchased: 175400, paid: 142000, progress: 48 },
      { id: "ad-piso", description: "PAVIMENTAÇÃO EM PISO INTERTRAVADO", budget: 130270.59, committed: 0, purchased: 0, paid: 0, progress: 0 },
    ],
  },
  {
    id: "obra-sao-felipe-led",
    name: "Ampliação da iluminação em LED — São Felipe",
    code: "B06-SF-LED",
    client: "SUDESB",
    address: "Estádio Municipal, São Felipe, Bahia",
    coordinates: { lat: -12.8479, lng: -39.0894 },
    progress: 82,
    budget: 271941.77,
    paid: 189400,
    status: "Em execução",
    includedAt: "09/01/2026",
    progressHistory: [
      { date: "09/01/2026", progress: 0 },
      { date: "22/02/2026", progress: 25 },
      { date: "27/04/2026", progress: 56 },
      { date: "20/07/2026", progress: 82 },
    ],
    nextMilestone: "Entrega dos refletores",
    items: [
      { id: "sf-admin", description: "ADMINISTRAÇÃO DA OBRA", budget: 75237.36, committed: 75237.36, purchased: 75237.36, paid: 69000, progress: 90 },
      { id: "sf-led", description: "AMPLIAÇÃO DO SISTEMA DE ILUMINAÇÃO EM LED PARA ESTÁDIO", budget: 182477.16, committed: 175000, purchased: 168500, paid: 110000, progress: 78 },
    ],
  },
];

export const budgetImportPreview = {
  source: "ORÇAMENTO SINTÉTICO BUERAREMA REFORMA.pdf",
  workName: availableWorks[0].name,
  client: availableWorks[0].client,
  total: availableWorks[0].budget,
  columns: ["Item", "Código", "Banco", "Descrição", "Und", "Quant.", "Valor Unit", "Valor Unit com BDI", "Total", "Peso (%)"],
  assumption: "Linhas cujo Item é um número inteiro formam os itens de execução. Subitens decimais permanecem apenas como memória documental, evitando duplicidade de orçamento.",
  items: availableWorks[0].items.map(({ id, description, budget }) => ({ id, description, budget })),
};

export const purchaseFlows = [
  {
    id: "compra-bue-grama",
    workId: "obra-buerarema-estadio",
    itemId: "bue-03",
    title: "Grama sintética e drenagem",
    material: "Grama sintética, manta drenante, areia tratada e borracha",
    quantity: "7.490",
    unit: "m²",
    neededAt: "14/08/2026",
    requester: "Encarregado da obra",
    estimated: 2557368.14,
    supplier: "",
    quoted: 0,
    authorized: false,
    ordered: false,
    paid: 0,
    transport: "Não iniciado",
    delivered: false,
    deliveryEvidence: "",
    status: "Solicitação",
  },
  {
    id: "compra-sf-refletores",
    workId: "obra-sao-felipe-led",
    itemId: "sf-led",
    title: "Refletores LED e acessórios",
    material: "Refletor LED para estádio e componentes de fixação",
    quantity: "24",
    unit: "un",
    neededAt: "30/07/2026",
    requester: "Encarregada Carla",
    estimated: 126000,
    supplier: "Lumen Engenharia",
    quoted: 121480,
    authorized: true,
    ordered: true,
    paid: 60740,
    transport: "Em rota",
    delivered: false,
    deliveryEvidence: "",
    status: "Aguardando entrega",
  },
];

export const visitPlans = [
  { id: "rota-26-julho", name: "Rota Sul — 26 de julho", date: "26/07/2026", workIds: ["obra-buerarema-estadio", "obra-sao-felipe-led"], travelMinutes: 268, visitMinutes: 210, generatedAt: "23/07/2026 15:20" },
];

export const mobileUsers = [
  { id: "acesso-buerarema-encarregado", personId: "rh-person-1", name: "Encarregado da obra", email: "encarregado@macroobras.local", cpf: "123.456.789-09", workId: "obra-buerarema-estadio", status: "Ativo" },
  { id: "acesso-sao-felipe-carla", personId: "rh-person-2", name: "Encarregada Carla", email: "carla@macroobras.local", cpf: "987.654.321-00", workId: "obra-sao-felipe-led", status: "Ativo" },
];

export const items = availableWorks[0].items.map((item) => ({ description: item.description, value: item.budget, level: 1 }));
export const workElements = availableWorks.flatMap((work) => work.items.map((item, index) => ({
  id: `${work.id}-${item.id}`,
  workId: work.id,
  itemId: item.id,
  kind: "Item da obra",
  title: item.description,
  description: `Orçamento alocado: ${Number(item.budget || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
  observations: "",
  fields: [],
  x: 54 + (index % 4) * 315,
  y: 54 + Math.floor(index / 4) * 225,
})));
export const initialCollaboratorStatus = {
  available: false,
  enabled: false,
  running: false,
  ngrokInstalled: false,
  localActive: false,
  localAppUrl: "http://127.0.0.1:7654/?surface=twa",
  publicAppUrl: "",
  localApiUrl: "http://127.0.0.1:7654/api/colaboradores",
  publicApiUrl: "",
  message: "Plataforma mobile iniciada automaticamente com a estação; aguardando a URL pública do ngrok.",
};
export const initialOkfStatus = { configurado: false, pronto: false, repoSsh: "", branch: "main", localDir: "", knowledgeDir: "", envFile: "", sshKey: "", sshKeyExiste: false, mensagem: "Verificando OKF" };
export const initialInstallerStatus = { installDir: "", ftpHost: "", ftpPort: "2121", ftpEndpoint: "", collaboratorEndpoint: "", archiveEndpoint: "", pathReady: false, ftpReady: false, ftpVerified: false, endpointReady: false, archiveReady: false, githubAuthorized: false, githubLogin: "", firstAccess: true, installationCompleted: false, needsAdmin: true, message: "Autorize a máquina com um token GitHub para iniciar.", commands: [] };
