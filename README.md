# Margin Copilot: web

The copilot in the browser: Microsoft sign-in, a chat with follow-ups, and an approvals screen.

Part of **Margin Copilot**, a secure multi-agent pricing assistant on Azure, built as a personal learning project.

**Start here:** [margin-copilot/docs](https://github.com/margin-copilot/docs) explains how the whole system works, the security model and the decisions behind it.

## What it does

- **Sign-in:** Microsoft (MSAL.js, redirect flow). Tokens are cached for this browser tab only. Each call carries a token for its own service: the orchestrator's for chat, proposals-api's for approvals.
- **Chat:**
  - once after sign-in, posts the orchestrator's `/warm` so the agents and the database wake while you type (D-044); a failure is ignored;
  - posts to the orchestrator's `/chat`;
  - keeps the returned `conversation_id` for follow-ups, and **New conversation** starts over;
  - shows each answer as plain text, with its citations, the agents that answered and any refusal ("Not in your access", "No data recorded", "Outside what I cover").
- **Approvals:**
  - lists pending, approved or rejected proposals from proposals-api, which decides what you may see;
  - pending ones have **Approve** and **Reject**;
  - a refusal is explained in plain words (for example "Only the pricing director can approve this one").
- **Security:**
  - text from the services is never rendered as HTML;
  - the Static Web App sends a strict Content Security Policy (`public/staticwebapp.config.json`);
  - the app has no secret: it's a public client.

## Settings

Build-time, from `.env` (gitignored). The names are in [.env.example](.env.example): tenant, the web app's client ID, and the URL and scope of the orchestrator and of proposals-api. `infra/scripts/web-env.sh` prints them for your account.

## Run and test

```bash
npm ci
npm run dev        # http://localhost:5173, with .env filled in
npm run typecheck
npm test
npm run build      # dist/, deployed by infra/scripts/deploy-web.sh
```

## License

MIT. See [LICENSE](LICENSE).
