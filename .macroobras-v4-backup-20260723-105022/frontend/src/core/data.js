export const routes = [
  { route: "admin-dashboard", label: "Visão geral", group: "Dashboard", mode: "admin", icon: "▦" },
  { route: "admin-works", label: "Obras cadastradas", group: "Obras", mode: "admin", icon: "▤" },
  { route: "admin-add-work", label: "Adicionar obra", group: "Obras", mode: "admin", icon: "+" },
  { route: "admin-work", label: "Página da obra", group: "Obras", mode: "admin", icon: "⌂" },
  { route: "admin-purchases", label: "Fluxos por stickers", group: "Compras", mode: "admin", icon: "⇢" },
  { route: "admin-visits", label: "Rotas de visitas", group: "Visitas", mode: "admin", icon: "⌖" },
  { route: "admin-finance", label: "Orçamento e pagamentos", group: "Financeiro", mode: "admin", icon: "R$" },
  { route: "admin-rh", label: "Equipes e funções", group: "RH", mode: "admin", icon: "◇" },
  { route: "admin-mobile-access", label: "Acessos de campo", group: "Administração", mode: "admin", icon: "◎" },
  { route: "admin-elements", label: "Editor de diagramas", group: "Administração", mode: "admin", icon: "↗" },
  { route: "admin-calendar", label: "Calendário da obra", group: "Administração", mode: "admin", icon: "□" },
  { route: "admin-measurement", label: "Medição", group: "Administração", mode: "admin", icon: "%" },
];

export const primaryAdminRoutes = [
  "admin-dashboard",
  "admin-works",
  "admin-purchases",
  "admin-visits",
  "admin-finance",
  "admin-rh",
];

export const mobileRoutes = [
  { route: "mobile-home", label: "Painel do encarregado", shortLabel: "Painel", group: "Painel", mode: "mobile" },
  { route: "mobile-routine", label: "Criar rotina", shortLabel: "Rotina", group: "Rotinas", mode: "mobile" },
  { route: "mobile-day", label: "Cronograma do dia", shortLabel: "Hoje", group: "Cronograma", mode: "mobile" },
  { route: "mobile-deliveries", label: "Entregas de compras", shortLabel: "Entregas", group: "Compras", mode: "mobile" },
  { route: "mobile-diary", label: "Diário de obra", shortLabel: "Diário", group: "Medições", mode: "mobile" },
];

export const availableWorks = [
  {
    id: "obra-america-quadra",
    name: "Construção de quadra poliesportiva — América Dourada",
    code: "B10-AD-Q01",
    client: "Superintendência dos Desportos da Bahia",
    address: "América Dourada, Bahia",
    coordinates: { lat: -11.4552, lng: -41.4368 },
    progress: 61,
    budget: 784507.51,
    paid: 329480.0,
    status: "Em execução",
    nextMilestone: "Concluir movimentação de terra",
    items: [
      { id: "ad-admin", description: "Administração de obra", budget: 96679.53, committed: 75237.36, purchased: 75237.36, paid: 60200, progress: 72 },
      { id: "ad-prelim", description: "Serviços preliminares", budget: 50069.61, committed: 44000, purchased: 40800, paid: 40800, progress: 88 },
      { id: "ad-terra", description: "Movimentação de terra", budget: 20255.66, committed: 15200, purchased: 11900, paid: 7600, progress: 55 },
      { id: "ad-quadra", description: "Construção de quadra poliesportiva descoberta (31x18m)", budget: 412258.57, committed: 213880, purchased: 175400, paid: 142000, progress: 48 },
      { id: "ad-iluminacao", description: "Sistema de iluminação em LED para quadra poliesportiva", budget: 44614.3, committed: 18000, purchased: 0, paid: 0, progress: 12 },
      { id: "ad-piso", description: "Pavimentação em piso intertravado", budget: 130270.59, committed: 0, purchased: 0, paid: 0, progress: 0 },
      { id: "ad-paisagismo", description: "Paisagismo e mobiliário urbano", budget: 3702.98, committed: 0, purchased: 0, paid: 0, progress: 0 },
      { id: "ad-totem", description: "Instalação do totem institucional", budget: 4124.63, committed: 0, purchased: 0, paid: 0, progress: 0 },
      { id: "ad-limpeza", description: "Limpeza final", budget: 2171.67, committed: 0, purchased: 0, paid: 0, progress: 0 },
    ],
  },
  {
    id: "obra-sao-felipe-led",
    name: "Ampliação da iluminação em LED — São Felipe",
    code: "B06-SF-LED",
    client: "Superintendência dos Desportos da Bahia",
    address: "Estádio Municipal, São Felipe, Bahia",
    coordinates: { lat: -12.8479, lng: -39.0894 },
    progress: 82,
    budget: 271941.77,
    paid: 189400,
    status: "Em execução",
    nextMilestone: "Entrega dos refletores",
    items: [
      { id: "sf-admin", description: "Administração da obra", budget: 75237.36, committed: 75237.36, purchased: 75237.36, paid: 69000, progress: 90 },
      { id: "sf-prelim", description: "Serviços preliminares", budget: 8307.46, committed: 8307.46, purchased: 8307.46, paid: 8307.46, progress: 100 },
      { id: "sf-led", description: "Ampliação do sistema de iluminação em LED para estádio de futebol", budget: 182477.16, committed: 175000, purchased: 168500, paid: 110000, progress: 78 },
      { id: "sf-totem", description: "Instalação do totem institucional externo", budget: 4279.79, committed: 0, purchased: 0, paid: 0, progress: 0 },
      { id: "sf-limpeza", description: "Limpeza geral", budget: 1640, committed: 0, purchased: 0, paid: 0, progress: 0 },
    ],
  },
  {
    id: "obra-jeremoabo-led",
    name: "Implantação da iluminação em LED — Jeremoabo",
    code: "B06-JER-LED",
    client: "Superintendência dos Desportos da Bahia",
    address: "Estádio Municipal, Jeremoabo, Bahia",
    coordinates: { lat: -10.0685, lng: -38.3471 },
    progress: 34,
    budget: 536998.01,
    paid: 109880,
    status: "Em mobilização",
    nextMilestone: "Autorizar padrão de entrada",
    items: [
      { id: "jer-admin", description: "Administração da obra", budget: 75237.36, committed: 75237.36, purchased: 75237.36, paid: 39200, progress: 35 },
      { id: "jer-prelim", description: "Serviços preliminares", budget: 8307.46, committed: 8307.46, purchased: 8307.46, paid: 8307.46, progress: 100 },
      { id: "jer-led", description: "Implantação do sistema de iluminação em LED para estádio", budget: 447533.4, committed: 160000, purchased: 92000, paid: 62372.54, progress: 24 },
      { id: "jer-totem", description: "Instalação do totem institucional externo", budget: 4279.79, committed: 0, purchased: 0, paid: 0, progress: 0 },
      { id: "jer-limpeza", description: "Limpeza geral", budget: 1640, committed: 0, purchased: 0, paid: 0, progress: 0 },
    ],
  },
];

