function isStaticPreview() {
  return ["5173", "4173"].includes(window.location.port);
}

function normalizeOrigin(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

function rpcOrigins() {
  const configured = normalizeOrigin(
    window.__MACROOBRAS_RPC_ORIGIN__ || localStorage.getItem("macroobras.rpcOrigin")
  );

  if (!isStaticPreview()) {
    return [configured || window.location.origin];
  }

  return [
    configured,
    "http://127.0.0.1:7654",
    "http://localhost:7654",
  ].filter((value, index, values) => value && values.indexOf(value) === index);
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function fetchRpc(origin, method, args) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${origin}/rpc/${encodeURIComponent(method)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ args }),
      cache: "no-store",
      credentials: "omit",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`RPC ${method} respondeu ${response.status}`);
    const payload = await response.json();
    return typeof payload.result === "string" ? JSON.parse(payload.result) : payload.result;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function callRpc(method, args = []) {
  const failures = [];
  const attempts = isStaticPreview() ? 5 : 1;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    failures.length = 0;
    for (const origin of rpcOrigins()) {
      try {
        const result = await fetchRpc(origin, method, args);
        if (isStaticPreview()) localStorage.setItem("macroobras.rpcOrigin", origin);
        return result;
      } catch (error) {
        failures.push(`${origin}: ${error?.name === "AbortError" ? "tempo esgotado" : error?.message || "falha"}`);
      }
    }
    if (attempt + 1 < attempts) await delay(900);
  }

  if (isStaticPreview()) {
    throw new Error(
      "A página está aberta, mas o processo da estação não iniciou. Feche este servidor e execute `npm run preview` dentro de frontend; esse comando inicia o backend e o preview juntos. " +
      `Tentativas RPC: ${failures.join(" | ")}`
    );
  }

  throw new Error(failures[0] || `Não foi possível executar ${method}.`);
}
