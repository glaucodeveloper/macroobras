function rpcOrigin() {
  const current = new URL(window.location.href);
  if (["5173", "4173"].includes(current.port)) return "http://127.0.0.1:7654";
  return current.origin;
}

export async function callRpc(method, args = []) {
  const response = await fetch(`${rpcOrigin()}/rpc/${encodeURIComponent(method)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ args }),
  });
  if (!response.ok) throw new Error(`RPC ${method} respondeu ${response.status}`);
  const payload = await response.json();
  return typeof payload.result === "string" ? JSON.parse(payload.result) : payload.result;
}
