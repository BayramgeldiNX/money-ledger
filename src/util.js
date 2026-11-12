// Small helpers every screen needs, in one place.
// esc: text into HTML markup. sleep: wait. reduced: the phone asks for less motion.
export const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const reduced = () => { try { return !!window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
