import { render, waitFor } from "@testing-library/react";
import type { Api } from "./api";
import { App } from "./App";

function fakeApi() {
  const warm = vi.fn(async () => undefined);
  const api = { chat: vi.fn(), listProposals: vi.fn(async () => []), decide: vi.fn(), warm };
  return api as unknown as Api & { warm: typeof warm };
}

const signedIn = { account: { name: "North Pricing Manager" }, signIn: vi.fn(), signOut: vi.fn() };

test("test_the_app_warms_the_copilot_once_after_sign_in", async () => {
  const api = fakeApi();
  const { rerender } = render(<App auth={signedIn} api={api} />);
  rerender(<App auth={signedIn} api={api} />);
  await waitFor(() => expect(api.warm).toHaveBeenCalledTimes(1));
});

test("test_a_signed_out_visitor_wakes_nothing", async () => {
  const api = fakeApi();
  render(<App auth={{ ...signedIn, account: null }} api={api} />);
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(api.warm).not.toHaveBeenCalled();
});
