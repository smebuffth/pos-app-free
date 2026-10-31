import { fail, handle, ok } from "@/lib/http";
import { requireRoleApi } from "@/lib/auth/guards";
import { AiError } from "@/lib/ai/providers";
import { AI_CALLS_PER_HOUR } from "@/lib/ai/constants";

export { handle, fail, ok };

// Owner only: the AI key belongs to the owner. The route handlers share one response shape.
export const requireOwnerApi = () => requireRoleApi("owner");

// Maps the provider error to the envelope. The provider's message and the key are never sent.
export function aiFailure(err: unknown) {
  if (err instanceof AiError) return fail(err.status, err.code, err.message);
  throw err;
}

export const AI_QUOTA = { max: AI_CALLS_PER_HOUR, windowMs: 60 * 60 * 1000 };
