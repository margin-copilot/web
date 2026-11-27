import { loadConfig } from "./config";

const ENV = {
  VITE_TENANT_ID: "11111111-1111-1111-1111-111111111111",
  VITE_CLIENT_ID: "web-client-id",
  VITE_ORCHESTRATOR_URL: "https://orchestrator.example/",
  VITE_ORCHESTRATOR_SCOPE: "api://orchestrator/access_as_user",
  VITE_PROPOSALS_API_URL: "https://proposals.example",
  VITE_PROPOSALS_SCOPE: "api://proposals-api/access_as_user",
};

test("test_a_missing_setting_is_named", () => {
  const { VITE_PROPOSALS_SCOPE: _, ...missing } = ENV;
  expect(() => loadConfig(missing)).toThrow("Missing setting VITE_PROPOSALS_SCOPE");
});

test("test_urls_lose_their_trailing_slash", () => {
  expect(loadConfig(ENV).orchestratorUrl).toBe("https://orchestrator.example");
});

import { writeConfig } from "../scripts/config-lib.mjs";

const TEMPLATE = "connect-src 'self' https://login.microsoftonline.com __API_ORIGINS__;";

test("test_writeConfig_puts_both_origins_in_connect_src", () => {
  const out = writeConfig(TEMPLATE, ["https://a.example/", "https://b.example"]);
  expect(out).toBe("connect-src 'self' https://login.microsoftonline.com https://a.example https://b.example;");
});

test("test_writeConfig_rejects_http", () => {
  expect(() => writeConfig(TEMPLATE, ["http://x"])).toThrow();
});

test("test_writeConfig_rejects_a_path_query_or_fragment", () => {
  for (const u of ["https://x/path", "https://x/?q=1", "https://x/#f"])
    expect(() => writeConfig(TEMPLATE, [u])).toThrow();
});

test("test_writeConfig_has_no_wildcard_origin", () => {
  expect(writeConfig(TEMPLATE, ["https://a.example"])).not.toContain("*");
});
