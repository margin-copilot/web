// Build-time settings (Vite's VITE_* variables). Values come from a gitignored .env written by
// infra/scripts/web-env.sh; the names are in .env.example (D-026).
export interface Config {
  tenantId: string;
  clientId: string;
  orchestratorUrl: string;
  orchestratorScope: string;
  proposalsUrl: string;
  proposalsScope: string;
}

const NAMES = {
  tenantId: "VITE_TENANT_ID",
  clientId: "VITE_CLIENT_ID",
  orchestratorUrl: "VITE_ORCHESTRATOR_URL",
  orchestratorScope: "VITE_ORCHESTRATOR_SCOPE",
  proposalsUrl: "VITE_PROPOSALS_API_URL",
  proposalsScope: "VITE_PROPOSALS_SCOPE",
} as const;

export function loadConfig(env: Record<string, string | undefined> = import.meta.env): Config {
  const values = {} as Record<keyof Config, string>;
  for (const [key, name] of Object.entries(NAMES) as [keyof Config, string][]) {
    const value = env[name]?.trim();
    if (!value) throw new Error(`Missing setting ${name}`);
    values[key] = key.endsWith("Url") ? value.replace(/\/+$/, "") : value;
  }
  return values;
}
