// The providers the owner can choose. Models other than Claude are read from the provider's own list endpoint.
export const PROVIDERS = ["anthropic", "openai", "gemini", "openrouter", "custom"] as const;
export type Provider = (typeof PROVIDERS)[number];

export const PROVIDER_LABEL: Record<Provider, string> = {
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI",
  gemini: "Google Gemini",
  openrouter: "OpenRouter",
  custom: "กำหนดเอง (URL ของคุณ)",
};

// The Claude allowlist: the only models the Claude API is called with.
export const CLAUDE_MODELS = ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5", "claude-fable-5-1"] as const;

export const AI_CALLS_PER_HOUR = 20;
export const AI_QUESTION_MAX = 2000;
