import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError, type Api, type Proposal } from "./api";
import { PROPOSAL } from "./fixtures";
import { Approvals } from "./Approvals";

const PENDING = PROPOSAL as Proposal;

function fakeApi(lists: Proposal[][], decide: (p: Proposal) => Promise<Proposal>) {
  return {
    chat: vi.fn(),
    listProposals: vi.fn(async () => lists.shift() ?? []),
    decide: vi.fn(decide),
  } as unknown as Api & { listProposals: ReturnType<typeof vi.fn>; decide: ReturnType<typeof vi.fn> };
}

test("test_pending_proposals_are_listed", async () => {
  render(<Approvals api={fakeApi([[PENDING]], async (p) => p)} />);
  expect(await screen.findByText("UHT milk 1 L")).toBeInTheDocument();
  expect(screen.getByText("North")).toBeInTheDocument();
  expect(screen.getByText("7.00 → 7.25 MAD")).toBeInTheDocument();
  expect(screen.getByText("+3.57%")).toBeInTheDocument();
  expect(screen.getByText("Regional pricing manager")).toBeInTheDocument();
});

test("test_proposal_fields_are_shown_as_text", async () => {
  const hostile = { ...PENDING, product: "<img src=x onerror=alert(1)>" };
  const { container } = render(<Approvals api={fakeApi([[hostile]], async (p) => p)} />);
  expect(await screen.findByText(hostile.product)).toBeInTheDocument();
  expect(container.querySelector("img")).toBeNull();
});

test("test_approve_calls_decide_then_reloads", async () => {
  const api = fakeApi([[PENDING], []], async (p) => ({ ...p, status: "approved" }));
  render(<Approvals api={api} />);
  await userEvent.click(await screen.findByRole("button", { name: /^Approve/ }));
  await waitFor(() => expect(api.listProposals).toHaveBeenCalledTimes(2));
  expect(api.decide).toHaveBeenCalledWith(PENDING, true);
  expect(await screen.findByText("No pending proposals.")).toBeInTheDocument();
});

test("test_a_decision_disables_its_buttons_until_it_returns", async () => {
  let finish: (p: Proposal) => void = () => {};
  const api = fakeApi([[PENDING], []], () => new Promise<Proposal>((resolve) => (finish = resolve)));
  render(<Approvals api={api} />);
  await userEvent.click(await screen.findByRole("button", { name: /^Approve/ }));
  expect(screen.getByRole("button", { name: /^Approve/ })).toBeDisabled();
  expect(screen.getByRole("button", { name: /^Reject/ })).toBeDisabled();
  finish({ ...PENDING, status: "approved" });
  await waitFor(() => expect(api.listProposals).toHaveBeenCalledTimes(2));
});

test("test_a_403_is_explained", async () => {
  const api = fakeApi([[PENDING]], async () => {
    throw new ApiError(403, "needs the pricing director");
  });
  render(<Approvals api={api} />);
  await userEvent.click(await screen.findByRole("button", { name: /^Approve/ }));
  expect(await screen.findByText("Only the pricing director can approve this one.")).toBeInTheDocument();
});

test("test_a_409_refreshes_the_list", async () => {
  const api = fakeApi([[PENDING], []], async () => {
    throw new ApiError(409, "already decided");
  });
  render(<Approvals api={api} />);
  await userEvent.click(await screen.findByRole("button", { name: /^Reject/ }));
  expect(
    await screen.findByText("Someone already decided this proposal. The list is up to date now."),
  ).toBeInTheDocument();
  await waitFor(() => expect(api.listProposals).toHaveBeenCalledTimes(2));
});


test("test_a_failed_load_says_so_not_an_empty_list", async () => {
  const api = fakeApi([], async (p) => p);
  api.listProposals.mockRejectedValueOnce(new ApiError(502, ""));
  render(<Approvals api={api} />);
  expect(await screen.findByText("Couldn't load the proposals. Try again in a moment.")).toBeInTheDocument();
  expect(screen.queryByText("No pending proposals.")).toBeNull();
});

test("test_a_refresh_failure_after_approving_keeps_the_outcome", async () => {
  const api = fakeApi([[PENDING]], async (p) => ({ ...p, status: "approved" }));
  render(<Approvals api={api} />);
  await screen.findByText("UHT milk 1 L");
  api.listProposals.mockRejectedValueOnce(new ApiError(502, ""));
  await userEvent.click(screen.getByRole("button", { name: /^Approve/ }));
  expect(await screen.findByText("Approved: UHT milk 1 L (North).")).toBeInTheDocument();
  expect(screen.getByText("Couldn't load the proposals. Try again in a moment.")).toBeInTheDocument();
  expect(screen.queryByText("That didn't go through. Try again in a moment.")).toBeNull();
});

test("test_each_card_names_its_buttons", async () => {
  render(<Approvals api={fakeApi([[PENDING]], async (p) => p)} />);
  expect(await screen.findByRole("button", { name: "Approve UHT milk 1 L (North)" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Reject UHT milk 1 L (North)" })).toBeInTheDocument();
});
