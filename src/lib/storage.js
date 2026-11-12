// JSON values in a localStorage-shaped backing (getItem / setItem). A failure never throws:
// reads give the fallback, and a failed write is reported through onWriteError.
export function createStorage(backing, onWriteError) {
  return {
    read(key, fallback) { try { const v = backing.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } },
    write(key, val) { try { backing.setItem(key, JSON.stringify(val)); } catch (e) { if (onWriteError) onWriteError(e); } }
  };
}
