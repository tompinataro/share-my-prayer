import {
  versions,
  preferredVersion,
  initialWording,
  prayers,
  additionalPrayers,
  library,
  keyFor,
  extension,
  filename,
  validateBackup,
} from "./core.js?v=mary-undoer-1";
import { prayerText } from "./texts.js?v=mary-undoer-1";
import { allRecordings, saveMany } from "./storage.js?v=11";
import { Player, assemble } from "./audio.js?v=playback-toggle";
import { createAudioResolver } from "./narrator.js?v=ordinary-split-1";
import { personalPrayerBatch } from "./personal-share.js?v=1";
const $ = (id) => document.getElementById(id);
const defaults = {
  version: "classic",
  mode: "decade",
  set: "Joyful",
  decade: 0,
  subtitle: false,
  sender: "",
};
let playbackRequest = 0;
let storedVersion;
let settings = { ...defaults },
  records = new Map(),
  storageReady = false,
  active = null,
  draft = null,
  draftURL = null,
  recorder = null,
  stream = null,
  starting = false,
  busy = false,
  restoreData = null;
try {
  const s = JSON.parse(localStorage.getItem("smp-settings") || "{}");
  storedVersion = s.version;
  settings = { ...defaults, ...s };
  settings.version = preferredVersion(settings.version);
  settings.sender = String(settings.sender || "").slice(0, 60);
  settings.subtitle = !!settings.subtitle;
} catch {
  settings = { ...defaults };
}
let prayerReturn;
const notice = (message) => {
  $("notice").textContent = message;
  const dialog = ["restore-dialog", "prayer-dialog", "settings-dialog"]
    .map($)
    .find((dialog) => dialog.open);
  if (dialog) {
    const surface =
      dialog.id === "prayer-dialog"
        ? $("recording-view").hidden
          ? $("reading-view")
          : $("recording-view")
        : dialog;
    let feedback = surface.querySelector(".feedback");
    if (!feedback) {
      feedback = document.createElement("p");
      feedback.className = "feedback";
      feedback.setAttribute("role", "status");
      surface.append(feedback);
    }
    feedback.textContent = message;
  }
};
const fail = (e) => notice(e?.message || "Something went wrong. Try again.");
const run = (fn) => async () => {
  try {
    await fn();
  } catch (e) {
    fail(e);
  }
};
function preferences() {
  try {
    localStorage.setItem("smp-settings", JSON.stringify(settings));
  } catch {
    notice(
      "Preferences could not be saved. Allow browser storage, or keep a backup.",
    );
  }
}
const audioResolver = createAudioResolver(records);
const availableAudio = (id) => audioResolver.descriptor(settings.version, id);
const activeAudio = () =>
  active && audioResolver.descriptor(active.version, active.id);
const get = (id) => records.get(keyFor(settings.version, id));
const title = (id) => library.find((p) => p.id === id)?.name || id;
const currentRecord = () =>
  active && records.get(keyFor(active.version, active.id));
