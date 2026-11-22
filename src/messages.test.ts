import { ApiError } from "./api";
import { chatError, startupError } from "./messages";

test("test_only_a_missing_conversation_says_it_ended", () => {
  expect(chatError(new ApiError(404, "conversation not found"))).toBe(
    "That conversation has ended. Your next question starts a new one.",
  );
  expect(chatError(new ApiError(404, ""))).toBe("The copilot couldn't answer right now. Try again in a moment.");
});

test("test_a_403_and_a_401_say_what_to_do", () => {
  expect(chatError(new ApiError(403, "calling app not allowed"))).toBe(
    "Your sign-in doesn't allow this. Ask an administrator.",
  );
  expect(chatError(new ApiError(401, "invalid token (ExpiredSignatureError)"))).toBe(
    "Your sign-in has expired. Sign out and sign in again.",
  );
});

test("test_a_startup_failure_is_explained", () => {
  expect(startupError(new Error("Missing setting VITE_CLIENT_ID"))).toBe(
    "This copy of the copilot is missing a setting (VITE_CLIENT_ID). Ask whoever deployed it.",
  );
  expect(startupError(new Error("user_cancelled"))).toBe("Sign-in didn't complete. Reload the page to try again.");
});
