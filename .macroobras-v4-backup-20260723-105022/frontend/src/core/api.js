export async function callRpc(method, args = []) {
  const response = await fetch(`http://127.0.0.1:7654/rpc/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ args }),
  });
  const payload = await response.json();
  return typeof payload.result === "string" ? JSON.parse(payload.result) : payload.result;
}