function activeRecording() {
  return starting || recorder?.state === "recording";
}
function dedication() {
  return settings.subtitle
    ? `Made just for you. From ${settings.sender || "_____"}, with Love`
    : "";
}
function updatePersonalShare() {
  $("home-share-four").hidden = !personalPrayerBatch(records, settings.version);
  $("home-share-four").disabled = busy || activeRecording() || !!draft;
}
function update() {
  updatePersonalShare();
  $("wording").value = settings.version;
  $("wording-help").textContent =
    "Displayed wording and recordings stay separate for each selection. Classic prayers uses historical Hail Mary wording.";
  $("subtitle").checked = settings.subtitle;
  $("sender").value = settings.sender;
  $("dedication").hidden = !settings.subtitle;
  $("dedication").textContent = dedication();
  $("dedication-preview").textContent = dedication();
  $("version-label").textContent = versions[settings.version];
  const ordinary = prayers.slice(0, 4);
  $("saved-count").textContent =
    `${ordinary.filter((p) => get(p.id)).length} / 4 saved · ${ordinary.filter((p) => availableAudio(p.id)?.source === "bella").length} Bella defaults`;
  $("prayers").replaceChildren(
    ...ordinary.map((p) => {
      const button = document.createElement("button");
      button.className = "mystery-button";
      button.dataset.prayer = p.id;
      button.disabled = !storageReady;
      button.textContent = p.buttonLabel || p.name;
      button.onclick = () => openPrayer(p.id, button);
      return button;
    }),
  );
  $("additional-prayers").replaceChildren(
    ...additionalPrayers.map((p) => {
      const button = document.createElement("button");
      button.className = "mystery-button";
      button.dataset.prayer = p.id;
      button.disabled = !storageReady;
      button.textContent = p.name;
      button.onclick = () => openPrayer(p.id, button);
      return button;
    }),
  );
}
function updatePlayControl(state) {
  $("play-label").textContent =
    state === "playing"
      ? "Pause"
      : state === "paused"
        ? "Resume"
        : activeAudio()?.source === "bella"
          ? "Play Bella"
          : "Play saved";
  $("individual-play").querySelector(".circle").textContent =
    state === "playing" ? "Ⅱ" : "▶";
}
const player = new Player((state) => {
  updatePlayControl(state);
  if (active && !activeRecording())
    $("record-state").textContent =
      state === "playing"
        ? "Playing"
        : state === "paused"
          ? "Playback paused"
          : currentRecord()
            ? "Saved on this device"
            : "";
}, fail);
function stopPlayback() {
  playbackRequest++;
  player.stop();
}
function clearDraft() {
  if (draftURL) URL.revokeObjectURL(draftURL);
  draftURL = null;
  draft = null;
  updatePersonalShare();
  $("draft-audio").pause();
  $("draft-audio").removeAttribute("src");
  $("draft-audio").load();
  $("draft").hidden = true;
}
function showDraft(blob) {
  clearDraft();
  draft = blob;
  updatePersonalShare();
  draftURL = URL.createObjectURL(blob);
  $("draft-audio").src = draftURL;
  $("draft").hidden = false;
  $("record-state").textContent = "New take ready — review and save";
}
function refreshPrayer() {
  if (!active) return;
  const p = library.find((p) => p.id === active.id),
    text = prayerText(p, active.version);
  $("prayer-title").textContent = p.name;
  $("copyright-notice").textContent = text.note.includes("©")
    ? text.note.split(" Reproduced under")[0].split(" Ecumenical wording")[0]
    : "";
  $("copyright-notice").hidden = !text.note.includes("©");
  $("reading-credit").textContent = !text.note.includes("©")
    ? ""
    : active.version === "current"
      ? "The Apostles’ Creed from The Roman Missal © 2010 ICEL. All rights reserved."
      : `English translation of ${p.name}, © 1998 English Language Liturgical Consultation (ELLC), used by permission.`;
  $("reading-credit").hidden = !text.note.includes("©");
  $("recording-title").textContent = p.name;
  $("recording-prayer-text").textContent = text.text;
  $("prayer-text").textContent = text.text;
  $("reading-wording").textContent =
    versions[active.version] +
    (active.version === "classic"
      ? active.id === "fatima"
        ? " · Original adaptation, not an officially approved Catholic translation"
        : ["creed", "hail", "queen", "closing"].includes(active.id)
          ? " · Historical wording"
          : ""
      : "");
  $("record-state").textContent =
    player.state === "playing"
      ? "Playing"
      : player.state === "paused"
        ? "Playback paused"
        : currentRecord()
          ? "Saved on this device"
          : activeAudio()
            ? "Bella · AI-generated default"
            : "";
  const instructions = document.querySelector(".prayer-instructions");
  instructions.children[0].textContent =
    active.id === "mary-undoer"
      ? "Record, then save and share your own voice."
      : "Record, then save and share your own voice or";
  instructions.children[1].textContent =
    active.id === "mary-undoer"
      ? "Default voice is not available for this prayer yet."
      : "Play the default voice already provided.";
  updatePlayControl(player.state);
  const personalAudio = activeAudio()?.source === "personal";
  $("audio-source").hidden = !personalAudio;
  $("audio-source").textContent = personalAudio
    ? "Your saved recording is used instead of the default voice."
    : "";
  $("record-label").textContent = currentRecord() ? "Re-record" : "Record";
  for (const id of ["individual-play", "individual-share"])
    $(id).disabled = !activeAudio() || busy;
}
function openPrayer(id, opener = document.activeElement) {
  if (!storageReady)
    return notice("Recordings are still loading. Try again in a moment.");
  if (busy || activeRecording())
    return notice("Finish the current recording or export first.");
  if (draft) return notice("Save or discard your new take first.");
  stopPlayback();
  prayerReturn = {
    container: opener?.closest("#prayers, #additional-prayers")?.id,
    id,
  };
  active = { id, version: settings.version };
  refreshPrayer();
  $("reading-view").hidden = false;
  $("recording-view").hidden = true;
  $("prayer-dialog").setAttribute("aria-labelledby", "prayer-title");
  $("prayer-dialog").showModal();
  $("prayer-dialog").scrollTop = 0;
  $("prayer-title").focus({ preventScroll: true });
}
function closePrayer() {
  if (busy) return notice("Wait for the audio to finish loading or preparing.");
  if (activeRecording())
    return notice(
      "Stop the recording, then save or discard your take before closing.",
    );
  if (draft) return notice("Save or discard your take before closing.");
  stopPlayback();
  $("prayer-dialog").close();
  active = null;
  if (prayerReturn?.container)
    $(prayerReturn.container)
      ?.querySelector(`[data-prayer="${prayerReturn.id}"]`)
      ?.focus();
}
$("prayer-close").onclick = closePrayer;
$("prayer-dialog").addEventListener("cancel", (e) => {
  e.preventDefault();
  if (!$("recording-view").hidden) backFromRecording();
  else closePrayer();
});
function showReadingView() {
  $("notice").textContent = "";
  $("draft-audio").pause();
  $("recording-view").hidden = true;
  $("reading-view").hidden = false;
  $("prayer-dialog").setAttribute("aria-labelledby", "prayer-title");
  $("prayer-dialog").scrollTop = 0;
  $("prayer-title").focus({ preventScroll: true });
}
function backFromRecording() {
  if (activeRecording() || busy)
    return notice("Stop the recording before returning to the prayer.");
  if (draft)
    return notice("Save or discard this take before returning to the prayer.");
  showReadingView();
}
$("recording-close").onclick = backFromRecording;
$("record").onclick = run(async () => {
  if (draft) return notice("Save or discard this take before recording again.");
  if (busy || activeRecording()) return;
  if (!navigator.mediaDevices?.getUserMedia || !globalThis.MediaRecorder)
    throw Error(
      "Recording is unavailable. Use updated Safari or Chrome over HTTPS.",
    );
  $("recording-view")
    .querySelectorAll(".feedback")
    .forEach((node) => node.remove());
  $("reading-view").hidden = true;
  $("recording-view").hidden = false;
  $("prayer-dialog").setAttribute("aria-labelledby", "recording-title");
  $("prayer-dialog").scrollTop = 0;
  $("recording-title").focus({ preventScroll: true });
  starting = true;
  updatePersonalShare();
  $("record").disabled = true;
  stopPlayback();
  $("draft-audio").pause();
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = [
      "audio/mp4",
      "audio/webm;codecs=opus",
      "audio/ogg;codecs=opus",
      "audio/webm",
    ].find((type) => MediaRecorder.isTypeSupported(type));
    recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
    const chunks = [];
    let error = false;
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    recorder.onerror = () => {
      error = true;
      notice(
        "Recording was interrupted. Review the partial take, or discard it and record again.",
      );
      if (recorder.state !== "inactive") recorder.stop();
      else cleanup();
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, {
        type: recorder.mimeType || chunks[0]?.type || "audio/mp4",
      });
      cleanup();
      if (blob.size) {
        showDraft(blob);
        if (error)
          $("record-state").textContent =
            "Interrupted take — review before saving";
      } else
        notice("No audio was captured. Check your microphone and try again.");
    };
    stream.getAudioTracks().forEach(
      (t) =>
        (t.onended = () => {
          if (recorder?.state === "recording") {
            error = true;
            recorder.stop();
          }
        }),
    );
    recorder.start(1000);
    $("record-stop").hidden = false;
    $("record-state").textContent = "● Recording — read the prayer aloud";
    $("individual-play").disabled = true;
  } catch (e) {
    cleanup();
    if (e.name === "NotAllowedError")
      throw Error(
        "Microphone access was denied. Allow it in your browser’s website settings, then try again.",
      );
    if (e.name === "NotFoundError")
      throw Error("No microphone found. Connect a microphone and try again.");
    throw Error(
      "Could not start recording. Check your microphone, close other recording apps, and try again.",
    );
  } finally {
    starting = false;
    update();
  }
});
function cleanup() {
  stream?.getTracks().forEach((t) => {
    t.onended = null;
    t.stop();
  });
  stream = null;
  $("record-stop").hidden = true;
  $("record").disabled = false;
  update();
}
$("record-stop").onclick = () => {
  if (recorder?.state === "recording") {
    $("record-stop").disabled = true;
    recorder.stop();
    $("record-stop").disabled = false;
  }
};
$("save-recording").onclick = run(async () => {
  if (!draft || busy) return;
  busy = true;
  $("save-recording").disabled = true;
  const blob = draft;
  try {
    const record = {
      key: keyFor(active.version, active.id),
      id: active.id,
      version: active.version,
      blob,
      type: blob.type,
      savedAt: new Date().toISOString(),
    };
    await saveMany([record]);
    records.set(record.key, record);
    clearDraft();
    refreshPrayer();
    notice("Recording saved on this device.");
    showReadingView();
  } catch {
    throw Error(
      "Could not save. Your previous recording is safe. Free some device storage, then retry, or download this take from its audio controls.",
    );
  } finally {
    busy = false;
    $("save-recording").disabled = false;
    update();
    refreshPrayer();
  }
});
$("discard").onclick = () => {
  if (busy) return;
  clearDraft();
  refreshPrayer();
  showReadingView();
};
$("draft-audio").onplay = () => stopPlayback();
$("individual-play").onclick = run(async () => {
  if (activeRecording() || busy) return;
  if (player.state === "playing") return player.pause();
  if (player.state === "paused") return player.resume();
  if (!activeAudio()) return;
  const request = ++playbackRequest;
  busy = true;
  update();
  refreshPrayer();
  try {
    const r = await audioResolver.resolve(active.version, active.id);
    $("draft-audio").pause();
    if (request === playbackRequest) await player.start([r]);
  } finally {
    busy = false;
    update();
    refreshPrayer();
  }
});
function download(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
async function share(blob, name) {
  const file = new File([blob], name, { type: blob.type });
  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({
        files: [file],
        title: "Share My Prayer",
        text: dedication() || "A prayer shared with love.",
      });
      return;
    } catch (e) {
      if (e.name === "AbortError") return;
    }
  }
  download(blob, name);
  notice(
    "File sharing is unavailable here. Your download is ready; share it from Files or Downloads.",
  );
}
$("home-share-four").onclick = run(async () => {
  if (busy || activeRecording() || draft) return;
  const version = settings.version;
  const items = personalPrayerBatch(records, version);
  if (!items) return;
  busy = true;
  stopPlayback();
  update();
  notice("Preparing your four saved prayers…");
  try {
    const blob = await assemble(items);
    const name = filename(
      `Four prayers - ${versions[version]}`,
      settings,
      "wav",
    );
    $("notice").textContent = "";
    await share(blob, name);
  } finally {
    busy = false;
    update();
  }
});
$("individual-share").onclick = run(async () => {
  if (busy || activeRecording() || !activeAudio()) return;
  busy = true;
  update();
  refreshPrayer();
  try {
    const r = await audioResolver.resolve(active.version, active.id);
    const name = filename(
      `${title(r.id)} - ${versions[r.version]}`,
      settings,
      r.source === "bella" && r.blob.type.includes("mpeg")
        ? "mp3"
        : extension(r.blob.type),
    );
    await share(r.blob, name);
  } finally {
    busy = false;
    update();
    refreshPrayer();
  }
});
$("settings-open").onclick = () => {
  if (busy || activeRecording() || draft)
    return notice("Finish your current take or export first.");
  $("settings-dialog").showModal();
};
$("settings-dialog").addEventListener("close", () =>
  $("settings-open").focus(),
);
function closeSettings() {
  if (busy || activeRecording() || draft)
    return notice(
      "Wait for the current recording, audio or import operation to finish.",
    );
  $("settings-dialog").close();
}
for (const id of ["settings-close", "settings-done"])
  $(id).onclick = closeSettings;
