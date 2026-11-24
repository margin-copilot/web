import { useEffect, useRef, useState } from "react";
import type { Api } from "./api";
import { Approvals } from "./Approvals";
import type { AuthPort } from "./auth";
import { Chat } from "./Chat";

type Tab = "chat" | "approvals";

export function App({ auth, api }: { auth: AuthPort; api: Api }) {
  const [account, setAccount] = useState(auth.account);
  const [tab, setTab] = useState<Tab>("chat");
  const warmed = useRef(false);

  // Wake the agents and the database while the user reads the screen (D-044).
  useEffect(() => {
    if (account && !warmed.current) {
      warmed.current = true;
      void api.warm();
    }
  }, [account, api]);

  if (!account) {
    return (
      <main className="signed-out">
        <h1>Margin Copilot</h1>
        <p>Pricing, margins, promotions and policies for Riad Market, answered with your own access.</p>
        <button type="button" onClick={() => auth.signIn()}>
          Sign in with Microsoft
        </button>
      </main>
    );
  }

  function signOut() {
    setAccount(null); // drop every screen's state before the redirect
    auth.signOut();
  }

  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">Margin Copilot</span>
        <nav aria-label="Screens">
          <button type="button" aria-pressed={tab === "chat"} onClick={() => setTab("chat")}>
            Chat
          </button>
          <button type="button" aria-pressed={tab === "approvals"} onClick={() => setTab("approvals")}>
            Approvals
          </button>
        </nav>
        <span className="who">{account.name}</span>
        <button type="button" className="secondary" onClick={signOut}>
          Sign out
        </button>
      </header>
      <main>{tab === "chat" ? <Chat api={api} /> : <Approvals api={api} />}</main>
    </div>
  );
}
