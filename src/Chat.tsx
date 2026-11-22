import { useState, type FormEvent, type KeyboardEvent } from "react";
import { ApiError, type Api, type ChatReply } from "./api";
import { REFUSALS, chatError } from "./messages";

const MAX_QUESTION = 2000;
const AGENT_NAMES: Record<string, string> = {
  "data-agent": "data agent",
  "policy-agent": "policy agent",
  "action-agent": "action agent",
};

type Message =
  | { role: "user"; text: string }
  | { role: "assistant"; reply: ChatReply }
  | { role: "error"; text: string };

export function Chat({ api }: { api: Api }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const question = draft.trim();
    if (!question || busy) return;
    setDraft("");
    setBusy(true);
    setMessages((m) => [...m, { role: "user", text: question }]);
    try {
      const reply = await api.chat(question, conversationId);
      setConversationId(reply.conversation_id);
      setMessages((m) => [...m, { role: "assistant", reply }]);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) setConversationId(undefined);
      setMessages((m) => [...m, { role: "error", text: chatError(error) }]);
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  }

  function startOver() {
    setConversationId(undefined);
    setMessages([]);
  }

  return (
    <section className="chat" aria-label="Chat">
      <ol className="messages" role="log" aria-live="polite">
        {messages.map((message, index) => (
          <li key={index} className={`message ${message.role}`}>
            {message.role === "assistant" ? <Answer reply={message.reply} /> : <p>{message.text}</p>}
          </li>
        ))}
        {busy && (
          <li className="message waiting">
            <p>Thinking… the first question after a quiet spell can take up to a minute.</p>
          </li>
        )}
      </ol>
      <form className="composer" onSubmit={send}>
        <label htmlFor="question" className="visually-hidden">
          Your question
        </label>
        <textarea
          id="question"
          value={draft}
          maxLength={MAX_QUESTION}
          rows={3}
          placeholder="Ask about prices, margins, promotions or policies"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <div className="composer-actions">
          <span className="counter">
            {draft.length} / {MAX_QUESTION}
          </span>
          <button type="button" className="secondary" onClick={startOver}>
            New conversation
          </button>
          <button type="submit" disabled={busy || !draft.trim()}>
            Send
          </button>
        </div>
      </form>
    </section>
  );
}

function Answer({ reply }: { reply: ChatReply }) {
  const agents = reply.agents.map((name) => AGENT_NAMES[name] ?? name);
  return (
    <>
      {reply.refusal && <span className="badge">{REFUSALS[reply.refusal]}</span>}
      <p>{reply.answer}</p>
      {reply.citations.length > 0 && (
        <ul className="citations" aria-label="Citations">
          {reply.citations.map((citation) => (
            <li key={citation}>{citation}</li>
          ))}
        </ul>
      )}
      {agents.length > 0 && <p className="meta">Answered by: {agents.join(", ")}</p>}
    </>
  );
}
