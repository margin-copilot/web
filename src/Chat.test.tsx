import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError, type Api, type ChatReply } from "./api";
import { App } from "./App";
import { Chat } from "./Chat";
import { REPLY } from "./fixtures";

function fakeApi(...replies: Array<ChatReply | ApiError>) {
  const chat = vi.fn(async (_question: string, _conversationId?: string) => {
    const next = replies.shift()!;
    if (next instanceof ApiError) throw next;
    return next;
  });
  return { chat, listProposals: vi.fn(async () => []), decide: vi.fn() } as unknown as Api & {
    chat: typeof chat;
  };
}

async function ask(text: string) {
  await userEvent.type(screen.getByLabelText("Your question"), text);
  await userEvent.click(screen.getByRole("button", { name: "Send" }));
}

test("test_an_answer_is_shown_as_text_never_as_html", async () => {
  const hostile = "<img src=x onerror=alert(1)>";
  const { container } = render(<Chat api={fakeApi({ ...REPLY, answer: hostile })} />);
  await ask("q");
  expect(await screen.findByText(hostile)).toBeInTheDocument();
  expect(container.querySelector("img")).toBeNull();
});

test("test_a_follow_up_sends_the_conversation_id", async () => {
  const api = fakeApi(REPLY, REPLY);
  render(<Chat api={api} />);
  await ask("What was North dairy margin in October 2026?");
  await screen.findAllByText(REPLY.answer);
  await ask("And in September 2026?");
  await waitFor(() => expect(api.chat).toHaveBeenCalledTimes(2));
  expect(api.chat.mock.calls[0][1]).toBeUndefined();
  expect(api.chat.mock.calls[1][1]).toBe(REPLY.conversation_id);
});

test("test_new_conversation_clears_it", async () => {
  const api = fakeApi(REPLY, REPLY);
  render(<Chat api={api} />);
  await ask("q1");
  await screen.findByText(REPLY.answer);
  await userEvent.click(screen.getByRole("button", { name: "New conversation" }));
  expect(screen.queryByText(REPLY.answer)).toBeNull();
  await ask("q2");
  await waitFor(() => expect(api.chat).toHaveBeenCalledTimes(2));
  expect(api.chat.mock.calls[1][1]).toBeUndefined();
});

test("test_a_404_starts_a_new_conversation", async () => {
  const api = fakeApi(REPLY, new ApiError(404, "conversation not found"), REPLY);
  render(<Chat api={api} />);
  await ask("q1");
  await screen.findByText(REPLY.answer);
  await ask("q2");
  expect(
    await screen.findByText("That conversation has ended. Your next question starts a new one."),
  ).toBeInTheDocument();
  await ask("q3");
  await waitFor(() => expect(api.chat).toHaveBeenCalledTimes(3));
  expect(api.chat.mock.calls[2][1]).toBeUndefined();
});

test("test_citations_agents_and_refusal_are_shown", async () => {
  const reply = {
    ...REPLY,
    answer: "No, this is not allowed.",
    agents: ["data-agent", "policy-agent"],
    citations: ["PP-07 §2"],
    refusal: "no_access" as const,
  };
  render(<Chat api={fakeApi(reply)} />);
  await ask("q");
  expect(await screen.findByText("PP-07 §2")).toBeInTheDocument();
  expect(screen.getByText("Answered by: data agent, policy agent")).toBeInTheDocument();
  expect(screen.getByText("Not in your access")).toBeInTheDocument();
});

test("test_signing_out_clears_the_conversation", async () => {
  const auth = { account: { name: "North Manager" }, signIn: vi.fn(), signOut: vi.fn() };
  render(<App auth={auth} api={fakeApi(REPLY)} />);
  await ask("q");
  await screen.findByText(REPLY.answer);
  await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
  expect(auth.signOut).toHaveBeenCalled();
  expect(screen.queryByText(REPLY.answer)).toBeNull();
  expect(screen.getByRole("button", { name: "Sign in with Microsoft" })).toBeInTheDocument();
});


test("test_new_answers_are_announced", () => {
  render(<Chat api={fakeApi()} />);
  const log = screen.getByRole("log");
  expect(log).toHaveAttribute("aria-live", "polite");
});