export const items = availableWorks[0].items.map((item) => ({
  description: item.description,
  value: item.budget,
  level: 1,
}));

export const budgetImportPreview = {
  source: "CONSTRUÇÃO DE QUADRA POLIESPOR - Orçamento Resumido.xlsx",
  workName: "Construção de quadra poliesportiva — América Dourada",
  client: "Superintendência dos Desportos da Bahia",
  total: 784507.51,
  items: availableWorks[0].items.map(({ id, description, budget }) => ({ id, description, budget })),
};

export const purchaseFlows = [
  {
    id: "compra-sf-refletores",
    workId: "obra-sao-felipe-led",
    itemId: "sf-led",
    title: "Refletores LED e acessórios",
    material: "Refletor LED para estádio e componentes de fixação",
    quantity: "24 unidades",
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
  {
    id: "compra-ad-concreto",
    workId: "obra-america-quadra",
    itemId: "ad-quadra",
    title: "Concreto, aço e formas",
    material: "Insumos estruturais da quadra",
    quantity: "1 lote",
    unit: "lote",
    neededAt: "26/07/2026",
    requester: "Mestre Antônio",
    estimated: 178000,
    supplier: "Conquista Materiais",
    quoted: 175400,
    authorized: true,
    ordered: true,
    paid: 142000,
    transport: "Entregue",
    delivered: true,
    deliveryEvidence: "entrega-estrutura-2026-07-19.jpg",
    status: "Entregue com foto",
  },
  {
    id: "compra-jer-padrao",
    workId: "obra-jeremoabo-led",
    itemId: "jer-led",
    title: "Padrão de entrada elétrica",
    material: "Quadro, cabos, eletrodutos e disjuntores",
    quantity: "1 conjunto",
    unit: "conjunto",
    neededAt: "12/08/2026",
    requester: "Encarregado Paulo",
    estimated: 39500,
    supplier: "",
    quoted: 0,
    authorized: false,
    ordered: false,
    paid: 0,
    transport: "Não iniciado",
    delivered: false,
    deliveryEvidence: "",
    status: "Cotação",
  },
];

export const visitPlans = [
  {
    id: "rota-26-julho",
    name: "Rota Nordeste — 26 de julho",
    date: "26/07/2026",
    workIds: ["obra-jeremoabo-led", "obra-sao-felipe-led"],
    travelMinutes: 355,
    visitMinutes: 180,
    generatedAt: "23/07/2026 14:40",
  },
  {
    id: "rota-29-julho",
    name: "Rota Centro-Norte — 29 de julho",
    date: "29/07/2026",
    workIds: ["obra-america-quadra", "obra-jeremoabo-led"],
    travelMinutes: 292,
    visitMinutes: 210,
    generatedAt: "23/07/2026 14:52",
  },
];

export const teamEntities = [
  { id: "admin", name: "Administração", role: "Autoriza compras e define planejamento", x: 46, y: 12, tone: "blue" },
  { id: "engenharia", name: "Engenharia", role: "Responsabilidade técnica", x: 18, y: 39, tone: "cyan" },
  { id: "compras", name: "Compras", role: "Cotação, pedido e pagamento", x: 72, y: 39, tone: "purple" },
  { id: "encarregados", name: "Encarregados", role: "Execução e comprovação em campo", x: 20, y: 70, tone: "green" },
  { id: "equipes", name: "Equipes de execução", role: "Serviços dos itens da obra", x: 51, y: 76, tone: "orange" },
  { id: "fornecedores", name: "Fornecedores", role: "Materiais, serviços e transporte", x: 78, y: 70, tone: "gray" },
];

export const mobileUsers = [
  { name: "Mestre Antônio", email: "antonio@macroobras.local", cpf: "123.456.789-09", workId: "obra-america-quadra" },
  { name: "Encarregada Carla", email: "carla@macroobras.local", cpf: "987.654.321-00", workId: "obra-sao-felipe-led" },
  { name: "Encarregado Paulo", email: "paulo@macroobras.local", cpf: "741.852.963-10", workId: "obra-jeremoabo-led" },
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
