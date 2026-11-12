// The offline queue: every change is saved here first (one entry per path, the last write wins),
// shown at once, then sent to the account in order. Pure: persistence is a callback, time is an argument.
export const OUTBOX_KEY = "ml.outbox";

const valid = (o) => o && typeof o.path === "string" && o.path.includes("/");

export function createOutbox(initial, persist) {
  let items = [].concat(initial || []).filter(valid);
  let seq = items.reduce((a, o) => Math.max(a, o.n || 0), 0);
  const save = () => { if (persist) persist(items); };
  const clean = (d) => { const o = { ...d }; delete o._pending; delete o.id; return o; };
  return {
    items: () => items,
    get length() { return items.length; },
    has: (path) => items.some((o) => o.path === path),
    // waiting changes the owner should be told about (bill-run markers are bookkeeping)
    visibleCount: () => items.filter((o) => !o.path.startsWith("billruns/")).length || items.length,
    queue(path, data, now) {
      items = items.filter((o) => o.path !== path).concat([{ path, data: data ? clean(data) : null, at: now, n: ++seq }]);
      save();
    },
    next: () => items[0] || null,
    // Drop a sent entry only if it was not changed again while it was being sent.
    sent(o) {
      const cur = items.find((x) => x.path === o.path);
      if (cur && cur.n === o.n) { items = items.filter((x) => x !== cur); save(); }
    },
    // what the screen shows: server rows without a waiting change, plus the waiting writes marked _pending
    overlay(rows, coll) {
      const list = rows.filter((x) => !items.some((o) => o.path === coll + "/" + x.id));
      items.forEach((o) => { const [c, id] = o.path.split("/"); if (c === coll && o.data) list.push({ id, ...o.data, _pending: true }); });
      return list;
    },
    // a waiting settings write beats the server copy
    pendingConfig() { const pc = items.filter((o) => o.path === "config/main" && o.data).pop(); return pc ? pc.data : null; }
  };
}

// How many changes are waiting on this device (read straight from storage, e.g. before signing out).
export function pendingCount(storage) {
  return [].concat(storage.read(OUTBOX_KEY, [])).filter(valid).length;
}
