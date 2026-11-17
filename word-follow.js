import { maryTiming } from "./mary-timing.js";
import { ordinaryTiming } from "./ordinary-timing.js";
export function timingFor(item) {
  if (item?.source !== "bella") return null;
  return item.id === "mary-undoer"
    ? maryTiming
    : ordinaryTiming[`${item.version}:${item.id}`];
}
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
export function followPrayerWords(container, player, getActiveAudio) {
  let spans = [],
    highlighted = -1,
    frame = 0,
    lastScroll = -Infinity,
    lastWord = -1;
  const scroller = container.closest("dialog");
  function keepWordVisible(word, jumped) {
    if (!word || !scroller?.open) return;
    const view = scroller.getBoundingClientRect();
    const rect = word.getBoundingClientRect();
    const top = view.top + scroller.clientTop;
    const height = scroller.clientHeight;
    // Move a line at a time only after it leaves the comfortable reading band.
    // Scroll the prayer dialog, never the page behind it.
    if (rect.top >= top + height * 0.2 && rect.bottom <= top + height * 0.72)
      return;
    if (!jumped && performance.now() - lastScroll < 450) return;
    lastScroll = performance.now();
    scroller.scrollTo({
      top: Math.max(0, scroller.scrollTop + rect.top - top - height * 0.42),
      behavior:
        jumped || matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
    });
  }
  function clear() {
    if (highlighted >= 0) spans[highlighted]?.classList.remove("spoken-word");
    highlighted = -1;
  }
  function update() {
    cancelAnimationFrame(frame);
    const item = player.items[player.index];
    const active = getActiveAudio();
    const timing = timingFor(active);
    const enabled =
      timing &&
      item?.source === "bella" &&
      item?.id === active.id &&
      item?.version === active.version &&
      !player.audio.paused;
    const index = enabled
      ? wordAtTime(timing.words, player.audio.currentTime)
      : -1;
    if (index !== highlighted) {
      const jumped = lastWord < 0 || Math.abs(index - lastWord) > 4;
      clear();
      highlighted = index;
      if (index >= 0) {
        lastWord = index;
        spans[index]?.classList.add("spoken-word");
        keepWordVisible(spans[index], jumped);
      }
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
  return function render(text, item) {
    clear();
    lastWord = -1;
    spans = [];
    const timing = timingFor(item);
    if (!timing) {
      container.textContent = text;
      return;
    }
    if (
      timing.words.map((w) => w.word).join(" ") !==
      text.trim().split(/\s+/).join(" ")
    ) {
      container.textContent = text;
      return;
    }
    const fragment = document.createDocumentFragment();
    let cursor = 0;
    for (const { word } of timing.words) {
      const position = text.indexOf(word, cursor);
      if (position < 0 || text.slice(cursor, position).trim()) {
        container.textContent = text;
        spans = [];
        return;
      }
      fragment.append(document.createTextNode(text.slice(cursor, position)));
      const span = document.createElement("span");
      span.textContent = word;
      spans.push(span);
      fragment.append(span);
      cursor = position + word.length;
    }
    fragment.append(document.createTextNode(text.slice(cursor)));
    container.replaceChildren(fragment);
    update();
  };
}
