export const versions = {
  traditional: "Traditional Catholic",
  current: "Current Catholic",
  contemporary: "Contemporary English",
};
export const mysteries = {
  Joyful: [
    "The Annunciation",
    "The Visitation",
    "The Nativity",
    "The Presentation in the Temple",
    "The Finding in the Temple",
  ],
  Luminous: [
    "The Baptism of Christ in the Jordan",
    "The Wedding Feast at Cana",
    "The Proclamation of the Kingdom",
    "The Transfiguration",
    "The Institution of the Eucharist",
  ],
  Sorrowful: [
    "The Agony in the Garden",
    "The Scourging at the Pillar",
    "The Crowning with Thorns",
    "The Carrying of the Cross",
    "The Crucifixion and Death",
  ],
  Glorious: [
    "The Resurrection",
    "The Ascension",
    "The Descent of the Holy Spirit",
    "The Assumption",
    "The Coronation of Mary",
  ],
};
export const prayers = [
  ["cross", "Sign of the Cross"],
  ["glory", "Glory Be"],
  ["hail", "Hail Mary"],
  ["father", "Our Father"],
  ["creed", "Apostles’ Creed"],
  ["fatima", "Fatima Prayer (O my Jesus)"],
  ["queen", "Hail Holy Queen"],
  ["closing", "Rosary closing dialogue and prayer"],
].map(([id, name]) => ({ id, name }));
export const library = [
  ...prayers,
  ...Object.entries(mysteries).flatMap(([set, names]) =>
    names.map((name, i) => ({ id: `${set}-${i}`, name, set, index: i })),
  ),
];
export const keyFor = (version, id) => `${version}:${id}`;
export function sequence({ mode = "decade", set = "Joyful", decade = 0 } = {}) {
  if (
    !mysteries[set] ||
    !Number.isInteger(+decade) ||
    +decade < 0 ||
    +decade > 4 ||
    !["decade", "whole"].includes(mode)
  )
    throw Error("Invalid rosary selection.");
  const result = [];
  const add = (id, d = 0, hail = 0) => result.push({ id, decade: d, hail });
  if (mode === "whole") {
    add("cross");
    add("creed");
    add("father");
    for (let i = 1; i <= 3; i++) add("hail", 0, i);
    add("glory");
  }
  for (const d of mode === "whole" ? [0, 1, 2, 3, 4] : [+decade]) {
    add(`${set}-${d}`, d + 1);
    add("father", d + 1);
    for (let i = 1; i <= 10; i++) add("hail", d + 1, i);
    add("glory", d + 1);
    add("fatima", d + 1);
  }
  if (mode === "whole") {
    add("queen");
    add("closing");
    add("cross");
  }
  return result;
}
export const required = (settings) => [
  ...new Set(sequence(settings).map((x) => x.id)),
];
export function extension(type) {
  if (type.includes("mp4")) return "m4a";
  if (type.includes("ogg")) return "ogg";
  if (type.includes("wav")) return "wav";
  if (type.includes("webm")) return "webm";
  throw Error("Unsupported audio format. Use WAV, M4A, WebM, or Ogg.");
}
export function filename(title, settings, ext) {
  return (
    `Share My Prayer - ${title}${settings.subtitle && settings.sender ? ` - From ${settings.sender}, with Love` : ""}`
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
      .slice(0, 180) +
    "." +
    ext
  );
}
export function wavHeader(samples, rate = 24000) {
  const buffer = new ArrayBuffer(44);
  const v = new DataView(buffer);
  const str = (p, s) =>
    [...s].forEach((c, i) => v.setUint8(p + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + samples * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, samples * 2, true);
  return buffer;
}
export function pcm16(channels) {
  const out = new Int16Array(channels[0].length);
  for (let i = 0; i < out.length; i++) {
    let s = 0;
    for (const c of channels) s += c[i] / channels.length;
    s = Math.max(-1, Math.min(1, s));
    out[i] = Math.round(s * (s < 0 ? 32768 : 32767));
  }
  return out;
}
export function validateBackup(data) {
  if (
    data?.format !== "share-my-prayer" ||
    data.version !== 1 ||
    !Array.isArray(data.recordings) ||
    data.recordings.length > 84
  )
    throw Error("This is not a supported Share My Prayer backup.");
  const seen = new Set();
  for (const r of data.recordings) {
    if (
      !Object.hasOwn(versions, r.version) ||
      !library.some((p) => p.id === r.id) ||
      seen.has(keyFor(r.version, r.id)) ||
      typeof r.data !== "string" ||
      !r.data.length ||
      r.data.length > 80000000 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(r.data) ||
      typeof r.type !== "string"
    )
      throw Error("Invalid or duplicate recording in backup.");
    extension(r.type);
    seen.add(keyFor(r.version, r.id));
  }
  return data;
}
