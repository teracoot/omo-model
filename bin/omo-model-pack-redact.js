const REDACTED_SECRET = "<redacted-secret>";
const REDACTED_URL = "<redacted-url>";

const KNOWN_KEYS = new Set([
  "agent", "agents", "attachment", "autoupdate", "background_task", "baseURL", "budgetTokens", "categories",
  "command", "compaction", "context", "default_agent", "disabled_providers", "enabled", "enabled_providers",
  "experimental", "formatter", "headers", "id", "input", "limit", "logLevel", "mcp", "model",
  "modelConcurrency", "models", "modalities", "name", "npm", "options", "output", "permission", "plugin",
  "provider", "providerConcurrency", "reasoning", "reasoningEffort", "reasoning_effort", "references", "share",
  "shell", "skills", "small_model", "snapshot", "store", "thinking", "tool_output", "type", "username",
  "variant", "variants", "whitelist",
]);
const MODALITIES = new Set(["audio", "image", "pdf", "text", "video"]);
const REASONING_EFFORTS = new Set(["low", "medium", "high", "xhigh", "max"]);

export function sanitizeConfig(value) {
  return sanitizeValue(value, { kind: "root" });
}

function sanitizeValue(value, context) {
  if (Array.isArray(value)) return value.map((entry) => sanitizeValue(entry, arrayContext(context)));
  if (isRecord(value)) return sanitizeRecord(value, context);
  if (typeof value !== "string") return context.kind === "redacted" && value !== null ? REDACTED_SECRET : value;
  return sanitizeString(value, context);
}

function sanitizeRecord(value, context) {
  const result = {};
  let redactedKey = 0;
  for (const [key, entry] of Object.entries(value)) {
    const child = childContext(context, key);
    const safeKey = safeObjectKey(key, context, child, ++redactedKey);
    result[safeKey] = sanitizeValue(entry, child);
  }
  return result;
}

function sanitizeString(value, context) {
  if (isHttpSchemePrefixed(value)) return REDACTED_URL;
  if (context.kind === "route" && isRoute(value)) return value;
  if (context.kind === "identifier" && isIdentifier(value)) return value;
  if (context.kind === "reasoning-effort" && REASONING_EFFORTS.has(value)) return value;
  if (context.kind === "modality" && MODALITIES.has(value)) return value;
  return REDACTED_SECRET;
}

function childContext(context, key) {
  if (context.kind === "root") return rootContext(key);
  if (["provider-map", "models-map", "agents-map", "categories-map", "variants-map", "provider-concurrency-map", "model-concurrency-map"].includes(context.kind)) return recordContext(context.kind);
  if (context.kind === "background-task") return backgroundTaskContext(key);
  if (context.kind === "provider-record") return providerContext(key);
  if (context.kind === "model-record") return modelContext(key);
  if (context.kind === "agent-record") return agentContext(key);
  if (context.kind === "variant-record") return variantContext(key);
  return { kind: "redacted" };
}

function rootContext(key) {
  if (key === "provider") return { kind: "provider-map" };
  if (["agent", "agents"].includes(key)) return { kind: "agents-map" };
  if (key === "categories") return { kind: "categories-map" };
  if (["model", "small_model"].includes(key)) return { kind: "route" };
  if (key === "background_task") return { kind: "background-task" };
  return { kind: "redacted" };
}

function providerContext(key) {
  if (key === "models") return { kind: "models-map" };
  return { kind: "redacted" };
}

function backgroundTaskContext(key) {
  if (key === "providerConcurrency") return { kind: "provider-concurrency-map" };
  if (key === "modelConcurrency") return { kind: "model-concurrency-map" };
  return { kind: "redacted" };
}

function modelContext(key) {
  if (key === "id") return { kind: "identifier" };
  if (key === "variants") return { kind: "variants-map" };
  if (key === "modalities") return { kind: "modalities" };
  if (key === "limit") return { kind: "numbers" };
  if (["reasoningEffort", "reasoning_effort"].includes(key)) return { kind: "reasoning-effort" };
  return { kind: "redacted" };
}

function agentContext(key) {
  if (key === "model") return { kind: "route" };
  if (["variant", "reasoningEffort", "reasoning_effort"].includes(key)) return { kind: "reasoning-effort" };
  return { kind: "redacted" };
}

function variantContext(key) {
  if (["reasoningEffort", "reasoning_effort"].includes(key)) return { kind: "reasoning-effort" };
  return { kind: "redacted" };
}

function recordContext(kind) {
  if (kind === "provider-map") return { kind: "provider-record" };
  if (kind === "models-map") return { kind: "model-record" };
  if (["agents-map", "categories-map"].includes(kind)) return { kind: "agent-record" };
  if (kind === "variants-map") return { kind: "variant-record" };
  return { kind: "numbers" };
}

function arrayContext(context) {
  return context.kind === "modalities" ? { kind: "modality" } : { kind: "redacted" };
}

function safeObjectKey(key, context, child, sequence) {
  if (isHttpSchemePrefixed(key)) return `<redacted-key-${sequence}>`;
  if (context.kind === "provider-concurrency-map") return isIdentifier(key) ? key : `<redacted-key-${sequence}>`;
  if (context.kind === "model-concurrency-map") return isRoute(key) ? key : `<redacted-key-${sequence}>`;
  if (["provider-map", "models-map", "agents-map", "categories-map"].includes(context.kind) && isIdentifier(key)) return key;
  if (context.kind === "variants-map" && REASONING_EFFORTS.has(key)) return key;
  if (KNOWN_KEYS.has(key)) return key;
  return `<redacted-key-${sequence}>`;
}

function isHttpSchemePrefixed(value) {
  return typeof value === "string" && /^https?:/i.test(value);
}

function isRoute(value) {
  const parts = value.split("/");
  return parts.length === 2
    && parts.every(isIdentifier)
    && !/^[A-Za-z][A-Za-z0-9+.-]*:$/.test(parts[0]);
}

function isIdentifier(value) {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:@-]*$/.test(value);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
