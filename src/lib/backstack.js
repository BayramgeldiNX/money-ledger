// Pure rules for the Android Back button. The app keeps one history entry for each thing Back should undo:
// every open sheet / passcode pad, plus one when the owner is away from Home.

// How many entries should exist, given which layers are open
export const wantedDepth = (open) => open.filter(Boolean).length;

// What to do to the browser history so it holds `wanted` entries when it holds `depth` now
export function planSync(depth, wanted) {
  return wanted > depth ? { push: wanted - depth, back: 0 } : { push: 0, back: depth - wanted };
}

// A popstate arrived. `ignore` counts pops we caused ourselves (closing by tap); the rest are the real Back button.
// Returns the new counters and whether to close the top layer. `stale` is a leftover entry from before a reload: skip it.
export function onPop({ ignore, depth, hasLayer, stateIsOurs }) {
  if (ignore > 0) return { ignore: ignore - 1, depth, close: false, skip: false };
  if (hasLayer) return { ignore, depth: Math.max(0, depth - 1), close: true, skip: false };
  return { ignore, depth, close: false, skip: !!stateIsOurs };
}
