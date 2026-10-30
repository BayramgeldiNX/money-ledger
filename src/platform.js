import { syncAvailable, currentUser, makeDb } from "./sync/firebase.js";

// Stand-in for the pieces the claude.ai Artifact used to provide.
// The app asks for them through window.claude.use(name); here each one is a normal browser feature.
//   "db"        -> your Firestore account when you are signed in; otherwise null, and the app keeps its data on this device.
//   "sample"    -> null: Claude-written money review and receipt reading are off in the standalone app.
//   "downloads" -> a plain file download.

const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

async function saveFile({ filename, data }) {
  const type = /\.csv$/i.test(filename) ? "text/csv;charset=utf-8" : /\.json$/i.test(filename) ? "application/json" : /\.pdf$/i.test(filename) ? "application/pdf" : "application/octet-stream";
  // a leading BOM makes Excel read Chinese text in a CSV correctly
  const blob = data instanceof Blob ? data : new Blob(/\.csv$/i.test(filename) ? ["﻿", data] : [data], { type });
  // A Home Screen app on iPhone has no downloads, so use the share sheet: Save to Files, AirDrop, WeChat…
  if (isIOS && navigator.canShare) {
    const file = new File([blob], filename, { type: blob.type || type });
    if (navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file] }); return; }
      catch (e) {
        if (e && e.name === "AbortError") { const err = new Error("cancelled"); err.code = "declined"; throw err; }
        // NotAllowedError: the tap expired while a long file was being made. Fall through to a normal download.
      }
    }
  }
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = filename; a.rel = "noopener";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

const capabilities = {
  db: async () => {
    if (!syncAvailable) return null;
    try { const u = await currentUser(); return u ? await makeDb(u.uid) : null; }
    catch (e) { console.error(e); window.__sync.error = true; return null; }
  },
  sample: async () => null,
  downloads: async () => ({ save: saveFile }),
};

window.__sync = { available: syncAvailable, error: false };
window.claude = { use: async (name) => (capabilities[name] ? capabilities[name]() : null) };

// PDF statement libraries are bundled with the app and loaded only when needed.
window.__loadPdfLibs = async () => {
  if (window.jspdf && window.html2canvas) return;
  const [h2c, pdf] = await Promise.all([import("html2canvas"), import("jspdf")]);
  window.html2canvas = h2c.default;
  window.jspdf = { jsPDF: pdf.jsPDF || (pdf.default && pdf.default.jsPDF) || pdf.default };
};
