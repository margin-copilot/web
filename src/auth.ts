// Microsoft sign-in with MSAL.js (D-042): redirect flow, tokens cached for this tab only, and one
// access token per service, asked for by its own scope.
import {
  CacheLookupPolicy,
  InteractionRequiredAuthError,
  PublicClientApplication,
  type AccountInfo,
  type IPublicClientApplication,
} from "@azure/msal-browser";
import type { Config } from "./config";

export type TokenSource = (scope: string) => Promise<string>;

export interface AuthPort {
  account: { name: string } | null;
  signIn(): void;
  signOut(): void;
}

export function createMsal(config: Config): PublicClientApplication {
  return new PublicClientApplication({
    auth: {
      clientId: config.clientId,
      authority: `https://login.microsoftonline.com/${config.tenantId}`,
      redirectUri: window.location.origin,
    },
    cache: { cacheLocation: "sessionStorage" },
  });
}

type TokenClient = Pick<
  IPublicClientApplication,
  "getActiveAccount" | "acquireTokenSilent" | "acquireTokenRedirect"
>;

export function tokenSource(msal: TokenClient): TokenSource {
  return async (scope) => {
    const account = msal.getActiveAccount();
    if (!account) {
      await msal.acquireTokenRedirect({ scopes: [scope] });
      throw new Error("sign-in required");
    }
    try {
      // Cache and refresh token only: a hidden-frame renewal would fail under the CSP and time out
      // instead of asking the user to sign in again.
      const request = { scopes: [scope], account, cacheLookupPolicy: CacheLookupPolicy.AccessTokenAndRefreshToken };
      return (await msal.acquireTokenSilent(request)).accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        await msal.acquireTokenRedirect({ scopes: [scope], account });
      }
      throw error;
    }
  };
}

export function msalAuth(msal: IPublicClientApplication, scope: string): AuthPort {
  const account: AccountInfo | null = msal.getActiveAccount();
  return {
    account: account ? { name: account.name || account.username } : null,
    signIn: () => void msal.loginRedirect({ scopes: [scope] }),
    signOut: () => void msal.logoutRedirect({ account: account ?? undefined }),
  };
}