$("settings-dialog").addEventListener("cancel", (event) => {
  event.preventDefault();
  closeSettings();
});
$("wording").onchange = () => {
  if (busy || activeRecording()) {
    $("wording").value = settings.version;
    return notice("Finish the current audio operation first.");
  }
  stopPlayback();
  settings.version = preferredVersion($("wording").value);
  preferences();
  update();
};
$("subtitle").onchange = () => {
  settings.subtitle = $("subtitle").checked;
  preferences();
  update();
};
$("sender").oninput = () => {
  settings.sender = $("sender").value;
  preferences();
  $("dedication-preview").textContent = dedication();
  $("dedication").hidden = !settings.subtitle;
  $("dedication").textContent = dedication();
};
async function base64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
$("backup").onclick = run(async () => {
  if (activeRecording() || busy)
    return notice("Finish the current recording or export first.");
  busy = true;
  try {
    const recordings = [];
    for (const r of records.values())
      recordings.push({
        id: r.id,
        version: r.version,
        type: r.blob.type,
        savedAt: r.savedAt,
        data: await base64(r.blob),
      });
    const prompts = {};
    for (const v of Object.keys(versions))
      for (const p of library) {
        const key = keyFor(v, p.id);
        const value = localStorage.getItem("smp-prompt:" + key);
        if (value) prompts[key] = value;
      }
    download(
      new Blob(
        [
          JSON.stringify({
            format: "share-my-prayer",
            version: 1,
            createdAt: new Date().toISOString(),
            preferences: settings,
            prompts,
            recordings,
          }),
        ],
        { type: "application/json" },
      ),
      filename("Private backup", settings, "json"),
    );
    notice(
      `Backup downloaded: ${recordings.length} recordings. Store it somewhere private.`,
    );
  } finally {
    busy = false;
    update();
  }
});
$("restore").onchange = run(async () => {
  const file = $("restore").files[0];
  $("restore").value = "";
  if (!file) return;
  if (activeRecording() || busy)
    return notice("Finish the current recording or export first.");
  if (file.size > 150 * 1024 * 1024)
    throw Error(
      "Backup exceeds the 150 MB restore limit. Choose a smaller backup.",
    );
  busy = true;
  update();
  try {
    restoreData = validateBackup(JSON.parse(await file.text()));
    $("restore-summary").textContent =
      `This backup contains ${restoreData.recordings.length} recordings across ${new Set(restoreData.recordings.map((r) => r.version)).size} wording versions.`;
    $("restore-dialog").showModal();
  } finally {
    busy = false;
    update();
  }
});
function cancelRestore() {
  if (busy) return notice("Wait for the current restore to finish.");
  restoreData = null;
  $("restore-dialog").close();
}
$("restore-cancel").onclick = cancelRestore;
$("restore-dialog").addEventListener("cancel", (event) => {
  event.preventDefault();
  cancelRestore();
});
$("restore-confirm").onclick = run(async () => {
  if (!restoreData || busy) return;
  const confirmedRestore = restoreData;
  busy = true;
  $("restore-confirm").disabled = true;
  stopPlayback();
  try {
    const incoming = confirmedRestore.recordings.map((r) => {
      const bytes = Uint8Array.from(atob(r.data), (c) => c.charCodeAt(0));
      if (!bytes.length) throw Error("Empty audio in backup.");
      return {
        key: keyFor(r.version, r.id),
        id: r.id,
        version: r.version,
        type: r.type,
        blob: new Blob([bytes], { type: r.type }),
        savedAt: r.savedAt || new Date().toISOString(),
      };
    });
    await saveMany(incoming);
    incoming.forEach((r) => records.set(r.key, r));
    let promptFailure = false;
    for (const [key, text] of Object.entries(confirmedRestore.prompts || {})) {
      if (
        typeof text !== "string" ||
        text.length > 100000 ||
        !library.some((p) =>
          Object.keys(versions).some((v) => key === keyFor(v, p.id)),
        )
      )
        continue;
      try {
        localStorage.setItem("smp-prompt:" + key, text);
      } catch {
        promptFailure = true;
      }
    }
    restoreData = null;
    $("restore-dialog").close();
    notice(
      promptFailure
        ? "Audio restored. Some private text prompts could not be saved; free browser storage."
        : "Recordings restored. Current settings have been kept.",
    );
  } catch (e) {
    throw Error(
      `Restore failed: ${e.message}. Backup restoration is atomic; on a storage failure your saved recordings remain unchanged.`,
    );
  } finally {
    busy = false;
    $("restore-confirm").disabled = false;
    update();
  }
});
window.addEventListener("pagehide", () => {
  stopPlayback();
  if (recorder?.state === "recording") recorder.stop();
});
window.addEventListener("beforeunload", (e) => {
  if (activeRecording() || draft || busy) {
    e.preventDefault();
    e.returnValue = "";
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && recorder?.state === "recording") {
    recorder.stop();
    notice(
      "Recording stopped because the app went into the background. Review the take before saving.",
    );
  }
});
update();
try {
  for (const r of await allRecordings()) records.set(r.key, r);
  settings.version = initialWording(storedVersion, [...records.values()]);
  storageReady = true;
  update();
} catch {
  storageReady = true;
  update();
  notice(
    "Recording storage is unavailable. Exit private browsing, allow site storage, and reload. Existing recordings have not been changed.",
  );
}
