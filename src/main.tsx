import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createApi } from "./api";
import { App } from "./App";
import { createMsal, msalAuth, tokenSource } from "./auth";
import { loadConfig } from "./config";
import { startupError } from "./messages";
import "./styles.css";

async function start() {
  const config = loadConfig();
  const msal = createMsal(config);
  await msal.initialize();
  const result = await msal.handleRedirectPromise();
  const account = result?.account ?? msal.getAllAccounts()[0] ?? null;
  if (account) msal.setActiveAccount(account);
  const api = createApi(config, tokenSource(msal));
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App auth={msalAuth(msal, config.orchestratorScope)} api={api} />
    </StrictMode>,
  );
}

start().catch((error: unknown) => {
  // A cancelled or refused sign-in, or a missing setting: say so instead of a blank page.
  createRoot(document.getElementById("root")!).render(
    <main className="signed-out">
      <h1>Margin Copilot</h1>
      <p role="alert">{startupError(error)}</p>
    </main>,
  );
});
