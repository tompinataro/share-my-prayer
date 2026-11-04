import { wavHeader, pcm16 } from "./core.js?v=bella-classic";
export class Player {
  constructor(onchange, onerror) {
    this.audio = new Audio();
    this.audio.preload = "auto";
    this.onchange = onchange;
    this.onerror = onerror;
    this.token = 0;
    this.items = [];
    this.index = 0;
    this.state = "stopped";
    this.audio.onended = () => {
      if (this.state !== "playing") return;
      if (this.index + 1 < this.items.length) {
        this.index++;
        this.load();
      } else {
        this.stop();
        this.onchange("completed", this.index, this.items.length);
      }
    };
    this.audio.onerror = () => {
      this.stop();
      this.onerror(
        Error(
          "This recording cannot be played here. Re-record this prayer in this browser.",
        ),
      );
    };
  }
  async start(items) {
    this.stop();
    this.items = items;
    this.index = 0;
    await this.load();
  }
  async load() {
    const token = ++this.token;
    this.release();
    this.url = URL.createObjectURL(this.items[this.index].blob);
    this.audio.src = this.url;
    this.state = "playing";
    this.onchange(this.state, this.index, this.items.length);
    try {
      await this.audio.play();
    } catch (e) {
      if (token === this.token) {
        this.state = "paused";
        this.onchange(this.state, this.index, this.items.length);
        this.onerror(
          Error("Playback was interrupted or blocked. Tap Resume to continue."),
        );
      }
    }
  }
  pause() {
    if (this.state === "playing") {
      this.audio.pause();
      this.state = "paused";
      this.onchange(this.state, this.index, this.items.length);
    }
  }
  async resume() {
    if (this.state !== "paused") return;
    this.state = "playing";
    this.onchange(this.state, this.index, this.items.length);
    try {
      await this.audio.play();
    } catch {
      this.state = "paused";
      this.onchange(this.state, this.index, this.items.length);
      this.onerror(
        Error(
          "Tap Resume again, keep the app open, or re-record an unsupported file.",
        ),
      );
    }
  }
  release() {
    this.audio.pause();
    if (this.url) {
      URL.revokeObjectURL(this.url);
      this.url = null;
    }
  }
  stop() {
    this.token++;
    this.state = "stopped";
    this.release();
    this.audio.removeAttribute("src");
    this.audio.load();
    this.onchange(this.state, this.index, this.items.length);
  }
}
// Decode distinct recordings once, render them one at a time at a shared sample rate,
// then append repeated PCM chunks in exactly the playback sequence. No giant float mix.
export async function assemble(items, onprogress = () => {}) {
  const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Context)
    throw Error(
      "Audio export is unavailable. Try an updated Safari, Chrome, or Firefox.",
    );
  const context = new Context();
  const rate = 24000;
  const parts = new Map();
  let total = 0;
  try {
    for (const item of items) {
      if (!parts.has(item.key)) {
        const decoded = await context.decodeAudioData(
          await item.blob.arrayBuffer(),
        );
        const count = Math.ceil(decoded.duration * rate);
        if (count > rate * 600)
          throw Error(
            "A recording exceeds the 10-minute export limit. Use a shorter recording.",
          );
        const offline = new OfflineAudioContext(1, count, rate);
        const src = offline.createBufferSource();
        src.buffer = decoded;
        src.connect(offline.destination);
        src.start();
        const rendered = await offline.startRendering();
        parts.set(item.key, pcm16([rendered.getChannelData(0)]));
      }
      total += parts.get(item.key).length;
      if (total > rate * 60 * 90)
        throw Error(
          "Session exceeds the 90-minute export limit. Export one decade at a time.",
        );
      onprogress(parts.size);
      await new Promise((r) => setTimeout(r, 0));
    }
    return new Blob(
      [wavHeader(total, rate), ...items.map((x) => parts.get(x.key))],
      { type: "audio/wav" },
    );
  } finally {
    await context.close();
  }
}
