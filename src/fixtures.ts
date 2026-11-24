// Example replies shared by the tests.
export const REPLY = {
  answer: "North dairy margin fell from 24.1% to 21.3%.",
  refusal: null,
  agents: ["data-agent"],
  citations: [],
  conversation_id: "c".repeat(32),
};
export const PROPOSAL = {
  id: "a".repeat(32),
  region: "N",
  sku: "DAI-002",
  product: "UHT milk 1 L",
  tier: "B",
  current_price: "7.00",
  new_price: "7.25",
  change_pct: "3.57",
  approver: "manager",
  clause: "PP-04 §3.2",
  status: "pending",
  proposed_by: "oid",
  proposed_at: "2026-11-22T09:00:00Z",
};

/** A response body that yields these chunks, as the network might split them. */
export function streamOf(...chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}
