/**
 * Coerce backend payloads that may wrap lists into a plain array.
 * Keeps UI components resilient to shape variations such as { items: [...] }.
 */
export function ensureArray(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && typeof payload === "object") {
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.results)) return payload.results;
    if (Array.isArray(payload.list)) return payload.list;
  }
  return [];
}

