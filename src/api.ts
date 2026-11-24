// The two services the browser talks to. Each call carries its own service's token; replies are
// checked for shape before they reach the screen, because agent output is untrusted (CLAUDE.md).
import type { TokenSource } from "./auth";
import type { Config } from "./config";
import { readEvents } from "./sse";

export type Refusal = "out_of_scope" | "no_access" | "no_data";
export type Status = "pending" | "approved" | "rejected";
/** What a streamed turn reports before its answer (D-045): a stage starting, or the data agent's reply. */
export type Progress = { step: string } | { lead: string };

export interface ChatReply {
  answer: string;
  refusal: Refusal | null;
  agents: string[];
  citations: string[];
  conversation_id: string;
}

export interface Proposal {
  id: string;
  region: "N" | "C" | "S";
  sku: string;
  product: string;
  tier: "A" | "B" | "C";
  current_price: string;
  new_price: string;
  change_pct: string;
  approver: "manager" | "director";
  clause: string;
  status: Status;
  proposed_by: string;
  proposed_at: string;
}

export interface Api {
  chat(question: string, conversationId?: string, onProgress?: (progress: Progress) => void): Promise<ChatReply>;
  listProposals(status: Status): Promise<Proposal[]>;
  decide(proposal: Proposal, approve: boolean): Promise<Proposal>;
  /** Wakes the copilot's services after sign-in (D-044); resolves on any outcome. */
  warm(): Promise<void>;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly reason: string,
  ) {
    super(`${status} ${reason}`);
  }
}

const ID = /^[0-9a-f]{32}$/;
const MAX_ANSWER = 4000; // the shared contract's cap on an agent's answer
const isText = (value: unknown): value is string => typeof value === "string";
const isTexts = (value: unknown): value is string[] => Array.isArray(value) && value.every(isText);

function isChatReply(value: any): value is ChatReply {
  return (
    isText(value?.answer) &&
    (value.refusal === null || ["out_of_scope", "no_access", "no_data"].includes(value.refusal)) &&
    isTexts(value.agents) &&
    isTexts(value.citations) &&
    isText(value.conversation_id) &&
    ID.test(value.conversation_id)
  );
}

function isProposal(value: any): value is Proposal {
  return (
    isText(value?.id) &&
    ID.test(value.id) &&
    ["N", "C", "S"].includes(value.region) &&
    ["A", "B", "C"].includes(value.tier) &&
    ["manager", "director"].includes(value.approver) &&
    ["pending", "approved", "rejected"].includes(value.status) &&
    [value.sku, value.product, value.current_price, value.new_price, value.change_pct].every(isText) &&
    [value.clause, value.proposed_by, value.proposed_at].every(isText)
  );
}

export function createApi(config: Config, token: TokenSource, fetchFn: typeof fetch = fetch): Api {
  async function call(url: string, scope: string, method: string, body?: unknown): Promise<unknown> {
    const headers: Record<string, string> = { Authorization: `Bearer ${await token(scope)}` };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    let response: Response;
    try {
      response = await fetchFn(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch {
      throw new ApiError(0, "network");
    }
    const payload: any = await response.json().catch(() => null);
    if (!response.ok) throw new ApiError(response.status, isText(payload?.error) ? payload.error : "");
    return payload;
  }

  return {
    async warm() {
      try {
        await call(`${config.orchestratorUrl}/warm`, config.orchestratorScope, "POST");
      } catch {
        // best effort: the first question works either way, only slower
      }
    },
    async chat(question, conversationId, onProgress = () => {}) {
      const body = conversationId ? { question, conversation_id: conversationId } : { question };
      const headers = {
        Authorization: `Bearer ${await token(config.orchestratorScope)}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      };
      let response: Response;
      try {
        response = await fetchFn(`${config.orchestratorUrl}/chat`, { method: "POST", headers, body: JSON.stringify(body) });
      } catch {
        throw new ApiError(0, "network");
      }
      const streamed = response.headers.get("content-type")?.startsWith("text/event-stream") && response.body;
      if (!response.ok || !streamed) {
        // errors before the stream, and an orchestrator that answers JSON
        const payload: any = await response.json().catch(() => null);
        if (!response.ok) throw new ApiError(response.status, isText(payload?.error) ? payload.error : "");
        if (!isChatReply(payload)) throw new ApiError(0, "unexpected reply");
        return payload;
      }
      try {
        for await (const { event, data } of readEvents(response.body!)) {
          const payload: any = JSON.parse(data);
          if (event === "step" && isText(payload?.step)) onProgress({ step: payload.step });
          else if (event === "lead" && isText(payload?.answer) && payload.answer.length <= MAX_ANSWER) {
            onProgress({ lead: payload.answer });
          } else if (event === "error") {
            throw new ApiError(typeof payload?.status === "number" ? payload.status : 0, isText(payload?.error) ? payload.error : "");
          } else if (event === "done") {
            if (!isChatReply(payload)) throw new ApiError(0, "unexpected reply");
            return payload;
          }
        }
      } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(0, "network"); // a read that failed, or an event that wasn't JSON
      }
      throw new ApiError(0, "network"); // the stream ended before its answer
    },
    async listProposals(status) {
      const url = `${config.proposalsUrl}/proposals?status=${status}`;
      const reply: any = await call(url, config.proposalsScope, "GET");
      if (!Array.isArray(reply?.proposals) || !reply.proposals.every(isProposal)) {
        throw new ApiError(0, "unexpected reply");
      }
      return reply.proposals;
    },
    async decide(proposal, approve) {
      const action = approve ? "approve" : "reject";
      const url = `${config.proposalsUrl}/proposals/${proposal.region}/${proposal.id}/${action}`;
      const reply = await call(url, config.proposalsScope, "POST");
      if (!isProposal(reply)) throw new ApiError(0, "unexpected reply");
      return reply;
    },
  };
}
