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
