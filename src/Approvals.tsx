import { useCallback, useEffect, useState } from "react";
import { ApiError, type Api, type Proposal, type Status } from "./api";
import { REGION_NAMES, decisionError } from "./messages";

const APPROVERS = { manager: "Regional pricing manager", director: "Pricing director" } as const;
const STATUSES: Status[] = ["pending", "approved", "rejected"];
const LABELS = { pending: "Pending", approved: "Approved", rejected: "Rejected" } as const;

export function Approvals({ api }: { api: Api }) {
  const [status, setStatus] = useState<Status>("pending");
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [deciding, setDeciding] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setProposals(await api.listProposals(status));
    } catch (error) {
      setProposals([]);
      setNotice(decisionError(error));
    }
  }, [api, status]);

  useEffect(() => {
    setNotice(null);
    void load();
  }, [load]);

  async function decide(proposal: Proposal, approve: boolean) {
    setDeciding(proposal.id);
    setNotice(null);
    try {
      await api.decide(proposal, approve);
      await load();
    } catch (error) {
      setNotice(decisionError(error));
      if (error instanceof ApiError && error.status === 409) await load();
    } finally {
      setDeciding(null);
    }
  }

  return (
    <section className="approvals" aria-label="Approvals">
      <div className="toolbar">
        <label htmlFor="status">Show</label>
        <select id="status" value={status} onChange={(event) => setStatus(event.target.value as Status)}>
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {LABELS[value]}
            </option>
          ))}
        </select>
      </div>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {proposals === null ? (
        <p className="meta">Loading…</p>
      ) : proposals.length === 0 ? (
        <p className="meta">No {LABELS[status].toLowerCase()} proposals.</p>
      ) : (
        <ul className="proposals">
          {proposals.map((p) => (
            <li key={p.id} className="proposal">
              <div className="proposal-head">
                <strong>{p.product}</strong>
                <span>{REGION_NAMES[p.region]}</span>
              </div>
              <dl>
                <dt>Price</dt>
                <dd>{`${p.current_price} → ${p.new_price} MAD`}</dd>
                <dt>Change</dt>
                <dd>{`${Number(p.change_pct) > 0 ? "+" : ""}${p.change_pct}%`}</dd>
                <dt>Who can approve</dt>
                <dd>{APPROVERS[p.approver]}</dd>
                <dt>Rule</dt>
                <dd>{p.clause}</dd>
                <dt>Proposed</dt>
                <dd>{new Date(p.proposed_at).toLocaleString()}</dd>
              </dl>
              {p.status === "pending" && (
                <div className="proposal-actions">
                  <button type="button" disabled={deciding === p.id} onClick={() => void decide(p, true)}>
                    Approve
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    disabled={deciding === p.id}
                    onClick={() => void decide(p, false)}
                  >
                    Reject
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
