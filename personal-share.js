import { keyFor } from "./core.js?v=bella-classic";

export const personalShareIds = Object.freeze([
  "cross",
  "glory",
  "hail",
  "father",
]);

// Only the private-recording map qualifies; narrator availability is irrelevant.
export function personalPrayerBatch(records, version) {
  const items = personalShareIds.map((id) => {
    const key = keyFor(version, id);
    const saved = records.get(key);
    return saved?.blob?.size > 0 && saved.source !== "bella"
      ? { id, version, key, blob: saved.blob }
      : null;
  });
  return items.every(Boolean) ? items : null;
}
