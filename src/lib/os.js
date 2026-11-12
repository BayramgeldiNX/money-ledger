// Which phone family we are on. Pure: pass `navigator` (or a stand-in).

// iPads report themselves as a Mac, so a Mac with a touch screen counts as iOS.
export function isIOS({ userAgent = "", platform = "", maxTouchPoints = 0 } = {}) {
  return /iPhone|iPad|iPod/.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
}

export function isAndroid({ userAgent = "" } = {}) {
  return /Android/i.test(userAgent);
}

// "android" | "ios" | "" for the data-os mark on <html>, so CSS can aim at one phone family
export function osOf(nav = {}) {
  if (isIOS(nav)) return "ios";
  return isAndroid(nav) ? "android" : "";
}
