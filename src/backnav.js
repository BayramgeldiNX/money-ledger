// Android Back button: closes the open sheet first, then goes Home, and only then leaves the app.
// Does nothing on iPhone or desktop. The rules are in src/lib/backstack.js.
import { isAndroid } from "./lib/lock.js";
import { wantedDepth, planSync, onPop } from "./lib/backstack.js";

let layers = [];       // highest first: { open(): bool, close() }
let depth = 0, ignore = 0, on = false;

export function initBack(list) {
  if (!isAndroid(navigator) || on) return;
  on = true;
  layers = list;
  window.addEventListener("popstate", (e) => {
    const top = layers.find((l) => l.open());
    const r = onPop({ ignore, depth, hasLayer: !!top, stateIsOurs: !!(e.state && e.state.ml) });
    ignore = r.ignore; depth = r.depth;
    if (r.skip) { ignore++; history.back(); return; }
    if (r.close) top.close();
    syncBack();
  });
}

// Call whenever a layer opens or closes
export function syncBack() {
  if (!on) return;
  const plan = planSync(depth, wantedDepth(layers.map((l) => l.open())));
  for (let i = 0; i < plan.push; i++) { try { history.pushState({ ml: 1 }, ""); } catch (e) { /* no history here */ } }
  depth += plan.push;
  if (plan.back > 0) { depth -= plan.back; ignore++; history.go(-plan.back); }
}
