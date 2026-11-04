import { keyFor } from "./core.js?v=bella-classic";
import { narratorClips } from "./narrator-manifest.js?v=bella-classic";

// Public narrator assets never enter the private recordings database or backups.
export function createAudioResolver(
  records,
  clips = narratorClips,
  fetchAudio = fetch,
) {
  const cache = new Map();
  function descriptor(version, id) {
    const personal = records.get(keyFor(version, id));
    if (personal) return { ...personal, source: "personal" };
    const clip = clips[keyFor(version, id)];
    return clip
      ? { ...clip, id, version, key: `bella:${version}:${id}`, source: "bella" }
      : null;
  }
  async function resolve(version, id) {
    const item = descriptor(version, id);
    if (!item) throw Error("Audio is not available for this prayer yet.");
    if (item.source === "personal") return item;
    const url = new URL(item.path, import.meta.url);
    if (
      url.origin !== new URL(import.meta.url).origin ||
      !url.pathname.startsWith(
        new URL("./narration/", import.meta.url).pathname,
      )
    )
      throw Error("Invalid built-in narration path.");
    if (!cache.has(item.path)) {
      const pending = (async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        try {
          const response = await fetchAudio(url, { signal: controller.signal });
          if (!response.ok)
            throw Error(
              "Bella audio could not be loaded. Check your connection and try again.",
            );
          const blob = await response.blob();
          if (!blob.size || !blob.type.startsWith("audio/"))
            throw Error(
              "Bella audio is unavailable or has an unsupported format.",
            );
          return blob;
        } finally {
          clearTimeout(timeout);
        }
      })();
      cache.set(item.path, pending);
      pending.catch(() => cache.delete(item.path));
    }
    return { ...item, blob: await cache.get(item.path) };
  }
  return { descriptor, resolve };
}

export function sessionReadinessMessage(missingNames) {
  if (!missingNames.length) return "Ready when you are.";
  return `This rosary needs ${missingNames.length} personal recording${missingNames.length === 1 ? "" : "s"}: ${missingNames.join(", ")}. Bella audio is not available for ${missingNames.length === 1 ? "this prayer" : "these prayers"} in this wording. Go back, open each listed prayer, then Record and Save.`;
}
