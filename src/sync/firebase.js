// Cloud storage with Firebase: email + password sign-in, and Firestore with an offline cache.
//
// Everything lives under users/{uid}/ and only that user can read or write it (see firestore.rules):
//   users/{uid}/expenses/{id}   users/{uid}/debts/{id}   users/{uid}/transfers/{id}
//   users/{uid}/config/main     users/{uid}/billruns/{id}
//
// makeDb() returns the same small interface the app was written against, so app.js needs no changes:
//   db.collection(name).add(data) / .onSnapshot(ok, err)      db.doc(path).get() / .set() / .delete() / .onSnapshot()
import realConfig from "./firebase-config.js";

// Test mode (only when started with VITE_FIREBASE_EMULATOR=1): talk to the local Firebase emulators
// with a throw-away demo project instead of the real one. Never on in the published app.
const EMULATOR = import.meta.env.VITE_FIREBASE_EMULATOR === "1";
const config = EMULATOR ? { apiKey: "demo-key", authDomain: "localhost", projectId: "demo-money-ledger", appId: "demo" } : realConfig;

export const syncAvailable = !!config;

// load() can be called twice at once (account card + storage), so the first call is shared
let loading = null;
const load = () => loading || (loading = start());
async function start() {
  const [appMod, authMod, fsMod] = await Promise.all([import("firebase/app"), import("firebase/auth"), import("firebase/firestore")]);
  const app = appMod.initializeApp(config);
  // No popup/redirect: email sign-in works inside Home Screen apps.
  const auth = authMod.initializeAuth(app, { persistence: [authMod.indexedDBLocalPersistence, authMod.browserLocalPersistence] });
  let db;
  try {
    db = fsMod.initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      localCache: fsMod.persistentLocalCache({ tabManager: fsMod.persistentMultipleTabManager() }),
    });
  } catch (e) {
    console.warn("Offline cache unavailable, using memory cache", e);
    db = fsMod.initializeFirestore(app, { ignoreUndefinedProperties: true, localCache: fsMod.memoryLocalCache() });
  }
  if (EMULATOR) {
    authMod.connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    fsMod.connectFirestoreEmulator(db, "127.0.0.1", 8080);
  }
  return { auth, db, A: authMod, F: fsMod };
}

// The signed-in user, or null. Waits for the saved sign-in to be read (works offline).
export async function currentUser() {
  if (!syncAvailable) return null;
  const { auth } = await load();
  await auth.authStateReady();
  return auth.currentUser;
}
export async function signIn(email, password) { const { auth, A } = await load(); await A.signInWithEmailAndPassword(auth, email, password); }
export async function signUp(email, password) { const { auth, A } = await load(); await A.createUserWithEmailAndPassword(auth, email, password); }
export async function signOutNow() { const { auth, A } = await load(); await A.signOut(auth); }

// Plain-English reason for a sign-in problem.
export function authMessage(e) {
  switch (e && e.code) {
    case "auth/invalid-credential": case "auth/wrong-password": case "auth/user-not-found": return "Wrong email or password.";
    case "auth/invalid-email": return "That email does not look right.";
    case "auth/email-already-in-use": return "That email already has an account. Tap Sign in.";
    case "auth/weak-password": return "Use at least 6 characters for the password.";
    case "auth/too-many-requests": return "Too many tries. Wait a minute and try again.";
    case "auth/network-request-failed": return "No connection. Check your internet or VPN and try again.";
    case "auth/operation-not-allowed": return "Email sign-in is not switched on yet in Firebase.";
    default: return "Could not sign in. Try again.";
  }
}

export async function makeDb(uid) {
  const { db, F } = await load();
  const base = "users/" + uid + "/";
  const docOf = (d) => ({ id: d.id, data: () => d.data() });
  return {
    collection: (name) => ({
      add: async (data) => { const ref = await F.addDoc(F.collection(db, base + name), data); return { id: ref.id }; },
      onSnapshot: (ok, err) => F.onSnapshot(F.collection(db, base + name), (s) => ok({ docs: s.docs.map(docOf) }), err),
    }),
    doc: (path) => {
      const ref = F.doc(db, base + path);
      return {
        get: async () => { const s = await F.getDoc(ref); return { exists: s.exists(), data: () => s.data() }; },
        set: (data) => F.setDoc(ref, data),
        delete: () => F.deleteDoc(ref),
        onSnapshot: (ok, err) => F.onSnapshot(ref, (s) => ok({ exists: s.exists(), data: () => s.data() }), err),
      };
    },
  };
}
