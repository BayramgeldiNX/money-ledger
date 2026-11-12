// Backup file and restore rules, free of any screen so the data-safety promises can be tested:
//   Add missing: keeps everything here and adds what the backup has that is not here yet.
//   Replace: puts the backup in place of what is here, but removes the old data only AFTER the backup is safely in,
//            so a problem half way never leaves less than there was.
// planRestore decides what to do; applyRestorePlan does it through the store, in the safe order.

// the backup file's content (config, entries, debts, wallet moves)
export const buildBackup = ({ config, expenses, debts, transfers }, now = new Date()) => ({
  app: "money-ledger", version: 1, exportedAt: now.toISOString(), config,
  expenses: expenses.map((e) => ({ ...e })), debts: debts.map((d) => ({ ...d })), transfers: transfers.map((t) => ({ ...t }))
});

// a stored row without the fields the store owns
export const stripRow = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => k !== "id" && k !== "_pending"));

// how many backup entries are not here yet (shown before the owner chooses)
export const newEntryCount = (haveExpenses, backupExpenses) => {
  const ids = new Set(haveExpenses.map((e) => e.id));
  return backupExpenses.filter((e) => e && e.id && !ids.has(e.id)).length;
};

export function planRestore(current, backup, { replace }) {
  const idSet = (list) => new Set(replace ? [] : list.map((x) => x.id));
  const haveE = idSet(current.expenses), haveD = idSet(current.debts), haveT = idSet(current.transfers);
  const adds = {
    expenses: backup.expenses.filter((e) => !haveE.has(String(e.id))).map((e) => ({ id: String(e.id), doc: stripRow(e) })),
    debts: backup.debts.filter((d) => !haveD.has(String(d.id))).map((d) => ({ id: String(d.id), doc: stripRow(d) })),
    transfers: backup.transfers.filter((t) => !haveT.has(String(t.id))).map((t) => ({ id: String(t.id), doc: stripRow(t) }))
  };
  const notInFile = (have, file) => { const keep = new Set(file.map((x) => String(x.id))); return have.filter((x) => !keep.has(x.id)).map((x) => x.id); };
  const removes = replace
    ? { expenses: notInFile(current.expenses, backup.expenses), debts: notInFile(current.debts, backup.debts), transfers: notInFile(current.transfers, backup.transfers) }
    : { expenses: [], debts: [], transfers: [] };
  // Settings: Replace takes the backup's. Add missing only fills in wallets if this account has never set any up.
  let config = null;
  if (backup.config && (replace || !current.config.wallets)) {
    config = replace ? backup.config : { ...current.config, wallets: backup.config.wallets || current.config.wallets };
  }
  return { adds, removes, config };
}

// Run the plan: adds first, then (Replace only) removals, then settings. `progress.done` counts entries restored
// so far; onProgress(done, total) is called every 10 entries.
export async function applyRestorePlan(plan, store, progress = { done: 0 }, onProgress = () => {}) {
  const total = plan.adds.expenses.length;
  for (const e of plan.adds.expenses) { await store.addWithId(e.id, e.doc); if (++progress.done % 10 === 0) onProgress(progress.done, total); }
  for (const d of plan.adds.debts) await store.debtSet(d.id, d.doc);
  for (const t of plan.adds.transfers) await store.transferSet(t.id, t.doc);
  for (const id of plan.removes.expenses) await store.remove(id);
  for (const id of plan.removes.debts) await store.debtDelete(id);
  for (const id of plan.removes.transfers) await store.transferDelete(id);
  if (plan.config) await store.saveConfig(plan.config);
  return { entries: total };
}
