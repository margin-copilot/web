import { CacheLookupPolicy, InteractionRequiredAuthError } from "@azure/msal-browser";
import { tokenSource } from "./auth";

type Request = { scopes: string[] };

function fakeMsal(silent: (request: Request) => Promise<{ accessToken: string }>) {
  return {
    getActiveAccount: () => ({ homeAccountId: "h", username: "north.mgr@x.example" }),
    acquireTokenSilent: vi.fn(silent),
    acquireTokenRedirect: vi.fn(async (_request: Request) => undefined),
  };
}

test("test_tokens_are_requested_silently_for_one_scope", async () => {
  const msal = fakeMsal(async () => ({ accessToken: "t" }));
  expect(await tokenSource(msal as never)("api://orchestrator/access_as_user")).toBe("t");
  expect(msal.acquireTokenSilent.mock.calls[0]?.[0].scopes).toEqual(["api://orchestrator/access_as_user"]);
  expect(msal.acquireTokenRedirect).not.toHaveBeenCalled();
});

test("test_an_interaction_required_error_redirects_to_sign_in", async () => {
  const msal = fakeMsal(async () => {
    throw new InteractionRequiredAuthError("interaction_required", "sign in again");
  });
  await expect(tokenSource(msal as never)("api://proposals-api/access_as_user")).rejects.toThrow();
  expect(msal.acquireTokenRedirect.mock.calls[0]?.[0].scopes).toEqual(["api://proposals-api/access_as_user"]);
});


test("test_silent_renewal_never_uses_a_hidden_frame", async () => {
  const msal = fakeMsal(async () => ({ accessToken: "t" }));
  await tokenSource(msal as never)("api://orchestrator/access_as_user");
  const request = msal.acquireTokenSilent.mock.calls[0]?.[0] as { cacheLookupPolicy?: number };
  expect(request.cacheLookupPolicy).toBe(CacheLookupPolicy.AccessTokenAndRefreshToken);
});
