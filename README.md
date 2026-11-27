# Margin Copilot: web

The copilot in the browser: Microsoft sign-in, a chat with follow-ups, and an approvals screen.

Part of **Margin Copilot**, a secure multi-agent pricing assistant on Azure, built as a personal learning project.

**Start here:** [margin-copilot/docs](https://github.com/margin-copilot/docs) explains how the whole system works, the security model and the decisions behind it.

## What it does

- **Sign-in:** Microsoft (MSAL.js, redirect flow). Tokens are cached for this browser tab only. Each call carries a token for its own service: the orchestrator's for chat, proposals-api's for approvals.
- **Chat:**
  - once after sign-in, posts the orchestrator's `/warm` so the agents and the database wake while you type (D-044); a failure is ignored;
  - posts to the orchestrator's `/chat` and reads the answer as a stream (D-045): while it runs, the chat shows the current step ("Checking the sales data…") and, in a two-agent turn, the data agent's reply as soon as it's ready; the final answer replaces both. The token stays in the `Authorization` header (`fetch`, not `EventSource`). An orchestrator that answers JSON still works;
  - keeps the returned `conversation_id` for follow-ups, and **New conversation** starts over;
  - shows each answer as plain text, with its citations, the agents that answered and any refusal ("Not in your access", "No data recorded", "Outside what I cover").
- **Approvals:**
  - lists pending, approved or rejected proposals from proposals-api, which decides what you may see;
  - pending ones have **Approve** and **Reject**;
  - a refusal is explained in plain words (for example "Only the pricing director can approve this one").
- **Security:**
  - text from the services is never rendered as HTML;
  - the Static Web App sends a strict Content Security Policy. `staticwebapp.config.template.json` holds it; `npm run build` writes `dist/staticwebapp.config.json` with `connect-src` naming the exact origins of the orchestrator and proposals-api (no wildcard host). The build fails if either URL is missing, is not https, or has a path;
  - the app has no secret: it's a public client.

## Settings

Build-time, from `.env` (gitignored). The names are in [.env.example](.env.example): tenant, the web app's client ID, and the URL and scope of the orchestrator and of proposals-api. `infra/scripts/web-env.sh` prints them for your account.

## Run and test

```bash
npm ci
npm run dev        # http://localhost:5173, with .env filled in
npm run typecheck
npm test
npm run build      # dist/; needs VITE_ORCHESTRATOR_URL and VITE_PROPOSALS_API_URL exported (not only in .env)
```

## Deploy

A push to `main` runs the `build` workflow: test, then deploy. The deploy job signs in to Azure through GitHub OIDC (a federated identity with rights on the Static Web App only), reads the deployment token at run time (masked, never stored), runs `swa deploy`, and checks the live site: status 200 and a CSP with the two exact origins and no wildcard. Repository secrets: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AZURE_RESOURCE_GROUP`, `STATIC_WEB_APP_NAME` and the six `VITE_*` settings. `infra/scripts/deploy-web.sh site` still deploys from a laptop.

## License

MIT. See [LICENSE](LICENSE).
