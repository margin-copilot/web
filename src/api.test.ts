import { ApiError, createApi } from "./api";
import type { Config } from "./config";
import { PROPOSAL, REPLY } from "./fixtures";

const CONFIG: Config = {
  tenantId: "t",
  clientId: "c",
  orchestratorUrl: "https://orchestrator.example",
  orchestratorScope: "api://orchestrator/access_as_user",
  proposalsUrl: "https://proposals.example",
  proposalsScope: "api://proposals-api/access_as_user",
};
function fakeFetch(status: number, body: unknown) {
  return vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
    new Response(JSON.stringify(body), { status }),
  );
}

test("test_chat_sends_the_question_and_conversation_with_the_orchestrator_token", async () => {
  const fetchFn = fakeFetch(200, REPLY);
  const token = vi.fn(async (scope: string) => `token for ${scope}`);
  const api = createApi(CONFIG, token, fetchFn);
  expect(await api.chat("And in September?", "c".repeat(32))).toEqual(REPLY);
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe("https://orchestrator.example/chat");
  expect(JSON.parse(init!.body as string)).toEqual({ question: "And in September?", conversation_id: "c".repeat(32) });
  expect((init!.headers as Record<string, string>).Authorization).toBe("Bearer token for api://orchestrator/access_as_user");
});

test("test_each_call_asks_for_its_own_services_scope", async () => {
  const token = vi.fn(async () => "t");
  await createApi(CONFIG, token, fakeFetch(200, REPLY)).chat("q");
  await createApi(CONFIG, token, fakeFetch(200, { proposals: [PROPOSAL] })).listProposals("pending");
  expect(token.mock.calls).toEqual([["api://orchestrator/access_as_user"], ["api://proposals-api/access_as_user"]]);
});

test("test_a_malformed_reply_is_rejected", async () => {
  const api = createApi(CONFIG, async () => "t", fakeFetch(200, { ...REPLY, refusal: "maybe" }));
  await expect(api.chat("q")).rejects.toEqual(new ApiError(0, "unexpected reply"));
});

test("test_decide_posts_to_the_proposals_route", async () => {
  const fetchFn = fakeFetch(200, { ...PROPOSAL, status: "approved" });
  const decided = await createApi(CONFIG, async () => "t", fetchFn).decide(PROPOSAL as never, true);
  expect(decided.status).toBe("approved");
  expect(fetchFn.mock.calls[0][0]).toBe(`https://proposals.example/proposals/N/${"a".repeat(32)}/approve`);
  expect(fetchFn.mock.calls[0][1]!.method).toBe("POST");
});

test("test_errors_carry_the_api_reason", async () => {
  const api = createApi(CONFIG, async () => "t", fakeFetch(403, { error: "needs the pricing director" }));
  await expect(api.decide(PROPOSAL as never, true)).rejects.toEqual(new ApiError(403, "needs the pricing director"));
});

test("test_warm_posts_once_with_the_orchestrator_token_and_never_throws", async () => {
  const fetchFn = fakeFetch(500, { error: "boom" });
  const token = vi.fn(async (scope: string) => `token for ${scope}`);
  await expect(createApi(CONFIG, token, fetchFn).warm()).resolves.toBeUndefined();
  expect(fetchFn).toHaveBeenCalledTimes(1);
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe("https://orchestrator.example/warm");
  expect(init?.method).toBe("POST");
  expect((init?.headers as Record<string, string>).Authorization).toBe(
    "Bearer token for api://orchestrator/access_as_user",
  );
});

test("test_warm_survives_a_network_failure", async () => {
  const fetchFn = vi.fn(async () => {
    throw new TypeError("Failed to fetch");
  });
  const api = createApi(CONFIG, async () => "t", fetchFn as unknown as typeof fetch);
  await expect(api.warm()).resolves.toBeUndefined();
});
