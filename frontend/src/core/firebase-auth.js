const SDK_VERSION = "12.16.0";
let modulesPromise;

function firebaseConfig() {
  const raw = localStorage.getItem("macroobras.firebaseConfig") || "";
  if (!raw.trim()) throw new Error("Configure o projeto Firebase em Administração > Configuração de login.");
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("A configuração Firebase não contém um JSON válido.");
  }
}

async function modules() {
  if (!modulesPromise) {
    modulesPromise = Promise.all([
      Function("moduleUrl", "return import(moduleUrl);")(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`),
      Function("moduleUrl", "return import(moduleUrl);")(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth.js`),
    ]).then(([app, auth]) => ({ ...app, ...auth }));
  }
  return modulesPromise;
}

export async function signInWithFirebase(providerName = "google") {
  const sdk = await modules();
  const config = firebaseConfig();
  const app = sdk.getApps().length ? sdk.getApps()[0] : sdk.initializeApp(config);
  const auth = sdk.getAuth(app);
  if (providerName !== "google") throw new Error("A autenticação externa disponível é o Google.");
  const provider = new sdk.GoogleAuthProvider();
  const result = await sdk.signInWithPopup(auth, provider);
  const token = await result.user.getIdToken();
  return {
    uid: result.user.uid,
    name: result.user.displayName || result.user.email || "Administrador",
    email: result.user.email || "",
    provider: "google",
    providerId: "google.com",
    phone: result.user.phoneNumber || "",
    token,
  };
}

export async function signOutFirebase() {
  try {
    const sdk = await modules();
    if (!sdk.getApps().length) return;
    await sdk.signOut(sdk.getAuth(sdk.getApps()[0]));
  } catch {
    // A sessão local também será encerrada quando o SDK não estiver configurado.
  }
}
