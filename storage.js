let connection;
export function db() {
  return (connection ??= new Promise((resolve, reject) => {
    const r = indexedDB.open("share-my-prayer", 1);
    r.onupgradeneeded = () =>
      r.result.createObjectStore("recordings", { keyPath: "key" });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () =>
      reject(Error("Close other Share My Prayer tabs, then reload."));
  }));
}
export async function allRecordings() {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction("recordings");
    const r = t.objectStore("recordings").getAll();
    r.onsuccess = () =>
      resolve(
        r.result.map((r) => ({
          ...r,
          blob: r.blob || new Blob([r.bytes], { type: r.type }),
        })),
      );
    r.onerror = () => reject(r.error);
  });
}
export async function saveMany(records) {
  const encoded = await Promise.all(
    records.map(async ({ blob, ...r }) => ({
      ...r,
      type: blob.type,
      bytes: await blob.arrayBuffer(),
    })),
  );
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction("recordings", "readwrite");
    try {
      for (const r of encoded) t.objectStore("recordings").put(r);
    } catch (error) {
      t.abort();
      reject(error);
      return;
    }
    t.oncomplete = resolve;
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || Error("Storage transaction aborted."));
  });
}
