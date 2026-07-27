function isStaticPreview() {
  return ["5173", "4173"].includes(window.location.port);
}

function rpcOrigin() {
  return window.location.origin;
}

export async function callRpc(method, args = []) {
  if (isStaticPreview()) {
    throw new Error("RPC indisponível no preview estático. Abra a estação em http://127.0.0.1:7654/?surface=admin.");
  }

  const response = await fetch(`${rpcOrigin()}/rpc/${encodeURIComponent(method)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ args }),
  });
  if (!response.ok) throw new Error(`RPC ${method} respondeu ${response.status}`);
  const payload = await response.json();
  return typeof payload.result === "string" ? JSON.parse(payload.result) : payload.result;
}
