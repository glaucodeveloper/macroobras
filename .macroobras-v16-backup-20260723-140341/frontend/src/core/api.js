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

async function fetchRpc(origin, method, args) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${origin}/rpc/${encodeURIComponent(method)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ args }),
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
  for (const origin of rpcOrigins()) {
    try {
      const result = await fetchRpc(origin, method, args);
      if (isStaticPreview()) localStorage.setItem("macroobras.rpcOrigin", origin);
      return result;
    } catch (error) {
      failures.push(`${origin}: ${error?.name === "AbortError" ? "tempo esgotado" : error?.message || "falha"}`);
    }
  }

  if (isStaticPreview()) {
    throw new Error(
      "O backend da estação não está acessível. Execute ./scripts/iniciar_macroobras_mobile.sh e mantenha a estação aberta. " +
      `Tentativas: ${failures.join(" | ")}`
    );
  }

  throw new Error(failures[0] || `Não foi possível executar ${method}.`);
}
