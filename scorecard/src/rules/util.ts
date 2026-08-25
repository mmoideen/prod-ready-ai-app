/**
 * Shared helpers used by multiple rules. Kept separate from src/types.ts so
 * that each rule file stays focused on a single rule's detection logic.
 */

/**
 * Words that mark an env value as an obvious placeholder rather than a real
 * looking secret. Shared by SEC-2 (flagging suspicious literals) and SEC-3
 * (requiring every value in .env.example to be a placeholder).
 */
export const PLACEHOLDER_WORDS = [
  "example",
  "changeme",
  "your-",
  "placeholder",
  "xxx",
  "fake",
  "test",
  "dummy",
  "sample",
];

/** True if `value` reads as an obvious placeholder rather than a real secret. */
export function isPlaceholderValue(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return true;
  if (/^<.*>$/.test(trimmed)) return true;
  const lower = trimmed.toLowerCase();
  return PLACEHOLDER_WORDS.some((word) => lower.includes(word));
}

/** True if `value` contains one of the placeholder words (substring, case insensitive). */
export function containsPlaceholderWord(value: string): boolean {
  const lower = value.toLowerCase();
  return PLACEHOLDER_WORDS.some((word) => lower.includes(word));
}

/** Extract the top level YAML block for `key` (for example "on") via line scanning. */
export function extractTopLevelBlock(content: string, key: string): string {
  const lines = content.split(/\r?\n/);
  const keyPattern = new RegExp(`^${key}\\s*:`);
  const startIdx = lines.findIndex((line) => keyPattern.test(line));
  if (startIdx === -1) return "";
  const collected: string[] = [lines[startIdx] ?? ""];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (/^\S/.test(line)) break; // next top level key
    collected.push(line);
  }
  return collected.join("\n");
}

/** Escape a string for safe inclusion in a RegExp. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Truncate long evidence strings so reports stay readable. */
export function truncate(value: string, max = 200): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3)}...`;
}

/** Join a list of items for an evidence string, capping how many are shown. */
export function joinEvidenceList(items: readonly string[], max = 5): string {
  if (items.length === 0) return "";
  const shown = items.slice(0, max).join(", ");
  const extra = items.length - max;
  return extra > 0 ? `${shown} (and ${extra} more)` : shown;
}
