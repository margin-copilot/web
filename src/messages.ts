// Everything a person reads when something goes wrong, in one place.
import { ApiError } from "./api";

export const REGION_NAMES = { N: "North", C: "Center", S: "South" } as const;
export const REFUSALS = {
  out_of_scope: "Outside what I cover",
  no_access: "Not in your access",
  no_data: "No data recorded",
} as const;
export const CONVERSATION_ENDED = "That conversation has ended. Your next question starts a new one.";

export function chatError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return CONVERSATION_ENDED;
    if (error.status === 401) return "Your sign-in has expired. Sign in again.";
    if (error.status === 0 && error.reason === "network") {
      return "Couldn't reach the copilot. Check your connection and try again.";
    }
  }
  return "The copilot couldn't answer right now. Try again in a moment.";
}

export function decisionError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.reason === "needs the pricing director") return "Only the pricing director can approve this one.";
    if (error.reason === "region not allowed") return "This proposal is for another region.";
    if (error.reason === "no pricing role in your token") return "Your sign-in doesn't show a pricing role.";
    if (error.status === 409) return "Someone already decided this proposal. The list is up to date now.";
    if (error.status === 401) return "Your sign-in has expired. Sign in again.";
  }
  return "That didn't go through. Try again in a moment.";
}
