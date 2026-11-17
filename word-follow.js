import { maryTiming } from "./mary-timing.js";
export function wordAtTime(words, time) {
  let lo = 0,
    hi = words.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (words[mid].start <= time) lo = mid + 1;
    else hi = mid;
  }
  const i = lo - 1;
  return i >= 0 && time < words[i].end ? i : -1;
}
// Use the audio clock, never wall-clock estimates: pause, seek, buffering and
// playback-rate changes therefore cannot accumulate highlighting drift.
export function followMaryWords(container, player, isMaryBella) {
  let spans = [],
    highlighted = -1,
    frame = 0;
  function clear() {
    if (highlighted >= 0) spans[highlighted]?.classList.remove("spoken-word");
    highlighted = -1;
  }
  function update() {
    cancelAnimationFrame(frame);
    const item = player.items[player.index];
    const enabled =
      isMaryBella() &&
      item?.source === "bella" &&
      item?.id === "mary-undoer" &&
      !player.audio.paused;
    const index = enabled
      ? wordAtTime(maryTiming.words, player.audio.currentTime)
      : -1;
    if (index !== highlighted) {
      clear();
      highlighted = index;
      if (index >= 0) spans[index]?.classList.add("spoken-word");
    }
    if (enabled) frame = requestAnimationFrame(update);
  }
  for (const event of [
    "play",
    "playing",
    "pause",
    "ended",
    "seeking",
    "seeked",
    "timeupdate",
    "emptied",
  ])
    player.audio.addEventListener(event, update);
  return function render(text, enabled) {
    clear();
    spans = [];
    if (!enabled) {
      container.textContent = text;
      return;
    }
    const parts = text.split(/(\s+)/);
    const tokens = parts.filter((p) => p && !/^\s+$/.test(p));
    if (
      tokens.length !== maryTiming.words.length ||
      tokens.some((t, i) => t !== maryTiming.words[i].word)
    ) {
      container.textContent = text;
      return;
    }
    const fragment = document.createDocumentFragment();
    for (const part of parts) {
      if (!part || /^\s+$/.test(part))
        fragment.append(document.createTextNode(part));
      else {
        const span = document.createElement("span");
        span.textContent = part;
        spans.push(span);
        fragment.append(span);
      }
    }
    container.replaceChildren(fragment);
    update();
  };
}
