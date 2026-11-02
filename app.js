import {
  versions,
  mysteries,
  prayers,
  library,
  keyFor,
  sequence,
  required,
  extension,
  filename,
  validateBackup,
} from "./core.js";
import { prayerText } from "./texts.js";
import { allRecordings, saveMany } from "./storage.js";
import { Player, assemble } from "./audio.js";
const $ = (id) => document.getElementById(id);
const defaults = {
  version: "traditional",
  mode: "decade",
  set: "Joyful",
  decade: 0,
  subtitle: false,
  sender: "",
};
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
  restoreData = null,
  sessionItems = [],
  sessionOutput = null,
  sessionURL = null;
try {
  const s = JSON.parse(localStorage.getItem("smp-settings") || "{}");
  settings = { ...defaults, ...s };
  if (!Object.hasOwn(versions, settings.version))
    settings.version = defaults.version;
  sequence(settings);
  settings.sender = String(settings.sender || "").slice(0, 60);
  settings.subtitle = !!settings.subtitle;
} catch {
  settings = { ...defaults };
}
const notice = (message) => {
  $("notice").textContent = message;
  const dialog = document.querySelector("dialog[open]");
  if (dialog) {
    let feedback = dialog.querySelector(".feedback");
    if (!feedback) {
      feedback = document.createElement("p");
      feedback.className = "feedback";
      feedback.setAttribute("role", "status");
      dialog.append(feedback);
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
function invalidateExport() {
  sessionOutput = null;
  if (sessionURL) URL.revokeObjectURL(sessionURL);
  sessionURL = null;
  $("export-result").hidden = true;
}
function update() {
  $("wording").value = settings.version;
  $("mode").value = settings.mode;
  $("set").value = settings.set;
  $("subtitle").checked = settings.subtitle;
  $("sender").value = settings.sender;
  $("dedication").hidden = !settings.subtitle;
  $("dedication").textContent = dedication();
  $("dedication-preview").textContent = dedication();
  $("version-label").textContent = versions[settings.version];
  $("saved-count").textContent =
    `${library.filter((p) => get(p.id)).length} / ${library.length} saved`;
  $("decade").replaceChildren(
    ...mysteries[settings.set].map(
      (name, i) => new Option(`${i + 1}. ${name}`, i),
    ),
  );
  $("decade").value = settings.decade;
  $("settings-mode").value = settings.mode;
  $("settings-set").value = settings.set;
  $("settings-decade").replaceChildren(
    ...mysteries[settings.set].map(
      (name, i) => new Option(`${i + 1}. ${name}`, i),
    ),
  );
  $("settings-decade").value = settings.decade;
  $("settings-decade-field").hidden = settings.mode === "whole";
  $("decade-field").hidden = settings.mode === "whole";
  const button = (p) => {
    const b = document.createElement("button");
    b.className = "mystery-button";
    b.dataset.prayer = p.id;
    b.disabled = !storageReady;
    const name = document.createElement("span");
    name.textContent = p.name;
    const badge = document.createElement("span");
    badge.className = `record-badge ${get(p.id) ? "saved" : ""}`;
    badge.textContent = get(p.id) ? "✓ Saved" : "○ Record";
    b.append(name, badge);
    b.onclick = () => openPrayer(p.id);
    return b;
  };
  $("prayers").replaceChildren(...prayers.map(button));
  $("mystery-list").replaceChildren(
    ...Object.entries(mysteries).map(([set]) => {
      const wrap = document.createElement("div");
      const h = document.createElement("h3");
      h.textContent = set;
      wrap.append(h, ...library.filter((p) => p.set === set).map(button));
      return wrap;
    }),
  );
  const seq = sequence(settings),
    missing = required(settings).filter((id) => !get(id));
  $("session-summary").textContent =
    `${settings.mode === "whole" ? "Five decades" : "One decade"} · ${seq.length} prayer steps · ${versions[settings.version]}`;
  $("missing").replaceChildren();
  if (missing.length) {
    const p = document.createElement("strong");
    p.textContent = `Record ${missing.length} missing ${missing.length === 1 ? "prayer" : "prayers"} to begin`;
    const ul = document.createElement("ul");
    for (const id of missing) {
      const li = document.createElement("li"),
        b = document.createElement("button");
      b.textContent = title(id);
      b.onclick = () => openPrayer(id);
      li.append(b);
      ul.append(li);
    }
    $("missing").append(p, ul);
  }
  $("start").disabled = missing.length > 0 || busy || activeRecording();
  $("export").disabled = missing.length > 0 || busy || activeRecording();
  $("share-session").disabled = $("export").disabled;
}
const player = new Player((state, index, total) => {
  $("transport").hidden = state === "stopped";
  $("pause").disabled = state !== "playing";
  $("resume").disabled = state !== "paused";
  $("individual-stop").hidden = state === "stopped";
  const item = sessionItems[index];
  if (state === "completed") {
    $("play-status").textContent = "Prayer complete. Peace be with you.";
    $("progress").value = 1;
  } else if (state === "stopped") {
    $("play-status").textContent = "Ready when you are.";
    $("progress").value = 0;
  } else if (item) {
    $("play-status").textContent =
      `${state === "paused" ? "Paused" : "Playing"} · ${title(item.id)}${item.decade ? ` · Decade ${item.decade} of 5` : " · Opening / closing"}${item.hail ? ` · Hail Mary ${item.hail} of ${item.decade ? 10 : 3}` : ""} · Step ${index + 1} of ${total}`;
    $("progress").value = (index + 1) / total;
  }
  if (active && !activeRecording())
    $("record-state").textContent =
      state === "playing"
        ? "Playing"
        : state === "paused"
          ? "Playback paused"
          : currentRecord()
            ? "Saved on this device"
            : "Missing recording";
}, fail);
function clearDraft() {
  if (draftURL) URL.revokeObjectURL(draftURL);
  draftURL = null;
  draft = null;
  $("draft-audio").pause();
  $("draft-audio").removeAttribute("src");
  $("draft-audio").load();
  $("draft").hidden = true;
}
function showDraft(blob) {
  clearDraft();
  draft = blob;
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
  $("prayer-version").textContent = versions[active.version];
  $("text-note").textContent = text.note;
  $("text-source").href = text.url;
  $("prayer-text").textContent = text.text;
  $("custom-field").hidden = !!text.text;
  try {
    $("custom-text").value =
      localStorage.getItem(`smp-prompt:${keyFor(active.version, active.id)}`) ||
      "";
  } catch {
    $("custom-text").value = "";
  }
  $("record-state").textContent = currentRecord()
    ? "Saved on this device"
    : "Missing recording";
  $("record-label").textContent = currentRecord() ? "Re-record" : "Record";
  for (const id of [
    "individual-play",
    "individual-download",
    "individual-share",
  ])
    $(id).disabled = !currentRecord();
}
function openPrayer(id) {
  if (!storageReady)
    return notice("Recordings are still loading. Try again in a moment.");
  if (busy || activeRecording())
    return notice("Finish the current recording or export first.");
  if (draft) return notice("Save or discard your new take first.");
  player.stop();
  active = { id, version: settings.version };
  refreshPrayer();
  $("prayer-dialog").showModal();
}
function closePrayer() {
  if (activeRecording())
    return notice(
      "Stop the recording, then save or discard your take before closing.",
    );
  if (draft) return notice("Save or discard your take before closing.");
  player.stop();
  $("prayer-dialog").close();
  active = null;
}
$("prayer-close").onclick = closePrayer;
$("prayer-dialog").addEventListener("cancel", (e) => {
  e.preventDefault();
  closePrayer();
});
$("save-prompt").onclick = run(() => {
  localStorage.setItem(
    `smp-prompt:${keyFor(active.version, active.id)}`,
    $("custom-text").value,
  );
  notice("Private prompt saved in this browser.");
});
$("record").onclick = run(async () => {
  if (draft) return notice("Save or discard this take before recording again.");
  if (busy || activeRecording()) return;
  if (!navigator.mediaDevices?.getUserMedia || !globalThis.MediaRecorder)
    throw Error(
      "Recording is unavailable. Use updated Safari or Chrome over HTTPS, or import an audio file.",
    );
  starting = true;
  $("record").disabled = true;
  player.stop();
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
    $("audio-import").disabled = true;
  } catch (e) {
    cleanup();
    if (e.name === "NotAllowedError")
      throw Error(
        "Microphone access was denied. Allow it in your browser’s website settings, then try again. You can also import audio.",
      );
    if (e.name === "NotFoundError")
      throw Error("No microphone found. Connect one or import an audio file.");
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
  $("audio-import").disabled = false;
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
    invalidateExport();
    refreshPrayer();
    notice("Recording saved on this device.");
  } catch {
    throw Error(
      "Could not save. Your previous recording is safe. Free some device storage, then retry, or download this take from its audio controls.",
    );
  } finally {
    busy = false;
    $("save-recording").disabled = false;
    update();
  }
});
$("discard").onclick = () => {
  if (busy) return;
  clearDraft();
  refreshPrayer();
};
$("draft-audio").onplay = () => player.stop();
$("audio-import").onchange = run(async () => {
  const file = $("audio-import").files[0];
  $("audio-import").value = "";
  if (!file || activeRecording() || busy) return;
  if (draft)
    throw Error("Save or discard the current take before importing audio.");
  if (file.size > 60 * 1024 * 1024)
    throw Error("Choose an audio file smaller than 60 MB.");
  let type = file.type;
  if (!type || type === "application/octet-stream") {
    type = {
      wav: "audio/wav",
      m4a: "audio/mp4",
      mp4: "audio/mp4",
      webm: "audio/webm",
      ogg: "audio/ogg",
    }[file.name.split(".").pop().toLowerCase()];
  }
  extension(type || "");
  player.stop();
  showDraft(new Blob([file], { type }));
});
function selectedItems() {
  const missing = required(settings).filter((id) => !get(id));
  if (missing.length)
    throw Error(
      "Record every listed missing prayer before starting or exporting.",
    );
  return sequence(settings).map((item) => ({ ...item, ...get(item.id) }));
}
$("start").onclick = run(async () => {
  if (activeRecording() || busy) return;
  sessionItems = selectedItems();
  await player.start(sessionItems);
});
$("pause").onclick = () => player.pause();
$("resume").onclick = () => player.resume();
$("play-stop").onclick = () => player.stop();
$("individual-stop").onclick = () => player.stop();
$("individual-play").onclick = run(async () => {
  if (activeRecording() || busy) return;
  const r = currentRecord();
  if (!r) return;
  $("draft-audio").pause();
  sessionItems = [{ ...r, decade: 0, hail: 0 }];
  await player.start(sessionItems);
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
        text: dedication() || "A prayer in my own voice, shared with love.",
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
for (const action of ["download", "share"])
  $("individual-" + action).onclick = run(async () => {
    const r = currentRecord();
    if (!r) throw Error("Record and save this prayer first.");
    const name = filename(
      `${title(r.id)} - ${versions[r.version]}`,
      settings,
      extension(r.blob.type),
    );
    if (action === "share") await share(r.blob, name);
    else download(r.blob, name);
  });
async function prepareExport(wantShare) {
  if (busy || activeRecording()) return;
  const items = selectedItems();
  busy = true;
  player.stop();
  invalidateExport();
  update();
  notice("Preparing your audio. Keep this page open…");
  try {
    const blob = await assemble(items);
    sessionOutput = {
      blob,
      name: filename(
        `${settings.set} ${settings.mode === "whole" ? "Whole Rosary" : `Decade ${+settings.decade + 1}`} - ${versions[settings.version]}`,
        settings,
        "wav",
      ),
    };
    sessionURL = URL.createObjectURL(blob);
    $("export-download").href = sessionURL;
    $("export-download").download = sessionOutput.name;
    $("export-result").hidden = false;
    notice(
      wantShare
        ? "Audio ready. Tap “Share prepared audio” to open your device’s share sheet."
        : "Audio ready. Tap “Download WAV” to save your session.",
    );
  } catch (e) {
    throw Error(
      `Export failed: ${e.message} Try a shorter decade, re-record unsupported audio, or use a desktop browser.`,
    );
  } finally {
    busy = false;
    update();
  }
}
$("export").onclick = run(() => prepareExport(false));
$("share-session").onclick = run(() => prepareExport(true));
$("export-share").onclick = run(async () => {
  if (sessionOutput) await share(sessionOutput.blob, sessionOutput.name);
});
for (const control of [
  "mode",
  "set",
  "decade",
  "settings-mode",
  "settings-set",
  "settings-decade",
])
  $(control).onchange = () => {
    const id = control.replace("settings-", "");
    if (busy || activeRecording()) {
      $(control).value = settings[id];
      return notice("Finish the current recording or export first.");
    }
    player.stop();
    settings[id] = id === "decade" ? +$(control).value : $(control).value;
    invalidateExport();
    preferences();
    update();
  };
$("settings-open").onclick = () => {
  if (busy || activeRecording() || draft)
    return notice("Finish your current take or export first.");
  $("settings-dialog").showModal();
};
for (const id of ["settings-close", "settings-done"])
  $(id).onclick = () => $("settings-dialog").close();
$("wording").onchange = () => {
  player.stop();
  settings.version = $("wording").value;
  invalidateExport();
  preferences();
  update();
};
$("subtitle").onchange = () => {
  settings.subtitle = $("subtitle").checked;
  invalidateExport();
  preferences();
  update();
};
$("sender").oninput = () => {
  settings.sender = $("sender").value;
  preferences();
  $("dedication-preview").textContent = dedication();
  $("dedication").hidden = !settings.subtitle;
  $("dedication").textContent = dedication();
  invalidateExport();
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
      "Backup is too large (150 MB limit). Import individual recordings instead.",
    );
  restoreData = validateBackup(JSON.parse(await file.text()));
  $("restore-summary").textContent =
    `This backup contains ${restoreData.recordings.length} recordings across ${new Set(restoreData.recordings.map((r) => r.version)).size} wording versions.`;
  $("restore-dialog").showModal();
});
$("restore-cancel").onclick = () => {
  restoreData = null;
  $("restore-dialog").close();
};
$("restore-confirm").onclick = run(async () => {
  if (!restoreData || busy) return;
  busy = true;
  $("restore-confirm").disabled = true;
  player.stop();
  try {
    const incoming = restoreData.recordings.map((r) => {
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
    for (const [key, text] of Object.entries(restoreData.prompts || {})) {
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
    invalidateExport();
    $("restore-dialog").close();
    notice(
      promptFailure
        ? "Audio restored. Some private text prompts could not be saved; free browser storage."
        : "Recordings restored. Current settings have been kept.",
    );
  } catch (e) {
    throw Error(
      `Restore failed: ${e.message}. Audio import is atomic; on a storage failure your saved recordings remain unchanged.`,
    );
  } finally {
    busy = false;
    $("restore-confirm").disabled = false;
    update();
  }
});
window.addEventListener("pagehide", () => {
  player.stop();
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
  storageReady = true;
  update();
} catch {
  storageReady = true;
  update();
  notice(
    "Recording storage is unavailable. Exit private browsing, allow site storage, and reload. Existing recordings have not been changed.",
  );
}
