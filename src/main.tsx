import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createApi } from "./api";
import { App } from "./App";
import { createMsal, msalAuth, tokenSource } from "./auth";
import { loadConfig } from "./config";
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

void start();
